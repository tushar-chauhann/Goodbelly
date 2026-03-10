import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";
import {
    DAYS_OF_WEEK,
    SLOT_OPTIONS,
    CONSULTANT_TYPES,
} from "../../constants/consultantOptions";
import ToggleButton from "./ToggleButton";

const PRIMARY_COLOR = "#5F7F67";

export default function StepConsultation({ formData, updateField, toggleMultiSelect }) {
    const [expandedDay, setExpandedDay] = useState(null);

    const handleToggleSlot = (day, slot) => {
        const existing = formData.availability || [];
        const exists = existing.some((a) => a.dayOfWeek === day && a.timeSlot === slot);

        let updated;
        if (exists) {
            updated = existing.filter((a) => !(a.dayOfWeek === day && a.timeSlot === slot));
        } else {
            updated = [...existing, { dayOfWeek: day, timeSlot: slot }];
        }

        updateField("availability", updated);
    };

    const isSelected = (day, slot) =>
        formData.availability?.some((a) => a.dayOfWeek === day && a.timeSlot === slot);

    const getSelectedSlotsForDay = (day) =>
        formData.availability?.filter((a) => a.dayOfWeek === day).map((a) => a.timeSlot) || [];

    const pickCertifications = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ["image/*", "application/pdf"],
                multiple: true,
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets) {
                const files = result.assets.map((asset) => ({
                    uri: asset.uri,
                    name: asset.name,
                    type: asset.mimeType, // Map mimeType to type for API compatibility
                    size: asset.size,
                }));
                updateField("certifications", files);
            }
        } catch (error) {
            Alert.alert("Error", "Failed to pick files");
        }
    };

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
                    <Ionicons name="calendar-outline" size={14} color={PRIMARY_COLOR} />
                    <Text
                        style={[
                            fontStyles.bodyBold,
                            tw`text-xs uppercase tracking-wide`,
                            { color: PRIMARY_COLOR },
                        ]}
                    >
                        Step 3 - Consultation Setup
                    </Text>
                </View>
                <Text style={[fontStyles.headingS, tw`text-gray-900 text-xl`]}>
                    Build your consult experience
                </Text>
                <Text style={[fontStyles.body, tw`text-gray-600 text-sm`]}>
                    Choose the slot timings you usually open and the pricing you want to start with.
                </Text>
            </View>

            {/* Weekly Availability */}
            <View style={tw`gap-2 mb-4`}>
                <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm mb-2`]}>
                    Weekly Availability *
                </Text>
                {DAYS_OF_WEEK.map((day) => {
                    const selectedSlots = getSelectedSlotsForDay(day);
                    const isExpanded = expandedDay === day;

                    return (
                        <View key={day} style={tw`border border-gray-200 rounded-xl p-3 mb-2`}>
                            <TouchableOpacity
                                onPress={() => setExpandedDay(isExpanded ? null : day)}
                                style={tw`flex-row justify-between items-center`}
                            >
                                <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>{day}</Text>
                                <View style={tw`flex-row items-center gap-2`}>
                                    <Text style={[fontStyles.body, tw`text-gray-500 text-xs`]}>
                                        {selectedSlots.length > 0
                                            ? `${selectedSlots.length} slots`
                                            : "No slots selected"}
                                    </Text>
                                    <Ionicons
                                        name={isExpanded ? "chevron-up" : "chevron-down"}
                                        size={18}
                                        color="#9CA3AF"
                                    />
                                </View>
                            </TouchableOpacity>

                            {isExpanded && (
                                <View style={tw`flex-row flex-wrap gap-2 mt-3 justify-center`}>
                                    {SLOT_OPTIONS.map((slot) => (
                                        <TouchableOpacity
                                            key={slot}
                                            onPress={() => handleToggleSlot(day, slot)}
                                            style={[
                                                tw`rounded-lg border px-3 py-3 items-center justify-center basis-[30%] flex-grow`,
                                                isSelected(day, slot)
                                                    ? { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }
                                                    : tw`border-gray-200 bg-white`,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    fontStyles.body,
                                                    tw`text-xs font-semibold`,
                                                    isSelected(day, slot) ? tw`text-white` : tw`text-gray-700`,
                                                ]}
                                            >
                                                {slot}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>

            {/* Pricing */}
            <View style={tw`gap-2 mb-4`}>
                <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>
                    Consultation pricing *
                </Text>
                {formData.durations.map((d) => (
                    <View key={d.id} style={tw`border border-gray-200 rounded-xl p-3`}>
                        <Text style={[fontStyles.bodyBold, tw`text-gray-900 text-sm mb-2`]}>{d.label}</Text>
                        <TextInput
                            style={tw`border border-gray-300 rounded-lg px-3 py-2.5 text-sm`}
                            placeholder="Set introductory pricing"
                            keyboardType="numeric"
                            value={d.price}
                            onChangeText={(text) =>
                                updateField(
                                    "durations",
                                    formData.durations.map((x) => (x.id === d.id ? { ...x, price: text } : x))
                                )
                            }
                        />
                        <Text style={[fontStyles.body, tw`text-gray-500 text-xs mt-1`]}>
                            Suggested: INR {d.price || "---"}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Type of Consultant */}
            <View style={tw`gap-2 mb-4`}>
                <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>
                    Type of Consultant *
                </Text>
                <View style={tw`flex-row flex-wrap gap-3`}>
                    {CONSULTANT_TYPES.map((type) => (
                        <TouchableOpacity
                            key={type}
                            onPress={() => toggleMultiSelect("consultantTypes", type)}
                            style={tw`flex-row items-center gap-2`}
                        >
                            <View
                                style={[
                                    tw`w-5 h-5 rounded border items-center justify-center`,
                                    formData.consultantTypes.includes(type)
                                        ? { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }
                                        : tw`border-gray-300`,
                                ]}
                            >
                                {formData.consultantTypes.includes(type) && (
                                    <Ionicons name="checkmark" size={14} color="white" />
                                )}
                            </View>
                            <Text style={[fontStyles.body, tw`text-gray-700 text-sm`]}>{type}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Instant Call */}
            <View style={tw`gap-2 mb-4`}>
                <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>Instant calling *</Text>
                <TouchableOpacity
                    onPress={() => updateField("allowInstantCall", !formData.allowInstantCall)}
                    style={tw`flex-row items-center gap-2`}
                >
                    <View
                        style={[
                            tw`w-5 h-5 rounded border items-center justify-center`,
                            formData.allowInstantCall
                                ? { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }
                                : tw`border-gray-300`,
                        ]}
                    >
                        {formData.allowInstantCall && <Ionicons name="checkmark" size={14} color="white" />}
                    </View>
                    <Text style={[fontStyles.body, tw`text-gray-700 text-sm`]}>
                        Allow instant consultation calls
                    </Text>
                </TouchableOpacity>
                <Text style={[fontStyles.body, tw`text-gray-500 text-xs`]}>
                    If enabled, clients can call without scheduling.
                </Text>
            </View>

            {/* Certifications */}
            <View style={tw`gap-2 mb-4`}>
                <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>
                    Upload Certifications (max 6) *
                </Text>
                <TouchableOpacity
                    onPress={pickCertifications}
                    style={tw`border border-dashed border-gray-300 rounded-xl px-4 py-3`}
                >
                    <Text style={[fontStyles.body, tw`text-gray-600 text-sm`]}>Choose files</Text>
                </TouchableOpacity>
                {formData.certifications.length > 0 && (
                    <View style={tw`gap-1 mt-2`}>
                        {formData.certifications.map((f, i) => (
                            <Text key={i} style={[fontStyles.body, tw`text-gray-600 text-xs`]}>
                                • {f.name}
                            </Text>
                        ))}
                    </View>
                )}
                <Text style={[fontStyles.body, tw`text-gray-500 text-xs`]}>
                    These will be verified before your profile goes live.
                </Text>
            </View>

            {/* Professional Associations */}
            <View style={tw`gap-2 mb-4`}>
                <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>
                    Professional associations
                </Text>
                <TextInput
                    style={tw`border border-gray-300 rounded-lg px-3 py-2.5 text-sm h-24`}
                    placeholder="E.g. Indian Dietetic Association, Nutrition Society of India"
                    multiline
                    textAlignVertical="top"
                    value={formData.professionalAssociations}
                    onChangeText={(text) => updateField("professionalAssociations", text)}
                />
            </View>
        </ScrollView>
    );
}
