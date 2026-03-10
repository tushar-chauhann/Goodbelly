import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  StatusBar,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { authService } from "../../services/authService.js";
import { fontStyles } from "../../utils/fontStyles.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import api from "../../services/api";

// Import components
import CustomerFeedbacks from "../../components/CustomerFeedbacks";
import { ConsultantSkeleton } from "../../components/ProductSkeleton";

const ConsultProfile = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { expert } = route.params;
  const [user, setUser] = useState(null);
  const [consultant, setConsultant] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDurationId, setSelectedDurationId] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [activeStep, setActiveStep] = useState("select");
  const [formError, setFormError] = useState("");
  const [bookingReference, setBookingReference] = useState("");
  const [upcomingDays, setUpcomingDays] = useState([]);

  // Customer Reviews State
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  // Dropdown/Collapsible States
  const [showAboutMe, setShowAboutMe] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showBooking, setShowBooking] = useState(true);

  // Get user from AsyncStorage
  const getUserFromStorage = async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
      }
    } catch (error) {
      console.error("Error getting user from storage:", error);
    }
  };

  // Create upcoming days (excluding Sundays)
  const createUpcomingDays = () => {
    const today = new Date();
    const days = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      // Skip Sundays (day 0)
      if (date.getDay() !== 0) {
        days.push({
          value: date.toISOString().split("T")[0],
          label: date.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
          }),
          dayOfWeek: date.getDay(),
          dayName: date
            .toLocaleDateString("en-US", { weekday: "long" })
            .toUpperCase(),
        });
      }
    }
    return days;
  };

  // Process consultant reviews
  const processConsultantReviews = (consultantData) => {
    if (!consultantData) return;

    const consultantReviews = consultantData.reviews || [];
    setReviews(consultantReviews);

    if (consultantReviews.length > 0) {
      const sum = consultantReviews.reduce(
        (total, review) => total + (review.rating || 0),
        0
      );
      setAverageRating(Math.round((sum / consultantReviews.length) * 10) / 10);
    } else {
      setAverageRating(consultantData.rating || 0);
    }
  };

  // Submit review
  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      Alert.alert("Error", "Please select a rating");
      return;
    }
    if (!user) {
      Alert.alert("Error", "Please login to submit a review");
      return;
    }

    try {
      setReviewLoading(true);
      const response = await authService.submitReview({
        consultantId: consultant.id,
        rating: reviewRating,
        comment: reviewComment,
      });

      if (response.success) {
        Alert.alert("Success", "Review submitted successfully!");
        setReviewRating(0);
        setReviewComment("");
        await fetchConsultant();
      } else {
        Alert.alert("Error", response.message || "Failed to submit review");
      }
    } catch (err) {
      console.error("Error submitting review:", err);
      Alert.alert("Error", "Failed to submit review. Please try again.");
    } finally {
      setReviewLoading(false);
    }
  };

  // Check if slot time has passed
  const isSlotPassed = (slotTime, selectedDate) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    if (selectedDate !== today) {
      return false;
    }

    let timeStr = slotTime.trim();

    if (!timeStr.includes("AM") && !timeStr.includes("PM")) {
      const [hours, minutes] = timeStr.split(":").map(Number);
      const slotDateTime = new Date();
      slotDateTime.setHours(hours, minutes, 0, 0);
      return now > slotDateTime;
    }

    const [time, period] = timeStr.split(" ");
    const [hours, minutes] = time.split(":").map(Number);

    let slotHours = hours;
    if (period === "PM" && hours !== 12) {
      slotHours += 12;
    } else if (period === "AM" && hours === 12) {
      slotHours = 0;
    }

    const slotDateTime = new Date();
    slotDateTime.setHours(slotHours, minutes, 0, 0);
    return now > slotDateTime;
  };

  const fetchConsultant = async () => {
    try {
      setIsLoading(true);
      console.log("   Fetching consultant with expert:", expert);

      const consultantIdentifier = expert.username || expert.id;
      console.log("    Using identifier:", consultantIdentifier);

      const response = await authService.getConsultantById(
        consultantIdentifier
      );
      console.log("  Consultant API response:", response);

      let consultantData;
      if (response && response.data) {
        consultantData = response.data;
        setConsultant(consultantData);

        if (response.data?.durations?.length > 0) {
          setSelectedDurationId(response.data.durations[0].id);
        }
      } else if (response) {
        consultantData = response;
        setConsultant(response);

        if (response?.durations?.length > 0) {
          setSelectedDurationId(response.durations[0].id);
        }
      } else {
        throw new Error("Invalid consultant data format");
      }

      processConsultantReviews(consultantData);

      const days = createUpcomingDays();
      setUpcomingDays(days);
      if (days.length > 0) {
        setSelectedDate(days[0].value);
      }
    } catch (error) {
      console.error("     Error fetching consultant:", error);

      if (error.response?.status === 404) {
        Alert.alert(
          "Not Found",
          "Consultant not found. Please try another specialist."
        );
      } else if (error.response?.status === 500) {
        Alert.alert(
          "Server Error",
          "Unable to load consultant details. Please try again later."
        );
      } else {
        Alert.alert(
          "Error",
          "Failed to load consultant details. Please check your connection."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getUserFromStorage();
    fetchConsultant();
  }, [expert.username]);

  useEffect(() => {
    if (selectedSlot && selectedDate && consultant) {
      const slot = consultant?.availability?.find((s) => s.id === selectedSlot);
      if (slot && isSlotPassed(slot.timeSlot, selectedDate)) {
        setSelectedSlot("");
      }
    }
  }, [selectedDate, selectedSlot, consultant]);

  // Helper Functions
  const getSlot = (slotId) => {
    const slot = consultant?.availability?.find((s) => s.id === slotId);
    return slot ? slot.timeSlot : "";
  };

  const selectedDuration = consultant?.durations?.find(
    (duration) => duration.id === selectedDurationId
  );

  const formatCurrency = (value) => {
    return `₹${new Intl.NumberFormat("en-IN").format(value || 0)}`;
  };

  const handleProceedToPayment = async () => {
    if (!selectedDuration || !selectedDate || !selectedSlot) {
      setFormError("Please choose a duration and slot to continue.");
      return;
    }

    setFormError("");
    setActiveStep("payment");
  };

  const handleConfirmBooking = async () => {
    if (!user) {
      setFormError("Please login to book a slot.");
      return;
    }

    // Prevent duplicate clicks
    if (isSubmitting) {
      console.log("    Already processing - ignoring duplicate click");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("   STARTING CONSULTATION BOOKING PROCESS");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      //   Use CON- prefix for consultation transactions
      const transactionId = `CON-${Date.now()}`;
      console.log("    Transaction ID:", transactionId);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      //  STEP 1: CREATE BOOKING
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      console.log("📝 STEP 1: Creating booking...");

      const payload = {
        userId: user?.id,
        consultantId: consultant.id,
        durationId: selectedDurationId,
        slotId: selectedSlot,
        date: selectedDate,
        paymentMethod: "ONLINE",
        transactionId,
        bookingReference: transactionId,
      };

      console.log("  Booking Payload:", JSON.stringify(payload, null, 2));

      const response = await authService.createBooking(payload);
      const bookingData = response?.data?.data || response?.data;

      if (!bookingData) {
        throw new Error("Booking not created");
      }

      console.log("  Booking created successfully");
      console.log("   • Booking ID:", bookingData.id);
      console.log("   • Transaction ID:", transactionId);

      setBookingReference(transactionId);

      await initiatePayUPayment(bookingData, transactionId);

    } catch (err) {
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("     BOOKING ERROR");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("Error:", err);
      console.error("Error message:", err.message);
      console.error("Response:", err.response?.data);

      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to confirm booking. Try again.";

      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const initiatePayUPayment = async (bookingData, transactionId) => {
    try {
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      //  STEP 2: GENERATE PayU HASH
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      console.log("🔐 STEP 2: Generating PayU hash...");

      // Sanitize user data (match checkout pattern)
      const userPhone =
        user?.phone && String(user.phone).trim() !== ""
          ? String(user.phone).trim()
          : "9999999999";
      const userName = user?.name?.trim() || "Customer";
      const userEmail = user?.email?.trim() || "customer@goodbelly.in";

      // Use .toFixed(2) to preserve decimal precision (match checkout)
      const amountToCharge = Number(selectedDuration?.price || 0).toFixed(2);

      console.log("   Consultation Price:", Number(selectedDuration?.price || 0).toFixed(2));
      console.log("    Amount to Charge:", amountToCharge);

      const productInfo = `Consultation with ${consultant?.name || "Expert"}`;

      const backendPayload = {
        name: userName,
        email: userEmail,
        phone: userPhone,
        amount: amountToCharge,
        orderInfo: productInfo,
        transactionId,
      };

      console.log("  Hash Generation Payload:", backendPayload);

      //   ADD AUTH TOKEN (critical fix!)
      const hashResponse = await api.post("/payu/hash", backendPayload, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });

      const hashData = hashResponse?.data?.data || hashResponse?.data;

      if (!hashData?.hash) {
        throw new Error("Payment hash not received from server");
      }

      console.log("  STEP 2 COMPLETE:");
      console.log("   • PayU hash generated");
      console.log("   • txnid =", transactionId);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      //  STEP 3: REDIRECT TO PayU WEBVIEW
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      console.log("🚀 STEP 3: Redirecting to PayU...");

      const paymentParams = {
        key: Constants.expoConfig?.extra?.payuMerchantKey || "Uxl2Bk",
        txnid: transactionId,
        amount: amountToCharge,
        productinfo: productInfo,
        firstname: userName,
        email: userEmail,
        phone: userPhone,
        hash: hashData.hash,
        //   USE CONFIG URLS WITH FALLBACKS
        surl:
          Constants.expoConfig?.extra?.payuSuccessUrl ||
          `${Constants.expoConfig?.extra?.yourApiBaseUrl || process.env.API_BASE_URL}/payu/success-forward`,
        furl:
          Constants.expoConfig?.extra?.payuFailureUrl ||
          `${Constants.expoConfig?.extra?.yourApiBaseUrl || process.env.API_BASE_URL}/payu/failure-forward`,
        udf1: userPhone,
        udf2: "",
        udf3: "",
        udf4: "",
        udf5: "",
      };

      //   USE .replace() NOT .navigate() (prevents back button issues)
      navigation.replace("PayUWebView", {
        paymentParams,
        payuUrl:
          Constants.expoConfig?.extra?.payuActionUrl,
        orderId: transactionId,
        transactionId: transactionId,              //   ADD THIS
        amount: amountToCharge,
        payableAmount: amountToCharge,             //   ADD THIS
        bookingId: bookingData?.id,
        isConsultation: true,
        consultantName: consultant?.name,
        consultantId: consultant?.id,              //   ADD THIS
        selectedDate,
        selectedSlot: getSlot(selectedSlot),
        //   ADD RETURN PARAMS FOR PROPER BACK NAVIGATION
        checkoutReturnParams: {
          isConsultation: true,
          bookingId: bookingData?.id,
          consultantId: consultant?.id,
        },
      });

      console.log("  STEP 3 COMPLETE: User redirected to PayU WebView");
      console.log("");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🎯 CONSULTATION PAYMENT FLOW SUMMARY:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("  Step 1: Booking created with transactionId:", transactionId);
      console.log("  Step 2: PayU hash generated with auth token");
      console.log("  Step 3: User redirected to PayU WebView");
      console.log("    Step 4: User completes payment on PayU");
      console.log("    Step 5: PayU sends webhook to backend");
      console.log("    Step 6: Backend updates booking status");
      console.log("    Step 7: User navigated to success/failure screen");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    } catch (error) {
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("     CONSULTATION PAYMENT ERROR");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("Error:", error);
      console.error("Error message:", error.message);
      console.error("Response:", error.response?.data);

      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Payment could not start. Please try again.";

      Alert.alert("Payment Error", errorMessage);
    }
  };

  const resetBookingFlow = () => {
    setActiveStep("select");
    setSelectedSlot("");
    setBookingReference("");
  };

  const handleCallConsultant = () => {
    if (consultant?.phone) {
      Linking.openURL(`tel:${consultant.phone}`);
    } else {
      Alert.alert("Info", "Phone number not available");
    }
  };

  // Get slots for selected day
  const getSlotsForSelectedDay = () => {
    if (!selectedDate || !consultant?.availability) return [];

    const allSlots = consultant.availability || [];

    const availableSlots = allSlots
      .filter((slot) => !isSlotPassed(slot.timeSlot, selectedDate))
      .sort((a, b) => {
        const timeToMinutes = (timeStr) => {
          let time = timeStr.trim();
          let hours, minutes;

          if (time.includes("AM") || time.includes("PM")) {
            const [timePart, period] = time.split(" ");
            [hours, minutes] = timePart.split(":").map(Number);
            if (period === "PM" && hours !== 12) hours += 12;
            if (period === "AM" && hours === 12) hours = 0;
          } else {
            [hours, minutes] = time.split(":").map(Number);
          }

          return hours * 60 + minutes;
        };

        return timeToMinutes(a.timeSlot) - timeToMinutes(b.timeSlot);
      });

    return availableSlots;
  };

  const slotsForDay = getSlotsForSelectedDay();
  const selectedDay = upcomingDays.find((day) => day.value === selectedDate);

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) {
        stars.push(<Ionicons key={i} name="star" size={14} color="#fbbf24" />);
      } else if (rating >= i - 0.5) {
        stars.push(
          <Ionicons key={i} name="star-half" size={14} color="#fbbf24" />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={14} color="#fbbf24" />
        );
      }
    }
    return stars;
  };

  if (isLoading) {
    return <ConsultantSkeleton />;
  }

  if (!consultant) {
    return (
      <View style={tw`flex-1 bg-gray-50 justify-center items-center px-8`}>
        <View style={tw`items-center space-y-6`}>
          <View
            style={tw`h-16 w-16 rounded-full bg-red-50 justify-center items-center`}
          >
            <Text style={tw`text-red-500 text-2xl font-bold`}>?</Text>
          </View>
          <Text style={tw`text-3xl font-bold text-gray-900 text-center`}>
            Consultant Not Found
          </Text>
          <Text style={tw`text-gray-600 text-center`}>
            Check the link or browse all specialists from the consultation hub.
          </Text>
          <TouchableOpacity
            style={tw`flex-row items-center gap-2 rounded-full bg-[#6A8B78] px-6 py-3`}
            onPress={() => navigation.navigate("Consultations")}
          >
            <Ionicons name="arrow-back" size={16} color="white" />
            <Text style={tw`text-white text-sm font-semibold`}>
              Back to consultations
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        {/* Profile Image Banner */}
        <View style={tw`bg-white`}>
          <View style={tw`w-full h-72 bg-gray-200 overflow-hidden relative`}>
            {consultant.profileImage ? (
              <Image
                source={{ uri: consultant.profileImage }}
                style={tw`w-full h-full`}
                resizeMode="cover"
              />
            ) : (
              <View
                style={tw`w-full h-full justify-center items-center bg-gray-300`}
              >
                <Ionicons name="person-outline" size={32} color="#666" />
              </View>
            )}

            <TouchableOpacity
              style={tw`absolute top-4 left-4 bg-white/80 rounded-full p-2`}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#111" />
            </TouchableOpacity>
          </View>

          {/* Consultant Header Info */}
          <View style={tw`px-4 pt-3 pb-2`}>
            <View style={tw`flex-row justify-between items-start mb-3`}>
              <View style={tw`flex-1`}>
                <Text style={[fontStyles.headingS, tw`text-base text-gray-900 mb-0.5`]}>
                  {consultant.name}
                </Text>
                <Text style={[fontStyles.headingS, tw`text-xs text-gray-600 mb-2`]}>
                  {consultant.specialization}
                </Text>

                <View style={tw`flex-row items-center`}>
                  <View style={tw`flex-row items-center mr-3`}>
                    <View style={tw`flex-row`}>
                      {renderStars(averageRating)}
                    </View>
                    <Text style={[fontStyles.headingS, tw`text-xs text-gray-700 ml-1`]}>
                      {averageRating.toFixed(1)}
                    </Text>
                  </View>
                  <View style={tw`flex-row items-center`}>
                    <Ionicons name="time-outline" size={14} color="#6A8B78" />
                    <Text style={tw`text-gray-700 font-medium ml-1 text-xs`}>
                      Instant Consultation
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={tw`bg-[#6A8B78] rounded-full p-3`}
                onPress={handleCallConsultant}
              >
                <Ionicons name="call-outline" size={16} color="white" />
              </TouchableOpacity>
            </View>

            {consultant.consultantTypes?.length > 0 && (
              <View style={tw`mb-1`}>
                <View style={tw`flex-row flex-wrap gap-2`}>
                  {consultant.consultantTypes.map((type, index) => (
                    <View
                      key={index}
                      style={tw`bg-blue-50 rounded-full px-2 py-0.5 border border-blue-200`}
                    >
                      <Text style={tw`text-blue-700 text-[10px] font-medium`}>
                        {type.role?.charAt(0).toUpperCase() +
                          type.role?.slice(1).toLowerCase()}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Key Information Cards */}
          <View style={tw`px-4 pb-2`}>
            <View style={tw`flex-row justify-between mb-3`}>
              <View
                style={tw`flex-1 bg-gray-50 rounded-2xl p-3 mr-2 border border-gray-200`}
              >
                <View style={tw`flex-row items-center mb-2`}>
                  <Ionicons name="language-outline" size={16} color="#6A8B78" />
                  <Text style={tw`text-gray-700 font-semibold ml-1.5 text-xs`}>
                    Languages
                  </Text>
                </View>
                <Text style={tw`text-gray-600 text-[10px] leading-3`}>
                  {consultant.languages
                    ?.map((lang) => lang.language || lang)
                    .join(", ") || "Bengali, English, Hindi, Punjabi, Tamil"}
                </Text>
              </View>

              <View
                style={tw`flex-1 bg-gray-50 rounded-2xl p-2.5 ml-2 border border-gray-200`}
              >
                <View style={tw`flex-row items-center mb-1.5`}>
                  <Ionicons name="location-outline" size={16} color="#6A8B78" />
                  <Text style={tw`text-gray-700 font-semibold ml-1.5 text-xs`}>
                    Location
                  </Text>
                </View>
                <Text style={tw`text-gray-600 text-[10px] leading-3`}>
                  {consultant.city || "Animatabad"}
                </Text>
              </View>
            </View>

            <View style={tw`bg-gray-50 rounded-2xl p-2.5 border border-gray-200`}>
              <View style={tw`flex-row items-center mb-1.5`}>
                <Ionicons name="mail-outline" size={16} color="#6A8B78" />
                <Text style={tw`text-gray-700 font-semibold ml-1.5 text-xs`}>
                  Contact
                </Text>
              </View>
              <Text style={tw`text-gray-600 text-xs mb-1`}>
                {consultant.email || "email@example.com"}
              </Text>
              <Text style={tw`text-gray-600 text-xs`}>
                {consultant.phone || "+91 9752924544"}
              </Text>
            </View>
          </View>

          {/* Availability Status */}
          <View style={tw`px-4 pb-3`}>
            <View
              style={tw`flex-row items-center justify-between bg-${consultant.isActive ? "green" : "red"
                }-50 rounded-2xl p-3 border border-${consultant.isActive ? "green" : "red"
                }-200`}
            >
              <View style={tw`flex-row items-center`}>
                <View
                  style={tw`h-3 w-3 rounded-full mr-3 ${consultant.isActive ? "bg-green-500" : "bg-red-500"
                    }`}
                />
                <View>
                  <Text
                    style={tw`text-sm font-semibold ${consultant.isActive ? "text-green-800" : "text-red-800"
                      }`}
                  >
                    {consultant.isActive
                      ? "Available for consultation"
                      : "Currently Offline"}
                  </Text>
                  <Text
                    style={tw`text-xs ${consultant.isActive ? "text-green-600" : "text-red-600"
                      }`}
                  >
                    {consultant.isActive
                      ? "Ready to help you now"
                      : "Will be back soon"}
                  </Text>
                </View>
              </View>
              <Ionicons
                name={consultant.isActive ? "checkmark-circle" : "time-outline"}
                size={20}
                color={consultant.isActive ? "#10b981" : "#ef4444"}
              />
            </View>
          </View>

          {/* About Section - COLLAPSIBLE */}
          <View style={tw`px-4 pb-3`}>
            <View style={tw`border border-gray-200 rounded-lg overflow-hidden`}>
              <TouchableOpacity
                style={tw`flex-row justify-between items-center p-2.5 bg-gray-50`}
                onPress={() => setShowAboutMe(!showAboutMe)}
              >
                <Text style={[fontStyles.headingS, tw`text-sm text-gray-900`]}>
                  About Me
                </Text>
                <Ionicons
                  name={showAboutMe ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#6A8B78"
                />
              </TouchableOpacity>

              {showAboutMe && (
                <View style={tw`p-2.5 bg-white border-t border-gray-200`}>
                  <Text style={tw`text-gray-600 leading-5 text-xs mb-3`}>
                    {consultant.bio ||
                      "when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting: remaining essentially unchanged."}
                  </Text>
                  {consultant.approach && (
                    <View
                      style={tw`bg-gray-50 rounded-lg p-2.5 border-l-4 border-[#6A8B78]`}
                    >
                      <Text style={tw`text-gray-600 italic text-[10px] leading-4`}>
                        "{consultant.approach}"
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Focus Areas */}
          {consultant.focusAreas?.length > 0 && (
            <View style={tw`px-4 pb-3`}>
              <Text style={[fontStyles.headingS, tw`text-sm text-gray-900 mb-3`]}>
                Focus areas
              </Text>
              <View style={tw`flex-row flex-wrap gap-2`}>
                {consultant.focusAreas.map((area, index) => (
                  <View
                    key={area.id || index}
                    style={tw`flex-row items-center gap-1.5 rounded-full bg-green-50 px-2 py-1.5`}
                  >
                    <Ionicons
                      name="sparkles-outline"
                      size={10}
                      color="#059669"
                    />
                    <Text style={tw`text-green-700 text-[10px] font-medium`}>
                      {area.label || area}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Highlights */}
          {consultant.highlights?.length > 0 && (
            <View style={tw`px-4 pb-3`}>
              <Text style={[fontStyles.headingS, tw`text-sm text-gray-900 mb-3`]}>
                Highlights
              </Text>
              <View style={tw`space-y-2`}>
                {consultant.highlights.map((highlight, index) => (
                  <View key={index} style={tw`flex-row items-start gap-1.5`}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#6A8B78"
                    />
                    <Text style={tw`text-gray-600 text-[10px] flex-1`}>
                      {highlight}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Booking Section */}
        <View style={tw`px-4 py-2`}>
          <View style={tw`border border-gray-200 rounded-lg overflow-hidden mb-2`}>
            <TouchableOpacity
              style={tw`flex-row justify-between items-center p-2.5 bg-gray-50`}
              onPress={() => setShowBooking(!showBooking)}
            >
              <View style={tw`flex-row items-center`}>
                <View style={tw`w-1.5 h-4 bg-[#6A8B78] rounded-full mr-2`} />
                <Text style={[fontStyles.headingS, tw`text-sm text-gray-900`]}>
                  Book Consultation
                </Text>
              </View>
              <Ionicons
                name={showBooking ? "chevron-up" : "chevron-down"}
                size={16}
                color="#6A8B78"
              />
            </TouchableOpacity>

            {showBooking && (
              <View style={tw`p-2.5 bg-white border-t border-gray-200`}>
                <Text style={tw`text-xs text-gray-600 mb-3`}>
                  Choose duration & time for your session
                </Text>

                {/* Duration Selection */}
                <View style={tw`mb-3`}>
                  <View style={tw`flex-row items-center mb-2`}>
                    <View
                      style={tw`w-4 h-4 bg-[#6A8B78] rounded-full items-center justify-center mr-1.5`}
                    >
                      <Ionicons name="time" size={10} color="white" />
                    </View>
                    <Text style={[fontStyles.headingS, tw`text-xs text-gray-800`]}>
                      Session Duration
                    </Text>
                  </View>
                  <View style={tw`space-y-1.5`}>
                    {consultant.durations?.map((duration) => (
                      <TouchableOpacity
                        key={duration.id}
                        style={tw`w-full rounded-lg border p-2.5 ${selectedDurationId === duration.id
                          ? "border-[#6A8B78] bg-[#6A8B78]/5"
                          : "border-gray-200 bg-white"
                          }`}
                        onPress={() => setSelectedDurationId(duration.id)}
                      >
                        <View style={tw`flex-row justify-between items-start`}>
                          <View style={tw`flex-row items-start flex-1`}>
                            <Ionicons
                              name={
                                selectedDurationId === duration.id
                                  ? "radio-button-on"
                                  : "radio-button-off"
                              }
                              size={16}
                              color={
                                selectedDurationId === duration.id
                                  ? "#6A8B78"
                                  : "#9CA3AF"
                              }
                              style={tw`mt-0.5`}
                            />
                            <View style={tw`ml-2.5 flex-1`}>
                              <Text style={tw`font-semibold text-gray-900 text-xs`}>
                                {duration.label}
                              </Text>
                              <Text style={tw`text-[10px] text-gray-500 mt-0.5`}>
                                Personalized recommendations included
                              </Text>
                            </View>
                          </View>
                          <Text style={tw`text-sm font-bold text-[#6A8B78] ml-2`}>
                            {formatCurrency(duration.price)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Date Selection */}
                <View style={tw`mb-3`}>
                  <View style={tw`flex-row items-center mb-2`}>
                    <View
                      style={tw`w-4 h-4 bg-[#6A8B78] rounded-full items-center justify-center mr-1.5`}
                    >
                      <Ionicons name="calendar-outline" size={10} color="white" />
                    </View>
                    <Text style={[fontStyles.headingS, tw`text-xs text-gray-800`]}>
                      Select Date
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={tw`pb-1`}
                  >
                    <View style={tw`flex-row gap-1.5`}>
                      {upcomingDays.map((day) => (
                        <TouchableOpacity
                          key={day.value}
                          style={tw`rounded-lg border min-w-[50px] items-center py-1.5 px-2.5 ${selectedDate === day.value
                            ? "border-[#6A8B78] bg-[#6A8B78]"
                            : "border-gray-200 bg-white"
                            }`}
                          onPress={() => setSelectedDate(day.value)}
                        >
                          <Text
                            style={tw`text-[10px] font-medium ${selectedDate === day.value
                              ? "text-white"
                              : "text-gray-500"
                              }`}
                          >
                            {day.label.split(" ")[0]}
                          </Text>
                          <Text
                            style={tw`text-xs font-bold mt-0.5 ${selectedDate === day.value
                              ? "text-white"
                              : "text-gray-900"
                              }`}
                          >
                            {day.label.split(" ")[1]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Time Slots Selection */}
                <View style={tw`mb-3`}>
                  <View style={tw`flex-row items-center mb-2`}>
                    <View
                      style={tw`w-4 h-4 bg-[#6A8B78] rounded-full items-center justify-center mr-1.5`}
                    >
                      <Ionicons name="alarm-outline" size={10} color="white" />
                    </View>
                    <Text style={[fontStyles.headingS, tw`text-xs text-gray-800`]}>
                      Available Slots
                    </Text>
                  </View>
                  {!selectedDate ? (
                    <View style={tw`bg-gray-50 rounded-lg p-3 items-center`}>
                      <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
                      <Text style={tw`text-gray-500 text-xs mt-1.5 text-center`}>
                        Select a date to see available slots
                      </Text>
                    </View>
                  ) : slotsForDay.length === 0 ? (
                    <View style={tw`bg-yellow-50 rounded-lg p-3 items-center border border-yellow-200`}>
                      <Ionicons name="time-outline" size={20} color="#F59E0B" />
                      <Text style={tw`text-yellow-700 text-xs mt-1.5 text-center font-medium`}>
                        No slots available
                      </Text>
                      <Text style={tw`text-yellow-600 text-[10px] mt-0.5 text-center`}>
                        Try another date
                      </Text>
                    </View>
                  ) : (
                    <View style={tw`flex-row flex-wrap gap-1.5`}>
                      {slotsForDay.map((slot) => (
                        <TouchableOpacity
                          key={slot.id}
                          style={tw`rounded-lg border px-2.5 py-1.5 flex-1 min-w-[70px] ${selectedSlot === slot.id
                            ? "bg-[#6A8B78] border-[#6A8B78]"
                            : "border-gray-200 bg-white"
                            }`}
                          onPress={() => setSelectedSlot(slot.id)}
                        >
                          <Text
                            style={tw`text-xs font-semibold text-center ${selectedSlot === slot.id
                              ? "text-white"
                              : "text-gray-700"
                              }`}
                          >
                            {slot.timeSlot}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Error Message */}
                {formError ? (
                  <View style={tw`rounded-xl border border-red-200 bg-red-50 p-3 mb-4 flex-row items-center`}>
                    <Ionicons name="warning" size={18} color="#EF4444" />
                    <Text style={tw`text-red-600 text-sm ml-2 flex-1`}>
                      {formError}
                    </Text>
                  </View>
                ) : null}

                {/* Continue Button */}
                {activeStep === "select" && (
                  <TouchableOpacity
                    style={tw`w-full flex-row items-center justify-center gap-2 rounded-xl bg-[#6A8B78] px-5 py-3 shadow-lg ${!selectedDuration || !selectedDate || !selectedSlot
                      ? "opacity-50"
                      : ""
                      }`}
                    onPress={handleProceedToPayment}
                    disabled={!selectedDuration || !selectedDate || !selectedSlot}
                  >
                    <Ionicons name="lock-closed" size={18} color="white" />
                    <Text style={[fontStyles.headingS, tw`text-white text-sm`]}>
                      Continue to Payment
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Payment Summary Card */}
          {activeStep === "payment" && (
            <View style={tw`mb-2`}>
              <View style={tw`border border-gray-200 rounded-lg overflow-hidden`}>
                <View style={tw`flex-row items-center p-2.5 bg-gray-50 border-b border-gray-200`}>
                  <View style={tw`w-1.5 h-4 bg-[#6A8B78] rounded-full mr-2`} />
                  <Text style={[fontStyles.headingS, tw`text-sm text-gray-900`]}>
                    Payment Summary
                  </Text>
                </View>

                <View style={tw`p-2.5 bg-white`}>
                  <View style={tw`space-y-2`}>
                    <View style={tw`flex-row justify-between items-center`}>
                      <Text style={tw`text-xs text-gray-600`}>Duration</Text>
                      <Text style={tw`text-xs text-gray-900 font-semibold`}>
                        {selectedDuration?.label}
                      </Text>
                    </View>

                    <View style={tw`flex-row justify-between items-center`}>
                      <Text style={tw`text-xs text-gray-600`}>Date & Time</Text>
                      <View style={tw`items-end`}>
                        <Text style={tw`text-xs text-gray-900 font-semibold`}>
                          {getSlot(selectedSlot)}
                        </Text>
                        <Text style={tw`text-gray-500 text-[10px]`}>
                          {selectedDay?.label ?? selectedDate}
                        </Text>
                      </View>
                    </View>

                    <View style={tw`border-t border-gray-200 pt-2 mt-1`}>
                      <View style={tw`flex-row justify-between items-center`}>
                        <Text style={tw`text-xs text-gray-900 font-bold`}>
                          Total Amount
                        </Text>
                        <Text style={tw`text-sm font-bold text-[#6A8B78]`}>
                          {formatCurrency(selectedDuration?.price)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={tw`flex-row gap-2 mt-3`}>
                    <TouchableOpacity
                      style={tw`flex-row items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 bg-white ${isSubmitting ? "opacity-50" : ""
                        }`}
                      onPress={resetBookingFlow}
                      disabled={isSubmitting}
                    >
                      <Ionicons name="arrow-back" size={14} color="#6B7280" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={tw`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-[#6A8B78] px-3 py-2 ${isSubmitting ? "opacity-50" : ""
                        }`}
                      onPress={handleConfirmBooking}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Ionicons name="card" size={14} color="white" />
                      )}
                      <Text style={tw`text-white text-xs font-semibold`}>
                        {isSubmitting ? "Processing..." : "Pay Now"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Success Card */}
          {activeStep === "confirmed" && (
            <View style={tw`bg-white rounded-3xl p-3 shadow-lg border border-gray-100 mb-2`}>
              <View style={tw`items-center text-center mb-4`}>
                <View style={tw`w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-3`}>
                  <Ionicons name="checkmark" size={32} color="#10B981" />
                </View>
                <Text style={[fontStyles.headingS, tw`text-base text-gray-900 mb-1`]}>
                  Booking Confirmed!
                </Text>
                <Text style={tw`text-green-600 text-sm mb-2`}>
                  Your consultation is scheduled
                </Text>
                <Text style={tw`text-gray-600 text-sm text-center leading-5`}>
                  Session with {consultant.name} on{" "}
                  <Text style={tw`font-semibold`}>{selectedDate}</Text> at{" "}
                  <Text style={tw`font-semibold`}>{getSlot(selectedSlot)}</Text>
                </Text>
                {bookingReference && bookingReference !== "NA" && (
                  <View style={tw`bg-gray-50 rounded-lg px-3 py-1 mt-2`}>
                    <Text style={tw`text-gray-700 text-xs font-mono`}>
                      Ref: {bookingReference}
                    </Text>
                  </View>
                )}
              </View>

              <View style={tw`space-y-2`}>
                <TouchableOpacity
                  style={tw`w-full flex-row items-center justify-center gap-2 rounded-xl bg-[#6A8B78] px-4 py-3`}
                  onPress={() => navigation.navigate("Account", { tab: "appointments" })}
                >
                  <Ionicons name="calendar" size={18} color="white" />
                  <Text style={[fontStyles.headingS, tw`text-white text-sm`]}>
                    View Appointments
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={tw`w-full flex-row items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3`}
                  onPress={resetBookingFlow}
                >
                  <Ionicons name="add" size={18} color="#6A8B78" />
                  <Text style={[fontStyles.headingS, tw`text-gray-700 text-sm`]}>
                    Book Another
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Customer Feedbacks Section */}
          <View style={tw`mb-2`}>
            <CustomerFeedbacks
              reviews={reviews}
              averageRating={averageRating}
              reviewRating={reviewRating}
              setReviewRating={setReviewRating}
              reviewComment={reviewComment}
              setReviewComment={setReviewComment}
              reviewLoading={reviewLoading}
              handleSubmitReview={handleSubmitReview}
              showFeedback={showFeedback}
              setShowFeedback={setShowFeedback}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ConsultProfile;
