import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons as Icon } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import tw from "twrnc";
import { authService } from "../../services/authService.js";
import { fontStyles } from "../../utils/fontStyles.js";

const { width: screenWidth } = Dimensions.get("window");

const SubscriptionScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [error, setError] = useState(null);

  //   ADD: Function to determine StatusBar style based on background color
  const getStatusBarStyle = (bgColor) => {
    const lightBackgrounds = ["#FFFFFF", "#F3F4F6", "#FAFAFA", "#F9FAFB", "#ffffff", "white"];
    return lightBackgrounds.includes(bgColor) ? "dark-content" : "light-content";
  };

  //   ADD: Background color constant
  const BACKGROUND_COLOR = "#F9FAFB"; // gray-50 background

  const loadSubscriptions = async () => {
    try {
      setError(null);
      const response = await authService.getUserSubscriptions();

      console.log("  Subscription Response:", response);
      if (response?.success || Array.isArray(response?.data) || Array.isArray(response)) {
        const data = response?.data || (Array.isArray(response) ? response : []);
        setSubscriptions(data);
      } else {
        setSubscriptions([]);
      }
    } catch (error) {
      console.error("Error loading subscriptions:", error);
      setError(error.response?.data?.message || "Failed to load subscriptions");
      setSubscriptions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    console.log("  SubscriptionScreen Mounted");
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      console.log("  SubscriptionScreen Focused - Loading data...");
      loadSubscriptions();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadSubscriptions();
  };

  const handleTogglePause = async (subscriptionId, currentStatus) => {
    const status = currentStatus === "PAUSED" ? "ACTIVE" : "PAUSED";

    try {
      const response = await authService.toggleSubscriptionStatus(
        subscriptionId,
        status
      );
      if (response?.success) {
        Alert.alert(
          "Success",
          `Subscription ${status === "PAUSED" ? "paused" : "resumed"
          } successfully`
        );
        loadSubscriptions();
      }
    } catch (error) {
      console.error("Error toggling subscription:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update subscription"
      );
    }
  };

  const handleCancel = async (subscriptionId) => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel this subscription?",
      [
        {
          text: "Keep Subscription",
          style: "cancel",
        },
        {
          text: "Cancel Subscription",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await authService.cancelSubscription(
                subscriptionId
              );
              if (response?.success) {
                Alert.alert("Success", "Subscription cancelled successfully");
                loadSubscriptions();
              }
            } catch (error) {
              console.error("Error cancelling subscription:", error);
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to cancel subscription"
              );
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      ACTIVE: {
        color: "bg-green-500",
        textColor: "text-white",
        label: "Active",
        icon: "checkmark-circle",
      },
      PAUSED: {
        color: "bg-yellow-500",
        textColor: "text-white",
        label: "Paused",
        icon: "pause-circle",
      },
      CANCELLED: {
        color: "bg-red-500",
        textColor: "text-white",
        label: "Cancelled",
        icon: "close-circle",
      },
      EXPIRED: {
        color: "bg-gray-400",
        textColor: "text-white",
        label: "Expired",
        icon: "time-outline",
      },
      SUCCESS: {
        color: "bg-green-500",
        textColor: "text-white",
        label: "Active",
        icon: "checkmark-circle",
      },
      COMPLETED: {
        color: "bg-green-500",
        textColor: "text-white",
        label: "Completed",
        icon: "checkmark-circle",
      },
      PENDING: {
        color: "bg-blue-400",
        textColor: "text-white",
        label: "Pending",
        icon: "hourglass-outline",
      },
      FAILED: {
        color: "bg-red-400",
        textColor: "text-white",
        label: "Failed",
        icon: "close-circle-outline",
      },
      FAILURE: {
        color: "bg-red-400",
        textColor: "text-white",
        label: "Failed",
        icon: "close-circle-outline",
      },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <View
        style={tw`flex-row items-center ${config.color} rounded-full px-3 py-1`}
      >
        <Icon name={config.icon} size={12} color="white" style={tw`mr-1`} />
        <Text style={tw`text-xs font-semibold ${config.textColor}`}>
          {config.label}
        </Text>
      </View>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  };

  const getPaymentStatus = (billing) => {
    const latestBilling = billing?.[billing.length - 1];
    return {
      TransactionID: latestBilling?.paymentReference || "N/A",
      status: latestBilling?.paymentStatus || "PENDING",
    };
  };

  const getStatusColor = (status) => {
    const colors = {
      ACTIVE: "#10B981",
      PAUSED: "#F59E0B",
      CANCELLED: "#EF4444",
      EXPIRED: "#9CA3AF",
      SUCCESS: "#10B981",
      COMPLETED: "#10B981",
      PENDING: "#60A5FA",
      FAILED: "#F87171",
      FAILURE: "#F87171",
    };
    return colors[status] || "#60A5FA";
  };

  if (loading) {
    return (
      <View style={tw`flex-1 bg-gray-50 justify-center items-center`}>
        {/*   ADD: StatusBar for loading state */}
        <StatusBar
          barStyle={getStatusBarStyle(BACKGROUND_COLOR)}
          backgroundColor={BACKGROUND_COLOR}
        />
        <View style={tw`items-center`}>
          <ActivityIndicator size="large" color="#7a9b8e" />
          <Text style={tw`mt-4 text-gray-600 text-base`}>
            Loading your subscriptions...
          </Text>
        </View>
      </View>
    );
  }

  if (error && subscriptions.length === 0) {
    return (
      <View style={tw`flex-1 bg-gray-50 justify-center items-center px-8`}>
        {/*   ADD: StatusBar for error state */}
        <StatusBar
          barStyle={getStatusBarStyle(BACKGROUND_COLOR)}
          backgroundColor={BACKGROUND_COLOR}
        />
        <View style={tw`items-center`}>
          <View
            style={tw`w-20 h-20 bg-red-100 rounded-full justify-center items-center mb-4`}
          >
            <Icon name="alert-circle-outline" size={40} color="#EF4444" />
          </View>
          <Text style={tw`text-red-600 font-bold text-lg text-center mb-2`}>
            Unable to Load
          </Text>
          <Text style={tw`text-red-500 text-sm text-center mb-6`}>{error}</Text>
          <TouchableOpacity
            onPress={loadSubscriptions}
            style={tw`bg-[#7a9b8e] rounded-2xl px-6 py-3 shadow-lg`}
          >
            <Text style={tw`text-white font-semibold text-base`}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/*   ADD: StatusBar for main screen */}
      <StatusBar
        barStyle={getStatusBarStyle(BACKGROUND_COLOR)}
        backgroundColor={BACKGROUND_COLOR}
      />
      <SafeAreaView style={tw`flex-1`} edges={["top"]}>
        {/* Improved Compact Header - Removed New Plan Button */}
        <View style={tw`bg-white px-4 py-3 shadow-sm border-b border-gray-100`}>
          <View style={tw`flex-row items-center`}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={tw`w-8 h-8 bg-gray-100 rounded-full items-center justify-center mr-3`}
            >
              <Icon name="chevron-back" size={16} color="#374151" />
            </TouchableOpacity>
            <View>
              <Text style={[fontStyles.headingS, tw`text-black`]}>
                My Subscriptions
              </Text>

            </View>
          </View>
        </View>

        <ScrollView
          style={tw`flex-1`}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#7a9b8e"]}
              tintColor="#7a9b8e"
            />
          }
          contentContainerStyle={tw`pb-6`}
        >
          {/* Stats Overview */}
          {subscriptions.length > 0 && (
            <View style={tw`px-4 pt-4`}>
              <View
                style={tw`bg-white rounded-xl p-3 shadow-sm border border-gray-100`}
              >
                <View style={tw`flex-row justify-between items-center`}>
                  <View style={tw`items-center`}>
                    <Text style={tw`text-xl font-bold text-[#7a9b8e]`}>
                      {subscriptions.length}
                    </Text>
                    <Text style={tw`text-gray-500 text-xs mt-1`}>
                      Total Plans
                    </Text>
                  </View>
                  <View style={tw`h-6 w-px bg-gray-200`} />
                  <View style={tw`items-center`}>
                    <Text style={tw`text-xl font-bold text-green-500`}>
                      {
                        subscriptions.filter((s) => s.status === "ACTIVE")
                          .length
                      }
                    </Text>
                    <Text style={tw`text-gray-500 text-xs mt-1`}>Active</Text>
                  </View>
                  <View style={tw`h-6 w-px bg-gray-200`} />
                  <View style={tw`items-center`}>
                    <Text style={tw`text-xl font-bold text-yellow-500`}>
                      {
                        subscriptions.filter((s) => s.status === "PAUSED")
                          .length
                      }
                    </Text>
                    <Text style={tw`text-gray-500 text-xs mt-1`}>Paused</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          <View style={tw`px-4 pt-4`}>
            {/* Header with New Plan Button */}
            <View style={tw`flex-row items-center justify-between mb-4`}>
              <Text
                style={[
                  fontStyles.headingS,
                  tw`text-sm font-semibold text-gray-800`,
                ]}
              >
                Your Meal Plans
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("NewSubscription")}
                style={tw`bg-[#7a9b8e] rounded-xl px-3 py-2 flex-row items-center shadow-sm`}
              >
                <Icon name="add" size={14} color="white" style={tw`mr-1`} />
                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-xs font-semibold text-white`,
                  ]}
                >
                  New Plan
                </Text>
              </TouchableOpacity>
            </View>

            {subscriptions.length === 0 ? (
              <View
                style={tw`bg-white rounded-xl p-6 items-center border border-dashed border-[#7a9b8e]`}
              >
                <View
                  style={tw`w-16 h-16 bg-[#7a9b8e]/10 rounded-full justify-center items-center mb-3`}
                >
                  <Icon name="fast-food-outline" size={28} color="#7a9b8e" />
                </View>
                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-sm font-semibold text-gray-800`,
                  ]}
                >
                  No Subscriptions Yet
                </Text>
                <Text
                  style={tw`text-gray-500 text-center text-[10px] leading-[14px] mb-2`}
                >
                  Start your journey with personalized meal plans tailored to
                  your schedule and preferences
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("NewSubscription")}
                  style={tw`bg-[#7a9b8e] rounded-xl px-6 py-3 shadow-lg`}
                >
                  <Text
                    style={[
                      fontStyles.headingS,
                      tw`text-sm font-semibold text-white`,
                    ]}
                  >
                    Create Your First Plan
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              subscriptions.map((subscription) => {
                const paymentInfo = getPaymentStatus(subscription.Billing);
                //    Logic: If sub is ACTIVE but payment is NOT SUCCESS/ACTIVE, show PENDING
                const effectiveStatus = (subscription.status === "ACTIVE" &&
                  paymentInfo.status !== "SUCCESS" &&
                  paymentInfo.status !== "ACTIVE")
                  ? "PENDING"
                  : subscription.status;

                const statusColor = getStatusColor(effectiveStatus);

                return (
                  <View
                    key={subscription.id}
                    style={tw`bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100`}
                  >
                    {/* Header with Status */}
                    <View style={tw`flex-row justify-between items-start mb-3`}>
                      <View style={tw`flex-1`}>
                        <View style={tw`flex-row items-center mb-1`}>
                          <View
                            style={[
                              tw`w-2 h-2 rounded-full mr-2`,
                              { backgroundColor: statusColor },
                            ]}
                          />
                          <Text
                            style={tw`text-xs text-gray-500 font-medium uppercase tracking-wide`}
                          >
                            {subscription.vendor?.kitchenName ||
                              "Cloud Kitchen"}
                          </Text>
                        </View>
                        <Text
                          style={tw`text-base font-bold text-gray-900 mb-1`}
                        >
                          {subscription.mealTypes} Plan
                        </Text>
                        <View style={tw`flex-row items-center`}>
                          <Icon
                            name="calendar-outline"
                            size={12}
                            color="#6B7280"
                          />
                          <Text style={tw`text-gray-500 text-xs ml-1`}>
                            {formatDate(subscription.startDate)} -{" "}
                            {formatDate(subscription.endDate)}
                          </Text>
                        </View>
                      </View>
                      <View style={tw`items-end`}>
                        {getStatusBadge(effectiveStatus)}
                        <View
                          style={tw`bg-blue-50 rounded-full px-2 py-1 mt-1`}
                        >
                          <Text style={tw`text-blue-600 text-xs font-semibold`}>
                            {subscription.frequency}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Delivery Timeline */}
                    <View style={tw`bg-gray-50 rounded-lg p-3 mb-3`}>
                      <View style={tw`flex-row items-center mb-2`}>
                        <Icon name="time-outline" size={14} color="#7a9b8e" />
                        <Text
                          style={tw`text-gray-700 font-semibold text-sm ml-2`}
                        >
                          Delivery Schedule
                        </Text>
                      </View>
                      {subscription.deliveryTimes?.map((time, index) => (
                        <View
                          key={index}
                          style={tw`flex-row items-center justify-between py-1`}
                        >
                          <Text style={tw`text-gray-600 text-xs`}>
                            {time.startTime} - {time.endTime}
                          </Text>
                          <Text style={tw`text-gray-400 text-xs`}>Daily</Text>
                        </View>
                      ))}
                    </View>

                    {/* Price and Next Billing Card */}
                    <View
                      style={tw`bg-gradient-to-r from-[#7a9b8e] to-[#6a8a7e] rounded-lg p-3 mb-3`}
                    >
                      <View style={tw`flex-row justify-between items-center`}>
                        <View>
                          <Text style={tw`text-white text-xs opacity-90`}>
                            Next Billing
                          </Text>
                          <Text style={tw`text-white font-bold text-sm`}>
                            {formatDate(subscription.nextBillingDate)}
                          </Text>
                        </View>
                        <View style={tw`items-end`}>
                          <Text style={tw`text-white text-xs opacity-90`}>
                            Total
                          </Text>
                          <Text style={tw`text-white font-bold text-base`}>
                            ₹{subscription.finalPrice}
                          </Text>
                          {subscription.discountAmount > 0 && (
                            <Text style={tw`text-green-300 text-xs`}>
                              Saved ₹{subscription.discountAmount}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Items Summary */}
                    {subscription.items && subscription.items.length > 0 && (
                      <View style={tw`mb-3`}>
                        <View style={tw`flex-row items-center`}>
                          <Icon
                            name="restaurant-outline"
                            size={14}
                            color="#7a9b8e"
                          />
                          <Text
                            style={tw`text-gray-700 font-semibold text-sm ml-2`}
                          >
                            {subscription.items.length} Selected Item
                            {subscription.items.length !== 1 ? "s" : ""}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Payment Info & Actions */}
                    <View style={tw`border-t border-gray-200 pt-3`}>
                      <View
                        style={tw`flex-row justify-between items-center mb-2`}
                      >
                        <View style={tw`flex-row items-center`}>
                          <Icon name="card-outline" size={14} color="#6B7280" />
                          <Text style={tw`text-gray-500 text-xs ml-1 mr-2`}>
                            {paymentInfo.TransactionID}
                          </Text>
                          <View style={[
                            tw`px-2 py-0.5 rounded-full`,
                            paymentInfo.status === "SUCCESS" ? tw`bg-green-100` :
                              paymentInfo.status === "FAILED" || paymentInfo.status === "FAILURE" ? tw`bg-red-100` :
                                tw`bg-blue-100`
                          ]}>
                            <Text style={[
                              tw`text-[10px] font-bold`,
                              paymentInfo.status === "SUCCESS" ? tw`text-green-700` :
                                paymentInfo.status === "FAILED" || paymentInfo.status === "FAILURE" ? tw`text-red-700` :
                                  tw`text-blue-700`
                            ]}>
                              {paymentInfo.status}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={tw`flex-row gap-2`}>
                        {(subscription.status === "ACTIVE" ||
                          subscription.status === "PAUSED") && (
                            <TouchableOpacity
                              onPress={() =>
                                handleTogglePause(
                                  subscription.id,
                                  subscription.status
                                )
                              }
                              style={tw`flex-1 bg-white border border-gray-300 rounded-lg py-2 items-center`}
                            >
                              <Icon
                                name={
                                  subscription.status === "PAUSED"
                                    ? "play"
                                    : "pause"
                                }
                                size={14}
                                color="#7a9b8e"
                                style={tw`mb-1`}
                              />
                              <Text
                                style={tw`text-[#7a9b8e] font-semibold text-xs`}
                              >
                                {subscription.status === "PAUSED"
                                  ? "Resume"
                                  : "Pause"}
                              </Text>
                            </TouchableOpacity>
                          )}

                        {subscription.status !== "CANCELLED" &&
                          subscription.status !== "EXPIRED" && (
                            <TouchableOpacity
                              onPress={() => handleCancel(subscription.id)}
                              style={tw`flex-1 bg-red-50 border border-red-200 rounded-lg py-2 items-center`}
                            >
                              <Icon
                                name="close-circle"
                                size={14}
                                color="#EF4444"
                                style={tw`mb-1`}
                              />
                              <Text
                                style={tw`text-red-600 font-semibold text-xs`}
                              >
                                Cancel
                              </Text>
                            </TouchableOpacity>
                          )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default SubscriptionScreen;
