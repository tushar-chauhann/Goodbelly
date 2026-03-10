// components/Kitchen/KitchenMenuScreen.js (Simplified Version)
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  SafeAreaView,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import tw from "twrnc";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import FeatherIcon from "react-native-vector-icons/Feather";
import { Ionicons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import {
  addToCart,
  updateCartItemQty,
  removeCartItem,
  fetchCart,
} from "../../redux/slicer";
import KitchenConflictPopup from "../CustomPopup/KitchenConflictPopup";
import CustomizationPopup from "../CustomizationPopup";
import { authService } from "../../services/authService.js";

// Import font styles
import { fontStyles } from "../../utils/fontStyles";
import ProductSkeleton from "../ProductSkeleton";

const { width: screenWidth } = Dimensions.get("window");

const KitchenMenuScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { kitchenId, kitchenName, products } = route.params;

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  // Redux & Cart State
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const cart = useSelector((state) => state.cart);
  const cartItems = cart.items || [];
  const [showConflictPopup, setShowConflictPopup] = useState(false);
  const [conflictMessage, setConflictMessage] = useState("");
  const [showCustomizationPopup, setShowCustomizationPopup] = useState(false);
  const [selectedProductForCustomization, setSelectedProductForCustomization] = useState(null);
  const [customizationProductId, setCustomizationProductId] = useState(null);
  const [customizationWeightId, setCustomizationWeightId] = useState(null);

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

  // Helper to check if product is customizable
  const isProductCustomizable = (product) => {
    // Check explicit flag from backend
    if (product?.isCustomizable === true) return true;

    // Check if product has addOnCategories (embedded data)
    if (product?.addOnCategories && Array.isArray(product.addOnCategories) && product.addOnCategories.length > 0) return true;

    // Check if product has Addition with addOns (embedded data)
    if (product?.Addition?.addOns && Array.isArray(product.Addition.addOns) && product.Addition.addOns.length > 0) return true;

    return false;
  };

  // Handle add to cart from customization popup
  const handleCustomizationAddToCart = async (customizationData) => {
    // Check authentication - rely on token check as primary validation
    const hasValidToken = await authService.isAuthenticated();

    // Primary check: if no valid token, definitely not authenticated
    if (!hasValidToken) {
      console.error("     No valid token found");
      Alert.alert("Login Required", "Please login to add items to cart", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Login",
          onPress: () => navigation.navigate("Login"),
        },
      ]);
      return;
    }

    // If we have a valid token but Redux state is stale, try to hydrate
    if (!isAuthenticated || !user) {
      console.log("    Valid token but Redux state not hydrated, attempting to hydrate...");
      await dispatch(hydrateUser());
    }

    try {
      // Use IDs from payload (New Popup) OR Fallback to State (Old/Cached Popup)
      const productId = customizationData.productId || customizationProductId;
      const weightId = customizationData.weightId || customizationWeightId;
      const { quantity, addOns, addOnTotal } = customizationData;

      // Prepare payload
      const payload = {
        productId: productId,
        weightId: weightId,
        quantity: quantity || 1,
      };

      // Only add Addition field if add-ons are present
      if (addOns && addOns.length > 0) {
        payload.Addition = addOns;
      }

      // Use existing Redux addToCart thunk with Addition field
      await dispatch(addToCart(payload)).unwrap();

      // Success - cart will refresh automatically
    } catch (error) {
      console.error("Error adding customized product:", error);

      let errorMessage = "Failed to add item to cart";
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      if (errorMessage.includes("different kitchens")) {
        setConflictMessage(errorMessage);
        setShowConflictPopup(true);
      } else {
        Alert.alert("Error", errorMessage);
      }
    }
  };

  const handleAddToCart = async (productId, weightId, product) => {
    // Check if product is customizable FIRST (before auth check)
    // This allows users to see customization options without logging in
    if (isProductCustomizable(product)) {
      // Fetch add-ons and show customization popup
      try {
        const addOnsResponse = await authService.getProductAddOns(productId);
        const productWithAddOns = {
          ...product,
          id: productId,  // Ensure ID is explicitly set
          weights: product.weights || [],  // Ensure weights array exists
          addOnCategories: addOnsResponse?.data?.addOnCategories || [],
          // Store the weightId that was clicked
          selectedWeightId: weightId,
        };

        console.log("Product with add-ons:", {
          id: productWithAddOns.id,
          hasWeights: productWithAddOns.weights?.length > 0,
          selectedWeightId: weightId
        });

        // Store IDs in state for use by handleCustomizationAddToCart
        setCustomizationProductId(productId);
        setCustomizationWeightId(weightId);
        setSelectedProductForCustomization(productWithAddOns);
        setShowCustomizationPopup(true);
        // Auth check will happen in handleCustomizationAddToCart
        return;
      } catch (error) {
        console.error("Error fetching add-ons:", error);
        // Continue with normal add to cart if add-ons fetch fails
      }
    }

    const hasValidToken = await authService.isAuthenticated();
    if (!isAuthenticated || !user || !hasValidToken) {
      Alert.alert("Login Required", "Please login to add items to cart", [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => navigation.navigate("Login") },
      ]);
      return;
    }

    try {
      await dispatch(
        addToCart({
          productId,
          weightId,
          quantity: 1,
        })
      ).unwrap();
    } catch (error) {
      console.error("Error adding to cart:", error);
      let errorMessage = "Failed to add item to cart";
      if (error?.message) errorMessage = error.message;
      else if (typeof error === "string") errorMessage = error;
      else if (error?.response?.data?.message) errorMessage = error.response.data.message;

      if (errorMessage.includes("different kitchens")) {
        setConflictMessage(errorMessage);
        setShowConflictPopup(true);
      } else if (
        errorMessage.includes("Authentication") ||
        errorMessage.includes("token") ||
        errorMessage.includes("login")
      ) {
        await authService.logout();
        Alert.alert("Session Expired", "Please login again", [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
      } else {
        Alert.alert("Error", errorMessage);
      }
    }
  };

  const handleUpdateCartQuantity = async (cartItemId, productId, newQuantity) => {
    if (!isAuthenticated || !user) {
      Alert.alert("Login Required", "Please login to update cart");
      navigation.navigate("Login");
      return;
    }
    try {
      await dispatch(updateCartItemQty({ cartItemId, quantity: newQuantity })).unwrap();
    } catch (error) {
      console.error("Error updating cart:", error);
      Alert.alert("Error", "Failed to update quantity");
    }
  };

  const handleRemoveFromCart = async (cartItemId, productId) => {
    if (!isAuthenticated || !user) {
      Alert.alert("Login Required", "Please login to modify cart");
      navigation.navigate("Login");
      return;
    }
    try {
      await dispatch(removeCartItem(cartItemId)).unwrap();
    } catch (error) {
      console.error("Error removing from cart:", error);
      Alert.alert("Error", "Failed to remove item");
    }
  };

  // Strictly filter to only this kitchen's products, then apply search
  const filteredProducts = useMemo(() => {
    // Safety filter: ensure only products belonging to this kitchen are shown
    const kitchenProducts = (products || []).filter((product) => {
      const productVendorId =
        product.vendor?.id ||
        product.vendor?._id ||
        product.vendorId ||
        product.kitchenId;
      // If no vendor info on product, keep it (trust the API)
      if (!productVendorId) return true;
      return String(productVendorId) === String(kitchenId);
    });

    if (!searchQuery) return kitchenProducts;
    return kitchenProducts.filter(
      (product) =>
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery, kitchenId]);

  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const ITEM_HEIGHT = 280 + 8; // height + margin

  const getItemLayout = (data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  });

  const handleLoadMore = () => {
    if (visibleCount < filteredProducts.length) {
      setVisibleCount((prev) => prev + 10);
    }
  };

  const renderProductCard = ({ item }) => {
    const product = item;
    const productName = product.name || "Unnamed Product";
    const productDescription =
      product.description || "No description available";
    const productPrice = product.weights?.[0]?.price || product.price || "0";
    const productImage =
      product.images?.[0]?.url ||
      product.image ||
      "https://via.placeholder.com/100x100?text=No+Image";
    const productId = product.id || product._id;
    const weightId = product.weights?.[0]?.id;
    const { cartItemId, quantity } = getCartItemInfo(productId);

    // Check if customizable
    const isCustomizable = isProductCustomizable(product);

    return (
      <TouchableOpacity
        style={[
          tw`bg-white rounded-2xl p-3 m-1 border border-gray-200`,
          tw`shadow-lg shadow-black/10`,
          { width: (screenWidth - 32) / 2, height: 280 },
        ]}
        onPress={() => {
          if (productId) {
            navigation.navigate("ProductDetails", {
              productId: productId,
              initialData: product,
            });
          }
        }}
      >
        <Image
          source={{ uri: productImage }}
          style={tw`w-full h-32 rounded-xl mb-2`}
          resizeMode="cover"
        />

        <View style={tw`flex-1`}>
          <Text
            style={[
              fontStyles.headingS,
              tw`text-sm font-semibold text-gray-900 mb-1`,
            ]}
            numberOfLines={1}
          >
            {productName}
          </Text>
          <Text
            style={[fontStyles.body, tw`text-gray-500 text-xs mb-2`]}
            numberOfLines={1}
          >
            {productDescription}
          </Text>

          {isCustomizable && <Text style={[fontStyles.caption, tw`text-[10px] text-[#6B9080] font-medium mb-1`]}>Customisable</Text>}

          <View style={tw`flex-row justify-between items-center mt-auto`}>
            <View>
              <Text
                style={[
                  fontStyles.headingS,
                  tw`text-sm font-semibold text-gray-900`,
                ]}
              >
                ₹{productPrice}
              </Text>
            </View>
            {quantity === 0 ? (
              <TouchableOpacity
                style={tw`bg-[#6B9080] h-8 w-20 justify-center items-center rounded-xl`}
                onPress={() => handleAddToCart(productId, weightId, product)}
              >
                <Text style={[fontStyles.bodyBold, tw`text-white text-xs`]}>
                  Add
                </Text>
              </TouchableOpacity>
            ) : (
              <View
                style={tw`flex-row items-center justify-between bg-[#6B9080] rounded-xl h-8 w-20 px-2`}
              >
                <TouchableOpacity
                  style={tw`h-full justify-center`}
                  onPress={() => {
                    if (quantity === 1) {
                      handleRemoveFromCart(cartItemId, productId);
                    } else {
                      handleUpdateCartQuantity(cartItemId, productId, quantity - 1);
                    }
                  }}
                >
                  <Ionicons name="remove" size={14} color="white" />
                </TouchableOpacity>
                <Text style={tw`text-white text-xs font-bold`}>{quantity}</Text>
                <TouchableOpacity
                  style={tw`h-full justify-center`}
                  onPress={() =>
                    handleUpdateCartQuantity(cartItemId, productId, quantity + 1)
                  }
                >
                  <Ionicons name="add" size={14} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={tw`px-4 pb-1`}>
      <Text
        style={[
          fontStyles.headingItalic,
          tw`text-lg font-semibold text-gray-900`,
        ]}
      >
        {kitchenName}
      </Text>
      <Text style={[fontStyles.body, tw`text-xs text-gray-500`]}>
        {filteredProducts.length} items available
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={tw`flex-1 justify-center items-center px-8 py-12`}>
      <View
        style={tw`w-24 h-24 bg-gray-100 rounded-full items-center justify-center mb-6`}
      >
        <FeatherIcon name="search" size={32} color="#6B7280" />
      </View>
      <Text style={[fontStyles.headingM, tw`text-gray-900 mb-2 text-center`]}>
        No products found
      </Text>
      <Text style={[fontStyles.body, tw`text-gray-500 text-center`]}>
        {searchQuery
          ? `No products matching "${searchQuery}"`
          : "No products available"}
      </Text>
      {searchQuery && (
        <TouchableOpacity
          style={tw`bg-[#6B9080] px-6 py-3 rounded-xl mt-4`}
          onPress={() => setSearchQuery("")}
        >
          <Text style={[fontStyles.bodyBold, tw`text-white`]}>
            Clear Search
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView
      style={[
        tw`flex-1 bg-gray-50`,
        {
          paddingTop: insets.top,
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      <View style={tw`bg-white px-4 py-3 shadow-sm shadow-black/5`}>
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={tw`w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3`}
          >
            <Icon name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>
          <View style={tw`flex-1`}>
            <Text
              style={[fontStyles.headingS, tw`text-gray-900`]}
              numberOfLines={1}
            >
              Menu
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View
          style={tw`flex-row items-center bg-gray-100 rounded-xl px-4 py-1 mt-1`}
        >
          <FeatherIcon name="search" size={20} color="#6B7280" />
          <TextInput
            style={[tw`flex-1 ml-3 text-gray-900`, fontStyles.body]}
            placeholder="Search products..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <FeatherIcon name="x" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <FlatList
          data={[1, 2, 3, 4, 5, 6, 7, 8]}
          renderItem={() => <ProductSkeleton />}
          keyExtractor={(item) => `skeleton-${item}`}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={tw`flex-grow pb-4 px-2`}
          numColumns={2}
          columnWrapperStyle={tw`justify-between`}
          scrollEnabled={false}
        />
      ) : (
        <FlatList
          key={`menu-${filteredProducts.length}`} // Fixed: Dynamic key to prevent error
          data={displayedProducts}
          renderItem={renderProductCard}
          keyExtractor={(item, index) =>
            item.id?.toString() || `product-${index}`
          }
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[tw`flex-grow px-2`, { paddingBottom: Math.max(insets.bottom, 16) }]}
          numColumns={2} // 2 columns layout
          columnWrapperStyle={tw`justify-between`}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            visibleCount < filteredProducts.length ? (
              <ActivityIndicator size="small" color="#6B9080" style={tw`my-4`} />
            ) : null
          }
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
          getItemLayout={getItemLayout}
        />
      )}
      <KitchenConflictPopup
        visible={showConflictPopup}
        onClose={() => setShowConflictPopup(false)}
        message={conflictMessage}
        onViewCart={() => navigation.navigate("CartScreen")}
      />

      {/* Customization Popup */}
      <CustomizationPopup
        visible={showCustomizationPopup}
        onClose={() => setShowCustomizationPopup(false)}
        product={selectedProductForCustomization}
        initialAddOns={[]} // Always start fresh for new add
        onAddToCart={handleCustomizationAddToCart}
        productId={customizationProductId}
        weightId={customizationWeightId}
      />
    </SafeAreaView>
  );
};

export default KitchenMenuScreen;
