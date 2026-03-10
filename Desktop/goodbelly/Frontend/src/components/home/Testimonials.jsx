import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { authService } from "../../services/authService.js";
const Testimonials = () => {
  const testimonialsRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch testimonials from backend
  const fetchTestimonials = async () => {
    try {
      setLoading(true);
      setError(null);

      // Assuming your API returns data in the format: { success: true, data: [...] }
      const response = await authService.getTestimonials(); // You'll need to add this method to authService

      if (response.success) {
        setTestimonials(response.data || []);
      } else {
        setError("Failed to fetch testimonials");
      }
    } catch (err) {
      console.error("Error fetching testimonials:", err);
      setError("Failed to load testimonials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      testimonialsRef.current?.scrollToIndex({
        index: newIndex,
        animated: true,
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < testimonials.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      testimonialsRef.current?.scrollToIndex({
        index: newIndex,
        animated: true,
      });
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Function to render star ratings
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={`star-${i}`} name="star" size={16} color="#FFD700" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half-star" name="star-half" size={16} color="#FFD700" />
      );
    }

    const remainingStars = 5 - stars.length;
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Ionicons
          key={`empty-${i}`}
          name="star-outline"
          size={16}
          color="#FFD700"
        />
      );
    }

    return stars;
  };

  const renderTestimonial = ({ item, index }) => (
    <View style={[tw`mx-4 w-64 mb-8`]}>
      {/* Shadow background with -5deg rotation (left side) */}
      <View
        style={[
          tw`absolute -left-2 top-2 w-full h-full bg-[#6A8B78] rounded-lg -z-10`,
          { transform: [{ rotate: "-5deg" }] },
        ]}
      />

      {/* Main card with -5deg rotation (left side) */}
      <View
        style={[
          tw`bg-white rounded-lg p-3 shadow-lg`,
          { transform: [{ rotate: "-5deg" }] },
        ]}
      >
        {/* User info with image and name in row */}
        <View style={tw`flex-row items-center mb-3`}>
          <Image
            source={
              item.imageUrl
                ? { uri: item.imageUrl }
                : require("../../assets/icons/default-avatar.png")
            }
            style={tw`w-15 h-15 rounded-full mr-3`}
            defaultSource={require("../../assets/icons/default-avatar.png")}
          />
          <View>
            <Text style={tw`text-lg font-bold text-black`}>{item.name}</Text>
            {item.city && (
              <Text style={tw`text-sm text-gray-500`}>{item.city}</Text>
            )}
          </View>
        </View>

        {/* Star Rating */}
        {item.rating && (
          <View style={tw`flex-row mb-2`}>{renderStars(item.rating)}</View>
        )}

        {/* Review text - Show only 4 lines */}
        <Text
          style={tw`text-sm text-gray-600 leading-5`}
          numberOfLines={4}
          ellipsizeMode="tail"
        >
          {item.description}
        </Text>
      </View>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <View style={tw`mt-8 px-4 mb-12 items-center justify-center min-h-40`}>
        <ActivityIndicator size="large" color="#3E5E52" />
        <Text style={tw`text-gray-600 mt-2`}>Loading testimonials...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={tw`mt-8 px-4 mb-12 items-center justify-center min-h-40`}>
        <Ionicons name="alert-circle-outline" size={40} color="#FF6B6B" />
        <Text style={tw`text-red-500 mt-2 text-center`}>{error}</Text>
        <TouchableOpacity
          style={tw`mt-3 bg-[#6A8B78] px-4 py-2 rounded-lg`}
          onPress={fetchTestimonials}
        >
          <Text style={tw`text-white`}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state
  if (testimonials.length === 0) {
    return (
      <View style={tw`mt-8 px-4 mb-12 items-center justify-center min-h-40`}>
        <Ionicons name="chatbubble-outline" size={40} color="#9CA3AF" />
        <Text style={tw`text-gray-500 mt-2`}>No testimonials available</Text>
      </View>
    );
  }

  return (
    <View style={tw`mt-8 px-4`}>
      <Text style={tw`text-xl font-bold text-gray-900 mb-2`}>Testimonials</Text>
      <Text style={tw`text-sm text-gray-600 mb-6 leading-5`}>
        Whether you want plant-based meals or to simply go gluten-free, we have
        the selection for you.
      </Text>

      <View style={tw`relative items-center justify-center min-h-80`}>
        {/* Testimonials list - non-scrollable */}
        <FlatList
          ref={testimonialsRef}
          data={testimonials}
          horizontal
          keyExtractor={(item) => item.id.toString()}
          showsHorizontalScrollIndicator={false}
          renderItem={renderTestimonial}
          contentContainerStyle={tw`flex-grow justify-center items-center py-4`}
          scrollEnabled={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(data, index) => ({
            length: 280, // width + margin
            offset: 280 * index,
            index,
          })}
          initialScrollIndex={0}
        />

        {/* Left arrow - only visible when not on first item */}
        {currentIndex > 0 && (
          <TouchableOpacity
            style={tw`absolute left-0 top-1/2 z-10 bg-[#6A8B78] rounded-full p-2 -translate-y-6`}
            onPress={handlePrevious}
          >
            <Ionicons name="chevron-back" size={20} color="white" />
          </TouchableOpacity>
        )}

        {/* Right arrow - only visible when not on last item */}
        {currentIndex < testimonials.length - 1 && (
          <TouchableOpacity
            style={tw`absolute right-0 top-1/2 z-10 bg-[#6A8B78] rounded-full p-2 -translate-y-6`}
            onPress={handleNext}
          >
            <Ionicons name="chevron-forward" size={20} color="white" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default Testimonials;
