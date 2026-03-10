import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";
import { registerConsultant } from "../../services/consultantApi";
import { DEFAULT_DURATIONS, REGISTRATION_STEPS } from "../../constants/consultantOptions";
import StepProfile from "./StepProfile";
import StepFocus from "./StepFocus";
import StepConsultation from "./StepConsultation";
import StepReview from "./StepReview";

const PRIMARY_COLOR = "#5F7F67";

export default function ConsultantRegisterScreen({ navigation }) {
    const [stepIndex, setStepIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [formData, setFormData] = useState({
        // Step 1
        fullName: "",
        email: "",
        phone: "",
        city: "",
        password: "",
        yearsExperience: "",
        tagline: "",
        credentials: "",

        // Step 2
        specialization: "",
        customSpecialization: "",
        focusAreas: [],
        languages: [],
        intro: "",
        approach: "",

        // Step 3
        durations: DEFAULT_DURATIONS,
        availability: [],
        highlights: [],
        certifications: [],
        professionalAssociations: "",
        consultantTypes: [],
        allowInstantCall: false,

        // Step 4
        agreementAccepted: false,
    });

    const [profileImageFile, setProfileImageFile] = useState(null);

    // Helper functions
    const updateField = (name, value) =>
        setFormData((prev) => ({ ...prev, [name]: value }));

    const toggleMultiSelect = (name, value) => {
        setFormData((prev) => {
            const exists = prev[name].includes(value);
            return {
                ...prev,
                [name]: exists
                    ? prev[name].filter((i) => i !== value)
                    : [...prev[name], value],
            };
        });
    };

    // Validation logic
    const validateStep = () => {
        const { fullName, email, phone, password, city, yearsExperience, tagline, credentials } = formData;

        if (stepIndex === 0) {
            return (
                fullName &&
                email &&
                phone &&
                phone.length === 10 &&
                password &&
                password.length >= 8 &&
                city &&
                yearsExperience &&
                tagline &&
                credentials &&
                profileImageFile !== null
            );
        } else if (stepIndex === 1) {
            return (
                formData.focusAreas.length > 0 &&
                formData.languages.length > 0 &&
                formData.specialization &&
                formData.intro &&
                formData.approach
            );
        } else if (stepIndex === 2) {
            // Ensure all durations have a price
            const allPricesSet = formData.durations.every(d => d.price && d.price.trim().length > 0);
            return (
                formData.durations.length > 0 &&
                allPricesSet &&
                formData.availability.length > 0 &&
                formData.consultantTypes.length > 0 &&
                formData.certifications.length > 0 &&
                formData.professionalAssociations
            );
        }
        return formData.agreementAccepted;
    };

    // Navigation handlers
    const handleNext = () => {
        if (!validateStep()) {
            Alert.alert("Incomplete", "Please fill in all required fields");
            return;
        }
        if (stepIndex < REGISTRATION_STEPS.length - 1) {
            setStepIndex((p) => p + 1);
        }
    };

    const handlePrev = () => {
        if (stepIndex > 0) setStepIndex((p) => p - 1);
    };

    // Submit handler
    const handleSubmit = async () => {
        if (!validateStep()) {
            Alert.alert("Incomplete", "Please accept the agreement to continue");
            return;
        }

        try {
            setIsLoading(true);
            await registerConsultant(formData, profileImageFile, formData.certifications);
            setSubmitted(true);
            Alert.alert(
                "Success!",
                "Your application has been submitted. We will email you the next steps.",
                [{ text: "OK", onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            Alert.alert("Error", error.message || "Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (submitted) {
        return (
            <SafeAreaView style={tw`flex-1 bg-white`}>
                <View style={tw`flex-1 items-center justify-center px-6`}>
                    <View
                        style={[
                            tw`w-20 h-20 rounded-full items-center justify-center mb-4`,
                            { backgroundColor: "#10B981" },
                        ]}
                    >
                        <Ionicons name="checkmark" size={48} color="white" />
                    </View>
                    <Text style={[fontStyles.headingL, tw`text-gray-900 text-center mb-2`]}>
                        Application Submitted!
                    </Text>
                    <Text style={[fontStyles.body, tw`text-gray-600 text-center mb-6`]}>
                        We will email you the next steps and a detailed checklist.
                    </Text>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={[
                            tw`rounded-full px-6 py-3`,
                            { backgroundColor: PRIMARY_COLOR },
                        ]}
                    >
                        <Text style={[fontStyles.bodyBold, tw`text-white`]}>Back to Home</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`}>
            {/* Main Content - Unified Vertical Scroll with Sticky Step Indicator */}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={tw`flex-1`}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={tw`pb-4`}
                    keyboardShouldPersistTaps="handled"
                    stickyHeaderIndices={[1]}
                >
                    {/* Header - Scrollable */}
                    <View style={tw`bg-white px-4 py-4 border-b border-gray-100`}>
                        {/* Back Button */}
                        <View style={tw`mb-3`}>
                            <TouchableOpacity
                                onPress={() => navigation.goBack()}
                                style={tw`flex-row items-center gap-2`}
                            >
                                <Ionicons name="chevron-back" size={20} color="#374151" />
                                <Text style={[fontStyles.body, tw`text-gray-700 text-sm`]}>
                                    Back
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Title and Time Badge */}
                        <View style={tw`flex-row items-center justify-between mb-2`}>
                            <Text
                                style={[
                                    tw`text-gray-900 text-2xl`,
                                    { fontFamily: "Fraunces-Bold" },
                                ]}
                            >
                                Join as Consultant
                            </Text>

                            <View
                                style={[
                                    tw`flex-row items-center gap-1 rounded-full px-2 py-1`,
                                    { backgroundColor: "#10B98120" },
                                ]}
                            >
                                <Ionicons name="shield-checkmark" size={10} color="#10B981" />
                                <Text style={[fontStyles.body, tw`text-green-700 text-[10px] font-semibold`]}>
                                    4 steps - 10 min
                                </Text>
                            </View>
                        </View>

                        {/* Description */}
                        <Text style={[fontStyles.body, tw`text-gray-600 text-sm`]}>
                            Complete your profile in 4 simple steps
                        </Text>
                    </View>
                    {/* Scrollable Step Indicator - Shows 3 steps at a time */}
                    <View style={tw`bg-white border-b border-gray-100`}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={tw`px-3 py-4`}
                        >
                            <View style={tw`flex-row items-start`}>
                                {REGISTRATION_STEPS.map((step, index) => {
                                    const isCompleted = index < stepIndex;
                                    const isCurrent = index === stepIndex;
                                    const isLast = index === REGISTRATION_STEPS.length - 1;

                                    return (
                                        <View key={step.id} style={tw`items-center ${isLast ? 'mr-0' : 'mr-5'}`}>
                                            {/* Step circle with number or checkmark */}
                                            <View
                                                style={[
                                                    tw`w-11 h-11 rounded-full items-center justify-center mb-2`,
                                                    {
                                                        backgroundColor: isCompleted || isCurrent ? PRIMARY_COLOR : "#E5E7EB",
                                                    },
                                                ]}
                                            >
                                                {isCompleted ? (
                                                    <Ionicons name="checkmark" size={18} color="white" />
                                                ) : (
                                                    <Text
                                                        style={[
                                                            fontStyles.body,
                                                            tw`text-base font-bold`,
                                                            { color: isCurrent ? "white" : "#9CA3AF" },
                                                        ]}
                                                    >
                                                        {index + 1}
                                                    </Text>
                                                )}
                                            </View>

                                            {/* Step title */}
                                            <Text
                                                style={[
                                                    fontStyles.bodyBold,
                                                    tw`text-xs text-center mb-1`,
                                                    {
                                                        color: isCompleted || isCurrent ? PRIMARY_COLOR : "#6B7280",
                                                        width: 90,
                                                    },
                                                ]}
                                                numberOfLines={2}
                                            >
                                                {step.title}
                                            </Text>

                                            {/* Step subtitle */}
                                            <Text
                                                style={[
                                                    fontStyles.body,
                                                    tw`text-[10px] text-gray-400 text-center leading-tight`,
                                                    { width: 90 },
                                                ]}
                                                numberOfLines={2}
                                            >
                                                {step.description}
                                            </Text>

                                            {/* Connecting line between circles (not through them) */}
                                            {!isLast && (
                                                <View
                                                    style={[
                                                        tw`absolute`,
                                                        {
                                                            top: 22,
                                                            left: 75,
                                                            right: 70,
                                                            width: 50,
                                                            height: 2,
                                                            backgroundColor: isCompleted ? PRIMARY_COLOR : "#E5E7EB",
                                                        },
                                                    ]}
                                                />
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Step Title Section */}
                    <View style={tw`px-6 pt-3 pb-3 bg-gray-50`}>
                        <View
                            style={[
                                tw`flex-row items-center gap-2 rounded-full px-3 py-1.5 self-start mb-3`,
                                { backgroundColor: `${PRIMARY_COLOR}15` },
                            ]}
                        >
                            <Ionicons name="sparkles" size={12} color={PRIMARY_COLOR} />
                            <Text
                                style={[
                                    fontStyles.bodyBold,
                                    tw`text-xs uppercase tracking-wide`,
                                    { color: PRIMARY_COLOR },
                                ]}
                            >
                                STEP {stepIndex + 1} - {REGISTRATION_STEPS[stepIndex].title.toUpperCase()}
                            </Text>
                        </View>
                        <Text
                            style={[
                                tw`text-gray-900 text-xl mb-2`,
                                { fontFamily: "Fraunces-Bold" },
                            ]}
                        >
                            {stepIndex === 0 && "Let's get to know you"}
                            {stepIndex === 1 && "Who do you usually support?"}
                            {stepIndex === 2 && "Build your consult experience"}
                            {stepIndex === 3 && "Review your details"}
                        </Text>
                        <Text style={[fontStyles.body, tw`text-gray-600 text-sm`]}>
                            {stepIndex === 0 && "Share the essentials we need to set up your consultant profile on Goodbelly."}
                            {stepIndex === 1 && "Pick the specialisation, focus areas, and languages you serve clients in."}
                            {stepIndex === 2 && "Choose the slot timings you usually open and the pricing you want to start with."}
                            {stepIndex === 3 && "Confirm the details before we reach out for onboarding."}
                        </Text>
                    </View>

                    {/* Form Content */}
                    <View style={tw`px-6`}>
                        <View style={tw`bg-white rounded-2xl p-4 mb-4`}>
                            {stepIndex === 0 && (
                                <StepProfile
                                    formData={formData}
                                    updateField={updateField}
                                    profileImageFile={profileImageFile}
                                    setProfileImageFile={setProfileImageFile}
                                />
                            )}
                            {stepIndex === 1 && (
                                <StepFocus
                                    formData={formData}
                                    updateField={updateField}
                                    toggleMultiSelect={toggleMultiSelect}
                                />
                            )}
                            {stepIndex === 2 && (
                                <StepConsultation
                                    formData={formData}
                                    updateField={updateField}
                                    toggleMultiSelect={toggleMultiSelect}
                                />
                            )}
                            {stepIndex === 3 && (
                                <StepReview formData={formData} updateField={updateField} />
                            )}
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Fixed Bottom Navigation Bar */}
            <View style={tw`bg-white border-t border-gray-200 pt-3 pb-3 px-4`}>
                <View style={tw`flex-row justify-between items-center gap-3`}>
                    <TouchableOpacity
                        onPress={handlePrev}
                        disabled={stepIndex === 0}
                        style={[
                            tw`flex-1 px-3 py-3 rounded-lg`,
                            stepIndex === 0 ? tw`bg-gray-100 opacity-50` : tw`bg-gray-100`,
                        ]}
                    >
                        <Text
                            style={[
                                fontStyles.bodyBold,
                                tw`text-center text-sm`,
                                stepIndex === 0 ? tw`text-gray-400` : tw`text-gray-700`,
                            ]}
                        >
                            Back
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={stepIndex === REGISTRATION_STEPS.length - 1 ? handleSubmit : handleNext}
                        disabled={!validateStep() || isLoading}
                        style={[
                            tw`flex-1 px-3 py-3 rounded-lg shadow-sm`,
                            {
                                backgroundColor:
                                    validateStep() && !isLoading ? PRIMARY_COLOR : "#D1D5DB",
                            },
                        ]}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text
                                style={[
                                    fontStyles.bodyBold,
                                    tw`text-center text-sm`,
                                    validateStep() ? tw`text-white` : tw`text-gray-500`,
                                ]}
                            >
                                {stepIndex === REGISTRATION_STEPS.length - 1
                                    ? "Submit Application"
                                    : "Continue"}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Bottom Safe Area Background - Removed */}
        </SafeAreaView >
    );
}
