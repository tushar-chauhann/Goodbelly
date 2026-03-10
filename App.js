import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { Linking } from "react-native";
import AppNavigator from "./src/navigation/AppNavigator";
import { Provider } from "react-redux";
import { store } from "./src/redux/store";
import { SafeAreaProvider } from "react-native-safe-area-context";

import * as NavigationBar from "expo-navigation-bar";
import { Platform } from "react-native";

import { navigationRef } from "./src/utils/navigationRef";
import { initNotifications } from "./src/services/notificationService";

export default function App() {
  useEffect(() => {
    // Android Navigation Bar Configuration
    if (Platform.OS === "android") {
      const configureNavBar = async () => {
        try {
          await NavigationBar.setBackgroundColorAsync("white");
          await NavigationBar.setButtonStyleAsync("dark");
        } catch (error) {
          console.log("Navigation Bar config error:", error);
        }
      };
      configureNavBar();
    }

    // Initialize Notifications
    initNotifications();

    const handleDeepLink = (url) => {
      console.log("Deep link received:", url);
      if (url.includes("goodbelly://payment/success")) {
        console.log("Payment successful via deep link");
        // Handle successful payment - you might want to navigate to a success screen
        // or show a global alert. Since this is in App.js, you'll need to use
        // a different approach to communicate with your ConsultProfile component
      } else if (url.includes("goodbelly://payment/failure")) {
        console.log("Payment failed via deep link");
        // Handle failed payment
      }
    };

    // Listen for incoming links
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    // Check if app was opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    return () => subscription.remove();
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}
