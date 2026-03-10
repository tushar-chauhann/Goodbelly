import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons as Icon } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import tw from "twrnc";
import DateTimePicker from "@react-native-community/datetimepicker";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Components
import StepIndicator from "../../components/subscriptions/SubscriptionStepIndicator";
import VendorList from "../../components/subscriptions/SubscriptionVendorList";
import MealPlanner from "../../components/subscriptions/SubscriptionMealPlanner";
import Summary from "../../components/subscriptions/SubscriptionSummary";

// Services
import { authService } from "../../services/authService.js";
import { toast } from "../../utils/toast";
import { fontStyles } from "../../utils/fontStyles.js";
import api from "../../services/api";

const { width: screenWidth } = Dimensions.get("window");

const steps = [
  {
    id: 1,
    title: "Select Kitchen",
    subtitle: "Choose a vendor or cloud kitchen partner",
  },
  {
    id: 2,
    title: "Select Meals & Timings",
    subtitle: "Pick meal slots, delivery windows, and menu items",
  },
  {
    id: 3,
    title: "Review & Confirm",
    subtitle: "Check macros, pricing, and billing before confirming",
  },
];

const NewSubscriptionScreen = () => {
  const navigation = useNavigation();

  // Get user data from authService instead of Redux
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [subscriptionId, setSubscriptionId] = useState("");
  const [weeklySchedule, setWeeklySchedule] = useState({});
  const [items, setItems] = useState([]);
  const [mealTypes, setMealTypes] = useState("");
  const [selectedTimings, setSelectedTimings] = useState([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [frequency, setFrequency] = useState("DAILY");
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [discountId, setDiscountId] = useState(null);
  const [finalPrice, setFinalPrice] = useState(0);

  // Date Picker States
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());

  // Load user data on component mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await authService.getCurrentUser();
      if (userData?.data) {
        setUser(userData.data);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  // Set default start date to today and end date to 30 days from today
  useEffect(() => {
    const today = new Date();
    const formattedToday = formatDate(today);
    setStartDate(formattedToday);
    setTempStartDate(today);

    const defaultEndDate = new Date();
    defaultEndDate.setDate(today.getDate() + 30);
    const formattedDefaultEndDate = formatDate(defaultEndDate);
    setEndDate(formattedDefaultEndDate);
    setTempEndDate(defaultEndDate);
  }, []);

  // Format date to YYYY-MM-DD
  const formatDate = (date) => {
    return date.toISOString().split("T")[0];
  };

  // ⭐ ALWAYS keep PayU amount as INTEGER STRING
  const getPayUAmountString = (amount) => {
    return String(Math.round(Number(amount || 0)));
  };

  // Format date for display (DD MMM YYYY)
  const formatDisplayDate = (dateString) => {
    if (!dateString) return "Select date";

    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  const handleConfirm = async () => {
    // Validate user authentication
    if (!user?.id) {
      Alert.alert("Login Required", "Please login to continue");
      return;
    }

    // Prevent duplicate clicks
    if (paymentLoading) {
      console.log("    Already processing - ignoring duplicate click");
      return;
    }

    setPaymentLoading(true);

    try {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("   STARTING SUBSCRIPTION PAYMENT PROCESS (WEBSITE PARITY)");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // 1. Generate transaction ID (Match website format)
      const transactionId = `SUB${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
      console.log("    Generated Transaction ID:", transactionId);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      //  STEP 1: GENERATE PayU HASH
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      console.log("🔐 STEP 1: Generating PayU hash...");

      const userPhone = user?.phone ? String(user.phone).trim() : "9999999999";
      const userName = user?.name ? String(user.name).trim() : "Customer";
      const userEmail = user?.email ? String(user.email).trim() : "customer@goodbelly.in";
      const productInfo = "Meal Subscription";
      const payableAmount = Math.max(finalPrice, 1);
      const amountToCharge = Number(payableAmount).toFixed(2);

      const hashPayload = {
        name: userName,
        email: userEmail,
        phone: userPhone,
        amount: amountToCharge,
        orderInfo: productInfo,
        transactionId: transactionId,
      };

      const storageToken = await AsyncStorage.getItem("accessToken");
      const hashResponse = await api.post("/payu/hash", hashPayload, {
        headers: { Authorization: `Bearer ${storageToken}` },
      });

      const hashData = hashResponse.data?.data || hashResponse.data;
      if (!hashData?.hash) throw new Error("Payment hash not received from server");

      console.log("  Hash received successfully for txnid:", transactionId);

      //     WAIT 1 SECOND (Hold pattern from website)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      //  STEP 2: CREATE SUBSCRIPTION
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      console.log("📝 STEP 2: Creating subscription order...");

      const startDateTime = new Date(startDate + "T00:00:00.000Z").toISOString();
      const endDateTime = new Date(endDate + "T23:59:59.999Z").toISOString();
      const nextBilling = new Date(endDate + "T00:00:00.000Z");
      nextBilling.setDate(nextBilling.getDate() + 1);

      const subscriptionPayload = {
        startDate: startDateTime,
        endDate: endDateTime,
        frequency: "CUSTOM",
        nextBillingDate: nextBilling.toISOString(),
        transactionId: transactionId,
        referenceId: transactionId,  // For ORDER block compatibility
        paymentReference: transactionId, //    CRITICAL: For SUBSCRIPTION block (Billing table)
        payMethod: "ONLINE",
        paymentMethod: "ONLINE",
        discountId,
        weeklySchedule: weeklySchedule, //    SEND ACTUAL WEEKLY SCHEDULE
        vendorId: selectedVendor?.id || selectedVendor?.vendor?.id,
      };

      const subRes = await authService.createSubscription(subscriptionPayload);
      const subscriptionResult = subRes?.data || subRes;

      console.log("📝 Subscription creation result:", subscriptionResult);

      if (!subscriptionResult?.id) throw new Error("Subscription ID missing in response");

      setSubscriptionId(subscriptionResult.id);
      console.log("  Subscription record created. ID:", subscriptionResult.id);

      //     WAIT 1 SECOND (Hold pattern from website)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      //  STEP 3: PREPARE & SUBMIT PAYMENT
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      console.log("🚀 STEP 3: Preparing PayU Gateway...");

      // Use config from app.config.js / .env
      const baseUrl = Constants.expoConfig?.extra?.yourApiBaseUrl;

      if (!baseUrl) {
        console.warn("    YOUR_API_BASE_URL not configured in .env");
        Alert.alert("Configuration Error", "API Base URL not found. Please check configuration.");
        return;
      }

      // Construct SURL/FURL with params to match website logic
      const successUrl = `${baseUrl}/payu/success-forward?txnid=${transactionId}&subscriptionId=${subscriptionResult.id}`;
      const failureUrl = `${baseUrl}/payu/failure-forward?txnid=${transactionId}&subscriptionId=${subscriptionResult.id}`;

      const paymentParams = {
        key: Constants.expoConfig?.extra?.payuMerchantKey || "Uxl2Bk",
        txnid: transactionId,
        amount: amountToCharge,
        productinfo: productInfo,
        firstname: userName,
        email: userEmail,
        phone: userPhone,
        surl: successUrl,
        furl: failureUrl,
        hash: hashData.hash,
        udf1: userPhone,
        udf2: "",
        udf3: "",
        udf4: "",
        udf5: "",
        // Matches website's simplified control fields
        drop_category: "NEFT|EMI",
        enforced_payment: "CC|DC|UPI|WALLET",
      };

      //    RESET paymentLoading BEFORE NAVIGATION
      setPaymentLoading(false);

      navigation.replace("PayUWebView", {
        paymentParams,
        payuUrl: Constants.expoConfig?.extra?.payuActionUrl || "https://secure.payu.in/_payment",
        transactionId: transactionId,
        payableAmount: amountToCharge,
        orderId: subscriptionResult.id,
        subscriptionOrderId: subscriptionResult.id,
        isSubscription: true,
        checkoutReturnParams: {
          vendorId: selectedVendor?.id || selectedVendor?.vendor?.id,
          selectedVendor,
          items,
          totalPrice,
          finalPrice,
          mealTypes,
          selectedTimings,
          startDate,
          endDate,
        },
      });

      console.log("  STEP 3 COMPLETE: User redirected to PayU WebView");
      console.log("");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🎯 SUBSCRIPTION PAYMENT FLOW SUMMARY:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("  Step 1: Subscription created with transactionId:", transactionId);
      console.log("  Step 2: PayU hash generated with auth token");
      console.log("  Step 3: User redirected to PayU WebView");
      console.log("    Step 4: User completes payment on PayU");
      console.log("    Step 5: PayU sends webhook to backend");
      console.log("    Step 6: Backend updates subscription status");
      console.log("    Step 7: User navigated to success/failure screen");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    } catch (err) {
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("     SUBSCRIPTION PAYMENT ERROR");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("Error:", err);
      console.error("Error message:", err.message);
      console.error("Response:", err.response?.data);

      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Unable to process subscription payment. Please try again.";

      Alert.alert("Payment Error", errorMessage);
    } finally {
      setPaymentLoading(false);
    }
  };


  // Handle Start Date Selection
  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);

    if (selectedDate) {
      const formattedDate = formatDate(selectedDate);
      setStartDate(formattedDate);
      setTempStartDate(selectedDate);

      // If selected start date is after current end date, update end date
      if (selectedDate > tempEndDate) {
        const newEndDate = new Date(selectedDate);
        newEndDate.setDate(selectedDate.getDate() + 30);
        setEndDate(formatDate(newEndDate));
        setTempEndDate(newEndDate);
      }
    }
  };

  // Handle End Date Selection
  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);

    if (selectedDate) {
      // Ensure end date is not before start date
      if (selectedDate < tempStartDate) {
        toast.error("End date cannot be before start date");
        return;
      }

      const formattedDate = formatDate(selectedDate);
      setEndDate(formattedDate);
      setTempEndDate(selectedDate);
    }
  };

  // Show Start Date Picker
  const showStartPicker = () => {
    setTempStartDate(new Date(startDate || new Date()));
    setShowStartDatePicker(true);
  };

  // Show End Date Picker
  const showEndPicker = () => {
    setTempEndDate(new Date(endDate || new Date()));
    setShowEndDatePicker(true);
  };

  const canContinue = useMemo(() => {
    if (step === 1) {
      return Boolean(selectedVendor);
    }
    if (step === 2) {
      // Check if at least one day has complete selection:
      // 1. Meal type selected
      // 2. Timing selected
      // 3. At least one item selected
      const hasCompleteDay = Object.values(weeklySchedule).some((day) => {
        const hasMealType = Boolean(day.mealType);
        const hasTiming = Boolean(day.timing);
        const hasItems = day.items && day.items.length > 0;

        // All three must be selected for a complete day
        return hasMealType && hasTiming && hasItems;
      });

      return hasCompleteDay;
    }
    if (step === 3) {
      return startDate && endDate;
    }
    return true;
  }, [step, selectedVendor, weeklySchedule, startDate, endDate]);

  const firstDeliveryDate = useMemo(() => {
    if (startDate) {
      const date = new Date(startDate);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [startDate]);

  const handleNext = () => {
    if (step < 3) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  // Calculate subscription duration in days
  const getSubscriptionDuration = () => {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Update final price whenever dates or total price changes
  useEffect(() => {
    // Only auto-calculate if no discount is applied.
    // When a discount is applied, the Summary component manages the finalPrice via onCouponApply callback.
    if (!discountId) {
      const duration = getSubscriptionDuration();
      setFinalPrice(Math.max(totalPrice * duration, 1));
    }
  }, [startDate, endDate, totalPrice, discountId]);

  //   Create subscription order first
  const createSubscriptionOrder = async (transactionId) => {
    const startDateTime = new Date(startDate + "T00:00:00.000Z").toISOString();
    const endDateTime = new Date(endDate + "T23:59:59.999Z").toISOString();
    const nextBilling = new Date(endDate + "T00:00:00.000Z");
    nextBilling.setDate(nextBilling.getDate() + 1);
    const nextBillingDateTime = nextBilling.toISOString();

    const subscriptionData = {
      vendorId: selectedVendor?.id || selectedVendor?.vendor?.id,
      mealTypes,
      startDate: startDateTime,
      endDate: endDateTime,
      frequency,
      nextBillingDate: nextBillingDateTime,
      transactionId,
      subscriptionReference: transactionId,
      paymentMethod: "ONLINE",
      discountId,
      items: items.map((item) => ({
        itemId: item.itemId,
        weightId: item.weightId,
        quantity: item.quantity || 1,
      })),
      deliveryTimes: Array.isArray(selectedTimings)
        ? selectedTimings
        : [selectedTimings],
    };

    try {
      console.log("📝 Creating subscription order:", subscriptionData);

      const response = await authService.createSubscriptionOrder(subscriptionData);
      const orderData = response?.data?.data || response?.data;

      console.log("  Subscription order created:", orderData);

      if (orderData?.id) {
        setSubscriptionId(orderData.id);
      }

      return { success: true, data: orderData };
    } catch (error) {
      console.error("     Error creating subscription order:", error);
      throw error;
    }
  };

  //   Initiate PayU payment

  // ⭐ ALWAYS keep PayU amount as INTEGER STRING




  const nextBillingDate = useMemo(() => {
    if (!endDate) return "Not set";

    const date = new Date(endDate);
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [endDate]);

  const showConfirmation = isConfirmed && step === 3;

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <SafeAreaView style={tw`flex-1`} edges={["top"]}>
        {/* Clean Minimal Header */}
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
                Meal Subscription
              </Text>
              <Text style={tw`text-gray-500 text-xs`}>
                Create your personalized meal plan
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={tw`flex-1`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`pb-6`}
        >
          {/* Welcome Section */}
          <View style={tw`px-4 pt-4 pb-3`}>
            <View style={tw`flex-row items-center`}>
              <View
                style={tw`w-10 h-10 bg-[#7a9b8e]/10 rounded-xl items-center justify-center mr-3`}
              >
                <Icon name="restaurant-outline" size={20} color="#7a9b8e" />
              </View>
              <View style={tw`flex-1`}>
                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-sm font-semibold text-gray-800`,
                  ]}
                >
                  Create Your Perfect Meal Plan
                </Text>
                <Text style={tw`text-gray-600 text-xs leading-4`}>
                  Choose a kitchen, curate meals and delivery windows for your
                  routine.
                </Text>
              </View>
            </View>
          </View>

          {/* Steps Indicator - Modified to show checkmarks for completed steps */}
          <View style={tw`px-4 mb-6`}>
            <View style={tw`flex-row justify-between items-start`}>
              {steps.map((stepItem, index) => {
                const isCompleted = stepItem.id < step;
                const isCurrent = stepItem.id === step;

                return (
                  <View key={stepItem.id} style={tw`flex-1 items-center`}>
                    {/* Step circle with number or checkmark */}
                    <View
                      style={tw`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${isCompleted
                        ? "bg-[#7a9b8e]"
                        : isCurrent
                          ? "bg-[#7a9b8e]"
                          : "bg-gray-200"
                        }`}
                    >
                      {isCompleted ? (
                        <Icon name="checkmark" size={20} color="white" />
                      ) : (
                        <Text
                          style={tw`font-bold text-sm ${isCurrent ? "text-white" : "text-gray-600"
                            }`}
                        >
                          {stepItem.id}
                        </Text>
                      )}
                    </View>

                    {/* Step title */}
                    <Text
                      style={tw`text-xs font-semibold text-center ${isCompleted || isCurrent
                        ? "text-[#7a9b8e]"
                        : "text-gray-500"
                        }`}
                    >
                      {stepItem.title}
                    </Text>

                    {/* Step subtitle */}
                    <Text
                      style={tw`text-[10px] text-gray-400 text-center mt-1 px-1`}
                      numberOfLines={2}
                    >
                      {stepItem.subtitle}
                    </Text>

                    {/* Connecting line (except for last step) */}
                    {index < steps.length - 1 && (
                      <View
                        style={tw`absolute top-5 left-3/4 w-12 h-0.5 ${isCompleted ? "bg-[#7a9b8e]" : "bg-gray-200"
                          }`}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Main Content */}
          <View style={tw`px-4`}>
            {step === 1 && (
              <VendorList
                selectedVendor={selectedVendor}
                onSelect={(vendor) => {
                  setSelectedVendor(vendor);
                  handleNext();
                }}
              />
            )}

            {step === 2 && (
              <MealPlanner
                vendor={selectedVendor}
                onMealSelectionChange={(weeklySchedule) => {
                  // Store the entire weekly schedule - matches website pattern
                  setWeeklySchedule(weeklySchedule);

                  // Calculate total price from all days
                  const weeklyTotal = Object.values(weeklySchedule).reduce(
                    (sum, day) =>
                      sum +
                      (day.items?.reduce(
                        (daySum, item) => daySum + (item.price * item.quantity || 0),
                        0
                      ) || 0),
                    0
                  );
                  setTotalPrice(weeklyTotal);
                }}
              />
            )}

            {step === 3 && (
              <View style={tw`space-y-4`}>
                {/* Date Selection Section */}
                <View
                  style={tw`bg-white rounded-xl p-4 shadow-sm border border-gray-100`}
                >
                  <Text
                    style={[
                      fontStyles.headingS,
                      tw`text-base font-semibold text-gray-800 mb-2`,
                    ]}
                  >
                    Choose your subscription period
                  </Text>

                  {/* Subscription Duration Info */}
                  <View
                    style={tw`bg-blue-50 rounded-lg p-3 mb-4 border border-blue-100`}
                  >
                    <Text
                      style={tw`text-blue-800 text-xs font-medium text-center`}
                    >
                      Subscription Duration: {getSubscriptionDuration()} days
                    </Text>
                  </View>

                  <View style={tw`space-y-3`}>
                    <View>
                      <Text
                        style={tw`text-xs font-semibold text-gray-700 mb-1`}
                      >
                        Start Date
                      </Text>
                      <TouchableOpacity
                        style={tw`border border-gray-300 rounded-xl px-4 py-3 bg-white flex-row justify-between items-center`}
                        onPress={showStartPicker}
                      >
                        <Text style={tw`text-gray-900 text-sm`}>
                          {formatDisplayDate(startDate)}
                        </Text>
                        <Icon
                          name="calendar-outline"
                          size={16}
                          color="#6B7280"
                        />
                      </TouchableOpacity>
                    </View>
                    <View>
                      <Text
                        style={tw`text-xs font-semibold text-gray-700 mb-1`}
                      >
                        End Date
                      </Text>
                      <TouchableOpacity
                        style={tw`border border-gray-300 rounded-xl px-4 py-3 bg-white flex-row justify-between items-center`}
                        onPress={showEndPicker}
                      >
                        <Text style={tw`text-gray-900 text-sm`}>
                          {formatDisplayDate(endDate)}
                        </Text>
                        <Icon
                          name="calendar-outline"
                          size={16}
                          color="#6B7280"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <Summary
                  vendor={selectedVendor}
                  items={items}
                  selectedMealType={mealTypes}
                  selectedWindow={selectedTimings}
                  firstDeliveryDate={firstDeliveryDate}
                  startDate={startDate}
                  endDate={endDate}
                  frequency={frequency}
                  totalPrice={totalPrice}
                  onCouponApply={(discountId, calculatedFinalPrice) => {
                    setDiscountId(discountId);
                    setFinalPrice(Math.max(calculatedFinalPrice, 1));
                  }}
                />

                {/* Billing & Renewal Section */}
                <View
                  style={tw`bg-white rounded-xl p-4 shadow-sm border border-gray-100`}
                >
                  <Text
                    style={[
                      fontStyles.headingS,
                      tw`text-base font-semibold text-gray-800 mb-2`,
                    ]}
                  >
                    Billing & Renewal
                  </Text>
                  <View style={tw`space-y-3`}>
                    <View
                      style={tw`bg-blue-50 rounded-lg p-3 border border-blue-100 mb-3`}
                    >
                      <View style={tw`flex-row items-center mb-1`}>
                        <Icon name="calendar" size={14} color="#3B82F6" />
                        <Text
                          style={tw`text-blue-800 font-semibold text-xs ml-2`}
                        >
                          Next Billing Date
                        </Text>
                      </View>
                      <Text style={tw`font-bold text-gray-900 text-sm`}>
                        {nextBillingDate}
                      </Text>
                      <Text style={tw`text-blue-600 text-xs mt-1`}>
                        You will receive reminders on this date
                      </Text>
                    </View>

                    <View
                      style={tw`bg-green-50 rounded-lg p-3 border border-green-100`}
                    >
                      <View style={tw`flex-row items-center mb-1`}>
                        <Icon name="card" size={14} color="#10B981" />
                        <Text
                          style={tw`text-green-800 font-semibold text-xs ml-2`}
                        >
                          Final Amount
                        </Text>
                      </View>
                      <Text
                        style={[
                          fontStyles.headingS,
                          tw`text-sm font-semibold text-gray-800`,
                        ]}
                      >
                        ₹{finalPrice.toFixed(2)}
                      </Text>
                      <Text style={tw`text-green-600 text-xs mt-1`}>
                        Amount to be paid now
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Confirmation Success */}
                {showConfirmation && (
                  <View
                    style={tw`bg-green-50 border border-green-200 rounded-xl p-4`}
                  >
                    <View style={tw`flex-row items-center mb-2`}>
                      <View
                        style={tw`w-8 h-8 bg-green-100 rounded-full items-center justify-center mr-2`}
                      >
                        <Icon name="checkmark" size={20} color="#059669" />
                      </View>
                      <Text style={[fontStyles.headingS, tw`text-green-800`]}>
                        Subscription Confirmed!
                      </Text>
                    </View>
                    <Text style={tw`text-green-700 text-xs mb-3 leading-4`}>
                      Your subscription ID is{" "}
                      <Text style={tw`font-bold`}>{subscriptionId}</Text>
                      {"\n"}A concierge from us will reach out within the next
                      hour to finalize delivery instructions.
                    </Text>
                    <View style={tw`flex-row gap-2`}>
                      <TouchableOpacity
                        style={tw`flex-1 bg-white rounded-lg px-3 py-2 shadow-sm border border-green-200`}
                        onPress={() => navigation.navigate("Subscriptions")}
                      >
                        <Text
                          style={tw`text-green-800 font-semibold text-center text-xs`}
                        >
                          My Subscriptions
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={tw`flex-1 bg-green-600 rounded-lg px-3 py-2 shadow-sm`}
                        onPress={() => {
                          setIsConfirmed(false);
                          setStep(1);
                          setSelectedVendor(null);
                          setItems([]);
                          setMealTypes([]);
                          setSelectedTimings([]);
                        }}
                      >
                        <Text
                          style={tw`text-white font-semibold text-center text-xs`}
                        >
                          Create Another
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Date Pickers */}
        {showStartDatePicker && (
          <DateTimePicker
            value={tempStartDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleStartDateChange}
            minimumDate={new Date()}
            style={tw`bg-white`}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={tempEndDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleEndDateChange}
            minimumDate={tempStartDate}
            style={tw`bg-white`}
          />
        )}

        {/* Bottom Action Bar */}
        {!showConfirmation && (
          <View
            style={tw`bg-white border-t border-gray-200 px-4 py-3 shadow-lg`}
          >
            <View style={tw`flex-row justify-between items-center gap-3`}>
              <TouchableOpacity
                onPress={handleBack}
                disabled={step === 1}
                style={tw`flex-1 px-3 py-2 rounded-xl ${step === 1 ? "bg-gray-100 opacity-50" : "bg-gray-100"
                  }`}
              >
                <Text
                  style={tw`text-center font-semibold text-xs ${step === 1 ? "text-gray-400" : "text-gray-700"
                    }`}
                >
                  Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={step === 3 ? handleConfirm : handleNext}
                disabled={!canContinue || paymentLoading}
                style={tw`flex-1 px-3 py-2 rounded-xl ${canContinue ? "bg-[#7a9b8e] shadow-sm" : "bg-gray-300"
                  }`}
              >
                {paymentLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text
                    style={tw`text-center font-semibold text-xs ${canContinue ? "text-white" : "text-gray-500"
                      }`}
                  >
                    {step === 3 ? "Proceed to Payment" : "Continue"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

export default NewSubscriptionScreen;
