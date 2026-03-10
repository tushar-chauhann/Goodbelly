import React, { useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, Modal, useWindowDimensions } from "react-native";
// import { Picker } from "@react-native-picker/picker"; // Removed Picker
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";
import {
    SPECIALIZATIONS,
    LANGUAGE_OPTIONS,
    FOCUS_AREA_OPTIONS,
} from "../../constants/consultantOptions";
import ToggleButton from "./ToggleButton";

const PRIMARY_COLOR = "#5F7F67";

export default function StepFocus({ formData, updateField, toggleMultiSelect }) {
    const { width } = useWindowDimensions();
    const [isPickerVisible, setPickerVisible] = useState(false);

    // Responsive grid columns
    const getColumnBasis = (columns) => {
        const gapPercentage = 2;
        const totalGaps = columns - 1;
        const availableSpace = 100 - (totalGaps * gapPercentage);
        return `${Math.floor(availableSpace / columns)}%`;
    };

    const languageColumns = width >= 768 ? 4 : width >= 375 ? 3 : 2;
    const focusAreaColumns = width >= 768 ? 3 : width >= 375 ? 2 : 1;
    const modalMaxHeight = width >= 768 ? "70%" : width >= 375 ? "80%" : "75%";

    const languageBasis = getColumnBasis(languageColumns);
    const focusAreaBasis = getColumnBasis(focusAreaColumns);

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
                    <Ionicons name="book-outline" size={14} color={PRIMARY_COLOR} />
                    <Text
                        style={[
                            fontStyles.bodyBold,
                            tw`text-xs uppercase tracking-wide`,
                            { color: PRIMARY_COLOR },
                        ]}
                    >
                        Step 2 - Areas of Focus
                    </Text>
                </View>
                <Text style={[fontStyles.headingS, tw`text-gray-900 text-xl`]}>
                    Who do you usually support?
                </Text>
                <Text style={[fontStyles.body, tw`text-gray-600 text-sm`]}>
                    Pick the specialisation, focus areas, and languages you serve clients in.
                </Text>
            </View>

            {/* Primary Specialization */}
            <View style={tw`gap-2 mb-4`}>
                <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>
                    Primary specialization *
                </Text>

                <TouchableOpacity
                    onPress={() => setPickerVisible(true)}
                    style={tw`border border-gray-300 rounded-lg px-3 flex-row items-center justify-between h-12 bg-white`}
                >
                    <Text style={[
                        fontStyles.body,
                        tw`text-sm`,
                        !formData.specialization ? tw`text-gray-400` : tw`text-gray-900`
                    ]}>
                        {formData.specialization || "Select specialization"}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <Modal
                    visible={isPickerVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setPickerVisible(false)}
                >
                    <TouchableOpacity
                        style={tw`flex-1 bg-black/50 justify-center items-center px-6`}
                        activeOpacity={1}
                        onPress={() => setPickerVisible(false)}
                    >
                        <View style={[tw`bg-white w-full rounded-2xl overflow-hidden`, { maxHeight: modalMaxHeight }]}>
                            <View style={tw`p-4 border-b border-gray-100 flex-row justify-between items-center`}>
                                <Text style={[fontStyles.headingS, tw`text-gray-900`]}>
                                    Select Specialization
                                </Text>
                                <TouchableOpacity onPress={() => setPickerVisible(false)}>
                                    <Ionicons name="close" size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                {SPECIALIZATIONS.map((item, index) => (
                                    <TouchableOpacity
                                        key={item}
                                        onPress={() => {
                                            updateField("specialization", item);
                                            setPickerVisible(false);
                                        }}
                                        style={tw`px-4 py-4 border-b border-gray-50 flex-row items-center justify-between ${formData.specialization === item ? "bg-green-50" : "bg-white"
                                            }`}
                                    >
                                        <Text style={[
                                            fontStyles.body,
                                            tw`text-sm`,
                                            formData.specialization === item ? tw`text-green-800 font-bold` : tw`text-gray-700`
                                        ]}>
                                            {item}
                                        </Text>
                                        {formData.specialization === item && (
                                            <Ionicons name="checkmark" size={20} color={PRIMARY_COLOR} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {formData.specialization === "Other (custom)" && (
                    <TextInput
                        style={tw`border border-gray-300 rounded-lg px-3 py-2.5 text-sm mt-2`}
                        placeholder="Enter your specialization"
                        value={formData.customSpecialization}
                        onChangeText={(text) => updateField("customSpecialization", text)}
                    />
                )}
            </View>

            {/* Languages */}
            <View style={tw`gap-2 mb-4`}>
                <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>
                    Languages you consult in *
                </Text>
                <View style={tw`flex-row flex-wrap gap-2`}>
                    {LANGUAGE_OPTIONS.map((lang) => (
                        <ToggleButton
                            key={lang}
                            label={lang}
                            selected={formData.languages.includes(lang)}
                            onPress={() => toggleMultiSelect("languages", lang)}
                            style={{ flexBasis: languageBasis, flexGrow: 1 }}
                        />
                    ))}
                </View>
            </View>

            {/* Focus Areas */}
            <View style={tw`gap-2 mb-4`}>
                <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>Focus areas *</Text>
                <Text style={[fontStyles.body, tw`text-gray-500 text-xs`]}>
                    Pick all that apply (recommended top 4)
                </Text>
                <View style={tw`flex-row flex-wrap gap-2`}>
                    {FOCUS_AREA_OPTIONS.map((area) => (
                        <ToggleButton
                            key={area}
                            label={area}
                            selected={formData.focusAreas.includes(area)}
                            onPress={() => toggleMultiSelect("focusAreas", area)}
                            style={{ flexBasis: focusAreaBasis, flexGrow: 1 }}
                        />
                    ))}
                </View>
            </View>

            {/* Short Intro */}
            <View style={tw`gap-2 mb-4`}>
                <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>Short intro *</Text>
                <TextInput
                    style={tw`border border-gray-300 rounded-lg px-3 py-2.5 text-sm h-32`}
                    placeholder="Share a brief introduction for potential clients"
                    multiline
                    textAlignVertical="top"
                    value={formData.intro}
                    onChangeText={(text) => updateField("intro", text)}
                />
            </View>

            {/* Your Approach */}
            <View style={tw`gap-2 mb-4`}>
                <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>Your approach</Text>
                <TextInput
                    style={tw`border border-gray-300 rounded-lg px-3 py-2.5 text-sm h-32`}
                    placeholder="Explain how you typically structure consultations"
                    multiline
                    textAlignVertical="top"
                    value={formData.approach}
                    onChangeText={(text) => updateField("approach", text)}
                />
            </View>
        </ScrollView>
    );
}
