// app.config.js
import 'dotenv/config';

export default {
  expo: {
    name: "GoodBelly",
    slug: "goodbelly",
    scheme: "goodbelly",
    version: "1.0.4",
    orientation: "portrait",
    icon: "./assets/adaptive-icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.goodbelly.app",
      infoPlist: {
        "NSAppTransportSecurity": {
          "NSAllowsArbitraryLoads": true
        },
        "NSLocationWhenInUseUsageDescription": "Allow GoodBelly to access your location",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Allow GoodBelly to access your location",
        "NSLocationAlwaysUsageDescription": "Allow GoodBelly to access your location"
      }
    },
    android: {
      usesCleartextTraffic: true,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.goodbelly.app",
      permissions: [
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.VIBRATE",
        "android.permission.RECORD_AUDIO"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-font",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow GoodBelly to use your location."
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow GoodBelly to access your photos to update your profile picture.",
          "cameraPermission": "Allow GoodBelly to access your camera to take profile pictures."
        }
      ],
      [
        "@react-native-voice/voice",
        {
          "microphonePermission": "Allow GoodBelly to access your microphone."
        }
      ]
    ],
    extra: {
      apiBaseUrl: process.env.API_BASE_URL?.replace(/\/$/, "")?.endsWith("/api/v1")
        ? process.env.API_BASE_URL
        : `${process.env.API_BASE_URL?.replace(/\/$/, "")}/api/v1`,

      yourApiBaseUrl: process.env.YOUR_API_BASE_URL?.replace(/\/$/, "")?.endsWith("/api/v1")
        ? process.env.YOUR_API_BASE_URL
        : `${process.env.YOUR_API_BASE_URL?.replace(/\/$/, "")}/api/v1`,

      payuActionUrl: process.env.EXPO_PUBLIC_PAYU_ACTION_URL || process.env.PAYU_ACTION_URL,
      payuMerchantKey: process.env.EXPO_PUBLIC_PAYU_MERCHANT_KEY || process.env.PAYU_MERCHANT_KEY,
      payuSuccessUrl: process.env.EXPO_PUBLIC_PAYU_SUCCESS_URL || process.env.PAYU_SUCCESS_URL,
      payuFailureUrl: process.env.EXPO_PUBLIC_PAYU_FAILURE_URL || process.env.PAYU_FAILURE_URL,
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY,
      googleMapsMapId: process.env.EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID || process.env.GOOGLE_MAPS_MAP_ID,
    }
  }
};
