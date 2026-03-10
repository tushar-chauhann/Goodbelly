import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { authService } from "../services/authService.js";

const CategorySection = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("  Fetching categories from backend...");
      const response = await authService.getCategories();
      console.log("  API Response received");

      // Handle the API response structure
      if (
        response &&
        response.success &&
        response.data &&
        Array.isArray(response.data)
      ) {
        console.log(`  Found ${response.data.length} categories`);
        setCategories(response.data);
      } else {
        console.log("  No categories array found in response.data");
        setError("No categories data found");
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError("Failed to load categories. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={tw`py-4 bg-white`}>
        <View style={tw`px-4`}>
          <Text style={tw`text-lg font-bold text-gray-800 mb-3`}>
            Categories
          </Text>
          <View style={tw`flex-row justify-center items-center py-4`}>
            <ActivityIndicator size="small" color="#6B9080" />
            <Text style={tw`text-gray-600 ml-2`}>Loading categories...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={tw`py-4 bg-white`}>
        <View style={tw`px-4`}>
          <Text style={tw`text-lg font-bold text-gray-800 mb-3`}>
            Categories
          </Text>
          <View style={tw`flex-row justify-center items-center py-4`}>
            <Text style={tw`text-red-500 mr-2`}>{error}</Text>
            <TouchableOpacity onPress={fetchCategories}>
              <Text style={tw`text-[#6B9080] font-semibold`}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (categories.length === 0) {
    return (
      <View style={tw`py-4 bg-white`}>
        <View style={tw`px-4`}>
          <Text style={tw`text-lg font-bold text-gray-800 mb-3`}>
            Categories
          </Text>
          <View style={tw`flex-row justify-center py-4`}>
            <Text style={tw`text-gray-500`}>No categories available</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={tw`py-4 bg-white`}>
      <View style={tw`px-4 mb-3`}>
        <Text style={tw`text-lg font-bold text-gray-800`}>Categories</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw`px-4 gap-4`}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={tw`items-center w-20`}
            activeOpacity={0.7}
            onPress={() => {
              console.log("Category pressed:", category.name);
              // Handle category press - navigate to category products
            }}
          >
            <View
              style={tw`w-16 h-16 rounded-full justify-center items-center mb-2 border-2 border-gray-200 bg-gray-50`}
            >
              {category.image ? (
                <Image
                  source={{ uri: category.image }}
                  style={tw`w-14 h-14 rounded-full`}
                  resizeMode="cover"
                  onError={(e) =>
                    console.log("Image load error:", e.nativeEvent.error)
                  }
                />
              ) : (
                <Ionicons name="nutrition" size={35} color="#6B9080" />
              )}
            </View>
            <Text
              style={tw`text-xs text-gray-800 text-center font-semibold`}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default CategorySection;
