import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";

// Import dynamic address components
import AddressHeader from "../../components/Checkout/AddressManager/AddressHeader";
import AddressEmptyState from "../../components/Checkout/AddressManager/AddressEmptyState";
import AddressGrid from "../../components/Checkout/AddressManager/AddressGrid";
import CreateAddressModal from "../../components/Checkout/AddressManager/CreateAddressModal";
import CustomPopup from "../../components/CustomPopup/CustomPopup";
import { AddressSkeleton } from "../../components/ProductSkeleton";

// Import address services
import {
  fetchUserAddresses,
  deleteAddress,
  updateAddress,
  setPrimaryAddress,
  createAddress,
} from "../../services/addressApi";

const PRIMARY_COLOR = "#5F7F67";

//   ADD: Helper function for StatusBar style
const getStatusBarStyle = (bgColor) => {
  const lightBgs = ["#FFFFFF", "#F3F4F6", "#FAFAFA", "#F9FAFB", "white"];
  return lightBgs.includes(bgColor) ? "dark-content" : "light-content";
};

//   ADD: Background color constant
const BACKGROUND_COLOR = "#F9FAFB"; // gray-50
const EMPTY_CARTS = []; // Stable reference for selector

const AddressScreen = () => {
  const navigation = useNavigation();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // Popup states
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [popupData, setPopupData] = useState({
    title: "",
    message: "",
    type: "info",
    onConfirm: null,
  });

  const location = useSelector((state) => state.location);
  const carts = useSelector((state) => state.cart.carts || EMPTY_CARTS);

  // Get vendor data from cart (same as checkout)
  const vendorData = carts.length > 0 ? carts[0]?.vendor : null;

  const selectedAddress = addresses.find(
    (addr) => addr.id === selectedAddressId
  );

  //   ADD: useFocusEffect to update StatusBar when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Set StatusBar based on background color
      StatusBar.setBarStyle(getStatusBarStyle(BACKGROUND_COLOR), true);
      StatusBar.setBackgroundColor(BACKGROUND_COLOR, true);

      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  // Fetch nearest kitchen for serviceability checking
  useEffect(() => {
    const fetchNearestKitchen = async () => {
      try {
        const userLat = location?.latitude;
        const userLng = location?.longitude;

        if (!userLat || !userLng) {
          console.log("User location not available");
          return;
        }

        console.log(`Finding nearest kitchen to: ${userLat}, ${userLng}`);

        // Fetch all kitchens
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/vendor/kitchens`);
        const data = await response.json();
        const kitchens = data?.data || data || [];

        if (!kitchens || kitchens.length === 0) {
          console.log("No kitchens available");
          return;
        }

        // Calculate distance to each kitchen
        let nearest = null;
        let minDistance = Infinity;

        kitchens.forEach((kitchen) => {
          const vendor = kitchen.vendor || kitchen;
          const kitchenLat = parseFloat(vendor.latitude);
          const kitchenLng = parseFloat(vendor.longitude);

          if (kitchenLat && kitchenLng) {
            const R = 6371;
            const dLat = ((kitchenLat - userLat) * Math.PI) / 180;
            const dLon = ((kitchenLng - userLng) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((userLat * Math.PI) / 180) *
              Math.cos((kitchenLat * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            if (distance < minDistance) {
              minDistance = distance;
              nearest = vendor;
            }
          }
        });

        if (nearest) {
          console.log(`Nearest kitchen: ${nearest.kitchenName || nearest.name} (${minDistance.toFixed(2)}km)`);
          setNearestKitchen(nearest);
        }
      } catch (error) {
        console.error("Error fetching nearest kitchen:", error);
      }
    };

    fetchNearestKitchen();
  }, [location]);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const data = await fetchUserAddresses();
      setAddresses(data);

      // Find primary address or first serviceable address
      const primaryAddress =
        data.find((addr) => addr.isPrimary) ||
        data.find((addr) => addr.serviceable !== false) ||
        data[0];

      if (primaryAddress) {
        setSelectedAddressId(primaryAddress.id);
      }
    } catch (error) {
      console.error("Error loading addresses:", error);
      showPopupMessage("Error", "Failed to load addresses", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSelect = async (address) => {
    setSelectedAddressId(address.id);

    // Automatically set as primary if not already
    if (!address.isPrimary) {
      await handleSetPrimary(address.id);
    }
  };

  const showPopupMessage = (
    title,
    message,
    type = "info",
    onConfirm = null
  ) => {
    setPopupData({
      title,
      message,
      type,
      onConfirm,
    });

    switch (type) {
      case "error":
        setShowErrorPopup(true);
        break;
      case "success":
        setShowSuccessPopup(true);
        break;
      default:
        // For other types, use success popup as default
        setShowSuccessPopup(true);
    }
  };

  const handleDeleteAddress = (addressId) => {
    setPopupData({
      title: "Delete Address",
      message: "Are you sure you want to delete this address?",
      type: "warning",
      onConfirm: async () => {
        try {
          await deleteAddress(addressId);
          showPopupMessage(
            "Success",
            "Address deleted successfully",
            "success"
          );
          loadAddresses();
        } catch (error) {
          showPopupMessage(
            "Error",
            error?.response?.data?.message || "Failed to delete address",
            "error"
          );
        }
      },
    });
    setShowDeletePopup(true);
  };

  const handleEditClick = (address) => {
    setEditingAddress(address);
    setShowEditModal(true);
  };

  const handleCancelEdit = () => {
    setEditingAddress(null);
    setShowEditModal(false);
  };

  const handleUpdateAddress = async (updatedData) => {
    if (!editingAddress) return;

    try {
      setIsSubmitting(true);
      await updateAddress(editingAddress.id, updatedData);
      showPopupMessage("Success", "Address updated successfully", "success");
      setShowEditModal(false);
      setEditingAddress(null);
      loadAddresses();
    } catch (error) {
      showPopupMessage(
        "Error",
        error?.response?.data?.message || "Failed to update address",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPrimary = async (addressId) => {
    const targetAddress = addresses.find((addr) => addr.id === addressId);

    // If address is already primary, do not show popup or make API call
    if (targetAddress && targetAddress.isPrimary) {
      return;
    }

    try {
      await setPrimaryAddress(addressId);
      showPopupMessage("Success", "Primary address updated", "success");
      loadAddresses();
    } catch (error) {
      showPopupMessage(
        "Error",
        error?.response?.data?.message || "Failed to set primary address",
        "error"
      );
    }
  };

  const handleCreateAddress = async (newAddress) => {
    try {
      setIsSubmitting(true);
      await createAddress(newAddress);
      showPopupMessage("Success", "Address added successfully", "success");
      setShowCreateModal(false);
      loadAddresses();
    } catch (error) {
      showPopupMessage(
        "Error",
        error?.response?.data?.message || "Failed to add address",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNewAddress = () => {
    setShowCreateModal(true);
  };

  // Show loading state
  if (loading) {
    return <AddressSkeleton />;
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header with back button */}
      <View style={tw`bg-white px-4 py-4 border-b border-gray-200`}>
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={tw`mr-3`}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={[fontStyles.headingS, tw`text-black`]}>My Address</Text>
        </View>
      </View>

      {/* Dynamic Address Header */}
      <View style={tw`px-4 pt-4`}>
        <AddressHeader
          addressesCount={addresses.length}
          onAddAddress={handleAddNewAddress}
          selectedAddress={selectedAddress}
        />
      </View>

      {/* Empty State */}
      {!loading && addresses.length === 0 && (
        <AddressEmptyState onAddAddress={handleAddNewAddress} />
      )}

      {/* Address Grid */}
      {!loading && addresses.length > 0 && (
        <View style={tw`flex-1 px-4`}>
          <AddressGrid
            addresses={addresses}
            showActions={true}
            selectedAddressId={selectedAddressId}
            onAddressSelect={handleAddressSelect}
            onEditClick={handleEditClick}
            onSetPrimary={handleSetPrimary}
            onDelete={handleDeleteAddress}
            vendorData={vendorData}
            forceVisible={true}
          />
        </View>
      )}

      {/* Create Address Modal */}
      {showCreateModal && (
        <CreateAddressModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateAddress}
          currentLocation={location}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Edit Address Modal */}
      {showEditModal && editingAddress && (
        <CreateAddressModal
          onClose={handleCancelEdit}
          onSubmit={handleUpdateAddress}
          currentLocation={location}
          isSubmitting={isSubmitting}
          editAddress={editingAddress}
        />
      )}

      {/* Delete Confirmation Popup */}
      <CustomPopup
        visible={showDeletePopup}
        onClose={() => setShowDeletePopup(false)}
        title={popupData.title}
        message={popupData.message}
        type={popupData.type}
        cancelText="Cancel"
        confirmText="Delete"
        onConfirm={popupData.onConfirm}
        onCancel={() => setShowDeletePopup(false)}
      />

      {/* Success Popup */}
      <CustomPopup
        visible={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        title={popupData.title}
        message={popupData.message}
        type={popupData.type}
        showCancelButton={false}
        confirmText="OK"
        onConfirm={() => {
          setShowSuccessPopup(false);
          if (popupData.onConfirm) popupData.onConfirm();
        }}
      />

      {/* Error Popup */}
      <CustomPopup
        visible={showErrorPopup}
        onClose={() => setShowErrorPopup(false)}
        title={popupData.title}
        message={popupData.message}
        type="error"
        showCancelButton={false}
        confirmText="OK"
        onConfirm={() => setShowErrorPopup(false)}
      />
    </SafeAreaView>
  );
};

export default AddressScreen;
