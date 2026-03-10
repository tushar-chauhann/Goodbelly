import React, { useState, useEffect, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, Animated, ActivityIndicator, Dimensions, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSelector, useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { addToCart, updateCartItemQty, removeCartItem, clearCartByVendor } from "../../redux/slicer";
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";
import { authService } from "../../services/authService";
import KitchenConflictPopup from "../CustomPopup/KitchenConflictPopup";
import ProductSkeleton, { CuratedProductSkeleton } from "../ProductSkeleton";

const CuratedCollections = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { items: cartItems, vendorId: currentVendorId } = useSelector((state) => state.cart);
    const { isAuthenticated, user } = useSelector((state) => state.auth);

    // State
    const [activeCategory, setActiveCategory] = useState("discounted");
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    // Pagination State
    const [visibleCount, setVisibleCount] = useState(10);
    const [loadingMore, setLoadingMore] = useState(false);

    const [favById, setFavById] = useState({});
    const [kitchenConflictVisible, setKitchenConflictVisible] = useState(false);
    const [conflictItem, setConflictItem] = useState(null);

    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    const categories = [
        { id: "discounted", label: "Discounted Products" },
        { id: "healthier", label: "Healthier Cheat Meals" },
    ];

    useEffect(() => {
        setVisibleCount(10);
        fetchProducts();
    }, [activeCategory]);

    const handleLoadMore = () => {
        if (loadingMore || visibleCount >= products.length) return;

        setLoadingMore(true);
        // Simulate network delay using setTimeout as requested
        setTimeout(() => {
            setVisibleCount(prev => prev + 10);
            setLoadingMore(false);
        }, 1000);
    };

    const fetchProducts = async () => {
        try {
            setLoading(true);

            // Removed fade-out animation to prevent background flicker

            let responsePromise;
            if (activeCategory === "discounted") {
                // Live endpoint /products/discount is missing, so fetch ALL and filter client-side
                responsePromise = authService.getAllProducts();
            } else {
                const filters = { isHealthy: true };
                responsePromise = authService.getAllProducts(filters);
            }

            // Fetch products and wishlist in parallel
            const [response, wishlistResponse] = await Promise.all([
                responsePromise,
                authService.getWishlist().catch((err) => {
                    console.warn("Failed to fetch wishlist:", err);
                    return { data: [] };
                }),
            ]);

            let fetchedProducts = response?.data || [];

            // Filter for products with actual discounts
            if (activeCategory === "discounted") {
                fetchedProducts = fetchedProducts.filter(item => {
                    const firstWeight = item.weights?.[0];
                    const originalPrice = Number(firstWeight?.price || 0);
                    const discountPrice = Number(firstWeight?.discountPrice || 0);
                    // Match Backend/Web Logic: Discount exists if discountPrice is valid AND significantly less than original
                    return discountPrice > 0 && discountPrice < originalPrice;
                });

                // Sort by discount amount (saved amount)
                fetchedProducts.sort((a, b) => {
                    const weightA = a.weights?.[0];
                    const weightB = b.weights?.[0];
                    const saveA = (Number(weightA?.price) - Number(weightA?.discountPrice));
                    const saveB = (Number(weightB?.price) - Number(weightB?.discountPrice));
                    return saveB - saveA; // Descending
                });
            }

            // Process Wishlist Items
            let wishlistItems = [];
            if (wishlistResponse?.data?.items) {
                wishlistItems = wishlistResponse.data.items;
            } else if (wishlistResponse?.data && Array.isArray(wishlistResponse.data)) {
                wishlistItems = wishlistResponse.data;
            } else if (Array.isArray(wishlistResponse)) {
                wishlistItems = wishlistResponse;
            }

            const newFavs = {};

            // 1. Check product's own isFavorite flag
            fetchedProducts.forEach(p => {
                if (p.isFavorite) newFavs[p.id || p._id] = true;
            });

            // 2. Override/Merge with actual Wishlist Data
            if (Array.isArray(wishlistItems)) {
                wishlistItems.forEach((item) => {
                    const id = item.id || item._id || item.productId;
                    if (id) newFavs[id] = true;
                });
            }

            setFavById(prev => ({ ...prev, ...newFavs }));

            setTimeout(() => {
                setProducts(fetchedProducts);
                // Removed fade-in animation to prevent flicker
                fadeAnim.setValue(1);
                setLoading(false);
            }, 200);

        } catch (error) {
            console.error("Error fetching products:", error);
            setProducts([]);
            setLoading(false);
            fadeAnim.setValue(1);
        }
    };

    const handleCategoryChange = (categoryId) => {
        if (categoryId !== activeCategory) {
            Haptics.selectionAsync();
            const targetValue = categoryId === "healthier" ? 1 : 0;
            Animated.spring(slideAnim, {
                toValue: targetValue,
                useNativeDriver: true,
                tension: 150,
                friction: 20,
            }).start();
            setActiveCategory(categoryId);
        }
    };

    const handleToggleFavorite = async (product) => {
        if (!isAuthenticated) return;

        const pid = product.id || product._id;
        setFavById(prev => ({ ...prev, [pid]: !prev[pid] }));
        Haptics.selectionAsync();

        try {
            await authService.toggleFavorite(pid);
        } catch (error) {
            console.error("Error toggling favorite:", error);
            setFavById(prev => ({ ...prev, [pid]: !prev[pid] }));
        }
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

    const handleAddToCart = async (product, weightId) => {
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

    const renderProduct = ({ item }) => {
        const productId = item.id || item._id;
        const firstWeight = item.weights?.[0];
        const weightId = firstWeight?.id;

        // Backend/Web Logic:
        // price = Original
        // discountPrice = Selling Price
        const originalPrice = Number(firstWeight?.price || item.price || 0);
        const discountPrice = Number(firstWeight?.discountPrice || 0);

        // Check validity
        const hasDiscount = discountPrice > 0 && discountPrice < originalPrice;

        const finalPrice = hasDiscount ? discountPrice : originalPrice;
        const discountAmount = hasDiscount ? originalPrice - finalPrice : 0; // Amount saved

        const productImage = item.images?.[0]?.url || item.image || "https://via.placeholder.com/100x100?text=No+Image";
        const productDescription = item.description || "No description available";

        const cartInfo = getCartItemInfo(productId);
        const currentQuantity = cartInfo.quantity || 0;
        const cartItemId = cartInfo.cartItemId;

        const isFav = !!favById[productId];

        const isCustomizable = item?.isCustomizable === true ||
            (item?.addOnCategories && Array.isArray(item.addOnCategories) && item.addOnCategories.length > 0);

        return (
            <View style={tw`w-[160px] mr-4 mb-2`}>
                <TouchableOpacity
                    style={[
                        tw`bg-white rounded-2xl p-3 border border-gray-200`,
                        tw`shadow-lg shadow-black/10`,
                    ]}
                    onPress={() => {
                        if (productId) {
                            navigation.navigate("ProductDetails", { productId, initialData: item });
                        }
                    }}
                    activeOpacity={0.9}
                >
                    <View style={tw`absolute right-2 top-2 z-10`}>
                        <TouchableOpacity
                            style={tw`bg-white rounded-full p-1 shadow-sm`}
                            onPress={() => handleToggleFavorite(item)}
                        >
                            <Ionicons
                                name={isFav ? "heart" : "heart-outline"}
                                size={16}
                                color={isFav ? "#E53935" : "#111"}
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={tw`relative mb-2`}>
                        <Image
                            source={{ uri: productImage }}
                            style={tw`w-full h-28 rounded-xl`}
                            resizeMode="cover"
                        />

                        {hasDiscount && (() => {
                            const discountPercent = Math.round(((originalPrice - finalPrice) / originalPrice) * 100);

                            return (
                                <LinearGradient
                                    colors={['transparent', 'rgba(0,0,0,0.9)']}
                                    style={tw`absolute bottom-0 left-0 right-0 h-16 justify-end px-3 pb-2 rounded-b-xl`}
                                >
                                    <Text style={[fontStyles.headingS, tw`text-white text-[16px] font-extrabold leading-tight shadow-sm`]}>
                                        {discountPercent}% OFF
                                    </Text>
                                    <Text style={[fontStyles.bodyBold, tw`text-white text-[10px] font-bold opacity-90 shadow-sm`]}>
                                        SAVE ₹{discountAmount}
                                    </Text>
                                </LinearGradient>
                            );
                        })()}
                    </View>

                    <View style={tw`flex-1 justify-between`}>
                        <View>
                            <Text
                                style={[
                                    fontStyles.headingS,
                                    tw`text-sm font-semibold text-gray-900 mb-0.5 leading-4`,
                                ]}
                                numberOfLines={1}
                            >
                                {item.name || "Product Name"}
                            </Text>

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

                            <Text
                                style={[
                                    fontStyles.headingS,
                                    tw`text-xs font-semibold text-[#5F7F67] mb-1`,
                                ]}
                                numberOfLines={1}
                            >
                                {item.vendor?.kitchenName || item.kitchenName || "GoodBelly Kitchen"}
                            </Text>

                            {/* Customisable Tag */}
                            {isCustomizable && (
                                <Text style={[fontStyles.body, tw`text-[10px] text-[#6B9080] font-medium mb-1`]}>
                                    Customisable
                                </Text>
                            )}
                        </View>

                        <View style={tw`flex-row justify-between items-center mt-2`}>
                            <View>
                                <View style={tw`flex-row items-center`}>
                                    {hasDiscount && (
                                        <Text style={[fontStyles.body, tw`text-[10px] text-gray-400 line-through mr-1.5`]}>
                                            ₹{originalPrice}
                                        </Text>
                                    )}
                                    <Text
                                        style={[
                                            fontStyles.headingS,
                                            tw`text-sm font-semibold text-gray-800`,
                                        ]}
                                    >
                                        ₹{finalPrice}
                                    </Text>
                                </View>
                            </View>

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
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[tw`mt-6 px-4 pt-4 pb-4 mx-4 rounded-3xl`, { backgroundColor: '#6B9080' }]}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
                <Text
                    style={[
                        fontStyles.headingItalic,
                        tw`text-base font-semibold text-white`,
                    ]}
                >
                    Curated Collections
                </Text>
            </View>

            <View style={tw`mb-5 bg-white/20 rounded-full p-1 border border-white/30`}>
                <View style={tw`flex-row relative`}>
                    <Animated.View
                        style={[
                            tw`absolute top-0 bottom-0 bg-white rounded-full shadow-md`,
                            {
                                width: (Dimensions.get('window').width - 72) / 2,
                                transform: [
                                    {
                                        translateX: slideAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, (Dimensions.get('window').width - 72) / 2],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    />

                    {categories.map((item, index) => {
                        const isActive = activeCategory === item.id;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                onPress={() => handleCategoryChange(item.id)}
                                style={tw`flex-1 px-4 py-2.5 rounded-full z-10`}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        fontStyles.bodyBold,
                                        tw`text-xs font-bold text-center`,
                                        isActive ? tw`text-[#6B9080]` : tw`text-white`,
                                    ]}
                                >
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <View style={{ minHeight: 240 }}>
                {loading ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={tw`pr-4`}
                    >
                        {[1, 2].map((item) => (
                            <CuratedProductSkeleton key={item} />
                        ))}
                    </ScrollView>
                ) : (
                    <Animated.View style={{ opacity: fadeAnim }}>
                        <FlatList
                            data={products.slice(0, visibleCount)}
                            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                            renderItem={renderProduct}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={tw`pr-4`}
                            onEndReached={handleLoadMore}
                            onEndReachedThreshold={0.5}
                            ListFooterComponent={
                                loadingMore ? (
                                    <View style={tw`h-[250px] w-[50px] justify-center items-center`}>
                                        <ActivityIndicator color="white" />
                                    </View>
                                ) : null
                            }
                            ListEmptyComponent={
                                <View style={tw`w-full py-10 items-center`}>
                                    <Ionicons name="basket-outline" size={48} color="#ffffff" />
                                    <Text style={[fontStyles.body, tw`text-white mt-2`]}>
                                        No products found
                                    </Text>
                                </View>
                            }
                        />
                    </Animated.View>
                )}
            </View>

            <KitchenConflictPopup
                visible={kitchenConflictVisible}
                onClose={() => setKitchenConflictVisible(false)}
                onViewCart={handleManualClearCart}
            />
        </View>
    );
};

export default CuratedCollections;
