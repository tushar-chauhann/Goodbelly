import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from "react";
import { View, Text, Image, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import tw from "twrnc";
import { Ionicons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import * as Haptics from "expo-haptics";
import { addToCart, updateCartItemQty, removeCartItem } from "../../redux/slicer";
import KitchenConflictPopup from "../CustomPopup/KitchenConflictPopup";
import CustomizationPopup from "../CustomizationPopup";
import { fontStyles } from "../../utils/fontStyles";
import * as AuthModule from "../../services/authService.js";
import { HorizontalCardSkeleton } from "../ProductSkeleton";

const authService = AuthModule.authService ?? AuthModule.default ?? AuthModule;

const HighStandards = forwardRef(({ hideHeader }, ref) => {
  const PRODUCT_CARD_HEIGHT = 152;
  const PRODUCT_CARD_OVERSCAN = 6;

  const navigation = useNavigation();
  const dispatch = useDispatch();
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
  const [favById, setFavById] = useState({});
  const [imageLoadingById, setImageLoadingById] = useState({});

  // Pagination State
  const [visibleCount, setVisibleCount] = useState(10);
  const [allProducts, setAllProducts] = useState([]);
  const [renderRange, setRenderRange] = useState({ start: 0, end: 10 });

  const listTopRef = useRef(0);
  const viewportRef = useRef({ offsetY: 0, viewportHeight: 0 });
  const renderRangeRef = useRef({ start: 0, end: 10 });

  const updateRenderRange = useCallback(
    ({ offsetY = viewportRef.current.offsetY, viewportHeight = viewportRef.current.viewportHeight } = {}) => {
      const nextVisibleCount = Math.min(visibleCount, allProducts.length);

      if (nextVisibleCount === 0) {
        const emptyRange = { start: 0, end: 0 };
        renderRangeRef.current = emptyRange;
        setRenderRange(emptyRange);
        return;
      }

      // Keep a small overscan window mounted while preserving the full scroll height with spacers.
      if (viewportHeight <= 0) {
        const fallbackRange = { start: 0, end: nextVisibleCount };
        if (renderRangeRef.current.start !== fallbackRange.start || renderRangeRef.current.end !== fallbackRange.end) {
          renderRangeRef.current = fallbackRange;
          setRenderRange(fallbackRange);
        }
        return;
      }

      const relativeOffset = Math.max(offsetY - listTopRef.current, 0);
      const visibleItemsInViewport = Math.max(1, Math.ceil(viewportHeight / PRODUCT_CARD_HEIGHT));
      const nextStart = Math.max(Math.floor(relativeOffset / PRODUCT_CARD_HEIGHT) - PRODUCT_CARD_OVERSCAN, 0);
      const nextEnd = Math.min(nextVisibleCount, nextStart + visibleItemsInViewport + PRODUCT_CARD_OVERSCAN * 2);
      const nextRange = { start: nextStart, end: nextEnd };

      if (renderRangeRef.current.start !== nextRange.start || renderRangeRef.current.end !== nextRange.end) {
        renderRangeRef.current = nextRange;
        setRenderRange(nextRange);
      }
    },
    [allProducts.length, visibleCount]
  );

  useImperativeHandle(ref, () => ({
    loadMore: () => {
      if (loadingMore || visibleCount >= allProducts.length) return;
      setLoadingMore(true);
      setTimeout(() => {
        setVisibleCount((prev) => prev + 10);
        setLoadingMore(false);
      }, 1000);
    },
    updateScrollMetrics: ({ offsetY, viewportHeight }) => {
      viewportRef.current = { offsetY, viewportHeight };
      updateRenderRange({ offsetY, viewportHeight });
    },
  }));

  useEffect(() => {
    fetchProducts();
  }, [user]);

  useEffect(() => {
    updateRenderRange();
  }, [visibleCount, allProducts.length, updateRenderRange]);

  const fetchProducts = async () => {
    try {
      const [productsResponse, wishlistResponse] = await Promise.all([
        authService.getAllProducts(),
        authService.getWishlist().catch((err) => {
          console.warn("Failed to fetch wishlist:", err);
          return { data: [] };
        }),
      ]);

      const fetchedProducts = productsResponse?.data || [];
      setAllProducts(fetchedProducts);

      let wishlistItems = [];
      if (wishlistResponse?.data?.items) {
        wishlistItems = wishlistResponse.data.items;
      } else if (wishlistResponse?.data && Array.isArray(wishlistResponse.data)) {
        wishlistItems = wishlistResponse.data;
      } else if (Array.isArray(wishlistResponse)) {
        wishlistItems = wishlistResponse;
      }

      const newFavs = {};
      fetchedProducts.forEach((p) => {
        const id = p.id || p._id;
        if (p.isFavorite) newFavs[id] = true;
      });

      if (Array.isArray(wishlistItems)) {
        wishlistItems.forEach((item) => {
          const id = item.id || item._id || item.productId;
          if (id) newFavs[id] = true;
        });
      }
      setFavById(newFavs);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleAddToCart = async (product, weightId) => {
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
  };

  const handleToggleFavorite = async (item) => {
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
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setFavById((prev) => ({ ...prev, [productId]: !prev[productId] }));
      Alert.alert("Error", "Failed to update favorite");
    } finally {
      setFavLoadingById((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const isProductCustomizable = (product) => {
    if (product?.isCustomizable === true) return true;
    if (product?.addOnCategories && Array.isArray(product.addOnCategories) && product.addOnCategories.length > 0) return true;
    return false;
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

  const renderProductCard = ({ item }) => {
    const remoteImageUrl = item.images?.[0]?.url;
    const imageSource = remoteImageUrl ? { uri: remoteImageUrl } : require("../../assets/defaultImage.jpg");

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
    const showImageLoader = Boolean(remoteImageUrl && imageLoadingById[productId]);

    const handleImageLoadStart = () => {
      if (!remoteImageUrl) return;
      setImageLoadingById((prev) => ({ ...prev, [productId]: true }));
    };

    const handleImageLoadEnd = () => {
      if (!remoteImageUrl) return;
      setImageLoadingById((prev) => ({ ...prev, [productId]: false }));
    };

    const handleImageError = () => {
      if (!remoteImageUrl) return;
      setImageLoadingById((prev) => ({ ...prev, [productId]: false }));
      console.warn("Failed to load HighStandards image for product", productId, remoteImageUrl);
    };

    return (
      <View key={productId} style={tw`mb-4`}>
        <TouchableOpacity
          style={[tw`bg-white rounded-2xl p-3 border border-gray-100 flex-row shadow-sm`, { width: "100%" }]}
          onPress={() => navigation.navigate("ProductDetails", { productId })}
          activeOpacity={0.95}
        >
          <View style={tw`relative`}>
            <Image
              source={imageSource}
              style={tw`w-28 h-28 rounded-xl bg-gray-100`}
              resizeMode="cover"
              onLoadStart={handleImageLoadStart}
              onLoadEnd={handleImageLoadEnd}
              onError={handleImageError}
            />
            {showImageLoader && (
              <View style={[tw`absolute inset-0 justify-center items-center rounded-xl`, { backgroundColor: "rgba(255,255,255,0.7)" }]}>
                <ActivityIndicator size="small" color="#6B9080" />
              </View>
            )}
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
                <TouchableOpacity onPress={() => handleToggleFavorite(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} disabled={isFavLoading}>
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
                    onPress={() => handleAddToCart(item, weightId)}
                    disabled={isCartLoading}
                  >
                    {isCartLoading ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={[fontStyles.bodyBold, tw`text-white text-xs`]}>Add</Text>}
                  </TouchableOpacity>
                ) : (
                  <View style={tw`flex-row items-center bg-[#6B9080] rounded-lg px-1 py-1 shadow-sm`}>
                    <TouchableOpacity style={tw`px-2 py-0.5`} onPress={() => (currentQuantity === 1 ? handleRemoveFromCart(cartItemId) : handleUpdateCartQuantity(cartItemId, productId, currentQuantity - 1))}>
                      <Ionicons name="remove" size={14} color="white" />
                    </TouchableOpacity>
                    <Text style={[fontStyles.bodyBold, tw`text-white text-xs px-1 font-bold`]}>{currentQuantity}</Text>
                    <TouchableOpacity style={tw`px-2 py-0.5`} onPress={() => handleUpdateCartQuantity(cartItemId, productId, currentQuantity + 1)}>
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
  };

  const handleListLayout = (event) => {
    listTopRef.current = event.nativeEvent.layout.y;
    updateRenderRange();
  };

  if (loading) {
    return (
      <View style={tw`mt-4 px-4`}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={tw`mb-4`}>
            <HorizontalCardSkeleton />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={tw`mt-4 pb-4`} onLayout={handleListLayout}>
      {!hideHeader && (
        <View style={tw`px-4 mb-3`}>
          <Text style={[fontStyles.headingItalic, tw`text-lg font-bold text-gray-900`]}>Recommended for You</Text>
        </View>
      )}

      <View style={tw`px-4`}>
        {renderRange.start > 0 && <View style={{ height: renderRange.start * PRODUCT_CARD_HEIGHT }} />}
        {allProducts.slice(renderRange.start, renderRange.end).map((item) => renderProductCard({ item }))}
        {renderRange.end < visibleCount && <View style={{ height: (visibleCount - renderRange.end) * PRODUCT_CARD_HEIGHT }} />}
        {loadingMore && (
          <View style={tw`py-4 items-center`}>
            <ActivityIndicator size="small" color="#6B9080" />
          </View>
        )}
      </View>

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
