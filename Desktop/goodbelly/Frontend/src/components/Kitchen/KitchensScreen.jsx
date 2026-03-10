// components/KitchensScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from "react-native";
import tw from "twrnc";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authService } from "../../services/authService";
import Icon from "react-native-vector-icons/MaterialIcons";
import FeatherIcon from "react-native-vector-icons/Feather";

// Import font styles (make sure this path matches your project structure)
import { fontStyles } from "../../utils/fontStyles";

const KitchensScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [kitchens, setKitchens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchKitchens();
  }, []);

  const fetchKitchens = async () => {
    try {
      setLoading(true);
      const response = await authService.getKitchens();

      let kitchensData = [];
      if (response) {
        if (Array.isArray(response.data)) {
          kitchensData = response.data;
        } else if (Array.isArray(response)) {
          kitchensData = response;
        } else if (response.data && Array.isArray(response.data.data)) {
          kitchensData = response.data.data;
        }
      }

      setKitchens(kitchensData || []);
    } catch (error) {
      console.error("Error fetching kitchens:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchKitchens();
  };

  const filteredKitchens = kitchens.filter(
    (kitchen) =>
      kitchen.vendor?.kitchenName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      kitchen.vendor?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kitchen.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kitchen.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clearSearch = () => {
    setSearchTerm("");
  };

  const renderKitchenCard = ({ item, index }) => {
    const kitchenName =
      item.vendor?.kitchenName || item.name || "Unknown Kitchen";
    const city = item.vendor?.city || item.city || "Unknown City";
    const imageUrl =
      item.vendor?.coverImage ||
      item.coverImage ||
      item.vendor?.profileImage ||
      item.image ||
      null;
    const rating = item.vendor?.rating || item.rating || 4.5;
    const reviewCount = item.vendor?.reviewCount || item.reviewCount || 0;
    const deliveryTime =
      item.vendor?.deliveryTime || item.deliveryTime || "25-35";
    const isOpen = item.vendor?.isOpen !== false && item.isOpen !== false;

    return (
      <TouchableOpacity
        style={[
          tw`bg-white rounded-2xl mb-4 mx-2 shadow-xl shadow-black/10`,
          index % 2 === 0 ? tw`ml-0` : tw`mr-0`,
        ]}
        onPress={() => {
          navigation.navigate("KitchenDetails", {
            kitchenId: item.vendor?.id || item.id,
            kitchenName,
          });
        }}
        activeOpacity={0.9}
      >
        {/* Kitchen Image */}
        <View style={tw`relative`}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={tw`w-full h-40 rounded-t-2xl`}
              resizeMode="cover"
            />
          ) : (
            <View
              style={tw`w-full h-40 bg-gray-200 rounded-t-2xl flex items-center justify-center`}
            >
              <FeatherIcon name="home" size={48} color="#9CA3AF" />
            </View>
          )}

          {/* Status Badge */}
          <View style={tw`absolute top-3 right-3`}>
            <View
              style={[
                tw`flex-row items-center px-3 py-1 rounded-full`,
                isOpen ? tw`bg-green-500` : tw`bg-red-500`,
              ]}
            >
              <FeatherIcon
                name={isOpen ? "check-circle" : "x-circle"}
                size={12}
                color="#FFFFFF"
              />
              <Text
                style={[fontStyles.captionBold, tw`text-white text-xs ml-1`]}
              >
                {isOpen ? "Open" : "Closed"}
              </Text>
            </View>
          </View>

          {/* Overlay Gradient */}
          <View
            style={tw`absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/50 to-transparent rounded-t-2xl`}
          />
        </View>

        {/* Kitchen Info */}
        <View style={tw`p-4`}>
          <View style={tw`flex-row justify-between items-start mb-1`}>
            <Text
              style={[
                fontStyles.headingS,
                tw`text-base font-semibold text-gray-900 flex-1 mr-2`,
              ]}
              numberOfLines={1}
            >
              {kitchenName}
            </Text>
            <View
              style={tw`flex-row items-center bg-green-50 px-2 py-1 rounded-full`}
            >
              <FeatherIcon name="star" size={12} color="#F59E0B" />
              <Text
                style={[fontStyles.headingS, tw`text-green-800 text-xs ml-1`]}
              >
                {rating.toFixed(1)}
              </Text>
            </View>
          </View>

          <View style={tw`flex-row items-center mb-1`}>
            <FeatherIcon name="map-pin" size={14} color="#6B7280" />
            <Text
              style={[fontStyles.body, tw`text-gray-600 ml-1 flex-1 text-xs`]}
              numberOfLines={1}
            >
              {city}
            </Text>
          </View>

          <View style={tw`flex-row justify-between items-center`}>
            <View style={tw`flex-row items-center`}>
              <FeatherIcon name="clock" size={13} color="#6B7280" />
              <Text style={[fontStyles.body, tw`text-gray-600 ml-1 text-xs`]}>
                {deliveryTime} min
              </Text>
            </View>

            {reviewCount > 0 && (
              <Text style={[fontStyles.caption, tw`text-gray-500`]}>
                ({reviewCount} reviews)
              </Text>
            )}
          </View>

          {/* Specialties */}
          <View style={tw`flex-row flex-wrap mt-1`}>
            <View style={tw`bg-[#6B9080] px-2 py-1 rounded-full mr-2 mb-1`}>
              <Text style={[fontStyles.captionBold, tw`text-white text-xs`]}>
                Vegetarian
              </Text>
            </View>
            <View style={tw`bg-gray-100 px-2 py-1 rounded-full mr-2 mb-1`}>
              <Text style={[fontStyles.caption, tw`text-gray-600 text-xs`]}>
                North Indian
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[
          tw`flex-1 bg-white justify-center items-center`,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <ActivityIndicator size="large" color="#6B9080" />
        <Text style={[fontStyles.body, tw`text-gray-600 mt-4`]}>
          Loading kitchens...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        tw`flex-1 bg-white`,
        {
          paddingTop: insets.top,
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      <View style={tw`bg-white px-4 pt-2 pb-1 shadow-sm shadow-black/5`}>
        <View style={tw`flex-row items-center mb-2`}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={tw`w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3`}
          >
            <Icon name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={[fontStyles.headingS, tw`text-gray-900`]}>
            Browse Kitchens
          </Text>
        </View>

        {/* Search Bar */}
        <View style={tw`relative`}>
          <View
            style={tw`flex-row items-center bg-gray-100 rounded-2xl px-4 py-1`}
          >
            <FeatherIcon name="search" size={20} color="#6B7280" />
            <TextInput
              style={[fontStyles.body, tw`flex-1 ml-3 text-gray-900`]}
              placeholder="Search kitchens by name or city..."
              placeholderTextColor="#9CA3AF"
              value={searchTerm}
              onChangeText={setSearchTerm}
              returnKeyType="search"
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={tw`ml-2`}>
                <FeatherIcon name="x" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Kitchen List */}
      <FlatList
        data={filteredKitchens}
        renderItem={renderKitchenCard}
        keyExtractor={(item) =>
          item.vendor?.id || item.id || Math.random().toString()
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-4 pt-2`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6B9080"]}
            tintColor="#6B9080"
          />
        }
        ListEmptyComponent={
          <View style={tw`flex-1 justify-center items-center px-8 mt-12`}>
            <View
              style={tw`w-24 h-24 bg-gray-100 rounded-full items-center justify-center mb-6`}
            >
              {searchTerm ? (
                <FeatherIcon name="search" size={32} color="#6B7280" />
              ) : (
                <FeatherIcon name="home" size={32} color="#6B7280" />
              )}
            </View>
            <Text
              style={[fontStyles.headingM, tw`text-gray-900 mb-2 text-center`]}
            >
              {searchTerm ? "No Kitchens Found" : "No Kitchens Available"}
            </Text>
            <Text style={[fontStyles.body, tw`text-gray-500 text-center mb-6`]}>
              {searchTerm
                ? "Try adjusting your search terms or browse all kitchens"
                : "Check back later for available kitchens in your area"}
            </Text>
            {searchTerm && (
              <TouchableOpacity
                style={tw`bg-[#6B9080] px-6 py-3 rounded-2xl`}
                onPress={clearSearch}
              >
                <Text style={[fontStyles.bodyBold, tw`text-white`]}>
                  Clear Search
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListHeaderComponent={
          filteredKitchens.length > 0 ? (
            <View style={tw`px-4 pb-2`}>
              <Text style={[fontStyles.body, tw`text-gray-600`]}>
                {filteredKitchens.length} kitchen
                {filteredKitchens.length !== 1 ? "s" : ""} found
                {searchTerm ? ` for "${searchTerm}"` : ""}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Nutritional Disclaimer */}
      {filteredKitchens.length > 0 && (
        <View style={tw`px-4 pt-1`}>
          <Text
            style={[fontStyles.caption, tw`text-gray-500 text-center text-xs`]}
          >
            *Nutritional information is provided by the kitchens and may vary.
            Please contact the kitchen directly for specific dietary concerns.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default KitchensScreen;
