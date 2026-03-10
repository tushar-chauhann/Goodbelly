import { ToastAndroid, Platform, Alert } from "react-native";

export const toast = {
  success: (message) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      // For iOS, you might want to use a different toast library
      Alert.alert("Success", message);
    }
  },

  error: (message) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("Error", message);
    }
  },

  info: (message) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("Info", message);
    }
  },
};
