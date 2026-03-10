import React, { useEffect, useCallback, useMemo, useState } from "react";
// Performance optimized CartScreen - Re-bundle trigger: 2026-03-07 11:30

import {
  View,
  Text,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SectionList,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import tw from "twrnc";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCart,
  updateCartItemQty,
  removeCartItem,
  addToCart,
} from "../../redux/slicer";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { fontStyles } from "../../utils/fontStyles";
import CustomPopup from "../../components/CustomPopup";
import CustomizationPopup from "../../components/CustomizationPopup";
import { authService } from "../../services/authService";
import api from "../../services/api";

const getItemId = (it) => String(it?.id ?? it?.cartItemId ?? "");
const getItemQty = (it) => Number(it?.quantity ?? it?.qty ?? 0);
const getItemPrice = (it) => {
  const weightObj = it?.weight || it?.Weight;
  const rawPrice = Number(weightObj?.price ?? it?.price ?? it?.unitPrice ?? 0);
  const discountPrice = Number(weightObj?.discountPrice ?? 0);
  const hasDiscount = discountPrice > 0 && discountPrice < rawPrice;
  const basePrice = hasDiscount ? discountPrice : rawPrice;

  let addOnTotal = 0;
  if (it?.Addition) {
    if (typeof it.Addition === 'object' && !Array.isArray(it.Addition)) {
      addOnTotal = Number(it.Addition.addOnTotal || 0);
      if (addOnTotal === 0 && Array.isArray(it.Addition.addOns)) {
        addOnTotal = it.Addition.addOns.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
      }
    } else if (Array.isArray(it.Addition)) {
      addOnTotal = it.Addition.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
    }
  }
  return basePrice + addOnTotal;
};
const getItemName = (it) => it?.name ?? it?.product?.name ?? "Item";
const getItemImage = (it) => {
  const p = it?.product ?? it;
  const img0 = Array.isArray(p?.images) ? p.images[0] : null;
  if (typeof img0 === "string") return img0;
  if (img0?.url) return img0.url;
  if (p?.image) return p.image;
  return "https://via.placeholder.com/200x200.png?text=No+Image";
};

const getVendorName = (cart) => {
  if (cart?.vendor?.kitchenName) return cart.vendor.kitchenName;
  if (cart?.items?.[0]?.vendor?.kitchenName) return cart.items[0].vendor.kitchenName;
  if (cart?.items?.[0]?.product?.vendor?.kitchenName) return cart.items[0].product.vendor.kitchenName;
  return "GoodBelly Kitchen";
};

const getVendorId = (cart) => {
  if (cart?.vendor?.id) return cart.vendor.id;
  if (cart?.vendorId) return cart.vendorId;
  if (cart?.items?.[0]?.vendor?.id) return cart.items[0].vendor.id;
  if (cart?.items?.[0]?.product?.vendor?.id) return cart.items[0].product.vendor.id;
  return null;
};

const getVendorImage = (cart) => {
  if (cart?.vendor?.coverImage) return cart.vendor.coverImage;
  if (cart?.vendor?.image) return cart.vendor.image;
  if (cart?.vendor?.logo) return cart.vendor.logo;
  if (cart?.items?.[0]?.vendor?.image) return cart.items[0].vendor.image;
  return null;
};

const getNutritionInfo = (it) => {
  const nutrition = it?.product?.Nutrition ?? it?.nutrition ?? {};
  return { proteinGained: (nutrition.protein || 0) * getItemQty(it) };
};

const PRIMARY_COLOR = "#5F7F67";

const getStatusBarStyle = (bgColor) => {
  const lightBgs = ["#FFFFFF", "#F3F4F6", "#FAFAFA", "#F9FAFB", "white"];
  return lightBgs.includes(bgColor) ? "dark-content" : "light-content";
};

const CartItem = React.memo(({ item, onIncrement, onDecrement, onRemove, onProductPress, onEdit }) => {
  const name = getItemName(item);
  const price = getItemPrice(item);
  const qty = getItemQty(item);
  const img = getItemImage(item);
  const nutrition = getNutritionInfo(item);

  return (
    <View style={tw`bg-white mx-4 mb-2 rounded-xl p-3 border border-gray-100`}>
      <View style={tw`flex-row items-center`}>
        <TouchableOpacity onPress={() => onProductPress(item)} style={tw`mr-3`}>
          <Image source={{ uri: img }} style={tw`w-16 h-16 rounded-lg`} resizeMode="cover" />
        </TouchableOpacity>
        <View style={tw`flex-1`}>
          <View style={tw`flex-row justify-between items-start mb-2`}>
            <TouchableOpacity onPress={() => onProductPress(item)} style={tw`flex-1`}>
              <View style={tw`flex-row items-start justify-between mb-1`}>
                <Text style={[fontStyles.headingS, tw`text-xs text-gray-900 flex-1 mr-2`]} numberOfLines={2}>
                  {name}
                </Text>
                {(item?.product?.isCustomizable || item?.Addition) && (
                  <TouchableOpacity
                    onPress={() => onEdit(item)}
                    style={tw`flex-row items-center`}
                  >
                    <Text style={[fontStyles.body, tw`text-blue-500 text-xs`]}>Edit</Text>
                    <Ionicons name="chevron-forward" size={14} color="#3b82f6" style={tw`ml-0.5`} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={tw`flex-row items-center mb-1`}>
                {(() => {
                  const weightObj = item?.weight || item?.Weight;
                  const originalPrice = Number(weightObj?.price ?? 0);
                  const discountPrice = Number(weightObj?.discountPrice ?? 0);
                  const hasDiscount = discountPrice > 0 && discountPrice < originalPrice;
                  const effectiveFinalPrice = price;
                  const addOnTotal = price - (hasDiscount ? discountPrice : originalPrice);
                  const effectiveOriginalPrice = originalPrice + addOnTotal;

                  if (hasDiscount) {
                    const savedAmount = originalPrice - discountPrice;
                    const discountPercent = Math.round((savedAmount / originalPrice) * 100);
                    return (
                      <>
                        <Text style={[fontStyles.body, tw`text-xs text-gray-400 line-through mr-2`]}>
                          ₹{Math.round(effectiveOriginalPrice)}
                        </Text>
                        <Text style={[fontStyles.headingS, tw`text-sm text-gray-900`]}>
                          ₹{Math.round(effectiveFinalPrice)}
                        </Text>
                        <Text style={[fontStyles.headingS, tw`text-xs text-orange-500 ml-2`]}>
                          {discountPercent}% OFF
                        </Text>
                      </>
                    );
                  }
                  return (
                    <Text style={[fontStyles.headingS, tw`text-sm text-gray-900`]}>
                      ₹{Math.round(effectiveFinalPrice)}
                    </Text>
                  );
                })()}
              </View>
              {nutrition.proteinGained > 0 && (
                <Text style={[fontStyles.body, tw`text-gray-600 text-xs`]}>
                  {nutrition.proteinGained.toFixed(1)}g protein
                </Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center`}>
              <View style={tw`flex-row items-center bg-gray-50 rounded-full px-3 py-1.5`}>
                <TouchableOpacity onPress={() => onDecrement(item)} style={tw`w-6 h-6 items-center justify-center`}>
                  {qty === 1 ? (
                    <Ionicons name="trash-outline" size={14} color="#ef4444" />
                  ) : (
                    <Text style={[fontStyles.headingS, tw`text-gray-700 text-base`]}>-</Text>
                  )}
                </TouchableOpacity>
                <Text style={[fontStyles.headingS, tw`text-gray-800 mx-3 min-w-5 text-center text-sm`]}>{qty}</Text>
                <TouchableOpacity onPress={() => onIncrement(item)} style={tw`w-6 h-6 items-center justify-center`}>
                  <Text style={[fontStyles.headingS, tw`text-gray-700 text-base`]}>+</Text>
                </TouchableOpacity>
              </View>
              {qty > 1 && (
                <TouchableOpacity
                  onPress={() => onRemove(item)}
                  style={tw`ml-3 p-1 bg-red-50 rounded-full`}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[fontStyles.headingS, tw`text-gray-800 text-sm`]}>
              ₹{(price * qty).toFixed(0)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});

const VendorHeader = React.memo(({ cart, onKitchenPress }) => {
  const vendorName = getVendorName(cart);
  const vendorImage = getVendorImage(cart);
  const vendorId = getVendorId(cart);

  return (
    <TouchableOpacity
      style={tw`bg-white mx-4 mb-2 mt-4 rounded-lg p-3 border border-gray-200 shadow-sm`}
      onPress={() => onKitchenPress(vendorId)}
      activeOpacity={vendorId ? 0.7 : 1}
    >
      <View style={tw`flex-row items-center`}>
        {vendorImage ? (
          <Image source={{ uri: vendorImage }} style={tw`w-10 h-10 rounded-full mr-3`} resizeMode="cover" />
        ) : (
          <View style={tw`w-10 h-10 rounded-full bg-gray-200 mr-3 items-center justify-center`}>
            <Ionicons name="restaurant" size={20} color="#6B7280" />
          </View>
        )}
        <View style={tw`flex-1`}>
          <Text style={[fontStyles.body, tw`text-gray-500 text-xs`]}>Kitchen</Text>
          <View style={tw`flex-row items-center`}>
            <Text style={[fontStyles.headingXS, tw`text-xs text-gray-800`]} numberOfLines={1}>{vendorName}</Text>
            {vendorId && <Ionicons name="chevron-forward" size={12} color="#5F7F67" style={tw`ml-1`} />}
          </View>
        </View>
        <View style={tw`bg-green-50 px-2 py-1 rounded-full`}>
          <Text style={[fontStyles.bodyBold, tw`text-green-700 text-xs`]}>
            {cart.items.length} {cart.items.length === 1 ? "item" : "items"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function CartScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [removePopupVisible, setRemovePopupVisible] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);
  const items = useSelector((s) => s.cart.items);
  const status = useSelector((s) => s.cart.status);
  const carts = useSelector((s) => s.cart.cartsRaw || []);
  const vendorId = useSelector((s) => s.cart.vendorId);
  const reduxProducts = useSelector((s) => s.products?.items || []);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editProductId, setEditProductId] = useState(null);
  const [editWeightId, setEditWeightId] = useState(null);

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  //   ADD: useFocusEffect to update StatusBar when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Determine background color based on cart state
      const bgColor = "#F3F4F6";
      StatusBar.setBarStyle(getStatusBarStyle(bgColor), true);
      StatusBar.setBackgroundColor(bgColor, true);
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchCart());
    setRefreshing(false);
  }, [dispatch]);

  const handleProductPress = useCallback((item) => {
    const productId = item?.product?.id || item?.id;
    if (productId) navigation.navigate("ProductDetails", { productId });
  }, [navigation]);

  const handleIncrement = useCallback((item) => {
    const cartItemId = getItemId(item);
    const currentQty = getItemQty(item);
    dispatch(updateCartItemQty({ cartItemId, quantity: currentQty + 1 }));
  }, [dispatch]);

  const handleDecrement = useCallback((item) => {
    const currentQty = getItemQty(item);
    if (currentQty === 1) {
      setItemToRemove(item);
      setRemovePopupVisible(true);
    } else {
      const cartItemId = getItemId(item);
      dispatch(updateCartItemQty({ cartItemId, quantity: currentQty - 1 }));
    }
  }, [dispatch]);

  const handleRemovePress = useCallback((item) => {
    setItemToRemove(item);
    setRemovePopupVisible(true);
  }, []);

  const handleRemoveConfirm = () => {
    if (itemToRemove) {
      const cartItemId = getItemId(itemToRemove);
      dispatch(removeCartItem(cartItemId));
      setItemToRemove(null);
    }
    setRemovePopupVisible(false);
  };

  const handleRemoveCancel = () => {
    setItemToRemove(null);
    setRemovePopupVisible(false);
  };

  const handleEditItem = useCallback(async (item) => {
    try {
      const productId = item.product?.id || item.productId;
      console.log("📝 Editing cart item, checking cache for:", productId);

      const cachedProduct = reduxProducts.find(p => (p.id || p._id) === productId);

      let addOnsResponse = { data: { addOnCategories: [] } };
      let fullProduct = cachedProduct || item.product;

      if (!cachedProduct || !cachedProduct.weights) {
        console.log("  Cache miss, fetching product details...");
        const [addonsRes, productRes] = await Promise.all([
          authService.getProductAddOns(productId),
          api.get(`/products/${productId}`).catch(() => ({ data: { data: null } }))
        ]);
        addOnsResponse = addonsRes;
        if (productRes?.data?.data) {
          fullProduct = productRes.data.data;
        }
      } else {
        addOnsResponse = await authService.getProductAddOns(productId);
      }

      const weights = fullProduct?.weights || [];

      const productWithAddOns = {
        ...item.product,
        ...fullProduct,
        id: productId,
        addOnCategories: addOnsResponse?.data?.addOnCategories || [],
        weights: weights,
        selectedWeightId: item.weightId || item.weight?.id,
      };

      setEditingItem(item);
      setEditingProduct(productWithAddOns);
      setEditProductId(productId);
      setEditWeightId(item.weightId || item.weight?.id);
      setShowEditPopup(true);
    } catch (error) {
      console.error("Error fetching add-ons for edit:", error);
      Alert.alert("Error", "Failed to load customization options");
    }
  }, [reduxProducts]);

  const handleUpdateCartItem = async (customizationData) => {
    try {
      if (editingItem) {
        const cartItemId = getItemId(editingItem);
        await dispatch(removeCartItem(cartItemId)).unwrap();

        const payload = {
          productId: customizationData.productId,
          weightId: customizationData.weightId,
          quantity: customizationData.quantity || 1,
        };

        if (customizationData.addOns && customizationData.addOns.length > 0) {
          payload.Addition = customizationData.addOns;
        }

        await dispatch(addToCart(payload)).unwrap();

        setShowEditPopup(false);
        setEditingItem(null);
      }
    } catch (error) {
      console.error("Failed to update cart item:", error);
    }
  };

  const handleShopNow = () => navigation.navigate("Home");

  const groupedCarts = useMemo(() => {
    if (carts && Array.isArray(carts) && carts.length > 0) {
      return carts.filter((cart) => cart.items && cart.items.length > 0);
    }
    if (items && Array.isArray(items) && items.length > 0) {
      return [{
        vendor: {
          id: items[0]?.product?.vendorId || "default",
          kitchenName: "Kitchen",
        },
        items: items,
      }];
    }
    return [];
  }, [carts, items]);

  const sections = useMemo(() => {
    return groupedCarts.map(cart => ({
      vendor: cart.vendor || { id: getVendorId(cart), kitchenName: getVendorName(cart) },
      itemsCount: cart.items?.length || 0,
      vendorData: cart,
      data: cart.items,
    }));
  }, [groupedCarts]);

  const { finalPrice } = useMemo(() => {
    let finalPrice = 0;
    let totalItems = 0;
    groupedCarts.forEach((cart) => {
      cart.items.forEach((item) => {
        const price = getItemPrice(item);
        const quantity = getItemQty(item);
        finalPrice += price * quantity;
        totalItems += quantity;
      });
    });
    return { finalPrice, totalItems };
  }, [groupedCarts]);

  const handleKitchenPress = useCallback((id) => {
    if (id) navigation.navigate("KitchenDetails", { vendorId: id });
  }, [navigation]);

  const renderSectionHeader = useCallback(({ section }) => (
    <VendorHeader cart={section.vendorData} onKitchenPress={handleKitchenPress} />
  ), [handleKitchenPress]);

  const renderItem = useCallback(({ item }) => (
    <CartItem
      item={item}
      onIncrement={handleIncrement}
      onDecrement={handleDecrement}
      onRemove={handleRemovePress}
      onProductPress={handleProductPress}
      onEdit={handleEditItem}
    />
  ), [handleIncrement, handleDecrement, handleRemovePress, handleProductPress, handleEditItem]);

  if (status === "loading" && groupedCarts.length === 0) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={tw`flex-1 bg-white`}>
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={[fontStyles.body, tw`text-gray-600 mt-4`]}>Loading your cart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (groupedCarts.length === 0) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={tw`flex-1 bg-gray-50`}>
        <View style={tw`bg-white px-4 py-3 border-b border-gray-200`}>
          <View style={tw`flex-row items-center justify-between`}>
            <TouchableOpacity onPress={() => navigation?.goBack?.()} style={tw`w-8 h-8 items-center justify-center rounded-full bg-gray-50`}>
              <Ionicons name="chevron-back" size={18} color="#374151" />
            </TouchableOpacity>
            <Text style={[fontStyles.headingS, tw`text-gray-800`]}>Your Cart</Text>
            <View style={tw`w-8`} />
          </View>
        </View>
        <View style={tw`flex-1 justify-center items-center px-8`}>
          <View style={tw`items-center justify-center mb-6`}>
            <View style={tw`bg-white rounded-full p-4 shadow-lg mb-3`}>
              <MaterialIcons name="shopping-cart" size={60} color="#9ca3af" />
            </View>
          </View>
          <Text style={[fontStyles.headingS, tw`text-xs text-gray-600 text-center mb-2 text-base`]}>
            Your cart is empty
          </Text>
          <Text style={[fontStyles.body, tw`text-gray-500 text-center mb-6 text-sm text-[12px] leading-[14px]`]}>
            Start adding some delicious items to your cart
          </Text>
          <TouchableOpacity
            style={[tw`px-6 py-3 rounded-xl`, { backgroundColor: PRIMARY_COLOR }]}
            onPress={handleShopNow}
            activeOpacity={0.8}
          >
            <Text style={[fontStyles.bodyBold, tw`text-white text-xs`]}>Shop Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={tw`flex-1 bg-gray-50`}>
      <View style={tw`bg-white px-4 py-3 border-b border-gray-200`}>
        <View style={tw`flex-row items-center justify-between`}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()} style={tw`w-8 h-8 items-center justify-center rounded-full bg-gray-50`}>
            <Ionicons name="chevron-back" size={18} color="#374151" />
          </TouchableOpacity>
          <Text style={[fontStyles.headingS, tw`text-gray-800`]}>Your Cart</Text>
          <View style={tw`w-8`} />
        </View>
      </View>
      <View style={tw`flex-1`}>
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => getItemId(item) || String(index)}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={tw`pb-16 pt-3`}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY_COLOR]} tintColor={PRIMARY_COLOR} />
          }
        />
      </View>
      <View style={tw`bg-white pt-2 pb-4 px-4 border-t border-gray-100 shadow-sm`}>
        <View style={tw`flex-row justify-between items-center mb-2`}>
          <View>
            <Text style={[fontStyles.body, tw`text-gray-500 text-xs mb-1`]}>Total Amount</Text>
            <Text style={[fontStyles.headingS, tw`text-gray-800 text-base`]}>₹{finalPrice.toFixed(0)}</Text>
          </View>
          <TouchableOpacity
            style={[tw`flex-1 ml-3 py-2.5 rounded-xl shadow-sm`, { backgroundColor: PRIMARY_COLOR }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Checkout")}
          >
            <Text style={[fontStyles.bodyBold, tw`text-white text-sm text-center`]}>Proceed to Checkout</Text>
          </TouchableOpacity>
        </View>
      </View>
      <CustomPopup
        visible={removePopupVisible}
        onClose={handleRemoveCancel}
        title="Remove Item"
        message="Are you sure you want to remove this item from your cart?"
        type="warning"
        iconName="trash-outline"
        cancelText="Keep Item"
        confirmText="Remove"
        onConfirm={handleRemoveConfirm}
        onCancel={handleRemoveCancel}
      />

      {showEditPopup && editingProduct && (
        <CustomizationPopup
          visible={showEditPopup}
          onClose={() => {
            setShowEditPopup(false);
            setEditingItem(null);
            setEditingProduct(null);
            setEditProductId(null);
            setEditWeightId(null);
          }}
          product={editingProduct}
          initialQuantity={getItemQty(editingItem)}
          initialWeight={editingItem.weight}
          initialAddOns={
            Array.isArray(editingItem.Addition)
              ? editingItem.Addition
              : (editingItem.Addition?.addOns || [])
          }
          productId={editProductId}
          weightId={editWeightId}
          onAddToCart={handleUpdateCartItem}
        />
      )}
    </SafeAreaView>
  );
}

