import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  Animated,
  Easing,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";
import { authService } from "../../services/authService.js";
import CustomPopup from "../../components/CustomPopup/CustomPopup";
import Ionicons from "react-native-vector-icons/Ionicons";

const SignUp = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [inputType, setInputType] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [popupConfig, setPopupConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info",
    showCancelButton: false,
  });
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const wobbleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(wobbleAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(wobbleAnim, {
          toValue: -1,
          duration: 3000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const spin = wobbleAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-3deg", "3deg"],
  });

  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const handleSignUp = async () => {
    if (
      !name.trim() ||
      !phone.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setPopupConfig({
        visible: true,
        title: "Error",
        message: "Please fill all fields",
        type: "error",
        showCancelButton: false,
      });
      return;
    }

    if (!termsAccepted) {
      setPopupConfig({
        visible: true,
        title: "Error",
        message: "Please accept terms and conditions",
        type: "error",
        showCancelButton: false,
      });
      return;
    }

    const phoneRegex = /^[0-9]{10}$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (inputType === "email") {
      if (!emailRegex.test(phone)) {
        setPopupConfig({
          visible: true,
          title: "Invalid Email",
          message: "Please enter a valid email address",
          type: "error",
          showCancelButton: false,
        });
        return;
      }
    } else {
      if (!phoneRegex.test(phone)) {
        setPopupConfig({
          visible: true,
          title: "Invalid Phone",
          message: "Please enter a valid 10-digit phone number",
          type: "error",
          showCancelButton: false,
        });
        return;
      }
    }

    if (password !== confirmPassword) {
      setPopupConfig({
        visible: true,
        title: "Error",
        message: "Passwords do not match",
        type: "error",
        showCancelButton: false,
      });
      return;
    }

    if (password.length < 6) {
      setPopupConfig({
        visible: true,
        title: "Error",
        message: "Password must be at least 6 characters",
        type: "error",
        showCancelButton: false,
      });
      return;
    }

    setLoading(true);

    try {
      const identifier = inputType === "email" ? phone : undefined;
      const phoneNumber = inputType === "phone" ? phone : undefined;

      console.log("Attempting to send signup OTP...");

      const response = await authService.sendSignupOTP(identifier, phoneNumber);

      console.log("OTP Response received:", response);

      const userData = {
        name: name.trim(),
        password,
        [inputType === "email" ? "email" : "phone"]: phone,
        role: "USER",
      };

      const contactDisplay = inputType === "email" ? phone : `+91 ${phone}`;

      navigation.navigate("Otp", {
        type: "signup",
        userData,
        contact: contactDisplay,
        identifier: identifier || phoneNumber,
      });

      setTimeout(() => {
        setPopupConfig({
          visible: true,
          title: "Success",
          message: `OTP sent successfully to ${contactDisplay}. Please check and enter the OTP.`,
          type: "success",
          showCancelButton: false,
        });
      }, 300);
    } catch (error) {
      console.error("Signup error details:", error);

      let errorMessage = "Signup failed. Please try again.";

      if (error.code === "TIMEOUT" || error.code === "ECONNABORTED") {
        errorMessage =
          "Connection timeout. Please check your internet connection and try again.";
      } else if (error.response?.status === 409) {
        errorMessage =
          "An account with this email or phone already exists. Please try logging in instead.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setPopupConfig({
        visible: true,
        title: "Signup Error",
        message: errorMessage,
        type: "error",
        showCancelButton: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (text) => {
    const safeText = String(text || "");

    if (!safeText || safeText === "") {
      setPhone("");
      setInputType("");
      return;
    }

    if (safeText.includes("@") || /[a-zA-Z]/.test(safeText)) {
      setInputType("email");
      setPhone(safeText);
    } else {
      setInputType("phone");
      const numericValue = safeText.replace(/[^0-9]/g, "");
      setPhone(numericValue);
    }
  };

  return (
    <SafeAreaView 
      style={[
        tw`flex-1 bg-white`,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }
      ]}
    >
      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={tw`flex-grow`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[tw`w-full px-6 py-4`, { minHeight: "100%" }]}>
            <View style={tw`w-full items-center`}>
              {/* Animated Image - Smaller Version */}
              <View style={tw`items-center justify-center mb-1`}>
                <View
                  style={[
                    isKeyboardVisible ? tw`w-40 h-40` : tw`w-50 h-50`,
                    tw`items-center justify-center relative`,
                  ]}
                >
                  <Animated.Image
                    source={require("../../assets/LoginFruits.png")}
                    style={[
                      tw`w-full h-full absolute`,
                      { transform: [{ rotate: spin }] },
                    ]}
                    resizeMode="contain"
                  />
                  <Image
                    source={require("../../assets/LoginMain.png")}
                    style={[
                      tw`w-[65%] h-[65%] absolute`,
                      { transform: [{ translateY: 25 }] },
                    ]}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Form Container */}
              <View style={tw`w-full`}>
                {/* Title */}
                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-black text-center mb-1`,
                  ]}
                >
                  Sign Up
                </Text>

                {/* Full Name Input */}
                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-xs text-gray-800 mb-1 font-normal`,
                  ]}
                >
                  Full Name
                </Text>
                <View
                  style={tw`flex-row items-center h-11 border border-gray-300 rounded-lg bg-white px-3 mb-2`}
                >
                  <TextInput
                    style={[fontStyles.body, tw`flex-1 text-black py-0`]}
                    placeholder="Enter Name"
                    placeholderTextColor="#CCCCCC"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>

                {/* Phone/Email Input */}
                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-xs text-gray-800 mb-1 font-normal`,
                  ]}
                >
                  Phone / Email
                </Text>
                <View
                  style={tw`flex-row items-center h-11 border border-gray-300 rounded-lg bg-white px-3 mb-2`}
                >
                  {inputType === "phone" && phone.length > 0 && (
                    <Text style={[fontStyles.body, tw`text-black font-medium mr-2`]}>
                      +91
                    </Text>
                  )}
                  <TextInput
                    style={[
                      fontStyles.body,
                      tw`flex-1 text-black py-0`,
                      inputType === "phone" && phone.length > 0 && tw`pl-0`,
                    ]}
                    placeholder="Enter email or phone"
                    placeholderTextColor="#CCCCCC"
                    value={phone}
                    onChangeText={handlePhoneChange}
                    keyboardType={
                      inputType === "phone" ? "phone-pad" : "email-address"
                    }
                    maxLength={inputType === "phone" ? 10 : undefined}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>

                {/* Password Input */}
                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-xs text-gray-800 mb-1 font-normal`,
                  ]}
                >
                  Password
                </Text>
                <View
                  style={tw`flex-row items-center h-11 border border-gray-300 rounded-lg bg-white px-3 mb-2`}
                >
                  <TextInput
                    style={[fontStyles.body, tw`flex-1 text-black py-0`]}
                    placeholder="••••••••••••"
                    placeholderTextColor="#CCCCCC"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  {password.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      style={tw`ml-2`}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Confirm Password Input */}
                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-xs text-gray-800 mb-1 font-normal`,
                  ]}
                >
                  Confirm Password
                </Text>
                <View
                  style={tw`flex-row items-center h-11 border border-gray-300 rounded-lg bg-white px-3 mb-2`}
                >
                  <TextInput
                    style={[fontStyles.body, tw`flex-1 text-black py-0`]}
                    placeholder="••••••••••••"
                    placeholderTextColor="#CCCCCC"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                  />
                  {confirmPassword.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                      style={tw`ml-2`}
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Terms Checkbox */}
                <TouchableOpacity
                  style={tw`flex-row items-center mt-1 mb-2 w-full`}
                  onPress={() => setTermsAccepted(!termsAccepted)}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <View
                    style={[
                      tw`w-5 h-5 rounded border-2 border-[#6B9080] bg-white justify-center items-center mr-2`,
                      termsAccepted && tw`bg-[#6B9080]`,
                    ]}
                  >
                    {termsAccepted && (
                      <Text style={tw`text-white text-xs font-bold`}>✓</Text>
                    )}
                  </View>
                  <Text style={[fontStyles.body, tw`text-gray-600 flex-1`]}>
                    I agree to Terms & Privacy Policy
                  </Text>
                </TouchableOpacity>

                {/* Continue Button */}
                <TouchableOpacity
                  style={[
                    tw`w-full h-11 bg-[#6B9080] rounded-lg justify-center items-center mb-2 shadow-sm`,
                    loading && tw`opacity-50`,
                  ]}
                  onPress={handleSignUp}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <View style={tw`flex-row items-center`}>
                      <ActivityIndicator color="white" size="small" />
                      <Text style={[fontStyles.bodyBold, tw`text-white ml-2`]}>
                        Sending OTP...
                      </Text>
                    </View>
                  ) : (
                    <Text style={[fontStyles.bodyBold, tw`text-white`]}>
                      Continue
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Login Link */}
                <TouchableOpacity
                  style={tw`items-center mb-4`}
                  onPress={() => navigation.navigate("Login")}
                  disabled={loading}
                >
                  <Text style={[fontStyles.body, tw`text-gray-600`]}>
                    Already have an account?{" "}
                    <Text
                      style={[fontStyles.headingS, tw`text-sm text-[#6B9080]`]}
                    >
                      Login
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer Terms - Pushed to bottom */}
            <View style={tw`items-center pb-2 mt-auto`}>
              <Text
                style={[
                  fontStyles.headingS,
                  tw`text-gray-400 text-center leading-4 text-[10px]`,
                ]}
              >
                By continuing, you agree to our{" "}
                <Text style={tw`text-[#6B9080]`}>terms of services</Text> &{" "}
                <Text style={tw`text-[#6B9080]`}>privacy policy</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Popup */}
      <CustomPopup
        visible={popupConfig.visible}
        onClose={() => setPopupConfig({ ...popupConfig, visible: false })}
        title={popupConfig.title}
        message={popupConfig.message}
        type={popupConfig.type}
        showCancelButton={popupConfig.showCancelButton}
        confirmText="OK"
        onConfirm={popupConfig.onConfirm}
      />
    </SafeAreaView>
  );
};

export default SignUp;
