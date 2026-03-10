import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import tw from "twrnc";
import { authService } from "../../services/authService.js";
import { fontStyles } from "../../utils/fontStyles";

const { width } = Dimensions.get("window");

const ConsultWithExpert = () => {
  const navigation = useNavigation();
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calculate card width for mobile
  const cardWidth = width - 24; // 24 = 12px padding on each side

  // Fetch consultants from API
  const fetchConsultants = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.getConsultants();

      if (response && response.data && response.success) {
        // Take only first 4 consultants for the grid
        const consultants = response.data.slice(0, 4);
        setExperts(consultants);
      } else {
        setExperts([]);
      }
    } catch (err) {
      console.error("Error fetching consultants:", err);
      setError("Failed to load experts");
      setExperts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultants();
  }, []);

  const renderExpert = ({ item }) => {
    // Get the first language for display
    const primaryLanguage =
      item.languages && item.languages.length > 0
        ? item.languages[0].language
        : "English";

    // Get additional languages count
    const additionalLanguages =
      item.languages && item.languages.length > 1
        ? ` +${item.languages.length - 1} more`
        : "";

    // Get the first duration price
    const consultationPrice =
      item.durations && item.durations.length > 0
        ? `₹${item.durations[0].price}`
        : "Contact for price";

    return (
      <View style={[tw`mb-3`, { width: cardWidth }]}>
        <TouchableOpacity
          style={[
            tw`bg-white rounded-xl p-3 flex-row border border-gray-200 min-h-32`,
            tw`shadow-sm shadow-black/5`,
          ]}
          onPress={() =>
            navigation.navigate("ConsultProfile", { expert: item })
          }
        >
          {/* Expert Image - Left Side */}
          <View
            style={tw`w-20 h-20 bg-gray-200 rounded-lg overflow-hidden mr-3`}
          >
            {item.profileImage ? (
              <Image
                source={{ uri: item.profileImage }}
                style={tw`w-full h-full`}
                resizeMode="cover"
                onError={(e) =>
                  console.log("Image load error:", e.nativeEvent.error)
                }
              />
            ) : (
              <View
                style={tw`w-full h-full justify-center items-center bg-gray-300`}
              >
                <Ionicons name="person-outline" size={20} color="#666" />
              </View>
            )}
          </View>

          {/* Expert Info - Right Side */}
          <View style={tw`flex-1 justify-between`}>
            <View>
              {/* Name and Rating Row */}
              <View style={tw`flex-row justify-between items-start`}>
                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-xs font-semibold text-gray-900 flex-1 mr-2`,
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <View
                  style={tw`flex-row items-center bg-yellow-50 px-1.5 py-0.5 rounded-full`}
                >
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text
                    style={[
                      fontStyles.bodyBold,
                      tw`text-[10px] text-gray-700 ml-0.5`,
                    ]}
                  >
                    {item.rating ? Number(item.rating).toFixed(1) : "New"}
                  </Text>
                </View>
              </View>

              {/* Specialization with Icon */}
              {item.specialization && (
                <View style={tw`flex-row items-center`}>
                  <Ionicons name="ribbon-outline" size={12} color="#6B9080" />
                  <Text
                    style={[
                      fontStyles.body,
                      tw`text-xs text-[#6B9080] font-semibold ml-1.5`,
                    ]}
                    numberOfLines={1}
                  >
                    {item.specialization}
                  </Text>
                </View>
              )}

              {/* Experience with Icon */}
              {item.experience && (
                <View style={tw`flex-row items-center`}>
                  <Ionicons name="briefcase-outline" size={12} color="#666" />
                  <Text
                    style={[
                      fontStyles.body,
                      tw`text-[10px] text-gray-600 ml-1.5`,
                    ]}
                  >
                    {item.experience} years experience
                  </Text>
                </View>
              )}

              {/* Languages with Icon */}
              <View style={tw`flex-row items-center `}>
                <Ionicons name="language-outline" size={12} color="#666" />
                <Text
                  style={[
                    fontStyles.body,
                    tw`text-[10px] text-gray-600 ml-1.5 flex-1`,
                  ]}
                  numberOfLines={1}
                >
                  {primaryLanguage}
                  {additionalLanguages}
                </Text>
              </View>
            </View>

            {/* Location with Icon and Price/Button Row */}
            <View>
              <View style={tw`flex-row items-center `}>
                <Ionicons name="location-outline" size={12} color="#666" />
                <Text
                  style={[
                    fontStyles.body,
                    tw`text-[10px] text-gray-700 ml-1.5 flex-1`,
                  ]}
                  numberOfLines={1}
                >
                  {item.city || item.location || "Online Consultation"}
                </Text>
              </View>

              {/* Price and Book Button */}
              <View style={tw`flex-row justify-between items-center`}>
                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-xs font-semibold text-[#6B9080]`,
                  ]}
                >
                  {consultationPrice}
                </Text>
                <TouchableOpacity
                  style={tw`bg-[#6B9080] rounded-lg px-2.5 py-1.5 flex-row items-center`}
                  onPress={() =>
                    navigation.navigate("ConsultProfile", { expert: item })
                  }
                >
                  <Ionicons name="calendar-outline" size={12} color="white" />
                  <Text
                    style={[
                      fontStyles.bodyBold,
                      tw`text-white text-[10px] ml-1`,
                    ]}
                  >
                    Book Now
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={tw`mt-1 px-3 mb-1`}>
        {/* Section Header */}
        <View style={tw`flex-row justify-between items-center `}>
          <Text
            style={[
              fontStyles.headingItalic,
              tw`text-base font-semibold text-gray-900`,
            ]}
          >
            Consult with an Expert
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Consultations")}
          >
            <Text style={[fontStyles.body, tw`text-[10px] text-[#6A8B78]`]}>
              View All
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        <View
          style={tw`h-52 justify-center items-center bg-gray-100 rounded-xl`}
        >
          <ActivityIndicator size="small" color="#6A8B78" />
          <Text style={[fontStyles.body, tw`text-gray-600 text-xs mt-1.5`]}>
            Loading experts...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={tw`mt-1 px-3 mb-1`}>
        {/* Section Header */}
        <View style={tw`flex-row justify-between items-center mb-1`}>
          <Text
            style={[
              fontStyles.headingItalic,
              tw`text-base font-semibold text-gray-900`,
            ]}
          >
            Consult with an Expert
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Consultations")}
          >
            <Text style={[fontStyles.body, tw`text-[10px] text-[#6A8B78]`]}>
              View All
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error State */}
        <View
          style={tw`h-52 justify-center items-center bg-gray-100 rounded-xl`}
        >
          <Ionicons name="alert-circle-outline" size={30} color="#666" />
          <Text
            style={[
              fontStyles.body,
              tw`text-gray-600 text-xs mt-1.5 text-center`,
            ]}
          >
            {error}
          </Text>
          <TouchableOpacity
            style={tw`bg-[#6A8B78] rounded-lg px-3 py-1.5 mt-3`}
            onPress={fetchConsultants}
          >
            <Text style={[fontStyles.bodyBold, tw`text-white text-xs`]}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={tw`mt-1 px-3 mb-1`}>
      {/* Section Header */}
      <View style={tw`flex-row justify-between items-center mb-1`}>
        <Text
          style={[
            fontStyles.headingItalic,
            tw`text-base font-semibold text-gray-900`,
          ]}
        >
          Consult with an Expert
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate("Consultations")}>
          <Text style={[fontStyles.body, tw`text-[10px] text-[#6A8B78]`]}>
            View All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Section Description */}
      <Text
        style={[fontStyles.body, tw`text-xs text-gray-600 leading-5 mb-1.5`]}
      >
        Browse through expert consultants and find the best fit for your needs.
        Click on any expert card to view their profile and book a consultation.
      </Text>

      {/* Experts Grid */}
      {experts.length > 0 ? (
        <FlatList
          key="consultants-single-column"
          data={experts}
          renderItem={renderExpert}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`px-0`}
        />
      ) : (
        <View
          style={tw`h-52 justify-center items-center bg-gray-100 rounded-xl`}
        >
          <Ionicons name="people-outline" size={30} color="#666" />
          <Text
            style={[
              fontStyles.body,
              tw`text-gray-600 text-xs mt-1.5 text-center`,
            ]}
          >
            No experts available at the moment
          </Text>
        </View>
      )}
    </View>
  );
};

export default ConsultWithExpert;
