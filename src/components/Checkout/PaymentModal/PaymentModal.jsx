// src/components/Checkout/PaymentModal/PaymentModal.jsx
import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { fontStyles } from "../../../utils/fontStyles";

const PRIMARY_COLOR = "#5F7F67";

const PaymentModal = ({ visible, onClose, onPaymentMethodSelect }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 bg-black/50 justify-center items-center p-6`}>
        <View style={tw`bg-white rounded-2xl p-6 w-full max-w-sm`}>
          <Text style={[fontStyles.headingS, tw`text-gray-900 mb-2`]}>
            Select Payment Method
          </Text>
          <Text style={[fontStyles.body, tw`text-gray-600 text-sm mb-4`]}>
            Choose how you want to pay for your order
          </Text>

          <View style={tw`flex-col gap-3 mb-4`}>
            {/* Cash on Delivery - Disabled */}
            <TouchableOpacity
              style={tw`w-full py-3 rounded-full bg-gray-100 opacity-50`}
              disabled={true}
            >
              <Text style={[fontStyles.body, tw`text-gray-800 text-center`]}>
                Cash on Delivery
              </Text>
            </TouchableOpacity>

            {/* Online Payment */}
            <TouchableOpacity
              style={tw`w-full py-3 rounded-full bg-gray-100`}
              onPress={() => onPaymentMethodSelect("ONLINE")}
            >
              <Text style={[fontStyles.body, tw`text-gray-800 text-center`]}>
                Online Payment
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            style={[fontStyles.body, tw`text-red-600 text-xs text-center mb-4`]}
          >
            COD is temporarily not available
          </Text>

          <TouchableOpacity onPress={onClose} style={tw`self-end`}>
            <Text style={[fontStyles.body, tw`text-gray-600`]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default PaymentModal;
