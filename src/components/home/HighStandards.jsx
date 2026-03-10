import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { View, Text, Image, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Dimensions, useWindowDimensions, FlatList, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import tw from "twrnc";
import { Ionicons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import * as Haptics from "expo-haptics";
import { addToCart, updateCartItemQty, removeCartItem } from "../../redux/slicer";
import KitchenConflictPopup from "../CustomPopup/KitchenConflictPopup";
import CustomizationPopup from "../CustomizationPopup";
import { fontStyles } from "../../utils/fontStyles";
import { authService } from "../../services/authService";
import { HorizontalCardSkeleton } from "../ProductSkeleton";
import { fetchAllProducts, fetchWishlist as reduxFetchWishlist, toggleWishlistItem } from "../../redux/slicer";

// Helper for robust image extraction
const getProductImageSource = (item) => {
  if (!item) return require("../../assets/defaultImage.jpg");

  let uri = null;
  if (Array.isArray(item.images) && item.images.length > 0) {
    const firstImg = item.images[0];
    if (firstImg?.url && typeof firstImg.url === 'string') {
      uri = firstImg.url;
    } else if (typeof firstImg === 'string') {
      uri = firstImg;
    }
  }

  if (!uri && typeof item.image === 'string' && item.image.trim() !== "") {
    uri = item.image;
  }

  return uri ? { uri } : require("../../assets/defaultImage.jpg");
};

const ImageWithLoader = ({ source, style, resizeMode }) => {
  return (
    <View style={[style, { overflow: 'hidden' }]}>
      <Image
        source={source}
        style={tw`w-full h-full`}
        resizeMode={resizeMode}
      />
    </View>
  );
};

const ProductCard = React.memo(({
  item,
  navigation,
  isAuthenticated,
  cartItems,
  currentVendorId,
  favById,
  favLoadingById,
  cartLoadingById,
  onToggleFavorite,
  onAddToCart,
  onUpdateCartQuantity,
  onRemoveFromCart
}) => {
  const imageSource = getProductImageSource(item);
  const productId = item.id || item._id;
  const weightId = item.weights?.[0]?._id || item.weights?.[0]?.id;
  const rawPrice = item.weights?.[0]?.price || item.price || 0;
  const discountPrice = item.weights?.[0]?.discountPrice || item.discountPrice || 0;
  const hasDiscount = discountPrice > 0 && discountPrice < rawPrice;
  const finalPrice = hasDiscount ? discountPrice : rawPrice;
  const originalPrice = rawPrice;
  const discountPercentage = hasDiscount ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100) : 0;

  const currentCartItem = cartItems.find((ci) => ci.productId === productId);
  const currentQuantity = currentCartItem?.quantity || 0;
  const cartItemId = currentCartItem?.id;
  const isFav = !!favById[productId];
  const isFavLoading = !!favLoadingById[productId];
  const isCartLoading = !!cartLoadingById[productId];

  const isCustomizable = item.isCustomizable || (item.addOnCategories && item.addOnCategories.length > 0);

  return (
    <View style={tw`mb-4 px-4`}>
      <TouchableOpacity
        style={[tw`bg-white rounded-2xl p-3 border border-gray-100 flex-row shadow-sm`, { width: "100%" }]}
        onPress={() => {
          Haptics.selectionAsync();
          navigation.navigate("ProductDetails", { productId });
        }}
        activeOpacity={0.95}
      >
        <View style={tw`relative`}>
          <ImageWithLoader source={imageSource} style={tw`w-28 h-28 rounded-xl bg-gray-100`} resizeMode="cover" />
          {hasDiscount && (
            <View style={tw`absolute top-0 left-0 bg-red-500 rounded-tl-xl rounded-br-lg px-1.5 py-0.5`}>
              <Text style={tw`text-white text-[9px] font-bold`}>{discountPercentage}% OFF</Text>
            </View>
          )}
        </View>

        <View style={tw`flex-1 ml-3 justify-between`}>
          <View>
            <View style={tw`flex-row justify-between items-start`}>
              <Text style={[fontStyles.headingS, tw`text-sm text-gray-900 mb-0.5 mr-2 leading-tight flex-1`]} numberOfLines={1}>
                {item.name}
              </Text>
              <TouchableOpacity onPress={() => onToggleFavorite(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} disabled={isFavLoading}>
                {isFavLoading ? (
                  <ActivityIndicator size="small" color="#6B9080" />
                ) : (
                  <Ionicons name={isFav ? "heart" : "heart-outline"} size={20} color={isFav ? "#EF4444" : "#9CA3AF"} />
                )}
              </TouchableOpacity>
            </View>

            <Text style={tw`text-gray-500 text-xs leading-[14px] mb-0.5`} numberOfLines={1}>
              {item.description || "No description available"}
            </Text>

            <Text style={[fontStyles.headingS, tw`text-xs font-semibold text-[#5F7F67] mb-1`]} numberOfLines={1}>
              {item.vendor?.kitchenName || item.kitchenName || "GoodBelly Kitchen"}
            </Text>

            {(() => {
              const protein = item?.Nutrition?.protein || item?.nutrition?.protein || 0;
              if (protein > 0) {
                return <Text style={[fontStyles.body, tw`text-gray-700 text-[10px] mb-0.5`]}>{protein.toFixed(1)}g protein</Text>;
              }
              return null;
            })()}

            {isCustomizable && <Text style={[fontStyles.caption, tw`text-[10px] text-[#6B9080] font-medium mb-1`]}>Customisable</Text>}
          </View>

          <View style={tw`flex-row justify-between items-center mt-2`}>
            <View style={tw`flex-row items-center items-baseline`}>
              <Text style={[fontStyles.headingS, tw`text-sm font-semibold text-gray-800`]}>₹{Math.round(finalPrice)}</Text>
              {hasDiscount && <Text style={tw`text-gray-400 text-[10px] ml-1 line-through`}>₹{Math.round(originalPrice)}</Text>}
            </View>

            <View>
              {currentQuantity === 0 ? (
                <TouchableOpacity
                  style={tw`bg-[#6B9080] px-4 py-1.5 rounded-lg shadow-sm w-[70px] items-center justify-center`}
                  onPress={() => onAddToCart(item, weightId)}
                  disabled={isCartLoading}
                >
                  {isCartLoading ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={[fontStyles.bodyBold, tw`text-white text-xs`]}>Add</Text>}
                </TouchableOpacity>
              ) : (
                <View style={tw`flex-row items-center bg-[#6B9080] rounded-lg px-1 py-1 shadow-sm`}>
                  <TouchableOpacity style={tw`px-2 py-0.5`} onPress={() => (currentQuantity === 1 ? onRemoveFromCart(cartItemId) : onUpdateCartQuantity(cartItemId, productId, currentQuantity - 1))}>
                    <Ionicons name="remove" size={14} color="white" />
                  </TouchableOpacity>
                  <Text style={[fontStyles.bodyBold, tw`text-white text-xs px-1 font-bold`]}>{currentQuantity}</Text>
                  <TouchableOpacity style={tw`px-2 py-0.5`} onPress={() => onUpdateCartQuantity(cartItemId, productId, currentQuantity + 1)}>
                    <Ionicons name="add" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

const HighStandards = forwardRef(({ hideHeader, ListHeaderComponent, ...rest }, ref) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { width } = useWindowDimensions();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { items: cartItems, vendorId: currentVendorId } = useSelector((state) => state.cart);

  const [kitchenConflictVisible, setKitchenConflictVisible] = useState(false);
  const [conflictItem, setConflictItem] = useState(null);

  // Customization State
  const [showCustomizationPopup, setShowCustomizationPopup] = useState(false);
  const [selectedProductForCustomization, setSelectedProductForCustomization] = useState(null);
  const [customizationProductId, setCustomizationProductId] = useState(null);
  const [customizationWeightId, setCustomizationWeightId] = useState(null);

  // Loader states
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favLoadingById, setFavLoadingById] = useState({});
  const [cartLoadingById, setCartLoadingById] = useState({});

  // Get products and wishlist from REDUX
  const reduxProducts = useSelector((state) => state.products.items || []);
  const reduxWishlistStatus = useSelector((state) => state.wishlist.status);
  const reduxWishlistItems = useSelector((state) => state.wishlist.items || []);

  const [favById, setFavById] = useState({});
  const [productsReady, setProductsReady] = useState(false);

  // Pagination State
  const [visibleCount, setVisibleCount] = useState(10);

  // SYNC: Update favById and productsReady when Redux items change
  useEffect(() => {
    if (reduxProducts.length > 0) {
      const newFavs = {};

      // 1. Check product flags
      reduxProducts.forEach(p => {
        if (p.isFavorite) newFavs[p.id || p._id] = true;
      });

      // 2. Check Redux wishlist items
      reduxWishlistItems.forEach(item => {
        const id = item.id || item._id || item.productId;
        if (id) newFavs[id] = true;
      });

      setFavById(newFavs);
      setProductsReady(true);
      setLoading(false);
    }
  }, [reduxProducts, reduxWishlistItems]);

  const handleLoadMoreInternal = () => {
    if (loadingMore || visibleCount >= reduxProducts.length) return;
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + 10);
      setLoadingMore(false);
    }, 1000);
  };

  const flatListRef = React.useRef(null);

  useImperativeHandle(ref, () => ({
    loadMore: handleLoadMoreInternal,
    scrollToOffset: (params) => flatListRef.current?.scrollToOffset(params),
  }));

  useEffect(() => {
    // Initial pre-fetch (cached)
    dispatch(fetchAllProducts());
    dispatch(reduxFetchWishlist());
  }, []);

  const handleCustomizationAddToCart = async (customizationData) => {
    if (!isAuthenticated) {
      Alert.alert("Login Required", "Please login to add items to cart", [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => navigation.navigate("Login") },
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
      setKitchenConflictVisible(true);
    }
  };

  const handleAddToCart = React.useCallback(async (product, weightId) => {
    if (isProductCustomizable(product)) {
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

    if (!isAuthenticated) {
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

    setCartLoadingById((prev) => ({ ...prev, [productId]: true }));

    try {
      await dispatch(addToCart({ productId, weightId, quantity: 1 })).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error adding to cart:", error);
      setKitchenConflictVisible(true);
    } finally {
      setCartLoadingById((prev) => ({ ...prev, [productId]: false }));
    }
  }, [cartItems, currentVendorId, dispatch, isAuthenticated, navigation]);

  const handleToggleFavorite = React.useCallback(async (item) => {
    if (!isAuthenticated) {
      Alert.alert("Login Required", "Please login to add to favorites", [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => navigation.navigate("Login") },
      ]);
      return;
    }

    const productId = item.id || item._id;
    setFavLoadingById((prev) => ({ ...prev, [productId]: true }));
    setFavById((prev) => ({ ...prev, [productId]: !prev[productId] }));
    Haptics.selectionAsync();

    try {
      await authService.toggleFavorite(productId);
      dispatch(toggleWishlistItem(item));
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setFavById((prev) => ({ ...prev, [productId]: !prev[productId] }));
      Alert.alert("Error", "Failed to update favorite");
    } finally {
      setFavLoadingById((prev) => ({ ...prev, [productId]: false }));
    }
  }, [dispatch, isAuthenticated, navigation]);

  const isProductCustomizable = (product) => {
    if (product?.isCustomizable === true) return true;
    if (product?.addOnCategories && Array.isArray(product.addOnCategories) && product.addOnCategories.length > 0) return true;
    return false;
  };

  const handleManualClearCart = () => {
    navigation.navigate("Cart");
    setKitchenConflictVisible(false);
  };

  const handleUpdateCartQuantity = React.useCallback(async (cartItemId, productId, newQuantity) => {
    try {
      await dispatch(updateCartItemQty({ cartItemId, quantity: newQuantity })).unwrap();
      Haptics.selectionAsync();
    } catch (error) {
      console.error("Error updating cart:", error);
    }
  }, [dispatch]);

  const handleRemoveFromCart = React.useCallback(async (cartItemId) => {
    try {
      await dispatch(removeCartItem(cartItemId)).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.error("Error removing from cart:", error);
    }
  }, [dispatch]);

  const renderProductCard = ({ item }) => (
    <ProductCard
      item={item}
      navigation={navigation}
      isAuthenticated={isAuthenticated}
      cartItems={cartItems}
      currentVendorId={currentVendorId}
      favById={favById}
      favLoadingById={favLoadingById}
      cartLoadingById={cartLoadingById}
      onToggleFavorite={handleToggleFavorite}
      onAddToCart={handleAddToCart}
      onUpdateCartQuantity={handleUpdateCartQuantity}
      onRemoveFromCart={handleRemoveFromCart}
    />
  );

  if (loading || !productsReady) {
    return (
      <View>
        {ListHeaderComponent}
        <View style={tw`mt-4 px-4`}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={tw`mb-4`}>
              <HorizontalCardSkeleton />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-white`}>
      <FlatList
        ref={flatListRef}
        style={tw`bg-white`}
        contentContainerStyle={tw`bg-white`}
        data={reduxProducts.slice(0, visibleCount)}
        renderItem={renderProductCard}
        keyExtractor={(item) => (item.id || item._id || Math.random()).toString()}
        onEndReached={handleLoadMoreInternal}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <>
            {ListHeaderComponent}
            {!hideHeader && (
              <View style={[tw`px-4 py-4 bg-white`, { marginTop: 0 }]}>
                <Text style={[fontStyles.headingItalic, tw`text-base font-semibold text-gray-900`]}>Recommended for You</Text>
              </View>
            )}
          </>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={tw`py-4 items-center`}>
              <ActivityIndicator size="small" color="#6B9080" />
            </View>
          ) : <View style={tw`h-10`} />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={6}
        maxToRenderPerBatch={10}
        windowSize={10}
        {...rest}
      />

      <KitchenConflictPopup visible={kitchenConflictVisible} onClose={() => setKitchenConflictVisible(false)} onViewCart={handleManualClearCart} />
      <CustomizationPopup
        visible={showCustomizationPopup}
        onClose={() => setShowCustomizationPopup(false)}
        product={selectedProductForCustomization}
        onAddToCart={handleCustomizationAddToCart}
      />
    </View>
  );
});

export default HighStandards;
