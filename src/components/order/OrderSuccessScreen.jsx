import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function OrderSuccessScreen({ route, navigation }) {
  const {
    orderId,
    amount,
    paymentMethod,
    status = "success",
    type = "order",
    checkoutReturnParams,
  } = route.params || {};

  const checkAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(300)).current;
  const [showFailurePopup, setShowFailurePopup] = useState(false);

  const isSuccess = status === "success";
  const isFailure = status === "failure" || status === "failed";
  const isSubscription = type === "subscription";
  const isConsultation = type === "consultation";

  useEffect(() => {
    if (isSuccess) {
      // Checkmark animation
      Animated.spring(checkAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else if (isFailure) {
      // Show failure popup after a brief delay
      setTimeout(() => {
        setShowFailurePopup(true);
        Animated.spring(slideUpAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }, 500);
    }
  }, [isSuccess, isFailure]);

  const handleContinue = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "HomeScreen" }],
    });

    setTimeout(() => {
      if (isSubscription) {
        navigation.navigate("Subscription");
      } else if (isConsultation) {
        navigation.navigate("Consultations");
      } else {
        navigation.navigate("Account", { screen: "Orders" });
      }
    }, 300);
  };

  const handleRetryPayment = () => {
    // Navigate back to original screen based on type
    if (isSubscription) {
      navigation.replace("NewSubscription");
    } else if (isConsultation) {
      navigation.replace("Consultations");
    } else {
      // For checkout, navigate to checkout if params exist, otherwise home
      if (checkoutReturnParams) {
        navigation.replace("Checkout", checkoutReturnParams);
      } else {
        navigation.replace("HomeScreen");
      }
    }
  };

  if (isSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Success Circle with Checkmark */}
          <Animated.View
            style={[
              styles.iconCircle,
              {
                transform: [{ scale: checkAnim }],
              },
            ]}
          >
            <Ionicons name="checkmark" size={90} color="#FFFFFF" />
          </Animated.View>

          {/* Success Text */}
          <Text style={styles.successTitle}>
            {isSubscription
              ? "Subscription Confirmed"
              : isConsultation
                ? "Booking Confirmed"
                : "Order Confirmed"}
          </Text>

          {isSubscription && (
            <Text style={styles.successSubtitle}>
              Your meal plan is now active
            </Text>
          )}

          {isConsultation && (
            <Text style={styles.successSubtitle}>
              Check your email for details
            </Text>
          )}

          {!isSubscription && !isConsultation && (
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryLabel}>Delivering to - </Text>
              <Text style={styles.deliveryValue}>home</Text>
            </View>
          )}
        </View>

        {/* Continue Button (Hidden - Auto navigates) */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Failure Screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Just show minimal content or blank */}
        <Text style={styles.failureHint}>Payment processing...</Text>
      </View>

      {/* Bottom-up Failure Popup */}
      <Modal
        visible={showFailurePopup}
        transparent
        animationType="none"
        onRequestClose={() => setShowFailurePopup(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Top Close Button (Floating) - Discard and navigate back */}
          <TouchableOpacity
            style={styles.floatingCloseButton}
            onPress={() => {
              console.log("     User closed failure popup - navigating back");

              // Navigate based on type and return params
              if (isSubscription) {
                navigation.replace("NewSubscription");
              } else if (isConsultation) {
                navigation.replace("Consultations");
              } else {
                // For checkout, navigate back with return params if available
                if (checkoutReturnParams) {
                  navigation.replace("Checkout", checkoutReturnParams);
                } else {
                  navigation.replace("HomeScreen");
                }
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.failurePopup,
              {
                transform: [{ translateY: slideUpAnim }],
              },
            ]}
          >
            {/* Receipt Icon with Alert */}
            <View style={styles.receiptContainer}>
              <Ionicons name="receipt-outline" size={80} color="#111827" />
              <View style={styles.alertIndicator}>
                <Ionicons name="warning" size={24} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.failureTitle}>
              Payment of ₹{amount || "0.00"} failed
            </Text>

            <Text style={styles.failureMessage}>
              If amount was deducted from your account, refund will be processed within 2 hours
            </Text>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetryPayment}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>Retry payment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.otherMethodButton}
              onPress={handleRetryPayment} // Also takes user back to retry
              activeOpacity={0.7}
            >
              <Text style={styles.otherMethodText}>Try another payment method</Text>
            </TouchableOpacity>

            {/* Transaction ID Mini */}
            {orderId && (
              <Text style={styles.miniTransactionId}>Ref: {orderId}</Text>
            )}
          </Animated.View>
        </View>
      </Modal>
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
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
    fontFamily: "Fraunces-Bold",
  },
  successSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    fontFamily: "Fraunces-Regular",
  },
  deliveryInfo: {
    flexDirection: "row",
    marginTop: 16,
    alignItems: "baseline",
  },
  deliveryLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontFamily: "Fraunces-Regular",
  },
  deliveryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    fontFamily: "Fraunces-Bold",
  },
  continueButton: {
    backgroundColor: "#10B981",
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Fraunces-Bold",
  },
  failureHint: {
    fontSize: 16,
    color: "#9CA3AF",
    fontFamily: "Fraunces-Regular",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.7)", // Darker glassmorphism overlay
    justifyContent: "flex-end",
    alignItems: "center",
  },
  floatingCloseButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  failurePopup: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 30,
    paddingBottom: 40,
    width: "100%",
    alignItems: "center",
  },
  receiptContainer: {
    position: "relative",
    marginBottom: 24,
  },
  alertIndicator: {
    position: "absolute",
    top: 5,
    right: -5,
    backgroundColor: "#EF4444",
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  failureTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 20,
    textAlign: "center",
    fontFamily: "Fraunces-Bold",
  },
  failureMessage: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 20,
    fontFamily: "Fraunces-Regular",
  },
  retryButton: {
    backgroundColor: "#F43F5E", // Reddish pink from image
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  retryButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Fraunces-Bold",
  },
  otherMethodButton: {
    paddingVertical: 8,
    marginBottom: 16,
  },
  otherMethodText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F43F5E",
    fontFamily: "Fraunces-Bold",
  },
  miniTransactionId: {
    fontSize: 10,
    color: "#D1D5DB",
    marginTop: 8,
    fontFamily: "Fraunces-Regular",
  },
});

