import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
} from "react-native";
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";
import Icon from "react-native-vector-icons/MaterialIcons";

const { width, height } = Dimensions.get("window");

const SortOverlay = ({ sortOpen, setSortOpen, sortBy, setSortBy }) => {
  const sortOptions = [
    { label: "Relevance (default)", value: "" },
    { label: "Price (low to high)", value: "priceLow" },
    { label: "Price (high to low)", value: "priceHigh" },
    { label: "A-Z", value: "alphabetical" },
  ];

  const handleSortSelect = (value) => {
    setSortBy(value);
    setSortOpen(false);
  };

  return (
    <Modal
      visible={sortOpen}
      transparent
      animationType="none"
      onRequestClose={() => setSortOpen(false)}
    >
      <View style={tw`flex-1 bg-black/50`}>
        {/* Backdrop Touchable Area - This will close the modal when clicked */}
        <TouchableOpacity
          style={tw`flex-1`}
          activeOpacity={1}
          onPress={() => setSortOpen(false)}
        >
          {/* Empty view to capture taps on the backdrop */}
          <View style={tw`flex-1`} />
        </TouchableOpacity>

        {/* Close Button - Centered outside the popup */}
        <TouchableOpacity
          onPress={() => setSortOpen(false)}
          style={tw`absolute top-98 right-41 z-50 w-9 h-9 items-center justify-center bg-[#5F7F67] rounded-full shadow-lg`}
        >
          <Icon name="close" size={24} color="#ffffff" />
        </TouchableOpacity>

        <View
          style={tw`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl`}
        >
          {/* Header */}
          <View style={tw`px-4 py-4 border-b border-gray-200`}>
            <Text
              style={[
                fontStyles.headingS,
                tw`text-lg font-semibold text-gray-900 text-center`,
              ]}
            >
              Sort by
            </Text>
          </View>

          {/* Sort Options */}
          <ScrollView
            style={tw`max-h-96`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw`pb-4`}
          >
            {sortOptions.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => handleSortSelect(option.value)}
                style={[
                  tw`px-6 py-4 flex-row items-center justify-between`,
                  index !== sortOptions.length - 1 &&
                    tw`border-b border-gray-100`,
                ]}
              >
                <View style={tw`flex-row items-center flex-1`}>
                  <View
                    style={[
                      tw`w-5 h-5 rounded-full border-2 mr-4 items-center justify-center`,
                      sortBy === option.value
                        ? tw`border-[#5F7F67] bg-[#5F7F67]`
                        : tw`border-gray-300 bg-white`,
                    ]}
                  >
                    {sortBy === option.value && (
                      <Icon name="check" size={14} color="#FFFFFF" />
                    )}
                  </View>
                  <Text
                    style={[
                      fontStyles.body,
                      tw`text-sm flex-1`,
                      sortBy === option.value
                        ? tw`text-gray-900 font-semibold`
                        : tw`text-gray-700`,
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>

                {/* Show checkmark on the right for selected option */}
                {sortBy === option.value && (
                  <Icon name="check" size={20} color="#5F7F67" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default SortOverlay;
