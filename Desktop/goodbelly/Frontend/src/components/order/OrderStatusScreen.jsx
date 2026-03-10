import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import api from "../../services/api";
import { useSelector } from "react-redux";

export default function OrderStatusScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const user = useSelector((state) => state.auth?.user);

  const {
    transactionId,
    orderId,
    amount,
    type = "order",
    vendorId,
    checkoutReturnParams,
  } = route.params || {};

  const [statusMessage, setStatusMessage] = useState("Confirming your payment...");
  const rotateValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous rotation animation
    Animated.loop(
      Animated.timing(rotateValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  useEffect(() => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("     OrderStatusScreen mounted");
    console.log("    Transaction ID:", transactionId || orderId);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    let isMounted = true;
    let orderIdToCheck = null;
    let apiIdToCheck = null;

    const checkOrderStatus = async () => {
      if (!isMounted) return;

      try {
        console.log("  Fetching order status (single attempt)...");

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("     ID RESOLUTION DEBUG:");
        console.log("   • Type:", type);
        console.log("   • orderId:", orderId);
        console.log("   • transactionId:", transactionId);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        if (type === "subscription") {
          //    FIX: Backend expects paymentReference (transactionId/SUB-xxxx) not subscription UUID
          // But keep orderId for navigation/display purposes
          orderIdToCheck = orderId;  // UUID for navigation
          apiIdToCheck = transactionId;  // Transaction ID for backend API (paymentReference)

          if (!apiIdToCheck) {
            console.error("     CRITICAL: No transactionId provided for subscription");
            console.log("   orderId:", orderId);
            setStatusMessage("Transaction ID missing. Please contact support.");
            return;
          }
        } else {
          // For orders and consultations, orderId is the primary identifier
          orderIdToCheck = orderId || transactionId;
          apiIdToCheck = orderIdToCheck;
        }

        if (!apiIdToCheck) {
          console.error("     No ID provided for API call");
          setStatusMessage("ID missing. Please contact support.");
          return;
        }

        console.log(`    Using orderId for navigation: ${orderIdToCheck}`);
        console.log(`🔗 Using apiId for API call: ${apiIdToCheck}`);

        let endpoint = `/orders/${apiIdToCheck}`;
        if (type === "subscription") {
          endpoint = `/subscription/${apiIdToCheck}`;
        } else if (type === "consultation") {
          endpoint = `/booking/${apiIdToCheck}`;
        }

        console.log(`🔗 Hitting endpoint: ${endpoint}`);

        const response = await api.get(endpoint, {
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
        });

        console.log("📦 API response:", response.data);

        const orderData = response.data?.data || response.data;

        // Extract payment status - handles top-level or Billing inner object
        let rawPaymentStatus = orderData?.paymentStatus;
        if (!rawPaymentStatus && orderData?.Billing) {
          // If it's an array (Prisma relation), get the latest billing
          const billings = Array.isArray(orderData.Billing) ? orderData.Billing : [orderData.Billing];
          rawPaymentStatus = billings[0]?.paymentStatus;
        }

        const normalizedPaymentStatus = (rawPaymentStatus || "").toString().toUpperCase();
        const normalizedOrderStatus = (orderData?.status || "").toString().toUpperCase();

        console.log("    Payment Status:", normalizedPaymentStatus || "UNDEFINED");
        console.log("  Order Status:", normalizedOrderStatus || "UNDEFINED");
        console.log("  Subscription Details:", {
          status: normalizedOrderStatus,
          hasBilling: !!orderData?.Billing && orderData.Billing.length > 0,
          billingCount: orderData?.Billing?.length || 0,
        });

        const successStatuses = ["PROCESSING", "PREPARING", "CONFIRMED", "SHIPPED", "DELIVERED", "ACTIVE", "SUCCESS", "COMPLETED"];

        const isPaymentSuccess = normalizedPaymentStatus === "SUCCESS" || normalizedPaymentStatus === "COMPLETED" || normalizedPaymentStatus === "ACTIVE";
        const isOrderSuccess = successStatuses.includes(normalizedOrderStatus);

        // For subscriptions, if status is ACTIVE, consider it successful (Billing may be created asynchronously)
        const isSubscriptionSuccess = type === "subscription" && normalizedOrderStatus === "ACTIVE";

        console.log("🛠️ Success Check:", {
          isPaymentSuccess,
          isOrderSuccess,
          isSubscriptionSuccess,
          type
        });

        if (isSubscriptionSuccess || (isPaymentSuccess && isOrderSuccess)) {
          console.log(`  ${type.toUpperCase()} SUCCESS - Navigating to success screen`);

          if (isMounted) {
            navigation.replace("OrderSuccessScreen", {
              orderId: orderIdToCheck,
              amount: amount || orderData?.grandTotal || orderData?.amount || orderData?.finalPrice || orderData?.price,
              paymentMethod: orderData?.paymentMethod || "ONLINE",
              status: "success",
              type: type,
              checkoutReturnParams,
            });
          }
          return;
        }

        if (
          normalizedPaymentStatus === "FAILED" ||
          normalizedPaymentStatus === "FAILURE" ||
          normalizedOrderStatus === "FAILED" ||
          normalizedOrderStatus === "CANCELLED" ||
          normalizedOrderStatus === "REJECTED"
        ) {
          console.log(`     ${type.toUpperCase()} FAILED - Calling failure-forward API`);

          // Call failure-forward API to notify backend
          try {
            const failurePayload = {
              txnid: transactionId,
              subscriptionId: type === "subscription" ? orderIdToCheck : null,
              orderId: type !== "subscription" ? orderIdToCheck : null,
            };
            await api.post("/payu/failure-forward", failurePayload);
            console.log("  Failure-forward API called successfully");
          } catch (failureApiError) {
            console.warn("    Failure-forward API call failed:", failureApiError?.response?.data || failureApiError.message);
          }

          if (isMounted) {
            navigation.replace("OrderSuccessScreen", {
              orderId: orderIdToCheck,
              amount: amount || orderData?.grandTotal || orderData?.amount || orderData?.finalPrice || orderData?.price,
              paymentMethod: orderData?.paymentMethod || "ONLINE",
              status: "failure",
              type: type,
              checkoutReturnParams,
            });
          }
          return;
        }

        if (normalizedPaymentStatus === "PENDING" || !normalizedPaymentStatus || normalizedOrderStatus === "PENDING") {
          console.log("    Payment still pending — calling failure-forward API");

          // Call failure-forward API to notify backend
          try {
            const failurePayload = {
              txnid: transactionId,
              subscriptionId: type === "subscription" ? orderIdToCheck : null,
              orderId: type !== "subscription" ? orderIdToCheck : null,
            };
            await api.post("/payu/failure-forward", failurePayload);
            console.log("  Failure-forward API called for pending payment");
          } catch (failureApiError) {
            console.warn("    Failure-forward API call failed:", failureApiError?.response?.data || failureApiError.message);
          }

          if (isMounted) {
            navigation.replace("OrderSuccessScreen", {
              orderId: orderIdToCheck,
              amount: amount || orderData?.grandTotal || orderData?.amount || orderData?.finalPrice || orderData?.price,
              paymentMethod: orderData?.paymentMethod || "ONLINE",
              status: "failure",
              type: type,
              checkoutReturnParams,
            });
          }
        }
      } catch (error) {
        const errorMessage = error?.response?.data?.message;
        const errorStatus = error?.response?.status;

        console.log("     Error details:", error.response?.data);

        //   If we get 404 for subscription, it means the backend didn't find it by transactionId
        // This could be a timing issue or the transactionId wasn't stored properly
        if (
          type === "subscription" &&
          errorStatus === 404 &&
          errorMessage?.includes("Billing record not found")
        ) {
          console.log("    Subscription not found by transactionId. Showing failure screen...");
          console.log("   orderIdToCheck:", orderIdToCheck);
          console.log("   apiIdToCheck:", apiIdToCheck);

          if (isMounted) {
            navigation.replace("OrderSuccessScreen", {
              orderId: orderIdToCheck || apiIdToCheck,
              amount: amount || 0,
              paymentMethod: "ONLINE",
              status: "failure",
              type: type,
              checkoutReturnParams,
              errorMessage: "Payment verification failed. Please contact support.",
            });
          }
          return;
        }

        // Real errors - show failure screen
        console.error("     Unexpected error checking order status:", error);

        console.log("    Error occurred — calling failure-forward API");

        // Call failure-forward API to notify backend
        try {
          const failurePayload = {
            txnid: transactionId,
            subscriptionId: type === "subscription" ? orderIdToCheck : null,
            orderId: type !== "subscription" ? orderIdToCheck : null,
          };
          await api.post("/payu/failure-forward", failurePayload);
          console.log("  Failure-forward API called for error");
        } catch (failureApiError) {
          console.warn("    Failure-forward API call failed:", failureApiError?.response?.data || failureApiError.message);
        }

        if (isMounted) {
          navigation.replace("OrderSuccessScreen", {
            orderId: orderIdToCheck,
            amount: amount || 0,
            paymentMethod: "ONLINE",
            status: "failure",
            type: type,
            checkoutReturnParams,
          });
        }
      }
    };

    //   FIX: Wait 5 seconds for webhook, then check once
    console.log("    Waiting 5 seconds for webhook to process...");
    const initialDelay = setTimeout(() => {
      if (isMounted) {
        console.log("  Starting single order status check");
        setStatusMessage("Verifying payment, please wait...");
        checkOrderStatus();
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(initialDelay);
    };
  }, [transactionId, orderId, amount, type, navigation, user]);

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Animated Icon Circle */}
        <Animated.View
          style={[
            styles.iconCircle,
            {
              transform: [{ rotate }],
            },
          ]}
        >
          <Ionicons name="card-outline" size={70} color="#FFFFFF" />
        </Animated.View>

        {/* Status Text */}
        <Text style={styles.statusText}>{statusMessage}</Text>
      </View>

      {/* Bottom Warning Banner */}
      <View style={styles.bottomBanner}>
        <Text style={styles.noteLabel}>Note - </Text>
        <Text style={styles.noteText}>
          Please do not close the app or press the back button till the transaction is complete
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  statusText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    fontFamily: "Fraunces-Bold",
  },
  bottomBanner: {
    backgroundColor: "#F3E8FF",
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    fontFamily: "Fraunces-Bold",
  },
  noteText: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    flex: 1,
    fontFamily: "Fraunces-Regular",
  },
});
