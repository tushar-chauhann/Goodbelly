import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import ChooseYourFuel from "./ChooseYourFuel";
import { getItem, setItem } from "../../utils/storage";
import api from "../../services/api";
import { fontStyles } from "../../utils/fontStyles";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchCart,
  addToCart,
  updateCartItemQty,
  removeCartItem,
  hydrateUser,
} from "../../redux/slicer";
import { authService } from "../../services/authService";
import { Alert } from "react-native";
import KitchenConflictPopup from "../CustomPopup/KitchenConflictPopup";
import CustomizationPopup from "../CustomizationPopup";

const { width: screenWidth } = Dimensions.get("window");

export default function SearchScreen({ navigation, route }) {
  const dispatch = useDispatch();

  // Get user and cart from Redux store
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const cart = useSelector((state) => state.cart);
  const cartItems = cart.items || [];

  const [searchText, setSearchText] = useState(route.params?.searchText || "");
  const [isListening, setIsListening] = useState(false);
  const [micColor, setMicColor] = useState("#333");
  const [recentSearches, setRecentSearches] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [showConflictPopup, setShowConflictPopup] = useState(false);
  const [conflictMessage, setConflictMessage] = useState("");
  const [showCustomizationPopup, setShowCustomizationPopup] = useState(false);
  const [selectedProductForCustomization, setSelectedProductForCustomization] = useState(null);
  const [customizationProductId, setCustomizationProductId] = useState(null);
  const [customizationWeightId, setCustomizationWeightId] = useState(null);

  // Calculate card width for 2-column layout
  const cardWidth = (screenWidth - 48) / 2; // 48 = 32px padding + 16px gap

  // Load recent searches and cart on component mount
  useEffect(() => {
    loadRecentSearches();
    if (isAuthenticated) {
      dispatch(fetchCart());
    }
  }, [isAuthenticated, dispatch]);

  // Search when searchText changes (with debounce)
  useEffect(() => {
    if (searchText.trim()) {
      const delayDebounceFn = setTimeout(() => {
        performSearch(searchText.trim());
      }, 500); // 500ms debounce

      return () => clearTimeout(delayDebounceFn);
    } else {
      setSearchResults([]);
      setSearchPerformed(false);
    }
  }, [searchText]);

  const loadRecentSearches = async () => {
    try {
      const savedSearches = await getItem("recentSearches");
      if (savedSearches) {
        setRecentSearches(JSON.parse(savedSearches));
      }
    } catch (error) {
      console.error("Error loading recent searches:", error);
      setRecentSearches([]);
    }
  };

  const saveRecentSearches = async (searches) => {
    try {
      await setItem("recentSearches", JSON.stringify(searches));
      setRecentSearches(searches);
    } catch (error) {
      console.error("Error saving recent searches:", error);
    }
  };

  const performSearch = async (term) => {
    if (!term.trim()) return;

    setLoading(true);
    setSearchPerformed(true);

    try {
      const response = await api.get(
        `/products?search=${encodeURIComponent(term)}`
      );

      if (response.data && response.data.data) {
        // Filter products that have images and weights
        const validProducts = response.data.data.filter(
          (product) =>
            product.images &&
            product.images.length > 0 &&
            product.weights &&
            product.weights.length > 0
        );
        setSearchResults(validProducts);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMicPress = () => {
    if (isListening) {
      setIsListening(false);
      setMicColor("#333");
    } else {
      setIsListening(true);
      setMicColor("#FF6B6B");
      // Simulate voice recognition
      setTimeout(() => {
        setSearchText("Milk");
        setIsListening(false);
        setMicColor("#333");
      }, 2000);
    }
  };

  const handleSearch = (term) => {
    setSearchText(term);

    // Add to recent searches if not already present and limit to 8
    if (term.trim()) {
      // Remove if already exists to avoid duplicates
      const filteredSearches = recentSearches.filter(
        (item) => item !== term.trim()
      );
      // Add to beginning and keep only last 8
      const updatedSearches = [term.trim(), ...filteredSearches].slice(0, 8);
      saveRecentSearches(updatedSearches);
    }
  };

  const handleSearchSubmit = () => {
    if (searchText.trim()) {
      handleSearch(searchText.trim());
      performSearch(searchText.trim());
    }
  };

  const clearSearch = () => {
    setSearchText("");
    setSearchResults([]);
    setSearchPerformed(false);
  };

  const removeRecentSearch = (itemToRemove) => {
    const updatedSearches = recentSearches.filter(
      (item) => item !== itemToRemove
    );
    saveRecentSearches(updatedSearches);
  };

  const clearAllRecentSearches = () => {
    saveRecentSearches([]);
  };

  const getMicIcon = () => {
    return isListening ? "mic" : "mic-none";
  };

  // Function to truncate long text with ellipsis
  const truncateText = (text, maxLength = 15) => {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + "...";
    }
    return text;
  };

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

  // Helper to check if product is customizable
  const isProductCustomizable = (product) => {
    // Check explicit flag from backend
    if (product?.isCustomizable === true) return true;

    // Check if product has addOnCategories (embedded data)
    if (product?.addOnCategories?.length > 0) return true;

    // Check if product has Addition with addOns (embedded data)
    if (product?.Addition?.addOns?.length > 0) return true;

    return false;
  };

  // Add to cart handler
  const handleAddToCart = async (productId, weightId, product) => {
    // Check customization FIRST (before auth)
    if (isProductCustomizable(product)) {
      try {
        const addOnsResponse = await authService.getProductAddOns(productId);
        const productWithAddOns = {
          ...product,
          addOnCategories: addOnsResponse?.data?.addOnCategories || [],
        };
        // Store IDs for use in handleCustomizationAddToCart
        setCustomizationProductId(productId);
        setCustomizationWeightId(weightId);
        setSelectedProductForCustomization(productWithAddOns);
        setShowCustomizationPopup(true);
        return;
      } catch (error) {
        console.error("Error fetching add-ons:", error);
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

  // Update cart quantity handler
  const handleUpdateCartQuantity = async (cartItemId, productId, newQuantity) => {
    if (!isAuthenticated || !user) {
      Alert.alert("Login Required", "Please login to update cart");
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
      console.error("Error updating cart:", error);
      Alert.alert("Error", "Failed to update quantity");
    }
  };

  // Remove from cart handler
  const handleRemoveFromCart = async (cartItemId, productId) => {
    if (!isAuthenticated || !user) {
      Alert.alert("Login Required", "Please login to modify cart");
      return;
    }

    try {
      await dispatch(removeCartItem(cartItemId)).unwrap();
    } catch (error) {
      console.error("Error removing from cart:", error);
      Alert.alert("Error", "Failed to remove item");
    }
  };

  // Handle add to cart from customization popup
  const handleCustomizationAddToCart = async (customizationData) => {
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
          productId: customizationData.productId,
          weightId: customizationData.weightId,
          quantity: customizationData.quantity,
          Addition: customizationData.addOns,
        })
      ).unwrap();
    } catch (error) {
      console.error("Error adding customized product:", error);

      let errorMessage = "Failed to add item to cart";
      if (error?.message) errorMessage = error.message;
      else if (typeof error === "string") errorMessage = error;
      else if (error?.response?.data?.message) errorMessage = error.response.data.message;

      if (errorMessage.includes("different kitchens")) {
        setConflictMessage(errorMessage);
        setShowConflictPopup(true);
      } else {
        Alert.alert("Error", errorMessage);
      }
    }
  };

  // Render product card (same style as BrowseByKitchen)
  const renderProductCard = ({ item }) => {
    const product = item;
    const productName = product.name || "Unnamed Product";
    const productDescription =
      product.description || "No description available";
    const productPrice = product.weights?.[0]?.price || product.price || "0";
    const productImage =
      product.images?.[0]?.url ||
      "https://via.placeholder.com/100x100?text=No+Image";
    const productId = product.id || product._id;

    return (
      <View style={[tw`m-1`, { width: cardWidth }]}>
        <TouchableOpacity
          style={[
            tw`bg-white rounded-2xl p-3 flex-1 border border-gray-200`,
            tw`shadow-lg shadow-black/10`,
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
                fontStyles.headingS, // UPDATED: Using font style
                tw`text-xs text-gray-900 mb-1`,
              ]}
              numberOfLines={1}
            >
              {productName}
            </Text>
            <Text
              style={tw`text-gray-500 text-[10px] leading-[14px] mb-2`}
              numberOfLines={1}
            >
              {productDescription}
            </Text>

            {isProductCustomizable(product) && (
              <Text style={[fontStyles.caption, tw`text-[10px] text-[#6B9080] font-medium mb-1`]}>
                Customisable
              </Text>
            )}

            <View style={tw`mt-auto`}>
              <View style={tw`flex-row justify-between items-center`}>
                {/* Left side: Price */}
                <View>
                  <Text
                    style={[
                      fontStyles.headingS,
                      tw`text-sm font-semibold text-gray-800`,
                    ]}
                  >
                    ₹{productPrice}
                  </Text>
                </View>

                {/* Right side: Add button or quantity controls */}

                {(() => {
                  const cartInfo = getCartItemInfo(productId);
                  const currentQuantity = cartInfo.quantity || 0;
                  const cartItemId = cartInfo.cartItemId;
                  const weightId = product.weights?.[0]?.id;

                  return currentQuantity === 0 ? (
                    <TouchableOpacity
                      style={tw`bg-[#6B9080] px-3 py-1.5 rounded-xl`}
                      onPress={() => handleAddToCart(productId, weightId, product)}
                    >
                      <Text
                        style={[
                          fontStyles.bodyBold,
                          tw`text-white text-xs font-semibold`,
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
                        style={[fontStyles.bodyBold, tw`text-white text-xs px-2`]}
                      >
                        {currentQuantity}
                      </Text>

                      <TouchableOpacity
                        style={tw`px-2 py-1.5`}
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
                  );
                })()}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // Render search results grid
  const renderSearchResults = () => {
    if (loading) {
      return (
        <View style={tw`py-8 items-center`}>
          <ActivityIndicator size="large" color="#6B9080" />
          <Text
            style={[
              fontStyles.body, // UPDATED: Using font style
              tw`text-gray-600 mt-2`,
            ]}
          >
            Searching products...
          </Text>
        </View>
      );
    }

    if (searchPerformed && searchResults.length === 0) {
      return (
        <View style={tw`py-8 items-center`}>
          <Icon name="search" size={48} color="#9CA3AF" />
          <Text
            style={[
              fontStyles.headingS, // UPDATED: Using font style
              tw`text-gray-500 text-center mt-4 text-base`,
            ]}
          >
            No products found
          </Text>
          <Text
            style={[
              fontStyles.body, // UPDATED: Using font style
              tw`text-gray-400 text-center mt-2 text-xs`,
            ]}
          >
            Try searching with different keywords
          </Text>
        </View>
      );
    }

    if (searchResults.length > 0) {
      return (
        <View style={tw`mt-1`}>
          <Text
            style={[
              fontStyles.headingItalic,
              tw`text-base font-semibold  text-gray-900 mb-1 px-4`,
            ]}
          >
            Search Results ({searchResults.length})
          </Text>
          <FlatList
            data={searchResults}
            renderItem={renderProductCard}
            keyExtractor={(item, index) =>
              item.id?.toString() || `search-result-${index}`
            }
            numColumns={2}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw`px-4`}
          />
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Header with Search Bar */}
      <View style={tw`px-4 pt-2 pb-2 border-b border-gray-200`}>
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={tw`w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3`}
          >
            <Icon name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>

          <View
            style={tw`flex-1 flex-row items-center bg-gray-100 rounded-full px-4 py-3`}
          >
            <Icon name="search" size={22} color="#666" />
            <TextInput
              style={[
                fontStyles.body, // UPDATED: Using font style
                tw`flex-1 text-gray-800 ml-2 mr-2 p-0`,
              ]}
              placeholder='Search "Meal"'
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearchSubmit}
              autoFocus={true}
              returnKeyType="search"
            />
            {searchText.length > 0 ? (
              <TouchableOpacity onPress={clearSearch}>
                <Icon name="close" size={20} color="#666" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleMicPress}>
                <Icon name={getMicIcon()} size={20} color={micColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        {/* Recent Searches Section - Always show if there are recent searches */}
        {recentSearches.length > 0 && (
          <View style={tw`px-4 mt-1`}>
            <View style={tw`flex-row justify-between items-center mb-1`}>
              <Text
                style={[
                  fontStyles.headingItalic,
                  tw`text-base font-semibold  text-gray-900`,
                ]}
              >
                Recent Searches
              </Text>
              <TouchableOpacity onPress={clearAllRecentSearches}>
                <Text
                  style={[
                    fontStyles.bodyBold,
                    tw`text-red-500 text-xs font-medium`,
                  ]}
                >
                  Clear All
                </Text>
              </TouchableOpacity>
            </View>
            <View style={tw`flex-row flex-wrap`}>
              {recentSearches.map((item, index) => (
                <View
                  key={index}
                  style={tw`flex-row items-center bg-gray-100 rounded-full px-2 py-1.5 mr-2 mb-1`}
                >
                  <TouchableOpacity onPress={() => handleSearch(item)}>
                    <Text
                      style={[
                        fontStyles.body, // UPDATED: Using font style
                        tw`text-gray-700 text-xs mr-1.5`,
                      ]}
                      numberOfLines={1}
                    >
                      {truncateText(item)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeRecentSearch(item)}>
                    <Icon name="close" size={14} color="#666" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Categories Section - Always show ChooseYourFuel */}
        <ChooseYourFuel />

        {/* Search Results Section - Show below ChooseYourFuel */}
        {renderSearchResults()}
      </ScrollView>

      {/* Kitchen Conflict Popup */}
      <KitchenConflictPopup
        visible={showConflictPopup}
        onClose={() => setShowConflictPopup(false)}
        message={conflictMessage}
        onViewCart={() => {
          setShowConflictPopup(false);
          navigation.navigate("CartScreen");
        }}
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
    </SafeAreaView>
  );
}
