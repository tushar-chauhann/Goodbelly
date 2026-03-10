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

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
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

  const handleSendOTP = async () => {
    if (!email.trim()) {
      setPopupConfig({
        visible: true,
        title: "Error",
        message: "Please enter your email",
        type: "error",
        showCancelButton: false,
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setPopupConfig({
        visible: true,
        title: "Invalid Email",
        message: "Please enter a valid email address",
        type: "error",
        showCancelButton: false,
      });
      return;
    }

    setLoading(true);
    try {
      await authService.sendOTP(email);
      setPopupConfig({
        visible: true,
        title: "Success",
        message: "A 6-digit OTP has been sent to your email",
        type: "success",
        showCancelButton: false,
        onConfirm: () => {
          // Navigate to VerifyOTP screen
          navigation.navigate("VerifyOTP", {
            email: email,
            type: "forgot-password",
          });
        },
      });
    } catch (error) {
      console.error("Send OTP error:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to send OTP. Please try again.";
      setPopupConfig({
        visible: true,
        title: "Error",
        message: errorMessage,
        type: "error",
        showCancelButton: false,
      });
    } finally {
      setLoading(false);
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={tw`flex-1 justify-between px-6`}>
            <View style={tw`w-full items-center`}>
              <View style={tw`items-center justify-center`}>
                <View
                  style={[
                    isKeyboardVisible ? tw`w-58 h-58` : tw`w-89 h-89`,
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
                      { transform: [{ translateY: 45 }] },
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
                    tw`text-base text-gray-800 mb-1 text-center`,
                  ]}
                >
                  Forgot Password?
                </Text>
                <Text
                  style={[
                    fontStyles.body,
                    tw`text-xs text-gray-600 text-center mb-4`,
                  ]}
                >
                  Don't worry! Enter your email and we'll send you a code
                </Text>

                {/* Email Input */}
                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-xs text-gray-800 mb-1 font-normal`,
                  ]}
                >
                  Email Address
                </Text>

                <View
                  style={tw`flex-row items-center h-11 border border-gray-300 rounded-lg bg-white px-3 mb-3`}
                >
                  <TextInput
                    style={[fontStyles.body, tw`flex-1 text-black py-0`]}
                    placeholder="Enter your email"
                    placeholderTextColor="#CCCCCC"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSendOTP}
                    editable={!loading}
                  />
                </View>

                {/* Send OTP Button */}
                <TouchableOpacity
                  style={[
                    tw`w-full h-11 bg-[#6B9080] rounded-lg justify-center items-center mb-3 shadow-sm`,
                    loading && tw`opacity-50`,
                  ]}
                  onPress={handleSendOTP}
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
                      Send OTP
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Back to Login Link */}
                <TouchableOpacity
                  style={tw`items-center mb-4`}
                  onPress={() => navigation.navigate("Login")}
                  disabled={loading}
                >
                  <Text style={[fontStyles.body, tw`text-gray-600`]}>
                    Remember your password?{" "}
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
};

export default ForgotPassword;
