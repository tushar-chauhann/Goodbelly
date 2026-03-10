import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import tw from "twrnc";
import { fontStyles } from "../../../utils/fontStyles";
import { useDispatch } from "react-redux";
import * as Location from "expo-location";
import { GOOGLE_MAPS_API_KEY } from "@env";
import CustomPopup from "../../CustomPopup/CustomPopup";
import {
  autocompleteLocations,
  getCurrentLocation as fetchCurrentLocationInfo,
  getLocationDetails,
  checkAddressServiceability,
} from "../../../services/addressApi";

const PRIMARY_COLOR = "#5F7F67";

const CreateAddressModal = ({
  onClose,
  onSubmit,
  currentLocation,
  isSubmitting,
  editAddress = null,
  autoFocus = false,
  vendorData = null,
}) => {
  const webViewRef = useRef(null);
  const scrollViewRef = useRef(null);
  const searchInputRef = useRef(null);
  const [formData, setFormData] = useState({
    addressLine: "",
    city: "",
    phone: "",
    landmark: "",
    zipCode: "",
    type: "Home",
  });

  const [mapLocation, setMapLocation] = useState({
    latitude: 28.6139,
    longitude: 77.209,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Serviceability State
  const [serviceStatus, setServiceStatus] = useState({ isServiceable: true, message: "" });
  const [checkingServiceability, setCheckingServiceability] = useState(false);

  // Custom popup states
  const [showPopup, setShowPopup] = useState(false);
  const [popupConfig, setPopupConfig] = useState({
    title: "",
    message: "",
    type: "info",
    onConfirm: null,
    showCancelButton: false,
  });

  const [addressTypes] = useState([
    { value: "Home", label: "Home", icon: "home" },
    { value: "Office", label: "Office", icon: "business" },
    { value: "Other", label: "Other", icon: "location-pin" },
  ]);

  // Show custom popup
  const showCustomPopup = (
    title,
    message,
    type = "info",
    onConfirm = null,
    showCancelButton = false
  ) => {
    setPopupConfig({
      title,
      message,
      type,
      onConfirm,
      showCancelButton,
    });
    setShowPopup(true);
  };

  // Hide custom popup
  const hidePopup = () => {
    setShowPopup(false);
  };

  // Handle popup confirm
  const handlePopupConfirm = () => {
    if (popupConfig.onConfirm) {
      popupConfig.onConfirm();
    }
    hidePopup();
  };

  useEffect(() => {
    if (autoFocus && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus();
      }, 500);
    }
  }, [autoFocus]);

  // Initialize form if editing existing address
  useEffect(() => {
    if (editAddress) {
      setFormData({
        addressLine: editAddress.addressLine || "",
        city: editAddress.city || "",
        phone: editAddress.phone || "",
        landmark: editAddress.landmark || "",
        zipCode: editAddress.zipCode || "",
        type: editAddress.type || "Home",
      });

      if (editAddress.latitude && editAddress.longitude) {
        setMapLocation({
          latitude: parseFloat(editAddress.latitude),
          longitude: parseFloat(editAddress.longitude),
        });
      }
    }
  }, [editAddress]);

  // Get current location on mount or when currentLocation prop changes
  useEffect(() => {
    if (currentLocation && currentLocation.coords) {
      const { latitude, longitude } = currentLocation.coords;
      setMapLocation({ latitude, longitude });
      if (!editAddress && !formData.addressLine) {
        reverseGeocode(latitude, longitude);
      }
    } else {
      getCurrentLocation();
    }
  }, [currentLocation]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length > 2 && showPredictions) {
        fetchPredictions(searchQuery);
      } else if (searchQuery.length <= 2) {
        setPredictions([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, showPredictions]);

  // Check serviceability when location changes
  useEffect(() => {
    const checkServiceability = async () => {
      if (!vendorData) return;

      setCheckingServiceability(true);
      try {
        const addressToCheck = {
          latitude: mapLocation.latitude,
          longitude: mapLocation.longitude,
          addressLine: formData.addressLine || "",
          city: formData.city || "",
          zipCode: formData.zipCode || "",
        };

        const response = await checkAddressServiceability(addressToCheck, vendorData);

        const isServiceable =
          response?.serviceability?.locationServiceAble === true &&
          response?.serviceability?.riderServiceAble === true;

        let message = "Serviceable";
        if (!isServiceable) {
          message = response?.payouts?.message || "Not Serviceable";
        }

        setServiceStatus({ isServiceable, message });
      } catch (error) {
        console.error("Serviceability check error:", error);
        // Default to serviceable if check fails (as per AddressGrid fallback)
        setServiceStatus({ isServiceable: true, message: "Serviceable" });
      } finally {
        setCheckingServiceability(false);
      }
    };

    const timer = setTimeout(checkServiceability, 800); // 800ms debounce
    return () => clearTimeout(timer);
  }, [mapLocation.latitude, mapLocation.longitude, vendorData]);

  const fetchPredictions = async (text) => {
    try {
      const data = await autocompleteLocations(
        text,
        mapLocation.latitude,
        mapLocation.longitude
      );
      if (data && data.suggestions) {
        setPredictions(data.suggestions);
      } else {
        setPredictions([]);
      }
    } catch (error) {
      console.error("Error fetching predictions:", error);
      setPredictions([]);
    }
  };

  const handlePredictionSelect = async (placeId) => {
    try {
      setIsLoadingLocation(true);
      setShowPredictions(false);
      setPredictions([]);

      // Find the selected prediction to check if we already have coordinates
      // Backend returns 'place_id', not 'placeId'
      const selectedPrediction = predictions.find((p) => p.place_id === placeId);
      let lat, lng;

      if (
        selectedPrediction &&
        selectedPrediction.latitude &&
        selectedPrediction.longitude
      ) {
        // Use coordinates directly from autocomplete response
        lat = parseFloat(selectedPrediction.latitude);
        lng = parseFloat(selectedPrediction.longitude);
      } else {
        // Only call getLocationDetails if coordinates are not available
        // This helps avoid 500 errors when the backend endpoint has issues
        try {
          const details = await getLocationDetails(placeId);
          if (details && details.latitude && details.longitude) {
            lat = parseFloat(details.latitude);
            lng = parseFloat(details.longitude);
          } else {
            // If details call fails or returns invalid data, show error
            throw new Error("Invalid location details received");
          }
        } catch (detailsError) {
          console.error("Error fetching location details:", detailsError);
          // If we can't get details, use the map's current location as fallback
          // and just update the search query for user clarity
          showCustomPopup(
            "Error",
            "Could not fetch detailed location information. Please try selecting a different location or use the map to pinpoint your address.",
            "error"
          );
          setIsLoadingLocation(false);
          return;
        }
      }

      setMapLocation({ latitude: lat, longitude: lng });

      // Update map center
      if (isMapReady && webViewRef.current) {
        webViewRef.current.injectJavaScript(`
            updateMapCenter(${lat}, ${lng});
            true;
          `);
      }

      // Fetch full address details using backend logic
      await reverseGeocode(lat, lng);
    } catch (error) {
      console.error("Error handling place selection:", error);
      showCustomPopup("Error", "Failed to process location selection", "error");
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const result = await fetchCurrentLocationInfo(latitude, longitude);

      setFormData((prev) => ({
        ...prev,
        addressLine: result.formattedAddress || result.addressLine || "",
        city: result.city || "",
        zipCode: result.zipCode || "",
        landmark: result.landmark || "",
        // Don't overwrite phone or type here usually, or should we?
        // Backend doesn't return phone usually for reverse geocode unless it's a specific place
      }));
    } catch (error) {
      console.error("Error reverse geocoding:", error);
    } finally {
      setIsDragging(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (
      !formData.addressLine.trim() ||
      !formData.city.trim() ||
      !formData.phone.trim() ||
      !formData.zipCode.trim()
    ) {
      showCustomPopup("Error", "Please fill in all required fields", "error");
      return;
    }

    // Basic phone validation for Indian numbers
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = (formData.phone || "").replace(/\D/g, "");
    if (!phoneRegex.test(cleanPhone)) {
      showCustomPopup(
        "Error",
        "Please enter a valid 10-digit Indian phone number",
        "error"
      );
      return;
    }

    // ZIP Code validation
    const zipCodeRegex = /^[0-9]{6}$/;
    if (!zipCodeRegex.test(formData.zipCode)) {
      showCustomPopup(
        "Error",
        "Please enter a valid 6-digit ZIP code",
        "error"
      );
      return;
    }

    const addressData = {
      ...formData,
      phone: cleanPhone,
      latitude: mapLocation.latitude,
      longitude: mapLocation.longitude,
    };

    onSubmit(addressData);
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);

      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Location permission denied");
        showCustomPopup(
          "Permission Required",
          "Please enable location permissions in your device settings to use this feature.",
          "info"
        );
        setIsLoadingLocation(false);
        return;
      }

      // Get current position
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
      });

      const { latitude, longitude } = location.coords;
      setMapLocation({ latitude, longitude });

      // Update map center
      if (isMapReady && webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          updateMapCenter(${latitude}, ${longitude});
          true;
        `);
      }

      // Reverse geocode to get address
      if (!editAddress) {
        await reverseGeocode(latitude, longitude);
      }
    } catch (error) {
      console.error("Error getting location:", error);

      // Handle specific error cases for better UX
      if (error.message?.includes("kCLErrorDomain")) {
        // iOS location service error
        showCustomPopup(
          "Location Unavailable",
          "Unable to access your current location. Please ensure Location Services are enabled in Settings, or try using the search bar to find your address.",
          "info"
        );
      } else if (error.message?.includes("timeout")) {
        showCustomPopup(
          "Timeout",
          "Location request timed out. Please try again or use the search bar to find your address.",
          "error"
        );
      } else {
        // Generic fallback - don't show popup for every error, just log it
        console.log("Location error (non-critical):", error.message);
      }
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) {
      showCustomPopup("Error", "Please enter a location to search", "error");
      return;
    }

    try {
      setIsLoadingLocation(true);
      setShowPredictions(false);

      // Geocode the search query
      let geocode = await Location.geocodeAsync(searchQuery);

      if (geocode.length > 0) {
        const { latitude, longitude } = geocode[0];
        setMapLocation({ latitude, longitude });

        // Update map center
        if (isMapReady && webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            updateMapCenter(${latitude}, ${longitude});
            true;
          `);
        }

        // Reverse geocode to get full address details
        await reverseGeocode(latitude, longitude);
      } else {
        showCustomPopup(
          "Not Found",
          "Location not found. Please try a different search.",
          "info"
        );
      }
    } catch (error) {
      console.error("Error searching location:", error);
      showCustomPopup("Error", "Failed to search location", "error");
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleMapMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "mapReady") {
        setIsMapReady(true);
        // Center map on current location once ready
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            updateMapCenter(${mapLocation.latitude}, ${mapLocation.longitude});
            true;
          `);
        }
      } else if (data.type === "mapDragStart") {
        setIsDragging(true);
        setScrollEnabled(false);
      } else if (data.type === "mapDragEnd") {
        setScrollEnabled(true);
      } else if (data.type === "locationChanged") {
        // Map center changed (drag ended)
        const { latitude, longitude } = data;
        setMapLocation({ latitude, longitude });
        await reverseGeocode(latitude, longitude);
      }
    } catch (error) {
      console.error("Error handling map message:", error);
    }
  };

  const formatIndianPhoneNumber = (text) => {
    if (!text) return "";
    const cleaned = text.replace(/\D/g, "");

    const limited = cleaned.slice(0, 10);

    let formatted = limited;
    if (limited.length <= 5) {
      formatted = limited;
    } else if (limited.length <= 10) {
      formatted = `${limited.slice(0, 5)} ${limited.slice(5)}`;
    }

    return formatted;
  };

  const handlePhoneChange = (text) => {
    const formatted = formatIndianPhoneNumber(text);
    setFormData((prev) => ({ ...prev, phone: formatted }));
  };

  const mapHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body, #map { width: 100%; height: 100%; position: relative; touch-action: none; }
          
          /* Fixed Center Pin */
          .center-marker {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -100%); /* Anchor at bottom center */
            z-index: 10;
            pointer-events: none; /* Let clicks pass through to map */
          }
          
          .pin-icon {
            width: 32px;
            height: 32px;
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%235F7F67"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>');
            background-size: contain;
            background-repeat: no-repeat;
            filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.3));
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div class="center-marker">
          <div class="pin-icon"></div>
        </div>
        
        <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}"></script>
        <script>
          let map;
          
          function initMap() {
            const initialLocation = { lat: ${mapLocation.latitude}, lng: ${mapLocation.longitude} };
            
            map = new google.maps.Map(document.getElementById('map'), {
              center: initialLocation,
              zoom: 16,
              disableDefaultUI: true, // Clean look
              zoomControl: false,
              gestureHandling: 'greedy', // Enable one-finger pan
              clickableIcons: false,
              backgroundColor: '#f0f0f0', // Placeholder color
            });
            
            // Listen for dragstart to notify app immediately
            map.addListener('dragstart', function() {
               window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapDragStart'
              }));
            });

            // Listen for dragend
            map.addListener('dragend', function() {
               window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapDragEnd'
              }));
            });

            // Listen for idle event (when map stops moving)
            map.addListener('idle', function() {
              const center = map.getCenter();
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'locationChanged',
                latitude: center.lat(),
                longitude: center.lng()
              }));
            });
            
            // Notify React Native that map is ready
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapReady'
            }));
          }
          
          function updateMapCenter(lat, lng) {
            const newLocation = { lat: lat, lng: lng };
            map.setCenter(newLocation);
          }
          
          initMap();
        </script>
      </body>
    </html>
  `;

  return (
    <>
      <Modal
        visible={true}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
        statusBarTranslucent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={tw`flex-1`}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <View style={tw`flex-1 bg-black/50 justify-end`}>
            <TouchableOpacity
              style={tw`flex-1`}
              activeOpacity={1}
              onPress={onClose}
            />
            <View style={tw`bg-white rounded-t-3xl h-[90%] w-full`}>
              {/* Header */}
              <View
                style={tw`px-4 py-3 border-b border-gray-200 bg-white rounded-t-3xl`}
              >
                <View style={tw`flex-row justify-between items-center`}>
                  <Text
                    style={[
                      fontStyles.headingS,
                      tw`text-gray-800 font-semibold`,
                    ]}
                  >
                    {editAddress ? "Edit Address" : "Add New Address"}
                  </Text>
                  <TouchableOpacity onPress={onClose} style={tw`p-1`}>
                    <Ionicons name="close" size={22} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={tw`pb-4`}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                scrollEnabled={scrollEnabled}
                nestedScrollEnabled={true}
              >
                {/* Search Bar */}
                <View style={tw`px-4 pt-1 pb-2 z-20`}>
                  <View
                    style={tw`flex-row items-center bg-gray-100 rounded-lg px-3 py-1`}
                  >
                    <Ionicons name="search" size={18} color="#9CA3AF" />
                    <TextInput
                      ref={searchInputRef}
                      style={{
                        flex: 1,
                        marginLeft: 4,
                        fontSize: 14,
                        color: '#000000',
                        fontWeight: '400',
                        paddingVertical: 0
                      }}
                      placeholder="Search for area, landmark, or address..."
                      placeholderTextColor="#9CA3AF"
                      value={searchQuery}
                      onChangeText={(text) => {
                        setSearchQuery(text);
                        setShowPredictions(true);
                      }}
                      onSubmitEditing={handleSearchLocation}
                      returnKeyType="search"
                      keyboardAppearance="light"
                      selectionColor="#000000"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          setSearchQuery("");
                          setPredictions([]);
                        }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={18}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Autocomplete Predictions List */}
                  {showPredictions && predictions.length > 0 && (
                    <View
                      style={tw`absolute top-14 left-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-48`}
                    >
                      <ScrollView keyboardShouldPersistTaps="handled">
                        {predictions.map((item, index) => (
                          <TouchableOpacity
                            key={item.place_id || `prediction-${index}`}
                            style={tw`px-4 py-3 border-b border-gray-100 flex-row items-center`}
                            onPress={() =>
                              handlePredictionSelect(item.place_id)
                            }
                          >
                            <Ionicons
                              name="location"
                              size={16}
                              color="#9CA3AF"
                              style={tw`mr-2`}
                            />
                            <Text
                              style={{
                                fontSize: 14,
                                color: '#1F2937',
                                flex: 1,
                                fontWeight: '500'
                              }}
                              numberOfLines={1}
                            >
                              {item.displayName || item.addressLine || 'Unknown location'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Map Container */}
                <View
                  style={tw`mx-4 mb-3 rounded-lg overflow-hidden border border-gray-200 z-10`}
                  onTouchStart={() => {
                    setScrollEnabled(false);
                    scrollViewRef.current?.setNativeProps({ scrollEnabled: false });
                  }}
                  onTouchEnd={() => {
                    setScrollEnabled(true);
                    scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
                  }}
                  onTouchCancel={() => {
                    setScrollEnabled(true);
                    scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
                  }}
                >
                  <View style={tw`h-48 relative`}>
                    <WebView
                      ref={webViewRef}
                      source={{ html: mapHTML }}
                      style={tw`flex-1`}
                      onMessage={handleMapMessage}
                      javaScriptEnabled={true}
                      domStorageEnabled={true}
                      startInLoadingState={true}
                      androidHardwareAccelerationDisabled={false}
                      overScrollMode="never"
                      opacity={0.99}
                      renderLoading={() => (
                        <View
                          style={tw`absolute inset-0 items-center justify-center bg-gray-100`}
                        >
                          <ActivityIndicator
                            size="large"
                            color={PRIMARY_COLOR}
                          />
                        </View>
                      )}
                    />

                    {/* My Location Button Overlay */}
                    <TouchableOpacity
                      style={tw`absolute top-2 right-2 bg-white rounded-lg px-3 py-1.5 flex-row items-center shadow-md`}
                      onPress={getCurrentLocation}
                      disabled={isLoadingLocation}
                    >
                      {isLoadingLocation ? (
                        <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                      ) : (
                        <>
                          <Ionicons
                            name="locate"
                            size={14}
                            color={PRIMARY_COLOR}
                          />
                          <Text
                            style={[
                              fontStyles.caption,
                              tw`ml-1 text-xs text-[${PRIMARY_COLOR}] font-medium`,
                            ]}
                          >
                            My Location
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Serviceability Warning */}
                {vendorData && !serviceStatus.isServiceable && (
                  <View style={tw`mx-4 mb-4 bg-red-50 p-3 rounded-lg border border-red-100`}>
                    <View style={tw`flex-row items-center mb-1`}>
                      <Ionicons name="alert-circle" size={18} color="#EF4444" style={tw`mr-2`} />
                      <Text style={[fontStyles.bodyBold, tw`text-red-700 text-xs`]}>
                        Not Serviceable
                      </Text>
                    </View>
                    <Text style={[fontStyles.body, tw`text-red-600 text-xs ml-6`]}>
                      {serviceStatus.message}
                    </Text>
                  </View>
                )}

                {/* Form Fields */}
                <View style={tw`px-4 gap-4`}>
                  {/* Address Line */}
                  <View>
                    <Text
                      style={[
                        fontStyles.body,
                        tw`text-gray-700 text-sm font-medium mb-1`,
                      ]}
                    >
                      Address Line *
                    </Text>
                    <View style={tw`relative`}>
                      <TextInput
                        style={tw`border border-gray-300 rounded-lg px-3 py-2 text-sm h-16 bg-white text-black ${isDragging ? "opacity-50" : ""
                          }`}
                        placeholder="210,jubli bas ,scheme no 2 Alwar, Central Secretariat, New Delhi, Delhi 110001, India"
                        value={formData.addressLine}
                        onChangeText={(text) =>
                          setFormData((prev) => ({
                            ...prev,
                            addressLine: text,
                          }))
                        }
                        multiline
                        textAlignVertical="top"
                        editable={!isDragging}
                      />
                      {isDragging && (
                        <View
                          style={tw`absolute inset-0 items-center justify-center bg-white/50 rounded-lg`}
                        >
                          <View
                            style={tw`flex-row items-center bg-gray-800/80 px-3 py-1.5 rounded-full`}
                          >
                            <ActivityIndicator size="small" color="white" />
                            <Text
                              style={tw`text-white text-xs ml-2 font-medium`}
                            >
                              Locating...
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* City */}
                  <View>
                    <Text
                      style={[
                        fontStyles.body,
                        tw`text-gray-700 mb-1 text-sm font-medium`,
                      ]}
                    >
                      City *
                    </Text>
                    <TextInput
                      style={tw`border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-black`}
                      placeholder="New Delhi"
                      value={formData.city}
                      onChangeText={(text) =>
                        setFormData((prev) => ({ ...prev, city: text }))
                      }
                    />
                  </View>

                  {/* Phone */}
                  <View>
                    <Text
                      style={[
                        fontStyles.body,
                        tw`text-gray-700 mb-1 text-sm font-medium`,
                      ]}
                    >
                      Phone *
                    </Text>
                    <TextInput
                      style={tw`border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-black`}
                      placeholder="Phone Number"
                      value={formData.phone}
                      onChangeText={handlePhoneChange}
                      keyboardType="phone-pad"
                      maxLength={11}
                    />
                  </View>

                  {/* ZIP Code */}
                  <View>
                    <Text
                      style={[
                        fontStyles.body,
                        tw`text-gray-700 mb-1 text-sm font-medium`,
                      ]}
                    >
                      ZIP Code *
                    </Text>
                    <TextInput
                      style={tw`border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-black`}
                      placeholder="110001"
                      value={formData.zipCode}
                      onChangeText={(text) =>
                        setFormData((prev) => ({ ...prev, zipCode: text }))
                      }
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>

                  {/* Landmark */}
                  <View>
                    <Text
                      style={[fontStyles.body, tw`text-gray-700 mb-1 text-sm`]}
                    >
                      Landmark (Optional)
                    </Text>
                    <TextInput
                      style={tw`border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-black`}
                      placeholder="Landmark"
                      value={formData.landmark}
                      onChangeText={(text) =>
                        setFormData((prev) => ({ ...prev, landmark: text }))
                      }
                    />
                  </View>

                  {/* Address Type */}
                  <View style={tw`flex-row gap-2 pb-2`}>
                    {addressTypes.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        style={tw`flex-1 border rounded-lg py-2.5 items-center flex-row justify-center ${formData.type === type.value
                          ? `border-[${PRIMARY_COLOR}] bg-[${PRIMARY_COLOR}]`
                          : "border-gray-300 bg-white"
                          }`}
                        onPress={() =>
                          setFormData((prev) => ({ ...prev, type: type.value }))
                        }
                      >
                        <MaterialIcons
                          name={type.icon}
                          size={16}
                          color={
                            formData.type === type.value ? "white" : "#6B7280"
                          }
                        />
                        <Text
                          style={[
                            fontStyles.body,
                            tw`ml-1.5 text-xs ${formData.type === type.value
                              ? "text-white font-medium"
                              : "text-gray-600"
                              }`,
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* Footer Buttons */}
              <SafeAreaView style={tw`bg-white`} edges={['bottom']}>
                <View style={tw`px-4 pt-3 pb-2 border-t border-gray-200 bg-white`}>
                  <View style={tw`flex-row gap-3`}>
                    <TouchableOpacity
                      style={tw`flex-1 border border-gray-300 rounded-lg py-2.5 bg-white`}
                      onPress={onClose}
                      disabled={isSubmitting}
                    >
                      <Text
                        style={[
                          fontStyles.bodyBold,
                          tw`text-gray-700 text-center text-sm font-medium`,
                        ]}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={tw`flex-1 bg-[${PRIMARY_COLOR}] rounded-lg py-2.5 ${isSubmitting ? "opacity-70" : ""
                        }`}
                      onPress={handleSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text
                          style={[
                            fontStyles.bodyBold,
                            tw`text-white text-center text-sm font-semibold`,
                          ]}
                        >
                          Save Address
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </SafeAreaView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Custom Popup */}
      <CustomPopup
        visible={showPopup}
        onClose={hidePopup}
        title={popupConfig.title}
        message={popupConfig.message}
        type={popupConfig.type}
        showCancelButton={popupConfig.showCancelButton}
        cancelText="Cancel"
        confirmText="OK"
        onConfirm={handlePopupConfirm}
      />
    </>
  );
};

export default CreateAddressModal;
