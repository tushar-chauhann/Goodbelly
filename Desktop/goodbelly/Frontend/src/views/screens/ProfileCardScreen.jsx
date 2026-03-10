import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Pressable,
  Alert,
  Modal,
  ActivityIndicator,
  StatusBar,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons as Icon } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "twrnc";
import { authService } from "../../services/authService.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fontStyles } from "../../utils/fontStyles";
import CustomPopup from "../../components/CustomPopup/CustomPopup";

const ProfileHeader = ({ navigation }) => (
  <View
    style={tw`flex-row items-center px-4 bg-white pt-3 pb-3 border-b border-gray-100`}
  >
    <TouchableOpacity
      onPress={() => navigation && navigation.goBack()}
      style={tw`p-2 -ml-2`}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Icon name="chevron-back" size={24} color="#4a5568" />
    </TouchableOpacity>
    <Text style={[fontStyles.headingS, tw`text-black ml-2`]}>Edit Profile</Text>
  </View>
);

const ProfileCardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState("veg"); // Changed default to "veg"
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Password change modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Custom Popup states
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showPasswordSuccessPopup, setShowPasswordSuccessPopup] =
    useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupTitle, setPopupTitle] = useState("");

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const storedUser = await authService.getStoredUser();
      if (storedUser) {
        setUser(storedUser);
        setName(storedUser.name || "");
        setPhone(storedUser.phone || "");
        // Map API preference values to display values
        if (storedUser.preference === "veg") {
          setTheme("veg");
        } else if (storedUser.preference === "non-veg") {
          setTheme("non-veg");
        } else {
          setTheme("veg"); // Default
        }
      }

      // Fetch fresh data from API
      try {
        const response = await authService.getCurrentUser();
        if (response?.data) {
          setUser(response.data);
          setName(response.data.name || "");
          setPhone(response.data.phone || "");
          // Map API preference values to display values
          if (response.data.preference === "veg") {
            setTheme("veg");
          } else if (response.data.preference === "non-veg") {
            setTheme("non-veg");
          } else {
            setTheme("veg"); // Default
          }
          await AsyncStorage.setItem("user", JSON.stringify(response.data));
        }
      } catch (apiError) {
        console.log("API fetch failed, using stored data");
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      showCustomError("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const validatePhone = (phone) => {
    const cleanPhone = (phone || "").replace(/\D/g, "");
    return /^[6-9]\d{9}$/.test(cleanPhone);
  };
  
  const validatePassword = (pass) => pass.length >= 6;

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
    setPhone(formatted);
    setPhoneError("");
  };

  const showCustomError = (title, message) => {
    setPopupTitle(title);
    setPopupMessage(message);
    setShowErrorPopup(true);
  };

  const showCustomSuccess = (title, message, callback = null) => {
    setPopupTitle(title);
    setPopupMessage(message);
    setShowSuccessPopup(true);
    if (callback) {
      setTimeout(callback, 500);
    }
  };

  const handleSave = async () => {
    let valid = true;

    if (phone && !validatePhone(phone)) {
      setPhoneError("Enter a valid 10-digit Indian phone number (starting with 6-9)");
      valid = false;
    }

    if (valid) {
      try {
        setSaving(true);

        // Clean phone number before sending
        const cleanPhone = phone ? phone.replace(/\D/g, "") : "";

        const updateData = {
          name: name,
          phone: cleanPhone,
          preference: theme, // Already in correct format ("veg" or "non-veg")
        };

        // Create form data for the update
        const formData = new FormData();
        Object.keys(updateData).forEach((key) => {
          if (updateData[key]) {
            formData.append(key, updateData[key]);
          }
        });

        // Call update API
        const response = await authService.updateProfile(formData);

        if (response?.data) {
          // Update local user state
          const updatedUser = {
            ...user,
            ...response.data,
          };
          setUser(updatedUser);
          await AsyncStorage.setItem("user", JSON.stringify(updatedUser));

          // Show success popup and go back
          showCustomSuccess("Success", "Profile updated successfully!", () => {
            navigation.goBack();
          });
        }
      } catch (error) {
        console.error("Error updating profile:", error);
        showCustomError("Error", "Failed to update profile");
      } finally {
        setSaving(false);
      }
    }
  };

  const handlePasswordChange = async () => {
    let valid = true;

    if (!validatePassword(newPassword)) {
      setPasswordError("Password must be at least 6 characters");
      valid = false;
    }

    if (newPassword !== confirmPassword) {
      setConfirmError("Passwords do not match");
      valid = false;
    }

    if (valid) {
      try {
        setChangingPassword(true);

        const updateData = {
          password: newPassword,
        };

        const formData = new FormData();
        formData.append("password", newPassword);

        const response = await authService.updateProfile(formData);

        if (response?.data) {
          setShowPasswordSuccessPopup(true);
          setShowPasswordModal(false);
          setNewPassword("");
          setConfirmPassword("");
          setPasswordError("");
          setConfirmError("");
        }
      } catch (error) {
        console.error("Error changing password:", error);
        showCustomError("Error", "Failed to change password");
      } finally {
        setChangingPassword(false);
      }
    }
  };

  const handleCancelPassword = () => {
    setShowPasswordModal(false);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setConfirmError("");
  };

  // Helper function to get display text for preference
  const getPreferenceDisplayText = (preference) => {
    switch (preference) {
      case "veg":
        return "Vegetarian";
      case "non-veg":
        return "Non Vegetarian";
      default:
        return "Vegetarian";
    }
  };

  // Show loading state
  if (loading) {
    return (
      <View
        style={[
          tw`flex-1 bg-white justify-center items-center`,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <ActivityIndicator size="large" color="#6A8B78" />
        <Text style={[fontStyles.body, tw`mt-3 text-gray-600`]}>
          Loading profile...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        tw`flex-1 bg-white`,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      <ProfileHeader navigation={navigation} />

      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`pb-6`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Content Container */}
          <View style={tw`px-5`}>
            {/* Personal Information Section */}
            <Text style={[fontStyles.bodyBold, tw`text-gray-800 mb-3 mt-1`]}>
              Personal Information
            </Text>

            {/* Full Name */}
            <View style={tw`mb-4`}>
              <Text
                style={[fontStyles.headingS, tw`text-xs text-black-100 mb-1`]}
              >
                Full Name
              </Text>
              <TextInput
                style={[
                  tw`h-11 bg-gray-50 rounded-lg px-4 text-gray-800 border border-gray-200`,
                  fontStyles.body,
                ]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Email - Read Only */}
            <View style={tw`mb-4`}>
              <Text
                style={[fontStyles.headingS, tw`text-xs text-black-100 mb-1`]}
              >
                Email Address
              </Text>
              <View
                style={tw`h-11 bg-gray-50 rounded-lg px-4 justify-center border border-gray-200`}
              >
                <Text
                  style={[fontStyles.body, tw`text-gray-800`]}
                  numberOfLines={1}
                >
                  {user?.email || "No email"}
                </Text>
              </View>
              <Text
                style={[fontStyles.caption, tw`text-xs text-gray-500 mt-1`]}
              >
                Email cannot be changed
              </Text>
            </View>

            {/* Phone Number */}
            <View style={tw`mb-3`}>
              <Text
                style={[fontStyles.headingS, tw`text-xs text-black-100 mb-1`]}
              >
                Phone Number
              </Text>
              <TextInput
                style={[
                  tw`h-11 bg-gray-50 rounded-lg px-4 text-gray-800 border border-gray-200`,
                  fontStyles.body,
                ]}
                value={phone}
                keyboardType="phone-pad"
                onChangeText={handlePhoneChange}
                placeholder="Enter 10-digit number"
                placeholderTextColor="#9ca3af"
                maxLength={11}
              />
              {phoneError ? (
                <Text style={[fontStyles.caption, tw`text-red-500 mt-1`]}>
                  {phoneError}
                </Text>
              ) : (
                <Text
                  style={[fontStyles.caption, tw`text-xs text-gray-500 mt-1`]}
                >
                  Indian mobile number (10 digits, starting with 6-9)
                </Text>
              )}
            </View>

            {/* Password Section */}
            <View style={tw`mb-4`}>
              <Text
                style={[fontStyles.headingS, tw`text-xs text-black-100 mb-1`]}
              >
                Password
              </Text>
              <TouchableOpacity
                style={tw`flex-row items-center justify-between h-11 bg-gray-50 rounded-lg px-4 border border-gray-200`}
                onPress={() => setShowPasswordModal(true)}
                activeOpacity={0.7}
              >
                <View style={tw`flex-row items-center`}>
                  <Text style={[fontStyles.body, tw`text-gray-800 mr-2`]}>
                    ••••••••
                  </Text>
                  <Icon name="lock-closed-outline" size={14} color="#9ca3af" />
                </View>
                <Text style={[fontStyles.headingS, tw`text-sm text-[#6A8B78]`]}>
                  Change
                </Text>
              </TouchableOpacity>
            </View>

            {/* Food Preference Section */}
            <View style={tw`mb-5`}>
              <Text
                style={[fontStyles.headingS, tw`text-sm text-black-100 mb-1`]}
              >
                Food Preference
              </Text>
              <View
                style={tw`bg-gray-50 rounded-lg p-4 border border-gray-200`}
              >
                <Pressable
                  style={tw`flex-row items-center mb-3`}
                  onPress={() => setTheme("veg")}
                >
                  <View
                    style={[
                      tw`h-4 w-4 rounded-full border-2 border-[#6A8B78] mr-3 justify-center items-center`,
                      theme === "veg" && tw`bg-[#6A8B78]`,
                    ]}
                  >
                    {theme === "veg" && (
                      <View style={tw`h-1.5 w-1.5 rounded-full bg-white`} />
                    )}
                  </View>
                  <Text style={[fontStyles.body, tw`text-gray-800`]}>
                    {getPreferenceDisplayText("veg")}
                  </Text>
                </Pressable>
                <Pressable
                  style={tw`flex-row items-center`}
                  onPress={() => setTheme("non-veg")}
                >
                  <View
                    style={[
                      tw`h-4 w-4 rounded-full border-2 border-[#6A8B78] mr-3 justify-center items-center`,
                      theme === "non-veg" && tw`bg-[#6A8B78]`,
                    ]}
                  >
                    {theme === "non-veg" && (
                      <View style={tw`h-1.5 w-1.5 rounded-full bg-white`} />
                    )}
                  </View>
                  <Text style={[fontStyles.body, tw`text-gray-800`]}>
                    {getPreferenceDisplayText("non-veg")}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Save Changes Button */}
            <TouchableOpacity
              style={[
                tw`bg-[#6A8B78] rounded-lg h-12 justify-center items-center mb-2`,
                saving && tw`opacity-50`,
              ]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={[fontStyles.bodyBold, tw`text-white`]}>
                  Save Changes
                </Text>
              )}
            </TouchableOpacity>

            {/* Delete Account Notice */}
            <View
              style={tw`bg-amber-50 rounded-lg p-3 border border-amber-100 mt-1`}
            >
              <Text
                style={[
                  fontStyles.caption,
                  tw`text-amber-800 text-center leading-4 text-xs`,
                ]}
              >
                To delete your account, please contact{" "}
                <Text style={[fontStyles.captionBold, tw`text-amber-900`]}>
                  ops@goodbelly.in
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
      >
        <View
          style={[
            tw`flex-1 bg-black bg-opacity-40 justify-center px-5`,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          <View style={tw`bg-white rounded-xl p-5 mx-4 shadow-xl max-w-md`}>
            {/* Modal Header */}
            <View style={tw`mb-4`}>
              <Text
                style={[fontStyles.headingS, tw`text-gray-800 mb-1 text-lg`]}
              >
                Change Password
              </Text>
              <Text style={[fontStyles.caption, tw`text-xs text-gray-500`]}>
                Enter your new password below
              </Text>
            </View>

            {/* New Password */}
            <View style={tw`mb-3`}>
              <Text
                style={[fontStyles.headingS, tw`text-xs text-black-100 mb-1`]}
              >
                New Password
              </Text>
              <TextInput
                style={[
                  tw`h-10 bg-gray-50 rounded-lg px-4 text-gray-800 border border-gray-300 text-sm`,
                  fontStyles.body,
                ]}
                value={newPassword}
                secureTextEntry
                onChangeText={(text) => {
                  setNewPassword(text);
                  setPasswordError("");
                }}
                placeholder="Min. 6 characters"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
              />
              {passwordError ? (
                <Text
                  style={[fontStyles.caption, tw`text-red-500 mt-1 text-xs`]}
                >
                  {passwordError}
                </Text>
              ) : null}
            </View>

            {/* Confirm Password */}
            <View style={tw`mb-5`}>
              <Text
                style={[fontStyles.headingS, tw`text-xs text-black-100 mb-1`]}
              >
                Confirm Password
              </Text>
              <TextInput
                style={[
                  tw`h-10 bg-gray-50 rounded-lg px-4 text-gray-800 border border-gray-300 text-sm`,
                  fontStyles.body,
                ]}
                value={confirmPassword}
                secureTextEntry
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setConfirmError("");
                }}
                placeholder="Confirm your password"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
              />
              {confirmError ? (
                <Text
                  style={[fontStyles.caption, tw`text-red-500 mt-1 text-xs`]}
                >
                  {confirmError}
                </Text>
              ) : null}
            </View>

            {/* Modal Buttons */}
            <View style={tw`flex-row justify-end space-x-3`}>
              <TouchableOpacity
                style={tw`px-4 py-2 rounded-lg`}
                onPress={handleCancelPassword}
                disabled={changingPassword}
              >
                <Text style={[fontStyles.body, tw`text-gray-600 text-sm`]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  tw`bg-[#6A8B78] px-4 py-2 rounded-lg`,
                  changingPassword && tw`opacity-50`,
                ]}
                onPress={handlePasswordChange}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={[fontStyles.bodyBold, tw`text-white text-sm`]}>
                    Update
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Popups */}
      <CustomPopup
        visible={showErrorPopup}
        onClose={() => setShowErrorPopup(false)}
        title={popupTitle}
        message={popupMessage}
        type="error"
        confirmText="OK"
        onConfirm={() => setShowErrorPopup(false)}
      />

      <CustomPopup
        visible={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        title={popupTitle}
        message={popupMessage}
        type="success"
        confirmText="OK"
        onConfirm={() => setShowSuccessPopup(false)}
      />

      <CustomPopup
        visible={showPasswordSuccessPopup}
        onClose={() => setShowPasswordSuccessPopup(false)}
        title="Success"
        message="Password changed successfully!"
        type="success"
        confirmText="OK"
        onConfirm={() => setShowPasswordSuccessPopup(false)}
      />
    </View>
  );
};

export default ProfileCardScreen;
