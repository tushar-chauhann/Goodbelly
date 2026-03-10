import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons as Icon } from "@expo/vector-icons";
import {
  useNavigation,
  CommonActions,
  useFocusEffect,
} from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import tw from "twrnc";
import { authService } from "../../services/authService.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fontStyles } from "../../utils/fontStyles";
import CustomPopup from "../../components/CustomPopup"; // Import CustomPopup

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // CustomPopup states
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("info");
  const [popupShowCancel, setPopupShowCancel] = useState(false);
  const [popupCancelText, setPopupCancelText] = useState("Cancel");
  const [popupConfirmText, setPopupConfirmText] = useState("OK");
  const [popupOnConfirm, setPopupOnConfirm] = useState(null);
  const [popupOnCancel, setPopupOnCancel] = useState(null);

  const menuItems = [
    {
      id: "1",
      title: "Profile",
      icon: "person-outline",
      screen: "ProfileCard",
    },
    { id: "2", title: "My Orders", icon: "receipt-outline", screen: "Orders" },
    { id: "3", title: "Address", icon: "location-outline", screen: "Address" },
    { id: "4", title: "Favorites", icon: "heart-outline", screen: "Favorites" },
    {
      id: "5",
      title: "Subscriptions",
      icon: "card-outline",
      screen: "Subscription",
    },
    {
      id: "6",
      title: "Support",
      icon: "help-circle-outline",
      action: "support",
    },
    {
      id: "7",
      title: "About Us",
      icon: "information-circle-outline",
      screen: "AboutUs", // Changed from action to screen
    },
  ];

  // Function to show custom popup
  const showPopup = ({
    title,
    message,
    type = "info",
    showCancelButton = false,
    cancelText = "Cancel",
    confirmText = "OK",
    onConfirm = null,
    onCancel = null,
  }) => {
    setPopupTitle(title);
    setPopupMessage(message);
    setPopupType(type);
    setPopupShowCancel(showCancelButton);
    setPopupCancelText(cancelText);
    setPopupConfirmText(confirmText);
    setPopupOnConfirm(() => onConfirm);
    setPopupOnCancel(() => onCancel);
    setPopupVisible(true);
  };

  // Close popup
  const closePopup = () => {
    setPopupVisible(false);
  };

  // Handle popup confirm
  const handlePopupConfirm = () => {
    closePopup();
    if (popupOnConfirm) {
      popupOnConfirm();
    }
  };

  // Handle popup cancel
  const handlePopupCancel = () => {
    closePopup();
    if (popupOnCancel) {
      popupOnCancel();
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      setLoading(true);
      const storedUser = await authService.getStoredUser();
      if (storedUser) {
        setUser(storedUser);
      }

      try {
        const response = await authService.getCurrentUser();
        if (response?.data) {
          setUser(response.data);
          await AsyncStorage.setItem("user", JSON.stringify(response.data));
        }
      } catch (apiError) {
        console.log("API fetch failed, using stored data");
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      showPopup({
        title: "Error",
        message: "Failed to load profile data",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showPopup({
          title: "Permission Required",
          message:
            "Sorry, we need camera roll permissions to change your profile picture.",
          type: "info",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      showPopup({
        title: "Error",
        message: "Failed to pick image",
        type: "error",
      });
    }
  };

  const uploadProfileImage = async (imageUri) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("profileImage", {
        uri: imageUri,
        type: "image/jpeg",
        name: "profile-image.jpg",
      });

      const response = await authService.updateProfileImage(formData);
      if (response?.data) {
        const updatedUser = {
          ...user,
          profileImage: response.data.profileImage,
        };
        setUser(updatedUser);
        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
        showPopup({
          title: "Success",
          message: "Profile picture updated successfully!",
          type: "success",
        });
      }
    } catch (error) {
      console.error("Error uploading profile image:", error);
      showPopup({
        title: "Error",
        message: "Failed to update profile picture",
        type: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    showPopup({
      title: "Logout",
      message: "Are you sure you want to log out?",
      type: "warning",
      showCancelButton: true,
      cancelText: "No",
      confirmText: "Yes",
      onConfirm: performLogout,
    });
  };

  const performLogout = async () => {
    try {
      setLogoutLoading(true);
      await authService.logout();
      console.log("  Logout successful - Navigating to Login");

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      );

      // Show success message after navigation
      setTimeout(() => {
        showPopup({
          title: "Logged Out",
          message: "You have been successfully logged out.",
          type: "success",
        });
      }, 500);
    } catch (error) {
      console.error("Logout error:", error);
      try {
        await AsyncStorage.multiRemove(["accessToken", "user"]);
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Login" }],
          })
        );
      } catch (storageError) {
        showPopup({
          title: "Error",
          message: "Failed to logout. Please try again.",
          type: "error",
        });
      }
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleMenuItemPress = (item) => {
    if (item.action === "support") {
      showPopup({
        title: "Support",
        message: "Need help? Contact us at support@goodbelly.com",
        type: "info",
      });
      return;
    }

    if (item.screen) {
      navigation.navigate(item.screen);
    }
  };

  const renderMenuItem = ({ item }) => (
    <TouchableOpacity
      style={[
        tw`bg-white rounded-lg p-3 mb-2 mx-4 shadow-sm border border-gray-100`,
        tw`active:bg-gray-50 active:border-gray-200`,
      ]}
      activeOpacity={0.7}
      onPress={() => handleMenuItemPress(item)}
    >
      <View style={tw`flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center flex-1`}>
          <View
            style={tw`bg-gray-50 w-10 h-10 rounded-full justify-center items-center mr-3`}
          >
            <Icon name={item.icon} size={20} color="#4a5568" />
          </View>
          <Text
            style={[fontStyles.headingS, tw`text-gray-800 text-xs font-medium`]}
          >
            {item.title}
          </Text>
        </View>
        <Icon name="chevron-forward-outline" size={18} color="#a0aec0" />
      </View>
    </TouchableOpacity>
  );

  // Show loading state
  if (loading) {
    return (
      <View style={tw`flex-1 bg-white justify-center items-center`}>
        <ActivityIndicator size="large" color="#6A8B78" />
        <Text
          style={[fontStyles.headingItalic, tw`mt-4 text-gray-600 text-sm`]}
        >
          Loading profile...
        </Text>
      </View>
    );
  }

  // Default user data if none is available
  const displayUser = user || {
    name: "Guest User",
    email: "guest@goodbelly.com",
    phone: "+1 123 456 7890",
    profileImage: null,
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Custom Popup */}
      <CustomPopup
        visible={popupVisible}
        onClose={closePopup}
        title={popupTitle}
        message={popupMessage}
        type={popupType}
        showCancelButton={popupShowCancel}
        cancelText={popupCancelText}
        confirmText={popupConfirmText}
        onConfirm={handlePopupConfirm}
        onCancel={handlePopupCancel}
      />

      {/* Curved Header Section */}
      <View style={tw`bg-[#90a79b]`}>
        <SafeAreaView edges={["top"]}>
          <View style={tw`bg-[#7a9b8e] pt-4 pb-8`}>
            {/* White curved bottom */}
            <View style={tw`absolute -bottom-6 left-0 right-0 h-12`}>
              <View style={tw`bg-white h-12 rounded-t-3xl`} />
            </View>

            <View style={tw`px-4 z-10`}>
              <View style={tw`flex-row items-center`}>
                {/* Profile Image */}
                <View style={tw`mr-3 relative`}>
                  <View
                    style={tw`w-16 h-16 rounded-full bg-white shadow-sm justify-center items-center`}
                  >
                    {displayUser.profileImage ? (
                      <Image
                        source={{ uri: displayUser.profileImage }}
                        style={tw`w-14 h-14 rounded-full`}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={tw`w-14 h-14 rounded-full bg-gray-200 justify-center items-center`}
                      >
                        <Icon name="person" size={22} color="#6A8B78" />
                      </View>
                    )}

                    {/* Uploading overlay */}
                    {uploading && (
                      <View
                        style={tw`absolute inset-0 bg-black bg-opacity-50 rounded-full justify-center items-center`}
                      >
                        <ActivityIndicator size="small" color="white" />
                      </View>
                    )}
                  </View>

                  {/* Camera Icon */}
                  <TouchableOpacity
                    style={tw`absolute -bottom-1 -right-1 bg-[#7a9b8e] w-6 h-6 rounded-full border-2 border-white justify-center items-center`}
                    onPress={handleImagePick}
                    disabled={uploading}
                  >
                    <Icon name="camera" size={12} color="white" />
                  </TouchableOpacity>
                </View>

                {/* User Info - Vertical layout like image */}
                <View style={tw`flex-1`}>
                  <Text
                    style={[
                      fontStyles.headingItalic,
                      tw`text-white text-lg font-medium uppercase tracking-wider mb-1.5`,
                    ]}
                    numberOfLines={1}
                  >
                    {displayUser.name}
                  </Text>

                  {displayUser.phone && (
                    <View style={tw`flex-row items-center mb-0.1`}>
                      <Icon
                        name="call-outline"
                        size={14}
                        color="rgba(255,255,255,0.9)"
                      />
                      <Text
                        style={[
                          fontStyles.headingS,
                          tw`text-white opacity-90 text-xs ml-1`,
                        ]}
                        numberOfLines={1}
                      >
                        +91 {displayUser.phone}
                      </Text>
                    </View>
                  )}

                  <View style={tw`flex-row items-center`}>
                    <Icon
                      name="mail-outline"
                      size={14}
                      color="rgba(255,255,255,0.9)"
                    />
                    <Text
                      style={[
                        fontStyles.headingS,
                        tw`text-white opacity-90 text-xs ml-1 flex-1`,
                      ]}
                      numberOfLines={1}
                    >
                      {displayUser.email}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Menu Items Section */}
      <View style={tw`flex-1 mt-0`}>
        <View style={tw`mx-4 mb-1`}>
          <Text
            style={[
              fontStyles.headingItalic,
              tw`text-black-100 text-sm font-medium uppercase tracking-wider`,
            ]}
          >
            Account
          </Text>
        </View>

        <FlatList
          data={menuItems}
          renderItem={renderMenuItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`pb-4 mt-3`}
          ItemSeparatorComponent={() => <View style={tw`h-0.5`} />}
        />
      </View>

      {/* Logout Button */}
      <View style={tw`mx-4 mb-4`}>
        <TouchableOpacity
          style={[
            tw`bg-red-50 border border-red-100 rounded-lg items-center justify-center h-10 w-full`,
            logoutLoading && tw`opacity-50`,
          ]}
          activeOpacity={0.7}
          onPress={handleLogout}
          disabled={logoutLoading}
        >
          {logoutLoading ? (
            <View style={tw`flex-row items-center`}>
              <ActivityIndicator color="#ef4444" size="small" />
              <Text
                style={[
                  fontStyles.headingS,
                  tw`text-red-600 text-xs font-medium ml-2`,
                ]}
              >
                Logging out...
              </Text>
            </View>
          ) : (
            <View style={tw`flex-row items-center`}>
              <Icon
                name="log-out-outline"
                size={16}
                color="#ef4444"
                style={tw`mr-2`}
              />
              <Text
                style={[
                  fontStyles.headingS,
                  tw`text-red-600 text-xs font-medium`,
                ]}
              >
                Logout
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ProfileScreen;
