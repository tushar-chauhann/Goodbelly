import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import tw from "twrnc";
import { authService } from "../../services/authService.js";
import { toast } from "../../utils/toast";
import { fontStyles } from "../../utils/fontStyles.js";

const Summary = ({
  vendor,
  items,
  selectedMealType,
  selectedWindow,
  firstDeliveryDate,
  startDate,
  endDate,
  frequency,
  totalPrice,
  onCouponApply,
}) => {
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [availableDiscounts, setAvailableDiscounts] = useState([]);

  useEffect(() => {
    if (vendor?.id) {
      fetchDiscounts();
    }
  }, [vendor?.id]);

  const fetchDiscounts = async () => {
    try {
      const response = await authService.getDiscounts(vendor.id);
      console.log("🎟️ Available Discounts:", response);
      if (response && (response.success || Array.isArray(response.data) || Array.isArray(response))) {
        setAvailableDiscounts(response.data || (Array.isArray(response) ? response : []));
      }
    } catch (error) {
      console.error("Error fetching discounts:", error);
    }
  };

  const calculateTotalDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const totalDays = calculateTotalDays();
  const subtotal = totalPrice * totalDays;
  const discountAmount = appliedCoupon ? appliedCoupon.amount : 0;
  const finalAmount = Math.max(subtotal - discountAmount, 1);

  // Sync with parent whenever finalAmount changes (e.g. dates change or coupon applied)
  useEffect(() => {
    onCouponApply(appliedCoupon ? appliedCoupon.id : null, finalAmount);
  }, [finalAmount]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

    setApplyingCoupon(true);
    try {
      // 1. Find the discount in our local cached list
      const discount = availableDiscounts.find(
        (d) => d.code.toUpperCase() === couponCode.trim().toUpperCase()
      );

      if (!discount) {
        toast.error("Invalid coupon code");
        setApplyingCoupon(false);
        return;
      }

      // 2. Call the API to validate and apply
      const response = await authService.applyDiscount(discount.id, {
        orderTotal: subtotal,
        itemCount: items.length,
        code: discount.code,
        discountValue: discount.value, // Pass for client-side fallback
        discountType: discount.type,   // Pass for client-side fallback
      });

      console.log("  Apply Discount API Response:", response);

      if (response && (response.success || response.data)) {
        const result = response.data || response;
        setAppliedCoupon({
          id: discount.id,
          code: couponCode.trim().toUpperCase(),
          discount: discount.value,
          amount: result.discountAmount,
          type: discount.type,
        });

        // Notify parent of the applied discount
        onCouponApply(discount.id, result.finalPrice);
        toast.success("Coupon applied successfully!");
      } else {
        toast.error("Could not apply this coupon");
      }
    } catch (error) {
      console.error("Error applying coupon:", error);
      toast.error(
        error.response?.data?.message || "Failed to apply coupon"
      );
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    onCouponApply(null, subtotal);
  };

  // Format date for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <View style={tw`bg-white rounded-xl p-4 border border-gray-200`}>
      <Text
        style={[fontStyles.headingS, tw`text-base font-semibold text-gray-800`]}
      >
        Order Summary
      </Text>

      {/* Vendor Info */}
      <View style={tw`mb-4`}>
        <Text
          style={[fontStyles.headingS, tw`text-sm font-semibold text-gray-800`]}
        >
          Kitchen
        </Text>
        <Text style={tw`text-gray-900`}>
          {vendor?.name || vendor?.kitchenName || "Not selected"}
        </Text>
        {vendor?.address && (
          <Text style={tw`text-gray-600 text-sm mt-1`}>{vendor.address}</Text>
        )}
      </View>

      {/* Meal Plan Details */}
      <View style={tw`mb-4`}>
        <Text
          style={[fontStyles.headingS, tw`text-sm font-semibold text-gray-800`]}
        >
          Meal Plan
        </Text>
        <Text style={tw`text-gray-900 capitalize`}>
          {selectedMealType?.toLowerCase() || "No meals selected"}
        </Text>
        <Text style={tw`text-gray-600 text-sm mt-1`}>
          {selectedWindow?.length > 0
            ? `Delivery: ${selectedWindow
              .map((w) => w.label || `${w.startTime}-${w.endTime}`)
              .join(", ")}`
            : "No delivery timings selected"}
        </Text>
      </View>

      {/* Subscription Period */}
      <View style={tw`mb-4`}>
        <Text
          style={[fontStyles.headingS, tw`text-sm font-semibold text-gray-800`]}
        >
          Subscription Period
        </Text>
        <Text style={tw`text-gray-900`}>
          {formatDisplayDate(startDate)} to {formatDisplayDate(endDate)}
        </Text>
        <Text style={tw`text-gray-600 text-sm mt-1`}>
          {totalDays} days • First delivery:{" "}
          {formatDisplayDate(startDate)}
        </Text>
      </View>

      {/* Selected Items */}
      {items.length > 0 && (
        <View style={tw`mb-4`}>
          <Text
            style={[
              fontStyles.headingS,
              tw`text-sm font-semibold text-gray-800`,
            ]}
          >
            Selected Items ({items.length})
          </Text>
          <ScrollView style={tw`max-h-40`} showsVerticalScrollIndicator={false}>
            {items.map((item, index) => (
              <View
                key={`${item.itemId}-${item.weightId}-${index}`}
                style={tw`flex-row justify-between py-2 border-b border-gray-100`}
              >
                <View style={tw`flex-1`}>
                  <Text style={tw`text-gray-900 font-medium`}>
                    {item.productName}
                  </Text>
                  <Text style={tw`text-gray-600 text-xs`}>
                    {item.weight} × {item.quantity || 1}
                  </Text>
                </View>
                <Text style={tw`font-semibold text-gray-900`}>
                  ₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Coupon Section */}
      <View style={tw`mb-4`}>
        <Text style={tw`font-medium text-gray-700 mb-2`}>Apply Coupon</Text>
        {!appliedCoupon ? (
          <View style={tw`flex-row`}>
            <TextInput
              style={tw`flex-1 border border-gray-300 rounded-l-lg px-3 py-2 bg-white text-gray-900`}
              placeholder="Enter coupon code"
              placeholderTextColor="#9CA3AF"
              value={couponCode}
              onChangeText={setCouponCode}
            />
            <TouchableOpacity
              style={tw`bg-[#7a9b8e] px-4 py-2 rounded-r-lg justify-center`}
              onPress={handleApplyCoupon}
              disabled={applyingCoupon || !couponCode.trim()}
            >
              <Text style={tw`text-white font-semibold`}>
                {applyingCoupon ? "Applying..." : "Apply"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={tw`flex-row justify-between items-center bg-green-50 p-3 rounded-lg border border-green-200`}
          >
            <Text style={tw`text-green-800 font-semibold`}>
              {appliedCoupon.code} applied ({appliedCoupon.type === 'percentage' || appliedCoupon.type === 'PERCENTAGE' ? `${appliedCoupon.discount}% off` : `₹${appliedCoupon.discount} off`})
            </Text>
            <TouchableOpacity onPress={removeCoupon}>
              <Text style={tw`text-red-600 font-semibold`}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Pricing Breakdown */}
      <View style={tw`border-t border-gray-200 pt-4`}>
        <View style={tw`flex-row justify-between py-1`}>
          <Text style={tw`text-gray-600`}>Daily Price</Text>
          <Text style={tw`text-gray-900`}>₹{totalPrice.toFixed(2)}</Text>
        </View>
        <View style={tw`flex-row justify-between py-1`}>
          <Text style={tw`text-gray-600`}>Subscription Days</Text>
          <Text style={tw`text-gray-900`}>{totalDays} days</Text>
        </View>
        <View style={tw`flex-row justify-between py-1`}>
          <Text style={tw`text-gray-600`}>Subtotal</Text>
          <Text style={tw`text-gray-900`}>₹{subtotal.toFixed(2)}</Text>
        </View>

        {appliedCoupon && (
          <View style={tw`flex-row justify-between py-1`}>
            <Text style={tw`text-green-600`}>Discount</Text>
            <Text style={tw`text-green-600`}>
              -₹{discountAmount.toFixed(2)}
            </Text>
          </View>
        )}

        <View
          style={tw`flex-row justify-between py-2 border-t border-gray-200 mt-2`}
        >
          <Text
            style={[
              fontStyles.headingS,
              tw`text-base font-semibold text-gray-800`,
            ]}
          >
            Total Amount
          </Text>
          <Text
            style={[
              fontStyles.headingS,
              tw`text-base font-semibold text-gray-800 text-[#7a9b8e]`,
            ]}
          >
            ₹{finalAmount.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default Summary;
