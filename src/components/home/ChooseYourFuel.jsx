import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";
import { useNavigation } from "@react-navigation/native";
import { FuelSkeleton } from "../ProductSkeleton";
import { authService } from "../../services/authService";
import { useDispatch, useSelector } from "react-redux";
import { fetchOccasionsRedux, fetchCategoriesRedux } from "../../redux/slicer";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

//   ADD: Helper function to determine device type and get responsive sizes
const getResponsiveSizes = () => {
  const isTablet = screenWidth >= 768;

  if (isTablet) {
    // Tablet sizing
    return {
      cardWidth: screenWidth * 0.35,
      iconSize: 64,
      fontSize: 12,
      marginHorizontal: 4,
      paddingVertical: 14,
      paddingHorizontal: 12,
    };
  } else if (screenWidth >= 414) {
    // Large phones (iPhone Pro Max, Plus models, large Android)
    return {
      cardWidth: screenWidth * 0.45,
      iconSize: 56,
      fontSize: 14,
      marginHorizontal: 3,
      paddingVertical: 12,
      paddingHorizontal: 10,
    };
  } else if (screenWidth >= 375) {
    // Medium phones (iPhone 12/13/14, standard Android)
    return {
      cardWidth: screenWidth * 0.45,
      iconSize: 52,
      fontSize: 12,
      marginHorizontal: 2,
      paddingVertical: 10,
      paddingHorizontal: 8,
    };
  } else {
    // Small phones (iPhone SE, small Android)
    return {
      cardWidth: screenWidth * 0.46,
      iconSize: 48,
      fontSize: 10,
      marginHorizontal: 2,
      paddingVertical: 9,
      paddingHorizontal: 7,
    };
  }
};

const ChooseYourFuel = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const sizes = getResponsiveSizes();

  const { items: reduxOccasions, status: occasionsStatus } = useSelector((state) => state.occasions);
  const { items: reduxCategories } = useSelector((state) => state.categories);

  useEffect(() => {
    let list = [];
    if (reduxOccasions && reduxOccasions.length > 0) {
      list = reduxOccasions;
    } else if (reduxCategories && reduxCategories.length > 0) {
      list = reduxCategories;
    }

    if (list.length > 0 || occasionsStatus === 'succeeded') {
      if (list.length === 0) {
        // Fallback for empty list
        list = [
          { id: "1", key: "pre", name: "Pre Workout" },
          { id: "2", key: "post", name: "Post Workout" },
          { id: "3", key: "snacks", name: "Snacks" },
          { id: "4", key: "lunch", name: "Lunch" },
          { id: "5", key: "cheat", name: "Healthy Cheat" },
          { id: "6", key: "dessert", name: "Dessert" },
        ];
      }

      const mapped = list.map((item, i) => ({
        id: item.id || String(i + 1),
        key:
          item.key ||
          (item.name ? item.name.toLowerCase().replace(/\s+/g, "-") : "") ||
          `category-${i + 1}`,
        name: item.label || item.name || `Category ${i + 1}`,
        image:
          item.icon ||
          item.image ||
          "https://cdn-icons-png.flaticon.com/512/706/706195.png",
      }));

      setCategories(mapped);
      setLoading(false);
    }
  }, [reduxOccasions, reduxCategories, occasionsStatus]);

  useEffect(() => {
    dispatch(fetchOccasionsRedux());
    dispatch(fetchCategoriesRedux());
  }, [dispatch]);

  const handleCategoryPress = (cat) => {
    navigation.navigate("SeeMoreButton", {
      selectedCategory: cat.key,
      categoryName: cat.name,
    });
  };

  const groupIntoFours = (arr) => {
    let out = [];
    for (let i = 0; i < arr.length; i += 4) {
      out.push(arr.slice(i, i + 4));
    }
    return out;
  };

  const groupedCards = groupIntoFours(categories);

  const renderCard = ({ item }) => (
    <View
      style={[
        tw`bg-white rounded-2xl`,
        {
          width: sizes.cardWidth, //   UPDATED: Responsive width
          paddingVertical: sizes.paddingVertical, //   UPDATED: Responsive padding
          paddingHorizontal: sizes.paddingHorizontal, //   UPDATED: Responsive padding
          marginHorizontal: sizes.marginHorizontal, //   UPDATED: Responsive margin
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowOffset: { width: 0, height: 3 },
          shadowRadius: 4,
          elevation: 2,
        },
      ]}
    >
      {/* TOP ROW */}
      <View style={tw`flex-row justify-between mb-2`}>
        {item.slice(0, 2).map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={tw`items-center flex-1 mx-1`}
            activeOpacity={0.9}
            onPress={() => handleCategoryPress(cat)}
          >
            <Image
              source={{ uri: cat.image }}
              style={{
                width: sizes.iconSize, //   UPDATED: Responsive icon size
                height: sizes.iconSize, //   UPDATED: Responsive icon size
                borderRadius: sizes.iconSize / 2,
              }}
            />
            <Text
              style={[
                fontStyles.body,
                {
                  fontSize: sizes.fontSize, //   UPDATED: Responsive font size
                  color: '#1F2937',
                  marginTop: 4,
                  textAlign: 'center',
                },
              ]}
              numberOfLines={2}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* BOTTOM ROW */}
      <View style={tw`flex-row justify-between`}>
        {item.slice(2, 4).map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={tw`items-center flex-1 mx-1`}
            activeOpacity={0.9}
            onPress={() => handleCategoryPress(cat)}
          >
            <Image
              source={{ uri: cat.image }}
              style={{
                width: sizes.iconSize, //   UPDATED: Responsive icon size
                height: sizes.iconSize, //   UPDATED: Responsive icon size
                borderRadius: sizes.iconSize / 2,
              }}
            />
            <Text
              style={[
                fontStyles.body,
                {
                  fontSize: sizes.fontSize, //   UPDATED: Responsive font size
                  color: '#1F2937',
                  marginTop: 4,
                  textAlign: 'center',
                },
              ]}
              numberOfLines={2}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading)
    return (
      <View style={tw`mt-1 px-3`}>
        <Text
          style={[fontStyles.headingItalic, tw`text-base font-semibold`]}
        >
          Choose your fuel
        </Text>
        <FuelSkeleton />
      </View>
    );

  return (
    <View style={tw`mt-1 px-3`}>
      <Text
        style={[
          fontStyles.headingItalic,
          tw`text-lg font-semibold text-black`,
        ]}
      >
        Choose your fuel
      </Text>

      <FlatList
        data={groupedCards}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderCard}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw`py-2`}
      />
    </View>
  );
};

export default ChooseYourFuel;
