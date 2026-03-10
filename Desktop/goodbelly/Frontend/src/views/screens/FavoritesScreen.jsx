import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  Alert,
  Dimensions,
  RefreshControl,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";
import { authService } from "../../services/authService.js";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchCart,
  addToCart,
  updateCartItemQty,
  removeCartItem,
  hydrateUser,
} from "../../redux/slicer";
import CustomPopup from "../../components/CustomPopup/CustomPopup";
import KitchenConflictPopup from "../../components/CustomPopup/KitchenConflictPopup";

const { width: screenWidth } = Dimensions.get("window");

const FavoritesScreen = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showConflictPopup, setShowConflictPopup] = useState(false);
  const [conflictMessage, setConflictMessage] = useState("");
  const [favLoadingById, setFavLoadingById] = useState({});
  const [error, setError] = useState(null);

  // State for custom popups
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [alertPopupData, setAlertPopupData] = useState({
    title: "",
    message: "",
    type: "info",
    onConfirm: null,
  });

  const navigation = useNavigation();
  const dispatch = useDispatch();

  // Get user and cart from Redux store
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const cart = useSelector((state) => state.cart);
  const cartItems = cart.items || [];

  const cardWidth = (screenWidth - 40) / 2;

  // Function to determine StatusBar style based on background color
  const getStatusBarStyle = (bgColor) => {
    const lightBackgrounds = ["#FFFFFF", "#F3F4F6", "#FAFAFA", "#F9FAFB", "#ffffff", "white"];
    return lightBackgrounds.includes(bgColor) ? "dark-content" : "light-content";
  };

  // Background color constant
  const BACKGROUND_COLOR = "#FFFFFF"; // white background

  // Helper function to show custom popup
  const showPopup = (title, message, type = "info", onConfirm = null) => {
    setAlertPopupData({
      title,
      message,
      type,
      onConfirm,
    });
    setShowAlertPopup(true);
  };

  // Fetch wishlist function with proper response handling
  const fetchWishlist = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      // Check authentication first
      if (!isAuthenticated || !user) {
        setWishlist([]);
        setError("Please login to view your favorites");
        return;
      }

      const response = await authService.getWishlist();
      console.log("Wishlist API Response:", response);

      // Handle different response structures
      let wishlistItems = [];

      // Check if response has data (array directly)
      if (response?.data && Array.isArray(response.data)) {
        wishlistItems = response.data;
      }
      // Check if response has data.data (array)
      else if (response?.data?.data && Array.isArray(response.data.data)) {
        wishlistItems = response.data.data;
      }
      // Check if response has items array
      else if (response?.items && Array.isArray(response.items)) {
        wishlistItems = response.items;
      }
      // Check if response.data has items array
      else if (response?.data?.items && Array.isArray(response.data.items)) {
        wishlistItems = response.data.items;
      }

      console.log("Processed wishlist items:", wishlistItems.length);

      if (wishlistItems && wishlistItems.length > 0) {
        // Map the wishlist items to include all necessary product data
        const formattedWishlist = wishlistItems
          .filter(
            (item) =>
              item &&
              (item.product || item) && // Handle both direct product and nested product
              (item.product?.images || item.images) &&
              (item.product?.images?.length > 0 || item.images?.length > 0)
          )
          .map((item) => {
            // Handle both structures: direct product or nested product
            const product = item.product || item;
            return {
              ...product,
              wishlistItemId: item.id || product.id, // Save the wishlist item ID for removal
            };
          });

        setWishlist(formattedWishlist);
        console.log("Formatted wishlist count:", formattedWishlist.length);
      } else {
        setWishlist([]);
      }
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      setError("Failed to load favorites. Please try again.");
      setWishlist([]);

      // If it's an authentication error, show login prompt
      if (
        error.message?.includes("Authentication") ||
        error.message?.includes("token")
      ) {
        setError("Please login to view your favorites");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh authentication state and data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      dispatch(hydrateUser());
      fetchWishlist();
    }, [dispatch, isAuthenticated])
  );

  // Fetch cart when component mounts and user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCart());
    }
  }, [isAuthenticated, dispatch]);

  // Handle pull-to-refresh
  const onRefresh = React.useCallback(() => {
    fetchWishlist(false);
  }, []);

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
    if (product?.addOnCategories && Array.isArray(product.addOnCategories) && product.addOnCategories.length > 0) return true;

    // Check if product has Addition with addOns (embedded data)
    if (product?.Addition?.addOns && Array.isArray(product.Addition.addOns) && product.Addition.addOns.length > 0) return true;

    return false;
  };

  //   UPDATED: Toggle favorite (remove from wishlist) - NO POPUP
  const toggleFavorite = async (productId, wishlistItemId) => {
    // Check if user is authenticated
    const hasValidToken = await authService.isAuthenticated();
    if (!isAuthenticated || !user || !hasValidToken) {
      showPopup(
        "Login Required",
        "Please login to manage favorites",
        "info",
        () => navigation.navigate("Login")
      );
      return;
    }

    setFavLoadingById((s) => ({ ...s, [productId]: true }));
    try {
      const res = await authService.toggleFavorite(productId);
      if (res?.success) {
        // Remove from local wishlist
        setWishlist((prev) => prev.filter((item) => item.id !== productId));
        //   REMOVED: Success popup completely removed
      }
    } catch (e) {
      //   REMOVED: Error popup - only log to console
      console.error("Failed to remove from favorites:", e?.response?.data?.message || e?.message);
    } finally {
      setFavLoadingById((s) => ({ ...s, [productId]: false }));
    }
  };

  // Removed popups for cart operations
  const handleAddToCart = async (productId, weightId) => {
    // Check authentication status
    const hasValidToken = await authService.isAuthenticated();

    if (!isAuthenticated || !user || !hasValidToken) {
      showPopup(
        "Login Required",
        "Please login to add items to cart",
        "info",
        () => navigation.navigate("Login")
      );
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
      let errorMessage = "Failed to add item to cart";

      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      if (errorMessage.includes("different kitchens")) {
        console.log("Kitchen conflict detected:", errorMessage);
        setConflictMessage(errorMessage);
        setShowConflictPopup(true);
      } else if (
        errorMessage.includes("Authentication") ||
        errorMessage.includes("token") ||
        errorMessage.includes("login")
      ) {
        await authService.logout();
        showPopup("Session Expired", "Please login again", "info", () =>
          navigation.navigate("Login")
        );
      } else {
        console.error("  Error adding to cart:", error);
      }
    }
  };

  // Removed popups for quantity updates
  const handleUpdateCartQuantity = async (
    cartItemId,
    productId,
    newQuantity
  ) => {
    if (!isAuthenticated || !user) {
      showPopup("Login Required", "Please login to update cart", "info", () =>
        navigation.navigate("Login")
      );
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
    }
  };

  // Removed popups for remove operations
  const handleRemoveFromCart = async (cartItemId, productId) => {
    if (!isAuthenticated || !user) {
      showPopup("Login Required", "Please login to modify cart", "info", () =>
        navigation.navigate("Login")
      );
      return;
    }

    try {
      await dispatch(removeCartItem(cartItemId)).unwrap();
    } catch (error) {
      console.error("  Error removing from cart:", error);
    }
  };

  const renderProductCard = ({ item, index }) => {
    if (!item) return null;

    const product = item;
    const productName = product.name || "Unnamed Product";
    const productDescription =
      product.description || "No description available";
    const productPrice = product.weights?.[0]?.price || "0";
    const productImage =
      product.images?.[0]?.url ||
      "https://via.placeholder.com/100x100?text=No+Image";
    const productId = product.id;
    const weightId = product.weights?.[0]?.id;
    const cartItemId = getCartItemInfo(productId).cartItemId;
    const currentQuantity = getCartItemInfo(productId).quantity;
    const isFavLoading = !!favLoadingById[productId];

    // Check if customizable
    const isCustomizable = isProductCustomizable(product);

    return (
      <View style={[tw`mb-2 ${index % 2 === 0 ? "pr-1" : "pl-1"}`]}>
        <TouchableOpacity
          style={[
            tw`bg-white rounded-2xl p-3 flex-1 border border-gray-200`,
            tw`shadow-lg shadow-black/10`,
            { width: cardWidth },
          ]}
          onPress={() => {
            if (productId) {
              navigation.navigate("ProductDetails", { productId });
            }
          }}
        >
          {/* Favorite Heart Icon - Remove from favorites */}
          <View style={tw`absolute right-2 top-2 z-10`}>
            <TouchableOpacity
              onPress={() => toggleFavorite(productId, product.wishlistItemId)}
              disabled={isFavLoading}
              style={tw`bg-white rounded-full p-1 shadow-sm`}
            >
              {isFavLoading ? (
                <ActivityIndicator size="small" color="#e11d48" />
              ) : (
                <Ionicons name="heart" size={20} color="#e11d48" />
              )}
            </TouchableOpacity>
          </View>

          <Image
            source={{ uri: productImage }}
            style={tw`w-full h-32 rounded-xl mb-2`}
            resizeMode="cover"
          />

          <View style={tw`flex-1`}>
            <Text
              style={[fontStyles.headingS, tw`text-xs text-gray-900 mb-1`]}
              numberOfLines={1}
            >
              {productName}
            </Text>
            <Text
              style={[
                fontStyles.body,
                tw`text-gray-500 text-[10px] leading-[14px] mb-2`,
              ]}
              numberOfLines={1}
            >
              {productDescription}
            </Text>

            {isCustomizable && (
              <Text style={[fontStyles.caption, tw`text-[10px] text-[#6B9080] font-medium mb-1`]}>
                Customisable
              </Text>
            )}

            <View style={tw`flex-row justify-between items-center mt-auto`}>
              <Text
                style={[
                  fontStyles.headingS,
                  tw`text-sm font-semibold text-gray-800`,
                ]}
              >
                ₹{productPrice}
              </Text>

              {currentQuantity === 0 ? (
                <TouchableOpacity
                  style={tw`bg-[#6A8B78] px-3 py-1.5 rounded-xl`}
                  onPress={() => handleAddToCart(productId, weightId)}
                >
                  <Text style={[fontStyles.bodyBold, tw`text-white text-xs`]}>
                    Add
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={tw`flex-row items-center bg-[#6A8B78] rounded-xl`}>
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
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // Render error state
  const renderErrorState = () => {
    return (
      <View style={tw`flex-1 justify-center items-center px-6`}>
        <View style={tw`relative mb-8`}>
          <View
            style={tw`w-32 h-32 rounded-full bg-[#F1F4F2] items-center justify-center`}
          >
            <FontAwesome5 name="exclamation-circle" size={60} color="#6A8B78" />
          </View>
        </View>

        <Text
          style={[
            fontStyles.headingS,
            tw`text-gray-800 text-center text-xl font-semibold mb-3`,
          ]}
        >
          {error || "Something went wrong"}
        </Text>

        <Text
          style={[
            fontStyles.body,
            tw`text-gray-500 text-center text-sm mb-10 leading-5 px-4`,
          ]}
        >
          {error?.includes("login") || error?.includes("Login")
            ? "Please login to view your favorites"
            : "Failed to load your favorites"}
        </Text>

        <TouchableOpacity
          onPress={() => {
            if (error?.includes("login") || error?.includes("Login")) {
              navigation.navigate("Login");
            } else {
              fetchWishlist();
            }
          }}
          style={[
            styles.blurButton,
            tw`px-8 py-4 rounded-full flex-row items-center`,
          ]}
          activeOpacity={0.8}
        >
          <FontAwesome5
            name={
              error?.includes("login") || error?.includes("Login")
                ? "sign-in-alt"
                : "redo"
            }
            size={18}
            color="#6A8B78"
            style={tw`mr-2`}
          />
          <Text style={[fontStyles.body, tw`text-[#6A8B78] font-semibold`]}>
            {error?.includes("login") || error?.includes("Login")
              ? "Go to Login"
              : "Try Again"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={tw`flex-1 bg-white justify-center items-center`}>
        <StatusBar
          barStyle={getStatusBarStyle(BACKGROUND_COLOR)}
          backgroundColor={BACKGROUND_COLOR}
        />
        <View style={tw`relative`}>
          <FontAwesome5 name="heart" size={60} color="#6A8B78" />
          <ActivityIndicator
            size="large"
            color="#6A8B78"
            style={tw`absolute -top-2 -right-2`}
          />
        </View>
        <Text style={[fontStyles.body, tw`mt-6 text-gray-500`]}>
          Gathering your favorites...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <StatusBar
        barStyle={getStatusBarStyle(BACKGROUND_COLOR)}
        backgroundColor={BACKGROUND_COLOR}
      />

      {/* Header with back button */}
      <View style={tw`bg-white px-4 py-4 border-b border-gray-200`}>
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={tw`mr-3`}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={[fontStyles.headingS, tw`text-black`]}>
            My Favorites
          </Text>
        </View>
      </View>

      {/* Content Area */}
      <View style={tw`flex-1 px-4`}>
        {error ? (
          renderErrorState()
        ) : wishlist && wishlist.length > 0 ? (
          <FlatList
            data={wishlist}
            renderItem={renderProductCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw`pt-2`}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#6A8B78"]}
                tintColor="#6A8B78"
              />
            }
          />
        ) : (
          // Empty State - Compact and Beautiful
          <View style={tw`flex-1 justify-center items-center px-6`}>
            {/* Animated Heart Container */}
            <View style={tw`relative mb-8`}>
              <View
                style={tw`w-32 h-32 rounded-full bg-[#F1F4F2] items-center justify-center`}
              >
                <FontAwesome5 name="heart" size={60} color="#6A8B78" />
              </View>

              {/* Floating Sparkles */}
              <Ionicons
                name="sparkles"
                size={24}
                color="#6A8B78"
                style={tw`absolute -top-2 -right-2 opacity-60`}
              />
              <Ionicons
                name="sparkles"
                size={20}
                color="#6A8B78"
                style={tw`absolute -bottom-3 -left-2 opacity-60`}
              />
            </View>

            {/* Empty State Text */}
            <Text
              style={[
                fontStyles.headingS,
                tw`text-gray-800 text-center text-xl font-semibold mb-3`,
              ]}
            >
              No favorites yet
            </Text>

            <Text
              style={[
                fontStyles.body,
                tw`text-gray-500 text-center text-sm mb-10 leading-5 px-4`,
              ]}
            >
              Tap the heart icon on products you love to add them here
            </Text>

            {/* Action Button with Blur Effect */}
            <TouchableOpacity
              onPress={() => navigation.navigate("HomeScreen")}
              style={[
                styles.blurButton,
                tw`px-8 py-4 rounded-full flex-row items-center`,
              ]}
              activeOpacity={0.8}
            >
              <FontAwesome5
                name="heart"
                size={18}
                color="#6A8B78"
                style={tw`mr-2`}
              />
              <Text style={[fontStyles.body, tw`text-[#6A8B78] font-semibold`]}>
                Start Exploring
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Custom Alert Popup - Only for login/auth errors */}
      <CustomPopup
        visible={showAlertPopup}
        onClose={() => setShowAlertPopup(false)}
        title={alertPopupData.title}
        message={alertPopupData.message}
        type={alertPopupData.type}
        onConfirm={alertPopupData.onConfirm}
        confirmText="OK"
        showCancelButton={!!alertPopupData.onConfirm}
        cancelText="Cancel"
      />

      {/* Kitchen Conflict Popup */}
      <KitchenConflictPopup
        visible={showConflictPopup}
        onClose={() => setShowConflictPopup(false)}
        message={conflictMessage}
        onViewCart={() => navigation.navigate("CartScreen")}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  blurButton: {
    backgroundColor: "rgba(241, 244, 242, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(106, 139, 120, 0.3)",
    shadowColor: "#6A8B78",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    ...(Platform.OS === "ios" && {
      backdropFilter: "blur(10px)",
    }),
  },
});

export default FavoritesScreen;
