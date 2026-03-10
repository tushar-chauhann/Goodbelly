import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";
import { authService } from "../../services/authService";

const PRIMARY_COLOR = "#5F7F67";

// ==================== CUSTOM HOOKS ====================

const useOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      console.log("Fetching orders...");
      const response = await authService.getOrders();

      let ordersData = [];
      if (response?.data) {
        ordersData = Array.isArray(response.data) ? response.data : [response.data];
      } else if (Array.isArray(response)) {
        ordersData = response;
      }

      const sorted = ordersData.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.orderDate || 0);
        const dateB = new Date(b.createdAt || b.orderDate || 0);
        return dateB - dateA;
      });

      setOrders(sorted);
      console.log(`Loaded ${sorted.length} orders`);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  return { orders, loading, refreshing, fetchOrders, refresh };
};

const useStatusBar = (bgColor = "#FFFFFF") => {
  useFocusEffect(
    useCallback(() => {
      const lightBgs = ["#FFFFFF", "#F3F4F6", "#FAFAFA", "#F9FAFB", "white"];
      const barStyle = lightBgs.includes(bgColor) ? "dark-content" : "light-content";
      StatusBar.setBarStyle(barStyle, false);
      if (Platform.OS === "android") {
        StatusBar.setBackgroundColor(bgColor, false);
      }
    }, [bgColor])
  );
};

const useFormatDateTime = () => {
  return useCallback((dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `Placed at ${day} ${month} ${year} , ${hours}:${minutes}`;
  }, []);
};

// ==================== COMPONENTS ====================

const OrderCard = ({ order, onPress, formatDateTime }) => {
  const isCancelled =
    order.status?.toLowerCase() === "cancelled" ||
    order.status?.toLowerCase() === "canceled";

  const firstItem = order.items?.[0];
  const itemCount = order.items?.length || 0;

  const productImage =
    firstItem?.product?.images?.[0]?.url ||
    firstItem?.product?.image ||
    null;

  //   FIXED: Use grandTotal as primary (this includes GST + delivery + platform fee)
  const totalAmount =
    order.grandTotal ||
    order.totalPayable ||
    order.finalAmount ||
    order.totalPrice ||
    order.total ||
    order.amount ||
    0;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(order)}
      style={[
        tw`bg-white mx-4 mb-3 rounded-xl p-3 border border-gray-100`,
        {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2,
        },
      ]}
    >
      <View style={tw`flex-row items-center justify-between mb-2`}>
        <View style={tw`flex-row items-center flex-1`}>
          <Text
            style={[
              fontStyles.body,
              tw`text-sm`,
              { color: isCancelled ? "#EF4444" : "#1F2937" },
            ]}
          >
            Order {isCancelled ? "cancelled" : "placed"}
          </Text>
          {isCancelled && (
            <View style={tw`ml-1 bg-red-100 rounded-full p-0.5`}>
              <Ionicons name="close-circle" size={14} color="#EF4444" />
            </View>
          )}
        </View>

        <View style={tw`flex-row items-center`}>
          <Text
            style={[
              fontStyles.headingS,
              tw`text-sm mr-1`,
              { color: "#1F2937" },
            ]}
          >
            ₹{Number(totalAmount).toFixed(2)}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </View>
      </View>

      <Text style={[fontStyles.body, tw`text-xs mb-3`, { color: "#6B7280" }]}>
        {formatDateTime(order.createdAt || order.orderDate)}
      </Text>

      <View style={[tw`w-full mb-3`, { height: 1, backgroundColor: "#E5E7EB" }]} />

      {firstItem && (
        <View style={tw`flex-row items-center`}>
          <View
            style={[
              tw`rounded-lg overflow-hidden mr-3`,
              { width: 50, height: 50, backgroundColor: "#F3F4F6" },
            ]}
          >
            {productImage ? (
              <Image
                source={{ uri: productImage }}
                style={{ width: 50, height: 50 }}
                resizeMode="cover"
              />
            ) : (
              <View style={tw`w-full h-full items-center justify-center`}>
                <Ionicons name="image-outline" size={20} color="#9CA3AF" />
              </View>
            )}
          </View>

          <View style={tw`flex-1`}>
            <Text
              style={[fontStyles.body, tw`text-sm mb-1`, { color: "#1F2937" }]}
              numberOfLines={1}
            >
              {firstItem.product?.name || "Product"}
            </Text>
            <Text style={[fontStyles.body, tw`text-xs`, { color: "#6B7280" }]}>
              Qty:{firstItem.quantity || 1} • ₹
              {firstItem.price ||
                firstItem.Weight?.discountPrice ||
                firstItem.product?.price ||
                0}
            </Text>
            {itemCount > 1 && (
              <Text style={[fontStyles.body, tw`text-xs mt-1`, { color: "#6B7280" }]}>
                +{itemCount - 1} more item{itemCount - 1 > 1 ? "s" : ""}
              </Text>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const ScreenHeader = ({ onBack, title }) => (
  <View style={tw`bg-white px-4 py-3 border-b border-gray-200`}>
    <View style={tw`flex-row items-center justify-between`}>
      <TouchableOpacity
        onPress={onBack}
        style={tw`w-8 h-8 items-center justify-center rounded-full bg-gray-50`}
      >
        <Ionicons name="chevron-back" size={18} color="#374151" />
      </TouchableOpacity>
      <Text style={[fontStyles.headingS, tw`text-gray-800`]}>{title}</Text>
      <View style={tw`w-8`} />
    </View>
  </View>
);

const LoadingState = ({ onBack }) => (
  <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "left", "right"]}>
    <ScreenHeader onBack={onBack} title="My Orders" />
    <View style={tw`flex-1 justify-center items-center`}>
      <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      <Text style={[fontStyles.body, tw`mt-4 text-sm`, { color: "#6B7280" }]}>
        Loading your orders...
      </Text>
    </View>
  </SafeAreaView>
);

const EmptyState = ({ onBack }) => (
  <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "left", "right"]}>
    <ScreenHeader onBack={onBack} title="My Orders" />
    <View style={tw`flex-1 justify-center items-center px-6 bg-white`}>
      <Image
        source={require("../../../src/assets/no-orders.png")}
        style={{ width: 240, height: 240, marginBottom: 24 }}
        resizeMode="contain"
      />
      <Text style={[fontStyles.body, tw`text-base text-center`, { color: "#6B7280" }]}>
        You have no orders yet.
      </Text>
    </View>
  </SafeAreaView>
);

// ==================== MAIN SCREEN ====================

export default function OrdersScreen({ navigation }) {
  const { orders, loading, refreshing, fetchOrders, refresh } = useOrders();
  const formatDateTime = useFormatDateTime();
  useStatusBar("#FFFFFF");

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        fetchOrders();
      }
    }, [loading, fetchOrders])
  );

  //    FIXED: Handle order press - ALWAYS use referenceId
  const handleOrderPress = useCallback((order) => {
    const ref =
      order?.referenceId ||
      order?.orderNumber ||
      order?.orderId;

    if (!ref) {
      console.log("     No reference id found for order");
      return;
    }

    console.log("  Navigating to OrderDetails with referenceId:", ref);

    navigation.navigate("OrderDetails", {
      referenceId: ref,
      orderId: ref,
    });
  }, [navigation]);

  const handleBack = useCallback(() => {
    navigation?.goBack?.();
  }, [navigation]);

  if (loading) return <LoadingState onBack={handleBack} />;
  if (orders.length === 0) return <EmptyState onBack={handleBack} />;

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`} edges={["top", "left", "right"]}>
      <ScreenHeader onBack={handleBack} title="My Orders" />
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`py-4`}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[PRIMARY_COLOR]}
            tintColor={PRIMARY_COLOR}
          />
        }
      >
        {orders.map((order, index) => (
          <OrderCard
            key={order.id || order._id || order.referenceId || index}
            order={order}
            onPress={handleOrderPress}
            formatDateTime={formatDateTime}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
