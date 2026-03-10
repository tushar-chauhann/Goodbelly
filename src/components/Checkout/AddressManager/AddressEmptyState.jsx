import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { fontStyles } from "../../../utils/fontStyles";

const PRIMARY_COLOR = "#5F7F67";

const AddressEmptyState = ({ onAddAddress }) => {
  return (
    <View style={tw`items-center justify-center py-8`}>
      <Ionicons name="location-outline" size={48} color="#9CA3AF" />
      <Text style={[fontStyles.headingS, tw`text-gray-600 mt-4 mb-2`]}>
        No addresses saved
      </Text>
      <Text
        style={[fontStyles.body, tw`text-xs text-gray-500 text-center mb-4`]}
      >
        Add your first delivery address to continue
      </Text>
      <TouchableOpacity
        style={tw`bg-[${PRIMARY_COLOR}] px-6 py-3 rounded-lg`}
        onPress={onAddAddress}
      >
        <Text style={[fontStyles.headingS, tw`text-lg text-white`]}>
          Add Address
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default AddressEmptyState;
