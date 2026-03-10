import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  Modal,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";
import { authService } from "../../services/authService";
import { OrderDetailsSkeleton } from "../ProductSkeleton";

const PRIMARY_COLOR = "#5F7F67";
const STATUS_BAR_COLOR = "#8FA599"; // Only for status bar

// Format date as "Friday, 2 January 2026"
const formatOrderDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('en-GB', options);
};

const getNestedValue = (obj, path) => {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

const getNumericValue = (obj, ...keys) => {
  for (const key of keys) {
    const value = key.includes('.') ? getNestedValue(obj, key) : obj?.[key];
    if (value !== undefined && value !== null && !isNaN(value)) {
      return Number(value);
    }
  }
  return 0;
};

const getStringValue = (obj, ...keys) => {
  for (const key of keys) {
    const value = key.includes('.') ? getNestedValue(obj, key) : obj?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
  }
  return "";
};

// GST Info Modal Component
const GSTInfoModal = React.memo(() => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const GSTRateItem = useCallback(({ label, rate, isFree = false, originalRate = "" }) => (
    <View style={tw`flex-row justify-between items-center py-2 border-b border-gray-100`}>
      <Text style={[fontStyles.body, tw`text-gray-700 text-xs`]}>{label}</Text>
      <View style={tw`flex-row items-center`}>
        {isFree && originalRate && (
          <Text style={[fontStyles.body, tw`text-gray-400 line-through text-xs mr-2`]}>
            {originalRate}
          </Text>
        )}
        <Text style={[fontStyles.bodyBold, tw`text-xs`, isFree ? tw`text-green-600` : tw`text-gray-800`]}>
          {rate}
        </Text>
      </View>
    </View>
  ), []);

  return (
    <>
      <TouchableOpacity onPress={() => setIsModalOpen(true)} style={tw`ml-1`}>
        <Ionicons name="information-circle" size={14} color={PRIMARY_COLOR} />
      </TouchableOpacity>

      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
          <View style={tw`bg-white rounded-xl p-4 w-full max-w-xs`}>
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <View style={tw`flex-row items-center`}>
                <Ionicons name="receipt" size={18} color={PRIMARY_COLOR} />
                <Text style={[fontStyles.bodyBold, tw`text-gray-800 text-sm ml-2`]}>
                  GST Breakdown
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                style={tw`w-6 h-6 items-center justify-center rounded-full bg-gray-100`}
              >
                <Ionicons name="close" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={tw`mb-4`}>
              <GSTRateItem label="Item Total" rate="5% GST" />
              <GSTRateItem label="Delivery Fee" rate="Free" isFree originalRate="18% GST" />
              <GSTRateItem label="Platform Fee" rate="Free" isFree originalRate="18% GST" />
            </View>

            <View style={tw`bg-blue-50 rounded-lg p-2.5 mb-3`}>
              <Text style={[fontStyles.body, tw`text-blue-700 text-xs text-center`]}>
                Only 5% GST applied on food items as per government regulations
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setIsModalOpen(false)}
              style={[tw`py-2 rounded-lg`, { backgroundColor: PRIMARY_COLOR }]}
            >
              <Text style={[fontStyles.bodyBold, tw`text-white text-xs text-center`]}>
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
});

GSTInfoModal.displayName = 'GSTInfoModal';

export default function OrderDetailsScreen({ route, navigation }) {
  const { orderId, referenceId } = route.params || {};
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [loadingDelivery, setLoadingDelivery] = useState(false);

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle("light-content", false);
      if (Platform.OS === "android") {
        StatusBar.setBackgroundColor(STATUS_BAR_COLOR, false);
      }
    }, [])
  );

  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const ref = referenceId || orderId;

      if (!ref) {
        throw new Error("Missing order reference");
      }

      const response = await authService.getOrderById(ref);

      const orderData = response?.data || response;

      if (!orderData) {
        throw new Error("Order not found");
      }

      setOrder(orderData);

      // Try to fetch dedicated delivery info (optional)
      try {
        setLoadingDelivery(true);
        const deliveryResp = await authService.getOrderDelivery(ref);
        if (deliveryResp && (deliveryResp.data || deliveryResp)) {
          setDeliveryInfo(deliveryResp.data || deliveryResp);
        } else {
          // fallback to delivery details inside order payload if present
          const fallbackDelivery = orderData.delivery || orderData.deliveryInfo || orderData.rider || orderData.deliveryPartner || null;
          if (fallbackDelivery) setDeliveryInfo(fallbackDelivery);
        }
      } catch (err) {
        console.warn('Delivery fetch failed, using order payload if available');
        const fallbackDelivery = orderData.delivery || orderData.deliveryInfo || orderData.rider || orderData.deliveryPartner || null;
        if (fallbackDelivery) setDeliveryInfo(fallbackDelivery);
      } finally {
        setLoadingDelivery(false);
      }

    } catch (err) {
      console.warn("Primary fetch failed, attempting fallback via getOrders list...");
      // FALLBACK: If getOrderById fails (e.g. backend expects referenceId but we have orderId),
      // fetch ALL orders and filter locally.
      try {
        const allOrdersResponse = await authService.getOrders();
        // Handle response.data wrapper if present
        const allOrders = allOrdersResponse.data || allOrdersResponse;

        if (Array.isArray(allOrders)) {
          const ref = referenceId || orderId;
          // Flexible match: match ID or ReferenceID
          const foundOrder = allOrders.find(o =>
            String(o.id) === String(ref) ||
            String(o.referenceId) === String(ref)
          );

          if (foundOrder) {
            setOrder(foundOrder);

            // Extract delivery info if present in payload
            const fallbackDelivery = foundOrder.delivery || foundOrder.deliveryInfo || foundOrder.rider || foundOrder.deliveryPartner || null;
            if (fallbackDelivery) setDeliveryInfo(fallbackDelivery);

            return; // Success!
          }
        }
      } catch (fallbackErr) {
        console.warn("Fallback fetch also failed:", fallbackErr);
      }

      setError("Unable to load order details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [orderId, referenceId]);


  useEffect(() => {
    if (orderId || referenceId) {
      fetchOrderDetails();
    } else {
      setError("Invalid order reference");
      setLoading(false);
    }
  }, [orderId, referenceId, fetchOrderDetails]);

  const orderStatus = useMemo(() => {
    if (!order) return { label: "Unknown", color: "#6B7280", bg: "#F3F4F6" };

    const statusMap = {
      cancelled: { label: "CANCELLED", color: "#FFFFFF", bg: "#EF4444" },
      canceled: { label: "CANCELLED", color: "#FFFFFF", bg: "#EF4444" },
      delivered: { label: "DELIVERED", color: "#FFFFFF", bg: "#10B981" },
      pending: { label: "PENDING", color: "#FFFFFF", bg: "#F59E0B" },
      processing: { label: "PROCESSING", color: "#FFFFFF", bg: "#3B82F6" },
      confirmed: { label: "CONFIRMED", color: "#FFFFFF", bg: "#3B82F6" },
      shipped: { label: "SHIPPED", color: "#FFFFFF", bg: "#8B5CF6" },
      out_for_delivery: { label: "OUT FOR DELIVERY", color: "#FFFFFF", bg: "#8B5CF6" },
    };

    const status = getStringValue(order, "status", "orderStatus", "state").toLowerCase();
    return statusMap[status] || { label: status?.toUpperCase() || "PENDING", color: "#FFFFFF", bg: "#6B7280" };
  }, [order]);

  const paymentStatus = useMemo(() => {
    if (!order) return { label: "Unknown", color: "#FFFFFF", bg: "#6B7280" };

    const statusMap = {
      success: { label: "Payment SUCCESS", color: "#FFFFFF", bg: "#10B981" },
      paid: { label: "Payment SUCCESS", color: "#FFFFFF", bg: "#10B981" },
      completed: { label: "Payment SUCCESS", color: "#FFFFFF", bg: "#10B981" },
      failed: { label: "Payment FAILED", color: "#FFFFFF", bg: "#EF4444" },
      pending: { label: "Payment PENDING", color: "#FFFFFF", bg: "#F59E0B" },
    };

    const status = getStringValue(order, "paymentStatus", "payment.status", "paymentInfo.status").toLowerCase();
    return statusMap[status] || { label: `Payment ${status?.toUpperCase() || "PENDING"}`, color: "#FFFFFF", bg: "#6B7280" };
  }, [order]);

  const financials = useMemo(() => {
    if (!order) {
      return {
        itemTotal: 0,
        deliveryCharges: 0,
        platformCharges: 0,
        gst: 0,
        discount: 0,
        finalTotal: 0,
        itemsCount: 0,
      };
    }

    return {
      itemTotal: getNumericValue(order, "totalPrice", "itemTotal", "subtotal"),
      gst: getNumericValue(order, "gstCharges", "gst", "tax"),
      deliveryCharges: getNumericValue(order, "deliveryCharges", "deliveryFee", "shippingFee"),
      platformCharges: getNumericValue(order, "platformCharges", "platformFee", "serviceFee"),
      discount: getNumericValue(order, "discount", "discountAmount"),
      finalTotal: getNumericValue(order, "grandTotal", "total", "totalAmount"),
      itemsCount: order.items?.length || 0,
    };
  }, [order]);

  const deliveryAddress = useMemo(() => {
    if (!order) return null;

    const address = order.address || order.shippingAddress || order.deliveryAddress;
    if (!address) return null;

    return {
      addressType: getStringValue(address, "type", "addressType", "label") || "Home",
      street: getStringValue(address, "addressLine", "street", "address"),
      landmark: getStringValue(address, "landmark", "addressLine2"),
      city: getStringValue(address, "city", "cityName"),
      state: getStringValue(address, "state", "stateName"),
      pincode: getStringValue(address, "zipCode", "pincode", "postalCode"),
    };
  }, [order]);

  const canCancel = useMemo(() => {
    if (!order) return false;
    const status = (order.status || "").toString().toLowerCase();
    const payment = (order.paymentStatus || "").toString().toLowerCase();
    // Allow cancel when not delivered or already cancelled and not in final state
    return !["delivered", "cancelled", "canceled"].includes(status) && status !== "returned";
  }, [order]);

  const getProductImage = useCallback((item) => {
    return item?.product?.images?.[0]?.url ||
      item?.product?.image?.url ||
      item?.product?.image ||
      item?.productImage ||
      item?.image ||
      null;
  }, []);

  const handleProductPress = useCallback((item) => {
    if (!item?.product) return;

    navigation.navigate("ProductDetails", {
      product: item.product,
      productId: item.product.id || item.product._id || item.productId,
    });
  }, [navigation]);

  if (loading) {
    return <OrderDetailsSkeleton />;
  }

  if (error || !order) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "left", "right"]}>
        <StatusBar barStyle="light-content" backgroundColor={STATUS_BAR_COLOR} />
        <View style={tw`flex-1 justify-center items-center px-6`}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={[fontStyles.headingS, tw`text-lg mt-4 text-center text-gray-900`]}>
            Order Not Found
          </Text>
          <Text style={[fontStyles.body, tw`text-sm mt-2 text-center text-gray-600`]}>
            {error || "Unable to load order details"}
          </Text>
          <TouchableOpacity
            style={[tw`mt-6 px-8 py-3 rounded-full`, { backgroundColor: PRIMARY_COLOR }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[fontStyles.bodyBold, tw`text-white text-sm`]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PRIMARY_COLOR }} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor={STATUS_BAR_COLOR} />

      {/* Header with Order Summary */}
      <View style={[tw`px-4 py-4`, { backgroundColor: PRIMARY_COLOR }]}>
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={tw`w-8 h-8 items-center justify-center`}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[fontStyles.headingS, tw`text-white text-lg font-bold`]}>Order Summary</Text>
          <View style={tw`w-8`} />
        </View>

        <Text style={[fontStyles.body, tw`text-white text-xs mb-1`]}>
          Order ID: {getStringValue(order, "referenceId", "orderNumber", "id") || orderId}
        </Text>
        <Text style={[fontStyles.body, tw`text-white text-xs mb-3`]}>
          {formatOrderDate(getStringValue(order, "createdAt", "orderDate", "date"))}
        </Text>

        <View style={tw`flex-row items-center gap-2 flex-wrap`}>
          <View style={[tw`px-3 py-1.5 rounded`, { backgroundColor: orderStatus.bg }]}>
            <Text style={[fontStyles.bodyBold, tw`text-xs`, { color: orderStatus.color }]}>
              {orderStatus.label}
            </Text>
          </View>
          <View style={[tw`px-3 py-1.5 rounded`, { backgroundColor: paymentStatus.bg }]}>
            <Text style={[fontStyles.bodyBold, tw`text-xs`, { color: paymentStatus.color }]}>
              {paymentStatus.label}
            </Text>
          </View>
          {canCancel && (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  "Cancel Order",
                  "Are you sure you want to cancel this order?",
                  [
                    { text: "No", style: "cancel" },
                    {
                      text: "Yes, Cancel",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          setLoading(true);
                          const res = await authService.cancelOrder(order.id || order._id || order.referenceId);
                          // If backend returns updated order, refresh
                          if (res && res.data) {
                            setOrder(res.data);
                          } else {
                            // refetch
                            await fetchOrderDetails();
                          }
                          Alert.alert("Success", "Order cancelled successfully");
                        } catch (err) {
                          console.error("Cancel order error:", err);
                          Alert.alert("Error", err?.response?.data?.message || err.message || "Unable to cancel order");
                        } finally {
                          setLoading(false);
                        }
                      },
                    },
                  ],
                  { cancelable: true }
                );
              }}
              style={[tw`px-3 py-1.5 rounded`, { backgroundColor: "#EF4444" }]}
            >
              <Text style={[fontStyles.bodyBold, tw`text-white text-xs`]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={tw`flex-1 bg-white`} showsVerticalScrollIndicator={false}>
        {/* Order Items - Tappable */}
        <View style={tw`px-4 py-4`}>
          <View style={tw`flex-row items-center mb-3`}>
            <Ionicons name="cube-outline" size={20} color={PRIMARY_COLOR} style={tw`mr-2`} />
            <Text style={[fontStyles.headingS, tw`text-base text-gray-900`]}>Order Items</Text>
          </View>

          {order.items?.length > 0 ? (
            order.items.map((item, index) => {
              const productImage = getProductImage(item);
              const productName = getStringValue(item, "product.name", "productName", "name") || "Product";
              const weight = getStringValue(item, "Weight.weight", "weight.value", "weight") || "N/A";
              const quantity = getNumericValue(item, "quantity", "qty") || 1;
              const price = getNumericValue(item, "price", "Weight.discountPrice", "finalPrice") || 0;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    tw`bg-white rounded-xl p-3 mb-3 border border-gray-200`,
                    {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      elevation: 1,
                    }
                  ]}
                  onPress={() => handleProductPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={tw`flex-row items-center`}>
                    <View style={tw`rounded-xl overflow-hidden mr-3 w-15 h-15 bg-gray-100`}>
                      {productImage ? (
                        <Image source={{ uri: productImage }} style={tw`w-full h-full`} resizeMode="cover" />
                      ) : (
                        <View style={tw`w-full h-full items-center justify-center`}>
                          <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                        </View>
                      )}
                    </View>

                    <View style={tw`flex-1`}>
                      <Text style={[fontStyles.bodyBold, tw`text-sm mb-1 text-gray-900`]} numberOfLines={2}>
                        {productName}
                      </Text>
                      <Text style={[fontStyles.body, tw`text-xs mb-1 text-gray-600`]}>
                        Weight: {weight}
                      </Text>
                      <Text style={[fontStyles.bodyBold, tw`text-sm`, { color: PRIMARY_COLOR }]}>
                        Qty: {quantity} • ₹{price.toFixed(2)}
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={tw`bg-gray-50 rounded-xl p-4`}>
              <Text style={[fontStyles.body, tw`text-sm text-center text-gray-600`]}>
                No items found in this order
              </Text>
            </View>
          )}
        </View>

        {/* Live Delivery Tracking */}
        <View style={tw`px-4 py-4 border-t border-gray-200`}>
          <View style={tw`flex-row items-center mb-3`}>
            <Ionicons name="location-outline" size={20} color={PRIMARY_COLOR} style={tw`mr-2`} />
            <Text style={[fontStyles.headingS, tw`text-base text-gray-900`]}>Live Tracking</Text>
          </View>

          <View style={tw`bg-white rounded-2xl p-4 border border-gray-200 shadow-sm`}>
            {loadingDelivery ? (
              <View style={tw`items-center justify-center py-6`}>
                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                <Text style={[fontStyles.body, tw`text-sm text-gray-600 mt-2`]}>Fetching live delivery updates...</Text>
              </View>
            ) : (
              <>
                {/* Status */}
                <View style={tw`flex-row justify-between items-center mb-4`}>
                  <Text style={[fontStyles.body, tw`text-sm text-gray-600`]}>Delivery Status</Text>
                  <View style={tw`px-3 py-1 rounded-full bg-blue-100`}>
                    <Text style={[fontStyles.bodyBold, tw`text-xs text-blue-700`]}>
                      {getStringValue(deliveryInfo, "status") || getStringValue(order, "status")?.toUpperCase() || "PENDING"}
                    </Text>
                  </View>
                </View>

                {/* Rider Card */}
                <View style={tw`bg-gray-50 rounded-xl p-3 mb-4`}>
                  <View style={tw`flex-row items-center justify-between mb-2`}>
                    <View>
                      <Text style={[fontStyles.body, tw`text-xs text-gray-500`]}>Delivery Partner</Text>
                      <Text style={[fontStyles.bodyBold, tw`text-sm text-gray-900 mt-0.5`]}>
                        {getStringValue(deliveryInfo, "rider.name", "driver.name") || getStringValue(order, "riderName", "deliveryPerson.name") || "Assigned Soon"}
                      </Text>
                    </View>

                    <Ionicons name="bicycle-outline" size={22} color={PRIMARY_COLOR} />
                  </View>

                  {/* Phone */}
                  <TouchableOpacity
                    onPress={() => {
                      const phone = getStringValue(deliveryInfo, "rider.phone", "driver.phone") || getStringValue(order, "riderPhone", "deliveryPerson.phone") || "";
                      if (phone) Linking.openURL(`tel:${phone}`);
                    }}
                    disabled={
                      !getStringValue(deliveryInfo, "rider.phone", "driver.phone") &&
                      !getStringValue(order, "riderPhone", "deliveryPerson.phone")
                    }
                    style={tw`flex-row items-center mt-1`}
                  >
                    <Ionicons name="call-outline" size={16} color={PRIMARY_COLOR} />
                    <Text style={[fontStyles.bodyBold, tw`text-sm text-teal-600 ml-2`]}>
                      {getStringValue(deliveryInfo, "rider.phone", "driver.phone") || getStringValue(order, "riderPhone", "deliveryPerson.phone") || "Not available"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Track CTA */}
                {(() => {
                  const trackUrl = getStringValue(deliveryInfo, "trackingUrl", "mapUrl") || getStringValue(order, "trackingUrl", "delivery.trackingUrl") || null;

                  if (trackUrl) {
                    return (
                      <TouchableOpacity
                        onPress={() => navigation.navigate("InAppWebView", { url: trackUrl, title: "Track Order" })}
                        style={[
                          tw`py-3 rounded-xl items-center`,
                          { backgroundColor: PRIMARY_COLOR },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text style={[fontStyles.bodyBold, tw`text-white text-sm`]}>Track Order Live →</Text>
                      </TouchableOpacity>
                    );
                  }

                  return (
                    <Text style={[fontStyles.body, tw`text-sm text-gray-500 text-center`]}>Live tracking will be available once the rider is assigned</Text>
                  );
                })()}
              </>
            )}
          </View>
        </View>

        {/* Bill Details */}
        <View style={tw`px-4 py-4 border-t border-gray-200`}>
          <View style={tw`flex-row items-center mb-3`}>
            <Ionicons name="receipt-outline" size={20} color={PRIMARY_COLOR} style={tw`mr-2`} />
            <Text style={[fontStyles.headingS, tw`text-base text-gray-900`]}>Bill Details</Text>
          </View>

          <View style={tw`bg-gray-50 rounded-xl p-4`}>
            <View style={tw`flex-row justify-between mb-2`}>
              <Text style={[fontStyles.body, tw`text-sm text-gray-600`]}>Items Count:</Text>
              <Text style={[fontStyles.bodyBold, tw`text-sm text-gray-900`]}>{financials.itemsCount}</Text>
            </View>

            <View style={tw`flex-row justify-between mb-2`}>
              <Text style={[fontStyles.body, tw`text-sm text-gray-600`]}>Item Total:</Text>
              <Text style={[fontStyles.bodyBold, tw`text-sm text-gray-900`]}>₹{financials.itemTotal.toFixed(2)}</Text>
            </View>

            <View style={tw`flex-row justify-between mb-2`}>
              <View style={tw`flex-row items-center`}>
                <Text style={[fontStyles.body, tw`text-sm text-gray-600`]}>GST on Items</Text>
                <GSTInfoModal />
              </View>
              <Text style={[fontStyles.bodyBold, tw`text-sm text-gray-900`]}>₹{financials.gst.toFixed(2)}</Text>
            </View>

            <View style={tw`flex-row justify-between mb-2`}>
              <Text style={[fontStyles.body, tw`text-sm text-gray-600`]}>Delivery Charges:</Text>
              <Text style={[fontStyles.bodyBold, tw`text-sm text-gray-900`]}>₹{financials.deliveryCharges.toFixed(2)}</Text>
            </View>

            {financials.platformCharges > 0 && (
              <View style={tw`flex-row justify-between mb-2`}>
                <Text style={[fontStyles.body, tw`text-sm text-gray-600`]}>Platform Fee:</Text>
                <Text style={[fontStyles.bodyBold, tw`text-sm text-gray-900`]}>₹{financials.platformCharges.toFixed(2)}</Text>
              </View>
            )}

            {financials.discount > 0 && (
              <View style={tw`flex-row justify-between mb-3 bg-green-50 -mx-4 px-4 py-2 rounded-lg`}>
                <Text style={[fontStyles.body, tw`text-sm text-green-600`]}>Discount Applied:</Text>
                <Text style={[fontStyles.bodyBold, tw`text-sm text-green-600`]}>-₹{financials.discount.toFixed(2)}</Text>
              </View>
            )}

            <View style={tw`pt-3 border-t border-gray-300 flex-row justify-between`}>
              <Text style={[fontStyles.headingS, tw`text-base text-gray-900`]}>Total Payable:</Text>
              <Text style={[fontStyles.headingS, tw`text-base`, { color: PRIMARY_COLOR }]}>
                ₹{financials.finalTotal.toFixed(2)}
              </Text>
            </View>

            {financials.discount > 0 && (
              <Text style={[fontStyles.body, tw`text-xs mt-2 text-green-600`]}>
                ✓ You saved ₹{financials.discount.toFixed(2)}!
              </Text>
            )}
          </View>
        </View>

        {/* Payment Info */}
        <View style={tw`px-4 py-4 border-t border-gray-200`}>
          <View style={tw`flex-row items-center mb-3`}>
            <Ionicons name="card-outline" size={20} color={PRIMARY_COLOR} style={tw`mr-2`} />
            <Text style={[fontStyles.headingS, tw`text-base text-gray-900`]}>Payment Info</Text>
          </View>

          <View style={tw`bg-gray-50 rounded-xl p-4`}>
            <View style={tw`flex-row justify-between mb-2`}>
              <Text style={[fontStyles.body, tw`text-sm text-gray-600`]}>Method:</Text>
              <Text style={[fontStyles.bodyBold, tw`text-sm text-gray-900`]}>
                {getStringValue(order, "paymentMethod", "payment.method") || "ONLINE"}
              </Text>
            </View>

            <View style={tw`flex-row justify-between`}>
              <Text style={[fontStyles.body, tw`text-sm text-gray-600`]}>Status:</Text>
              <View style={[tw`px-2 py-1 rounded`, { backgroundColor: paymentStatus.bg }]}>
                <Text style={[fontStyles.bodyBold, tw`text-xs`, { color: paymentStatus.color }]}>
                  {paymentStatus.label}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Delivery Address */}

        <View style={tw`px-4 py-4 border-t border-gray-200 mb-4`}>
          <View style={tw`flex-row items-center mb-3`}>
            <Ionicons name="location-outline" size={20} color={PRIMARY_COLOR} style={tw`mr-2`} />
            <Text style={[fontStyles.headingS, tw`text-base text-gray-900`]}>Delivery Address</Text>
          </View>

          <View style={tw`bg-gray-50 rounded-xl p-4`}>
            {deliveryAddress ? (
              <>
                <Text style={[fontStyles.bodyBold, tw`text-sm mb-2 text-gray-900`]}>
                  {deliveryAddress.addressType}
                </Text>
                {deliveryAddress.street && (
                  <Text style={[fontStyles.body, tw`text-sm text-gray-600`]}>
                    {deliveryAddress.street}
                    {deliveryAddress.landmark && `, ${deliveryAddress.landmark}`}
                  </Text>
                )}
                {(deliveryAddress.city || deliveryAddress.state || deliveryAddress.pincode) && (
                  <Text style={[fontStyles.body, tw`text-sm text-gray-600`]}>
                    {[deliveryAddress.city, deliveryAddress.state, deliveryAddress.pincode]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                )}
              </>
            ) : (
              <Text style={[fontStyles.body, tw`text-sm text-center text-gray-600`]}>
                No delivery address available
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
