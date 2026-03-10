// src/components/Checkout/AddressManager/EditAddressModal.jsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { fontStyles } from "../../../utils/fontStyles";

const PRIMARY_COLOR = "#5F7F67";

const EditAddressModal = ({ address, onClose, onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
  });

  useEffect(() => {
    if (address) {
      setFormData({
        name: address.name || "",
        address: address.address || "",
        city: address.city || "",
        state: address.state || "",
        pincode: address.pincode || "",
        landmark: address.landmark || "",
      });
    }
  }, [address]);

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.address.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    onSubmit(formData);
  };

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 bg-black/50 justify-end`}>
        <View style={tw`bg-white rounded-t-3xl max-h-3/4`}>
          <View style={tw`p-4 border-b border-gray-200`}>
            <View style={tw`flex-row justify-between items-center mb-2`}>
              <Text style={[fontStyles.headingS, tw`text-gray-800`]}>
                Edit Address
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={tw`p-4`} showsVerticalScrollIndicator={false}>
            <View style={tw`gap-4`}>
              <View>
                <Text style={[fontStyles.body, tw`text-gray-600 mb-1`]}>
                  Address Name *
                </Text>
                <TextInput
                  style={tw`border border-gray-300 rounded-lg px-3 py-2 text-sm`}
                  placeholder="e.g., Home, Work"
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, name: text }))
                  }
                />
              </View>

              <View>
                <Text style={[fontStyles.body, tw`text-gray-600 mb-1`]}>
                  Complete Address *
                </Text>
                <TextInput
                  style={tw`border border-gray-300 rounded-lg px-3 py-2 text-sm h-20`}
                  placeholder="Enter your complete address"
                  value={formData.address}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, address: text }))
                  }
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <View style={tw`flex-row gap-3`}>
                <View style={tw`flex-1`}>
                  <Text style={[fontStyles.body, tw`text-gray-600 mb-1`]}>
                    City
                  </Text>
                  <TextInput
                    style={tw`border border-gray-300 rounded-lg px-3 py-2 text-sm`}
                    placeholder="City"
                    value={formData.city}
                    onChangeText={(text) =>
                      setFormData((prev) => ({ ...prev, city: text }))
                    }
                  />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={[fontStyles.body, tw`text-gray-600 mb-1`]}>
                    State
                  </Text>
                  <TextInput
                    style={tw`border border-gray-300 rounded-lg px-3 py-2 text-sm`}
                    placeholder="State"
                    value={formData.state}
                    onChangeText={(text) =>
                      setFormData((prev) => ({ ...prev, state: text }))
                    }
                  />
                </View>
              </View>

              <View style={tw`flex-row gap-3`}>
                <View style={tw`flex-1`}>
                  <Text style={[fontStyles.body, tw`text-gray-600 mb-1`]}>
                    Pincode
                  </Text>
                  <TextInput
                    style={tw`border border-gray-300 rounded-lg px-3 py-2 text-sm`}
                    placeholder="Pincode"
                    value={formData.pincode}
                    onChangeText={(text) =>
                      setFormData((prev) => ({ ...prev, pincode: text }))
                    }
                    keyboardType="numeric"
                  />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={[fontStyles.body, tw`text-gray-600 mb-1`]}>
                    Landmark
                  </Text>
                  <TextInput
                    style={tw`border border-gray-300 rounded-lg px-3 py-2 text-sm`}
                    placeholder="Nearby landmark"
                    value={formData.landmark}
                    onChangeText={(text) =>
                      setFormData((prev) => ({ ...prev, landmark: text }))
                    }
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={tw`p-4 border-t border-gray-200`}>
            <View style={tw`flex-row gap-3`}>
              <TouchableOpacity
                style={tw`flex-1 border border-gray-300 rounded-lg py-3`}
                onPress={onClose}
                disabled={isSubmitting}
              >
                <Text
                  style={[fontStyles.bodyBold, tw`text-gray-600 text-center`]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`flex-1 bg-[${PRIMARY_COLOR}] rounded-lg py-3`}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={[fontStyles.bodyBold, tw`text-white text-center`]}>
                  {isSubmitting ? "Updating..." : "Update Address"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditAddressModal;
