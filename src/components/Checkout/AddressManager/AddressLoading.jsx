import React from "react";
import { View, ActivityIndicator, Text } from "react-native";
import tw from "twrnc";
import { fontStyles } from "../../../utils/fontStyles";

const PRIMARY_COLOR = "#5F7F67";

const AddressLoading = () => {
  return (
    <View style={tw`items-center justify-center py-8`}>
      <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      <Text style={[fontStyles.body, tw`text-gray-600 mt-2`]}>
        Loading addresses...
      </Text>
    </View>
  );
};

export default AddressLoading;
