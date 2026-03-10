import React, { useRef } from "react";
import {
  View,
  Text,
  Image,
  Animated,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import tw from "twrnc";
import * as Haptics from "expo-haptics";

import { fontStyles } from "../../utils/fontStyles";

const { width, height } = Dimensions.get("window");
const ITEM_WIDTH = width * 0.6;
const SPACING = 10;
const SIDE_PADDING = (width - ITEM_WIDTH) / 2;

const CommunityPicks = ({
  communityPicks,
  communityPicksLoading,
  communityPicksRef,
}) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();

  // Safe image source utility function
  const getSafeImageSource = (uri) => {
    if (uri && typeof uri === "string" && uri.trim() !== "") {
      return { uri };
    }
    return null;
  };

  // Navigate to product details
  const handleProductPress = (item) => {
    const productId = item._id || item.id;
    if (productId) {
      navigation.navigate("ProductDetails", {
        productId: productId,
        initialFavorite: !!item.isFavorite,
        initialData: item,
      });
    }
  };

  // Render Community Picks Item
  const renderCommunityPicksItem = ({ item, index }) => {
    const inputRange = [
      (index - 1) * ITEM_WIDTH,
      index * ITEM_WIDTH,
      (index + 1) * ITEM_WIDTH,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: "clamp",
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [1, 1, 1], // Changed from [0.5, 1, 0.5] to ensure cards are always solid white
      extrapolate: "clamp",
    });

    const descriptionOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: "clamp",
    });

    // Get the first image from the product
    const firstImage =
      item.images && item.images.length > 0 ? item.images[0].url : null;
    const safeImageSource = getSafeImageSource(firstImage);

    // Extract tags from description (first line before the main description)
    const descriptionLines = item.description
      ? item.description.split("\r\n")
      : [];
    const mainDescription =
      descriptionLines.length > 1
        ? descriptionLines.slice(1).join(" ")
        : item.description ||
        "A delicious and healthy meal option that combines fresh ingredients with amazing flavors.";

    return (
      <View style={{ width: ITEM_WIDTH }}>
        <Animated.View
          style={[
            tw`mx-2 bg-white rounded-xl p-3 shadow-sm`,
            {
              transform: [{ scale }],
              opacity, // Now always 1
              elevation: 4, // Android shadow
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.selectionAsync();
              handleProductPress(item);
            }}
          >
            {/* Product Image */}
            <View
              style={tw`w-full h-32 bg-white rounded-lg overflow-hidden mb-2`}
            >
              {safeImageSource ? (
                <Image
                  source={safeImageSource}
                  style={tw`w-full h-full`}
                  resizeMode="contain"
                />
              ) : (
                <View
                  style={tw`w-full h-full justify-center items-center bg-gray-100`}
                >
                  <Ionicons name="fast-food-outline" size={30} color="#9CA3AF" />
                  <Text style={tw`text-gray-400 text-[10px] mt-1`}>No Image</Text>
                </View>
              )}
            </View>

            {/* Product Title */}
            <Text
              style={[
                fontStyles.headingS,
                tw`text-sm text-gray-900 text-center mb-0.5`,
              ]}
              numberOfLines={1}
            >
              {item.name || "Product Name"}
            </Text>

            <Text style={[fontStyles.headingS, tw`text-xs font-semibold text-[#5F7F67] mb-1 text-center`]} numberOfLines={1}>
              {item.vendor?.kitchenName || item.kitchenName || "GoodBelly Kitchen"}
            </Text>

            {/* Product Description - Only visible when centered */}
            <Animated.View style={{ opacity: descriptionOpacity, height: 45 }}>
              <Text
                style={tw`text-xs text-gray-500 text-center leading-3`}
                numberOfLines={1}
              >
                {mainDescription.length > 80
                  ? mainDescription.substring(0, 80) + "..."
                  : mainDescription}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={tw`mt-2`}>

      {/* Reduced margin from mt-4 to mt-2 */}
      <View style={tw`px-4 mb-3`}>
        <Text
          style={[
            fontStyles.headingItalic,
            tw`text-base font-semibold text-black`,
          ]}
        >
          Community Picks
        </Text>
        <Text style={tw`text-xs text-gray-500 mt-0.5`}>
          What people have been loving recently
        </Text>
      </View>
      {communityPicksLoading ? (
        <View
          style={tw`h-60 justify-center items-center bg-white mx-4 rounded-xl`} // Changed bg-gray-50 to bg-white
        >
          <ActivityIndicator size="small" color="#6B9080" />
          <Text style={tw`text-gray-500 text-xs mt-2`}>
            Loading community picks...
          </Text>
        </View>
      ) : communityPicks.length > 0 ? (
        <Animated.FlatList
          ref={communityPicksRef}
          data={communityPicks}
          renderItem={renderCommunityPicksItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_WIDTH}
          decelerationRate="fast"
          bounces={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingHorizontal: SIDE_PADDING,
            alignItems: "center",
            paddingBottom: 20, // Increased paddingBottom for more space
            paddingTop: 10, // Added paddingTop to ensure items aren't cut
          }}
          style={tw`overflow-visible`} // Ensure content can overflow properly
          getItemLayout={(data, index) => ({
            length: ITEM_WIDTH,
            offset: ITEM_WIDTH * index,
            index,
          })}
        />
      ) : (
        <View
          style={tw`h-48 justify-center items-center bg-white mx-4 rounded-xl mb-4`} // Changed bg-gray-50 to bg-white
        >
          <Ionicons name="heart-outline" size={30} color="#9CA3AF" />
          <Text style={tw`text-gray-500 text-xs mt-2 text-center`}>
            No community picks available
          </Text>
        </View>
      )}
    </View>
  );
};

export default CommunityPicks;
