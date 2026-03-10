import React from "react";
import { View, Text } from "react-native";
import tw from "twrnc";

const StepIndicator = ({ steps, currentStep }) => {
  return (
    <View style={tw`flex-row justify-between items-center`}>
      {steps.map((step, index) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={step.id}>
            <View style={tw`flex-col items-center flex-1`}>
              <View
                style={tw`w-8 h-8 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? "bg-[#7a9b8e]"
                    : isCurrent
                    ? "bg-[#7a9b8e] border-2 border-[#5a7b6e]"
                    : "bg-gray-300"
                }`}
              >
                {isCompleted ? (
                  <Text style={tw`text-white font-bold text-xs`}> </Text>
                ) : (
                  <Text
                    style={tw`font-bold text-xs ${
                      isCurrent ? "text-white" : "text-gray-600"
                    }`}
                  >
                    {step.id}
                  </Text>
                )}
              </View>
              <View style={tw`mt-2`}>
                <Text
                  style={tw`text-xs font-semibold text-center ${
                    isCurrent || isCompleted
                      ? "text-[#7a9b8e]"
                      : "text-gray-400"
                  }`}
                >
                  {step.title}
                </Text>
                <Text
                  style={tw`text-xs text-gray-500 text-center mt-1`}
                  numberOfLines={2}
                >
                  {step.subtitle}
                </Text>
              </View>
            </View>
            {!isLast && (
              <View
                style={tw`flex-1 h-0.5 mx-2 ${
                  step.id < currentStep ? "bg-[#7a9b8e]" : "bg-gray-300"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

export default StepIndicator;
