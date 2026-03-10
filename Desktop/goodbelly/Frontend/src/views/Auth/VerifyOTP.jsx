import React, { useState, useRef, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Animated,
  Easing,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";
import { authService } from "../../services/authService.js";
import CustomPopup from "../../components/CustomPopup/CustomPopup";

export default function VerifyOTP({ navigation, route }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [popupConfig, setPopupConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info",
    showCancelButton: false,
  });
  const inputs = useRef([]);
  const insets = useSafeAreaInsets();

  const { email = "", type = "forgot-password" } = route?.params || {};

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

  useEffect(() => {
    if (!email) {
      setPopupConfig({
        visible: true,
        title: "Error",
        message: "Email not provided",
        type: "error",
        showCancelButton: false,
        onConfirm: () => navigation.goBack(),
      });
      return;
    }

    setTimeout(() => {
      inputs.current[0]?.focus();
    }, 100);
  }, []);

  const handleOtpChange = (text, index) => {
    // Ensure text is a string and filter only numbers
    const numericText = String(text || "").replace(/[^0-9]/g, "");

    const newOtp = [...otp];
    newOtp[index] = numericText;
    setOtp(newOtp);

    if (numericText && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join("");

    if (otpCode.length !== 6) {
      setPopupConfig({
        visible: true,
        title: "Error",
        message: "Please enter complete 6-digit OTP",
        type: "error",
        showCancelButton: false,
      });
      return;
    }

    setLoading(true);

    try {
      console.log("=== OTP VERIFICATION ===");
      console.log("Email:", email);
      console.log("OTP:", otpCode);

      await authService.verifyOTP(email, otpCode);
      console.log("  OTP verified for forgot password");

      setPopupConfig({
        visible: true,
        title: "Success",
        message: "OTP verified successfully!",
        type: "success",
        showCancelButton: false,
        onConfirm: () =>
          navigation.navigate("ResetPassword", { email, otp: otpCode }),
      });
    } catch (error) {
      console.error("=== OTP VERIFICATION ERROR ===");
      console.error("Error:", error.response?.data || error.message);

      let errorMessage = "OTP verification failed.";

      if (error.response?.status === 400) {
        errorMessage =
          error.response?.data?.message ||
          "Invalid or expired OTP. Please try again.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setPopupConfig({
        visible: true,
        title: "Verification Failed",
        message: errorMessage,
        type: "error",
        showCancelButton: false,
      });
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setOtp(["", "", "", "", "", ""]);

    try {
      await authService.sendOTP(email);
      setPopupConfig({
        visible: true,
        title: "Success",
        message: "A new OTP has been sent to your email",
        type: "success",
        showCancelButton: false,
      });
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } catch (error) {
      setPopupConfig({
        visible: true,
        title: "Error",
        message: error.response?.data?.message || "Failed to resend OTP",
        type: "error",
        showCancelButton: false,
      });
    } finally {
      setResendLoading(false);
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={tw`flex-grow`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={tw`flex-1 justify-between px-6`}>
            <View style={tw`w-full items-center`}>
              {/* Animated Image - Smaller Version */}
              <View style={tw`items-center justify-center mb-4`}>
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
                    fontStyles.headingL,
                    tw`text-base text-gray-800 text-center mb-1`,
                  ]}
                >
                  Enter Verification Code
                </Text>
                <Text
                  style={[
                    fontStyles.body,
                    tw`text-xs text-gray-600 text-center mb-4`,
                  ]}
                >
                  We sent a 6-digit code to {email}
                </Text>

                {/* OTP Input Boxes */}
                <View style={tw`flex-row justify-between w-full mb-4`}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => (inputs.current[index] = ref)}
                      style={[
                        fontStyles.headingL,
                        tw`w-12 h-14 border-2 ${
                          digit ? "border-[#6B9080]" : "border-gray-300"
                        } rounded-lg text-center text-2xl text-black bg-white`,
                      ]}
                      value={digit}
                      onChangeText={(text) => handleOtpChange(text, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      placeholder="•"
                      placeholderTextColor="#CCCCCC"
                      editable={!loading}
                    />
                  ))}
                </View>

                {/* Verify Button */}
                <TouchableOpacity
                  style={[
                    tw`w-full h-11 bg-[#6B9080] rounded-lg justify-center items-center mb-3 shadow-sm`,
                    loading && tw`opacity-50`,
                  ]}
                  onPress={handleVerify}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <View style={tw`flex-row items-center`}>
                      <ActivityIndicator color="white" size="small" />
                      <Text style={[fontStyles.bodyBold, tw`text-white ml-2`]}>
                        Verifying...
                      </Text>
                    </View>
                  ) : (
                    <Text style={[fontStyles.bodyBold, tw`text-white`]}>
                      Verify OTP
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Resend OTP */}
                <View style={tw`flex-row items-center justify-center mb-4`}>
                  <Text style={[fontStyles.body, tw`text-gray-600 mr-1`]}>
                    Didn't receive code?
                  </Text>
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={resendLoading || loading}
                  >
                    {resendLoading ? (
                      <ActivityIndicator color="#6B9080" size="small" />
                    ) : (
                      <Text
                        style={[
                          fontStyles.headingS,
                          tw`text-sm text-[#6B9080]`,
                        ]}
                      >
                        Resend
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Footer Terms - Pushed to bottom */}
            <View style={tw`items-center pb-2`}>
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
}
