import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import tw from "twrnc";
import { fontStyles } from "../../../utils/fontStyles";
import { checkAddressServiceability } from "../../../services/addressApi";

const PRIMARY_COLOR = "#5F7F67";

const AddressGrid = ({
  addresses,
  showActions,
  selectedAddressId,
  onAddressSelect,
  onEditClick,
  onSetPrimary,
  onDelete,
  vendorData = null,
  forceVisible = false,
}) => {
  const [serviceableStatus, setServiceableStatus] = useState({});
  const [loading, setLoading] = useState({});
  const [actionSheetAddress, setActionSheetAddress] = useState(null);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return "";
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  const getAddressTypeIcon = (type) => {
    switch (type) {
      case "Home":
        return "home";
      case "Office":
        return "business";
      case "Other":
        return "location-pin";
      default:
        return "home";
    }
  };

  const getAddressTypeColor = (type) => {
    switch (type) {
      case "Home":
        return PRIMARY_COLOR;
      case "Office":
        return "#3B82F6";
      case "Other":
        return "#8B5CF6";
      default:
        return PRIMARY_COLOR;
    }
  };

  const checkServiceability = (address) => {
    const hasRequiredFields = address.city && address.zipCode;

    const isCompleteAddress =
      (address.latitude && address.longitude) ||
      (address.addressLine && address.addressLine.length > 10);

    const isServiceable = hasRequiredFields && isCompleteAddress;

    return {
      isServiceable,
      message: isServiceable
        ? "Serviceable"
        : !hasRequiredFields
          ? "Incomplete address"
          : "Location data missing",
    };
  };

  // Check serviceability for all addresses
  useEffect(() => {
    const checkServiceabilityForAddresses = async () => {
      // Skip serviceability check if no vendor data (e.g., in address selection popup)
      if (!vendorData) {
        // Set all addresses as serviceable by default
        const defaultStatus = {};
        addresses.forEach((address) => {
          defaultStatus[address.id] = {
            isServiceable: true,
            message: "Serviceable",
          };
        });
        setServiceableStatus(defaultStatus);
        return;
      }

      const initialLoading = {};
      addresses.forEach((address) => {
        initialLoading[address.id] = true;
      });
      setLoading(initialLoading);

      for (const address of addresses) {
        try {
          const response = await checkAddressServiceability(
            address,
            vendorData
          );

          const isServiceable =
            response?.serviceability?.locationServiceAble === true &&
            response?.serviceability?.riderServiceAble === true;

          // Get the appropriate message
          let message = "Serviceable";
          if (!isServiceable) {
            message = response?.payouts?.message || "Not Serviceable";
          }

          // Update status immediately for this address
          setServiceableStatus((prev) => ({
            ...prev,
            [address.id]: {
              isServiceable,
              message,
            },
          }));
        } catch (error) {
          console.error(
            `Error checking serviceability for address ${address.id}:`,
            error
          );
          setServiceableStatus((prev) => ({
            ...prev,
            [address.id]: {
              isServiceable: true,
              message: "Serviceable",
            },
          }));
        } finally {
          setLoading((prev) => ({ ...prev, [address.id]: false }));
        }
      }
    };

    if (addresses.length > 0) {
      checkServiceabilityForAddresses();
    }
  }, [addresses, vendorData]);

  const getServiceabilityStatus = (address) => {
    if (serviceableStatus[address.id]) {
      return serviceableStatus[address.id];
    }

    return {
      isServiceable: true,
      message: loading[address.id] ? "Checking..." : "Serviceable",
    };
  };

  return (
    <>
      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-4`}
      >
        <View style={tw`gap-3`}>
          {addresses.map((address) => {
            const isSelected = selectedAddressId === address.id;
            const serviceStatus = getServiceabilityStatus(address);

            return (
              <TouchableOpacity
                key={address.id}
                style={tw`bg-white p-4 rounded-xl mb-3 flex-row items-start border ${isSelected && serviceStatus.isServiceable ? 'border-[#5F7F67] bg-[#5F7F67]/10' : 'border-gray-100'} ${!serviceStatus.isServiceable && !forceVisible ? 'opacity-70' : ''}`}
                onPress={() => {
                  if (serviceStatus.isServiceable) {
                    onAddressSelect && onAddressSelect(address);
                  }
                }}
                disabled={!serviceStatus.isServiceable}
              >
                {/* Icon Box */}
                <View style={[tw`p-2 rounded-xl mr-3 bg-[#5F7F67]/10 items-center justify-center`, { width: 40, height: 40 }]}>
                  <Ionicons name="home" size={20} color="#5F7F67" />
                </View>

                <View style={tw`flex-1`}>
                  {/* Header Row */}
                  <View style={tw`flex-row items-center mb-1 flex-wrap`}>
                    <Text style={tw`font-bold text-gray-900 text-sm mr-2`}>{address.type || "Home"}</Text>



                    {/* Serviceability Badge - REQUIRED by User */}
                    <View style={tw`px-1.5 py-0.5 rounded-full ${serviceStatus.isServiceable || serviceStatus.message === "Serviceable" ? "bg-green-100" : "bg-red-100"}`}>
                      <Text style={tw`text-[10px] ${serviceStatus.isServiceable || serviceStatus.message === "Serviceable" ? "text-green-700" : "text-red-700"}`}>
                        {serviceStatus.message}
                      </Text>
                    </View>

                    {/* Primary Badge */}
                    {address.isPrimary && serviceStatus.isServiceable && (
                      <View style={tw`ml-1.5 bg-[#5F7F67] px-1.5 py-0.5 rounded-full`}>
                        <Text style={tw`text-white text-[10px]`}>Primary</Text>
                      </View>
                    )}
                  </View>

                  {/* Address Text */}
                  <Text style={[fontStyles.body, tw`text-gray-500 text-xs mb-2 leading-4`]} numberOfLines={2}>
                    {[address.houseNumber, address.addressLine, address.city, address.zipCode].filter(Boolean).join(", ")}
                  </Text>

                  {/* Phone Number */}
                  <Text style={[fontStyles.body, tw`text-gray-500 text-xs mb-3`]}>
                    Phone number: <Text style={tw`font-semibold text-gray-900`}>{address.phone || "N/A"}</Text>
                  </Text>

                  {/* Action Buttons Row (3 Dots + Share) */}
                  {/* Only show these if actions are allowed (showActions) */}
                  {showActions && (
                    <View style={tw`flex-row items-center`}>
                      {/* 3 Dots Menu Button - Triggers Action Sheet */}
                      <TouchableOpacity
                        onPress={() => setActionSheetAddress(address)}
                        style={tw`w-8 h-8 rounded-full border border-gray-200 items-center justify-center mr-3 bg-white`}
                      >
                        <Ionicons name="ellipsis-horizontal" size={16} color="#374151" />
                      </TouchableOpacity>

                      {/* Share Button (Mock functionality for now) */}
                      <TouchableOpacity style={tw`w-8 h-8 rounded-full border border-gray-200 items-center justify-center bg-white`}>
                        <Ionicons name="share-outline" size={16} color="#16A34A" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Action Sheet Modal */}
      <Modal
        visible={!!actionSheetAddress}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActionSheetAddress(null)}
      >
        <TouchableOpacity
          style={tw`flex-1 bg-black/60 justify-center items-center px-6`}
          activeOpacity={1}
          onPress={() => setActionSheetAddress(null)}
        >
          <View style={tw`w-full bg-white rounded-2xl overflow-hidden`}>
            {/* Delete */}
            <TouchableOpacity
              style={tw`w-full py-4 border-b border-gray-100 items-center bg-gray-50`}
              onPress={() => {
                if (onDelete && actionSheetAddress) onDelete(actionSheetAddress.id);
                setActionSheetAddress(null);
              }}
            >
              <Text style={[fontStyles.headingS, tw`text-red-500 font-semibold text-base`]}>Delete</Text>
            </TouchableOpacity>

            {/* Edit */}
            <TouchableOpacity
              style={tw`w-full py-4 border-b border-gray-100 items-center bg-gray-50`}
              onPress={() => {
                if (onEditClick && actionSheetAddress) onEditClick(actionSheetAddress);
                setActionSheetAddress(null);
              }}
            >
              <Text style={[fontStyles.headingS, tw`text-gray-800 font-semibold text-base`]}>Edit</Text>
            </TouchableOpacity>

            {/* Set as Delivery Address */}
            <TouchableOpacity
              style={tw`w-full py-4 border-b border-gray-100 items-center bg-gray-50`}
              onPress={() => {
                if (onSetPrimary && actionSheetAddress) onSetPrimary(actionSheetAddress.id);
                setActionSheetAddress(null);
              }}
            >
              <Text style={[fontStyles.headingS, tw`text-gray-800 font-semibold text-base`]}>Set as delivery address</Text>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              style={tw`w-full py-4 items-center bg-gray-50`}
              onPress={() => setActionSheetAddress(null)}
            >
              <Text style={[fontStyles.headingS, tw`text-gray-800 font-bold text-base`]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export default AddressGrid;
