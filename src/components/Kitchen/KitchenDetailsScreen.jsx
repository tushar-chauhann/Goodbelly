// components/Kitchen/KitchenDetailsScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  Alert,
  FlatList,
  Animated,
  Platform,
  Dimensions,
  StatusBar,
} from "react-native";
import tw from "twrnc";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { KitchenHeaderSkeleton, KitchenDetailProductSkeleton } from "../ProductSkeleton";


// Import font styles
import { fontStyles } from "../../utils/fontStyles";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Responsive Helper
const getResponsiveLayout = () => {
  const isTablet = SCREEN_WIDTH >= 768;
  const isLargeTablet = SCREEN_WIDTH >= 1024;

  return {
    isTablet,
    numColumns: isTablet ? 2 : 1,
    containerPadding: isTablet ? 24 : 16,
    coverHeight: isTablet ? 350 : 224, // h-56 is 224px
    headerPaddingTop: isTablet ? 32 : 16,
    productCardWidth: isTablet ? (SCREEN_WIDTH - 48 - 16) / 2 : SCREEN_WIDTH - 32, // (Screen - padding - gap) / columns
    iconSize: isTablet ? 28 : 24,
    textSizeBase: isTablet ? 16 : 14,
    textSizeHeading: isTablet ? 24 : 18,
    gap: isTablet ? 16 : 12,
  };
};

const KitchenDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  // Accept both `kitchenId` (from BrowseByKitchen) and `vendorId` (from Cart/Checkout)
  const { kitchenId: kitchenIdParam, vendorId, kitchenName } = route.params;
  const kitchenId = kitchenIdParam || vendorId;

  const layout = getResponsiveLayout();

  const [kitchen, setKitchen] = useState(null);
  const [products, setProducts] = useState([]);
  const [otherKitchens, setOtherKitchens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Animation States
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const [isScrolled, setIsScrolled] = useState(false);

  // Status Bar Logic - Static Black
  useFocusEffect(
    React.useCallback(() => {
      // Always Black Status Bar
      StatusBar.setBarStyle("light-content", true);
      if (Platform.OS === "android") {
        StatusBar.setBackgroundColor("#000000", true);
      }
    }, [])
  );

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const threshold = 150;
        if (offsetY > threshold && !isScrolled) {
          setIsScrolled(true);
        } else if (offsetY <= threshold && isScrolled) {
          setIsScrolled(false);
        }
      },
    }
  );

  // Interpolated Styles
  const headerBackgroundColor = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 1)"],
    extrapolate: "clamp",
  });

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

  // Fetch cart when component mounts and user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCart());
    }
  }, [isAuthenticated, dispatch]);

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
    if (product?.isCustomizable === true) {
      return true;
    }

    // Check if product has addOnCategories (embedded data)
    if (product?.addOnCategories && Array.isArray(product.addOnCategories) && product.addOnCategories.length > 0) {
      return true;
    }

    // Check if product has Addition with addOns (embedded data)
    if (product?.Addition?.addOns && Array.isArray(product.Addition.addOns) && product.Addition.addOns.length > 0) {
      return true;
    }

    return false;
  };

  // Handle add to cart
  const handleAddToCart = async (product, weightId) => {
    // Check if product is customizable FIRST (before auth check)
    // This allows users to see customization options without logging in
    if (isProductCustomizable(product)) {
      try {
        const addOnsResponse = await authService.getProductAddOns(product.id);
        const productWithAddOns = {
          ...product,
          addOnCategories: addOnsResponse?.data?.addOnCategories || [],
        };
        // Store IDs for use in handleCustomizationAddToCart
        setCustomizationProductId(product.id);
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

    const productId = product?.id || product;
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

  // Handle add to cart from customization popup
  const handleCustomizationAddToCart = async (customizationData) => {
    // Check authentication first
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
      // Use existing Redux addToCart thunk with Addition field
      await dispatch(
        addToCart({
          productId: customizationData.productId,
          weightId: customizationData.weightId,
          quantity: customizationData.quantity,
          Addition: {
            addOns: customizationData.addOns || [],
            addOnTotal: customizationData.addOnTotal || 0,
          },
        })
      ).unwrap();

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

  // Function to convert 24-hour format to 12-hour format
  const formatTimeTo12Hour = (time24) => {
    if (!time24) return "N/A";

    try {
      const [hours, minutes] = time24.split(":");
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch (error) {
      console.error("Error formatting time:", error);
      return time24;
    }
  };

  // Function to check if kitchen is currently open
  const isKitchenCurrentlyOpen = () => {
    if (!kitchen) return false;

    // First check the manual isOpen flag
    if (!kitchen.isOpen) return false;

    // Then check if current time is within opening hours
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    if (kitchen.openTime && kitchen.closeTime) {
      const [openHour, openMinute] = kitchen.openTime.split(":").map(Number);
      const [closeHour, closeMinute] = kitchen.closeTime.split(":").map(Number);

      const openTimeInMinutes = openHour * 60 + openMinute;
      const closeTimeInMinutes = closeHour * 60 + closeMinute;

      return (
        currentTime >= openTimeInMinutes && currentTime <= closeTimeInMinutes
      );
    }

    return kitchen.isOpen; // Fallback to isOpen flag if times are not available
  };

  useEffect(() => {
    const fetchKitchenData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch kitchen details
        const kitchenData = await authService.getKitchenById(kitchenId);
        console.log("Kitchen data received:", kitchenData);

        // Normalize kitchen data structure
        let normalizedKitchen = kitchenData;

        // Handle different response structures
        if (kitchenData.vendor) {
          normalizedKitchen = {
            ...kitchenData.vendor,
            user: kitchenData.user || kitchenData.vendor.user,
          };
        } else if (kitchenData.user) {
          normalizedKitchen = kitchenData;
        }

        console.log("Normalized kitchen:", normalizedKitchen);
        setKitchen(normalizedKitchen);

        // Fetch kitchen products
        const productsResponse = await authService.getVendorProducts(kitchenId);
        console.log("Products data:", productsResponse);

        // Robustly handle response structure
        let normalizedProducts = [];
        if (Array.isArray(productsResponse)) {
          normalizedProducts = productsResponse;
        } else if (productsResponse?.data && Array.isArray(productsResponse.data)) {
          normalizedProducts = productsResponse.data;
        } else if (productsResponse?.data?.data && Array.isArray(productsResponse.data.data)) {
          normalizedProducts = productsResponse.data.data;
        }

        // Strictly filter to ensure only this kitchen's products are shown
        const vendorFiltered = normalizedProducts.filter((product) => {
          const productVendorId =
            product.vendor?.id ||
            product.vendor?._id ||
            product.vendorId ||
            product.kitchenId;
          return String(productVendorId) === String(kitchenId);
        });

        setProducts(vendorFiltered);

        // Set other kitchens
        const kitchensResponse = await authService.getKitchens();
        const filteredKitchens = kitchensResponse.filter((k) => {
          const kId = k.vendor?.id || k.id;
          return kId !== kitchenId;
        });
        setOtherKitchens(filteredKitchens.slice(0, 4));
      } catch (err) {
        console.error("Error fetching kitchen data:", err);
        setError("Failed to load kitchen details");
      } finally {
        setLoading(false);
        setProductsLoading(false);
      }
    };

    if (kitchenId) {
      fetchKitchenData();
    }
  }, [kitchenId]);


  const handleSeeMoreProducts = () => {
    navigation.navigate("KitchenMenu", {
      kitchenId: kitchenId,
      kitchenName: kitchen?.kitchenName || kitchenName,
      products: products,
    });
  };

  const renderProductCard = ({ item, index }) => {
    // Normalize product data
    const product = item;
    const productName = product.name || "Unnamed Product";
    const productDescription =
      product.description || "No description available";
    const productPrice = product.weights?.[0]?.price || "0";
    const productImage =
      product.images?.[0]?.url ||
      product.image ||
      "https://via.placeholder.com/80x80?text=No+Image";
    const productId = product.id || product._id;
    const weightId = product.weights?.[0]?.id;
    const { cartItemId, quantity } = getCartItemInfo(productId);

    return (
      <TouchableOpacity
        style={[
          tw`bg-white rounded-2xl p-4 mb-3`,
          tw`shadow-lg shadow-black/10`,
          // Adjust width based on columns
          {
            width: layout.numColumns > 1 ? (layout.productCardWidth - 12) : '100%',
            flex: layout.numColumns > 1 ? 1 : 0,
            marginHorizontal: layout.numColumns > 1 ? 6 : 0,
          }
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
        <View style={tw`flex-row items-center`}>
          <Image
            source={{ uri: productImage }}
            style={{
              width: layout.isTablet ? 100 : 80,
              height: layout.isTablet ? 100 : 80,
              borderRadius: 12,
            }}
            resizeMode="cover"
          />
          <View style={tw`ml-4 flex-1`}>
            <Text
              style={[
                fontStyles.headingS,
                tw`font-semibold text-gray-900 mb-1`,
                { fontSize: layout.textSizeBase }
              ]}
              numberOfLines={1}
            >
              {productName}
            </Text>
            <Text
              style={[
                fontStyles.body,
                tw`text-gray-500 mb-2`,
                { fontSize: layout.isTablet ? 14 : 12 }
              ]}
              numberOfLines={2}
            >
              {productDescription}
            </Text>
            {/* Customisable Label */}
            {isProductCustomizable(product) && (
              <Text style={[fontStyles.caption, tw`text-[#6B9080] text-xs mb-1`]}>
                Customisable
              </Text>
            )}

            <View style={tw`flex-row justify-between items-center`}>
              <Text
                style={[
                  fontStyles.headingS,
                  tw`font-semibold text-black-600`,
                  { fontSize: layout.textSizeBase }
                ]}
              >
                ₹{productPrice}
              </Text>
              {!isKitchenCurrentlyOpen() && (
                <View style={tw`bg-red-100 px-3 py-1 rounded-full`}>
                  <Text
                    style={[fontStyles.captionBold, tw`text-red-600 text-xs`]}
                  >
                    Unavailable
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Add to Cart Button */}
        {isKitchenCurrentlyOpen() && (
          <View style={tw`mt-3`}>
            {quantity === 0 ? (
              <TouchableOpacity
                style={tw`bg-[#6B9080] py-2 rounded-xl`}
                onPress={() => handleAddToCart(product, weightId)}
              >
                <Text
                  style={[fontStyles.bodyBold, tw`text-white text-center`, { fontSize: layout.isTablet ? 14 : 14 }]}
                >
                  Add to Cart
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={tw`flex-row items-center justify-between bg-[#6B9080] rounded-xl px-2 py-1`}>
                <TouchableOpacity
                  style={tw`p-1`}
                  onPress={() => {
                    if (quantity === 1) {
                      handleRemoveFromCart(cartItemId, productId);
                    } else {
                      handleUpdateCartQuantity(cartItemId, productId, quantity - 1);
                    }
                  }}
                >
                  <Ionicons name="remove" size={20} color="white" />
                </TouchableOpacity>
                <Text style={[fontStyles.bodyBold, tw`text-white text-base`]}>
                  {quantity}
                </Text>
                <TouchableOpacity
                  style={tw`p-1`}
                  onPress={() =>
                    handleUpdateCartQuantity(cartItemId, productId, quantity + 1)
                  }
                >
                  <Ionicons name="add" size={20} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderOtherKitchen = ({ item }) => {
    // Handle different kitchen data structures
    const kitchenData = item.vendor || item;
    const otherKitchenName =
      kitchenData.kitchenName || kitchenData.name || "Unknown Kitchen";
    const otherKitchenCity = kitchenData.city || "Unknown City";
    const otherKitchenImage =
      kitchenData.coverImage ||
      kitchenData.profileImage ||
      "https://via.placeholder.com/160x120?text=Kitchen";

    return (
      <TouchableOpacity
        style={[
          tw`bg-white rounded-2xl shadow-lg shadow-black/10 p-4 mx-2`,
          { width: layout.isTablet ? 220 : 192 } // 48 vs 56 in tailwind
        ]}
        onPress={() => {
          const kitchenId = kitchenData.id || item.id;
          const kitchenName = otherKitchenName;

          navigation.replace("KitchenDetails", {
            kitchenId,
            kitchenName,
          });
        }}
      >
        <Image
          source={{ uri: otherKitchenImage }}
          style={[tw`w-full rounded-xl mb-3`, { height: layout.isTablet ? 140 : 112 }]}
          resizeMode="cover"
        />
        <Text
          style={[
            fontStyles.headingS,
            tw`font-semibold text-gray-900 mb-1`,
            { fontSize: layout.textSizeBase }
          ]}
          numberOfLines={1}
        >
          {otherKitchenName}
        </Text>
        <View style={tw`flex-row items-center mb-2`}>
          <FeatherIcon name="map-pin" size={12} color="#6B7280" />
          <Text
            style={[fontStyles.body, tw`text-gray-600 ml-1 flex-1 text-xs`]}
            numberOfLines={1}
          >
            {otherKitchenCity}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };



  if (loading && !kitchen) {
    return (
      <SafeAreaView
        style={[
          tw`flex-1 bg-white`,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <KitchenHeaderSkeleton layout={layout} />
        <View style={{ paddingHorizontal: layout.containerPadding }}>
          {[1, 2, 3, 4].map((i) => (
            <KitchenDetailProductSkeleton key={i} isTablet={layout.isTablet} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (error || !kitchen) {
    return (
      <SafeAreaView
        style={[
          tw`flex-1 bg-white justify-center items-center px-8`,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <View style={tw`items-center`}>
          <FeatherIcon name="alert-circle" size={64} color="#6B7280" />
          <Text style={[fontStyles.headingL, tw`text-gray-900 mt-4 mb-2`]}>
            Kitchen Not Found
          </Text>
          <Text style={[fontStyles.body, tw`text-gray-500 text-center mb-8`]}>
            {error || "The kitchen you're looking for doesn't exist."}
          </Text>
          <TouchableOpacity
            style={tw`bg-[#6B9080] px-8 py-4 rounded-2xl shadow-lg shadow-black/10`}
            onPress={() => navigation.navigate("Kitchens")}
          >
            <Text style={[fontStyles.bodyBold, tw`text-white`]}>
              Browse All Kitchens
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Handle different kitchen data structures
  const kitchenData = kitchen || {};
  const {
    kitchenName: name = kitchenName,
    openTime,
    closeTime,
    coverImage,
    address,
    city,
    user: kitchenUser,
    fssaiLicenseNumber,
    isOpen = true,
  } = kitchenData;

  // Normalize user data
  const userData = kitchenUser || kitchenData.user || {};
  const { } = userData;

  const isOpenNow = isKitchenCurrentlyOpen();
  const formattedOpenTime = formatTimeTo12Hour(openTime);
  const formattedCloseTime = formatTimeTo12Hour(closeTime);
  const displayedProducts = Array.isArray(products) ? products.slice(0, 6) : [];

  const renderHeader = () => (
    <>
      {/* Cover Image */}
      <View style={{ height: layout.coverHeight, backgroundColor: '#E5E7EB' }}>
        <Image
          source={{
            uri:
              coverImage ||
              "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800",
          }}
          style={tw`w-full h-full`}
          resizeMode="cover"
        />
        <View style={tw`absolute inset-0 bg-black/20`} />
      </View>

      {/* Main Content Info Card */}
      <View style={{ paddingHorizontal: layout.containerPadding, marginTop: -24 }}>
        {/* Kitchen Info Card */}
        <View
          style={[
            tw`bg-white rounded-3xl shadow-xl shadow-black/10 p-5 mb-2`,
            { width: '100%' }
          ]}
        >
          {/* Kitchen Status */}
          <View style={tw`flex-row items-center justify-between mb-3`}>
            <View style={tw`flex-row items-center`}>
              <View
                style={[
                  tw`w-3 h-3 rounded-full mr-2`,
                  isOpenNow ? tw`bg-green-500` : tw`bg-red-500`,
                ]}
              />
              <Text
                style={[
                  fontStyles.headingItalic,
                  tw`font-semibold text-gray-900`,
                  { fontSize: layout.textSizeHeading }
                ]}
              >
                {isOpenNow ? "Open Now" : "Closed"}
              </Text>
            </View>
            <Text style={[fontStyles.body, tw`text-gray-500 text-xs`]}>
              {formattedOpenTime} - {formattedCloseTime}
            </Text>
          </View>

          {/* Contact & Details */}
          <View style={tw`flex-row justify-between items-center`}>
            <View style={tw`flex-row items-center`}>
              <FeatherIcon name="shield" size={16} color="#059669" />
              <Text style={[fontStyles.body, tw`text-gray-600 text-xs ml-1`]}>
                FSSAI Verified
              </Text>
            </View>
          </View>

          {/* Address */}
          <View style={tw`mt-3 pt-3 border-t border-gray-200`}>
            <View style={tw`flex-row items-start`}>
              <FeatherIcon
                name="map-pin"
                size={16}
                color="#6B7280"
                style={tw`mt-1`}
              />
              <Text
                style={[
                  fontStyles.body,
                  tw`text-gray-600 text-xs ml-2 flex-1`,
                ]}
              >
                {address || "Address not available"}
              </Text>
            </View>
          </View>
        </View>

        {/* Products Section Header */}
        <View style={tw`mt-4 mb-2`}>
          <View style={tw`flex-row justify-between items-center mb-1`}>
            <Text
              style={[
                fontStyles.headingItalic,
                tw`font-semibold text-gray-900`,
                { fontSize: layout.textSizeHeading }
              ]}
            >
              Popular Items
            </Text>
            {products.length > 0 && (
              <TouchableOpacity onPress={handleSeeMoreProducts}>
                <Text
                  style={[fontStyles.bodyBold, tw`text-[#6B9080] text-xs`]}
                >
                  See All ({products.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {productsLoading && (
            <View style={tw`mt-2`}>
              {[1, 2, 3].map((i) => (
                <KitchenDetailProductSkeleton key={i} isTablet={layout.isTablet} />
              ))}
            </View>
          )}
          {products.length === 0 && !productsLoading && (

            <View
              style={tw`bg-white rounded-2xl p-8 items-center shadow-lg shadow-black/10 mt-2`}
            >
              <View
                style={tw`w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4`}
              >
                <Text style={tw`text-3xl`}>🍽️</Text>
              </View>
              <Text style={[fontStyles.headingM, tw`text-gray-900 mb-2`]}>
                No Products Available
              </Text>
              <Text style={[fontStyles.body, tw`text-gray-500 text-center`]}>
                This kitchen hasn't added any products yet.
              </Text>
            </View>
          )}
        </View>
      </View>
    </>
  );

  const renderFooter = () => (
    <View style={{ paddingHorizontal: layout.containerPadding }}>
      {/* See All Menu Button - conditional logic for current kitchen */}
      {products.length > 6 && (
        <TouchableOpacity
          onPress={handleSeeMoreProducts}
          style={tw`bg-[#6B9080] rounded-2xl py-4 mt-2 mb-8 shadow-lg shadow-black/10`}
        >
          <Text
            style={[
              fontStyles.bodyBold,
              tw`text-sm text-white text-center`,
            ]}
          >
            See Full Menu ({products.length} items)
          </Text>
        </TouchableOpacity>
      )}

      {/* Explore More Kitchens Section */}
      {otherKitchens.length > 0 && (
        <View style={tw`mb-8`}>
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <Text
              style={[
                fontStyles.headingItalic,
                tw`font-semibold text-gray-900`,
                { fontSize: layout.textSizeHeading }
              ]}
            >
              Similar Kitchens
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Kitchens")}
            >
              <Text
                style={[fontStyles.bodyBold, tw`text-[#6B9080] text-xs`]}
              >
                View All
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={otherKitchens}
            renderItem={renderOtherKitchen}
            keyExtractor={(item) =>
              item.vendor?.id || item.id || Math.random().toString()
            }
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw`pb-2`}
          />
        </View>
      )}
      {/* Bottom Safe Area Padding */}
      <View style={{ height: Math.max(insets.bottom, 24) }} />
    </View>
  );

  return (
    <SafeAreaView
      style={[
        tw`flex-1 bg-white`,
        {
          paddingTop: insets.top,
        },
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Header Overlay */}
      <Animated.View
        style={[
          tw`absolute top-0 left-0 right-0 z-10 pt-8 px-4 flex-row items-center`,
          { backgroundColor: headerBackgroundColor },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={tw`w-10 h-10 rounded-full items-center justify-center`}
        >
          <View
            style={[
              tw`absolute inset-0 rounded-full bg-black/30`,
              { opacity: isScrolled ? 0 : 1 }
            ]}
          />
          <Icon name="arrow-back" size={24} color={isScrolled ? "#000000" : "#FFFFFF"} />
        </TouchableOpacity>
        <View style={tw`flex-1 ml-2`}>
          <Text style={[fontStyles.headingS, isScrolled ? tw`text-black` : tw`text-white`]} numberOfLines={1}>
            {name}
          </Text>
          <View style={tw`flex-row items-center ml-2`}>
            <FeatherIcon name="map-pin" size={12} color={isScrolled ? "#6B7280" : "#FFFFFF"} />
            <Text
              style={[fontStyles.caption, isScrolled ? tw`text-gray-600` : tw`text-white`, tw`ml-1 text-xs`]}
              numberOfLines={1}
            >
              {city}
            </Text>
          </View>
        </View>

        {/* Status Badge in Header */}
        <View
          style={[
            tw`flex-row items-center px-3 py-1 rounded-full`,
            isOpenNow ? tw`bg-green-500` : tw`bg-red-500`,
          ]}
        >
          <FeatherIcon
            name={isOpenNow ? "check-circle" : "x-circle"}
            size={10}
            color="#FFFFFF"
          />
          <Text style={[fontStyles.captionBold, tw`text-white text-xs ml-1`]}>
            {isOpenNow ? "Open" : "Closed"}
          </Text>
        </View>
      </Animated.View>

      <Animated.FlatList
        key={layout.numColumns}
        data={displayedProducts}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        numColumns={layout.numColumns}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={tw`pb-4`}
        initialNumToRender={6}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      <KitchenConflictPopup
        visible={showConflictPopup}
        onClose={() => setShowConflictPopup(false)}
        message={conflictMessage}
        onViewCart={() => navigation.navigate("CartScreen")}
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
};

export default KitchenDetailsScreen;
