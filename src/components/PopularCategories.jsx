import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import tw from "twrnc";
import { authService } from "../services/authService.js";
import { useDispatch, useSelector } from "react-redux";
import { fetchOccasionsRedux } from "../redux/slicer";

const getBackgroundColor = (index) => {
  const colors = ["#FFF9F0", "#FFF5E6", "#FFF0E6", "#FFEBE6", "#FFE6E6"];
  return colors[index % colors.length];
};

const PopularCategories = () => {
  const [occasions, setOccasions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const dispatch = useDispatch();
  const { items: reduxOccasions, status: occasionsStatus } = useSelector((state) => state.occasions);

  useEffect(() => {
    if (reduxOccasions && reduxOccasions.length > 0) {
      const transformedOccasions = reduxOccasions.map((occasion, index) => ({
        id: occasion.id || occasion._id,
        name: occasion.label || occasion.name,
        image: occasion.icon || occasion.image,
        bgColor: getBackgroundColor(index),
        key: occasion.key,
      }));
      setOccasions(transformedOccasions);
      setLoading(false);
    } else if (occasionsStatus === 'failed') {
      setLoading(false);
      setError("Failed to load categories");
    }
  }, [reduxOccasions, occasionsStatus]);

  useEffect(() => {
    dispatch(fetchOccasionsRedux());
  }, [dispatch]);

  const fetchOccasions = () => {
    dispatch(fetchOccasionsRedux(true));
  };

  if (loading) {
    return (
      <View style={tw`py-5 bg-white items-center justify-center`}>
        <ActivityIndicator size="small" color="#000" />
        <Text style={tw`text-sm text-gray-500 mt-2`}>
          Loading categories...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={tw`py-5 bg-white items-center justify-center`}>
        <Text style={tw`text-sm text-red-500`}>{error}</Text>
        <TouchableOpacity
          onPress={fetchOccasions}
          style={tw`mt-2 px-4 py-2 bg-gray-200 rounded-lg`}
        >
          <Text style={tw`text-sm text-gray-700`}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (occasions.length === 0) {
    return (
      <View style={tw`py-5 bg-white items-center justify-center`}>
        <Text style={tw`text-sm text-gray-500`}>No categories available</Text>
      </View>
    );
  }

  return (
    <View style={tw`py-5 bg-white`}>
      <Text style={tw`text-base font-bold text-black mb-4 px-4`}>
        What Comes In your mind
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw`px-4`}
      >
        {occasions.map((occasion) => (
          <TouchableOpacity
            key={occasion.id}
            style={tw`items-center mr-4 w-25`}
            activeOpacity={0.8}
          >
            <View
              style={[
                tw`w-23 h-23 rounded-2xl justify-center items-center mb-2 shadow-sm`,
                { backgroundColor: occasion.bgColor },
              ]}
            >
              {occasion.image ? (
                <Image
                  source={{ uri: occasion.image }}
                  style={tw`w-20 h-20 rounded-xl`}
                  resizeMode="cover"
                  onError={() =>
                    console.log(`Failed to load image for ${occasion.name}`)
                  }
                />
              ) : (
                <View
                  style={tw`w-20 h-20 rounded-xl bg-gray-300 justify-center items-center`}
                >
                  <Text style={tw`text-xs text-gray-500`}>No Image</Text>
                </View>
              )}
            </View>
            <Text style={tw`text-sm font-semibold text-gray-800 text-center`}>
              {occasion.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default PopularCategories;
