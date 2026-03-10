import React, { useState, useEffect } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import { addToCart, updateCartItemQty, removeCartItem, clearCartByVendor } from "../../redux/slicer";
import KitchenConflictPopup from "../CustomPopup/KitchenConflictPopup";
import CustomizationPopup from "../CustomizationPopup";
import * as Haptics from 'expo-haptics';
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";
import { authService } from "../../services/authService";
import ProductSkeleton, { SmartProductSkeleton } from "../ProductSkeleton";

const SmartPeopleSection = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { items: cartItems, vendorId: currentVendorId } = useSelector((state) => state.cart);
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [kitchenConflictVisible, setKitchenConflictVisible] = useState(false);
  const [conflictItem, setConflictItem] = useState(null);

  // Customization State
  const [showCustomizationPopup, setShowCustomizationPopup] = useState(false);
  const [selectedProductForCustomization, setSelectedProductForCustomization] = useState(null);
  const [customizationProductId, setCustomizationProductId] = useState(null);
  const [customizationWeightId, setCustomizationWeightId] = useState(null);

  // State for "MEALS FROM ₹99" section
  const [mealsProducts, setMealsProducts] = useState([]);
  const [mealsLoading, setMealsLoading] = useState(true);
  const [mealsVisibleCount, setMealsVisibleCount] = useState(10);
  const [mealsLoadingMore, setMealsLoadingMore] = useState(false);

  // State for "EVERYTHING" section
  const [everythingProducts, setEverythingProducts] = useState([]);
  const [everythingLoading, setEverythingLoading] = useState(true);
  const [everythingVisibleCount, setEverythingVisibleCount] = useState(10);
  const [everythingLoadingMore, setEverythingLoadingMore] = useState(false);

  const [favById, setFavById] = useState({});

  useEffect(() => {
    // console.log("SmartPeopleSection mounted");
    fetchMealsProducts();
    fetchEverythingProducts();
  }, [user]);

  const handleToggleFavorite = async (item) => {
    if (!isAuthenticated) {
      Alert.alert("Login Required", "Please login to add to favorites", [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => navigation.navigate("Login") },
      ]);
      return;
    }

    const productId = item.id || item._id;
    // Optimistic update
    setFavById((prev) => ({ ...prev, [productId]: !prev[productId] }));
    Haptics.selectionAsync();

    try {
      await authService.toggleFavorite(productId);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      // Revert on error
      setFavById((prev) => ({ ...prev, [productId]: !prev[productId] }));
    }
  };

  const fetchMealsProducts = async () => {
    try {
      setMealsLoading(true);
      setMealsVisibleCount(10); // Reset

      // Fetch all products and wishlist
      const [response, wishlistResponse] = await Promise.all([
        authService.getAllProducts({}),
        authService.getWishlist().catch((err) => {
          console.warn("Failed to fetch wishlist:", err);
          return { data: [] };
        }),
      ]);

      let fetchedProducts = response?.data || [];

      // Filter products with price >= ₹99
      fetchedProducts = fetchedProducts.filter(item => {
        const firstWeight = item.weights?.[0];
        const rawPrice = Number(firstWeight?.price || item.price || 0);
        const discountPrice = Number(firstWeight?.discountPrice || 0);

        // Correct Price Logic
        const hasDiscount = discountPrice > 0 && discountPrice < rawPrice;
        const finalPrice = hasDiscount ? discountPrice : rawPrice;

        return finalPrice >= 99;
      });

      // Sort by final price: lowest to highest (ascending)
      fetchedProducts.sort((a, b) => {
        const weightA = a.weights?.[0];
        const priceA = Number(weightA?.price || 0);
        const discountA = Number(weightA?.discountPrice || 0);
        const finalPriceA = (discountA > 0 && discountA < priceA) ? discountA : priceA;

        const weightB = b.weights?.[0];
        const priceB = Number(weightB?.price || 0);
        const discountB = Number(weightB?.discountPrice || 0);
        const finalPriceB = (discountB > 0 && discountB < priceB) ? discountB : priceB;

        return finalPriceA - finalPriceB;
      });

      // Process Wishlist
      processWishlist(wishlistResponse, fetchedProducts);

      setMealsProducts(fetchedProducts);
    } catch (error) {
      console.error("Error fetching meals products:", error);
      setMealsProducts([]);
    } finally {
      setMealsLoading(false);
    }
  };

  const fetchEverythingProducts = async () => {
    try {
      setEverythingLoading(true);
      setEverythingVisibleCount(10); // Reset

      // Fetch all products and wishlist
      const [response, wishlistResponse] = await Promise.all([
        authService.getAllProducts({}),
        authService.getWishlist().catch((err) => {
          console.warn("Failed to fetch wishlist for everything:", err);
          return { data: [] };
        }),
      ]);

      let fetchedProducts = response?.data || [];

      // Filter products with price < ₹99
      fetchedProducts = fetchedProducts.filter(item => {
        const firstWeight = item.weights?.[0];
        const rawPrice = Number(firstWeight?.price || item.price || 0);
        const discountPrice = Number(firstWeight?.discountPrice || 0);

        // Correct Price Logic
        const hasDiscount = discountPrice > 0 && discountPrice < rawPrice;
        const finalPrice = hasDiscount ? discountPrice : rawPrice;

        return finalPrice < 99;
      });

      // Sort by final price: lowest to highest
      fetchedProducts.sort((a, b) => {
        const weightA = a.weights?.[0];
        const priceA = Number(weightA?.price || 0);
        const discountA = Number(weightA?.discountPrice || 0);
        const finalPriceA = (discountA > 0 && discountA < priceA) ? discountA : priceA;

        const weightB = b.weights?.[0];
        const priceB = Number(weightB?.price || 0);
        const discountB = Number(weightB?.discountPrice || 0);
        const finalPriceB = (discountB > 0 && discountB < priceB) ? discountB : priceB;

        return finalPriceA - finalPriceB;
      });

      processWishlist(wishlistResponse, fetchedProducts);

      setEverythingProducts(fetchedProducts);
    } catch (error) {
      console.error("Error fetching everything products:", error);
      setEverythingProducts([]);
    } finally {
      setEverythingLoading(false);
    }
  };

  const processWishlist = (wishlistResponse, products) => {
    let wishlistItems = [];
    if (wishlistResponse?.data?.items) {
      wishlistItems = wishlistResponse.data.items;
    } else if (wishlistResponse?.data && Array.isArray(wishlistResponse.data)) {
      wishlistItems = wishlistResponse.data;
    } else if (Array.isArray(wishlistResponse)) {
      wishlistItems = wishlistResponse;
    }

    const newFavs = {};
    products.forEach(p => {
      if (p.isFavorite) newFavs[p.id || p._id] = true;
    });

    if (Array.isArray(wishlistItems)) {
      wishlistItems.forEach((item) => {
        const id = item.id || item._id || item.productId;
        if (id) newFavs[id] = true;
      });
    }
    setFavById(prev => ({ ...prev, ...newFavs }));
  };

  const getCartItemInfo = (productId) => {
    if (!cartItems || !Array.isArray(cartItems)) {
      return { cartItemId: null, quantity: 0 };
    }
    const cartItem = cartItems.find((item) => item.productId === productId);
    if (cartItem) {
      return {
        cartItemId: cartItem.id,
        quantity: cartItem.quantity || 0,
      };
    }
    return { cartItemId: null, quantity: 0 };
  };

  // ... (Cart helpers: handleAddToCart, handleUpdateCartQuantity, handleRemoveFromCart - Unchanged)
  // Handle add to cart from customization popup
  const handleCustomizationAddToCart = async (customizationData) => {
    const hasValidToken = await authService.isAuthenticated();

    if (!hasValidToken) {
      Alert.alert("Login Required", "Please login to add items to cart", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Login",
          onPress: () => navigation.navigate("Login"),
        },
      ]);
      return;
    }

    try {
      const productId = customizationData.productId || customizationProductId;
      const weightId = customizationData.weightId || customizationWeightId;
      const { quantity, addOns } = customizationData;

      const payload = {
        productId: productId,
        weightId: weightId,
        quantity: quantity || 1,
      };

      if (addOns && addOns.length > 0) {
        payload.Addition = addOns;
      }

      await dispatch(addToCart(payload)).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error adding customized product:", error);
      let errorMessage = "Failed to add item to cart";
      if (error?.message) errorMessage = error.message;
      else if (error?.response?.data?.message) errorMessage = error.response.data.message;

      if (errorMessage.includes("different kitchens")) {
        setKitchenConflictVisible(true);
      } else {
        Alert.alert("Error", errorMessage);
      }
    }
  };

  const handleAddToCart = async (product, weightId) => {
    // Check customization first
    const isCustomizable = product?.isCustomizable === true ||
      (product?.addOnCategories && Array.isArray(product.addOnCategories) && product.addOnCategories.length > 0);

    if (isCustomizable) {
      try {
        const productId = product.id || product._id;
        const addOnsResponse = await authService.getProductAddOns(productId);
        const productWithAddOns = {
          ...product,
          id: productId,
          weights: product.weights || [],
          addOnCategories: addOnsResponse?.data?.addOnCategories || [],
          selectedWeightId: weightId,
        };

        setCustomizationProductId(productId);
        setCustomizationWeightId(weightId);
        setSelectedProductForCustomization(productWithAddOns);
        setShowCustomizationPopup(true);
        return;
      } catch (error) {
        console.error("Error fetching add-ons:", error);
      }
    }

    if (!isAuthenticated || !user) {
      navigation.navigate("Login");
      return;
    }

    const productId = product.id || product._id;
    const productVendorId = product.kitchenId || product.vendorId;

    if (cartItems.length > 0 && currentVendorId && productVendorId && String(currentVendorId) !== String(productVendorId)) {
      setConflictItem({ productId, weightId });
      setKitchenConflictVisible(true);
      return;
    }

    try {
      await dispatch(addToCart({ productId, weightId, quantity: 1 })).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error adding to cart:", error);
    }
  };

  const handleManualClearCart = () => {
    navigation.navigate("Cart");
    setKitchenConflictVisible(false);
  };

  const handleUpdateCartQuantity = async (cartItemId, productId, newQuantity) => {
    try {
      await dispatch(updateCartItemQty({ cartItemId, quantity: newQuantity })).unwrap();
      Haptics.selectionAsync();
    } catch (error) {
      console.error("Error updating cart:", error);
    }
  };

  const handleRemoveFromCart = async (cartItemId) => {
    try {
      await dispatch(removeCartItem(cartItemId)).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.error("Error removing from cart:", error);
    }
  };

  // --- Pagination Handlers ---
  const loadMoreMeals = () => {
    if (mealsLoadingMore || mealsVisibleCount >= mealsProducts.length) return;
    setMealsLoadingMore(true);
    setTimeout(() => {
      setMealsVisibleCount(prev => prev + 10);
      setMealsLoadingMore(false);
    }, 1000);
  };

  const loadMoreEverything = () => {
    if (everythingLoadingMore || everythingVisibleCount >= everythingProducts.length) return;
    setEverythingLoadingMore(true);
    setTimeout(() => {
      setEverythingVisibleCount(prev => prev + 10);
      setEverythingLoadingMore(false);
    }, 1000);
  };


  const renderProductCard = ({ item }) => {
    const productId = item.id || item._id;
    const firstWeight = item.weights?.[0];
    const weightId = firstWeight?.id;

    // Correct Price Logic
    const rawPrice = Number(firstWeight?.price || item.price || 0);
    const discountPrice = Number(firstWeight?.discountPrice || 0);
    const hasDiscount = discountPrice > 0 && discountPrice < rawPrice;

    const finalPrice = hasDiscount ? discountPrice : rawPrice;

    const productImage = item.images?.[0]?.url || item.image || "https://via.placeholder.com/100x100?text=No+Image";
    const productDescription = item.description || "No description available";

    const cartInfo = getCartItemInfo(productId);
    const currentQuantity = cartInfo.quantity || 0;
    const cartItemId = cartInfo.cartItemId;

    const isFav = !!favById[productId];

    const isCustomizable = item?.isCustomizable === true ||
      (item?.addOnCategories && Array.isArray(item.addOnCategories) && item.addOnCategories.length > 0);

    return (
      <View key={productId} style={tw`w-[160px] mr-4 mb-2`}>
        <TouchableOpacity
          style={[
            tw`bg-white rounded-2xl p-3 border border-gray-200`,
            tw`shadow-lg shadow-black/10`,
            { minHeight: 250 }
          ]}
          onPress={() => {
            if (productId) {
              navigation.navigate("ProductDetails", { productId, initialData: item });
            }
          }}
          activeOpacity={0.9}
        >
          {/* Heart Icon Overlay */}
          <TouchableOpacity
            style={tw`absolute top-2 right-2 z-10 bg-white/90 rounded-full p-1.5 shadow-sm`}
            onPress={() => handleToggleFavorite(item)}
          >
            <Ionicons
              name={isFav ? "heart" : "heart-outline"}
              size={18}
              color={isFav ? "#EF4444" : "#9CA3AF"}
            />
          </TouchableOpacity>


          {/* Product Image */}
          <View style={tw`relative mb-2`}>
            <Image
              source={{ uri: productImage }}
              style={tw`w-full h-28 rounded-xl`}
              resizeMode="cover"
            />
          </View>

          {/* Product Details */}
          <View style={tw`flex-1 justify-between`}>
            <View>
              {/* Product Name */}
              <Text
                style={[
                  fontStyles.headingS,
                  tw`text-sm font-semibold text-gray-900 mb-0.5 leading-4`,
                ]}
                numberOfLines={1}
              >
                {item.name || "Product Name"}
              </Text>

              {/* Product Description */}
              <Text
                style={[
                  fontStyles.body,
                  tw`text-gray-500 text-xs leading-[14px] mb-0.5`,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {productDescription}
              </Text>

              <Text style={[fontStyles.headingS, tw`text-xs font-semibold text-[#5F7F67] mb-1`]} numberOfLines={1}>
                {item.vendor?.kitchenName || item.kitchenName || "GoodBelly Kitchen"}
              </Text>

              {/* Customisable Tag */}
              {isCustomizable && (
                <Text style={[fontStyles.caption, tw`text-[10px] text-[#6B9080] font-medium mb-1`]}>
                  Customisable
                </Text>
              )}
            </View>

            {/* Price & Add Button */}
            <View style={tw`flex-row justify-between items-center`}>
              <View>
                <View style={tw`flex-row items-center`}>
                  {hasDiscount && (
                    <Text style={[fontStyles.body, tw`text-[10px] text-gray-400 line-through mr-1.5`]}>
                      ₹{Math.round(rawPrice)}
                    </Text>
                  )}
                  <Text
                    style={[
                      fontStyles.headingS,
                      tw`text-sm font-semibold text-gray-800`,
                    ]}
                  >
                    ₹{Math.round(finalPrice)}
                  </Text>
                </View>
              </View>

              {/* Add Button / Quantity Controls */}
              <View style={tw`items-end`}>
                {currentQuantity === 0 ? (
                  <TouchableOpacity
                    style={tw`bg-[#6B9080] px-3 py-1.5 rounded-xl`}
                    onPress={() => handleAddToCart(item, weightId)}
                  >
                    <Text
                      style={[
                        fontStyles.bodyBold,
                        tw`text-white text-xs font-bold`,
                      ]}
                    >
                      Add
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={tw`flex-row items-center bg-[#6B9080] rounded-xl`}>
                    <TouchableOpacity
                      style={tw`px-2 py-1.5`}
                      onPress={() => {
                        if (currentQuantity === 1) {
                          handleRemoveFromCart(cartItemId);
                        } else {
                          handleUpdateCartQuantity(cartItemId, productId, currentQuantity - 1);
                        }
                      }}
                    >
                      <Ionicons name="remove" size={14} color="white" />
                    </TouchableOpacity>

                    <Text style={[fontStyles.bodyBold, tw`text-white text-xs px-2`]}>
                      {currentQuantity}
                    </Text>

                    <TouchableOpacity
                      style={tw`px-2 py-1.5`}
                      onPress={() => handleUpdateCartQuantity(cartItemId, productId, currentQuantity + 1)}
                    >
                      <Ionicons name="add" size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity >
      </View >
    );
  };

  const renderProductSection = (title, products, loading, visibleCount, loadMore, loadingMore, specialFilter) => (
    <View style={tw`mt-4 mb-4`}>
      {/* Header */}
      <View style={tw`flex-row justify-between items-center px-4 mb-4`}>
        <Text style={[fontStyles.headingItalic, tw`text-base font-semibold text-gray-900`]}>
          {title}
        </Text>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("SeeMoreButton", {
              from: "SmartPeopleSection",
              categoryName: title,
              specialFilter: specialFilter,
            })
          }
          style={tw`flex-row items-center`}
        >
          <Text style={tw`text-xs text-green-600 mr-1`}>See more</Text>
        </TouchableOpacity>
      </View>

      {/* Loading State */}
      {loading ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw`px-4`}
        >
          {[1, 2].map((item) => (
            <SmartProductSkeleton key={item} />
          ))}
        </ScrollView>
      ) : (
        <FlatList
          horizontal
          data={products.slice(0, visibleCount)}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderProductCard}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw`px-4`}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={tw`h-[250px] w-[50px] justify-center items-center`}>
                <ActivityIndicator color="#6B9080" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={tw`w-full py-10 items-center`}>
              <Ionicons name="basket-outline" size={48} color="#d1d5db" />
              <Text style={[fontStyles.body, tw`text-gray-400 mt-2`]}>
                No products found under ₹100
              </Text>
            </View>
          }
        />
      )}
    </View>
  );

  return (
    <View>
      {/* DIETS FROM ₹99 Section */}
      {renderProductSection("DIETS FROM ₹99", mealsProducts, mealsLoading, mealsVisibleCount, loadMoreMeals, mealsLoadingMore, "dietsFrom99")}

      {/* EVERYTHING UNDER ₹99 Section */}
      {renderProductSection("EVERYTHING UNDER ₹99", everythingProducts, everythingLoading, everythingVisibleCount, loadMoreEverything, everythingLoadingMore, "everythingUnder99")}

      <KitchenConflictPopup
        visible={kitchenConflictVisible}
        onClose={() => setKitchenConflictVisible(false)}
        onViewCart={handleManualClearCart}
      />
      <CustomizationPopup
        visible={showCustomizationPopup}
        onClose={() => setShowCustomizationPopup(false)}
        product={selectedProductForCustomization}
        onAddToCart={handleCustomizationAddToCart}
      />
    </View>
  );
};

export default SmartPeopleSection;
