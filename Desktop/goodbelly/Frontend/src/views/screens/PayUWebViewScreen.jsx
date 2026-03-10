import React, { useState, useRef, useMemo, useEffect } from "react";
import { AppState } from "react-native";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Alert,
  BackHandler,
  Text,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import { clearCartByVendor } from "../../redux/slicer";
import api from "../../services/api";

const log = (...a) => console.log(" PAYU:", ...a);
const warn = (...a) => console.warn("🟡 PAYU:", ...a);
const err = (...a) => console.error("🔴 PAYU:", ...a);

export default function PayUWebViewScreen({ route, navigation }) {
  const dispatch = useDispatch();
  const {
    paymentParams,
    payuUrl,
    orderId,
    transactionId: routeTransactionId,
    amount,
    payableAmount: routePayableAmount,
    vendorId,
    bookingId,
    isConsultation,
    subscriptionOrderId,
    isSubscription,
    fromOrderNow,
    checkoutReturnParams,
    orderData = null,
  } = route.params;

  //    USE THE SAME TRANSACTION ID EVERYWHERE
  const transactionId = routeTransactionId || paymentParams?.txnid || orderId;
  const payableAmount = routePayableAmount || Math.max(Number(amount || 0), 1);

  const [loading, setLoading] = useState(true);
  const [isPaymentInProgress, setIsPaymentInProgress] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const webViewRef = useRef(null);
  const payuLoadedRef = useRef(false);
  const navigationHandledRef = useRef(false);
  const deepLinkLaunchedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const isConsultationBooking = isConsultation || !!bookingId;
  const isSubscriptionOrder = isSubscription || !!subscriptionOrderId;

  log("    PayUWebViewScreen loaded with transactionId:", transactionId);
  log("  Payment params:", {
    isConsultationBooking,
    isSubscriptionOrder,
    orderId,
    transactionId,
    payableAmount,
  });

  // Canonical amount for PayU: prefer backend order grandTotal, then payableAmount/amount, then paymentParams.amount
  const rawAmount = Number(
    (orderData && (orderData.grandTotal ?? orderData.total ?? orderData.totalAmount)) || payableAmount || amount || paymentParams?.amount || 0
  );
  const canonicalAmount = Number.isFinite(rawAmount) ? Number(rawAmount).toFixed(2) : (Number(payableAmount || amount || paymentParams?.amount || 0).toFixed(2));

  const finalPaymentParams = {
    ...(paymentParams || {}),
    amount: canonicalAmount,
    txnid: (paymentParams && (paymentParams.txnid || paymentParams.txnId)) || transactionId || orderId,
  };

  //    IMPROVEMENT #2: Reset navigationHandledRef on unmount
  useEffect(() => {
    return () => {
      log("🧹 Cleanup: Resetting navigationHandledRef");
      navigationHandledRef.current = false;
    };
  }, []);

  // Listen for app state changes to detect return from external UPI apps
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active" &&
        deepLinkLaunchedRef.current &&
        !navigationHandledRef.current
      ) {
        log("🔁 App returned to foreground after external payment app; navigating to OrderStatusScreen to verify payment");
        // navigate to OrderStatusScreen to trigger webhook polling
        navigateToOrderStatus();
        deepLinkLaunchedRef.current = false;
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  // ---------- Generate HTML once ----------
  const paymentHTML = useMemo(() => {
    let icon = "🍽️";
    if (isConsultationBooking) icon = "👨‍⚕️";
    if (isSubscriptionOrder) icon = "⭐";

    let paymentType = "Order";
    if (isConsultationBooking) paymentType = "Booking";
    if (isSubscriptionOrder) paymentType = "Subscription";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Processing Payment</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #5F7F67 0%, #4a5f52 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px 30px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 400px;
      width: 100%;
      text-align: center;
    }
    .spinner {
      width: 60px;
      height: 60px;
      border: 5px solid #e5e7eb;
      border-top-color: #5F7F67;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 30px auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .amount {
      font-size: 32px;
      font-weight: 800;
      color: #5F7F67;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div style="font-size: 48px; margin-bottom: 20px;">${icon}</div>
    <h1 style="font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 10px;">
      Processing Payment
    </h1>
    <p style="font-size: 16px; color: #6b7280; margin-bottom: 30px;">
      Redirecting to secure payment gateway...
    </p>
    <div class="spinner"></div>
    <div class="amount">₹${finalPaymentParams.amount}</div>
    <p style="font-size: 14px; color: #9ca3af;">
      ${paymentType} ID: ${transactionId}
    </p>
  </div>

  <form id="payuForm" action="${payuUrl}" method="POST">
    <input type="hidden" name="key" value="${paymentParams.key}" />
    <input type="hidden" name="txnid" value="${finalPaymentParams.txnid}" />
    <input type="hidden" name="amount" value="${finalPaymentParams.amount}" />
    <input type="hidden" name="productinfo" value="${paymentParams.productinfo}" />
    <input type="hidden" name="firstname" value="${paymentParams.firstname}" />
    <input type="hidden" name="email" value="${paymentParams.email}" />
    <input type="hidden" name="phone" value="${paymentParams.phone}" />
    <input type="hidden" name="surl" value="${paymentParams.surl}" />
    <input type="hidden" name="furl" value="${paymentParams.furl}" />
    <input type="hidden" name="hash" value="${paymentParams.hash}" />
    <input type="hidden" name="udf1" value="${paymentParams.udf1 || ""}" />
    <input type="hidden" name="udf2" value="${paymentParams.udf2 || ""}" />
    <input type="hidden" name="udf3" value="${paymentParams.udf3 || ""}" />
    <input type="hidden" name="udf4" value="${paymentParams.udf4 || ""}" />
    <input type="hidden" name="udf5" value="${paymentParams.udf5 || ""}" />
  </form>

  <script>
    var formSubmitted = false;
    function submitForm() {
      if (formSubmitted) return;
      var form = document.getElementById('payuForm');
      if (!form) return;
      console.log('  Submitting form to PayU with txnid: ${finalPaymentParams.txnid}');
      formSubmitted = true;
      form.submit();
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', submitForm);
    } else {
      setTimeout(submitForm, 500);
    }
  </script>
</body>
</html>
    `;
  }, [finalPaymentParams, payuUrl, transactionId, isConsultationBooking, isSubscriptionOrder, canonicalAmount]);

  // ---------- Deep link handler ----------
  const handleDeepLink = async (url) => {
    log("🔗 Opening deep link:", url);

    try {
      setIsPaymentInProgress(true);
      // mark that we launched an external deep link - we'll verify when app returns
      deepLinkLaunchedRef.current = true;
      await Linking.openURL(url);
      log("  Deep link opened successfully");

      setTimeout(() => {
        setIsPaymentInProgress(false);
      }, 3000);
    } catch (error) {
      err("     Error opening deep link:", error);
      setIsPaymentInProgress(false);

      Alert.alert(
        "App Not Found",
        "The required payment app is not installed. Please install it or choose another payment method.",
        [{ text: "OK", onPress: () => webViewRef.current?.reload() }]
      );
    }
  };

  // ----------    NAVIGATE TO OrderStatusScreen (for both success & failure) ----------
  const navigateToOrderStatus = (statusHint = null) => {
    if (navigationHandledRef.current) {
      log("    Navigation already handled - ignoring duplicate");
      return;
    }
    navigationHandledRef.current = true;

    if (statusHint) {
      log(`  Payment ${statusHint} redirect detected`);
    }
    log("   Navigating to OrderStatusScreen with transactionId:", transactionId);

    // Clear cart if needed
    if (!fromOrderNow && vendorId && !isConsultationBooking && !isSubscriptionOrder) {
      dispatch(clearCartByVendor(vendorId));
      log("🛒 Cart cleared for vendor:", vendorId);
    }

    setIsRedirecting(true);

    // Navigate to OrderStatusScreen (which will verify the actual status)
    setTimeout(() => {
      if (isConsultationBooking) {
        navigation.replace("OrderStatusScreen", {
          transactionId: transactionId, //    SAME ID
          orderId: bookingId || transactionId,
          amount: canonicalAmount,
          type: "consultation",
          fromPayU: true,
          checkoutReturnParams,
        });
      } else if (isSubscriptionOrder) {
        navigation.replace("OrderStatusScreen", {
          transactionId: transactionId, //    SAME ID
          orderId: subscriptionOrderId || transactionId,
          amount: canonicalAmount,
          type: "subscription",
          fromPayU: true,
        });
      } else {
        navigation.replace("OrderStatusScreen", {
          transactionId: transactionId, //    SAME ID
          orderId: transactionId,
          amount: canonicalAmount,
          type: "order",
          vendorId: vendorId,
          fromPayU: true,
          checkoutReturnParams,
        });
      }

      log("  Navigation complete to OrderStatusScreen");
    }, 1000);
  };

  // ---------- HANDLE SUCCESS REDIRECT ----------
  const handlePaymentSuccess = async () => {
    // Try to notify backend success-forward endpoint (backend may update order/subscription)
    try {
      setIsPaymentInProgress(true);
      const payload = {
        txnid: transactionId,
        subscriptionId: subscriptionOrderId || null,
        orderId: orderId || null,
      };
      log("📣 Posting success-forward to backend:", payload);
      await api.post("/payu/success-forward", payload);
      log("  success-forward posted successfully");
    } catch (e) {
      warn("    success-forward post failed:", e?.response?.data || e.message || e);
    } finally {
      setIsPaymentInProgress(false);
      navigateToOrderStatus("SUCCESS");
    }
  };

  // ---------- HANDLE FAILURE REDIRECT ----------
  const handlePaymentFailure = async () => {
    try {
      setIsPaymentInProgress(true);
      const payload = {
        txnid: transactionId,
        subscriptionId: subscriptionOrderId || null,
        orderId: orderId || null,
      };
      log("📣 Posting failure-forward to backend:", payload);
      await api.post("/payu/failure-forward", payload);
      log("  failure-forward posted successfully");
    } catch (e) {
      warn("    failure-forward post failed:", e?.response?.data || e.message || e);
    } finally {
      setIsPaymentInProgress(false);
      navigateToOrderStatus("FAILURE");
    }
  };

  // ----------    BACK HANDLER - Navigate to OrderStatusScreen instead of goBack() ----------
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (isPaymentInProgress) {
          Alert.alert(
            "Payment In Progress",
            "Please complete or cancel the payment in your UPI app first.",
            [{ text: "OK" }]
          );
          return true;
        }

        if (isRedirecting) {
          Alert.alert(
            "Processing Payment",
            "Please wait while we process your payment.",
            [{ text: "OK" }]
          );
          return true;
        }

        Alert.alert(
          "Cancel Payment?",
          "Are you sure you want to cancel this payment?",
          [
            { text: "No, Continue", style: "cancel" },
            {
              text: "Yes, Cancel",
              style: "destructive",
              onPress: () => {
                // Mark navigation as handled and clear any deep-link flag so we DO NOT trigger verification/polling
                navigationHandledRef.current = true;
                deepLinkLaunchedRef.current = false;

                // Return to the original screen based on payment type
                log("    User cancelled payment - returning to previous screen (no verification)");

                if (isSubscriptionOrder) {
                  // For subscriptions, return to NewSubscription
                  try {
                    navigation.replace("NewSubscription");
                  } catch (e) {
                    navigation.navigate("NewSubscription");
                  }
                } else if (isConsultationBooking) {
                  // For consultations, return to Consultations
                  try {
                    navigation.replace("Consultations");
                  } catch (e) {
                    navigation.navigate("Consultations");
                  }
                } else if (checkoutReturnParams) {
                  // For orders with return params, go back to Checkout
                  try {
                    navigation.replace("Checkout", checkoutReturnParams);
                  } catch (e) {
                    navigation.navigate("Checkout", checkoutReturnParams);
                  }
                } else {
                  // Standard fallback: go back or to HomeScreen
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.replace("HomeScreen");
                  }
                }
              },
            },
          ],
          { cancelable: false }
        );
        return true;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [navigation, isPaymentInProgress, isRedirecting])
  );

  // ---------- WEBVIEW NAVIGATION ----------
  const handleNavigationStateChange = (navState) => {
    const { url } = navState;
    log("  Navigation URL:", url);

    if (!url) return;

    if (url.includes("secure.payu.in") || url.includes("payu.in")) {
      if (!payuLoadedRef.current) {
        log("  PayU loaded successfully");
        payuLoadedRef.current = true;
      }
    }
  };

  // ---------- SHOULD START LOAD WITH REQUEST ----------
  const handleShouldStartLoadWithRequest = (request) => {
    const { url } = request;
    log("     Checking URL:", url);

    //    INTERCEPT: Success forward URL
    if (url.includes("/payu/success-forward") || url.includes("/payment-success")) {
      log("  SUCCESS forward URL detected - intercepting");
      webViewRef.current?.stopLoading?.();
      handlePaymentSuccess();
      return false; // Block navigation
    }

    //    INTERCEPT: Failure forward URL
    if (url.includes("/payu/failure-forward") || url.includes("/payment-failure")) {
      warn("     FAILURE forward URL detected - intercepting");
      webViewRef.current?.stopLoading?.();
      handlePaymentFailure();
      return false; // Block navigation
    }

    // Allow initial PayU load
    if (!payuLoadedRef.current) {
      log("  Allowing initial PayU load");
      return true;
    }

    // Handle deep links
    const deepLinkProtocols = [
      "upi://", "phonepe://", "paytmmp://", "paytm://", "tez://", "gpay://",
      "bhim://", "bhimupi://", "mobikwik://", "freecharge://", "amazonpay://",
      "credpay://", "slice-upi://", "jupiter://", "super://", "navipay://",
      "whatsapp://", "truecaller://", "airtel://", "jio://", "myvi://",
      "sbi://", "ybl://", "icici://", "axisbank://", "hdfcbank://", "kotak://",
      "pnb://", "bob://", "canarabank://", "unionbank://", "idbi://",
      "indianbank://", "boi://", "centralbank://", "fi://", "niyo://",
      "indie://", "intent://",
    ];

    const isDeepLink = deepLinkProtocols.some((protocol) => url.startsWith(protocol));

    if (isDeepLink) {
      log("🔗 Deep link detected - opening external app");
      handleDeepLink(url);
      return false; // Block navigation
    }

    log("  Allowing URL navigation");
    return true;
  };

  // ---------- WEBVIEW ERROR ----------
  const handleWebViewError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;

    // Ignore deep link errors (expected behavior)
    if (nativeEvent.description?.includes("unsupported URL") || nativeEvent.code === -1002) {
      log("    Ignoring expected unsupported URL error (deep link)");
      return;
    }

    err("     WebView Error:", nativeEvent);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (isPaymentInProgress || isRedirecting) {
              Alert.alert(
                "Payment In Progress",
                "Please wait while we process your payment."
              );
              return;
            }

            Alert.alert(
              "Cancel Payment?",
              "Are you sure you want to cancel this payment?",
              [
                { text: "No", style: "cancel" },
                {
                  text: "Yes",
                  style: "destructive",
                  onPress: () => {
                    // Mark navigation handled so AppState listener won't trigger verification
                    navigationHandledRef.current = true;
                    deepLinkLaunchedRef.current = false;

                    log("    User cancelled via header button");

                    // Return to the original screen based on payment type
                    if (isSubscriptionOrder) {
                      try {
                        navigation.replace("NewSubscription");
                      } catch (e) {
                        navigation.navigate("NewSubscription");
                      }
                    } else if (isConsultationBooking) {
                      try {
                        navigation.replace("Consultations");
                      } catch (e) {
                        navigation.navigate("Consultations");
                      }
                    } else if (checkoutReturnParams) {
                      try {
                        navigation.replace("Checkout", checkoutReturnParams);
                      } catch (e) {
                        navigation.navigate("Checkout", checkoutReturnParams);
                      }
                    } else {
                      try {
                        navigation.replace("HomeScreen");
                      } catch (e) {
                        navigation.navigate("HomeScreen");
                      }
                    }
                  },
                },
              ]
            );
          }}
        >
          <Ionicons name="close" size={24} color="#374151" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Secure Payment</Text>
          <Text style={styles.headerSubtitle}>
            {isSubscriptionOrder
              ? "Subscription"
              : isConsultationBooking
                ? "Consultation Booking"
                : "Order"} {" "}
            • ₹{Number(canonicalAmount).toFixed(2)}
          </Text>
        </View>

        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={18} color="#10B981" />
        </View>
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ html: paymentHTML }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        startInLoadingState={false}
        mixedContentMode="always"
        allowsBackForwardNavigationGestures={false}
        cacheEnabled={false}
        incognito
        onLoadStart={() => {
          log("    WebView loading started");
          setLoading(true);
        }}
        onLoadEnd={() => {
          log("  WebView loading completed");
          setTimeout(() => setLoading(false), 2000);
        }}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onError={handleWebViewError}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          warn("    HTTP Error:", nativeEvent.statusCode, nativeEvent.url);
        }}
        style={styles.webview}
      />

      {/* Loading Overlay */}
      {(loading || isRedirecting) && !isPaymentInProgress && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#5F7F67" />
            <Text style={styles.loadingText}>
              {isRedirecting
                ? "Processing Payment..."
                : "Loading Payment Gateway..."}
            </Text>
            <Text style={styles.loadingSubtext}>
              {isRedirecting
                ? "Please wait while we confirm your payment"
                : "Connecting to secure payment gateway..."}
            </Text>
          </View>
        </View>
      )}

      {/* Payment In Progress Overlay */}
      {isPaymentInProgress && (
        <View style={styles.paymentInProgressOverlay}>
          <View style={styles.paymentInProgressCard}>
            <Ionicons name="phone-portrait-outline" size={48} color="#5F7F67" />
            <Text style={styles.paymentInProgressTitle}>Complete Payment</Text>
            <Text style={styles.paymentInProgressText}>
              Please complete the payment in your UPI app and return to this screen.
            </Text>
            <ActivityIndicator size="small" color="#5F7F67" style={{ marginTop: 20 }} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  headerSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 2 },
  securityBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  webview: { flex: 1 },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  loadingCard: {
    backgroundColor: "white",
    padding: 30,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  loadingSubtext: { marginTop: 5, fontSize: 14, color: "#6B7280" },
  paymentInProgressOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  paymentInProgressCard: {
    backgroundColor: "white",
    padding: 30,
    borderRadius: 16,
    alignItems: "center",
    maxWidth: 320,
    marginHorizontal: 20,
  },
  paymentInProgressTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  paymentInProgressText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
});
