// src/components/Checkout/PromoModal/PromoModal.jsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import tw from "twrnc";
import { fontStyles } from "../../../utils/fontStyles";
import { getAvailablePromos, applyPromoCode } from "../../../services/promoApi";
import { setAppliedPromo } from "../../../redux/promoSlice";
import CustomPopup from "../../CustomPopup/CustomPopup";

const PRIMARY_COLOR = "#5F7F67";

const PromoModal = ({ visible, onClose, singleAmount }) => {
  const dispatch = useDispatch();
  const appliedPromo = useSelector((state) => state.promo?.appliedPromo);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Custom Popup States
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupConfig, setPopupConfig] = useState({
    title: "",
    message: "",
    type: "info",
    onConfirm: null,
  });

  useEffect(() => {
    if (visible) {
      fetchPromos();
    }
  }, [visible]);

  const fetchPromos = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getAvailablePromos();
      if (response.success) {
        setPromos(response.data || []);
      } else {
        setError("Failed to load promo codes");
      }
    } catch (err) {
      setError("Failed to load promo codes");
      console.error("Error fetching promos:", err);
    } finally {
      setLoading(false);
    }
  };

  const showPopup = (title, message, type = "info", onConfirm = null) => {
    setPopupConfig({
      title,
      message,
      type,
      onConfirm,
    });
    setPopupVisible(true);
  };

  const handleApplyPromo = async (promo) => {
    try {
      // Apply the promo code through API
      const applyResponse = await applyPromoCode({
        code: promo.code,
        productAmount: singleAmount,
      });

      if (applyResponse && applyResponse.success) {
        dispatch(setAppliedPromo(applyResponse.data));
        showPopup(
          "Success! 🎉",
          "Coupon applied successfully!",
          "success",
          () => onClose()
        );
      } else {
        showPopup(
          "Error",
          applyResponse?.message || "Failed to apply promo code",
          "error"
        );
      }
    } catch (error) {
      console.error("Error applying promo:", error);
      showPopup(
        "Error",
        error.response?.data?.message || "Failed to apply promo code",
        "error"
      );
    }
  };

  const handleRemoveCoupon = () => {
    showPopup(
      "Remove Coupon?",
      "Are you sure you want to remove this coupon?",
      "warning",
      () => {
        dispatch(setAppliedPromo(null));
        onClose();
      }
    );
  };

  const renderPromoItem = ({ item }) => {
    const isApplied = appliedPromo?.code === item.code;

    return (
      <TouchableOpacity
        style={[
          tw`p-2 border-b border-gray-100`,
          isApplied && tw`bg-green-50 border-green-200`,
        ]}
        onPress={() => handleApplyPromo(item)}
        disabled={isApplied}
      >
        <View style={tw`flex-row justify-between items-center`}>
          <View style={tw`flex-1`}>
            <Text style={[fontStyles.bodyBold, tw`text-[#5F7F67] text-xs`]}>
              {item.code}
            </Text>
            <Text style={[fontStyles.body, tw`text-gray-600 text-xs mt-0.5`]}>
              Get ₹{item.discount} off
            </Text>
            <Text style={[fontStyles.body, tw`text-gray-500 text-xs mt-0.5`]}>
              Min. order: ₹{item.minOrder}
            </Text>
            {item.expiry && (
              <Text style={[fontStyles.body, tw`text-gray-400 text-xs mt-0.5`]}>
                Valid until: {new Date(item.expiry).toLocaleDateString()}
              </Text>
            )}
          </View>

          <View>
            {isApplied ? (
              <TouchableOpacity
                onPress={handleRemoveCoupon}
                style={tw`flex-row items-center`}
              >
                <Ionicons name="checkmark-circle" size={16} color="#5F7F67" />
                <Text
                  style={[fontStyles.body, tw`text-[#5F7F67] ml-1 text-xs`]}
                >
                  Applied
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={[fontStyles.bodyBold, tw`text-[#5F7F67] text-xs`]}>
                Apply
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
          <View style={tw`bg-white rounded-xl p-4 w-full max-w-xs max-h-80`}>
            <Text style={[fontStyles.bodyBold, tw`text-gray-900 mb-3 text-sm`]}>
              Available Promo Codes
            </Text>

            {loading ? (
              <View style={tw`py-6 items-center`}>
                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                <Text style={[fontStyles.body, tw`text-gray-600 mt-2 text-xs`]}>
                  Loading promo codes...
                </Text>
              </View>
            ) : error ? (
              <View style={tw`py-3 items-center`}>
                <Text
                  style={[
                    fontStyles.body,
                    tw`text-red-500 text-center text-xs`,
                  ]}
                >
                  {error}
                </Text>
                <TouchableOpacity onPress={fetchPromos} style={tw`mt-1`}>
                  <Text style={[fontStyles.body, tw`text-[#5F7F67] text-xs`]}>
                    Try Again
                  </Text>
                </TouchableOpacity>
              </View>
            ) : promos.length === 0 ? (
              <Text
                style={[
                  fontStyles.body,
                  tw`text-gray-600 text-center py-3 text-xs`,
                ]}
              >
                No promo codes available
              </Text>
            ) : (
              <FlatList
                data={promos}
                keyExtractor={(item) => item.id || item.code}
                renderItem={renderPromoItem}
                showsVerticalScrollIndicator={false}
                style={tw`max-h-52`}
              />
            )}

            <TouchableOpacity onPress={onClose} style={tw`mt-3 self-end`}>
              <Text style={[fontStyles.bodyBold, tw`text-[#5F7F67] text-xs`]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Popup for all alerts */}
      <CustomPopup
        visible={popupVisible}
        onClose={() => setPopupVisible(false)}
        title={popupConfig.title}
        message={popupConfig.message}
        type={popupConfig.type}
        showCancelButton={popupConfig.type === "warning"}
        cancelText="Cancel"
        confirmText={popupConfig.type === "warning" ? "Remove" : "OK"}
        onConfirm={popupConfig.onConfirm}
        onCancel={() => setPopupVisible(false)}
      />
    </>
  );
};

export default PromoModal;
