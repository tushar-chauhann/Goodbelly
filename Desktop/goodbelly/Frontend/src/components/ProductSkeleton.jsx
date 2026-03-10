import React from "react";
import { View, Dimensions } from "react-native";
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
  <View style={tw`w-64 mr-3`}>
    <View style={tw`bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm`}>
      <View style={tw`w-full h-44 bg-gray-200`} />
      <View style={tw`p-3`}>
        <View style={tw`h-4 bg-gray-200 rounded w-full mb-2`} />
        <View style={tw`h-3 bg-gray-200 rounded w-3/4 mb-1.5`} />
        <View style={tw`h-3 bg-gray-200 rounded w-1/2`} />
      </View>
    </View>
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

export default ProductSkeleton;

