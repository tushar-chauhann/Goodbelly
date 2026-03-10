import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { fontStyles } from "../utils/fontStyles";

const CustomerFeedbacks = ({
  reviews,
  averageRating,
  reviewRating,
  setReviewRating,
  reviewComment,
  setReviewComment,
  reviewLoading,
  handleSubmitReview,
  showFeedback,
  setShowFeedback,
}) => {
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) {
        stars.push(<Ionicons key={i} name="star" size={14} color="#fbbf24" />);
      } else if (rating >= i - 0.5) {
        stars.push(
          <Ionicons key={i} name="star-half" size={14} color="#fbbf24" />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={14} color="#fbbf24" />
        );
      }
    }
    return stars;
  };

  return (
  <View style={tw`border border-gray-200 rounded-lg overflow-hidden`}>
    <TouchableOpacity 
      style={tw`flex-row justify-between items-center p-2.5 bg-gray-50`}
      onPress={() => setShowFeedback(!showFeedback)}
    >
      <Text style={[fontStyles.headingS, tw`text-sm text-gray-900`]}>
        Customer Feedbacks
      </Text>
      <Ionicons 
        name={showFeedback ? "chevron-up" : "chevron-down"} 
        size={16} 
        color="#6A8B78" 
      />
    </TouchableOpacity>

    {showFeedback && (
      <View style={tw`p-2.5 bg-white border-t border-gray-200`}>
        {/* Rating Overview */}
        <View style={tw`flex-row items-center mb-3`}>
          <Text style={tw`text-2xl font-bold text-gray-900 mr-2`}>
            {Number(averageRating).toFixed(1)}
          </Text>
          <View style={tw`flex-row mr-2`}>{renderStars(averageRating)}</View>
          <Text style={tw`text-xs text-gray-600`}>({reviews.length} reviews)</Text>
        </View>

        {/* Reviews List */}
        {reviews.length > 0 ? (
          reviews.map((reviewItem) => (
            <View
              key={reviewItem.id}
              style={tw`mb-3 pb-3 border-b border-gray-200`}
            >
              <View style={tw`flex-row justify-between items-start mb-1`}>
                <Text style={tw`font-semibold text-gray-900 text-xs`}>
                  {reviewItem.user?.name || "Anonymous"}
                </Text>
                <Text style={tw`text-gray-500 text-[10px]`}>
                  {new Date(reviewItem.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={tw`flex-row mb-2`}>
                {renderStars(reviewItem.rating)}
              </View>
              {reviewItem.comment && (
                <Text style={tw`text-gray-600 mb-2 text-xs`}>{reviewItem.comment}</Text>
              )}
              {reviewItem.image && (
                <Image
                  source={{ uri: reviewItem.image }}
                  style={tw`w-20 h-20 rounded-lg`}
                  resizeMode="cover"
                />
              )}
            </View>
          ))
        ) : (
          <View style={tw`items-center py-6`}>
            <Ionicons name="chatbubble-outline" size={32} color="#9ca3af" />
            <Text style={tw`text-gray-500 text-sm mt-2`}>No reviews yet</Text>
            <Text style={tw`text-gray-400 text-center mt-1`}>
              Be the first to review this consultant!
            </Text>
          </View>
        )}

        {/* Add Review Section */}
        <View style={tw`mt-3`}>
          <Text style={[fontStyles.headingS, tw`text-xs text-gray-900 mb-2`]}>
            Add Your Feedback
          </Text>

          {/* Rating Selection */}
          <Text style={tw`text-gray-700 mb-1 text-xs font-semibold`}>Your Rating</Text>
          <View style={tw`flex-row items-center mb-3`}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setReviewRating(star)}
                style={tw`mr-1`}
              >
                <Ionicons
                  name={reviewRating >= star ? "star" : "star-outline"}
                  size={20}
                  color={reviewRating >= star ? "#fbbf24" : "#d1d5db"}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Review Comment */}
          <Text style={tw`text-gray-700 mb-1 text-xs font-semibold`}>Your Feedback</Text>
          <TextInput
            style={tw`border border-gray-300 rounded-lg p-2 text-gray-700 text-xs min-h-16`}
            placeholder="Share your experience..."
            placeholderTextColor="#9ca3af"
            multiline
            value={reviewComment}
            onChangeText={setReviewComment}
          />

          {/* Submit Review Button */}
          <TouchableOpacity
            style={tw`bg-green-600 rounded-lg py-3 mt-3 ${
              reviewLoading ? "opacity-50" : ""
            }`}
            onPress={handleSubmitReview}
            disabled={reviewLoading}
          >
            {reviewLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={[fontStyles.headingS, tw`text-white text-center text-xs`]}>
                Submit Feedback
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    )}
  </View>
  );
};
  
export default CustomerFeedbacks;
