// src/components/Checkout/GSTInfoModal/GSTInfoModal.jsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { fontStyles } from "../../../utils/fontStyles";

const PRIMARY_COLOR = "#5F7F67";

const GSTInfoModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const GSTRateItem = ({ label, rate, isFree = false, originalRate = "" }) => (
    <View
      style={tw`flex-row justify-between items-center py-2 border-b border-gray-100`}
    >
      <Text style={[fontStyles.body, tw`text-gray-700 text-xs`]}>{label}</Text>
      <View style={tw`flex-row items-center`}>
        {isFree && originalRate && (
          <Text
            style={[
              fontStyles.body,
              tw`text-gray-400 line-through text-xs mr-2`,
            ]}
          >
            {originalRate}
          </Text>
        )}
        <Text
          style={[
            fontStyles.bodyBold,
            tw`text-xs`,
            isFree ? tw`text-green-600` : tw`text-gray-800`,
          ]}
        >
          {rate}
        </Text>
      </View>
    </View>
  );

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsModalOpen(true)}
        style={tw`flex-row items-center`}
      >
        <Ionicons
          style={[fontStyles.body, tw` underline mr-1`]}
          name="information-circle"
          size={12}
          color={PRIMARY_COLOR}
        />
      </TouchableOpacity>

      <Modal
        visible={isModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
          <View style={tw`bg-white rounded-xl p-4 w-full max-w-xs`}>
            {/* Header */}
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <View style={tw`flex-row items-center`}>
                <Ionicons name="receipt" size={18} color={PRIMARY_COLOR} />
                <Text
                  style={[fontStyles.bodyBold, tw`text-gray-800 text-sm ml-2`]}
                >
                  GST Breakdown
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                style={tw`w-6 h-6 items-center justify-center rounded-full bg-gray-100`}
              >
                <Ionicons name="close" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* GST Rates List */}
            <View style={tw`mb-4`}>
              <GSTRateItem label="Item Total" rate="5% GST" />
              <GSTRateItem
                label="Delivery Fee"
                rate="Free"
                isFree
                originalRate="18% GST"
              />
              <GSTRateItem
                label="Platform Fee"
                rate="Free"
                isFree
                originalRate="18% GST"
              />
            </View>

            {/* Info Note */}
            <View style={tw`bg-blue-50 rounded-lg p-2.5 mb-3`}>
              <Text
                style={[fontStyles.body, tw`text-blue-700 text-xs text-center`]}
              >
                Only 5% GST applied on food items as per government regulations
              </Text>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              onPress={() => setIsModalOpen(false)}
              style={tw`bg-[#5F7F67] py-2 rounded-lg`}
            >
              <Text
                style={[
                  fontStyles.bodyBold,
                  tw`text-white text-xs text-center`,
                ]}
              >
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default GSTInfoModal;
