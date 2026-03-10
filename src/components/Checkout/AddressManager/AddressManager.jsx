import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useSelector } from "react-redux";
import tw from "twrnc";

// Import components
import AddressHeader from "./AddressHeader";
import AddressLoading from "./AddressLoading";
import AddressEmptyState from "./AddressEmptyState";
import AddressGrid from "./AddressGrid";
import CreateAddressModal from "./CreateAddressModal";

// Import services
import {
  fetchUserAddresses,
  deleteAddress,
  updateAddress,
  setPrimaryAddress,
  createAddress,
} from "../../../services/addressApi";

const AddressManager = ({
  showActions = true,
  onAddressSelect = null,
  selectedAddressId = null,
  vendorData = null,
}) => {
  const [addresses, setAddresses] = useState([]);
  const [editingAddress, setEditingAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const location = useSelector((state) => state.location);

  const selectedAddress = addresses.find(
    (addr) => addr.id === selectedAddressId
  );

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

      if (onAddressSelect && primaryAddress) {
        onAddressSelect(primaryAddress);
      }
    } catch (err) {
      console.error("Error loading addresses:", err);
      Alert.alert("Error", "Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleDelete = async (addressId) => {
    Alert.alert(
      "Delete Address",
      "Are you sure you want to delete this address?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAddress(addressId);
              Alert.alert("Success", "Address deleted successfully");
              loadAddresses();
            } catch (err) {
              Alert.alert(
                "Error",
                err?.response?.data?.message || "Failed to delete address"
              );
            }
          },
        },
      ]
    );
  };

  const handleEditClick = (address) => {
    setEditingAddress(address);
    setShowEditModal(true);
  };

  const handleCancelEdit = () => {
    setEditingAddress(null);
    setShowEditModal(false);
  };

  const handleUpdate = async (updatedData) => {
    if (!editingAddress) return;

    try {
      setIsSubmitting(true);
      await updateAddress(editingAddress.id, updatedData);
      Alert.alert("Success", "Address updated successfully");
      setShowEditModal(false);
      setEditingAddress(null);
      loadAddresses();
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to update address"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPrimary = async (id) => {
    try {
      await setPrimaryAddress(id);
      Alert.alert("Success", "Primary address updated");
      loadAddresses();
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to set primary address"
      );
    }
  };

  const handleCreateAddress = async (newAddress) => {
    try {
      setIsSubmitting(true);
      await createAddress(newAddress);
      Alert.alert("Success", "Address added successfully");
      setShowCreateModal(false);
      loadAddresses();
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to add address"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Header - Now receives selectedAddress */}
      <AddressHeader
        addressesCount={addresses.length}
        onAddAddress={() => setShowCreateModal(true)}
        selectedAddress={selectedAddress}
      />

      {/* Loading State */}
      {loading && <AddressLoading />}

      {/* Empty State */}
      {!loading && addresses.length === 0 && (
        <AddressEmptyState onAddAddress={() => setShowCreateModal(true)} />
      )}

      {/* Address Grid */}
      {!loading && addresses.length > 0 && (
        <View style={tw`flex-1 px-4`}>
          <AddressGrid
            addresses={addresses}
            showActions={showActions}
            selectedAddressId={selectedAddressId}
            onAddressSelect={onAddressSelect}
            onEditClick={handleEditClick}
            onSetPrimary={handleSetPrimary}
            onDelete={handleDelete}
            vendorData={vendorData}
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
          vendorData={vendorData}
        />
      )}

      {/* Edit Address Modal */}
      {showEditModal && editingAddress && (
        <CreateAddressModal
          onClose={handleCancelEdit}
          onSubmit={handleUpdate}
          currentLocation={location}
          isSubmitting={isSubmitting}
          editAddress={editingAddress}
          vendorData={vendorData}
        />
      )}
    </View>
  );
};

export default AddressManager;
