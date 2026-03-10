import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import Voice from "../../services/VoiceWrapper";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import tw from "twrnc";
import { authService } from "../../services/authService.js";
import Logo from "../../assets/logo.png";
import AllHomeIcon from "../../assets/allhome.png";
import BannerImage from "../../assets/banner.png";

// Import font styles
import { fontStyles } from "../../utils/fontStyles";

// Import the separated components
import ChooseYourFuel from "../../components/home/ChooseYourFuel";
import ProductsByIngredients from "../../components/home/ProductsByIngredients";
import BrowseByKitchen from "../../components/home/BrowseByKitchen";
import CuratedCollections from "../../components/home/CuratedCollections";
import ConsultWithExpert from "../../components/home/ConsultWithExpert";
import CommunityPicks from "../../components/home/CommunityPicks";
import SmartPeopleSection from "../../components/home/SmartPeopleSection";
import GoodbellyScoop from "../../components/home/GoodbellyScoop";
import HighStandards from "../../components/home/HighStandards";
import Testimonials from "../../components/home/Testimonials";
import { HomeCategorySkeleton } from "../../components/ProductSkeleton";
import AddressSelectionSheet from "../../components/Checkout/AddressManager/AddressSelectionSheet";
import CreateAddressModal from "../../components/Checkout/AddressManager/CreateAddressModal";
import { createAddress, updateAddress, setPrimaryAddress } from "../../services/addressApi";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// DYNAMIC BANNER BACKGROUND COLOR
const BANNER_BG_COLOR = "#313131";
const WHITE_BG_COLOR = "#FFFFFF";

//   ADD: Helper function to get responsive sizes based on device
const getResponsiveSizes = () => {
  const isTablet = screenWidth >= 768;

  if (isTablet) {
    // Tablet sizing
    return {
      scrollThreshold: 420,
      headerPadding: 16,
      logoSize: 40,
      greetingFontSize: 20,
      locationFontSize: 15,
      locationIconSize: 16,
      searchBarWidth: screenWidth * 0.7,
      searchBarHeight: 56,
      searchIconSize: 20,
      searchFontSize: 15,
      profileSize: 44,
      profileIconSize: 22,
      bannerHeight: 320,
      categoryItemWidth: 100,
      categoryIconSize: 56,
      categoryFontSize: 11,
      categoryIndicatorWidth: 56,
    };
  } else if (screenWidth >= 414) {
    // Large phones
    return {
      scrollThreshold: 360,
      headerPadding: 12,
      logoSize: 32,
      greetingFontSize: 16,
      locationFontSize: 12,
      locationIconSize: 14,
      searchBarWidth: 342,
      searchBarHeight: 48,
      searchIconSize: 16,
      searchFontSize: 12,
      profileSize: 36,
      profileIconSize: 18,
      bannerHeight: 260,
      categoryItemWidth: 88,
      categoryIconSize: 48,
      categoryFontSize: 10,
      categoryIndicatorWidth: 48,
    };
  } else if (screenWidth >= 375) {
    // Medium phones
    return {
      scrollThreshold: 360,
      headerPadding: 12,
      logoSize: 32,
      greetingFontSize: 16,
      locationFontSize: 12,
      locationIconSize: 14,
      searchBarWidth: 342,
      searchBarHeight: 48,
      searchIconSize: 16,
      searchFontSize: 12,
      profileSize: 36,
      profileIconSize: 18,
      bannerHeight: 240,
      categoryItemWidth: 88,
      categoryIconSize: 48,
      categoryFontSize: 10,
      categoryIndicatorWidth: 48,
    };
  } else {
    // Small phones
    return {
      scrollThreshold: 340,
      headerPadding: 10,
      logoSize: 28,
      greetingFontSize: 14,
      locationFontSize: 11,
      locationIconSize: 12,
      searchBarWidth: screenWidth - 40,
      searchBarHeight: 44,
      searchIconSize: 14,
      searchFontSize: 11,
      profileSize: 32,
      profileIconSize: 16,
      bannerHeight: 220,
      categoryItemWidth: 80,
      categoryIconSize: 44,
      categoryFontSize: 9,
      categoryIndicatorWidth: 44,
    };
  }
};

const SubscriptionBanner = ({ navigation }) => {
  const handleSubscribePress = () => {
    console.log("Subscribe Now pressed - navigating to NewSubscriptionScreen");
    navigation.navigate("NewSubscription");
  };

  return (
    <View style={tw`mt-0 px-3 mb-4`}>
      <View
        style={[
          tw`rounded-xl p-4`,
          {
            backgroundColor: "#6A8B78",
          },
        ]}
      >
        <View style={tw`flex-col items-center`}>
          <View style={tw`items-center mb-2`}>
            <Text
              style={[
                fontStyles.headingItalic,
                tw`text-white text-center text-base leading-5`,
              ]}
            >
              Subscribe for daily
            </Text>
            <Text
              style={[
                fontStyles.headingItalic,
                tw`text-white text-center text-base leading-5`,
              ]}
            >
              goodness!
            </Text>
          </View>

          <Text
            style={[
              fontStyles.bodyBold,
              tw`text-white text-center text-xs mb-2`,
            ]}
          >
            Cancel any meal any time!
          </Text>

          <Text
            style={[
              fontStyles.body,
              tw`text-white text-xs text-center mb-4 leading-4`,
            ]}
          >
            Can't get enough of our meals? Get a{"\n"}subscription of your fav
            items!
          </Text>

          <TouchableOpacity
            style={tw`bg-white rounded-full px-8 py-2.5`}
            onPress={handleSubscribePress}
          >
            <Text
              style={[fontStyles.bodyBold, tw`text-sm`, { color: "#6A8B78" }]}
            >
              Subscribe Now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Category Filter Tabs Component - With Bottom Indicator Bar
const CategoryTabs = ({ categories, selectedCategory, onSelectCategory, backgroundColor, sizes }) => {
  const scrollViewRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const selectionX = useRef(new Animated.Value(0)).current;

  // All tabs including "All" + fetched categories
  const allTabs = [
    {
      key: "all",
      label: "All",
      icon: AllHomeIcon,
      isLocal: true,
    },
    ...categories.map((cat) => ({
      key: cat.id || cat._id,
      label: cat.name,
      icon: cat.image,
      isLocal: false,
    })),
  ];

  // Get selected index
  const selectedIndex = allTabs.findIndex((tab) => tab.key === selectedCategory);

  //   UPDATED: Use responsive item width
  const ITEM_WIDTH = sizes.categoryItemWidth;
  const INDICATOR_WIDTH = sizes.categoryIndicatorWidth;

  // Update selection position when selectedCategory changes
  useEffect(() => {
    if (selectedIndex !== -1) {
      const targetPosition = selectedIndex * ITEM_WIDTH;

      Animated.timing(selectionX, {
        toValue: targetPosition,
        duration: 500,
        useNativeDriver: true,
      }).start();

      if (scrollViewRef.current) {
        const scrollToX = Math.max(0, (selectedIndex * ITEM_WIDTH) - (screenWidth / 2) + (ITEM_WIDTH / 2));
        scrollViewRef.current.scrollTo({ x: scrollToX, animated: true });
      }
    }
  }, [selectedIndex, selectedCategory, allTabs.length]);

  const handleCategoryPress = (categoryKey) => {
    onSelectCategory(categoryKey);
  };

  const CategoryItem = ({ item, isSelected }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleCategoryPress(item.key)}
        style={[tw`items-center justify-center`, { width: ITEM_WIDTH }]}
      >
        <View
          style={[
            {
              width: sizes.categoryIconSize,
              height: sizes.categoryIconSize,
              borderRadius: sizes.categoryIconSize / 2,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
            },
            isSelected
              ? { borderWidth: 2, borderColor: '#FFFFFF' }
              : { borderWidth: 1, borderColor: 'rgba(156, 163, 175, 0.3)' },
          ]}
        >
          <Image
            source={item.isLocal ? item.icon : { uri: item.icon }}
            style={{
              width: sizes.categoryIconSize,
              height: sizes.categoryIconSize,
              borderRadius: sizes.categoryIconSize / 2,
              backgroundColor: 'transparent',
            }}
            resizeMode="contain"
            onError={(e) => {
              console.log("Category image error:", e.nativeEvent.error);
            }}
          />
        </View>

        <Text
          style={[
            fontStyles.body,
            {
              fontSize: sizes.categoryFontSize,
              textAlign: 'center',
              marginTop: 4,
              lineHeight: sizes.categoryFontSize + 2,
              paddingHorizontal: 4,
              fontWeight: isSelected ? "700" : "400",
              color: isSelected ? "#FFFFFF" : "#D1D5DB",
            },
          ]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[tw`relative`, { backgroundColor }]}>
      {/* Categories with reduced top padding */}
      <View style={tw`relative pt-3`}>
        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw`pb-2 px-4`}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {allTabs.map((tab, index) => (
            <CategoryItem
              key={tab.key}
              item={tab}
              isSelected={selectedCategory === tab.key}
            />
          ))}
        </Animated.ScrollView>
      </View>

      {/* Animated white indicator bar - ABOVE the separator line with rounded top */}
      <View
        style={[
          tw`w-full relative`,
          {
            height: 3,
            backgroundColor: backgroundColor,
          }
        ]}
      >
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            height: 3,
            width: INDICATOR_WIDTH,
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 3,
            borderTopRightRadius: 3,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            transform: [
              {
                translateX: Animated.add(
                  Animated.subtract(selectionX, scrollX),
                  Animated.add(
                    16,
                    (ITEM_WIDTH - INDICATOR_WIDTH) / 2
                  )
                ),
              },
            ],
          }}
        />
      </View>

      {/* White separator line between indicator and banner */}
      <View
        style={[
          tw`w-full`,
          {
            height: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          }
        ]}
      />
    </View>
  );
};

export default function HomeScreen({ navigation }) {
  const [searchText, setSearchText] = useState("");
  const [currentLocation, setCurrentLocation] = useState("Getting location...");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [communityPicks, setCommunityPicks] = useState([]);
  const [communityPicksLoading, setCommunityPicksLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Category tabs state
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Search animation states
  const [isSearchAnimating, setIsSearchAnimating] = useState(false);
  const searchBarAnim = useRef(new Animated.Value(0)).current;

  // Refs
  const communityPicksRef = useRef(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Address Sheet State
  const [showAddressSheet, setShowAddressSheet] = useState(false);
  const [showCreateAddressModal, setShowCreateAddressModal] = useState(false);
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);
  const [autoFocusAddressModal, setAutoFocusAddressModal] = useState(false);
  const [editAddressData, setEditAddressData] = useState(null);

  const isFocused = useIsFocused();

  // Mic states
  const [isListening, setIsListening] = useState(false);
  const [micStatus, setMicStatus] = useState("idle");
  const [micColor, setMicColor] = useState("#333");

  // State to track StatusBar style based on scroll position
  const [isScrolledToWhite, setIsScrolledToWhite] = useState(false);

  // Animated value for smooth background color transition
  const statusBarBgAnim = useRef(new Animated.Value(0)).current;

  // Back to Top State & Ref
  const mainScrollViewRef = useRef(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [scrollThreshold, setScrollThreshold] = useState(2000); // Default high threshold

  // Scroll position preservation
  const savedScrollPosition = useRef(0);
  const isRestoringScroll = useRef(false);

  //   ADD: Get responsive sizes
  const sizes = getResponsiveSizes();

  // useFocusEffect for StatusBar updates (depends on scroll state)
  useFocusEffect(
    React.useCallback(() => {
      // Set initial StatusBar based on scroll position
      if (isScrolledToWhite) {
        StatusBar.setBarStyle('dark-content', true);
        if (Platform.OS === 'android') {
          StatusBar.setBackgroundColor(WHITE_BG_COLOR, true);
        }
      } else {
        StatusBar.setBarStyle('light-content', true);
        if (Platform.OS === 'android') {
          StatusBar.setBackgroundColor(BANNER_BG_COLOR, true);
        }
      }
    }, [isScrolledToWhite])
  );

  // Separate useFocusEffect for scroll position restoration (runs only on focus)
  useFocusEffect(
    React.useCallback(() => {
      // Restore scroll position after content is rendered
      const restoreTimer = setTimeout(() => {
        if (mainScrollViewRef.current && savedScrollPosition.current > 0 && !isRestoringScroll.current) {
          isRestoringScroll.current = true;
          mainScrollViewRef.current.scrollTo({
            y: savedScrollPosition.current,
            animated: false
          });
          // Reset flag after restoration
          setTimeout(() => {
            isRestoringScroll.current = false;
          }, 100);
        }
      }, 100);

      return () => {
        clearTimeout(restoreTimer);
      };
    }, []) // Empty dependency array - only runs on focus/blur
  );

  // Ref for Infinite Scroll in HighStandards
  const highStandardsRef = useRef(null);

  //   UPDATED: Handle scroll with responsive threshold & Back to Top visibility
  const handleScroll = (event) => {
    const { nativeEvent } = event;
    const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
    const offsetY = contentOffset.y;

    // Save current scroll position for restoration
    savedScrollPosition.current = offsetY;

    // Show/Hide Back to Top Button (use dynamic threshold)
    if (offsetY > scrollThreshold) {
      setShowBackToTop(true);
    } else {
      setShowBackToTop(false);
    }

    // Check if white content is visible (banner is scrolling out)
    if (offsetY > sizes.scrollThreshold && !isScrolledToWhite) {
      setIsScrolledToWhite(true);
      StatusBar.setBarStyle('dark-content', true);

      // Smooth background color transition for Android
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(WHITE_BG_COLOR, true);
      }

      Animated.timing(statusBarBgAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();

    } else if (offsetY <= sizes.scrollThreshold && isScrolledToWhite) {
      setIsScrolledToWhite(false);
      StatusBar.setBarStyle('light-content', true);

      // Smooth background color transition for Android
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(BANNER_BG_COLOR, true);
      }

      Animated.timing(statusBarBgAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }

    //   Infinite Scroll Detection
    // If we are close to the bottom of the scroll view, trigger loadMore
    const paddingToBottom = 100; // Trigger when 100px from bottom
    if (layoutMeasurement.height + offsetY >= contentSize.height - paddingToBottom) {
      if (highStandardsRef.current) {
        highStandardsRef.current.loadMore();
      }
    }

    if (highStandardsRef.current?.updateScrollMetrics) {
      highStandardsRef.current.updateScrollMetrics({
        offsetY,
        viewportHeight: layoutMeasurement.height,
      });
    }
  };

  // Fetch categories with timeout and fallback
  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const response = await Promise.race([
        authService.getCategories(),
        timeoutPromise
      ]);

      if (response && response.data) {
        setCategories(response.data);
        console.log("Categories fetched successfully:", response.data.length);
      }
    } catch (error) {
      console.error(" Error fetching categories:", error.message);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Handle category selection with navigation
  const handleCategorySelect = (categoryKey) => {
    console.log(" Category tapped:", categoryKey);

    setSelectedCategory(categoryKey);

    if (categoryKey === "all") {
      console.log("'All' selected - staying on home screen");
      return;
    }

    const selectedCat = categories.find(cat => {
      const catId = cat.id || cat._id;
      return catId === categoryKey;
    });

    console.log("  Selected category details:", {
      categoryKey,
      categoryName: selectedCat?.name,
      selectedCat
    });

    navigation.navigate("SeeMoreButton", {
      selectedCategory: categoryKey,
      categoryId: categoryKey,
      categoryName: selectedCat?.name || "Products",
      from: "HomeScreen",
    });

    console.log("  Navigating to SeeMoreButton with params:", {
      selectedCategory: categoryKey,
      categoryId: categoryKey,
      categoryName: selectedCat?.name,
      from: "HomeScreen"
    });
  };

  // Refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);

    setTimeout(() => {
      setRefreshing(false);
    }, 2000);

    Promise.all([
      getCurrentLocation(),
      loadUserData(false),
      fetchCommunityPicks(false),
      fetchCategories(),
    ]).catch((error) => {
      console.error("Error silently refreshing home screen:", error);
    });
  };

  // Search animation function
  const handleSearchFocus = () => {
    setIsSearchAnimating(true);

    Animated.timing(searchBarAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      navigation.navigate("SearchScreen", { searchText });
      setTimeout(() => {
        setIsSearchAnimating(false);
        searchBarAnim.setValue(0);
      }, 100);
    });
  };

  // Fetch Community Picks
  const fetchCommunityPicks = async (showLoading = true) => {
    try {
      if (showLoading) setCommunityPicksLoading(true);
      const response = await authService.getCommunities();
      if (response && response.data && response.data.length > 0) {
        const firstCommunity = response.data[0];
        if (firstCommunity.products && Array.isArray(firstCommunity.products) && firstCommunity.products.length > 0) {
          const communityProducts = firstCommunity.products.slice(0, 3);
          setCommunityPicks(communityProducts);
        } else {
          setCommunityPicks([]);
        }
      } else {
        setCommunityPicks([]);
      }
    } catch (error) {
      console.error("Error fetching community picks:", error);
      setCommunityPicks([]);
    } finally {
      setCommunityPicksLoading(false);
    }
  };

  const handleSeeMoreIngredients = () => {
    navigation.navigate("ProductsByIngredientsS", { fullScreen: true });
  };

  useEffect(() => {
    getCurrentLocation();
    loadUserData();
    fetchCommunityPicks();
    fetchCategories();
  }, []);

  // Reset selected category when coming back to home screen
  useEffect(() => {
    if (isFocused) {
      setSelectedCategory("all");
      // Reset scroll state when returning to home
      setIsScrolledToWhite(false);
      statusBarBgAnim.setValue(0);
    }
  }, [isFocused]);

  useEffect(() => {
    try {
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;
    } catch (e) {
      console.error("Voice initialization error:", e);
    }

    return () => {
      try {
        Voice.destroy().then(Voice.removeAllListeners);
      } catch (e) {
        console.error("Voice destruction error:", e);
      }
    };
  }, []);

  const onSpeechStart = (e) => {
    setMicStatus("listening");
    setMicColor("#FF6B6B");
  };

  const onSpeechEnd = (e) => {
    setIsListening(false);
    setMicStatus("idle");
    setMicColor("#333");
  };

  const onSpeechResults = (e) => {
    if (e.value && e.value.length > 0) {
      setSearchText(e.value[0]);
    }
  };

  const onSpeechError = (e) => {
    console.error("Speech recognition error:", e);
    setIsListening(false);
    setMicStatus("idle");
    setMicColor("#333");
  };

  const startListening = async () => {
    try {
      if (Constants.executionEnvironment === "storeClient") {
        Alert.alert(
          "Expo Go Detected",
          "Voice recognition does not work in Expo Go. Please use the Development Build (APK) generated by 'npx expo run:android'.",
          [{ text: "OK" }]
        );
        return;
      }

      setIsListening(true);
      setMicStatus("initializing");
      setMicColor("#6B9080");

      if (!Voice) {
        throw new Error("Voice module not initialized");
      }

      await Voice.start("en-US");
    } catch (error) {
      console.error("Error starting voice recognition:", error);
      setIsListening(false);
      setMicStatus("idle");
      setMicColor("#333");

      let errorMessage = "Could not start voice recognition.";
      if (error.message && error.message.includes("null")) {
        errorMessage =
          "Voice module missing. Please rebuild the app using 'npx expo run:android'.";
      }

      Alert.alert("Voice Search Unavailable", errorMessage, [{ text: "OK" }]);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
      setMicStatus("idle");
      setMicColor("#333");
    } catch (error) {
      console.error("Error stopping voice recognition:", error);
    }
  };

  const handleMicPress = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const getPlaceholderText = () => {
    switch (micStatus) {
      case "initializing":
        return "Initialising...";
      case "speak":
        return "Speak now";
      case "listening":
        return "Listening...";
      default:
        return 'Search "Meal"';
    }
  };

  const getMicIcon = () => {
    if (isListening) {
      return "mic";
    }
    return "mic-outline";
  };

  const loadUserData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      try {
        const response = await authService.getCurrentUser();
        if (response && response.data) {
          setUser(response.data);
          await AsyncStorage.setItem("user", JSON.stringify(response.data));
        }
      } catch (apiError) {
        console.log("API user fetch failed, using stored data");
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      // 1. Check if user has a manually selected address saved
      const savedAddress = await AsyncStorage.getItem("selectedAddress");
      if (savedAddress) {
        const address = JSON.parse(savedAddress);
        // Format the address for display
        // Format the address for display: Type - [Field1], [Field2]
        let rawParts = [];
        if (address.houseNumber) rawParts.push(address.houseNumber);
        if (address.addressLine) rawParts.push(...address.addressLine.split(',').map(s => s.trim()));
        if (address.city) rawParts.push(address.city);

        const displayParts = rawParts.filter(Boolean).slice(0, 2);
        const addressText = displayParts.join(", ");
        const typeLabel = address.type || "Loc";
        const finalDisplay = `${typeLabel} - ${addressText}`;

        setCurrentLocation(finalDisplay);
        console.log("  Using saved default address:", formattedParams);
        return;
      }

      // 2. Otherwise fetch live location
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setCurrentLocation("Permission denied");
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      let address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      if (address && address.length > 0) {
        const { street, city, district, region } = address[0];
        // Format to match Saved Address style: Type - Short Address
        const displayParts = [street, district || city].filter(Boolean).slice(0, 2);
        const addressText = displayParts.join(", ");
        const finalDisplay = `Current Location - ${addressText}`;

        setCurrentLocation(finalDisplay || "Location not found");
      } else {
        setCurrentLocation("Location not found");
      }
    } catch (error) {
      console.log("Error getting location:", error);
      setCurrentLocation("H block, sector 63, Meerut");
    }
  };

  const handleProfilePress = () => {
    navigation.navigate("ProfileTab");
  };

  const handleAddressSelect = async (address) => {
    console.log("Selected Address:", address);
    setShowAddressSheet(false);

    if (address.type === 'current' || address.isCurrentLocation) {
      // User Chose "Current Location" explicitly -> Clear saved default and fetch live
      await AsyncStorage.removeItem("selectedAddress");
      getCurrentLocation();
    } else {
      // User Chose a Saved Address -> Save as default and update UI
      await AsyncStorage.setItem("selectedAddress", JSON.stringify(address));

      // Also Set as Primary on Backend so the tag shows up
      try {
        if (address.id) {
          await setPrimaryAddress(address.id);
        }
      } catch (err) {
        console.log("Failed to set primary on backend", err);
      }

      let rawParts = [];
      if (address.houseNumber) rawParts.push(address.houseNumber);
      if (address.addressLine) rawParts.push(...address.addressLine.split(',').map(s => s.trim()));
      if (address.city) rawParts.push(address.city);

      const displayParts = rawParts.filter(Boolean).slice(0, 2);
      const addressText = displayParts.join(", ");
      const typeLabel = address.type || "Loc"; // Fallback to Loc if type missing
      const finalDisplay = `${typeLabel} - ${addressText}`;

      setCurrentLocation(finalDisplay);
    }
  };


  const handleAddNewAddress = (options = {}) => {
    console.log("Add new address clicked", options);
    setShowAddressSheet(false);
    setEditAddressData(null);
    setAutoFocusAddressModal(options?.autoFocus || false);
    setShowCreateAddressModal(true);
  };

  const handleEditAddress = (address) => {
    console.log("Edit address clicked", address);
    setShowAddressSheet(false);
    setEditAddressData(address);
    setAutoFocusAddressModal(false);
    setShowCreateAddressModal(true);
  };

  const handleCreateAddress = async (formData) => {
    try {
      setIsSubmittingAddress(true);
      if (editAddressData) {
        await updateAddress(editAddressData.id, formData);
        Alert.alert("Success", "Address updated successfully!");
      } else {
        await createAddress(formData);
        Alert.alert("Success", "Address added successfully!");
      }
      setShowCreateAddressModal(false);
      setEditAddressData(null);
    } catch (error) {
      console.error("Error saving address:", error);
      Alert.alert("Error", error?.response?.data?.message || "Failed to save address");
    } finally {
      setIsSubmittingAddress(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white justify-center items-center`}>
        <ActivityIndicator size="small" color="#6B9080" />
        <Text style={[fontStyles.body, tw`text-gray-600 text-xs mt-2`]}>
          Loading...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[
        tw`flex-1`,
        {
          backgroundColor: isScrolledToWhite ? WHITE_BG_COLOR : BANNER_BG_COLOR
        }
      ]}
    >
      <ScrollView
        ref={mainScrollViewRef}
        showsVerticalScrollIndicator={false}
        style={tw`flex-1`}
        stickyHeaderIndices={selectedCategory === "all" ? [4] : []}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6A8B78"]}
          />
        }
      >
        {/*   UPDATED: Header Section with responsive sizing */}
        <View style={[{ backgroundColor: BANNER_BG_COLOR, paddingHorizontal: sizes.headerPadding, paddingTop: 4 }]}>
          <View style={tw`flex-row justify-between items-start`}>
            <View style={tw`flex-1 flex-row`}>
              <Image
                source={Logo}
                style={{
                  width: sizes.logoSize,
                  height: sizes.logoSize,
                  borderRadius: sizes.logoSize / 2,
                  marginRight: 8,
                }}
                resizeMode="contain"
              />

              <View style={tw`flex-1`}>
                <TouchableOpacity
                  onPress={() => setShowAddressSheet(true)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      fontStyles.headingItalic,
                      {
                        fontSize: sizes.greetingFontSize,
                        color: '#FFFFFF',
                      }
                    ]}
                  >
                    Good Morning, {user?.name ? user.name.trim().split(" ")[0] : ""}
                  </Text>

                  <View style={tw`flex-row items-center mt-0 pr-4`}>
                    <Ionicons name="location-outline" size={sizes.locationIconSize} color="#FFFFFF" />
                    <Text
                      style={[
                        fontStyles.body,
                        {
                          fontSize: sizes.locationFontSize,
                          marginLeft: 4,
                          color: '#FFFFFF',
                          flexShrink: 1,
                        }
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {currentLocation}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#FFFFFF" style={tw`ml-1`} />
                  </View>
                </TouchableOpacity>

                <Animated.View
                  style={[
                    tw`mt-2.5`,
                    {
                      transform: [
                        {
                          translateY: searchBarAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -300],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity onPress={handleSearchFocus} activeOpacity={0.7}>
                    <View
                      style={{
                        width: sizes.searchBarWidth,
                        height: sizes.searchBarHeight,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderRadius: 12,
                        borderWidth: 0.2,
                        borderColor: "#CFCFCF",
                        paddingVertical: 10,
                        paddingHorizontal: 15,
                        backgroundColor: "#F4F4F4",
                        alignSelf: "center",
                      }}
                    >
                      <Ionicons name="search-outline" size={sizes.searchIconSize} color="#666" />

                      <Text
                        style={[
                          fontStyles.body,
                          {
                            flex: 1,
                            color: '#6B7280',
                            fontSize: sizes.searchFontSize,
                            marginLeft: 8,
                            marginRight: 8,
                          }
                        ]}
                        numberOfLines={1}
                      >
                        {getPlaceholderText()}
                      </Text>

                      {searchText.length > 0 ? (
                        <TouchableOpacity onPress={() => setSearchText("")}>
                          <Ionicons name="close-circle" size={18} color="#666" />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity onPress={handleMicPress}>
                          <Ionicons name={getMicIcon()} size={18} color={micColor} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>

            <TouchableOpacity onPress={handleProfilePress}>
              <View
                style={{
                  width: sizes.profileSize,
                  height: sizes.profileSize,
                  borderRadius: sizes.profileSize / 2,
                  backgroundColor: '#E5E7EB',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: 8,
                }}
              >
                {user?.profileImage ? (
                  <Image
                    source={{ uri: user.profileImage }}
                    style={{
                      width: sizes.profileSize - 8,
                      height: sizes.profileSize - 8,
                      borderRadius: (sizes.profileSize - 8) / 2,
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person-outline" size={sizes.profileIconSize} color="#666" />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>


        {/*   UPDATED: Category Filter Tabs with responsive sizing */}
        {categoriesLoading ? (
          <View style={[tw`justify-center items-center`, { backgroundColor: BANNER_BG_COLOR }]}>
            <HomeCategorySkeleton />
          </View>
        ) : (
          <View>
            <CategoryTabs
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={handleCategorySelect}
              backgroundColor={BANNER_BG_COLOR}
              sizes={sizes}
            />
          </View>
        )}

        {/*   UPDATED: Banner with responsive height */}
        <View style={{ width: '100%', backgroundColor: BANNER_BG_COLOR }}>
          <Image
            source={BannerImage}
            style={{
              width: '100%',
              height: sizes.bannerHeight,
            }}
            resizeMode="cover"
          />
        </View>

        {/* Rest of the content with white background */}
        {selectedCategory === "all" ? (
          <>
            <View style={{ backgroundColor: '#FFFFFF' }}>
              <ChooseYourFuel />

              <ProductsByIngredients
                onSeeMore={handleSeeMoreIngredients}
                navigation={navigation}
                refreshTrigger={refreshTrigger}
              />

              <BrowseByKitchen refreshTrigger={refreshTrigger} />

              <CuratedCollections />

              <CommunityPicks
                communityPicks={communityPicks}
                communityPicksLoading={communityPicksLoading}
                communityPicksRef={communityPicksRef}
              />

              <ConsultWithExpert />

              <SubscriptionBanner navigation={navigation} />

              <SmartPeopleSection />

              <GoodbellyScoop />
            </View>

            {/* Sticky Header Index [4] */}
            <View
              style={[tw`px-4 py-4 bg-white`, { marginTop: 0 }]}
              onLayout={(event) => {
                const layout = event.nativeEvent.layout;
                // threshold = header global Y position + height of 10 items (approx 1600)
                setScrollThreshold(layout.y + 1600);
              }}
            >
              <Text style={[fontStyles.headingItalic, tw`text-base font-semibold text-gray-900`]}>
                Recommended for You
              </Text>
            </View>

            <View style={{ backgroundColor: '#FFFFFF' }}>
              <HighStandards ref={highStandardsRef} hideHeader={true} />
            </View>
          </>
        ) : (
          <View style={{ backgroundColor: '#FFFFFF', minHeight: 300 }}>
            {/* Placeholder for other categories if implemented later */}
          </View>
        )}
      </ScrollView>

      {/* Back to Top Button */}
      {showBackToTop && (
        <TouchableOpacity
          style={tw`absolute bottom-12 self-center z-50 bg-black/80 px-4 py-2 rounded-full flex-row items-center border border-white/20`}
          onPress={() => mainScrollViewRef.current?.scrollTo({ y: 0, animated: true })}
          activeOpacity={0.8}
        >
          <Text style={tw`text-white text-xs font-bold mr-2 uppercase`}>Back to top</Text>
          <Ionicons name="arrow-up" size={16} color="white" />
        </TouchableOpacity>
      )}

      {/* Address Selection Sheet */}
      <AddressSelectionSheet
        visible={showAddressSheet}
        onClose={() => setShowAddressSheet(false)}
        onSelectAddress={handleAddressSelect}
        onAddNewAddress={handleAddNewAddress}
        onEditAddress={handleEditAddress}
      />

      {/* Create Address Modal */}
      {showCreateAddressModal && (
        <CreateAddressModal
          onClose={() => {
            setShowCreateAddressModal(false);
            setEditAddressData(null);
          }}
          onSubmit={handleCreateAddress}
          currentLocation={null}
          isSubmitting={isSubmittingAddress}
          autoFocus={autoFocusAddressModal}
          editAddress={editAddressData}
        />
      )}
    </SafeAreaView>
  );
}
