// components/BrowseByKitchen.js
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
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { fontStyles } from "../../utils/fontStyles";
import { Ionicons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchCart,
  addToCart,
  updateCartItemQty,
  removeCartItem,
} from "../../redux/slicer";
import KitchenConflictPopup from "../CustomPopup/KitchenConflictPopup";
import ProductSkeleton, { CategorySkeleton, GridProductSkeleton } from "../ProductSkeleton";
import CustomizationPopup from "../CustomizationPopup";
import * as Haptics from "expo-haptics";

const { width: screenWidth } = Dimensions.get("window");

const BrowseByKitchen = ({ refreshTrigger }) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const [selectedKitchen, setSelectedKitchen] = useState(null);
  const [kitchens, setKitchens] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendorProducts, setVendorProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kitchensLoading, setKitchensLoading] = useState(true);
  const [productsReady, setProductsReady] = useState(false);
  const [vendorProductsLoading, setVendorProductsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConflictPopup, setShowConflictPopup] = useState(false);
  const [conflictMessage, setConflictMessage] = useState("");
  const [showCustomizationPopup, setShowCustomizationPopup] = useState(false);
  const [selectedProductForCustomization, setSelectedProductForCustomization] = useState(null);
  const [customizationProductId, setCustomizationProductId] = useState(null);
  const [customizationWeightId, setCustomizationWeightId] = useState(null);

  // Get user and cart from Redux store
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const cart = useSelector((state) => state.cart);
  const cartItems = cart.items || [];

  // OPTIMIZED: Read products + wishlist from centralized Redux store
  const reduxProducts = useSelector((state) => state.products?.items || []);
  const reduxWishlistItems = useSelector((state) => state.wishlist?.items || []);

  // Calculate card width with proper spacing (matching ProductsByIngredients)
  const cardWidth = (screenWidth - 44) / 2;

  // Get cart item info for a product from Redux store (Handles customizable multiples)
  const getCartItemInfo = (productId) => {
    if (!cartItems || !Array.isArray(cartItems)) {
      return { cartItemId: null, quantity: 0 };
    }

    // Find all items matching this product ID (to sum up multiples for customized items)
    const matchingItems = cartItems.filter((item) => item.productId === productId);

    if (matchingItems.length > 0) {
      // Sum quantity of all variations
      const totalQuantity = matchingItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

      // Use the last added item's ID for removal logic (defaulting to LIFO for generic removal)
      const lastItem = matchingItems[matchingItems.length - 1];

      return {
        cartItemId: lastItem.id,
        quantity: totalQuantity,
        // Helper to check if we are dealing with multiple separate lines for this product
        hasMultipleVariants: matchingItems.length > 1
      };
    }

    return { cartItemId: null, quantity: 0, hasMultipleVariants: false };
  };

  const [favById, setFavById] = useState({});

  // OPTIMIZED: Use Redux products immediately — no API call needed
  useEffect(() => {
    if (reduxProducts.length > 0) {
      const validProducts = reduxProducts.filter(
        (product) =>
          product.isVerified &&
          product.images &&
          product.images.length > 0 &&
          product.weights &&
          product.weights.length > 0
      );
      setProducts(validProducts);
      setProductsReady(true);
      setLoading(false);

      // Extract kitchens from products if no kitchens loaded yet
      if (kitchens.length === 0) {
        const vendorsMap = new Map();
        validProducts.forEach((product) => {
          if (product.vendor) {
            const vendorId = product.vendor.id || product.vendor._id;
            const kitchenName =
              product.vendor.kitchenName ||
              product.vendor.name ||
              "Unknown Kitchen";
            if (vendorId && kitchenName) {
              vendorsMap.set(vendorId, {
                id: vendorId,
                vendor: {
                  id: vendorId,
                  kitchenName: kitchenName,
                },
              });
            }
          }
        });
        if (vendorsMap.size > 0) {
          setKitchens(Array.from(vendorsMap.values()));
          setKitchensLoading(false);
        }
      }
    }
  }, [reduxProducts]);

  // OPTIMIZED: Sync wishlist from Redux
  useEffect(() => {
    if (reduxWishlistItems.length > 0) {
      const newFavs = {};
      reduxWishlistItems.forEach((item) => {
        const id = item.id || item._id || item.productId;
        if (id) newFavs[id] = true;
      });
      setFavById((prev) => ({ ...prev, ...newFavs }));
    }
  }, [reduxWishlistItems]);

  // Fetch only kitchens (unique to this component) — products come from Redux
  useEffect(() => {
    fetchKitchens();
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

  // Helper to check if product is customizable
  const isProductCustomizable = (product) => {
    if (product?.isCustomizable === true) return true;
    if (product?.addOnCategories && Array.isArray(product.addOnCategories) && product.addOnCategories.length > 0) return true;
    if (product?.Addition?.addOns && Array.isArray(product.Addition.addOns) && product.Addition.addOns.length > 0) return true;
    return false;
  };


  // OPTIMIZED: Only fetch kitchens list — products come from Redux
  const fetchKitchens = async () => {
    try {
      setKitchensLoading(true);

      const kitchensResponse = await authService.getKitchens();

      let kitchensData = [];
      if (kitchensResponse) {
        if (Array.isArray(kitchensResponse.data)) {
          kitchensData = kitchensResponse.data;
        } else if (Array.isArray(kitchensResponse)) {
          kitchensData = kitchensResponse;
        } else if (
          kitchensResponse.data &&
          Array.isArray(kitchensResponse.data.data)
        ) {
          kitchensData = kitchensResponse.data.data;
        }
      }

      // If API returns kitchens, use them; otherwise we already extracted from products
      if (kitchensData.length > 0) {
        setKitchens(kitchensData);
      } else if (reduxProducts.length > 0 && kitchens.length === 0) {
        // Fallback: extract from Redux products
        const vendorsMap = new Map();
        reduxProducts.forEach((product) => {
          if (product.vendor) {
            const vendorId = product.vendor.id || product.vendor._id;
            const kitchenName =
              product.vendor.kitchenName ||
              product.vendor.name ||
              "Unknown Kitchen";
            if (vendorId && kitchenName) {
              vendorsMap.set(vendorId, {
                id: vendorId,
                vendor: {
                  id: vendorId,
                  kitchenName: kitchenName,
                },
              });
            }
          }
        });
        setKitchens(Array.from(vendorsMap.values()));
      }

      // If we don't have products from Redux, fallback to direct API fetch
      if (reduxProducts.length === 0) {
        const [productsResponse, wishlistResponse] = await Promise.all([
          authService.getAllProducts(),
          authService.getWishlist().catch((err) => {
            console.warn("Failed to fetch wishlist:", err);
            return { data: [] };
          }),
        ]);

        let productsData = [];
        if (productsResponse) {
          if (Array.isArray(productsResponse.data)) {
            productsData = productsResponse.data;
          } else if (Array.isArray(productsResponse)) {
            productsData = productsResponse;
          } else if (
            productsResponse.data &&
            Array.isArray(productsResponse.data.data)
          ) {
            productsData = productsResponse.data.data;
          }

          const validProducts = productsData.filter(
            (product) =>
              product.isVerified &&
              product.images &&
              product.images.length > 0 &&
              product.weights &&
              product.weights.length > 0
          );
          setProducts(validProducts);

          // Process wishlist
          let wishlistItems = [];
          if (wishlistResponse?.data?.items) {
            wishlistItems = wishlistResponse.data.items;
          } else if (wishlistResponse?.data && Array.isArray(wishlistResponse.data)) {
            wishlistItems = wishlistResponse.data;
          }
          const initialFavs = {};
          validProducts.forEach((p) => {
            if (p.id) initialFavs[p.id] = !!p.isFavorite;
          });
          if (Array.isArray(wishlistItems)) {
            wishlistItems.forEach((item) => {
              const id = item.id || item._id || item.productId;
              if (id) initialFavs[id] = true;
            });
          }
          setFavById(initialFavs);

          // Extract kitchens from products if API didn't return any
          if (kitchensData.length === 0) {
            const vendorsMap = new Map();
            productsData.forEach((product) => {
              if (product.vendor) {
                const vendorId = product.vendor.id || product.vendor._id;
                const kitchenName =
                  product.vendor.kitchenName ||
                  product.vendor.name ||
                  "Unknown Kitchen";
                if (vendorId && kitchenName) {
                  vendorsMap.set(vendorId, {
                    id: vendorId,
                    vendor: {
                      id: vendorId,
                      kitchenName: kitchenName,
                    },
                  });
                }
              }
            });
            setKitchens(Array.from(vendorsMap.values()));
          }
        }
      }
    } catch (err) {
      console.error("Error fetching kitchens:", err);
      setError("Failed to load data");
      if (kitchens.length === 0) setKitchens([]);
      if (products.length === 0) setProducts([]);
    } finally {
      setLoading(false);
      setKitchensLoading(false);
    }
  };

  // OPTIMIZED: Filter vendor products locally from Redux data — instant, no API call
  const filterVendorProductsLocally = (vendorId) => {
    if (!vendorId) return;

    const vendorFiltered = products.filter((product) => {
      const productVendorId =
        product.vendor?.id ||
        product.vendor?._id ||
        product.vendorId ||
        product.kitchenId;
      return String(productVendorId) === String(vendorId);
    });

    setVendorProducts(vendorFiltered);
    setVendorProductsLoading(false);
  };

  useEffect(() => {
    fetchKitchens();
  }, [refreshTrigger]);

  // Fetch cart when component mounts and user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCart());
    }
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    // Auto-select first kitchen if available and none selected
    if (kitchens.length > 0 && selectedKitchen === null) {
      const firstKitchenId = kitchens[0].vendor?.id || kitchens[0].id;
      setSelectedKitchen(firstKitchenId);
    }
  }, [kitchens]);

  // OPTIMIZED: Use local filtering instead of API call
  useEffect(() => {
    if (selectedKitchen) {
      filterVendorProductsLocally(selectedKitchen);
    }
  }, [selectedKitchen, products]);

  //   FAST: No loading state - just add to cart directly
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

    // Check authentication status (only for non-customizable products)
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

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

  //   FAST: No loading state for quantity updates
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
      Haptics.selectionAsync();
    } catch (error) {
      console.error("  Error updating cart:", error);
      Alert.alert("Error", "Failed to update quantity");
    }
  };

  //   FAST: No loading state for remove
  const handleRemoveFromCart = async (cartItemId, productId) => {
    if (!isAuthenticated || !user) {
      Alert.alert("Login Required", "Please login to modify cart");
      navigation.navigate("Login");
      return;
    }

    try {
      await dispatch(removeCartItem(cartItemId)).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.error("  Error removing from cart:", error);
      Alert.alert("Error", "Failed to remove item");
    }
  };

  const getFilteredProducts = () => {
    if (selectedKitchen && Array.isArray(vendorProducts)) {
      const isVeg = user?.preference?.toLowerCase() === 'veg';
      if (isVeg) {
        return vendorProducts
          .filter(p => p.productType === 'VEG')
          .slice(0, 4);
      }
      return vendorProducts.slice(0, 4);
    } else {
      return [];
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

  const filteredProducts = getFilteredProducts();
  const currentLoading = vendorProductsLoading;



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
      // This invalidates the cache issue by handling both scenarios
      const productId = customizationData.productId || customizationProductId;
      const weightId = customizationData.weightId || customizationWeightId;
      const { quantity, addOns, addOnTotal } = customizationData;

      console.log("🛒 Received from CustomizationPopup:", {
        payloadProductId: customizationData.productId,
        stateProductId: customizationProductId,
        finalProductId: productId
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

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

  // UPDATED: Added Redux cart integration and fast performance
  const renderProductCard = ({ item, index }) => {
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

    //   ADD: Get cart info from Redux store
    const cartInfo = getCartItemInfo(productId);
    const cartItemId = cartInfo.cartItemId;
    const currentQuantity = cartInfo.quantity;
    const isFav = !!favById[productId];

    // Check if Customizable
    const isCustomizable = isProductCustomizable(product);

    const originalPrice = Number(productPrice);
    const discountPrice = Number(product.weights?.[0]?.discountPrice || 0); // Selling Price

    // Logic: discountPrice is the Final Price if valid
    const hasDiscount = discountPrice > 0 && discountPrice < originalPrice;
    const finalPrice = hasDiscount ? discountPrice : originalPrice;

    return (
      <View style={[tw`m-1`, { width: cardWidth }]}>
        <TouchableOpacity
          style={[
            tw`bg-white rounded-2xl p-3 border border-gray-200`,
            tw`shadow-lg shadow-black/10`,
            { height: 280 },
          ]}
          onPress={() => {
            Haptics.selectionAsync();
            navigation.navigate("ProductDetails", { productId });
          }}
          activeOpacity={0.9}
        >
          {/* Heart Icon - Overlay */}
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

          {/* Product Image */}
          <Image
            source={{ uri: productImage }}
            style={tw`w-full h-28 rounded-xl mb-2`}
            resizeMode="contain"
          />

          {/* Content Container */}
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

            {/* Bottom Section: Price & Add Button */}
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
                    <Text style={[fontStyles.bodyBold, tw`text-white text-xs`]}>Add</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={tw`flex-row items-center justify-between bg-[#6B9080] rounded-xl w-20 h-8 px-2`}>
                    <TouchableOpacity
                      style={tw`h-full justify-center`}
                      onPress={() => {
                        if (currentQuantity === 1) {
                          handleRemoveFromCart(cartItemId, productId);
                        } else {
                          handleUpdateCartQuantity(cartItemId, productId, currentQuantity - 1);
                        }
                      }}
                    >
                      <Ionicons name="remove" size={14} color="white" />
                    </TouchableOpacity>

                    <Text style={[fontStyles.bodyBold, tw`text-white text-xs`]}>
                      {currentQuantity}
                    </Text>

                    <TouchableOpacity
                      style={tw`h-full justify-center`}
                      onPress={() => {
                        if (isProductCustomizable(product)) {
                          handleAddToCart(productId, weightId, product);
                        } else {
                          handleUpdateCartQuantity(cartItemId, productId, currentQuantity + 1);
                        }
                      }}
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

  // FIXED: Updated products grid with proper spacing
  const renderProductsGrid = () => {
    if (filteredProducts.length === 0) return null;

    return (
      <FlatList
        key={`browse-products-${filteredProducts.length}`}
        data={filteredProducts}
        renderItem={renderProductCard}
        keyExtractor={(item, index) =>
          item.id?.toString() || `product-${index}`
        }
        numColumns={2}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`px-0`}
      />
    );
  };

  // Function to check if kitchen is currently open
  const isKitchenOpen = (kitchen) => {
    if (!kitchen) return false;

    // First check the manual isOpen flag
    // Note: Some backends might use 'isOpen' directly on the object or inside vendor
    const isOpenFlag = kitchen.isOpen !== undefined ? kitchen.isOpen :
      (kitchen.vendor && kitchen.vendor.isOpen !== undefined ? kitchen.vendor.isOpen : true);

    if (!isOpenFlag) return false;

    // Then check if current time is within opening hours
    const openTime = kitchen.openTime || (kitchen.vendor && kitchen.vendor.openTime);
    const closeTime = kitchen.closeTime || (kitchen.vendor && kitchen.vendor.closeTime);

    if (openTime && closeTime) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const [openHour, openMinute] = openTime.split(":").map(Number);
      const [closeHour, closeMinute] = closeTime.split(":").map(Number);

      const openTimeInMinutes = openHour * 60 + openMinute;
      const closeTimeInMinutes = closeHour * 60 + closeMinute;

      return (
        currentTime >= openTimeInMinutes && currentTime <= closeTimeInMinutes
      );
    }

    return true; // Fallback to true if no times are set but isOpenFlag is true
  };

  const renderKitchenCategory = ({ item }) => {
    const kitchenId = item.vendor?.id || item.id;
    const kitchenName = item.vendor?.kitchenName || item.name || "Unknown";
    const isSelected = selectedKitchen === kitchenId;

    // Calculate open status using dynamic data
    const isOpen = isKitchenOpen(item);

    return (
      <TouchableOpacity
        style={[
          tw`bg-gray-100 rounded-full px-4 py-2 mr-3 mb-2 flex-row items-center`,
          isSelected && tw`bg-black`,
        ]}
        onPress={() => {
          setSelectedKitchen(kitchenId);
        }}
      >
        <Text
          style={[
            tw`text-xs font-medium mr-2`,
            isSelected ? tw`text-white` : tw`text-gray-700`,
          ]}
        >
          {kitchenName}
        </Text>


      </TouchableOpacity>
    );
  };

  // Show loading only if we have no data at all
  // Show loading only if we have no data at all
  if (loading && kitchens.length === 0 && products.length === 0) {
    return (
      <View style={tw`px-4 mt-2`}>
        <Text
          style={[fontStyles.headingItalic, tw`text-base font-semibold text-black`]}
        >
          Browse by Kitchen
        </Text>

        {/* Skeleton for Kitchen Tabs */}
        <View style={tw`mb-2`}>
          <CategorySkeleton />
        </View>

        {/* Skeleton for Products Grid */}
        <View style={tw`mx-0`}>
          <FlatList
            data={[1, 2, 3, 4]}
            renderItem={() => <GridProductSkeleton />}
            keyExtractor={(item) => `skeleton-initial-${item}`}
            numColumns={2}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw`px-0`}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={tw`px-4 mt-2`}>
      {/* Section Header */}
      <View style={tw`flex-row justify-between items-center mb-2`}>
        <Text
          style={[
            fontStyles.headingItalic,
            tw`text-base font-semibold text-black`,
          ]}
        >
          Browse by Kitchen
        </Text>

        <TouchableOpacity
          onPress={() => navigation.navigate("Kitchens")}
          style={tw`flex-row items-center`}
        >
          <Text style={tw`text-xs text-green-600 mr-1`}>See all kitchens</Text>
        </TouchableOpacity>
      </View>

      {/* Kitchen Tabs */}
      <View style={tw`mb-0`}>
        {kitchensLoading ? (
          <CategorySkeleton />
        ) : kitchens.length > 0 ? (
          <FlatList
            data={kitchens}
            keyExtractor={(item) =>
              item.vendor?.id || item.id || Math.random().toString()
            }
            renderItem={renderKitchenCategory}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`pb-0`}
          />
        ) : (
          <View style={tw`py-2`}>
            <Text style={tw`text-xs text-gray-500 text-center`}>
              No kitchens available.
            </Text>
          </View>
        )}
      </View>

      {/* Products Grid - FIXED: Proper spacing to prevent cutting off */}
      {currentLoading ? (
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
      ) : filteredProducts.length > 0 ? (
        <View style={tw`mx-0`}>{renderProductsGrid()}</View>
      ) : (
        <View style={tw`py-8 items-center bg-gray-50 rounded-xl`}>
          <Text style={tw`text-gray-500 text-center text-sm mb-2`}>
            {selectedKitchen
              ? `No products found from this kitchen`
              : "Select a kitchen to view products"}
          </Text>
          <Text style={tw`text-xs text-gray-400 text-center`}>
            {selectedKitchen
              ? "Try selecting a different kitchen"
              : "Choose a kitchen from the list above"}
          </Text>
        </View>
      )}
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
        onClose={() => {
          setShowCustomizationPopup(false);
          setSelectedProductForCustomization(null);
        }}
        product={selectedProductForCustomization}
        onAddToCart={handleCustomizationAddToCart}
        productId={customizationProductId}
        weightId={customizationWeightId}
      />
    </View>
  );
};

export default BrowseByKitchen;
