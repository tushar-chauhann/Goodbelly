import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";

const PRIMARY_COLOR = "#5F7F67";

export default function StepReview({ formData, updateField }) {
    return (
        <ScrollView style={tw`gap-6`} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={tw`gap-2 mb-4`}>
                <View
                    style={[
                        tw`flex-row items-center gap-2 rounded-full px-3 py-1.5 self-start`,
                        { backgroundColor: `${PRIMARY_COLOR}1A` },
                    ]}
                >
                    <Ionicons name="checkmark-circle-outline" size={14} color={PRIMARY_COLOR} />
                    <Text
                        style={[
                            fontStyles.bodyBold,
                            tw`text-xs uppercase tracking-wide`,
                            { color: PRIMARY_COLOR },
                        ]}
                    >
                        Step 4 - Review & Submit
                    </Text>
                </View>
                <Text style={[fontStyles.headingS, tw`text-gray-900 text-xl`]}>
                    Review your details
                </Text>
                <Text style={[fontStyles.body, tw`text-gray-600 text-sm`]}>
                    Confirm the details before we reach out for onboarding.
                </Text>
            </View>

            {/* Profile Summary */}
            <View style={tw`border border-gray-200 rounded-xl p-4 mb-4`}>
                <Text style={[fontStyles.bodyBold, tw`text-gray-900 text-sm mb-3`]}>
                    Professional Profile
                </Text>
                <View style={tw`gap-2`}>
                    <View style={tw`flex-row`}>
                        <Text style={[fontStyles.body, tw`text-gray-600 text-sm w-32`]}>Name:</Text>
                        <Text style={[fontStyles.bodyBold, tw`text-gray-900 text-sm flex-1`]}>
                            {formData.fullName}
                        </Text>
                    </View>
                    <View style={tw`flex-row`}>
                        <Text style={[fontStyles.body, tw`text-gray-600 text-sm w-32`]}>Email:</Text>
                        <Text style={[fontStyles.body, tw`text-gray-900 text-sm flex-1`]}>
                            {formData.email}
                        </Text>
                    </View>
                    <View style={tw`flex-row`}>
                        <Text style={[fontStyles.body, tw`text-gray-600 text-sm w-32`]}>Phone:</Text>
                        <Text style={[fontStyles.body, tw`text-gray-900 text-sm flex-1`]}>
                            {formData.phone}
                        </Text>
                    </View>
                    <View style={tw`flex-row`}>
                        <Text style={[fontStyles.body, tw`text-gray-600 text-sm w-32`]}>City:</Text>
                        <Text style={[fontStyles.body, tw`text-gray-900 text-sm flex-1`]}>
                            {formData.city}
                        </Text>
                    </View>
                    <View style={tw`flex-row`}>
                        <Text style={[fontStyles.body, tw`text-gray-600 text-sm w-32`]}>Experience:</Text>
                        <Text style={[fontStyles.body, tw`text-gray-900 text-sm flex-1`]}>
                            {formData.yearsExperience}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Focus Areas Summary */}
            <View style={tw`border border-gray-200 rounded-xl p-4 mb-4`}>
                <Text style={[fontStyles.bodyBold, tw`text-gray-900 text-sm mb-3`]}>Areas of Focus</Text>
                <View style={tw`gap-2`}>
                    <View style={tw`flex-row`}>
                        <Text style={[fontStyles.body, tw`text-gray-600 text-sm w-32`]}>Specialization:</Text>
                        <Text style={[fontStyles.body, tw`text-gray-900 text-sm flex-1`]}>
                            {formData.specialization === "Other (custom)"
                                ? formData.customSpecialization
                                : formData.specialization}
                        </Text>
                    </View>
                    <View style={tw`flex-row`}>
                        <Text style={[fontStyles.body, tw`text-gray-600 text-sm w-32`]}>Languages:</Text>
                        <Text style={[fontStyles.body, tw`text-gray-900 text-sm flex-1`]}>
                            {formData.languages.join(", ")}
                        </Text>
                    </View>
                    <View style={tw`flex-row`}>
                        <Text style={[fontStyles.body, tw`text-gray-600 text-sm w-32`]}>Focus Areas:</Text>
                        <Text style={[fontStyles.body, tw`text-gray-900 text-sm flex-1`]}>
                            {formData.focusAreas.join(", ")}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Consultation Setup Summary */}
            <View style={tw`border border-gray-200 rounded-xl p-4 mb-4`}>
                <Text style={[fontStyles.bodyBold, tw`text-gray-900 text-sm mb-3`]}>
                    Consultation Setup
                </Text>
                <View style={tw`gap-2`}>
                    <View style={tw`flex-row`}>
                        <Text style={[fontStyles.body, tw`text-gray-600 text-sm w-32`]}>Availability:</Text>
                        <Text style={[fontStyles.body, tw`text-gray-900 text-sm flex-1`]}>
                            {formData.availability.length} time slots selected
                        </Text>
                    </View>
                    <View style={tw`flex-row`}>
                        <Text style={[fontStyles.body, tw`text-gray-600 text-sm w-32`]}>Type:</Text>
                        <Text style={[fontStyles.body, tw`text-gray-900 text-sm flex-1`]}>
                            {formData.consultantTypes.join(", ")}
                        </Text>
                    </View>
                    <View style={tw`flex-row`}>
                        <Text style={[fontStyles.body, tw`text-gray-600 text-sm w-32`]}>Instant Call:</Text>
                        <Text style={[fontStyles.body, tw`text-gray-900 text-sm flex-1`]}>
                            {formData.allowInstantCall ? "Enabled" : "Disabled"}
                        </Text>
                    </View>
                    <View style={tw`flex-row`}>
                        <Text style={[fontStyles.body, tw`text-gray-600 text-sm w-32`]}>Certifications:</Text>
                        <Text style={[fontStyles.body, tw`text-gray-900 text-sm flex-1`]}>
                            {formData.certifications.length} file(s) uploaded
                        </Text>
                    </View>
                </View>
            </View>

            {/* Agreement */}
            <View style={tw`border border-gray-200 rounded-xl p-4 mb-4`}>
                <TouchableOpacity
                    onPress={() => updateField("agreementAccepted", !formData.agreementAccepted)}
                    style={tw`flex-row items-start gap-3`}
                >
                    <View
                        style={[
                            tw`w-5 h-5 rounded border items-center justify-center mt-0.5`,
                            formData.agreementAccepted
                                ? { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }
                                : tw`border-gray-300`,
                        ]}
                    >
                        {formData.agreementAccepted && <Ionicons name="checkmark" size={14} color="white" />}
                    </View>
                    <View style={tw`flex-1`}>
                        <Text style={[fontStyles.body, tw`text-gray-700 text-sm`]}>
                            I accept the consultant agreement and terms *
                        </Text>
                        <Text style={[fontStyles.body, tw`text-gray-500 text-xs mt-1`]}>
                            By submitting, you agree to our terms of service and privacy policy.
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
