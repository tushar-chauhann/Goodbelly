import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TextInput,
  Modal,
  Animated,
  FlatList,
} from "react-native";
import tw from "twrnc";
import Icon from "react-native-vector-icons/MaterialIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import { fontStyles } from "../../utils/fontStyles";

const { width, height } = Dimensions.get("window");

const FilterOverlay = ({
  filterOpen,
  setFilterOpen,
  onClearAll,
  onApplyFilters,
  categories = [],
  occasions = [],
  initialFilters = {},
}) => {
  const [slideAnim] = useState(new Animated.Value(height));
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("dietary");

  // State from web code
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    initialFilters.categoryId || null
  );
  const [dietaryPreference, setDietaryPreference] = useState(
    initialFilters.dietaryPreference || ""
  );
  const [macroFilters, setMacroFilters] = useState(
    initialFilters.macroFilters || {
      calories: "",
      protein: "",
      carbs: "",
      fats: "",
    }
  );
  const [sortOption, setSortOption] = useState(initialFilters.sortOption || "");
  const [selectedOccasion, setSelectedOccasion] = useState(
    initialFilters.occasion || null
  );

  const flatListRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const itemHeight = 48;

  // Filter categories structure - Only show the filters you want
  const filterCategories = [
    { key: "dietary", title: "Dietary Preference" },
    { key: "calories", title: "Calories (kcal)" },
    { key: "protein", title: "Protein (g)" },
    { key: "carbs", title: "Carbs (g)" },
    { key: "fats", title: "Fats (g)" },
  ];

  // Animation effects
  useEffect(() => {
    if (filterOpen) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [filterOpen]);

  useEffect(() => {
    if (filterOpen && flatListRef.current) {
      const activeIndex = filterCategories.findIndex(
        (cat) => cat.key === activeCategory
      );
      if (activeIndex !== -1) {
        flatListRef.current.scrollToIndex({
          index: activeIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }
    }
  }, [activeCategory, filterOpen]);

  // Filter logic from web code
  const handleMacroFilterChange = (nutrient, value) => {
    setMacroFilters((prev) => ({
      ...prev,
      [nutrient]: prev[nutrient] === value ? "" : value,
    }));
  };

  const handleDietaryPreference = (preference) => {
    setDietaryPreference((prev) => (prev === preference ? "" : preference));
  };

  // Check if any filter is applied (from web code)
  const isAnyFilterApplied =
    dietaryPreference !== "" ||
    Object.values(macroFilters).some((value) => value !== "");

  const getSelectedCount = () => {
    let count = 0;
    if (dietaryPreference) count++;
    Object.values(macroFilters).forEach((value) => {
      if (value) count++;
    });
    return count;
  };

  const handleApplyFilters = () => {
    const filters = {
      dietaryPreference,
      macroFilters,
    };
    onApplyFilters(filters);
    setFilterOpen(false);
  };

  const handleClearAll = () => {
    setDietaryPreference("");
    setMacroFilters({
      calories: "",
      protein: "",
      carbs: "",
      fats: "",
    });
    onClearAll();
  };

  const handleBackdropPress = () => {
    setFilterOpen(false);
  };

  const handleCategoryPress = (categoryKey, index) => {
    setActiveCategory(categoryKey);
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: index,
        animated: true,
        viewPosition: 0.5,
      });
    }
  };

  // Render methods for different filter sections
  const renderCategoryItem = ({ item, index }) => {
    const isActive = activeCategory === item.key;

    return (
      <TouchableOpacity
        onPress={() => handleCategoryPress(item.key, index)}
        style={tw`flex-row items-center justify-between py-3 px-3 border-b border-gray-100 ${
          isActive ? "bg-gray-50" : "bg-white"
        }`}
      >
        <View style={tw`flex-row items-center flex-1`}>
          <Text
            style={[
              fontStyles.body,
              tw`text-sm ${isActive ? "font-semibold" : "font-normal"}`,
            ]}
          >
            {item.title}
          </Text>
        </View>

        {isActive && (
          <Animated.View
            style={[
              tw`absolute right-0 top-0 bottom-0 w-1 bg-[#5F7F67] rounded-l-full`,
              {
                marginVertical: 4,
                transform: [
                  {
                    translateY: scrollY.interpolate({
                      inputRange: [
                        (index - 1) * itemHeight,
                        index * itemHeight,
                        (index + 1) * itemHeight,
                      ],
                      outputRange: [0, 0, 0],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              },
            ]}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderDietarySection = () => (
    <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
      {[
        { value: "VEG", label: "Veg" },
        { value: "NON_VEG", label: "Non-Veg" },
        { value: "EGGETARIAN", label: "Eggetarian" },
      ].map((option) => (
        <TouchableOpacity
          key={option.value}
          onPress={() => handleDietaryPreference(option.value)}
          style={tw`flex-row items-center justify-between py-3 px-4 border-b border-gray-100`}
        >
          <View style={tw`flex-row items-center flex-1`}>
            <View
              style={tw`w-4 h-4 rounded-sm border border-gray-300 mr-3 items-center justify-center ${
                dietaryPreference === option.value
                  ? "bg-[#5F7F67] border-[#5F7F67]"
                  : "bg-white"
              }`}
            >
              {dietaryPreference === option.value && (
                <Icon name="check" size={12} color="white" />
              )}
            </View>
            <Text style={[fontStyles.body, tw`flex-1 text-sm`]}>
              {option.label}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderMacroSection = (nutrient, options) => (
    <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          onPress={() => handleMacroFilterChange(nutrient, option.value)}
          style={tw`flex-row items-center justify-between py-3 px-4 border-b border-gray-100`}
        >
          <View style={tw`flex-row items-center flex-1`}>
            <View
              style={tw`w-4 h-4 rounded-sm border border-gray-300 mr-3 items-center justify-center ${
                macroFilters[nutrient] === option.value
                  ? "bg-[#5F7F67] border-[#5F7F67]"
                  : "bg-white"
              }`}
            >
              {macroFilters[nutrient] === option.value && (
                <Icon name="check" size={12} color="white" />
              )}
            </View>
            <Text style={[fontStyles.body, tw`flex-1 text-sm`]}>
              {option.label}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderActiveSection = () => {
    switch (activeCategory) {
      case "dietary":
        return renderDietarySection();
      case "calories":
        return renderMacroSection("calories", [
          { value: "lowCal", label: "Low (<200 kcal)" },
          { value: "medCal", label: "Medium (201-400 kcal)" },
          { value: "highCal", label: "High (>400 kcal)" },
        ]);
      case "protein":
        return renderMacroSection("protein", [
          { value: "lowPro", label: "Low (<10g)" },
          { value: "medPro", label: "Medium (11-25g)" },
          { value: "highPro", label: "High (>25g)" },
        ]);
      case "carbs":
        return renderMacroSection("carbs", [
          { value: "lowCarb", label: "Low (<15g)" },
          { value: "medCarb", label: "Medium (16-30g)" },
          { value: "highCarb", label: "High (>30g)" },
        ]);
      case "fats":
        return renderMacroSection("fats", [
          { value: "lowFat", label: "Low (<10g)" },
          { value: "medFat", label: "Medium (11-20g)" },
          { value: "highFat", label: "High (>20g)" },
        ]);
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={filterOpen}
      transparent
      animationType="none"
      onRequestClose={() => setFilterOpen(false)}
    >
      <View style={tw`flex-1 bg-black/50`}>
        <TouchableOpacity
          style={tw`flex-1`}
          activeOpacity={1}
          onPress={handleBackdropPress}
        >
          <View style={tw`flex-1`} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilterOpen(false)}
          style={tw`absolute top-35 right-41 z-50 w-9 h-9 items-center justify-center bg-[#5F7F67] rounded-full shadow-lg`}
        >
          <Icon name="close" size={24} color="#ffffff" />
        </TouchableOpacity>

        <Animated.View
          style={[
            tw`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl`,
            {
              transform: [{ translateY: slideAnim }],
              height: height * 0.75,
            },
          ]}
        >
          <View style={tw`px-4 py-4 border-b border-gray-200`}>
            <Text
              style={[
                fontStyles.headingS,
                tw`text-lg font-semibold text-gray-900 text-center`,
              ]}
            >
              Filters
            </Text>
          </View>

          <View style={tw`flex-1 flex-row`}>
            <View style={tw`w-1/3 border-r border-gray-200 bg-white`}>
              <Animated.FlatList
                ref={flatListRef}
                data={filterCategories}
                keyExtractor={(item) => item.key}
                renderItem={renderCategoryItem}
                showsVerticalScrollIndicator={false}
                style={tw`flex-1`}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                  { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
                onScrollToIndexFailed={(info) => {
                  const wait = new Promise((resolve) =>
                    setTimeout(resolve, 500)
                  );
                  wait.then(() => {
                    flatListRef.current?.scrollToOffset({
                      offset: info.averageItemLength * info.index,
                      animated: true,
                    });
                  });
                }}
                getItemLayout={(data, index) => ({
                  length: itemHeight,
                  offset: itemHeight * index,
                  index,
                })}
              />
            </View>

            <View style={tw`w-2/3 bg-white`}>
              <View style={tw`flex-1`}>
                <View style={tw`bg-gray-50 px-4 py-2 border-b border-gray-200`}>
                  <Text
                    style={[
                      fontStyles.headingS,
                      tw`text-gray-900 font-semibold text-sm`,
                    ]}
                  >
                    {
                      filterCategories.find((cat) => cat.key === activeCategory)
                        ?.title
                    }
                  </Text>
                </View>
                {renderActiveSection()}
              </View>
            </View>
          </View>

          <View style={tw`flex-row border-t border-gray-200 px-4 py-3`}>
            <TouchableOpacity
              onPress={handleClearAll}
              style={tw`flex-1 border border-gray-300 rounded-lg py-2 items-center mr-2 bg-white ${
                !isAnyFilterApplied ? "opacity-50" : "opacity-100"
              }`}
              disabled={!isAnyFilterApplied}
            >
              <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>
                Clear All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApplyFilters}
              style={tw`flex-1 bg-[#5F7F67] rounded-lg py-2 items-center ml-2 ${
                !isAnyFilterApplied ? "opacity-50" : "opacity-100"
              }`}
              disabled={!isAnyFilterApplied}
            >
              <Text style={[fontStyles.bodyBold, tw`text-white text-sm`]}>
                Apply {getSelectedCount() > 0 ? `(${getSelectedCount()})` : ""}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default FilterOverlay;
