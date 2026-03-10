import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";

const PRIMARY_COLOR = "#5F7F67";

/**
 * Step indicator component for registration wizard
 * @param {number} currentStep - Current step index (0-based)
 * @param {Array} steps - Array of step objects with {id, title, description}
 */
const StepIndicator = ({ currentStep, steps }) => {
    return (
        <View style={tw`gap-3`}>
            {steps.map((step, index) => {
                const isActive = index === currentStep;
                const isComplete = index < currentStep;

                return (
                    <View
                        key={step.id}
                        style={[
                            tw`rounded-2xl border px-4 py-3`,
                            isActive
                                ? { borderColor: `${PRIMARY_COLOR}99`, backgroundColor: `${PRIMARY_COLOR}0D` }
                                : isComplete
                                    ? tw`border-green-200 bg-green-50`
                                    : tw`border-gray-200 bg-white`,
                        ]}
                    >
                        <View style={tw`flex-row items-center gap-2 mb-1`}>
                            {isComplete ? (
                                <View
                                    style={[
                                        tw`w-5 h-5 rounded-full items-center justify-center`,
                                        { backgroundColor: "#10B981" },
                                    ]}
                                >
                                    <Ionicons name="checkmark" size={14} color="white" />
                                </View>
                            ) : (
                                <View
                                    style={[
                                        tw`w-5 h-5 rounded-full items-center justify-center border`,
                                        isActive
                                            ? { borderColor: PRIMARY_COLOR, backgroundColor: PRIMARY_COLOR }
                                            : tw`border-gray-300`,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            fontStyles.body,
                                            tw`text-xs`,
                                            isActive ? tw`text-white` : tw`text-gray-400`,
                                        ]}
                                    >
                                        {index + 1}
                                    </Text>
                                </View>
                            )}
                            <Text
                                style={[
                                    fontStyles.bodyBold,
                                    tw`text-sm`,
                                    isActive
                                        ? { color: PRIMARY_COLOR }
                                        : isComplete
                                            ? tw`text-green-700`
                                            : tw`text-gray-600`,
                                ]}
                            >
                                {step.title}
                            </Text>
                        </View>
                        <Text
                            style={[
                                fontStyles.body,
                                tw`text-xs ml-7`,
                                isActive ? { color: PRIMARY_COLOR } : tw`text-gray-500`,
                            ]}
                        >
                            {step.description}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
};

export default StepIndicator;
