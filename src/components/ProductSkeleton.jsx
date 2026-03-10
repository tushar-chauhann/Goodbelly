import React from "react";
import { View, Dimensions, ScrollView, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";

const { width: screenWidth } = Dimensions.get("window");

const ProductSkeleton = ({ style }) => (
  <View style={[tw`w-[160px] mr-4 mb-2`, style]}>
    <View
      style={[
        tw`bg-white rounded-2xl p-3 border border-gray-200`,
        tw`shadow-lg shadow-black/10`,
      ]}
    >
      <View style={tw`w-full h-28 bg-gray-100 rounded-xl mb-2`} />
      <View style={tw`flex-1 justify-between`}>
        <View>
          <View style={tw`h-3 bg-gray-100 rounded w-3/4 mb-1`} />
          <View style={tw`h-3 bg-gray-100 rounded w-1/2 mb-2`} />
        </View>
        <View style={tw`flex-row justify-between items-center mt-2`}>
          <View style={tw`h-4 w-12 bg-gray-100 rounded`} />
          <View style={tw`h-8 w-16 bg-gray-100 rounded-xl`} />
        </View>
      </View>
    </View>
  </View>
);

export const CategorySkeleton = () => (
  <View style={tw`flex-row pb-2`}>
    {[1, 2, 3, 4, 5].map((item) => (
      <View
        key={item}
        style={tw`bg-gray-200 rounded-full h-8 w-20 mr-2.5`}
      />
    ))}
  </View>
);

export const FuelSkeleton = () => (
  <View style={tw`flex-row py-2`}>
    {[1, 2, 3].map((cardIndex) => (
      <View
        key={cardIndex}
        style={[
          tw`bg-white rounded-2xl`,
          {
            width: screenWidth * 0.45,
            paddingVertical: 10,
            paddingHorizontal: 8,
            marginHorizontal: 2,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowOffset: { width: 0, height: 3 },
            shadowRadius: 4,
            elevation: 2,
          },
        ]}
      >
        {/* TOP ROW - 2 items */}
        <View style={tw`flex-row justify-between mb-2`}>
          {[1, 2].map((item) => (
            <View key={item} style={tw`items-center flex-1 mx-1`}>
              <View style={tw`w-12 h-12 bg-gray-200 rounded-full`} />
              <View style={tw`w-10 h-2 bg-gray-200 rounded mt-1`} />
              <View style={tw`w-8 h-2 bg-gray-200 rounded mt-0.5`} />
            </View>
          ))}
        </View>

        {/* BOTTOM ROW - 2 items */}
        <View style={tw`flex-row justify-between`}>
          {[1, 2].map((item) => (
            <View key={item} style={tw`items-center flex-1 mx-1`}>
              <View style={tw`w-12 h-12 bg-gray-200 rounded-full`} />
              <View style={tw`w-10 h-2 bg-gray-200 rounded mt-1`} />
              <View style={tw`w-8 h-2 bg-gray-200 rounded mt-0.5`} />
            </View>
          ))}
        </View>
      </View>
    ))}
  </View>
);

// Matches CategoryTabs layout: Horizontal list of items with Circle Icon + Text Label
export const HomeCategorySkeleton = () => (
  <View style={tw`flex-row px-4 pt-3 pb-2 w-full`}>
    {[1, 2, 3, 4, 5].map((item) => (
      <View key={item} style={tw`items-center mr-6`}>
        {/* Circle Icon - Avg size ~48px */}
        <View
          style={[
            tw`rounded-full bg-gray-600 opacity-40 mb-2`,
            { width: 48, height: 48 },
          ]}
        />
        {/* Label Line */}
        <View style={[tw`h-2.5 rounded bg-gray-600 opacity-40`, { width: 40 }]} />
      </View>
    ))}
  </View>
);

export const ConsultantSkeleton = () => (
  <View style={tw`flex-1 bg-white`}>
    {/* Banner Skeleton */}
    <View style={tw`w-full h-72 bg-gray-200 animate-pulse`} />

    {/* Header Info Skeleton */}
    <View style={tw`px-4 pt-4`}>
      <View style={tw`flex-row justify-between items-start mb-4`}>
        <View style={tw`flex-1`}>
          <View style={tw`h-6 bg-gray-200 w-3/4 rounded mb-2`} />
          <View style={tw`h-4 bg-gray-200 w-1/2 rounded mb-3`} />

          <View style={tw`flex-row items-center`}>
            <View style={tw`h-4 bg-gray-200 w-16 rounded mr-3`} />
            <View style={tw`h-4 bg-gray-200 w-24 rounded`} />
          </View>
        </View>
        <View style={tw`w-10 h-10 bg-gray-200 rounded-full`} />
      </View>

      {/* Stats/Info Cards Skeleton */}
      <View style={tw`flex-row justify-between mb-4`}>
        <View style={tw`flex-1 h-20 bg-gray-100 rounded-2xl mr-2`} />
        <View style={tw`flex-1 h-20 bg-gray-100 rounded-2xl ml-2`} />
      </View>

      <View style={tw`h-16 bg-gray-100 rounded-2xl mb-4`} />
    </View>
  </View>
);

// HorizontalCardSkeleton (for HighStandards)
export const HorizontalCardSkeleton = () => (
  // Matched styling from HighStandards.jsx:
  // tw`bg-white rounded-2xl p-3 border border-gray-100 flex-row shadow-sm`
  // Note: Parent container in HighStandards uses mb-4, so we keep mb-4 here if it's not wrapped,
  // BUT HighStandards wraps it in a View with mb-4.
  // Let's check HighStandards usage:
  // <View style={tw`mb-4`}> <HorizontalCardSkeleton /> </View>
  // So we should REMOVE mb-4 from the skeleton itself if the usage adds it on the container?
  // HighStandards Loop:
  // <View key={i} style={tw`mb-4`}> <HorizontalCardSkeleton /> </View>
  // So the skeleton itself should NOT have mb-4 if we want it to fit INSIDE that wrapper perfectly,
  // OR the wrapper provides the spacing.
  // The original Skeleton had `mb-4 mx-4`.
  // The HighStandards `renderProductCard` has `mb-4` on wrapper, and the card is `w-full`.
  // The HighStandards `loading` block maps and puts `HorizontalCardSkeleton` inside a View with `mb-4`.
  // So we should remove `mb-4` from here.
  // ALSO `mx-4` was in original skeleton. In HighStandards, the list container has `px-4`.
  // The loading container has `px-4`.
  // So we should REMOVE `mx-4` from here as well.

  <View style={tw`bg-white rounded-2xl p-3 border border-gray-100 flex-row shadow-sm w-full`}>
    {/* Image Placeholder: Matches w-28 h-28 rounded-xl */}
    <View style={tw`w-28 h-28 bg-gray-200 rounded-xl`} />

    {/* Content Container: Matches flex-1 ml-3 justify-between */}
    <View style={tw`flex-1 ml-3 justify-between`}>
      <View>
        {/* Title Line */}
        <View style={tw`h-3.5 bg-gray-200 rounded w-3/4 mb-2`} />
        {/* Description Line */}
        <View style={tw`h-3 bg-gray-200 rounded w-full mb-1.5`} />
        {/* Vendor Name */}
        <View style={tw`h-3 bg-gray-200 rounded w-1/2 mb-2`} />
        {/* Extra info (protein/customizable) */}
        <View style={tw`h-2.5 bg-gray-200 rounded w-1/3`} />
      </View>

      {/* Bottom Row: Price and Button */}
      <View style={tw`flex-row justify-between items-center mt-2`}>
        {/* Price */}
        <View style={tw`h-4 w-16 bg-gray-200 rounded`} />
        {/* Add Button */}
        <View style={tw`h-7 w-[70px] bg-gray-200 rounded-lg`} />
      </View>
    </View>
  </View>
);



// Collection Card Skeleton (for CuratedCollections)
export const CollectionCardSkeleton = () => (
  <View style={tw`w-48 mr-3`}>
    <View style={tw`bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm`}>
      <View style={tw`w-full h-40 bg-gray-200`} />
      <View style={tw`p-3`}>
        <View style={tw`h-4 bg-gray-200 rounded w-3/4 mb-2`} />
        <View style={tw`h-3 bg-gray-200 rounded w-full mb-1.5`} />
        <View style={tw`h-3 bg-gray-200 rounded w-2/3`} />
      </View>
    </View>
  </View>
);

// Grid Product Skeleton (for ProductsByIngredients)
export const GridProductSkeleton = () => (
  <View style={[tw`m-1`, { width: (screenWidth - 44) / 2 }]}>
    <View
      style={[
        tw`bg-white rounded-2xl p-3 border border-gray-200 shadow-lg shadow-black/10`,
        { height: 280 }
      ]}
    >
      {/* Image Placeholder */}
      <View style={tw`w-full h-28 bg-gray-200 rounded-xl mb-2`} />

      <View style={tw`flex-1 justify-between`}>
        <View>
          {/* Title Line */}
          <View style={tw`h-3.5 bg-gray-200 rounded w-3/4 mb-1.5`} />
          {/* Description Line */}
          <View style={tw`h-3 bg-gray-200 rounded w-full mb-1.5`} />
          {/* Vendor Name */}
          <View style={tw`h-3 bg-gray-200 rounded w-1/2 mb-2`} />
          {/* Customisable Tag */}
          <View style={tw`h-2.5 bg-gray-200 rounded w-1/3`} />
        </View>

        {/* Bottom Row: Price and Button */}
        <View style={tw`flex-row justify-between items-center mt-2`}>
          {/* Price */}
          <View style={tw`h-4 w-12 bg-gray-200 rounded`} />
          {/* Add Button */}
          <View style={tw`h-7 w-[70px] bg-gray-200 rounded-lg`} />
        </View>
      </View>
    </View>
  </View>
);

// Kitchen Product Skeleton (for BrowseByKitchen & SearchScreen)
// Matches card width=w-40 (160px), mr-3, mb-4, height: 280
export const KitchenProductSkeleton = () => (
  <View style={tw`w-40 mr-3 mb-4`}>
    <View
      style={[
        tw`bg-white rounded-2xl p-3 border border-gray-200 shadow-lg shadow-black/10`,
        { height: 280 }
      ]}
    >
      {/* Image Placeholder */}
      <View style={tw`w-full h-32 bg-gray-200 rounded-xl mb-2`} />

      <View style={tw`flex-1 justify-between`}>
        <View>
          {/* Title Line */}
          <View style={tw`h-3.5 bg-gray-200 rounded w-3/4 mb-1.5`} />
          {/* Description Line */}
          <View style={tw`h-3 bg-gray-200 rounded w-full mb-1.5`} />
          {/* Vendor Name */}
          <View style={tw`h-3 bg-gray-200 rounded w-1/2 mb-2`} />
          {/* Customisable Tag */}
          <View style={tw`h-2.5 bg-gray-200 rounded w-1/3`} />
        </View>

        {/* Bottom Row: Price and Button */}
        <View style={tw`flex-row justify-between items-center mt-2`}>
          {/* Price */}
          <View style={tw`h-4 w-12 bg-gray-200 rounded`} />
          {/* Add Button */}
          <View style={tw`h-7 w-[70px] bg-gray-200 rounded-lg`} />
        </View>
      </View>
    </View>
  </View>
);

// Community Pick Skeleton
export const CommunityPickSkeleton = () => (
  <View style={tw`w-44 mr-3`}>
    <View style={tw`bg-white rounded-2xl p-2.5 border border-gray-200 shadow-sm`}>
      <View style={tw`w-full h-36 bg-gray-200 rounded-xl mb-2`} />
      <View style={tw`h-3 bg-gray-200 rounded w-full mb-1.5`} />
      <View style={tw`h-3 bg-gray-200 rounded w-2/3 mb-2`} />
      <View style={tw`flex-row justify-between items-center`}>
        <View style={tw`h-3 w-12 bg-gray-200 rounded`} />
        <View style={tw`h-6 w-14 bg-gray-200 rounded-lg`} />
      </View>
    </View>
  </View>
);

// Testimonial Skeleton
export const TestimonialSkeleton = () => (
  <View style={tw`w-72 mr-4`}>
    <View style={tw`bg-white rounded-2xl p-4 border border-gray-200 shadow-sm`}>
      <View style={tw`flex-row items-center mb-3`}>
        <View style={tw`w-12 h-12 bg-gray-200 rounded-full mr-3`} />
        <View style={tw`flex-1`}>
          <View style={tw`h-3.5 bg-gray-200 rounded w-2/3 mb-1.5`} />
          <View style={tw`h-3 bg-gray-200 rounded w-1/2`} />
        </View>
      </View>
      <View style={tw`h-3 bg-gray-200 rounded w-full mb-1.5`} />
      <View style={tw`h-3 bg-gray-200 rounded w-full mb-1.5`} />
      <View style={tw`h-3 bg-gray-200 rounded w-3/4`} />
    </View>
  </View>
);

// Scoop Card Skeleton (for GoodbellyScoop)
export const ScoopCardSkeleton = () => (
  <View style={tw`mt-4 px-3 mb-0`}>
    {/* Header - Centered */}
    <View style={tw`items-center mb-3`}>
      {/* "Goodbelly Scoop" title - headingItalic (approx 25px height) */}
      <View style={tw`h-[25px] bg-gray-200 rounded w-40 mb-1`} />
      {/* Subtitle - text-xs (approx 16px height) */}
      <View style={tw`h-[16px] bg-gray-200 rounded w-64`} />
    </View>

    {/* Main Content Card */}
    <View style={tw`bg-white rounded-xl p-4 shadow-sm border border-gray-100`}>
      {/* Scoop Heading - headingS (approx 24px height) */}
      <View style={tw`h-[24px] bg-gray-200 rounded w-3/4 mb-3`} />

      {/* Body Text Blocks - leading-5 (20px line height, using 16px bar + 4px gap) */}
      <View style={tw`h-[16px] bg-gray-200 rounded w-full mb-1`} />
      <View style={tw`h-[16px] bg-gray-200 rounded w-full mb-1`} />
      <View style={tw`h-[16px] bg-gray-200 rounded w-[95%] mb-1`} />
      <View style={tw`h-[16px] bg-gray-200 rounded w-[98%] mb-1`} />
      <View style={tw`h-[16px] bg-gray-200 rounded w-[92%] mb-3`} />

      {/* Sources Section */}
      <View style={tw`mb-3`}>
        {/* Label */}
        <View style={tw`h-[14px] bg-gray-200 rounded w-16 mb-1`} />
        {/* Content - leading-4 (16px) */}
        <View style={tw`h-[14px] bg-gray-200 rounded w-full mb-1`} />
        <View style={tw`h-[14px] bg-gray-200 rounded w-3/4 mb-3`} />
      </View>

      {/* Pro Tip Section */}
      <View style={tw`bg-yellow-50 rounded-lg px-2.5 py-2 border-l-3 border-yellow-400`}>
        {/* Label */}
        <View style={tw`h-[14px] bg-yellow-400/30 rounded w-16 mb-1`} />
        {/* Content */}
        <View style={tw`h-[14px] bg-yellow-400/30 rounded w-full mb-1`} />
        <View style={tw`h-[14px] bg-yellow-400/30 rounded w-[90%]`} />
      </View>
    </View>
  </View>
);

// Order Card Skeleton (for OrdersScreen)
export const OrderCardSkeleton = () => (
  <View style={tw`bg-white mx-4 mb-3 rounded-xl p-3 border border-gray-100 shadow-sm`}>
    {/* Header Row */}
    <View style={tw`flex-row items-center justify-between mb-2`}>
      <View style={tw`h-4 bg-gray-200 rounded w-32`} />
      <View style={tw`h-4 bg-gray-200 rounded w-16`} />
    </View>

    {/* Date */}
    <View style={tw`h-3 bg-gray-200 rounded w-48 mb-3`} />

    {/* Divider */}
    <View style={tw`w-full mb-3 h-px bg-gray-200`} />

    {/* Product Row */}
    <View style={tw`flex-row items-center`}>
      {/* Product Image */}
      <View style={tw`w-[50px] h-[50px] bg-gray-200 rounded-lg mr-3`} />

      {/* Product Details */}
      <View style={tw`flex-1`}>
        <View style={tw`h-4 bg-gray-200 rounded w-3/4 mb-1.5`} />
        <View style={tw`h-3 bg-gray-200 rounded w-1/2 mb-1`} />
        <View style={tw`h-3 bg-gray-200 rounded w-1/3`} />
      </View>
    </View>
  </View>
);

// Order Details Skeleton (for OrderDetailsScreen)
export const OrderDetailsSkeleton = () => (
  <SafeAreaView style={{ flex: 1, backgroundColor: "#5F7F67" }} edges={["top", "left", "right"]}>
    {/* Header Skeleton */}
    <View style={[tw`px-4 py-4`, { backgroundColor: "#5F7F67" }]}>
      <View style={tw`flex-row items-center justify-between mb-4`}>
        <View style={tw`w-8 h-8 bg-white/20 rounded-full`} />
        <View style={tw`h-5 bg-white/20 rounded w-32`} />
        <View style={tw`w-8`} />
      </View>

      <View style={tw`h-3 bg-white/20 rounded w-40 mb-1`} />
      <View style={tw`h-3 bg-white/20 rounded w-48 mb-3`} />

      <View style={tw`flex-row gap-2`}>
        <View style={tw`h-7 bg-white/20 rounded w-24`} />
        <View style={tw`h-7 bg-white/20 rounded w-32`} />
      </View>
    </View>

    <ScrollView style={tw`flex-1 bg-white`}>
      {/* Order Items Section */}
      <View style={tw`px-4 py-4`}>
        <View style={tw`flex-row items-center mb-3`}>
          <View style={tw`w-5 h-5 bg-gray-200 rounded mr-2`} />
          <View style={tw`h-4 bg-gray-200 rounded w-24`} />
        </View>

        {[1, 2].map((item) => (
          <View key={item} style={tw`bg-white rounded-xl p-3 mb-3 border border-gray-200`}>
            <View style={tw`flex-row items-center`}>
              <View style={tw`w-15 h-15 bg-gray-200 rounded-xl mr-3`} />
              <View style={tw`flex-1`}>
                <View style={tw`h-4 bg-gray-200 rounded w-3/4 mb-1.5`} />
                <View style={tw`h-3 bg-gray-200 rounded w-1/2 mb-1`} />
                <View style={tw`h-3 bg-gray-200 rounded w-2/3`} />
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Live Tracking Section */}
      <View style={tw`px-4 py-4 border-t border-gray-200`}>
        <View style={tw`flex-row items-center mb-3`}>
          <View style={tw`w-5 h-5 bg-gray-200 rounded mr-2`} />
          <View style={tw`h-4 bg-gray-200 rounded w-28`} />
        </View>

        <View style={tw`bg-white rounded-2xl p-4 border border-gray-200`}>
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <View style={tw`h-3 bg-gray-200 rounded w-24`} />
            <View style={tw`h-6 bg-gray-200 rounded w-20`} />
          </View>

          <View style={tw`bg-gray-50 rounded-xl p-3 mb-4`}>
            <View style={tw`h-3 bg-gray-200 rounded w-32 mb-2`} />
            <View style={tw`h-4 bg-gray-200 rounded w-24 mb-2`} />
            <View style={tw`h-3 bg-gray-200 rounded w-28`} />
          </View>

          <View style={tw`h-10 bg-gray-200 rounded-xl`} />
        </View>
      </View>

      {/* Bill Details Section */}
      <View style={tw`px-4 py-4 border-t border-gray-200`}>
        <View style={tw`flex-row items-center mb-3`}>
          <View style={tw`w-5 h-5 bg-gray-200 rounded mr-2`} />
          <View style={tw`h-4 bg-gray-200 rounded w-24`} />
        </View>

        <View style={tw`bg-gray-50 rounded-xl p-4`}>
          {[1, 2, 3, 4].map((item) => (
            <View key={item} style={tw`flex-row justify-between mb-2`}>
              <View style={tw`h-3 bg-gray-200 rounded w-24`} />
              <View style={tw`h-3 bg-gray-200 rounded w-16`} />
            </View>
          ))}

          <View style={tw`pt-3 border-t border-gray-300 flex-row justify-between`}>
            <View style={tw`h-4 bg-gray-200 rounded w-28`} />
            <View style={tw`h-4 bg-gray-200 rounded w-20`} />
          </View>
        </View>
      </View>

      {/* Payment Info Section */}
      <View style={tw`px-4 py-4 border-t border-gray-200`}>
        <View style={tw`flex-row items-center mb-3`}>
          <View style={tw`w-5 h-5 bg-gray-200 rounded mr-2`} />
          <View style={tw`h-4 bg-gray-200 rounded w-28`} />
        </View>

        <View style={tw`bg-gray-50 rounded-xl p-4`}>
          <View style={tw`flex-row justify-between mb-2`}>
            <View style={tw`h-3 bg-gray-200 rounded w-16`} />
            <View style={tw`h-3 bg-gray-200 rounded w-20`} />
          </View>
          <View style={tw`flex-row justify-between`}>
            <View style={tw`h-3 bg-gray-200 rounded w-16`} />
            <View style={tw`h-6 bg-gray-200 rounded w-28`} />
          </View>
        </View>
      </View>

      {/* Delivery Address Section */}
      <View style={tw`px-4 py-4 border-t border-gray-200 mb-4`}>
        <View style={tw`flex-row items-center mb-3`}>
          <View style={tw`w-5 h-5 bg-gray-200 rounded mr-2`} />
          <View style={tw`h-4 bg-gray-200 rounded w-32`} />
        </View>

        <View style={tw`bg-gray-50 rounded-xl p-4`}>
          <View style={tw`h-4 bg-gray-200 rounded w-20 mb-2`} />
          <View style={tw`h-3 bg-gray-200 rounded w-full mb-1.5`} />
          <View style={tw`h-3 bg-gray-200 rounded w-3/4`} />
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>
);

// Profile Screen Skeleton (for ProfileScreen)
export const ProfileSkeleton = () => (
  <View style={tw`flex-1 bg-gray-50`}>
    {/* Curved Header Section */}
    <View style={tw`bg-[#90a79b]`}>
      <SafeAreaView edges={["top"]}>
        <View style={tw`bg-[#7a9b8e] pt-4 pb-8`}>
          {/* White curved bottom */}
          <View style={tw`absolute -bottom-6 left-0 right-0 h-12`}>
            <View style={tw`bg-white h-12 rounded-t-3xl`} />
          </View>

          <View style={tw`px-4 z-10`}>
            <View style={tw`flex-row items-center`}>
              {/* Profile Image */}
              <View style={tw`mr-3 relative`}>
                <View style={tw`w-16 h-16 rounded-full bg-white shadow-sm justify-center items-center`}>
                  <View style={tw`w-14 h-14 rounded-full bg-gray-300`} />
                </View>
                {/* Camera Icon */}
                <View style={tw`absolute -bottom-1 -right-1 bg-[#7a9b8e] w-6 h-6 rounded-full border-2 border-white justify-center items-center`}>
                  <View style={tw`w-3 h-2.5 bg-white/50 rounded`} />
                </View>
              </View>

              {/* User Info */}
              <View style={tw`flex-1`}>
                {/* Name */}
                <View style={tw`h-5 bg-white/40 rounded w-36 mb-1.5`} />

                {/* Phone */}
                <View style={tw`flex-row items-center mb-0.5`}>
                  <View style={tw`w-3.5 h-3.5 bg-white/40 rounded-full mr-1`} />
                  <View style={tw`h-3 bg-white/40 rounded w-32`} />
                </View>

                {/* Email */}
                <View style={tw`flex-row items-center`}>
                  <View style={tw`w-3.5 h-3.5 bg-white/40 rounded-full mr-1`} />
                  <View style={tw`h-3 bg-white/40 rounded w-44`} />
                </View>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>

    {/* Menu Items Section */}
    <View style={tw`flex-1 mt-0`}>
      {/* Account Title */}
      <View style={tw`mx-4 mb-1 mt-0`}>
        <View style={tw`h-3.5 bg-gray-300 rounded w-20 mt-0`} />
      </View>

      {/* Menu Items */}
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`pb-4 mt-3`}
        showsVerticalScrollIndicator={false}
      >
        {[
          { id: '1', width: 'w-16' },  // Profile
          { id: '2', width: 'w-20' },  // My Orders
          { id: '3', width: 'w-16' },  // Address
          { id: '4', width: 'w-18' },  // Favorites
          { id: '5', width: 'w-24' },  // Subscriptions
          { id: '6', width: 'w-16' },  // Support
          { id: '7', width: 'w-18' },  // About Us
        ].map((item, index) => (
          <View key={item.id}>
            <View style={tw`bg-white rounded-lg p-3 mb-2 mx-4 shadow-sm border border-gray-100`}>
              <View style={tw`flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center flex-1`}>
                  {/* Icon Circle */}
                  <View style={tw`bg-gray-100 w-10 h-10 rounded-full justify-center items-center mr-3`}>
                    <View style={tw`w-5 h-5 bg-gray-300 rounded`} />
                  </View>
                  {/* Menu Text with varying widths */}
                  <View style={[tw`h-3.5 bg-gray-300 rounded`, tw`${item.width}`]} />
                </View>
                {/* Chevron */}
                <View style={tw`w-4.5 h-4.5 bg-gray-300 rounded`} />
              </View>
            </View>
            {/* Separator */}
            {index < 6 && <View style={tw`h-0.5`} />}
          </View>
        ))}
      </ScrollView>
    </View>

    {/* Logout Button */}
    <View style={tw`mx-4 mb-4`}>
      <View style={tw`bg-red-50 border border-red-100 rounded-lg items-center justify-center h-10 w-full`}>
        <View style={tw`flex-row items-center`}>
          <View style={tw`w-4 h-4 bg-red-300 rounded mr-2`} />
          <View style={tw`h-3 bg-red-300 rounded w-14`} />
        </View>
      </View>
    </View>
  </View>
);

// Favorites Screen Skeleton
export const FavoritesSkeleton = () => {
  const cardWidth = (screenWidth - 40) / 2;

  return (
    <View style={tw`flex-1 bg-white`}>
      <SafeAreaView edges={["top"]} style={tw`flex-1`}>
        {/* Header */}
        <View style={tw`bg-white px-4 py-4 border-b border-gray-200`}>
          <View style={tw`flex-row items-center`}>
            <View style={tw`w-8 h-8 bg-gray-200 rounded-full mr-3`} />
            <View style={tw`h-5 bg-gray-200 rounded w-24`} />
          </View>
        </View>

        {/* Product Grid - Using FlatList like actual UI */}
        <View style={tw`flex-1 px-4`}>
          <FlatList
            data={[1, 2, 3, 4, 5, 6]}
            numColumns={2}
            keyExtractor={(item) => item.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw`pt-2`}
            renderItem={({ item, index }) => (
              <View style={[tw`mb-2 ${index % 2 === 0 ? "pr-1" : "pl-1"}`]}>
                <View style={[
                  tw`bg-white rounded-2xl p-3 flex-1 border border-gray-200`,
                  tw`shadow-lg shadow-black/10`,
                  { width: cardWidth }
                ]}>
                  {/* Heart Icon */}
                  <View style={tw`absolute right-2 top-2 z-10`}>
                    <View style={tw`w-8 h-8 bg-gray-200 rounded-full`} />
                  </View>

                  {/* Image */}
                  <View style={tw`w-full h-32 bg-gray-200 rounded-xl mb-2`} />

                  {/* Content - with flex-1 wrapper */}
                  <View style={tw`flex-1`}>
                    {/* Product Name */}
                    <View style={tw`h-3 bg-gray-200 rounded w-3/4 mb-1`} />
                    {/* Description */}
                    <View style={tw`h-2.5 bg-gray-200 rounded w-full mb-2`} />

                    {/* Price and Button */}
                    <View style={tw`flex-row justify-between items-center mt-auto`}>
                      <View style={tw`h-4 bg-gray-200 rounded w-12`} />
                      <View style={tw`h-7 w-16 bg-gray-200 rounded-xl`} />
                    </View>
                  </View>
                </View>
              </View>
            )}
          />
        </View>
      </SafeAreaView>
    </View>
  );
};

// Address Screen Skeleton
export const AddressSkeleton = () => (
  <View style={tw`flex-1 bg-gray-50`}>
    <SafeAreaView edges={["top"]} style={tw`flex-1`}>
      {/* Header */}
      <View style={tw`bg-white px-4 py-3 border-b border-gray-200`}>
        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`w-8 h-8 bg-gray-200 rounded-full`} />
          <View style={tw`h-5 bg-gray-200 rounded w-32`} />
          <View style={tw`w-8`} />
        </View>
      </View>

      {/* Address Cards */}
      <ScrollView style={tw`flex-1 px-4 pt-4`}>
        {[1, 2, 3].map((item) => (
          <View key={item} style={tw`bg-white rounded-xl p-4 mb-3 border border-gray-200 shadow-sm`}>
            {/* Header Row */}
            <View style={tw`flex-row justify-between items-center mb-3`}>
              <View style={tw`flex-row items-center`}>
                <View style={tw`w-5 h-5 bg-gray-200 rounded mr-2`} />
                <View style={tw`h-4 bg-gray-200 rounded w-16`} />
              </View>
              <View style={tw`w-16 h-6 bg-gray-200 rounded`} />
            </View>

            {/* Address Lines */}
            <View style={tw`h-3 bg-gray-200 rounded w-full mb-2`} />
            <View style={tw`h-3 bg-gray-200 rounded w-4/5 mb-2`} />
            <View style={tw`h-3 bg-gray-200 rounded w-3/5`} />

            {/* Action Buttons */}
            <View style={tw`flex-row mt-4 pt-3 border-t border-gray-100`}>
              <View style={tw`h-8 bg-gray-200 rounded w-20 mr-2`} />
              <View style={tw`h-8 bg-gray-200 rounded w-20`} />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add Button */}
      <View style={tw`px-4 pb-4`}>
        <View style={tw`h-12 bg-gray-200 rounded-xl`} />
      </View>
    </SafeAreaView>
  </View>
);

// Subscription Screen Skeleton
export const SubscriptionSkeleton = () => (
  <View style={tw`flex-1 bg-gray-50`}>
    <SafeAreaView edges={["top"]} style={tw`flex-1`}>
      {/* Header */}
      <View style={tw`bg-white px-4 py-3 shadow-sm border-b border-gray-100`}>
        <View style={tw`flex-row items-center`}>
          {/* Circular back button */}
          <View style={tw`w-8 h-8 bg-gray-100 rounded-full mr-3`} />
          <View style={tw`h-5 bg-gray-200 rounded w-32`} />
        </View>
      </View>

      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`pb-6`}>
        {/* Stats Card Skeleton */}
        <View style={tw`px-4 pt-4`}>
          <View style={tw`bg-white rounded-xl p-3 shadow-sm border border-gray-100 mb-4`}>
            <View style={tw`flex-row justify-between items-center`}>
              <View style={tw`items-center`}>
                <View style={tw`h-6 w-8 bg-gray-200 rounded mb-1`} />
                <View style={tw`h-3 w-16 bg-gray-200 rounded`} />
              </View>
              <View style={tw`h-6 w-px bg-gray-200`} />
              <View style={tw`items-center`}>
                <View style={tw`h-6 w-8 bg-gray-200 rounded mb-1`} />
                <View style={tw`h-3 w-12 bg-gray-200 rounded`} />
              </View>
              <View style={tw`h-6 w-px bg-gray-200`} />
              <View style={tw`items-center`}>
                <View style={tw`h-6 w-8 bg-gray-200 rounded mb-1`} />
                <View style={tw`h-3 w-12 bg-gray-200 rounded`} />
              </View>
            </View>
          </View>
        </View>

        <View style={tw`px-4`}>
          {/* Header with New Plan Button */}
          <View style={tw`flex-row items-center justify-between mb-4`}>
            <View style={tw`h-4 bg-gray-200 rounded w-28`} />
            <View style={tw`h-8 bg-gray-200 rounded-xl w-20`} />
          </View>

          {/* Subscription Cards */}
          {[1, 2].map((item) => (
            <View key={item} style={tw`bg-white rounded-xl p-4 mb-3 border border-gray-200 shadow-sm`}>
              {/* Header Section */}
              <View style={tw`flex-row justify-between items-start mb-3`}>
                <View style={tw`flex-1`}>
                  {/* Kitchen name with status dot */}
                  <View style={tw`flex-row items-center mb-1`}>
                    <View style={tw`w-2 h-2 bg-gray-200 rounded-full mr-2`} />
                    <View style={tw`h-3 bg-gray-200 rounded w-24`} />
                  </View>
                  {/* Meal plan title */}
                  <View style={tw`h-5 bg-gray-200 rounded w-32 mb-1`} />
                  {/* Date range */}
                  <View style={tw`flex-row items-center`}>
                    <View style={tw`w-3 h-3 bg-gray-200 rounded mr-1`} />
                    <View style={tw`h-3 bg-gray-200 rounded w-28`} />
                  </View>
                </View>
                <View style={tw`items-end`}>
                  {/* Status Badge */}
                  <View style={tw`h-6 bg-gray-200 rounded-full w-20 mb-1`} />
                  {/* Frequency Badge */}
                  <View style={tw`h-6 bg-gray-200 rounded-full w-16`} />
                </View>
              </View>

              {/* Delivery Schedule Section */}
              <View style={tw`bg-gray-50 rounded-lg p-3 mb-3`}>
                <View style={tw`flex-row items-center mb-2`}>
                  <View style={tw`w-3.5 h-3.5 bg-gray-200 rounded mr-2`} />
                  <View style={tw`h-3.5 bg-gray-200 rounded w-32`} />
                </View>
                {/* Time slots */}
                <View style={tw`flex-row justify-between py-1 mb-1`}>
                  <View style={tw`h-3 bg-gray-200 rounded w-24`} />
                  <View style={tw`h-3 bg-gray-200 rounded w-12`} />
                </View>
                <View style={tw`flex-row justify-between py-1`}>
                  <View style={tw`h-3 bg-gray-200 rounded w-24`} />
                  <View style={tw`h-3 bg-gray-200 rounded w-12`} />
                </View>
              </View>

              {/* Price Card (gradient) */}
              <View style={tw`bg-gray-200 rounded-lg p-3 mb-3`}>
                <View style={tw`flex-row justify-between items-center`}>
                  <View>
                    <View style={tw`h-3 bg-gray-300 rounded w-20 mb-1`} />
                    <View style={tw`h-4 bg-gray-300 rounded w-24`} />
                  </View>
                  <View style={tw`items-end`}>
                    <View style={tw`h-3 bg-gray-300 rounded w-12 mb-1`} />
                    <View style={tw`h-5 bg-gray-300 rounded w-16`} />
                  </View>
                </View>
              </View>

              {/* Items Summary */}
              <View style={tw`mb-3`}>
                <View style={tw`flex-row items-center`}>
                  <View style={tw`w-3.5 h-3.5 bg-gray-200 rounded mr-2`} />
                  <View style={tw`h-3.5 bg-gray-200 rounded w-28`} />
                </View>
              </View>

              {/* Payment Info & Actions */}
              <View style={tw`border-t border-gray-200 pt-3`}>
                {/* Payment info */}
                <View style={tw`flex-row justify-between items-center mb-2`}>
                  <View style={tw`flex-row items-center`}>
                    <View style={tw`w-3.5 h-3.5 bg-gray-200 rounded mr-1`} />
                    <View style={tw`h-3 bg-gray-200 rounded w-20 mr-2`} />
                    <View style={tw`h-4 bg-gray-200 rounded-full w-16`} />
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={tw`flex-row gap-2`}>
                  <View style={tw`flex-1 h-12 bg-gray-200 rounded-lg`} />
                  <View style={tw`flex-1 h-12 bg-gray-200 rounded-lg`} />
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  </View>
);

// Profile Card Screen Skeleton
export const ProfileCardSkeleton = () => (
  <View style={tw`flex-1 bg-white`}>
    <SafeAreaView edges={["top"]} style={tw`flex-1`}>
      {/* Header */}
      <View style={tw`px-4 py-3 border-b border-gray-200`}>
        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`w-8 h-8 bg-gray-200 rounded-full`} />
          <View style={tw`h-5 bg-gray-200 rounded w-32`} />
          <View style={tw`w-8`} />
        </View>
      </View>

      <ScrollView style={tw`flex-1 px-4 pt-6`}>
        {/* Profile Image */}
        <View style={tw`items-center mb-6`}>
          <View style={tw`w-24 h-24 bg-gray-200 rounded-full mb-2`} />
          <View style={tw`h-3 bg-gray-200 rounded w-24`} />
        </View>

        {/* Form Fields */}
        {[1, 2, 3, 4].map((item) => (
          <View key={item} style={tw`mb-4`}>
            <View style={tw`h-3 bg-gray-200 rounded w-20 mb-2`} />
            <View style={tw`h-12 bg-gray-100 rounded-lg border border-gray-200`} />
          </View>
        ))}

        {/* Save Button */}
        <View style={tw`mt-6`}>
          <View style={tw`h-12 bg-gray-200 rounded-xl`} />
        </View>
      </ScrollView>
    </SafeAreaView>
  </View>
);

// Curated Product Skeleton (for CuratedCollections)
export const CuratedProductSkeleton = () => (
  <View style={tw`w-[160px] mr-4 mb-2`}>
    <View
      style={[
        tw`bg-white rounded-2xl p-3 border border-gray-200 shadow-lg shadow-black/10`,
      ]}
    >
      {/* Image Placeholder */}
      <View style={tw`w-full h-28 bg-gray-200 rounded-xl mb-2`} />

      <View style={tw`flex-1 justify-between`}>
        <View>
          {/* Title Line (mb-0.5 matches real card) */}
          <View style={tw`h-3.5 bg-gray-200 rounded w-3/4 mb-0.5`} />
          {/* Description Line (mb-0.5 matches real card) */}
          <View style={tw`h-3 bg-gray-200 rounded w-full mb-0.5`} />
          {/* Vendor Name */}
          <View style={tw`h-3 bg-gray-200 rounded w-1/2`} />
          {/* Removed Customisable Tag to match standard height (avoid jump) */}
        </View>

        {/* Bottom Row: Price and Button */}
        <View style={tw`flex-row justify-between items-center mt-2`}>
          {/* Price */}
          <View style={tw`h-4 w-12 bg-gray-200 rounded`} />
          {/* Add Button */}
          <View style={tw`h-7 w-[60px] bg-gray-200 rounded-xl`} />
        </View>
      </View>
    </View>
  </View>
);

// Smart Product Skeleton (for SmartPeopleSection)
// Matches w-[160px], mr-4, mb-2, minHeight: 250
export const SmartProductSkeleton = () => (
  <View style={tw`w-[160px] mr-4 mb-2`}>
    <View
      style={[
        tw`bg-white rounded-2xl p-3 border border-gray-200 shadow-lg shadow-black/10`,
        { minHeight: 250 }
      ]}
    >
      {/* Image Placeholder */}
      <View style={tw`w-full h-28 bg-gray-200 rounded-xl mb-2`} />

      <View style={tw`flex-1 justify-between`}>
        <View>
          {/* Title Line */}
          <View style={tw`h-3.5 bg-gray-200 rounded w-3/4 mb-0.5`} />
          {/* Description Line */}
          <View style={tw`h-3 bg-gray-200 rounded w-full mb-0.5`} />
          {/* Vendor Name */}
          <View style={tw`h-3 bg-gray-200 rounded w-1/2`} />
        </View>

        {/* Bottom Row: Price and Button */}
        <View style={tw`flex-row justify-between items-center mt-2`}>
          {/* Price */}
          <View style={tw`h-4 w-12 bg-gray-200 rounded`} />
          {/* Add Button */}
          <View style={tw`h-7 w-[60px] bg-gray-200 rounded-xl`} />
        </View>
      </View>
    </View>
  </View>
);

// Kitchen Details Header Skeleton
export const KitchenHeaderSkeleton = ({ layout }) => (
  <View style={tw`bg-gray-50`}>
    {/* Cover Image Placeholder */}
    <View style={{ height: layout?.coverHeight || 224, backgroundColor: '#E5E7EB' }} />

    {/* Info Card Placeholder */}
    <View style={[tw`px-4`, { marginTop: -24 }]}>
      <View style={tw`bg-white rounded-3xl shadow-xl shadow-black/10 p-5 mb-4`}>
        {/* Status Row */}
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <View style={tw`flex-row items-center`}>
            <View style={tw`w-3 h-3 rounded-full bg-gray-200 mr-2`} />
            <View style={tw`h-5 bg-gray-200 rounded w-28`} />
          </View>
          <View style={tw`h-3 bg-gray-200 rounded w-32`} />
        </View>

        {/* Details Row */}
        <View style={tw`flex-row items-center mb-4`}>
          <View style={tw`h-3 bg-gray-200 rounded w-32`} />
        </View>

        {/* Address Row */}
        <View style={tw`mt-2 pt-4 border-t border-gray-100`}>
          <View style={tw`flex-row items-start`}>
            <View style={tw`w-4 h-4 bg-gray-200 rounded mr-2 mt-0.5`} />
            <View style={tw`flex-1`}>
              <View style={tw`h-3 bg-gray-200 rounded w-full mb-2`} />
              <View style={tw`h-3 bg-gray-200 rounded w-2/3`} />
            </View>
          </View>
        </View>
      </View>
    </View>

    {/* Section Header */}
    <View style={tw`px-4 mb-4 flex-row justify-between items-center`}>
      <View style={tw`h-6 bg-gray-200 rounded w-32`} />
      <View style={tw`h-4 bg-gray-200 rounded w-20`} />
    </View>
  </View>
);

// Kitchen Detail Product Card Skeleton (Horizontal)
export const KitchenDetailProductSkeleton = ({ isTablet }) => (
  <View
    style={[
      tw`bg-white rounded-2xl p-4 mb-3 flex-row items-center`,
      tw`shadow-lg shadow-black/10`,
      { width: '100%' }
    ]}
  >
    {/* Image Placeholder */}
    <View
      style={{
        width: isTablet ? 100 : 80,
        height: isTablet ? 100 : 80,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
      }}
    />

    {/* Content Placeholder */}
    <View style={tw`ml-4 flex-1`}>
      <View style={tw`h-4 bg-gray-200 rounded w-3/4 mb-2`} />
      <View style={tw`h-3 bg-gray-100 rounded w-full mb-1.5`} />
      <View style={tw`h-3 bg-gray-100 rounded w-5/6 mb-3`} />

      <View style={tw`flex-row justify-between items-center mt-auto`}>
        <View style={tw`h-4 bg-gray-200 rounded w-14`} />
        <View style={tw`h-8 bg-gray-200 rounded-xl w-24`} />
      </View>
    </View>
  </View>
);

export default ProductSkeleton;

