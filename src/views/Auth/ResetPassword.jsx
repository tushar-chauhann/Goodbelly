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
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Animated,
  Easing,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";
import { authService } from "../../services/authService.js";
import CustomPopup from "../../components/CustomPopup/CustomPopup";

export default function ResetPassword({ navigation, route }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [popupConfig, setPopupConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info",
    showCancelButton: false,
  });
  const insets = useSafeAreaInsets();

  const { email, otp } = route.params || {};

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
  }, [wobbleAnim]);

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

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setPopupConfig({
        visible: true,
        title: "Error",
        message: "Please fill all fields",
        type: "error",
        showCancelButton: false,
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPopupConfig({
        visible: true,
        title: "Error",
        message: "Passwords do not match",
        type: "error",
        showCancelButton: false,
      });
      return;
    }

    if (newPassword.length < 6) {
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
      await authService.resetPassword(email, otp, newPassword);

      setPopupConfig({
        visible: true,
        title: "Success",
        message: "Password reset successfully! You can now login with your new password.",
        type: "success",
        showCancelButton: false,
        onConfirm: () => {
          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
        },
      });
    } catch (error) {
      console.error("=== RESET PASSWORD ERROR ===");
      console.error("Error:", error.response?.data || error.message);

      const errorMessage =
        error.response?.data?.message ||
        "Failed to reset password. Please try again.";

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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={tw`flex-1 justify-between px-6`}>
            <View style={tw`w-full items-center`}>
              {/* Logo at Top */}
              <View style={tw`items-center mt-4 mb-4`}>
                <View
                  style={tw`w-20 h-20 rounded-full bg-[#6B9080] justify-center items-center shadow-md`}
                >
                  <Image
                    source={require("../../assets/logo.png")}
                    style={tw`w-18 h-18`}
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
                  Create New Password
                </Text>
                <Text
                  style={[
                    fontStyles.body,
                    tw`text-xs text-gray-600 text-center mb-4`,
                  ]}
                >
                  Your new password must be different from previously used passwords
                </Text>

                {/* New Password */}
                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-xs text-gray-800 mb-1 font-normal`,
                  ]}
                >
                  New Password
                </Text>
                <TextInput
                  style={[
                    fontStyles.body,
                    tw`w-full h-11 border border-gray-300 rounded-lg bg-white px-3 text-black mb-3`,
                  ]}
                  placeholder="Enter new password (min 6 characters)"
                  placeholderTextColor="#CCCCCC"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  returnKeyType="next"
                  editable={!loading}
                />

                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-xs text-gray-800 mb-1 font-normal`,
                  ]}
                >
                  Confirm Password
                </Text>
                <TextInput
                  style={[
                    fontStyles.body,
                    tw`w-full h-11 border border-gray-300 rounded-lg bg-white px-3 text-black mb-2`,
                  ]}
                  placeholder="Confirm new password"
                  placeholderTextColor="#CCCCCC"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                  editable={!loading}
                />

                {/* Password strength indicator */}
                {newPassword.length > 0 && (
                  <View style={tw`mb-3`}>
                    <View
                      style={tw`h-1 rounded ${newPassword.length < 6
                          ? "bg-red-400"
                          : newPassword.length < 8
                            ? "bg-yellow-400"
                            : "bg-green-400"
                        }`}
                    />
                    <Text
                      style={[
                        fontStyles.body,
                        tw`text-[10px] mt-1 ${newPassword.length < 6
                            ? "text-red-500"
                            : newPassword.length < 8
                              ? "text-yellow-600"
                              : "text-green-600"
                          }`,
                      ]}
                    >
                      {newPassword.length < 6
                        ? "Weak - Add more characters"
                        : newPassword.length < 8
                          ? "Medium"
                          : "Strong password"}
                    </Text>
                  </View>
                )}

                {/* Reset Button */}
                <TouchableOpacity
                  style={[
                    tw`w-full h-11 bg-[#6B9080] rounded-lg justify-center items-center mb-3 shadow-sm`,
                    loading && tw`opacity-50`,
                  ]}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <View style={tw`flex-row items-center`}>
                      <ActivityIndicator color="white" size="small" />
                      <Text style={[fontStyles.bodyBold, tw`text-white ml-2`]}>
                        Resetting...
                      </Text>
                    </View>
                  ) : (
                    <Text style={[fontStyles.bodyBold, tw`text-white`]}>
                      Reset Password
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Animated Image at Bottom */}
              {!isKeyboardVisible && (
                <View style={tw`items-center justify-center mt-4`}>
                  <View
                    style={[
                      tw`w-60 h-60 items-center justify-center relative`,
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
                        { transform: [{ translateY: 20 }] },
                      ]}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              )}
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
