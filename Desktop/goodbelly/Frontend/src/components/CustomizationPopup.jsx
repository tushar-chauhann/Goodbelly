import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    Image,
    Animated,
    Dimensions,
    Platform,
    Alert,
    PanResponder
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { fontStyles } from '../utils/fontStyles';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CustomizationPopup = ({
    visible,
    onClose,
    product,
    onAddToCart,
    initialQuantity = 1,
    initialWeight = null,
    initialAddOns = [],
    productId,  //   Added for explicit ID passing
    weightId,   //   Added for explicit ID passing
}) => {
    const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));
    const [selectedWeight, setSelectedWeight] = useState(initialWeight);
    const [selectedAddOns, setSelectedAddOns] = useState(initialAddOns);

    useEffect(() => {
        if (visible) {
            // Animate slide up
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }).start();

            // Sync state with props when popup opens
            setSelectedAddOns(Array.isArray(initialAddOns) ? initialAddOns : []);

            if (initialWeight) {
                setSelectedWeight(initialWeight);
            } else if (product?.weights && product.weights.length > 0) {
                // Check weightId prop first, then product.selectedWeightId
                const targetId = weightId || product.selectedWeightId;

                const weightToSelect = targetId
                    ? product.weights.find(w => (w.id || w._id) === targetId)
                    : product.weights[0];

                setSelectedWeight(weightToSelect || product.weights[0]);
            } else {
                setSelectedWeight(null);
            }
        } else {
            // Animate slide down
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const handleClose = () => {
        Animated.timing(slideAnim, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            onClose();
            // Reset state
            setSelectedAddOns([]);
        });
    };

    // PanResponder for swipe down to dismiss
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only respond to downward swipes
                return gestureState.dy > 5;
            },
            onPanResponderMove: (_, gestureState) => {
                // Only allow downward movement
                if (gestureState.dy > 0) {
                    slideAnim.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                // If dragged down more than 100px, close the popup
                if (gestureState.dy > 100) {
                    handleClose();
                } else {
                    // Otherwise, snap back to original position
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 50,
                        friction: 8,
                    }).start();
                }
            },
        })
    ).current;

    const toggleAddOn = (addOn, category) => {
        const isSelected = selectedAddOns.some((item) => item.id === addOn.id);
        const isSingleChoice = category.maxSelection === 1;

        if (isSingleChoice) {
            // Radio button behavior - only one selection per category
            if (isSelected) {
                // Deselect if clicking the same item
                setSelectedAddOns(selectedAddOns.filter((item) => item.id !== addOn.id));
            } else {
                // Remove any other selections from this category and add new one
                const otherCategoryAddOns = selectedAddOns.filter(
                    (item) => item.categoryId !== category.id
                );
                setSelectedAddOns([...otherCategoryAddOns, addOn]);
            }
        } else {
            // Checkbox behavior - multiple selections allowed
            if (isSelected) {
                // Remove add-on
                setSelectedAddOns(selectedAddOns.filter((item) => item.id !== addOn.id));
            } else {
                // Check if category has max limit
                const categoryAddOns = selectedAddOns.filter(
                    (item) => item.categoryId === category.id
                );

                if (category.maxSelection && categoryAddOns.length >= category.maxSelection) {
                    // Don't add if limit reached
                    return;
                }

                setSelectedAddOns([...selectedAddOns, addOn]);
            }
        }
    };

    const calculateTotal = () => {
        const basePrice = selectedWeight?.price || product?.weights?.[0]?.price || 0;
        const addOnTotal = selectedAddOns.reduce((sum, addOn) => sum + (addOn.price || 0), 0);
        return basePrice + addOnTotal;
    };

    const handleAddToCart = () => {
        if (!selectedWeight) {
            console.error("     No weight selected");
            return;
        }

        // Parent passes the IDs, we just echo them back with the customization choices
        const customizationData = {
            productId: productId, //   Echo back the ID
            weightId: selectedWeight.id || weightId, //   Echo back or use selected
            quantity: initialQuantity,
            // Send null instead of empty array if no add-ons selected
            addOns: selectedAddOns.length > 0 ? selectedAddOns.map((addOn) => ({
                ...addOn
            })) : null,
            addOnTotal: selectedAddOns.reduce((sum, addOn) => sum + (addOn.price || 0), 0),
        };

        console.log("  Customization data prepared:", JSON.stringify(customizationData, null, 2));
        onAddToCart(customizationData);
        handleClose();
    };

    if (!visible || !product) return null;

    const basePrice = selectedWeight?.price || product?.weights?.[0]?.price || 0;
    const addOnTotal = selectedAddOns.reduce((sum, addOn) => sum + (addOn.price || 0), 0);
    const addOnCategories = product?.addOnCategories || [];
    const totalPrice = basePrice + addOnTotal;
    const canAddToCart = (!product.weights || product.weights.length === 0 || selectedWeight);




    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
            statusBarTranslucent
        >
            <View style={tw`flex-1 bg-black/50`}>
                {/* Backdrop - tap to close */}
                <TouchableOpacity
                    style={tw`flex-1`}
                    activeOpacity={1}
                    onPress={handleClose}
                />

                {/* Bottom Sheet */}
                <Animated.View
                    {...panResponder.panHandlers}
                    style={[
                        tw`bg-white rounded-t-3xl shadow-xl`,
                        {
                            transform: [{ translateY: slideAnim }],
                            maxHeight: SCREEN_HEIGHT * 0.65, // Reduced to ~65% of screen
                        },
                    ]}
                >
                    {/* Drag Handle */}
                    <View style={tw`w-full items-center pt-2 pb-1`}>
                        <View style={tw`w-10 h-1 bg-gray-300 rounded-full`} />
                    </View>

                    {/* Header with X button */}
                    <View style={tw`bg-white px-4 py-3 border-b border-gray-100`}>
                        <View style={tw`flex-row items-center justify-between`}>
                            {/* Product Name & Details */}
                            <View style={tw`flex-1 mr-4`}>
                                <Text style={[fontStyles.headingS, tw`text-gray-900 text-base mb-0.5`]} numberOfLines={1}>
                                    Customize Your Order
                                </Text>
                                <Text style={[fontStyles.caption, tw`text-gray-500 text-xs`]} numberOfLines={1}>
                                    ₹{basePrice} • {product.description || 'Select options'}
                                </Text>
                            </View>

                            {/* Close Button */}
                            <TouchableOpacity
                                onPress={handleClose}
                                style={tw`w-8 h-8 bg-gray-50 rounded-full items-center justify-center border border-gray-100`}
                            >
                                <Ionicons name="close" size={18} color="#374151" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView
                        style={tw`w-full bg-gray-50`}
                        contentContainerStyle={tw`pb-4`}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        {/* Size/Weight Selection */}
                        {product?.weights && product.weights.length > 0 && (
                            <View style={tw`px-4 py-3 bg-white mb-2`}>
                                <View style={tw`flex-row items-center justify-between mb-3`}>
                                    <Text style={[fontStyles.headingS, tw`text-sm text-gray-900`]}>
                                        Size
                                    </Text>
                                    <View style={tw`bg-red-50 px-2 py-0.5 rounded-md border border-red-100`}>
                                        <Text style={[fontStyles.caption, tw`text-[10px] text-red-600 font-bold`]}>REQUIRED</Text>
                                    </View>
                                </View>

                                {product.weights.map((weight) => (
                                    <TouchableOpacity
                                        key={weight.id}
                                        onPress={() => setSelectedWeight(weight)}
                                        style={tw`flex-row items-center justify-between py-2.5 border-b border-gray-50 last:border-0`}
                                    >
                                        <View style={tw`flex-row items-center flex-1`}>
                                            {/* Radio Button */}
                                            <View
                                                style={[
                                                    tw`w-4 h-4 rounded-full border items-center justify-center mr-3`,
                                                    selectedWeight?.id === weight.id
                                                        ? tw`border-[#6B9080] border-2`
                                                        : tw`border-gray-300`,
                                                ]}
                                            >
                                                {selectedWeight?.id === weight.id && (
                                                    <View style={tw`w-2 h-2 rounded-full bg-[#6B9080]`} />
                                                )}
                                            </View>
                                            <Text style={[fontStyles.body, tw`text-sm text-gray-800`]}>
                                                {weight.weight}
                                            </Text>
                                        </View>
                                        <Text style={[fontStyles.bodyMedium, tw`text-xs text-gray-900`]}>
                                            ₹{weight.price}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Add-on Categories */}
                        {addOnCategories.length > 0 ? (
                            addOnCategories.map((category) => {
                                const selectedCount = selectedAddOns.filter(
                                    (item) => item.categoryId === category.id
                                ).length;
                                const maxCount = category.maxSelection || category.addOns?.length || 0;
                                const isRequired = category.minSelection > 0 || category.isRequired;

                                return (
                                    <View key={category.id} style={tw`px-4 py-3 bg-white mb-2`}>
                                        {/* Category Header */}
                                        <View style={tw`flex-row items-center justify-between mb-3`}>
                                            <View style={tw`flex-row items-center`}>
                                                <Text style={[fontStyles.headingS, tw`text-sm text-gray-900 mr-2`]}>
                                                    {category.name}
                                                </Text>
                                                {isRequired && (
                                                    <View style={tw`bg-red-50 px-2 py-0.5 rounded-md border border-red-100`}>
                                                        <Text style={[fontStyles.caption, tw`text-[10px] text-red-600 font-bold`]}>REQUIRED</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={[fontStyles.caption, tw`text-[10px] text-gray-500 font-medium`]}>
                                                {selectedCount}/{maxCount} options
                                            </Text>
                                        </View>

                                        {/* Add-on Items */}
                                        {category.addOns?.map((addOn) => {
                                            const isSelected = selectedAddOns.some((item) => item.id === addOn.id);
                                            const isSingleChoice = category.maxSelection === 1;

                                            return (
                                                <TouchableOpacity
                                                    key={addOn.id}
                                                    onPress={() => toggleAddOn(addOn, category)}
                                                    style={tw`flex-row items-center justify-between py-2.5 border-b border-gray-50 last:border-0`}
                                                >
                                                    <View style={tw`flex-row items-start flex-1 pr-4`}>
                                                        {/* Veg Indicator */}
                                                        {addOn.isVeg !== undefined && (
                                                            <View
                                                                style={[
                                                                    tw`w-3 h-3 border rounded-sm items-center justify-center mr-2.5 mt-1`,
                                                                    addOn.isVeg ? tw`border-green-600` : tw`border-red-600`,
                                                                ]}
                                                            >
                                                                <View
                                                                    style={[
                                                                        tw`w-1.5 h-1.5 rounded-full`,
                                                                        addOn.isVeg ? tw`bg-green-600` : tw`bg-red-600`,
                                                                    ]}
                                                                />
                                                            </View>
                                                        )}

                                                        <View style={tw`flex-1`}>
                                                            <Text style={[fontStyles.body, tw`text-sm text-gray-800 mb-0.5`]}>
                                                                {addOn.name}
                                                            </Text>
                                                            <Text style={[fontStyles.bodyMedium, tw`text-xs text-gray-500`]}>
                                                                ₹{addOn.price}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    {/* Selection Control */}
                                                    {isSingleChoice ? (
                                                        <View
                                                            style={[
                                                                tw`w-4 h-4 rounded-full border items-center justify-center`,
                                                                isSelected ? tw`border-[#6B9080] border-2` : tw`border-gray-300`,
                                                            ]}
                                                        >
                                                            {isSelected && (
                                                                <View style={tw`w-2 h-2 rounded-full bg-[#6B9080]`} />
                                                            )}
                                                        </View>
                                                    ) : (
                                                        <View
                                                            style={[
                                                                tw`w-4 h-4 rounded border items-center justify-center`,
                                                                isSelected
                                                                    ? tw`bg-[#6B9080] border-[#6B9080]`
                                                                    : tw`bg-white border-gray-300`,
                                                            ]}
                                                        >
                                                            {isSelected && (
                                                                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                                                            )}
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                );
                            })
                        ) : (
                            <View style={tw`p-8 items-center justify-center`}>
                                <Text style={[fontStyles.body, tw`text-gray-400`]}>No customization available</Text>
                            </View>
                        )}

                        <View style={tw`h-24`} />
                    </ScrollView>

                    {/* Footer */}
                    <View style={[tw`p-3 bg-white border-t border-gray-100 shadow-md`]}>
                        {/* Price Breakdown */}
                        <View style={tw`mb-2`}>
                            <View style={tw`flex-row justify-between mb-0.5`}>
                                <Text style={[fontStyles.caption, tw`text-gray-500 text-[10px]`]}>Item Price</Text>
                                <Text style={[fontStyles.caption, tw`text-gray-800 text-[10px]`]}>₹{basePrice}</Text>
                            </View>
                            {addOnTotal > 0 && (
                                <View style={tw`flex-row justify-between mb-0.5`}>
                                    <Text style={[fontStyles.caption, tw`text-gray-500 text-[10px]`]}>Extra Add-ons</Text>
                                    <Text style={[fontStyles.caption, tw`text-gray-800 text-[10px]`]}>₹{addOnTotal}</Text>
                                </View>
                            )}
                            <View style={tw`my-1 border-t border-dashed border-gray-200`} />
                            <View style={tw`flex-row justify-between items-center`}>
                                <Text style={[fontStyles.headingS, tw`text-gray-900 text-sm`]}>Total</Text>
                                <Text style={[fontStyles.headingS, tw`text-gray-900 text-sm`]}>₹{totalPrice}</Text>
                            </View>
                        </View>

                        {/* Add to Cart Button */}
                        <TouchableOpacity
                            onPress={handleAddToCart}
                            disabled={!canAddToCart}
                            style={[
                                tw`w-full py-3 rounded-xl flex-row items-center justify-center shadow-sm`,
                                canAddToCart ? tw`bg-[#6B9080]` : tw`bg-gray-300`,
                            ]}
                        >
                            <Text style={[fontStyles.bodyBold, tw`text-white text-sm`]}>
                                Add to Cart - ₹{totalPrice}
                            </Text>
                        </TouchableOpacity>
                    </View>

                </Animated.View >
            </View >
        </Modal >
    );
};

export default CustomizationPopup;
