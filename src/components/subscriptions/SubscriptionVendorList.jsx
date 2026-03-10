import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import tw from "twrnc";
import { authService } from "../../services/authService.js";
import { toast } from "../../utils/toast";
import { fontStyles } from "../../utils/fontStyles.js";

const VendorList = ({ selectedVendor, onSelect }) => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await authService.getVendors();
      console.log("Vendors API full response:", response);

      // Handle different response structures
      let vendorsData = [];
      if (response?.data?.data) {
        vendorsData = response.data.data;
      } else if (response?.data) {
        vendorsData = response.data;
      } else if (Array.isArray(response)) {
        vendorsData = response;
      }

      console.log("Processed vendors data:", vendorsData);
      setVendors(vendorsData);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center py-8`}>
        <ActivityIndicator size="large" color="#7a9b8e" />
        <Text style={tw`text-gray-600 mt-2 text-xs`}>Loading kitchens...</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1`}>
      <Text
        style={[
          fontStyles.headingS,
          tw`text-base font-semibold text-gray-800 mb-2`,
        ]}
      >
        Select a Kitchen
      </Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-4`}
      >
        <View style={tw`gap-3`}>
          {vendors.map((vendor, index) => {
            // Extract vendor data - handle different API structures
            const vendorData = vendor.vendor || vendor;
            const vendorId =
              vendorData?.id ||
              vendorData?.userId ||
              vendor.id ||
              `vendor-${index}`;
            const kitchenName =
              vendorData?.kitchenName || vendorData?.name || "Unknown Kitchen";
            const address = vendorData?.address || "Address not available";
            const city = vendorData?.city || "City not specified";
            const coverImage =
              vendorData?.coverImage || "https://picsum.photos/400/200";

            // Get vendor's name from the main object
            const vendorName =
              vendor.name || vendorData?.kitchenName || "Cloud Kitchen";

            const isSelected = selectedVendor?.id === vendorId;

            return (
              <TouchableOpacity
                key={vendorId}
                style={tw`bg-white rounded-xl border-2 ${
                  isSelected
                    ? "border-[#7a9b8e] ring-2 ring-[#7a9b8e]/40"
                    : "border-gray-200"
                }`}
                onPress={() =>
                  onSelect({
                    id: vendorId,
                    name: kitchenName,
                    address: address,
                    city: city,
                    coverImage: coverImage,
                    vendorName: vendorName, // Add vendor name to the object
                    ...vendorData, // Include all vendor data
                  })
                }
              >
                {/* Cover Image - Full width */}
                <View style={tw`mb-3`}>
                  <Image
                    source={{ uri: coverImage }}
                    style={tw`w-full h-28 rounded-t-xl`}
                    resizeMode="cover"
                  />
                </View>

                <View style={tw`px-4 pb-3`}>
                  <View style={tw`flex items-start justify-between gap-2`}>
                    <View style={tw`flex-1`}>
                      {/* Show vendor's name instead of "Cloud Kitchen" */}
                      <Text
                        style={tw`text-xs text-[11px] uppercase tracking-wide text-[#7a9b8e]`}
                      >
                        {vendorName}
                      </Text>
                      <Text
                        style={[
                          fontStyles.headingS,
                          tw`text-sm font-semibold text-gray-800`,
                        ]}
                      >
                        {kitchenName}
                      </Text>
                    </View>
                  </View>

                  {/* Address */}
                  <Text
                    style={tw`mt-2 text-xs text-gray-600`}
                    numberOfLines={2}
                  >
                    {address}
                  </Text>

                  {/* City */}
                  <Text style={tw`mt-1 text-xs text-gray-600`}>{city}</Text>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <View
                      style={tw`absolute top-2 right-2 w-5 h-5 rounded-full bg-[#7a9b8e] items-center justify-center`}
                    >
                      <Text style={tw`text-white text-xs font-bold`}>✓</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {vendors.length === 0 && (
          <View style={tw`flex-1 justify-center items-center py-8`}>
            <Text style={tw`text-gray-500 text-center text-xs`}>
              No kitchens available at the moment.
              {"\n"}Please check back later.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default VendorList;
