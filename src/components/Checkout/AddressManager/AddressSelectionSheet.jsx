

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    FlatList,
    Dimensions,
    TextInput,
    Animated,
    Platform,
    ActivityIndicator,
    KeyboardAvoidingView,
    PanResponder
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { fontStyles } from '../../../utils/fontStyles';
import { fetchUserAddresses, searchLocations, reverseGeocode, deleteAddress, setPrimaryAddress } from '../../../services/addressApi';
import * as Location from 'expo-location';
import AddressGrid from './AddressGrid';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const AddressSelectionSheet = ({
    visible,
    onClose,
    onSelectAddress,
    onAddNewAddress,
    onEditAddress,
    onDeleteAddress,
    onSetPrimary,
    vendorData = null
}) => {
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    const searchTimeoutRef = useRef(null);
    const [selectedAddressId, setSelectedAddressId] = useState(null);

    useEffect(() => {
        if (visible) {
            checkSelectedAddress();
        }
    }, [visible]);

    const checkSelectedAddress = async () => {
        try {
            const saved = await AsyncStorage.getItem("selectedAddress");
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.id) {
                    setSelectedAddressId(parsed.id);
                }
            }
        } catch (e) {
            console.log("Error checking selected address", e);
        }
    };

    // Animation for slide up
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            loadAddresses();
            // Slide up animation
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Slide down animation
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: SCREEN_HEIGHT,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const loadAddresses = async () => {
        try {
            setLoading(true);
            const data = await fetchUserAddresses();
            setAddresses(data || []);
        } catch (error) {
            console.error('Error fetching addresses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
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
                // If dragged down more than 100px, close the sheet
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

    const handleCurrentLocation = async () => {
        try {
            // Request location permissions
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                alert('Permission to access location was denied');
                return;
            }

            // Show loading state
            setLoading(true);

            // Get current position
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const { latitude, longitude } = location.coords;

            // Reverse geocode to get address
            const addressData = await reverseGeocode(latitude, longitude);

            // Close sheet and pass location data to parent
            onClose();
            if (onSelectAddress) {
                onSelectAddress({
                    type: 'current',
                    latitude,
                    longitude,
                    address: addressData?.formattedAddress || addressData?.address || `${latitude}, ${longitude}`,
                    ...addressData
                });
            }
        } catch (error) {
            console.log('Error getting current location:', error);
            alert('Failed to get current location. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Debounced search handler
    const handleSearchChange = (text) => {
        setSearchText(text);

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Clear results if search is empty
        if (!text.trim()) {
            setSearchResults([]);
            return;
        }

        // Set new timeout for search
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                setSearchLoading(true);
                const results = await searchLocations(text);
                setSearchResults(results || []);
            } catch (error) {
                console.log('Search API error:', error.response?.status, error.message);
                // Fallback: If API fails, just filter saved addresses locally
                // This ensures search still works even if backend endpoint isn't ready
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        }, 500); // 500ms debounce
    };

    const handleSearchResultSelect = (result) => {
        // Close sheet and pass the search result to parent
        onClose();
        if (onSelectAddress) {
            onSelectAddress({
                type: 'search',
                ...result
            });
        }
    };

    const handleDeleteAddress = async (id) => {
        try {
            setLoading(true);
            await deleteAddress(id);
            // Reload addresses
            await loadAddresses();
        } catch (error) {
            console.error("Error deleting address:", error);
            alert("Failed to delete address");
        } finally {
            setLoading(false);
        }
    };

    const handleSetPrimaryAddress = async (id) => {
        try {
            setLoading(true);
            await setPrimaryAddress(id);
            // Reload addresses
            await loadAddresses();
        } catch (error) {
            console.error("Error setting primary address:", error);
            alert("Failed to update primary address");
        } finally {
            setLoading(false);
        }
    };

    const filteredAddresses = addresses.filter(addr => {
        if (!searchText.trim()) {
            return true; // Show all addresses when search is empty
        }
        const search = searchText.toLowerCase();
        return (
            (addr.label && addr.label.toLowerCase().includes(search)) ||
            (addr.addressLine && addr.addressLine.toLowerCase().includes(search)) ||
            (addr.city && addr.city.toLowerCase().includes(search)) ||
            (addr.landmark && addr.landmark.toLowerCase().includes(search)) ||
            (addr.type && addr.type.toLowerCase().includes(search))
        );
    }).sort((a, b) => {
        // 1. Current Selected Address on Top
        if (selectedAddressId) {
            if (a.id === selectedAddressId) return -1;
            if (b.id === selectedAddressId) return 1;
        }
        // 2. Primary Address Next
        if (a.isPrimary) return -1;
        if (b.isPrimary) return 1;

        return 0;
    });

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={handleClose}
        >
            <View style={tw`flex-1 justify-end`}>
                {/* Dimmed Background */}
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={handleClose}
                    style={tw`absolute top-0 bottom-0 left-0 right-0`}
                >
                    <Animated.View
                        style={[
                            tw`flex-1 bg-black`,
                            { opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }) }
                        ]}
                    />
                </TouchableOpacity>

                {/* Bottom Sheet Content */}
                <Animated.View
                    style={[
                        tw`bg-white rounded-t-3xl h-[85%] w-full overflow-hidden`,
                        { transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={tw`flex-1`}
                    >
                        <View {...panResponder.panHandlers}>
                            {/* Drag Handle */}
                            <View style={tw`w-full items-center pt-2 pb-1`}>
                                <View style={tw`w-10 h-1 bg-gray-300 rounded-full`} />
                            </View>

                            {/* Header */}
                            <View style={tw`px-4 pt-3 pb-3 bg-white`}>
                                <View style={tw`flex-row items-center justify-between mb-4`}>
                                    <Text style={[fontStyles.headingS, tw`text-lg font-bold text-gray-900`]}>
                                        Select delivery location
                                    </Text>
                                </View>

                                {/* Search Bar - Redirects to Add New Address */}
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={() => {
                                        onClose();
                                        onAddNewAddress && onAddNewAddress({ autoFocus: true });
                                    }}
                                >
                                    <View style={tw`flex-row items-center bg-gray-50 rounded-lg px-3 py-3 border border-gray-200`}>
                                        <Ionicons name="search" size={18} color="#9CA3AF" />
                                        <Text style={[fontStyles.body, tw`flex-1 ml-2 text-gray-400 text-sm`]}>
                                            Search for area, street name...
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            <View style={tw`bg-gray-50`}>
                                {/* Header Buttons */}
                                {!searchText.trim() && (
                                    <View style={tw`px-4 pt-4 mb-3`}>
                                        {/* Current Location Option */}
                                        <TouchableOpacity
                                            style={tw`flex-row items-center bg-white p-4 rounded-lg mb-3`}
                                            onPress={handleCurrentLocation}
                                            activeOpacity={0.7}
                                        >
                                            <View style={tw`w-6 h-6 items-center justify-center mr-3`}>
                                                <Ionicons name="locate" size={20} color="#16A34A" />
                                            </View>
                                            <View style={tw`flex-1`}>
                                                <Text style={[fontStyles.bodyBold, tw`text-green-700 text-sm`]}>
                                                    Use your current location
                                                </Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                                        </TouchableOpacity>


                                        {/* Add New Address Option */}
                                        <TouchableOpacity
                                            style={tw`flex-row items-center bg-white p-4 rounded-lg mb-3`}
                                            onPress={() => {
                                                onClose();
                                                onAddNewAddress && onAddNewAddress();
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={tw`w-6 h-6 items-center justify-center mr-3`}>
                                                <Ionicons name="add" size={22} color="#16A34A" />
                                            </View>
                                            <Text style={[fontStyles.bodyBold, tw`text-green-700 text-sm flex-1`]}>
                                                Add new address
                                            </Text>
                                            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                                        </TouchableOpacity>

                                        <Text style={[fontStyles.bodyBold, tw`text-gray-400 text-[11px] mb-3 ml-1 uppercase tracking-wider`]}>
                                            Saved addresses
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={tw`flex-1 bg-gray-50`}>
                            {/* Search Results or Saved Addresses */}
                            {searchText.trim() ? (
                                <View style={tw`px-4`}>
                                    {searchResults.map((item) => (
                                        <TouchableOpacity
                                            key={item.id || Math.random().toString()}
                                            style={tw`bg-white rounded-lg p-4 mb-3 flex-row items-start`}
                                            onPress={() => handleSearchResultSelect(item)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={tw`w-10 h-10 bg-gray-50 rounded-lg items-center justify-center mr-3`}>
                                                <Ionicons name="location" size={20} color="#6B7280" />
                                            </View>
                                            <View style={tw`flex-1`}>
                                                <Text style={[fontStyles.bodyBold, tw`text-gray-900 text-sm mb-1`]}>
                                                    {item.name || item.address || 'Location'}
                                                </Text>
                                                <Text style={[fontStyles.body, tw`text-gray-500 text-xs`]} numberOfLines={2}>
                                                    {item.description || item.formattedAddress || item.address}
                                                </Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    ))}
                                    {searchLoading && <ActivityIndicator size="small" color="#6B9080" style={tw`mt-4`} />}
                                    {!searchLoading && searchResults.length === 0 && (
                                        <View style={tw`items-center justify-center py-10`}>
                                            <Ionicons name="location-outline" size={64} color="#D1D5DB" style={tw`mb-4`} />
                                            <Text style={[fontStyles.body, tw`text-gray-400 text-center`]}>
                                                No locations found
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                loading ? (
                                    <View style={tw`items-center justify-center py-10`}>
                                        <ActivityIndicator size="large" color="#6B9080" />
                                    </View>
                                ) : addresses.length > 0 ? (
                                    <View style={tw`px-4 flex-1`}>
                                        <AddressGrid
                                            addresses={filteredAddresses}
                                            showActions={true}
                                            selectedAddressId={null}
                                            onAddressSelect={onSelectAddress}
                                            onEditClick={(addr) => {
                                                onClose();
                                                onEditAddress && onEditAddress(addr);
                                            }}
                                            onSetPrimary={handleSetPrimaryAddress}
                                            onDelete={handleDeleteAddress}
                                            vendorData={vendorData}
                                            forceVisible={true}
                                        />
                                    </View>
                                ) : (
                                    <View style={tw`items-center justify-center py-10`}>
                                        <Ionicons name="location-outline" size={64} color="#D1D5DB" style={tw`mb-4`} />
                                        <Text style={[fontStyles.body, tw`text-gray-400 text-center`]}>
                                            No saved addresses found
                                        </Text>
                                    </View>
                                )
                            )}
                        </View>
                    </KeyboardAvoidingView>
                </Animated.View>
            </View>
        </Modal >
    );
};

export default AddressSelectionSheet;
