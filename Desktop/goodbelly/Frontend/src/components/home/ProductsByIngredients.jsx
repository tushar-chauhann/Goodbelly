import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import tw from "twrnc";
import { authService } from "../../services/authService.js";
import { fontStyles } from "../../utils/fontStyles";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchCart,
  addToCart,
  updateCartItemQty,
  removeCartItem,
  hydrateUser,
} from "../../redux/slicer";
import KitchenConflictPopup from "../CustomPopup/KitchenConflictPopup";
import CustomizationPopup from "../CustomizationPopup";

const { width: screenWidth } = Dimensions.get("window");

import ProductSkeleton, { CategorySkeleton, GridProductSkeleton } from "../ProductSkeleton";

const ProductsByIngredients = ({ onSeeMore, navigation: propNavigation, refreshTrigger }) => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [ingredients, setIngredients] = useState([]);
  const [productsData, setProductsData] = useState([]);
  const [ingredientCategories, setIngredientCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConflictPopup, setShowConflictPopup] = useState(false);
  const [conflictMessage, setConflictMessage] = useState("");
  const [showCustomizationPopup, setShowCustomizationPopup] = useState(false);
  const [selectedProductForCustomization, setSelectedProductForCustomization] = useState(null);
  const [customizationProductId, setCustomizationProductId] = useState(null);
  const [customizationWeightId, setCustomizationWeightId] = useState(null);

  const navigation = useNavigation();
  const dispatch = useDispatch();

  // Get user and cart from Redux store
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const cart = useSelector((state) => state.cart);
  const cartItems = cart.items || [];

  const cardWidth = (screenWidth - 44) / 2;

  // Refresh authentication state and data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      dispatch(hydrateUser());
      // Refresh ingredients data to reflect any preference changes
      fetchData();
    }, [dispatch])
  );

  // Get cart item info for a product from Redux store
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

  const [favById, setFavById] = useState({});

  useEffect(() => {
    fetchData();
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
    // Haptics.selectionAsync(); // Uncomment if Haptics is imported

    try {
      await authService.toggleFavorite(productId);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      // Revert on error
      setFavById((prev) => ({ ...prev, [productId]: !prev[productId] }));
    }
  };

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const [ingredientsResponse, productsResponse, wishlistResponse] = await Promise.all([
        authService.getIngredients(),
        authService.getAllProducts(),
        authService.getWishlist().catch((err) => {
          console.warn("Failed to fetch wishlist:", err);
          return { data: [] };
        }),
      ]);

      if (ingredientsResponse?.data && productsResponse?.data) {
        const rawIngredients = ingredientsResponse.data;
        const rawProducts = productsResponse.data;

        // Process Wishlist Items
        let wishlistItems = [];
        if (wishlistResponse?.data?.items) {
          wishlistItems = wishlistResponse.data.items;
        } else if (wishlistResponse?.data && Array.isArray(wishlistResponse.data)) {
          wishlistItems = wishlistResponse.data;
        } else if (Array.isArray(wishlistResponse)) {
          wishlistItems = wishlistResponse;
        }

        const validProducts = rawProducts.filter(
          (product) =>
            product.isVerified && product.images && product.images.length > 0
        );

        setProductsData(validProducts);

        // Initialize favorites state
        const initialFavs = {};

        // 1. Check product's own isFavorite flag
        validProducts.forEach((p) => {
          if (p.isFavorite) initialFavs[p.id || p._id] = true;
        });

        // 2. Override/Merge with actual Wishlist Data
        if (Array.isArray(wishlistItems)) {
          wishlistItems.forEach((item) => {
            const id = item.id || item._id || item.productId;
            if (id) initialFavs[id] = true;
          });
        }

        setFavById(initialFavs);

        const mappedIngredients = rawIngredients.map((ingredient) => ({
          ...ingredient,
          products: Array.isArray(ingredient.products)
            ? ingredient.products
            : [],
        }));

        setIngredients(mappedIngredients);

        const ingredientNames = mappedIngredients.map((ingredient) => ({
          id: ingredient.id,
          name: ingredient.name,
        }));

        setIngredientCategories([
          { id: "all", name: "All" },
          ...ingredientNames,
        ]);
      } else {
        setIngredients([]);
        setIngredientCategories([{ id: "all", name: "All" }]);
      }
    } catch (err) {
      console.error("  Error fetching data:", err);
      setError("Failed to load data");
      setIngredients([]);
      setIngredientCategories([{ id: "all", name: "All" }]);
    } finally {
      setLoading(false);
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  // Fetch cart when component mounts and user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCart());
    }
  }, [isAuthenticated, dispatch]);

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
    console.log("🔐 Auth Check:");
    console.log("  - isAuthenticated:", isAuthenticated);
    console.log("  - user exists:", !!user);

    const hasValidToken = await authService.isAuthenticated();
    console.log("  - hasValidToken:", hasValidToken);

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

      console.log("🛒 Received from CustomizationPopup:", {
        payloadProductId: customizationData.productId,
        stateProductId: customizationProductId,
        finalProductId: productId,
      });

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

      console.log("🚀 Final API payload:", JSON.stringify(payload, null, 2));

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

  //   INSTANT: No loading state - just add to cart directly
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

        console.log("    Product with add-ons:", {
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

    // Check authentication status
    const hasValidToken = await authService.isAuthenticated();

    if (!isAuthenticated || !user || !hasValidToken) {
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
      // Direct API call without any loading state
      await dispatch(
        addToCart({
          productId,
          weightId,
          quantity: 1,
        })
      ).unwrap();

      // Cart will update automatically via Redux - INSTANT FEEDBACK
    } catch (error) {
      console.error("  Error adding to cart:", error);

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

  //   INSTANT: No loading state for quantity updates
  const handleUpdateCartQuantity = async (
    cartItemId,
    productId,
    newQuantity
  ) => {
    if (!isAuthenticated || !user) {
      Alert.alert("Login Required", "Please login to update cart");
      navigation.navigate("Login");
      return;
    }

    try {
      await dispatch(
        updateCartItemQty({
          cartItemId,
          quantity: newQuantity,
        })
      ).unwrap();
    } catch (error) {
      console.error("  Error updating cart:", error);
      Alert.alert("Error", "Failed to update quantity");
    }
  };

  //   INSTANT: No loading state for remove
  const handleRemoveFromCart = async (cartItemId, productId) => {
    if (!isAuthenticated || !user) {
      Alert.alert("Login Required", "Please login to modify cart");
      navigation.navigate("Login");
      return;
    }

    try {
      await dispatch(removeCartItem(cartItemId)).unwrap();
    } catch (error) {
      console.error("  Error removing from cart:", error);
      Alert.alert("Error", "Failed to remove item");
    }
  };

  const calculateAverageRating = (reviews) => {
    if (!reviews || reviews.length === 0) return null;
    const sum = reviews.reduce(
      (total, review) => total + (review.rating || 0),
      0
    );
    return Math.round((sum / reviews.length) * 10) / 10;
  };

  //   FIXED: Filter products using ingredient data (since products don't have Ingredients populated)
  const getFilteredProducts = () => {
    let products = [];

    if (!productsData || !Array.isArray(productsData)) {
      return [];
    }

    if (selectedCategory === "All") {
      products = productsData
        .filter(
          (product) =>
            product &&
            product.images &&
            product.images.length > 0 &&
            product.weights &&
            product.weights.length > 0
        )
        .slice(0, 4)
        .map((product) => {
          const cartInfo = getCartItemInfo(product.id);
          return {
            id: product.id,
            name: product.name,
            description: product.description || "No description",
            price: product.weights[0]?.price || 0,
            image: product.images[0]?.url || null,
            weights: product.weights,
            originalPrice: product.weights[0]?.discountPrice || null,
            rating: calculateAverageRating(product.reviews),
            reviewCount: product.reviews?.length || 0,
            category: product.category?.name || "General",
            cartItemId: cartInfo.cartItemId,
            quantity: cartInfo.quantity,
            isCustomizable: product.isCustomizable,
            addOnCategories: product.addOnCategories,
            Addition: product.Addition,
            vendor: product.vendor,
            kitchenName: product.kitchenName,
          };
        });
    } else {
      // Find the selected ingredient from ingredients data
      const selectedIngredient = ingredients.find(
        (ing) => ing.name.toLowerCase() === selectedCategory.toLowerCase()
      );

      if (selectedIngredient && selectedIngredient.products) {
        // Get product IDs from the ingredient's products array
        const ingredientProductIds = selectedIngredient.products.map(
          (p) => p.id
        );

        // Filter productsData to only include products that are in the ingredient's products list
        const filteredByIngredient = productsData.filter((product) => {
          if (!product || !product.images || product.images.length === 0) {
            return false;
          }

          return ingredientProductIds.includes(product.id);
        });

        products = filteredByIngredient.slice(0, 4).map((product) => {
          const cartInfo = getCartItemInfo(product.id);
          return {
            id: product.id,
            name: product.name,
            description: product.description || "No description",
            price: product.weights?.[0]?.price || 0,
            image: product.images[0]?.url || null,
            weights: product.weights,
            originalPrice: product.weights?.[0]?.discountPrice || null,
            rating: calculateAverageRating(product.reviews),
            reviewCount: product.reviews?.length || 0,
            category: product.category?.name || "General",
            cartItemId: cartInfo.cartItemId,
            quantity: cartInfo.quantity,
            isCustomizable: product.isCustomizable,
            addOnCategories: product.addOnCategories,
            Addition: product.Addition,
            vendor: product.vendor,
            kitchenName: product.kitchenName,
          };
        });
      }
    }

    return products;
  };

  const filteredProducts = getFilteredProducts();

  const renderProductCard = ({ item }) => {
    if (!item) return null;

    const product = item;
    const productName = product.name || "Unnamed Product";
    const productDescription =
      product.description || "No description available";
    const originalPrice = Number(product.weights?.[0]?.price || product.price || 0);
    const discountPrice = Number(product.weights?.[0]?.discountPrice || 0);
    const hasDiscount = discountPrice > 0 && discountPrice < originalPrice;
    const finalPrice = hasDiscount ? discountPrice : originalPrice;

    const productImage =
      product.image || "https://via.placeholder.com/100x100?text=No+Image";
    const productId = product.id;
    const weightId = product.weights?.[0]?.id;
    const cartItemId = product.cartItemId;
    const currentQuantity = product.quantity || 0;

    const isFav = !!favById[productId];

    // Check if customizable
    const isCustomizable = isProductCustomizable(product);

    return (
      <View style={[tw`m-1`, { width: cardWidth }]}>
        <TouchableOpacity
          style={[
            tw`bg-white rounded-2xl p-3 border border-gray-200`,
            tw`shadow-lg shadow-black/10`,
            { height: 280 },
          ]}
          onPress={() => {
            if (productId) {
              navigation.navigate("ProductDetails", { productId });
            }
          }}
        >
          {/* Favorite Heart Icon */}
          <View style={tw`absolute right-2 top-2 z-10`}>
            <TouchableOpacity
              style={tw`bg-white/90 rounded-full p-1.5 shadow-sm`}
              onPress={() => handleToggleFavorite(product)}
            >
              <Ionicons
                name={isFav ? "heart" : "heart-outline"}
                size={20}
                color={isFav ? "#e11d48" : "#9CA3AF"}
              />
            </TouchableOpacity>
          </View>

          <Image
            source={{ uri: productImage }}
            style={tw`w-full h-32 rounded-xl mb-2`}
            resizeMode="cover"
          />

          <View style={tw`flex-1`}>
            <Text
              style={[fontStyles.headingS, tw`text-sm text-gray-900 mb-0.5`]}
              numberOfLines={1}
            >
              {productName}
            </Text>

            <Text
              style={tw`text-gray-500 text-xs leading-[14px] mb-0.5`}
              numberOfLines={1}
            >
              {productDescription}
            </Text>

            <Text style={[fontStyles.headingS, tw`text-xs font-semibold text-[#5F7F67] mb-1`]} numberOfLines={1}>
              {product.vendor?.kitchenName || product.kitchenName || "GoodBelly Kitchen"}
            </Text>

            {/* Customisable Tag */}
            {isCustomizable && (
              <Text style={[fontStyles.caption, tw`text-[10px] text-[#6B9080] font-medium mb-1`]}>
                Customisable
              </Text>
            )}

            <View style={tw`flex-row justify-between items-center mt-auto`}>
              <View>
                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-sm font-semibold text-gray-800`,
                  ]}
                >
                  ₹{finalPrice}
                </Text>
              </View>
              {/* Add Button / Quantity */}
              <View style={tw`items-end`}>
                {currentQuantity === 0 ? (
                  <TouchableOpacity
                    style={tw`bg-[#6B9080] w-20 h-8 justify-center items-center rounded-xl`}
                    onPress={() => handleAddToCart(productId, weightId, product)}
                  >
                    <Text style={[fontStyles.bodyBold, tw`text-white text-xs`]}>
                      Add
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View
                    style={tw`flex-row items-center justify-between bg-[#6B9080] rounded-xl w-20 h-8 px-2`}
                  >
                    <TouchableOpacity
                      style={tw`h-full justify-center`}
                      onPress={() => {
                        if (currentQuantity === 1) {
                          handleRemoveFromCart(cartItemId, productId);
                        } else {
                          handleUpdateCartQuantity(
                            cartItemId,
                            productId,
                            currentQuantity - 1
                          );
                        }
                      }}
                    >
                      <Ionicons name="remove" size={14} color="white" />
                    </TouchableOpacity>

                    <Text
                      style={[fontStyles.bodyBold, tw`text-white text-xs`]}
                    >
                      {currentQuantity}
                    </Text>

                    <TouchableOpacity
                      style={tw`h-full justify-center`}
                      onPress={() =>
                        handleUpdateCartQuantity(
                          cartItemId,
                          productId,
                          currentQuantity + 1
                        )
                      }
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

  // UPDATED: Products grid with same layout as BrowseByKitchen
  const renderProductsGrid = () => {
    if (!filteredProducts || filteredProducts.length === 0) {
      return null;
    }

    return (
      <FlatList
        key={`ingredients-products-${filteredProducts.length}`}
        data={filteredProducts}
        renderItem={renderProductCard}
        keyExtractor={(item, index) =>
          item?.id?.toString() || `product-${index}`
        }
        numColumns={2}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`px-0`}
      />
    );
  };

  const renderIngredientCategory = ({ item }) => (
    <TouchableOpacity
      style={[
        tw`bg-gray-100 rounded-full px-3.5 py-1.5 mr-2.5`,
        selectedCategory === item.name && tw`bg-black`,
      ]}
      onPress={() => setSelectedCategory(item.name)}
    >
      <Text
        style={[
          tw`text-xs font-medium text-gray-700`,
          selectedCategory === item.name && tw`text-white`,
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const handleRetry = () => {
    fetchData();
  };

  if (error && ingredients.length === 0) {
    return (
      <View style={tw`px-4 py-8 items-center`}>
        <Text style={tw`text-red-500 text-center mb-4`}>{error}</Text>
        <TouchableOpacity
          style={tw`bg-green-600 px-4 py-2 rounded-full`}
          onPress={handleRetry}
        >
          <Text style={tw`text-white font-semibold`}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={tw`px-4`}>
      <View style={tw`flex-row justify-between items-center mb-2`}>
        <Text
          style={[
            fontStyles.headingItalic,
            tw`text-base font-semibold text-black`,
          ]}
        >
          Products by Ingredients
        </Text>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate("SeeMoreButton", {
              from: "ProductsByIngredients",
              selectedCategory,
            })
          }
          style={tw`flex-row items-center`}
        >
          <Text style={tw`text-xs text-green-600 mr-1`}>See more</Text>
        </TouchableOpacity>
      </View>

      {/* Categories Filter */}
      {categoriesLoading ? (
        <CategorySkeleton />
      ) : (
        <FlatList
          data={ingredientCategories}
          keyExtractor={(item) => item.id}
          renderItem={renderIngredientCategory}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw`pb-2`}
        />
      )}

      {/* Products Grid */}
      {loading ? (
        <View style={tw`mx-0`}>
          <FlatList
            data={[1, 2, 3, 4]}
            renderItem={() => <GridProductSkeleton />}
            keyExtractor={(item) => `skeleton-${item}`}
            numColumns={2}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw`px-0`}
          />
        </View>
      ) : filteredProducts && filteredProducts.length > 0 ? (
        <View style={tw`mx-0`}>{renderProductsGrid()}</View>
      ) : (
        <View style={tw`py-8 items-center`}>
          <Text style={tw`text-gray-500 text-center`}>
            No products found
            {selectedCategory !== "All"
              ? ` made with "${selectedCategory}"`
              : ""}
          </Text>
          <Text style={tw`text-xs text-gray-400 text-center mt-2`}>
            Try selecting a different ingredient
          </Text>
        </View>
      )}

      {/* Ingredient Banner */}
      <View style={tw`mt-3`}>
        <Image
          source={require("../../assets/assets/ingredientbanner.png")}
          style={tw`w-full h-56 rounded-lg`}
        />
      </View>

      {/* Kitchen Conflict Popup */}
      <KitchenConflictPopup
        visible={showConflictPopup}
        onClose={() => setShowConflictPopup(false)}
        message={conflictMessage}
        onViewCart={() => navigation.navigate("Cart")}
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
    </View>
  );
};

export default ProductsByIngredients;
