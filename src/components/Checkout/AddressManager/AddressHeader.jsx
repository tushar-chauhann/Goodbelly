import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { fontStyles } from "../../../utils/fontStyles";

const PRIMARY_COLOR = "#5F7F67";

const AddressHeader = ({ addressesCount, onAddAddress, selectedAddress }) => {
  // Check if selected address is serviceable
  const isServiceable = selectedAddress?.serviceable !== false;

  return (
    <View style={tw`mb-3`}>
      <View style={tw`flex-row justify-between items-center mb-1.5`}>
        <View style={tw`flex-row items-center`}>
          <Ionicons
            name="location"
            size={16}
            color={PRIMARY_COLOR}
            style={tw`mr-2`}
          />
          <View>
            <Text style={[fontStyles.bodyBold, tw`text-gray-800 text-sm`]}>
              Delivery Address
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={tw`flex-row items-center bg-[#5F7F67] px-2.5 py-1.5 rounded-lg`}
          onPress={onAddAddress}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={12} color="#FFFFFF" />
          <Text style={[fontStyles.bodyBold, tw`text-white text-xs ml-1`]}>
            Add New
          </Text>
        </TouchableOpacity>
      </View>

      {/* Address Status Bar */}
      <View style={tw`flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center`}>
          <Text style={[fontStyles.body, tw`text-gray-500 text-xs`]}>
            {addressesCount} {addressesCount === 1 ? "address" : "addresses"}{" "}
            saved
          </Text>
        </View>

        {addressesCount > 0 ? (
          <View style={tw`flex-row items-center`}>
            {isServiceable ? (
              <>
                <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                <Text
                  style={[fontStyles.body, tw`text-green-600 text-xs ml-1`]}
                >
                  Ready
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="alert-circle" size={12} color="#EF4444" />
                <Text style={[fontStyles.body, tw`text-red-600 text-xs ml-1`]}>
                  Not Serviceable
                </Text>
              </>
            )}
          </View>
        ) : (
          <View style={tw`flex-row items-center`}>
            <Ionicons name="alert-circle" size={12} color="#EF4444" />
            <Text style={[fontStyles.body, tw`text-red-600 text-xs ml-1`]}>
              Required
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default AddressHeader;
