import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import tw from "twrnc";
import { authService } from "../../services/authService.js";
import { toast } from "../../utils/toast";
import { fontStyles } from "../../utils/fontStyles.js";

const mealOrder = ["BREAKFAST", "LUNCH", "DINNER"];
const mealTimeWindows = {
  BREAKFAST: [
    { startTime: "07:00", endTime: "08:00" },
    { startTime: "08:00", endTime: "09:00" },
    { startTime: "09:00", endTime: "10:00" },
  ],
  LUNCH: [
    { startTime: "12:00", endTime: "13:00" },
    { startTime: "13:00", endTime: "14:00" },
    { startTime: "14:00", endTime: "15:00" },
  ],
  DINNER: [
    { startTime: "18:00", endTime: "19:00" },
    { startTime: "19:00", endTime: "20:00" },
    { startTime: "20:00", endTime: "21:00" },
  ],
};

const getMealTimeWindows = (mealType) => mealTimeWindows[mealType] || [];

const MealPlanner = ({ vendor, onMealSelectionChange }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [visibleCount, setVisibleCount] = useState(8);

  // Weekly schedule state - matches website pattern
  const [selectedDay, setSelectedDay] = useState("MONDAY");
  const [weeklySchedule, setWeeklySchedule] = useState({});

  const prevPayloadRef = useRef(null);

  // Days of week configuration - using full names to match website
  const daysOfWeek = [
    { key: "MONDAY", label: "MON" },
    { key: "TUESDAY", label: "TUE" },
    { key: "WEDNESDAY", label: "WED" },
    { key: "THURSDAY", label: "THU" },
    { key: "FRIDAY", label: "FRI" },
    { key: "SATURDAY", label: "SAT" },
    { key: "SUNDAY", label: "SUN" },
  ];

  // Get current day's data from weekly schedule - with safe defaults
  const currentDaySchedule = useMemo(() => {
    const dayData = weeklySchedule[selectedDay];
    return {
      mealType: dayData?.mealType || "BREAKFAST",
      items: dayData?.items || [],
      timing: dayData?.timing || null,
    };
  }, [weeklySchedule, selectedDay]);

  useEffect(() => {
    if (!vendor?.id) {
      setProducts([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await authService.getVendorProducts(vendor.id);
        console.log("Products API response:", response);

        let productsData = [];
        if (response?.data?.data) {
          productsData = response.data.data;
        } else if (response?.data) {
          productsData = response.data;
        } else if (Array.isArray(response)) {
          productsData = response;
        }

        console.log("Processed products data:", productsData);
        if (mounted) {
          setProducts(Array.isArray(productsData) ? productsData : []);
        }
      } catch (error) {
        console.error("Failed to fetch products", error);
        toast.error("Failed to load menu items");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProducts();
    return () => {
      mounted = false;
    };
  }, [vendor?.id]);

  useEffect(() => {
    if (!products || !products.length) {
      setFilteredProducts([]);
      return;
    }

    const keyword = currentDaySchedule.mealType.toLowerCase();

    const filtered = products.filter((product) => {
      const productName = (product.name || "").toLowerCase();
      const categoryName = (product.category?.name || "").toLowerCase();
      const description = (product.description || "").toLowerCase();

      if (keyword === "breakfast") {
        return (
          productName.includes("smoothie") ||
          productName.includes("shake") ||
          productName.includes("egg") ||
          productName.includes("pancake") ||
          productName.includes("coffee") ||
          productName.includes("tea") ||
          description.includes("breakfast")
        );
      }

      if (keyword === "lunch") {
        return (
          productName.includes("sandwich") ||
          productName.includes("wrap") ||
          productName.includes("salad") ||
          productName.includes("rice") ||
          productName.includes("bowl") ||
          productName.includes("thali") ||
          description.includes("lunch")
        );
      }

      if (keyword === "dinner") {
        return (
          productName.includes("curry") ||
          productName.includes("pasta") ||
          productName.includes("pizza") ||
          productName.includes("dinner") ||
          description.includes("dinner") ||
          categoryName === "balance"
        );
      }

      return true;
    });

    setVisibleCount(8);
    setFilteredProducts(filtered.length > 0 ? filtered : products);
  }, [currentDaySchedule.mealType, products]);



  // Handle item toggle for current day - matches website pattern
  const handleItemToggle = (
    productId,
    weightId,
    price,
    productName,
    weight,
    image
  ) => {
    setWeeklySchedule((prevSchedule) => {
      const daySchedule = prevSchedule[selectedDay] || {
        mealType: "BREAKFAST",
        items: [],
        timing: null,
      };

      const exists = daySchedule.items.findIndex(
        (i) => i.itemId === productId && i.weightId === weightId
      );

      let updatedItems;
      if (exists > -1) {
        // Remove item
        updatedItems = daySchedule.items.filter((_, idx) => idx !== exists);
      } else {
        // Add item
        updatedItems = [
          ...daySchedule.items,
          {
            itemId: productId,
            weightId,
            price,
            name: productName,
            weight,
            image,
            quantity: 1,
          },
        ];
      }

      return {
        ...prevSchedule,
        [selectedDay]: {
          ...daySchedule,
          items: updatedItems,
        },
      };
    });
  };

  // Update parent with weekly schedule - matches website pattern
  useEffect(() => {
    const prevStr = prevPayloadRef.current ? JSON.stringify(prevPayloadRef.current) : null;
    const currStr = JSON.stringify(weeklySchedule);

    if (prevStr !== currStr) {
      prevPayloadRef.current = weeklySchedule;
      if (typeof onMealSelectionChange === "function") {
        try {
          onMealSelectionChange(weeklySchedule);
        } catch (err) {
          console.error("onMealSelectionChange handler threw:", err);
        }
      }
    }
  }, [weeklySchedule, onMealSelectionChange]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center py-8`}>
        <ActivityIndicator size="large" color="#7a9b8e" />
        <Text style={tw`text-gray-600 mt-2 text-xs`}>Loading menu...</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1`}>
      {/* Select Day of Week */}
      <View style={tw`mb-4`}>
        <Text style={tw`text-sm font-semibold text-gray-800 mb-3`}>
          Select Day of Week
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={tw`flex-row gap-2`}>
            {daysOfWeek.map((day) => (
              <TouchableOpacity
                key={day.key}
                style={tw`px-4 py-2 rounded-xl border ${selectedDay === day.key
                  ? "border-[#7a9b8e] bg-[#7a9b8e]"
                  : "border-gray-200 bg-white"
                  }`}
                onPress={() => setSelectedDay(day.key)}
              >
                <Text
                  style={tw`text-center font-semibold text-xs ${selectedDay === day.key ? "text-white" : "text-gray-600"
                    }`}
                >
                  {day.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Meal Type Buttons */}
      <View style={tw`mb-4`}>
        <Text style={tw`text-xs text-gray-600 mb-2`}>
          Meal Type
        </Text>
        <View style={tw`flex-row gap-2`}>
          {mealOrder.map((mealKey) => (
            <TouchableOpacity
              key={mealKey}
              style={tw`flex-1 rounded-xl border p-2 ${currentDaySchedule.mealType === mealKey
                ? "border-[#7a9b8e] bg-[#7a9b8e]"
                : "border-gray-200 bg-white"
                }`}
              onPress={() => {
                setWeeklySchedule((prev) => ({
                  ...prev,
                  [selectedDay]: {
                    ...currentDaySchedule,
                    mealType: mealKey,
                    timing: null,
                  },
                }));
                setVisibleCount(8);
              }}
            >
              <Text
                style={tw`text-center font-semibold text-xs ${currentDaySchedule.mealType === mealKey ? "text-white" : "text-gray-600"
                  }`}
              >
                {mealKey.charAt(0) + mealKey.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Time Windows */}
      <View style={tw`mb-4`}>
        <Text style={tw`text-xs text-gray-600 mb-2`}>
          Select a delivery window for {currentDaySchedule.mealType.toLowerCase()}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={tw`flex-row gap-2`}>
            {getMealTimeWindows(currentDaySchedule.mealType).map((window, idx) => (
              <TouchableOpacity
                key={idx}
                style={tw`rounded-xl border p-2 min-w-28 ${JSON.stringify(currentDaySchedule.timing) === JSON.stringify(window)
                  ? "border-[#7a9b8e] bg-[#7a9b8e]"
                  : "border-gray-200 bg-white"
                  }`}
                onPress={() => {
                  setWeeklySchedule((prev) => ({
                    ...prev,
                    [selectedDay]: {
                      ...currentDaySchedule,
                      timing: window,
                    },
                  }));
                }}
              >
                <Text
                  style={tw`text-center font-semibold text-xs ${JSON.stringify(currentDaySchedule.timing) === JSON.stringify(window) ? "text-white" : "text-gray-600"
                    }`}
                >
                  {window.startTime}-{window.endTime}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Products Grid */}
      <View style={tw`bg-white rounded-xl p-2 flex-1`}>
        <Text
          style={[
            fontStyles.headingS,
            tw`text-base font-semibold text-gray-800 capitalize`,
          ]}
        >
          {currentDaySchedule.mealType.toLowerCase()} Menu
        </Text>
        <Text style={tw`text-xs text-gray-500 mt-1`}>
          {filteredProducts.length} available options
        </Text>

        {filteredProducts.length === 0 ? (
          <View style={tw`flex-1 justify-center items-center py-8`}>
            <Text style={tw`text-gray-500 text-center text-xs`}>
              No products found.{"\n"}
              Please check back later.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={tw`mt-3`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw`pb-4`}
          >
            <View style={tw`gap-3`}>
              {visibleProducts.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  onItemToggle={handleItemToggle}
                  selectedItems={currentDaySchedule.items}
                />
              ))}
            </View>

            {/* Show More Button */}
            {visibleCount < filteredProducts.length && (
              <View style={tw`flex justify-center mt-4`}>
                <TouchableOpacity
                  style={tw`px-4 py-2 rounded-lg border border-[#7a9b8e]`}
                  onPress={() =>
                    setVisibleCount((prev) =>
                      Math.min(prev + 8, filteredProducts.length)
                    )
                  }
                >
                  <Text
                    style={tw`text-[#7a9b8e] font-semibold text-center text-xs`}
                  >
                    Show More ({filteredProducts.length - visibleCount} more)
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Selected Items Summary for Current Day */}
      {currentDaySchedule.items.length > 0 && (
        <View style={tw`bg-white border-t border-gray-200 p-3 mt-3`}>
          <Text style={[fontStyles.headingS, tw`text-gray-900 mb-2`]}>
            Selected for {selectedDay} ({currentDaySchedule.items.length})
          </Text>
          {currentDaySchedule.items.map((item, index) => (
            <View key={index} style={tw`flex-row justify-between py-1`}>
              <Text style={tw`text-gray-600 text-xs`}>
                {item.name} - {item.weight}
              </Text>
              <Text style={tw`font-semibold text-gray-900 text-xs`}>
                ₹{item.price}
              </Text>
            </View>
          ))}
          <View
            style={tw`flex-row justify-between pt-2 border-t border-gray-200 mt-2`}
          >
            <Text style={tw`font-semibold text-gray-900 text-sm`}>
              Day Total
            </Text>
            <Text style={tw`font-bold text-base text-[#7a9b8e]`}>
              ₹{currentDaySchedule.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

// Product Card Component
const ProductCard = ({ product, onItemToggle, selectedItems = [] }) => {
  const navigation = useNavigation();
  const [selectedWeight, setSelectedWeight] = useState(
    product.weights?.[0] || null
  );

  const isSelected = !!selectedItems.find(
    (s) =>
      s.itemId === product.id && s.weightId === (selectedWeight?.id || null)
  );

  const handleItemSelect = () => {
    if (!selectedWeight?.id) {
      toast.info("Please select a weight");
      return;
    }

    const imageUrl = product.images?.[0]?.url || product.images?.[0] || "";

    onItemToggle(
      product.id,
      selectedWeight.id,
      selectedWeight.discountPrice || selectedWeight.price,
      product.name,
      selectedWeight.weight,
      imageUrl
    );
  };

  const navigateToProductDetails = () => {
    navigation.navigate("ProductDetails", {
      productId: product.id,
      productName: product.name,
    });
  };

  const imageUrl = product.images?.[0]?.url || product.images?.[0] || "";
  const price = selectedWeight?.discountPrice || selectedWeight?.price || 0;
  const originalPrice = selectedWeight?.price || 0;
  const discount =
    originalPrice && price && originalPrice !== price
      ? `${Math.round(((originalPrice - price) / originalPrice) * 100)}%`
      : "";

  return (
    <View style={tw`bg-white rounded-xl p-3 border border-gray-200`}>
      <TouchableOpacity onPress={navigateToProductDetails}>
        <View style={tw`flex-row items-start`}>
          <Image
            source={{ uri: imageUrl || "https://via.placeholder.com/100" }}
            style={tw`w-16 h-16 rounded-full mr-3`}
            resizeMode="cover"
          />
          <View style={tw`flex-1`}>
            <Text
              style={[
                fontStyles.headingS,
                tw`text-sm font-semibold text-gray-800 mb-1`,
              ]}
            >
              {product.name}
            </Text>
            <Text
              style={tw`text-gray-500 text-[10px] leading-[14px]`}
              numberOfLines={2}
            >
              {product.description}
            </Text>

            <View style={tw`flex-row items-center mt-1`}>
              <Text
                style={[
                  fontStyles.headingS,
                  tw`text-sm font-semibold text-gray-800`,
                ]}
              >
                ₹{price}
              </Text>
              {originalPrice !== price && (
                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-xs line-through text-gray-400 ml-1`,
                  ]}
                >
                  ₹{originalPrice}
                </Text>
              )}
              {discount && (
                <Text style={tw`text-xs text-green-600 font-medium ml-1`}>
                  {discount} off
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Weight Selection and Add/Remove Button in same row */}
      <View style={tw`mt-2 flex-row justify-between items-center`}>
        {/* Weight Selection */}
        {product.weights && product.weights.length > 0 && (
          <View style={tw`flex-1 flex-row gap-1 flex-wrap`}>
            {product.weights.map((weight) => (
              <TouchableOpacity
                key={weight.id}
                style={tw`rounded-full border px-2 py-1 ${selectedWeight?.id === weight.id
                  ? "border-[#7a9b8e] bg-[#7a9b8e]/10"
                  : "border-gray-300"
                  }`}
                onPress={() => setSelectedWeight(weight)}
              >
                <Text
                  style={tw`text-xs ${selectedWeight?.id === weight.id
                    ? "text-[#7a9b8e] font-semibold"
                    : "text-gray-600"
                    }`}
                >
                  {weight.weight}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Add/Remove Button moved to right side */}
        <TouchableOpacity
          style={tw`ml-2 px-8 py-1 rounded-full ${isSelected ? "bg-[#7a9b8e]" : "bg-gray-200"
            }`}
          onPress={handleItemSelect}
        >
          <Text
            style={tw`text-center font-semibold text-xs ${isSelected ? "text-white" : "text-gray-700"
              }`}
          >
            {isSelected ? "Remove" : "Add"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MealPlanner;
