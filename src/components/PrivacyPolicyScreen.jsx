import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons as Icon } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import tw from "twrnc";
import { fontStyles } from "../utils/fontStyles";
import DeleteAccountPopup from "./DeleteAccount/DeleteAccountPopup";
import { deleteAccount } from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions } from "@react-navigation/native";

const PrivacyPolicyScreen = () => {
    const navigation = useNavigation();
    const [isExpanded, setIsExpanded] = useState(false);
    const [showDeletePopup, setShowDeletePopup] = useState(false);
    const BACKGROUND_COLOR = "#FFFFFF";

    const handleDeleteAccount = async (reason) => {
        try {
            await deleteAccount(reason);
            setShowDeletePopup(false);

            // Clear local storage
            await AsyncStorage.multiRemove(["accessToken", "user"]);

            alert("Your account has been deleted successfully.");

            // Reset navigation to Login/Welcome screen
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: "Login" }],
                })
            );
        } catch (error) {
            console.error("Delete account error:", error);
            alert(error.response?.data?.message || "Failed to delete account. Please try again.");
            setShowDeletePopup(false);
        }
    };

    const getStatusBarStyle = (bgColor) => {
        const lightBackgrounds = ["#FFFFFF", "#F3F4F6", "#FAFAFA", "#F9FAFB", "white"];
        return lightBackgrounds.includes(bgColor) ? "dark-content" : "light-content";
    };

    const sections = [
        {
            title: "Information We Collect",
            content:
                "We collect information you provide directly to us, such as when you create an account, update your profile, place an order, or communicate with us. This may include your name, email address, phone number, delivery address, and payment information.",
        },
        {
            title: "How We Use Your Information",
            content:
                "We use the information we collect to provide, maintain, and improve our services, including analyzing user behavior, personalizing your experience, processing transactions, and communicating with you about updates, promotions, and news.",
        },
        {
            title: "Information Sharing",
            content:
                "We do not share your personal information with third parties except as described in this policy, such as with our kitchen partners to fulfill your orders, or with payment processors to handle transactions safe and securely.",
        },
        {
            title: "Data Security",
            content:
                "We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.",
        },
        {
            title: "Your Rights",
            content:
                "You have the right to access, correct, or delete your personal information. You can manage your account settings within the app or contact us for assistance.",
        },
        {
            title: "Changes to This Policy",
            content:
                "We may update this Privacy Policy from time to time. If we make changes, we will notify you by revising the date at the top of the policy and, in some cases, providing you with additional notice.",
        },
    ];

    const displayedSections = isExpanded ? sections : sections.slice(0, 1);

    return (
        <SafeAreaView style={tw`flex-1 bg-white`}>
            <StatusBar
                barStyle={getStatusBarStyle(BACKGROUND_COLOR)}
                backgroundColor={BACKGROUND_COLOR}
            />

            {/* Header */}
            <View style={tw`bg-white px-4 py-4 border-b border-gray-200`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={tw`mr-3`}
                    >
                        <Icon name="arrow-back" size={24} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={[fontStyles.headingS, tw`text-black`]}>Privacy Policy</Text>
                </View>
            </View>

            <ScrollView
                style={tw`flex-1`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={tw`pb-6`}
            >
                <View style={tw`px-4 py-4`}>
                    <View style={tw`mb-4`}>
                        <Text style={[fontStyles.headingS, tw`text-black text-lg font-bold mb-2`]}>
                            Account privacy and policy
                        </Text>
                    </View>

                    {displayedSections.map((section, index) => (
                        <View key={index} style={tw`mb-6`}>
                            <Text
                                style={[
                                    fontStyles.headingItalic,
                                    tw`text-base text-gray-800 mb-2`,
                                ]}
                            >
                                {section.title}
                            </Text>
                            <Text
                                style={[
                                    fontStyles.body,
                                    tw`text-gray-600 text-xs leading-5`,
                                ]}
                            >
                                {section.content}
                            </Text>
                        </View>
                    ))}

                    {!isExpanded && (
                        <TouchableOpacity
                            onPress={() => setIsExpanded(true)}
                            style={tw`flex-row items-center mb-1`}
                        >
                            <Text style={[fontStyles.body, tw`font-bold mr-1`, { color: "#5F7F67" }]}>
                                Read More
                            </Text>
                            <Icon
                                name="chevron-down"
                                size={20}
                                color="#5F7F67"
                            />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        onPress={() => setShowDeletePopup(true)}
                        style={tw`mt-6 bg-gray-50 rounded-xl py-2 px-4 flex-row items-center justify-between border border-gray-100`}
                    >
                        <View style={tw`flex-row items-center flex-1`}>
                            <View style={tw`mr-3`}>
                                <Icon name="trash-outline" size={24} color="#374151" />
                            </View>
                            <View style={tw`flex-1`}>
                                <Text style={[fontStyles.body, tw`font-bold text-gray-900 text-sm`]}>
                                    Request to delete account
                                </Text>
                                <Text style={[fontStyles.body, tw`text-gray-500 text-xs mt-0.5`]}>
                                    Request for closure of your account
                                </Text>
                            </View>
                        </View>
                        <Icon name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    <View style={tw`mt-4 pt-4 border-t border-gray-100`}>
                        <Text style={[fontStyles.body, tw`text-gray-500 text-xs text-center`]}>
                            If you have any questions about this Privacy Policy, please contact us at support@goodbelly.in
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <DeleteAccountPopup
                visible={showDeletePopup}
                onClose={() => setShowDeletePopup(false)}
                onProceed={handleDeleteAccount}
            />
        </SafeAreaView>
    );
};

export default PrivacyPolicyScreen;
