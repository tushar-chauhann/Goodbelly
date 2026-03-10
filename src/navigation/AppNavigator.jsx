import React, { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { useDispatch } from "react-redux";
import { hydrateUser, fetchWishlist as fetchWishlistRedux, fetchIngredientsRedux, fetchOccasionsRedux, fetchCategoriesRedux } from "../redux/slicer";

import {
  Fraunces_300Light,
  Fraunces_400Regular,
  Fraunces_700Bold,
  Fraunces_900Black,
  Fraunces_300Light_Italic,
  Fraunces_400Regular_Italic,
  Fraunces_700Bold_Italic,
  Fraunces_900Black_Italic,
} from "@expo-google-fonts/fraunces";

// ==================== AUTH & SPLASH ====================
import Splashscreen from "../views/screens/Splashscreen";
import Login from "../views/Auth/Login";
import Signup from "../views/Auth/Signup";
import Otp from "../views/Auth/Otp";
import ForgotPassword from "../views/Auth/ForgotPassword";
import VerifyOTP from "../views/Auth/VerifyOTP";
import ResetPassword from "../views/Auth/ResetPassword";
import ConsultantLogin from "../views/Auth/ConsultantLogin";

// ==================== MAIN TABS ====================
import TabNavigator from "./TabNavigator";

// ==================== CART & CHECKOUT ====================
import CartScreen from "../views/screens/CartScreen";
import CheckoutScreen from "../views/screens/CheckoutScreen";

// ==================== PAYMENT FLOW ====================
import PayUWebViewScreen from "../views/screens/PayUWebViewScreen";
import InAppWebViewScreen from "../components/order/InAppWebViewScreen";
import OrderStatusScreen from "../components/order/OrderStatusScreen"; // 🆕 NEW - Polling screen
import OrderSuccessScreen from "../components/order/OrderSuccessScreen"; //   Success/Failure display

// ==================== ORDER ====================
import OrderDetailsScreen from "../components/order/OrderDetailsScreen";

// ==================== OTHER SCREENS ====================
import AddressScreen from "../views/screens/AddressScreen";
import FavoritesScreen from "../views/screens/FavoritesScreen";
import Consultations from "../views/screens/Consultations";
import ConsultProfile from "../components/Consultant/ConsultProfile";
import ConsultantRegisterScreen from "../components/Consultant/ConsultantRegisterScreen";
import SearchScreen from "../components/home/SearchScreen";
import SubscriptionScreen from "../views/screens/SubscriptionScreen";
import NewSubscriptionScreen from "../views/screens/NewSubscriptionScreen";
import KitchensScreen from "../components/Kitchen/KitchensScreen";
import KitchenDetailsScreen from "../components/Kitchen/KitchenDetailsScreen";
import KitchenMenuScreen from "../components/Kitchen/KitchenMenuScreen";
import Product from "../components/ProductDetails";
import SeeMoreButton from "../components/home/SeeMoreButton";
import AboutUsScreen from "../components/AboutUsScreen";
import PrivacyPolicyScreen from "../components/PrivacyPolicyScreen";
import MacroTrackingScreen from "../components/profile/MacroTrackingScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const dispatch = useDispatch();

  // Load fonts
  const [fontsLoaded] = useFonts({
    "Fraunces-Light": Fraunces_300Light,
    "Fraunces-Regular": Fraunces_400Regular,
    "Fraunces-Bold": Fraunces_700Bold,
    "Fraunces-Black": Fraunces_900Black,
    "Fraunces-Light-Italic": Fraunces_300Light_Italic,
    "Fraunces-Regular-Italic": Fraunces_400Regular_Italic,
    "Fraunces-Bold-Italic": Fraunces_700Bold_Italic,
    "Fraunces-Black-Italic": Fraunces_900Black_Italic,
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      setIsAuthenticated(!!token);

      // Hydrate Redux state
      if (token) {
        await dispatch(hydrateUser()).unwrap();
        // Also hydrate wishlist and ingredients immediately for all screens
        dispatch(fetchWishlistRedux(true));
        dispatch(fetchIngredientsRedux(true));
        dispatch(fetchOccasionsRedux(true));
        dispatch(fetchCategoriesRedux(true));
      } else {
        // Fetch public data for logged-out users
        dispatch(fetchIngredientsRedux(true));
        dispatch(fetchOccasionsRedux(true));
        dispatch(fetchCategoriesRedux(true));
      }
    } catch (e) {
      console.log("Auth hydration error", e);
    } finally {
      setTimeout(() => setIsLoading(false), 1500);
    }
  };

  if (isLoading || !fontsLoaded) return <Splashscreen />;

  return (
    <Stack.Navigator
      initialRouteName={isAuthenticated ? "HomeScreen" : "Login"}
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      {/* ==================== AUTH SCREENS ==================== */}
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Signup" component={Signup} />
      <Stack.Screen name="Otp" component={Otp} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      <Stack.Screen name="VerifyOTP" component={VerifyOTP} />
      <Stack.Screen name="ResetPassword" component={ResetPassword} />
      <Stack.Screen name="ConsultantLogin" component={ConsultantLogin} />

      {/* ==================== HOME SCREEN ==================== */}
      <Stack.Screen
        name="HomeScreen"
        component={TabNavigator}
        options={{ gestureEnabled: false }}
      />

      {/* ==================== CART & CHECKOUT ==================== */}
      <Stack.Screen name="CartScreen" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />

      {/* ==================== PAYMENT FLOW ==================== */}

      {/*  STEP 1: PayU WebView - Handles payment gateway */}
      <Stack.Screen
        name="PayUWebView"
        component={PayUWebViewScreen}
        options={{
          headerShown: false,
          presentation: "modal",
          gestureEnabled: false,
          animation: "slide_from_bottom",
        }}
      />

      {/*    STEP 2: Order Status - Polling screen (polls backend for 2 mins) */}
      <Stack.Screen
        name="OrderStatus"
        component={OrderStatusScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: "fade",
        }}
      />

      {/* Alias for older screen name usage (some screens call OrderStatusScreen) */}
      <Stack.Screen
        name="OrderStatusScreen"
        component={OrderStatusScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: "fade",
        }}
      />

      {/*    STEP 3: Order Success - Final success/failure display */}
      <Stack.Screen
        name="OrderSuccess"
        component={OrderSuccessScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: "fade",
        }}
      />

      {/* Alias for older screen name usage (some screens call OrderSuccessScreen) */}
      <Stack.Screen
        name="OrderSuccessScreen"
        component={OrderSuccessScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: "fade",
        }}
      />

      {/* ==================== ORDER DETAILS ==================== */}
      <Stack.Screen
        name="OrderDetails"
        component={OrderDetailsScreen}
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />

      {/* In-app webview for tracking / links */}
      <Stack.Screen
        name="InAppWebView"
        component={InAppWebViewScreen}
        options={{ headerShown: false, presentation: "modal" }}
      />

      {/* ==================== SEARCH ==================== */}
      <Stack.Screen
        name="SearchScreen"
        component={SearchScreen}
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />

      {/* ==================== CONSULTATIONS ==================== */}
      <Stack.Screen name="Consultations" component={Consultations} />
      <Stack.Screen name="ConsultProfile" component={ConsultProfile} />
      <Stack.Screen name="ConsultantRegister" component={ConsultantRegisterScreen} />

      {/* ==================== PRODUCTS ==================== */}
      <Stack.Screen name="SeeMoreButton" component={SeeMoreButton} />
      <Stack.Screen name="ProductDetails" component={Product} />

      {/* ==================== SUBSCRIPTIONS ==================== */}
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="NewSubscription" component={NewSubscriptionScreen} />

      {/* ==================== KITCHEN ==================== */}
      <Stack.Screen name="Kitchens" component={KitchensScreen} />
      <Stack.Screen name="KitchenDetails" component={KitchenDetailsScreen} />
      <Stack.Screen name="KitchenMenu" component={KitchenMenuScreen} />

      {/* ==================== ADDRESS ==================== */}
      <Stack.Screen name="Address" component={AddressScreen} />

      {/* ==================== FAVORITES ==================== */}
      <Stack.Screen name="Favorites" component={FavoritesScreen} />

      <Stack.Screen name="AboutUs" component={AboutUsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />

      {/* ==================== MACRO TRACKING ==================== */}
      <Stack.Screen name="MacroTracking" component={MacroTrackingScreen} />
    </Stack.Navigator>
  );
}
