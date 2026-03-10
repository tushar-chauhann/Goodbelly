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
  StatusBar,
} from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";
import { authService } from "../../services/authService.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomPopup from "../../components/CustomPopup/CustomPopup";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import ModeSwitchTransition from "../../components/ModeSwitchTransition";

const Login = () => {
  const [inputValue, setInputValue] = useState("");
  const [password, setPassword] = useState("");
  const [inputType, setInputType] = useState("");
  const [loading, setLoading] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [popupConfig, setPopupConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info",
    showCancelButton: false,
  });
  const [showTransition, setShowTransition] = useState(false);
  const [toggleActive, setToggleActive] = useState(false);
  const toggleSlide = React.useRef(new Animated.Value(0)).current;
  const toggleBounce = React.useRef(new Animated.Value(1)).current;
  const toggleGlow = React.useRef(new Animated.Value(0)).current;
  const toggleRef = React.useRef(null);
  const [buttonRect, setButtonRect] = useState(null);
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

  const clearInput = () => {
    setInputValue("");
    setPassword("");
    setInputType("");
  };

  const handleInputChange = (text) => {
    // Ensure text is always a string
    const safeText = text != null ? String(text) : "";

    if (!safeText || safeText === "") {
      setInputValue("");
      setInputType("");
      return;
    }

    if (safeText.includes("@") || /[a-zA-Z]/.test(safeText)) {
      setInputType("email");
      setInputValue(safeText);
    } else {
      setInputType("phone");
      const numericValue = safeText.replace(/[^0-9]/g, "");
      setInputValue(numericValue);
    }
  };

  const handleLogin = async () => {
    if (!inputValue.trim()) {
      setPopupConfig({
        visible: true,
        title: "Error",
        message: "Please enter your email or phone number",
        type: "error",
        showCancelButton: false,
      });
      return;
    }

    if (!password.trim()) {
      setPopupConfig({
        visible: true,
        title: "Error",
        message: "Please enter your password",
        type: "error",
        showCancelButton: false,
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10}$/;

    if (inputType === "email") {
      if (!emailRegex.test(inputValue)) {
        setPopupConfig({
          visible: true,
          title: "Invalid Email",
          message: "Please enter a valid email address",
          type: "error",
          showCancelButton: false,
        });
        return;
      }
    } else if (inputType === "phone") {
      if (!phoneRegex.test(inputValue)) {
        setPopupConfig({
          visible: true,
          title: "Invalid Phone",
          message: "Please enter a valid 10-digit phone number",
          type: "error",
          showCancelButton: false,
        });
        return;
      }
    } else {
      setPopupConfig({
        visible: true,
        title: "Error",
        message: "Please enter a valid email or phone number",
        type: "error",
        showCancelButton: false,
      });
      return;
    }

    setLoading(true);

    try {
      const credentials = {
        password: password.trim(),
      };

      if (inputType === "email") {
        credentials.email = inputValue.trim();
      } else {
        credentials.phone = inputValue.trim();
      }

      console.log("=== LOGIN ATTEMPT ===");

      const response = await authService.login(credentials);

      console.log("=== LOGIN SUCCESS ===");
      console.log("📥 Response structure:", {
        hasExtractedToken: !!response.extractedToken,
        hasData: !!response.data,
        hasUser: !!response.data?.user
      });

      let accessToken = response.extractedToken;
      let user = response.data?.user || null;

      console.log("Token extracted:", accessToken ? "YES  " : "NO     ");
      console.log("User extracted:", user ? "YES  " : "NO     ");

      if (user) {
        console.log("User details:", {
          name: user.name,
          email: user.email,
          phone: user.phone
        });
      }

      if (!accessToken) {
        console.error("     Failed to extract token from response");
        console.error("Response keys:", Object.keys(response));
        throw new Error(
          "Authentication token not found. Please try again or contact support."
        );
      }

      // Token is already stored by authService.login(), just verify it
      const storedToken = await AsyncStorage.getItem("accessToken");
      if (storedToken) {
        console.log("  Token verified in AsyncStorage");
      } else {
        console.warn("    Token not found in AsyncStorage, storing now...");
        await AsyncStorage.setItem("accessToken", accessToken);
      }

      if (user && typeof user === "object") {
        await AsyncStorage.setItem("user", JSON.stringify(user));
        console.log("  User data stored successfully");
      }

      console.log("🎉 Login complete - Showing success popup");

      // Show success popup first
      setPopupConfig({
        visible: true,
        title: "Welcome Back!",
        message: `Login successful${user?.name ? ", " + user.name : ""}!`,
        type: "success",
        showCancelButton: false,
        onConfirm: () => {
          // Navigate to HomeScreen after user closes the popup
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "HomeScreen" }],
            })
          );
        },
      });
    } catch (error) {
      console.error("=== LOGIN ERROR ===");
      console.error("Error:", error);
      console.error("Status:", error.response?.status);
      console.error("Message:", error.response?.data?.message || error.message);

      let errorMessage = "Login failed. Please try again.";
      let errorTitle = "Login Failed";

      if (error.response?.status === 401) {
        errorTitle = "Invalid Credentials";
        errorMessage = "The email/phone or password is incorrect.";
      } else if (error.response?.status === 404) {
        errorTitle = "Account Not Found";
        errorMessage = "No account found. Please sign up first.";
      } else if (error.response?.status === 500) {
        errorTitle = "Server Error";
        errorMessage = "Server is temporarily unavailable.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setPopupConfig({
        visible: true,
        title: errorTitle,
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
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />
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
                {/* Email/Phone Input */}
                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-xs text-gray-800 mb-1 font-normal`,
                  ]}
                >
                  Email / Phone
                </Text>

                <View
                  style={tw`flex-row items-center h-11 border border-gray-300 rounded-lg bg-white px-3 mb-3`}
                >
                  {inputType === "phone" && inputValue.length > 0 && (
                    <Text
                      style={[fontStyles.body, tw`text-black font-medium mr-2`]}
                    >
                      +91
                    </Text>
                  )}
                  <TextInput
                    style={[
                      fontStyles.body,
                      tw`flex-1 text-black py-0`,
                      inputType === "phone" &&
                      inputValue.length > 0 &&
                      tw`pl-0`,
                    ]}
                    placeholder="Enter email or phone"
                    placeholderTextColor="#CCCCCC"
                    value={inputValue}
                    onChangeText={handleInputChange}
                    keyboardType={
                      inputType === "phone" ? "phone-pad" : "email-address"
                    }
                    maxLength={inputType === "phone" ? 10 : undefined}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    editable={!loading}
                  />
                  {inputValue.length > 0 && (
                    <TouchableOpacity
                      style={tw`w-5 h-5 rounded-full bg-black justify-center items-center ml-2`}
                      onPress={clearInput}
                      disabled={loading}
                    >
                      <Text style={tw`text-white text-[10px] font-bold`}>
                        ✕
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Password Input */}
                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-xs text-black mb-1 font-normal`,
                  ]}
                >
                  Password
                </Text>
                <View
                  style={tw`flex-row items-center h-11 border border-gray-300 rounded-lg bg-white px-3 mb-1`}
                >
                  <TextInput
                    style={[fontStyles.body, tw`flex-1 text-black py-0`]}
                    placeholder="Enter your password"
                    placeholderTextColor="#CCCCCC"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    editable={!loading}
                    textContentType="password"
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

                <TouchableOpacity
                  style={tw`items-end mb-3`}
                  onPress={() => navigation.navigate("ForgotPassword")}
                  disabled={loading}
                >
                  <Text
                    style={[fontStyles.headingS, tw`text-xs text-[#6B9080]`]}
                  >
                    Forgot Password?
                  </Text>
                </TouchableOpacity>

                {inputValue.length > 0 && (
                  <Text style={tw`text-xs text-[#6B9080] mb-2 ml-1 italic`}>
                    {inputType === "email"
                      ? "Enter a valid email address"
                      : "Enter 10-digit phone number"}
                  </Text>
                )}

                {/* Login Button */}
                <TouchableOpacity
                  style={[
                    tw`w-full h-11 bg-[#6B9080] rounded-lg justify-center items-center mb-3 shadow-sm`,
                    loading && tw`opacity-50`,
                  ]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <View style={tw`flex-row items-center`}>
                      <ActivityIndicator color="white" size="small" />
                      <Text style={[fontStyles.bodyBold, tw`text-white ml-2`]}>
                        Logging in...
                      </Text>
                    </View>
                  ) : (
                    <Text style={[fontStyles.bodyBold, tw`text-white`]}>
                      Login
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Links */}

                <TouchableOpacity
                  style={tw`items-center mb-4`}
                  onPress={() => navigation.navigate("Signup")}
                  disabled={loading}
                >
                  <Text style={[fontStyles.body, tw`text-gray-600`]}>
                    Don't have an account?{" "}
                    <Text
                      style={[fontStyles.headingS, tw`text-sm text-[#6B9080]`]}
                    >
                      Sign Up
                    </Text>
                  </Text>
                </TouchableOpacity>

                {/* Toggle - User / Consultant */}
                {/* <View style={tw`flex-row items-center justify-center mt-4 mb-2 gap-3`}>
                  <Text style={[fontStyles.bodyBold, tw`text-gray-600 text-sm`]}>
                    ARE YOU A CONSULTANT?
                  </Text>

                  <TouchableOpacity
                    ref={toggleRef}
                    onPress={() => {
                      // Haptic feedback
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                      toggleRef.current?.measureInWindow((x, y, width, height) => {
                        setButtonRect({ x, y, width, height });

                        // Bounce animation
                        Animated.sequence([
                          Animated.timing(toggleBounce, {
                            toValue: 0.9,
                            duration: 100,
                            easing: Easing.ease,
                            useNativeDriver: true,
                          }),
                          Animated.spring(toggleBounce, {
                            toValue: 1,
                            friction: 3,
                            tension: 100,
                            useNativeDriver: true,
                          }),
                        ]).start();

                        setShowTransition(true);
                      });
                    }}
                    activeOpacity={1}
                    disabled={loading}
                  >
                    <Animated.View
                      style={[
                        tw`w-20 h-10 rounded-full justify-center px-1`,
                        {
                          backgroundColor: '#6B9080',
                          shadowColor: '#6B9080',
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 0.3,
                          shadowRadius: 6,
                          elevation: 5,
                        },
                      ]}
                    >
                      <View style={tw`absolute w-full flex-row justify-between px-2.5`}>
                        <Ionicons name="person" size={14} color="rgba(255,255,255,0.9)" />
                        <Ionicons name="briefcase" size={14} color="rgba(255,255,255,0.4)" />
                      </View>
                      <Animated.View
                        style={[
                          tw`w-8 h-8 rounded-full bg-white justify-center items-center`,
                          {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 3,
                            elevation: 4,
                            transform: [{ scale: toggleBounce }],
                          },
                        ]}
                      >
                        <Ionicons name="person" size={16} color="#6B9080" />
                      </Animated.View>
                    </Animated.View>
                  </TouchableOpacity>

                </View> */}
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

      {/* Mode Switch Transition Animation */}
      <ModeSwitchTransition
        visible={showTransition}
        buttonRect={buttonRect}
        mode="consultant"
        onComplete={() => {
          setShowTransition(false);
          navigation.navigate("ConsultantLogin");
        }}
      />
    </SafeAreaView>
  );
};

export default Login;
