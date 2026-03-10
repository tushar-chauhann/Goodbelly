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

const ConsultantLogin = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
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
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const toggleRef = React.useRef(null);
    const [buttonRect, setButtonRect] = useState(null);

    // Toggle animation
    const toggleBounce = React.useRef(new Animated.Value(1)).current;
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
        setEmail("");
        setPassword("");
    };

    const handleToggleToUser = () => {
        // Trigger haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowTransition(true);
    };

    const handleConsultantLogin = async () => {
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
            const credentials = {
                email: email.trim(),
                password: password.trim(),
            };

            const response = await authService.consultantLogin(credentials);

            if (response) {
                await AsyncStorage.setItem("consultant", JSON.stringify(response));
            }

            // Show success popup
            setPopupConfig({
                visible: true,
                title: "Welcome Back!",
                message: `Login successful${response?.name ? ", " + response.name : ""}!`,
                type: "success",
                showCancelButton: false,
                onConfirm: () => {
                    // Navigate to Consultant Dashboard (ProfileTab) checks in ProfileScreen will show dashboard
                    navigation.dispatch(
                        CommonActions.reset({
                            index: 0,
                            routes: [
                                {
                                    name: "HomeScreen",
                                    params: { screen: "ProfileTab" },
                                },
                            ],
                        })
                    );
                },
            });
        } catch (error) {

            let errorMessage = "Login failed. Please try again.";
            let errorTitle = "Login Failed";

            if (error.response?.status === 401) {
                errorTitle = "Invalid Credentials";
                errorMessage = "The email or password is incorrect.";
            } else if (error.response?.status === 404) {
                errorTitle = "Account Not Found";
                errorMessage = "No consultant account found with this email.";
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
                                {/* Consultant Badge */}
                                <View style={tw`items-center mb-4`}>
                                    <View style={tw`bg-[#6B9080] px-4 py-1.5 rounded-full`}>
                                        <Text style={[fontStyles.bodyBold, tw`text-white text-xs`]}>
                                            Consultant Portal
                                        </Text>
                                    </View>
                                </View>

                                {/* Email Input */}
                                <Text
                                    style={[
                                        fontStyles.headingS,
                                        tw`text-xs text-gray-800 mb-1 font-normal`,
                                    ]}
                                >
                                    Email
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
                                        returnKeyType="next"
                                        editable={!loading}
                                    />
                                    {email.length > 0 && (
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
                                    style={tw`flex-row items-center h-11 border border-gray-300 rounded-lg bg-white px-3 mb-4`}
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
                                        onSubmitEditing={handleConsultantLogin}
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

                                {/* Login Button */}
                                <TouchableOpacity
                                    style={[
                                        tw`w-full h-11 bg-[#6B9080] rounded-lg justify-center items-center mb-3 shadow-sm`,
                                        loading && tw`opacity-50`,
                                    ]}
                                    onPress={handleConsultantLogin}
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
                                            Login as Consultant
                                        </Text>
                                    )}
                                </TouchableOpacity>

                                {/* Toggle - User / Consultant */}
                                <View style={tw`flex-row items-center justify-center mt-4 mb-2 gap-3 flex-row-reverse`}>
                                    <Text style={[fontStyles.bodyBold, tw`text-gray-600 text-sm`]}>
                                        SWITCH TO USER?
                                    </Text>

                                    <TouchableOpacity
                                        onPress={() => {
                                            // Haptic feedback
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                                            // Measure button position
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

                                                handleToggleToUser();
                                            });
                                        }}
                                        ref={toggleRef}
                                        activeOpacity={1}
                                        disabled={loading}
                                    >
                                        {/* Toggle Track */}
                                        <Animated.View
                                            style={[
                                                tw`w-20 h-10 rounded-full justify-center items-end px-1`,
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
                                            {/* Track Icons */}
                                            <View style={tw`absolute w-full flex-row justify-between px-2.5`}>
                                                <Ionicons name="person" size={14} color="rgba(255,255,255,0.4)" />
                                                <Ionicons name="briefcase" size={14} color="rgba(255,255,255,0.9)" />
                                            </View>
                                            {/* Animated Thumb */}
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
                                                <Ionicons name="briefcase" size={16} color="#6B9080" />
                                            </Animated.View>
                                        </Animated.View>
                                    </TouchableOpacity>

                                </View>
                            </View>
                        </View>

                        {/* Footer Terms */}
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
                mode="user"
                onComplete={() => {
                    setShowTransition(false);
                    navigation.navigate("Login");
                }}
            />
        </SafeAreaView>
    );
};

export default ConsultantLogin;
