import React from "react";
import { TouchableOpacity, Text } from "react-native";
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";

const PRIMARY_COLOR = "#5F7F67";

/**
 * Reusable toggle button for multi-select options
 * @param {boolean} selected - Whether the button is selected
 * @param {string} label - Button label text
 * @param {function} onPress - Press handler
 */
const ToggleButton = ({ selected, label, onPress, style }) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                tw`rounded-xl border px-3 py-2.5`,
                selected
                    ? { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }
                    : tw`border-gray-200 bg-white`,
                style,
            ]}
            activeOpacity={0.7}
        >
            <Text
                style={[
                    fontStyles.body,
                    tw`text-sm text-center`,
                    selected ? tw`text-white font-semibold` : tw`text-gray-700`,
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
};

export default ToggleButton;
