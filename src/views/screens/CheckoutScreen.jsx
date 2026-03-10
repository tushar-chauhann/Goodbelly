import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Animated,
  ScrollView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import Constants from "expo-constants";

import AddressManager from "../../components/Checkout/AddressManager/AddressManager";
import PromoModal from "../../components/Checkout/PromoModal/PromoModal";
import GSTInfoModal from "../../components/Checkout/GSTInfoModal/GSTInfoModal";
import PaymentModal from "../../components/Checkout/PaymentModal/PaymentModal";
import CustomPopup from "../../components/CustomPopup/CustomPopup";

import { clearAllCarts } from "../../redux/slicer";
import { fontStyles } from "../../utils/fontStyles";
import { applyPromoCode } from "../../services/promoApi";
import { setAppliedPromo, removeAppliedPromo } from "../../redux/promoSlice";
import { checkAddressServiceability } from "../../services/addressApi";
import api from "../../services/api";

const PRIMARY_COLOR = "#5F7F67";
const LIGHT_BG = "#F8FAFC";

const safeAppliedPromoSelector = (state) => {
  return state.promo?.appliedPromo || null;
};

const calculateCharges = (totalPrice, distance = 0) => {
  const gstCharges = totalPrice * 0.05;
  const baseDelivery = 30;
  const extraDistance = Math.max(0, distance - 3);
  const deliveryBase = baseDelivery + extraDistance * 12;
  const deliveryGST = deliveryBase * 0;
  const deliveryCharges = deliveryBase + deliveryGST;
  const platformBase = 0;
  const platformGST = platformBase * 0.18;
  const platformCharges = platformBase + platformGST;
  const grandTotal = totalPrice + gstCharges + deliveryCharges + platformCharges;

  return { gstCharges, deliveryCharges, platformCharges, grandTotal };
};

const calculateMacro = (actual, benchmark, quantity = 1) => {
  if (!benchmark || !actual)
    return { value: (actual || 0) * quantity, type: "gained" };
  const difference = (benchmark - actual) * quantity;
  return {
    value: Math.abs(difference),
    type: difference >= 0 ? "saved" : "gained",
  };
};

const SectionCard = ({ children, style }) => (
  <View style={[tw`bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100`, style]}>
    {children}
  </View>
);

const ProgressSteps = ({ currentStep, steps }) => {
  return (
    <View style={tw`flex-row justify-between items-center mb-4 px-1`}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <View style={tw`flex-col items-center`}>
            <View
              style={[
                tw`w-8 h-8 rounded-full items-center justify-center border-2`,
                currentStep >= step.id
                  ? { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }
                  : tw`border-gray-300 bg-white`,
              ]}
            >
              {currentStep > step.id ? (
                <Ionicons name="checkmark" size={16} color="white" />
              ) : (
                <Text
                  style={[
                    fontStyles.bodyBold,
                    currentStep >= step.id ? tw`text-white text-xs` : tw`text-gray-400 text-xs`,
                  ]}
                >
                  {step.id}
                </Text>
              )}
            </View>
            <Text
              style={[
                fontStyles.body,
                tw`text-xs mt-1`,
                currentStep >= step.id ? tw`text-[#5F7F67]` : tw`text-gray-400`,
              ]}
            >
              {step.label}
            </Text>
          </View>
          {index < steps.length - 1 && (
            <View
              style={[
                tw`flex-1 h-0.5 mx-1`,
                currentStep > step.id ? { backgroundColor: PRIMARY_COLOR } : tw`bg-gray-200`,
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

const NutritionPill = ({ type, value, macro }) => {
  const isSaved = type === "saved";
  return (
    <View
      style={[
        tw`flex-row items-center px-2 py-1.5 rounded-full mr-1.5 mb-1.5`,
        isSaved ? tw`bg-green-50` : tw`bg-orange-50`,
      ]}
    >
      <View
        style={[
          tw`w-1.5 h-1.5 rounded-full mr-1.5`,
          isSaved ? tw`bg-green-500` : tw`bg-orange-500`,
        ]}
      />
      <Text
        style={[
          fontStyles.body,
          tw`text-xs`,
          isSaved ? tw`text-green-700` : tw`text-orange-700`,
        ]}
      >
        {value > 0 ? `~${value.toFixed(0)}${macro === "Calories" ? "kcal" : "g"}` : "N/A"}
      </Text>
    </View>
  );
};

const PriceRow = ({ label, value, isTotal = false, isDiscount = false, isStriked = false }) => (
  <View style={tw`flex-row justify-between py-1.5`}>
    <Text
      style={[
        fontStyles.body,
        isTotal
          ? tw`text-gray-800 font-semibold`
          : isDiscount
            ? tw`text-green-600`
            : tw`text-gray-600`,
      ]}
    >
      {label}
    </Text>
    <Text
      style={[
        fontStyles.body,
        isTotal
          ? tw`text-gray-800 font-semibold`
          : isDiscount
            ? tw`text-green-600 font-semibold`
            : isStriked
              ? [tw`text-gray-400 line-through`, { textDecorationLine: "line-through" }]
              : tw`text-gray-800`,
      ]}
    >
      {value}
    </Text>
  </View>
);

//    UTILITY: Create order with proper response handling
const createOrderWithRetry = async (orderPayload, userToken) => {
  try {
    console.log("📦 Creating order with payload:", orderPayload);

    const response = await api.post("/orders", orderPayload, {
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("📦 Raw order response:", response.data);
    console.log("  Response type:", typeof response.data?.data || typeof response.data);

    //    FIX: Properly handle array response
    let orderDataResponse = response.data?.data || response.data;

    console.log("  Is array?", Array.isArray(orderDataResponse));

    // Normalize unexpected object shapes (e.g. { "0": {...} } or nested data)
    if (!Array.isArray(orderDataResponse) && orderDataResponse && typeof orderDataResponse === 'object') {
      // If it's an object with numeric keys, convert to array-like and pick first
      const numericKeys = Object.keys(orderDataResponse).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
      if (numericKeys.length > 0) {
        console.log(`  Detected numeric-keyed object; converting to array-like with ${numericKeys.length} elements`);
        const arr = numericKeys.map((k) => orderDataResponse[k]);
        orderDataResponse = arr.length > 0 ? arr[0] : orderDataResponse;
      }

      // If still doesn't look like an order, try to extract first nested object value that contains identifiers
      if (orderDataResponse && !orderDataResponse.referenceId && !orderDataResponse.id) {
        const firstCandidate = Object.values(orderDataResponse).find(
          (v) => v && typeof v === 'object' && (v.referenceId || v.id || v.orderNumber)
        );
        if (firstCandidate) {
          console.log('🔎 Extracted order object from nested response');
          orderDataResponse = firstCandidate;
        }
      }
    }

    if (Array.isArray(orderDataResponse)) {
      console.log(`  Array response detected with ${orderDataResponse.length} elements`);

      if (orderDataResponse.length === 0) {
        throw new Error("No orders created - empty array");
      }

      if (orderDataResponse.length === 1) {
        // Single order in array - extract it
        console.log("  Extracting single order from array");
        orderDataResponse = orderDataResponse[0];
      } else {
        // Multiple orders (multi-vendor) - take the first one for payment
        console.log("    Multiple orders in array (multi-vendor). Using first order for payment.");
        orderDataResponse = orderDataResponse[0];
      }
    }

    // Validate response structure
    if (!orderDataResponse || typeof orderDataResponse !== 'object') {
      console.error("     Invalid order response structure:", orderDataResponse);
      throw new Error("Unexpected order response structure");
    }

    // Ensure referenceId exists
    if (!orderDataResponse.referenceId && !orderDataResponse.id) {
      console.error("     Order missing referenceId and id:", orderDataResponse);
      throw new Error("Order creation failed - missing identifiers");
    }

    console.log("  Order data extracted successfully:", {
      id: orderDataResponse.id,
      referenceId: orderDataResponse.referenceId,
      status: orderDataResponse.status,
      paymentStatus: orderDataResponse.paymentStatus
    });

    return {
      success: true,
      data: orderDataResponse,
      message: response.data?.message || "Order created successfully"
    };
  } catch (error) {
    console.error("     Create Order Error:", error.response?.data || error);

    // Extract a safe error message
    const errorMsg = (error.response?.data?.message || error.message || "").toString();

    // 1) Handle duplicate order error (idempotency collision)
    if (
      errorMsg.includes("Order_referenceId_key") ||
      errorMsg.includes("Unique constraint failed") ||
      errorMsg.includes("duplicate key")
    ) {
      throw new Error("DUPLICATE_ORDER");
    }

    // 2) Handle promo already used: retry once WITHOUT promoCodeId
    if (!orderPayload?._promoFallback && /promo code already used/i.test(errorMsg)) {
      try {
        console.log("    Promo already used. Retrying order creation without promoCodeId...");
        const fallbackPayload = { ...orderPayload, _promoFallback: true };
        delete fallbackPayload.promoCodeId;

        // Retry the request once without promo
        const retryResponse = await api.post("/orders", fallbackPayload, {
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
          },
        });

        let orderDataResponse = retryResponse.data?.data || retryResponse.data;
        if (Array.isArray(orderDataResponse)) orderDataResponse = orderDataResponse[0];

        if (!orderDataResponse || typeof orderDataResponse !== 'object') {
          throw new Error("Invalid order response on promo-fallback");
        }

        return {
          success: true,
          data: orderDataResponse,
          message: retryResponse?.data?.message || "Order created successfully (promo removed)"
        };
      } catch (retryErr) {
        console.error("     Retry without promo failed:", retryErr.response?.data || retryErr);
        // fall through to throw original error below
      }
    }

    // Otherwise rethrow the original error
    throw error;
  }
};

//    UTILITY: Get existing order by referenceId
//    UTILITY: Get existing order by referenceId
const getExistingOrder = async (referenceId, userToken) => {
  try {
    console.log("     Fetching existing order:", referenceId);

    const response = await api.get(`/orders/${referenceId}`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });

    console.log("📦 Existing order response:", response.data);
    console.log("  Response type:", typeof response.data?.data || typeof response.data);

    let orderData = response.data?.data || response.data;

    // Handle array response
    if (Array.isArray(orderData)) {
      console.log(`  Array response in existing order with ${orderData.length} elements`);

      if (orderData.length === 0) {
        throw new Error("No order found with this referenceId");
      }

      // Try to find the order with matching referenceId
      const matchingOrder = orderData.find(order =>
        order.referenceId === referenceId ||
        order.id === referenceId ||
        order.orderNumber === referenceId
      );

      if (matchingOrder) {
        orderData = matchingOrder;
        console.log("  Found matching order in array");
      } else {
        // Fallback to first element
        orderData = orderData[0];
        console.log("    No exact match, using first order in array");
      }
    }

    if (!orderData) {
      throw new Error("Order not found");
    }

    console.log("  Order retrieved successfully:", {
      id: orderData.id,
      referenceId: orderData.referenceId,
      status: orderData.status,
      paymentStatus: orderData.paymentStatus
    });

    return orderData;
  } catch (error) {
    console.error("     Error fetching existing order:", error);
    throw error;
  }
};

//    UTILITY: Check payment status with polling
const checkPaymentStatus = async (transactionId, userToken, maxAttempts = 10) => {
  console.log("  Starting payment status check for:", transactionId);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`   Attempt ${attempt}/${maxAttempts}: Checking payment status...`);

      // Wait before checking (increasing delay for each attempt)
      const delay = Math.min(1000 * attempt, 5000);
      await new Promise(resolve => setTimeout(resolve, delay));

      const order = await getExistingOrder(transactionId, userToken);

      const paymentStatus = order?.paymentStatus?.toUpperCase();
      const orderStatus = order?.status?.toUpperCase();

      console.log(`  Payment Status: ${paymentStatus}, Order Status: ${orderStatus}`);

      // Check for success
      if (paymentStatus === "SUCCESS" || paymentStatus === "COMPLETED") {
        console.log("  Payment SUCCESS detected!");
        return {
          success: true,
          paymentStatus: "SUCCESS",
          orderStatus: order?.status || "PROCESSING",
          orderData: order
        };
      }

      // Check for failure
      if (paymentStatus === "FAILED" || paymentStatus === "FAILURE" ||
        orderStatus === "CANCELLED" || orderStatus === "FAILED") {
        console.log("     Payment FAILED detected!");
        return {
          success: false,
          paymentStatus: "FAILED",
          orderStatus: order?.status || "CANCELLED",
          orderData: order
        };
      }

      // Still pending
      console.log("    Payment still PENDING...");

    } catch (error) {
      console.error(`     Error in attempt ${attempt}:`, error.message);
    }
  }

  // Max attempts reached
  console.log("    Max attempts reached, payment status unknown");
  return {
    success: false,
    paymentStatus: "UNKNOWN",
    orderStatus: "PENDING",
    orderData: null
  };
};

export default function CheckoutScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();

  const product = route.params?.product || null;
  const fromOrderNow = route.params?.fromOrderNow || false;
  const selectedWeight = route.params?.selectedWeight || null;

  //    GENERATE TRANSACTION ID ONCE (IDEMPOTENT KEY)
  const transactionId = useRef(`Order-${Date.now()}`).current;

  console.log("    TRANSACTION ID (will be used as referenceId & txnid):", transactionId);

  const [isPromoModalOpen, setPromoModalOpen] = useState(false);
  const [manualCouponCode, setManualCouponCode] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [distanceKm, setDistanceKm] = useState(0);
  const [instructions, setInstructions] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [payMethod, setPayMethod] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupConfig, setPopupConfig] = useState({
    title: "",
    message: "",
    type: "info",
    onConfirm: null,
  });
  const [serviceabilityData, setServiceabilityData] = useState(null);

  const scrollViewRef = useRef(null);
  const couponInputRef = useRef(null);

  const forceEnableScroll = () => {
    setTimeout(() => {
      Keyboard.dismiss();
      if (scrollViewRef.current) {
        scrollViewRef.current.setNativeProps({ scrollEnabled: true });
      }
    }, 100);
  };

  const showPopup = (title, message, type = "info", onConfirm = null) => {
    setPopupConfig({ title, message, type, onConfirm });
    setPopupVisible(true);
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      forceEnableScroll();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => { }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        forceEnableScroll();
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const carts = useSelector((state) => state.cart?.cartsRaw || []);
  const user = useSelector((state) => state.auth?.user);
  const appliedPromo = useSelector(safeAppliedPromoSelector);

  const subtotal = fromOrderNow
    ? (() => {
      const w = selectedWeight || product?.weights?.[0];
      const orig = Number(w?.price || 0);
      const disc = Number(w?.discountPrice || 0);
      return (disc > 0 && disc < orig) ? disc : orig;
    })()
    : carts.reduce(
      (acc, cart) =>
        acc +
        cart.items.reduce((sum, item) => {
          // Robust Price Calculation Logic (Matches CartScreen)
          const weightObj = item?.weight || item?.Weight;
          const originalPrice = Number(weightObj?.price ?? item?.price ?? item?.unitPrice ?? 0);
          const discountPrice = Number(weightObj?.discountPrice ?? 0);

          const hasDiscount = discountPrice > 0 && discountPrice < originalPrice;
          const basePrice = hasDiscount ? discountPrice : originalPrice;

          let addOnTotal = 0;
          if (item?.Addition) {
            if (typeof item.Addition === 'object' && !Array.isArray(item.Addition)) {
              addOnTotal = Number(item.Addition.addOnTotal || 0);
              if (addOnTotal === 0 && Array.isArray(item.Addition.addOns)) {
                addOnTotal = item.Addition.addOns.reduce((s, a) => s + (Number(a.price) || 0), 0);
              }
            } else if (Array.isArray(item.Addition)) {
              addOnTotal = item.Addition.reduce((s, a) => s + (Number(a.price) || 0), 0);
            }
          }

          return sum + (basePrice + addOnTotal) * item.quantity;
        }, 0),
      0
    );

  const charges = calculateCharges(subtotal, distanceKm);
  const discount = appliedPromo?.discount || 0;
  const finalTotal = Math.max(charges.grandTotal - discount, 0);
  const payableTotal = Math.max(finalTotal, 1);
  const formattedAmount = Number(payableTotal).toFixed(2);

  const isAddressServiceable = () => {
    if (!selectedAddress || !serviceabilityData) {
      return false;
    }
    // Backend returns numeric values (longitude) when serviceable, not boolean
    // Treat any truthy value (number or true) as serviceable
    const locationServiceable = !!serviceabilityData?.serviceability?.locationServiceAble;
    const riderServiceable = !!serviceabilityData?.serviceability?.riderServiceAble;
    return locationServiceable && riderServiceable;
  };

  const nutritionSummary = fromOrderNow
    ? (() => {
      const nutrition = product?.Nutrition;
      if (!nutrition)
        return {
          calories: { value: 0, type: "gained" },
          protein: { value: 0, type: "gained" },
          carbs: { value: 0, type: "gained" },
          fats: { value: 0, type: "gained" },
        };

      return {
        calories: calculateMacro(nutrition.calories, nutrition.calBenchmark, 1),
        protein: calculateMacro(nutrition.protein, nutrition.proteinBench, 1),
        carbs: calculateMacro(nutrition.carbs, nutrition.carbsBench, 1),
        fats: calculateMacro(nutrition.fats, nutrition.fatsBench, 1),
      };
    })()
    : carts.reduce(
      (acc, cart) => {
        cart.items.forEach((item) => {
          const nutrition = item.product?.Nutrition;
          if (nutrition) {
            const qty = item.quantity;
            ["calories", "protein", "carbs", "fats"].forEach((key) => {
              const macro = calculateMacro(
                nutrition[key],
                nutrition[`${key}Benchmark`] || nutrition[`${key}Bench`],
                qty
              );
              acc[key].value += macro.value;
              acc[key].type = macro.type;
            });
          }
        });
        return acc;
      },
      {
        calories: { value: 0, type: "gained" },
        protein: { value: 0, type: "gained" },
        carbs: { value: 0, type: "gained" },
        fats: { value: 0, type: "gained" },
      }
    );

  const handleAddressSelect = async (address) => {
    try {
      setIsProcessing(true);
      setServiceabilityData(null);

      const hasRequiredFields = address.city && address.zipCode;
      const isCompleteAddress =
        (address.latitude && address.longitude) ||
        (address.addressLine && address.addressLine.length > 10);

      if (!hasRequiredFields || !isCompleteAddress) {
        showPopup(
          "Address Incomplete",
          "Please ensure your address has complete details including city, ZIP code, and proper address line",
          "error"
        );
        return;
      }

      setSelectedAddress(address);
      setDistanceKm(3);

      const vendorData = fromOrderNow ? product?.vendor : carts[0]?.vendor;

      console.log("    Vendor Data Check:", {
        fromOrderNow,
        hasVendorData: !!vendorData,
        vendorId: vendorData?.id,
        vendorKitchenId: vendorData?.kitchenId,
        vendorLat: vendorData?.latitude,
        vendorLng: vendorData?.longitude,
        addressId: address.id,
        addressLat: address.latitude,
        addressLng: address.longitude
      });

      if (vendorData && address.id) {
        try {
          console.log("   Calling checkAddressServiceability...");
          const serviceabilityResult = await checkAddressServiceability(address, vendorData);
          console.log("    Serviceability result:", serviceabilityResult);

          // Log the actual values being checked
          console.log("    Serviceability values:", {
            locationServiceAble: serviceabilityResult?.serviceability?.locationServiceAble,
            riderServiceAble: serviceabilityResult?.serviceability?.riderServiceAble,
            payoutsMessage: serviceabilityResult?.payouts?.message
          });

          setServiceabilityData(serviceabilityResult);
        } catch (error) {
          console.error("❌ Serviceability check failed:", error);
        }
      } else {
        console.warn("⚠️ Skipping serviceability check:", {
          hasVendorData: !!vendorData,
          hasAddressId: !!address.id
        });
      }
    } catch (error) {
      console.error("Address selection error:", error);
      showPopup("Error", "Unable to select address. Please try again.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualApplyCoupon = async () => {
    if (!manualCouponCode.trim()) {
      showPopup("Warning", "Please enter a coupon code", "warning");
      return;
    }

    Keyboard.dismiss();
    if (couponInputRef.current) {
      couponInputRef.current.blur();
    }

    setIsProcessing(true);
    setPromoError("");

    try {
      const applyResponse = await applyPromoCode({
        code: manualCouponCode,
        productAmount: fromOrderNow ? subtotal : undefined,
      });

      if (applyResponse && applyResponse.success) {
        dispatch(setAppliedPromo(applyResponse.data));
        setManualCouponCode("");
        setPromoError("");
        showPopup("Success", "Coupon applied successfully!", "success");
      } else {
        throw new Error(applyResponse?.message || "Failed to apply promo code");
      }
    } catch (error) {
      let errorMessage = "Failed to apply coupon";
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection.";
      } else {
        errorMessage = error.message || errorMessage;
      }

      setPromoError(errorMessage);
      showPopup("Error", errorMessage, "error");
    } finally {
      setIsProcessing(false);
      forceEnableScroll();
    }
  };

  const handleRemoveCoupon = () => {
    Keyboard.dismiss();
    showPopup(
      "Remove Coupon?",
      "Are you sure you want to remove this coupon?",
      "warning",
      () => {
        dispatch(removeAppliedPromo());
        forceEnableScroll();
        showPopup("Success", "Coupon removed successfully!", "success");
      }
    );
  };

  const handleContactSupport = () => {
    Linking.openURL("tel:+919023470512");
  };

  const handleTransaction = async () => {
    try {
      if (!selectedAddress) {
        showPopup("Warning", "Please select an address first", "warning");
        return;
      }

      if (!selectedAddress.city || !selectedAddress.zipCode) {
        showPopup(
          "Incomplete Address",
          "Selected address is missing city or ZIP code. Please edit the address or select another.",
          "error"
        );
        return;
      }

      setPaymentModalOpen(true);
    } catch (error) {
      console.error("Error:", error);
      showPopup("Error", "Something went wrong. Please try again.", "error");
    }
  };

  // ============================================================================
  //    HANDLE ORDER CREATION WITH WEBHOOK INTEGRATION
  // ============================================================================
  const handleOrder = async () => {
    if (!payMethod || !selectedAddress) {
      showPopup("Warning", "Please select a payment method and an address", "warning");
      return;
    }

    //    CHECK SERVICEABILITY BEFORE PLACING ORDER
    if (serviceabilityData && !isAddressServiceable()) {
      showPopup(
        "Address Not Serviceable",
        "The selected address cannot be serviced by this kitchen. Please choose a different address.",
        "error"
      );
      return;
    }

    //    PREVENT DUPLICATE CLICKS
    if (isProcessing) {
      console.log("    Already processing - ignoring duplicate click");
      return;
    }

    setIsProcessing(true);

    try {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("   STARTING ORDER PROCESS");
      console.log("    Transaction ID:", transactionId);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // ============================================================================
      // COD PAYMENT FLOW
      // ============================================================================
      if (payMethod === "COD") {
        console.log("   COD Payment Selected");

        const orderPayload = {
          referenceId: transactionId,
          addressId: selectedAddress.id,
          paymentMethod: "COD",
          instructions: instructions || "",
          distanceKm: distanceKm || 3,
          fromOrderNow: fromOrderNow || false,

          ...(fromOrderNow && {
            productId: product?.id,
            weightId: selectedWeight?.id,
            quantity: 1,
          }),

          ...(appliedPromo?.id && {
            promoCodeId: appliedPromo.id,
          }),
        };

        console.log("  COD Order Payload:", JSON.stringify(orderPayload, null, 2));

        let orderData;

        try {
          //    Use the utility function that handles array responses
          const orderResponse = await createOrderWithRetry(orderPayload, user?.token);
          console.log("  New COD order created");
          orderData = orderResponse.data;
        } catch (error) {
          if (error.message === "DUPLICATE_ORDER") {
            console.log("ℹ️ Order already exists. Fetching existing order...");

            try {
              orderData = await getExistingOrder(transactionId, user?.token);
              console.log("  Reusing existing order:", orderData);
            } catch (fetchError) {
              console.error("     Failed to fetch existing order:", fetchError);
              throw new Error("Order already exists but could not be retrieved. Please try again.");
            }
          } else {
            throw error;
          }
        }

        if (!orderData) {
          throw new Error("Order creation failed - no order data");
        }

        console.log("  COD Order Ready:", orderData);

        if (!fromOrderNow) {
          dispatch(clearAllCarts());
        }

        navigation.replace("OrderSuccessScreen", {
          orderId: orderData.orderNumber || orderData.referenceId || transactionId,
          amount: orderData.grandTotal || orderData.amount || finalTotal,
          paymentMethod: "COD",
          status: "success",
        });
      }
      // ============================================================================
      // ONLINE PAYMENT FLOW (WITH WEBHOOK INTEGRATION)
      // ============================================================================
      else if (payMethod === "ONLINE") {
        console.log("    Online Payment Selected");

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  STEP 1: CREATE ORDER IN PENDING STATE
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        console.log("📝 STEP 1: Creating order in PENDING state...");

        const orderPayload = {
          referenceId: transactionId, //    IDEMPOTENT KEY - SAME AS TXNID
          addressId: selectedAddress.id,
          paymentMethod: "ONLINE",
          instructions: instructions || "",
          distanceKm: distanceKm || 3,
          fromOrderNow: fromOrderNow || false,

          ...(fromOrderNow && {
            productId: product?.id,
            weightId: selectedWeight?.id,
            quantity: 1,
          }),

          ...(appliedPromo?.id && {
            promoCodeId: appliedPromo.id,
          }),
        };

        console.log("  Order Payload:", JSON.stringify(orderPayload, null, 2));

        let orderData;
        let isExistingOrder = false;

        try {
          //    Use the utility function that handles array responses
          const orderResponse = await createOrderWithRetry(orderPayload, user?.token);
          orderData = orderResponse.data;
          console.log("  New order created successfully (PENDING state)");
          console.log("  Order referenceId:", orderData.referenceId || orderData.id);
        } catch (error) {
          if (error.message === "DUPLICATE_ORDER") {
            console.log("ℹ️ Order already exists with referenceId:", transactionId);
            console.log("  Fetching existing order...");
            isExistingOrder = true;

            try {
              orderData = await getExistingOrder(transactionId, user?.token);
              console.log("  Reusing existing order:", orderData.referenceId || orderData.id);
            } catch (fetchError) {
              console.error("     Failed to fetch existing order:", fetchError);
              throw new Error("Order already exists but could not be retrieved. Please try again.");
            }
          } else {
            throw error;
          }
        }

        //    VALIDATE ORDER DATA
        if (!orderData) {
          console.error("     No order data after creation/retrieval");
          throw new Error("Failed to create or retrieve order");
        }

        //    Check if order is already paid for (duplicate payment prevention)
        const existingPaymentStatus = orderData?.paymentStatus?.toUpperCase();
        if (isExistingOrder && existingPaymentStatus === "SUCCESS") {
          console.log("   Order already paid! Redirecting to success...");
          setIsProcessing(false);

          if (!fromOrderNow) {
            dispatch(clearAllCarts());
          }

          navigation.replace("OrderSuccessScreen", {
            orderId: orderData.referenceId || transactionId,
            amount: orderData.grandTotal || finalTotal,
            paymentMethod: "ONLINE",
            status: "success",
          });
          return;
        }

        //    Get order amount
        const orderAmount = orderData.grandTotal || orderData.amount || finalTotal;

        console.log("  STEP 1 COMPLETE:");
        console.log("   • Order ready with referenceId:", transactionId);
        console.log("   • Order ID:", orderData.id);
        console.log("   • Order status:", orderData.status);
        console.log("   • Payment status:", orderData.paymentStatus);
        console.log("   • Order amount:", orderAmount);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  STEP 2: GENERATE PayU HASH (SAME transactionId)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        console.log("🔐 STEP 2: Generating PayU hash...");

        const userPhone =
          user?.phone && String(user.phone).trim() !== ""
            ? String(user.phone).trim()
            : "9999999999";

        const userName = user?.name ? String(user.name).trim() : "Customer";
        const userEmail = user?.email ? String(user.email).trim() : "customer@goodbelly.in";
        const productInfo = "Food Order";

        //    Determine canonical amount to charge: ALWAYS use discounted final payableTotal
        // ALWAYS USE DISCOUNTED FINAL TOTAL (includes GST, delivery, fees, minus discount, floored to ₹1)
        const amountToCharge = Number(payableTotal).toFixed(2);

        console.log("   Payable total (discounted):", Number(payableTotal).toFixed(2));
        console.log("    Amount to charge (canonical):", amountToCharge);

        const hashPayload = {
          name: userName,
          email: userEmail,
          phone: userPhone,
          amount: amountToCharge,
          orderInfo: productInfo,
          transactionId: transactionId, //    MUST BE SAME AS referenceId
        };

        console.log("  Hash Generation Payload:", hashPayload);

        const hashResponse = await api.post("/payu/hash", hashPayload, {
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
        });

        const hashData = hashResponse.data?.data || hashResponse.data;

        if (!hashData.hash || !hashData.transactionId) {
          throw new Error("Payment hash not received from server");
        }

        console.log("  STEP 2 COMPLETE:");
        console.log("   • PayU hash generated");
        console.log("   • txnid =", transactionId);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        //  STEP 3: REDIRECT TO PayU (WITH WEBHOOK INTEGRATION)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        console.log("🚀 STEP 3: Redirecting to PayU...");

        const paymentParams = {
          key: Constants.expoConfig?.extra?.payuMerchantKey || "a9ZsYS",
          txnid: transactionId, //    CRITICAL: SAME AS referenceId
          amount: amountToCharge,
          productinfo: productInfo,
          firstname: userName,
          email: userEmail,
          phone: userPhone,
          surl:
            Constants.expoConfig?.extra?.payuSuccessUrl ||
            `${Constants.expoConfig?.extra?.yourApiBaseUrl || process.env.API_BASE_URL}/payu/success-forward`,
          furl:
            Constants.expoConfig?.extra?.payuFailureUrl ||
            `${Constants.expoConfig?.extra?.yourApiBaseUrl || process.env.API_BASE_URL}/payu/failure-forward`,
          hash: hashData.hash,
          udf1: userPhone,
          udf2: "",
          udf3: "",
          udf4: "",
          udf5: "",
        };

        //    RESET isProcessing BEFORE NAVIGATION
        setIsProcessing(false);

        // Navigate to PayU WebView which will submit the payment form,
        // then PayUWebView will redirect to OrderStatusScreen for webhook polling
        navigation.replace("PayUWebView", {
          paymentParams: paymentParams,
          payuUrl: Constants.expoConfig?.extra?.payuActionUrl || "https://secure.payu.in/_payment",
          orderId: transactionId,
          transactionId: transactionId,
          orderData: orderData, //    Pass full order object for ID access
          amount: amountToCharge,
          payableAmount: amountToCharge,
          vendorId: fromOrderNow
            ? product?.vendorId || product?.vendor?.id
            : carts[0]?.vendorId || carts[0]?.vendor?.id,
          fromOrderNow: fromOrderNow,
          // include minimal checkout return params so WebView can return user to same screen on cancel
          checkoutReturnParams: {
            fromOrderNow: fromOrderNow,
            product: product || null,
            selectedWeight: selectedWeight || null,
          },
        });

        console.log("  STEP 3 COMPLETE: User redirected to OrderStatusScreen for webhook polling");
        console.log("");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🎯 FLOW SUMMARY:");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("  Step 1: Order created (PENDING state) with referenceId:", transactionId);
        console.log("  Step 2: PayU hash generated with txnid:", transactionId);
        console.log("  Step 3: User redirected to OrderStatusScreen");
        console.log("    Step 4: User completes payment on PayU");
        console.log("    Step 5: PayU sends webhook to backend");
        console.log("    Step 6: Backend updates order status (SUCCESS/FAILURE)");
        console.log("    Step 7: OrderStatusScreen polls for payment confirmation");
        console.log("    Step 8: User navigated to appropriate success/failure screen");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      }
    } catch (error) {
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("     ORDER PROCESS ERROR");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("Error:", error);
      console.error("Error message:", error.message);
      console.error("Response:", error.response?.data);

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Unable to process order. Please try again.";

      showPopup("Order Error", errorMessage, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const steps = [
    { id: 1, label: "Address" },
    { id: 2, label: "Payment" },
  ];

  const renderOrderSummary = () => {
    if (fromOrderNow) {
      return (
        <View style={tw`flex-row items-center mb-3`}>
          <Image
            source={{ uri: product?.images?.[0]?.url }}
            style={tw`w-12 h-12 rounded-lg mr-3`}
            defaultSource={require("../../assets/icons/healthy-food.png")}
          />
          <View style={tw`flex-1`}>
            <Text
              style={[fontStyles.bodyBold, tw`text-gray-800 text-sm mb-0.5`]}
              numberOfLines={1}
            >
              {product?.name}
            </Text>
            <Text style={[fontStyles.body, tw`text-gray-500 text-xs mb-0.5`]}>
              {selectedWeight?.weight}
            </Text>
            <Text style={[fontStyles.bodyBold, tw`text-[#5F7F67] text-xs`]}>
              ₹{selectedWeight?.discountPrice}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={tw`mb-3`}>
        <Text style={[fontStyles.bodyBold, tw`text-gray-800 text-sm mb-2`]}>Order Summary</Text>
        {carts.map((cart, index) => {
          // Robust kitchen name: check multiple possible locations
          const kitchenName =
            cart.vendor?.kitchenName ||
            cart.items?.[0]?.vendor?.kitchenName ||
            cart.items?.[0]?.product?.vendor?.kitchenName ||
            "GoodBelly Kitchen";

          // Robust vendor ID: for navigation link
          const vendorId =
            cart.vendor?.id ||
            cart.vendorId ||
            cart.items?.[0]?.vendor?.id ||
            cart.items?.[0]?.product?.vendor?.id ||
            null;

          return (
            <View key={index} style={tw`mb-3 pb-2 border-b border-gray-100`}>
              <View style={tw`flex-row justify-between items-center mb-1.5`}>
                <TouchableOpacity
                  onPress={() => vendorId && navigation.navigate("KitchenDetails", { vendorId })}
                  activeOpacity={vendorId ? 0.7 : 1}
                  style={tw`flex-row items-center flex-1 mr-2`}
                >
                  <Text style={[fontStyles.bodyBold, tw`text-[#5F7F67] text-xs`]}>
                    From {kitchenName}
                  </Text>
                  {vendorId && <Ionicons name="chevron-forward" size={12} color="#5F7F67" style={tw`ml-0.5`} />}
                </TouchableOpacity>
                <View style={tw`flex-row items-center`}>
                  <View
                    style={[
                      tw`w-1.5 h-1.5 rounded-full mr-1`,
                      cart.vendor?.isOpen ? tw`bg-green-500` : tw`bg-red-500`,
                    ]}
                  />
                  <Text
                    style={[
                      fontStyles.body,
                      tw`text-xs ${cart.vendor?.isOpen ? "text-green-600" : "text-red-600"}`,
                    ]}
                  >
                    {cart.vendor?.isOpen ? "Open" : "Closed"}
                  </Text>
                </View>
              </View>
              {cart.items.map((item, idx) => (
                <View key={idx} style={tw`flex-row justify-between py-1`}>
                  <View style={tw`flex-1`}>
                    <Text
                      style={[fontStyles.body, tw`text-gray-800 text-xs`]}
                      numberOfLines={1}
                    >
                      {item.product?.name}
                    </Text>
                    <Text style={[fontStyles.body, tw`text-gray-500 text-xs`]}>
                      {item.Weight?.weight} × {item.quantity}
                    </Text>
                  </View>
                  <Text style={[fontStyles.bodyBold, tw`text-gray-800 text-xs`]}>
                    ₹{(() => {
                      // Robust Price Calculation Logic (Matches CartScreen)
                      const weightObj = item?.weight || item?.Weight;
                      const basePrice = Number(
                        weightObj?.discountPrice ??
                        weightObj?.price ??
                        item?.price ??
                        item?.unitPrice ??
                        0
                      );

                      let addOnTotal = 0;
                      if (item?.Addition) {
                        if (typeof item.Addition === 'object' && !Array.isArray(item.Addition)) {
                          addOnTotal = Number(item.Addition.addOnTotal || 0);
                          if (addOnTotal === 0 && Array.isArray(item.Addition.addOns)) {
                            addOnTotal = item.Addition.addOns.reduce((s, a) => s + (Number(a.price) || 0), 0);
                          }
                        } else if (Array.isArray(item.Addition)) {
                          addOnTotal = item.Addition.reduce((s, a) => s + (Number(a.price) || 0), 0);
                        }
                      }
                      return (basePrice + addOnTotal) * item.quantity;
                    })()}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    );
  };

  const renderPricingBreakdown = () => (
    <View style={tw`mt-3`}>
      <PriceRow
        label="Items Count"
        value={
          fromOrderNow ? "1" : `${carts.reduce((count, cart) => count + cart.items.length, 0)}`
        }
      />
      <PriceRow label="Item Total" value={`₹${subtotal.toFixed(2)}`} />

      <View style={tw`flex-row justify-between items-center py-1.5`}>
        <View style={tw`flex-row items-center`}>
          <Text style={[fontStyles.body, tw`text-gray-600 text-xs`]}>GST on Items </Text>
          <GSTInfoModal />
        </View>
        <Text style={[fontStyles.body, tw`text-gray-800 text-xs`]}>
          ₹{charges.gstCharges.toFixed(2)}
        </Text>
      </View>

      <View style={tw`flex-row justify-between items-center py-1.5`}>
        <Text style={[fontStyles.body, tw`text-gray-600 text-xs`]}>Delivery Charges</Text>
        <View style={tw`flex-row items-center`}>
          {serviceabilityData?.payouts?.total && (
            <Text style={[fontStyles.body, tw`text-gray-400 line-through text-xs mr-1.5`]}>
              ₹{serviceabilityData.payouts.total.toFixed(2)}
            </Text>
          )}
          <View style={tw`bg-green-100 px-2 py-0.5 rounded-full`}>
            <Text style={[fontStyles.bodyBold, tw`text-green-700 text-xs`]}>₹30</Text>
          </View>
        </View>
      </View>

      <PriceRow label="Platform Fee" value={`₹${charges.platformCharges.toFixed(2)}`} />

      <View style={tw`border-t border-gray-200 mt-2 pt-2`}>
        <PriceRow label="Grand Total" value={`₹${charges.grandTotal.toFixed(2)}`} isTotal={false} />
      </View>

      {appliedPromo && (
        <View style={tw`bg-green-50 rounded-lg px-2 py-1.5 mt-1`}>
          <PriceRow
            label={`Discount Applied (${appliedPromo.code})`}
            value={`-₹${discount.toFixed(2)}`}
            isDiscount
          />
        </View>
      )}

      <View style={tw`border-t border-gray-200 mt-2 pt-2`}>
        <PriceRow label="Final Total" value={`₹${finalTotal.toFixed(2)}`} isTotal />
      </View>

      <View style={tw`mt-3 pt-3 border-t border-gray-100`}>
        <Text style={[fontStyles.bodyBold, tw`text-gray-800 text-sm mb-2`]}>Nutrition Summary</Text>
        <View style={tw`flex-row flex-wrap`}>
          <NutritionPill
            type={nutritionSummary.calories.type}
            value={nutritionSummary.calories.value}
            macro="Calories"
          />
          <NutritionPill
            type={nutritionSummary.protein.type}
            value={nutritionSummary.protein.value}
            macro="Protein"
          />
          <NutritionPill
            type={nutritionSummary.carbs.type}
            value={nutritionSummary.carbs.value}
            macro="Carbs"
          />
          <NutritionPill
            type={nutritionSummary.fats.type}
            value={nutritionSummary.fats.value}
            macro="Fats"
          />
        </View>
      </View>
    </View>
  );

  const shouldShowPaymentButton = selectedAddress && isAddressServiceable();

  return (
    <SafeAreaView style={tw`flex-1 bg-[${LIGHT_BG}]`}>
      <View style={tw`bg-white px-4 py-3 border-b border-gray-100 shadow-sm`}>
        <View style={tw`flex-row items-center justify-between mb-2`}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={tw`w-8 h-8 items-center justify-center rounded-full bg-gray-50`}
          >
            <Ionicons name="chevron-back" size={18} color="#374151" />
          </TouchableOpacity>
          <Text style={[fontStyles.headingS, tw`text-gray-800 text-base`]}>Checkout</Text>
          <View style={tw`w-8`} />
        </View>
        <ProgressSteps currentStep={step} steps={steps} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={tw`flex-1`}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <Animated.ScrollView
          ref={scrollViewRef}
          style={[{ opacity: fadeAnim }, tw`flex-1`]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY_COLOR]} />
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={true}
          keyboardDismissMode="on-drag"
        >
          <View style={tw`p-3`}>
            <SectionCard>
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <Text style={[fontStyles.headingS, tw`text-gray-800 text-lg`]}>Your Order</Text>
                <View style={tw`bg-[#5F7F67] px-2 py-1 rounded-full`}>
                  <Text style={[fontStyles.bodyBold, tw`text-white text-xs`]}>
                    {fromOrderNow
                      ? "1 Item"
                      : `${carts.reduce((count, cart) => count + cart.items.length, 0)} Items`}
                  </Text>
                </View>
              </View>
              {renderOrderSummary()}

              <View style={tw`mt-3`}>
                <Text
                  style={[
                    fontStyles.body,
                    tw`text-gray-600 text-xs mb-1.5 flex-row items-center`,
                  ]}
                >
                  <Ionicons name="create-outline" size={12} color="#6B7280" style={tw`mr-1`} />
                  Special Instructions (Optional)
                </Text>
                <TextInput
                  style={tw`border border-gray-200 rounded-lg px-3 py-2 text-xs h-16 bg-gray-50`}
                  placeholder="Add any special requests, allergies, or delivery notes..."
                  value={instructions}
                  onChangeText={setInstructions}
                  multiline
                  textAlignVertical="top"
                  placeholderTextColor="#9CA3AF"
                  blurOnSubmit={true}
                />
              </View>
            </SectionCard>

            <SectionCard>
              <Text style={[fontStyles.bodyBold, tw`text-gray-800 text-sm mb-3`]}>Apply Coupon</Text>

              <View style={tw`flex-row gap-2 mb-3`}>
                <View style={tw`flex-1 relative`}>
                  <TextInput
                    ref={couponInputRef}
                    style={tw`border border-gray-200 rounded-lg px-3 py-2 text-xs bg-gray-50 pr-16`}
                    placeholder="Enter coupon code"
                    value={manualCouponCode}
                    onChangeText={(text) => {
                      setManualCouponCode(text.toUpperCase());
                      setPromoError("");
                    }}
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={handleManualApplyCoupon}
                    editable={!isProcessing}
                  />
                  {manualCouponCode.trim() && (
                    <TouchableOpacity
                      style={tw`absolute right-1 top-1 bottom-1 bg-[#5F7F67] px-3 rounded-md justify-center`}
                      onPress={handleManualApplyCoupon}
                      disabled={isProcessing}
                      activeOpacity={0.7}
                    >
                      <Text style={[fontStyles.bodyBold, tw`text-white text-xs`]}>
                        {isProcessing ? "..." : "Apply"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {promoError && (
                <View style={tw`bg-red-50 rounded-lg p-2 mb-2`}>
                  <Text style={[fontStyles.body, tw`text-red-500 text-xs text-center`]}>
                    {promoError}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={tw`border border-dashed border-[#5F7F67] rounded-lg p-3 bg-green-50/30`}
                onPress={() => setPromoModalOpen(true)}
                activeOpacity={0.7}
              >
                <View style={tw`flex-row justify-between items-center`}>
                  <View style={tw`flex-1`}>
                    <Text style={[fontStyles.bodyBold, tw`text-[#5F7F67] text-xs`]}>
                      {appliedPromo ? `Applied: ${appliedPromo.code}` : "Browse Available Coupons"}
                    </Text>
                    {appliedPromo && (
                      <Text style={[fontStyles.body, tw`text-green-600 text-xs mt-0.5`]}>
                        Saved ₹{appliedPromo.discount}
                      </Text>
                    )}
                  </View>
                  <View style={tw`bg-[#5F7F67] w-6 h-6 rounded-full items-center justify-center`}>
                    <Ionicons
                      name={appliedPromo ? "pricetag" : "pricetag-outline"}
                      size={14}
                      color="white"
                    />
                  </View>
                </View>
              </TouchableOpacity>

              {appliedPromo && (
                <TouchableOpacity
                  style={tw`mt-2 flex-row items-center justify-center`}
                  onPress={handleRemoveCoupon}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={14} color="#EF4444" />
                  <Text style={[fontStyles.body, tw`text-red-600 text-xs ml-1`]}>Remove Coupon</Text>
                </TouchableOpacity>
              )}
            </SectionCard>

            <SectionCard>
              <Text style={[fontStyles.bodyBold, tw`text-gray-800 text-sm mb-3`]}>Price Details</Text>
              {renderPricingBreakdown()}
            </SectionCard>

            <SectionCard>
              <Text style={[fontStyles.bodyBold, tw`text-gray-800 text-sm mb-3`]}>
                Delivery Address
              </Text>
              <AddressManager
                showActions={false}
                onAddressSelect={handleAddressSelect}
                selectedAddressId={selectedAddress?.id}
                vendorData={fromOrderNow ? product?.vendor : carts[0]?.vendor}
              />
            </SectionCard>

            <SectionCard style={tw`bg-gray-50`}>
              <View style={tw`flex-row items-center mb-3`}>
                <View style={tw`bg-green-100 p-2.5 rounded-full mr-3`}>
                  <Ionicons name="headset-outline" size={20} color="#5F7F67" />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={[fontStyles.bodyBold, tw`text-gray-800 text-sm`]}>Need Help?</Text>
                  <Text style={[fontStyles.body, tw`text-gray-500 text-xs mt-0.5`]}>
                    Our customer support team is here to help you
                  </Text>
                </View>
              </View>

              <View style={tw`bg-white rounded-lg p-3 border border-gray-200`}>
                <View style={tw`flex-row items-center mb-2.5`}>
                  <View style={tw`bg-green-50 p-2 rounded-lg mr-2.5 border border-green-100`}>
                    <Ionicons name="call" size={16} color="#5F7F67" />
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={[fontStyles.body, tw`text-gray-500 text-xs mb-0.5`]}>
                      Call us 24/7
                    </Text>
                    <Text style={[fontStyles.bodyBold, tw`text-gray-800 text-sm`]}>
                      +91 90234 70512
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={tw`bg-[#5F7F67] px-3 py-1.5 rounded-lg flex-row items-center`}
                    onPress={handleContactSupport}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call-outline" size={12} color="white" />
                    <Text style={[fontStyles.bodyBold, tw`text-white text-xs ml-0.5`]}>Call</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={tw`mt-3 bg-green-50/50 rounded-lg p-2.5`}>
                <View style={tw`flex-row items-center`}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={14}
                    color="#5F7F67"
                    style={tw`mr-1.5`}
                  />
                  <Text style={[fontStyles.body, tw`text-gray-600 text-xs`]}>
                    <Text style={tw`font-semibold`}>100% Secure Checkout</Text> - Your payment
                    information is encrypted and secure
                  </Text>
                </View>
              </View>
            </SectionCard>
          </View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>

      <View style={tw`bg-white border-t border-gray-200 pt-3 pb-3 px-4`}>
        <View style={tw`flex-row items-center mb-2`}>
          <View style={tw`flex-shrink-0 mr-2`}>
            <Text style={[fontStyles.body, tw`text-gray-500 text-xs`]}>Total Amount</Text>
            <View style={tw`flex-row items-baseline`}>
              {appliedPromo && (
                <Text
                  style={[fontStyles.body, tw`text-gray-400 text-xs line-through mr-1.5`]}
                >
                  ₹{charges.grandTotal.toFixed(2)}
                </Text>
              )}
              <Text style={[fontStyles.headingS, tw`text-gray-800 text-lg font-bold`]}>
                ₹{payableTotal.toFixed(2)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              tw`px-3 py-3 rounded-lg justify-center items-center shadow-sm flex-1`,
              selectedAddress && (!isProcessing || step === 2) && shouldShowPaymentButton
                ? { backgroundColor: PRIMARY_COLOR }
                : tw`bg-gray-300`,
            ]}
            onPress={step === 1 ? handleTransaction : handleOrder}
            disabled={
              isProcessing ||
              !selectedAddress ||
              !shouldShowPaymentButton ||
              (step === 2 && !payMethod)
            }
            activeOpacity={0.7}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <View style={tw`flex-row items-center`}>
                <Ionicons
                  name={
                    !selectedAddress || !shouldShowPaymentButton
                      ? "alert-circle-outline"
                      : step === 1
                        ? "arrow-forward"
                        : payMethod === "ONLINE"
                          ? "card-outline"
                          : "cash-outline"
                  }
                  size={16}
                  color="white"
                  style={tw`mr-1.5`}
                />
                <Text
                  style={[fontStyles.bodyBold, tw`text-white text-sm font-semibold`]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {!selectedAddress
                    ? "Select Address"
                    : !shouldShowPaymentButton
                      ? "Address Not Serviceable"
                      : step === 1
                        ? "Continue to Payment"
                        : payMethod === "ONLINE"
                          ? "Pay Now"
                          : "Place Order"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[fontStyles.body, tw`text-gray-400 text-xs text-center`]}>
          {!selectedAddress || !shouldShowPaymentButton
            ? "Please select a serviceable address to continue"
            : "By continuing, you agree to our Terms & Conditions"}
        </Text>
      </View>

      <PromoModal
        visible={isPromoModalOpen}
        onClose={() => {
          setPromoModalOpen(false);
          forceEnableScroll();
        }}
        singleAmount={charges.grandTotal}
      />

      <PaymentModal
        visible={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          forceEnableScroll();
        }}
        onPaymentMethodSelect={(method) => {
          setPayMethod(method);
          setPaymentModalOpen(false);
          setStep(2);
          forceEnableScroll();
        }}
      />

      <CustomPopup
        visible={popupVisible}
        onClose={() => {
          setPopupVisible(false);
          forceEnableScroll();
        }}
        title={popupConfig.title}
        message={popupConfig.message}
        type={popupConfig.type}
        showCancelButton={popupConfig.type === "warning"}
        cancelText="Cancel"
        confirmText={popupConfig.type === "warning" ? "Remove" : "OK"}
        onConfirm={() => {
          if (popupConfig.onConfirm) {
            popupConfig.onConfirm();
          }
          setPopupVisible(false);
          forceEnableScroll();
        }}
        onCancel={() => {
          setPopupVisible(false);
          forceEnableScroll();
        }}
      />
    </SafeAreaView>
  );
}