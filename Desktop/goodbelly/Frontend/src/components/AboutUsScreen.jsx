// components/AboutUsScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  TextInput,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons as Icon, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import tw from "twrnc";
import { fontStyles } from "../utils/fontStyles";
import { authService } from "../services/authService";

const AboutUsScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  //   ADD: Function to determine StatusBar style based on background color
  const getStatusBarStyle = (bgColor) => {
    const lightBackgrounds = ["#FFFFFF", "#F3F4F6", "#FAFAFA", "#F9FAFB", "#ffffff", "white"];
    return lightBackgrounds.includes(bgColor) ? "dark-content" : "light-content";
  };

  //   ADD: Background color constant
  const BACKGROUND_COLOR = "#FFFFFF"; // white background

  const handleBack = () => {
    navigation.goBack();
  };

  const handleOpenLink = (url) => {
    Linking.openURL(url).catch((err) =>
      console.error("Failed to open URL:", err)
    );
  };

  const handleSubscribe = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      const response = await authService.subscribeToNewsletter(email);

      if (response.success) {
        Alert.alert("Success", "You have been subscribed to our newsletter!");
        setEmail(""); // Clear the input
      } else {
        Alert.alert("Error", response.message || "Subscription failed");
      }
    } catch (error) {
      console.error("Subscription error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message ||
        "Failed to subscribe. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    {
      title: "Our Mission",
      content:
        "At GoodBelly, we're committed to delivering healthy, delicious meals straight from trusted kitchens to your doorstep. We believe everyone deserves access to nutritious food that supports wellbeing.",
    },
    {
      title: "Our Story",
      content:
        "GoodBelly started with a simple idea: make healthy eating convenient and accessible. What began as a small local service has grown into a platform connecting hundreds of customers with quality kitchens across the region.",
    },
    {
      title: "What We Offer",
      items: [
        "Curated selection of healthy meals from verified kitchens",
        "Flexible meal subscriptions to match your lifestyle",
        "Nutrition consultations with certified experts",
        "Fresh ingredients sourced locally",
        "Customizable meal plans for dietary needs",
      ],
    },
    {
      title: "Our Values",
      items: [
        "Quality: Every meal meets our strict standards",
        "Transparency: Know exactly what's in your food",
        "Sustainability: Eco-friendly packaging and practices",
        "Community: Supporting local kitchens and producers",
        "Wellness: Food that nourishes body and mind",
      ],
    },
  ];

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/*   ADD: Dynamic StatusBar based on background color */}
      <StatusBar
        barStyle={getStatusBarStyle(BACKGROUND_COLOR)}
        backgroundColor={BACKGROUND_COLOR}
      />

      {/* Header */}
      <View style={tw`bg-white px-4 py-4 border-b border-gray-200`}>
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={tw`mr-3`}
          >
            <Icon name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={[fontStyles.headingS, tw`text-black`]}>About Us</Text>
        </View>
      </View>

      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-0.5`}
      >
        <View style={tw`px-4 py-4`}>
          {/* Content Sections */}
          {sections.map((section, index) => (
            <View key={index} style={tw`mb-5`}>
              <Text
                style={[
                  fontStyles.headingItalic,
                  tw`text-base text-gray-800 mb-2`,
                ]}
              >
                {section.title}
              </Text>
              {section.content ? (
                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-gray-600 text-xs leading-5`,
                  ]}
                >
                  {section.content}
                </Text>
              ) : (
                <View style={tw`ml-1`}>
                  {section.items.map((item, itemIndex) => (
                    <View key={itemIndex} style={tw`flex-row items-start mb-1.5`}>
                      <Icon
                        name="checkmark-circle"
                        size={14}
                        color="#6A8B78"
                        style={tw`mt-0.5 mr-2`}
                      />
                      <Text
                        style={[
                          fontStyles.headingS,
                          tw`text-gray-600 text-xs flex-1`,
                        ]}
                      >
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

          {/* Contact Information */}
          <View style={tw`mb-5`}>
            <Text
              style={[fontStyles.headingItalic, tw`text-base text-gray-800 mb-2`]}
            >
              Contact Information
            </Text>
            <View style={tw`bg-gray-50 rounded-lg p-3`}>
              {/* Phone */}
              <View style={tw`flex-row items-center mb-2.5`}>
                <MaterialCommunityIcons
                  name="phone"
                  size={16}
                  color="#6A8B78"
                />
                <TouchableOpacity
                  onPress={() => handleOpenLink("tel:+919825305414")}
                  style={tw`ml-2.5`}
                >
                  <Text
                    style={[
                      fontStyles.headingS,
                      tw`text-[#6A8B78] text-xs underline`,
                    ]}
                  >
                    +91 9825305414
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Email */}
              <View style={tw`flex-row items-center mb-2.5`}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={16}
                  color="#6A8B78"
                />
                <TouchableOpacity
                  onPress={() => handleOpenLink("mailto:hello@goodbelly.in")}
                  style={tw`ml-2.5`}
                >
                  <Text
                    style={[
                      fontStyles.headingS,
                      tw`text-[#6A8B78] text-xs underline`,
                    ]}
                  >
                    hello@goodbelly.in
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Cloud Location */}
              <View style={tw`flex-row items-center`}>
                <MaterialCommunityIcons
                  name="cloud-outline"
                  size={16}
                  color="#6A8B78"
                />
                <Text
                  style={[fontStyles.headingS, tw`text-gray-600 text-xs ml-2.5`]}
                >
                  We're in the cloud
                </Text>
              </View>
            </View>
          </View>

          {/* Newsletter Section */}
          <View style={tw`mb-5`}>
            <Text
              style={[fontStyles.headingItalic, tw`text-base text-gray-800 mb-1.5`]}
            >
              Join Our Newsletter
            </Text>
            <Text style={[fontStyles.headingS, tw`text-gray-600 text-xs mb-2.5`]}>
              Get updates on health tips & offers
            </Text>
            <View style={tw`flex-row items-center`}>
              <TextInput
                placeholder="Enter Your Email"
                placeholderTextColor="#999"
                style={tw`flex-1 bg-gray-100 text-gray-800 text-xs px-3 py-2 rounded-l-lg border border-gray-300 h-10`}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                style={tw`bg-[#6A8B78] px-3 h-10 justify-center rounded-r-lg border border-[#6A8B78] ${loading ? "opacity-50" : ""
                  }`}
                onPress={handleSubscribe}
                disabled={loading}
              >
                <View style={tw`flex-row items-center`}>
                  <Text
                    style={[fontStyles.bodyBold, tw`text-white text-xs mr-1`]}
                  >
                    {loading ? "..." : "Send"}
                  </Text>
                  <MaterialCommunityIcons name="send" size={14} color="white" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero Section */}
          <View
            style={tw`bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200`}
          >
            <View style={tw`flex-row items-center`}>
              <Image
                source={require("../assets/icons/footer-logo.jpeg")}
                style={tw`w-14 h-14 rounded-lg mr-3`}
                resizeMode="contain"
              />
              <View style={tw`flex-1`}>
                <Text
                  style={[
                    fontStyles.headingItalic,
                    tw`text-lg text-gray-800 mb-0.5`,
                  ]}
                >
                  GOODBELLY
                </Text>
                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-gray-600 text-[10px] leading-4`,
                  ]}
                >
                  Your trusted partner for healthy living and expert
                  consultations.
                </Text>
              </View>
            </View>
          </View>

          {/* FSSAI Certification */}
          <View
            style={tw`bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200`}
          >
            <View style={tw`flex-row items-center`}>
              <Image
                source={require("../assets/icons/barcode.png")}
                style={tw`w-12 h-12 mr-3`}
                resizeMode="contain"
              />
              <View style={tw`flex-1`}>
                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-gray-800 text-sm font-semibold`,
                  ]}
                >
                  FSSAI CERTIFIED
                </Text>
                <Text style={[fontStyles.body, tw`text-gray-600 text-xs mb-0.5`]}>
                  License No: 10725998001122
                </Text>
                <Text style={[fontStyles.body, tw`text-gray-500 text-[10px]`]}>
                  Food Safety and Standards Authority of India
                </Text>
              </View>
            </View>
          </View>

          {/* Quality Assured Badge */}
          <View style={tw`mb-5`}>
            <View
              style={tw`border border-green-500 rounded-full py-1.5 px-3 flex-row items-center justify-center self-center`}
            >
              <MaterialCommunityIcons
                name="check-circle"
                size={16}
                color="#22c55e"
                style={tw`mr-1.5`}
              />
              <Text style={[fontStyles.bodyBold, tw`text-green-600 text-xs`]}>
                100% Quality Assured
              </Text>
            </View>
          </View>

          {/* Social Media */}
          <View style={tw`mb-5`}>
            <View style={tw`flex-row justify-center gap-3`}>
              {/* Facebook */}
              <TouchableOpacity
                onPress={() =>
                  handleOpenLink(
                    "https://www.facebook.com/people/GoodbellyIn/61580322016154"
                  )
                }
                style={tw`w-10 h-10 rounded-full bg-gray-100 items-center justify-center border border-gray-300`}
              >
                <MaterialCommunityIcons
                  name="facebook"
                  size={20}
                  color="#6A8B78"
                />
              </TouchableOpacity>

              {/* Instagram */}
              <TouchableOpacity
                onPress={() =>
                  handleOpenLink("https://www.instagram.com/goodbellyin")
                }
                style={tw`w-10 h-10 rounded-full bg-gray-100 items-center justify-center border border-gray-300`}
              >
                <MaterialCommunityIcons
                  name="instagram"
                  size={20}
                  color="#6A8B78"
                />
              </TouchableOpacity>

              {/* LinkedIn */}
              <TouchableOpacity
                onPress={() =>
                  handleOpenLink(
                    "https://www.linkedin.com/company/goodbellyindia"
                  )
                }
                style={tw`w-10 h-10 rounded-full bg-gray-100 items-center justify-center border border-gray-300`}
              >
                <MaterialCommunityIcons
                  name="linkedin"
                  size={20}
                  color="#6A8B78"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Company Information */}
          <View style={tw`mt-1 pt-2 border-t border-gray-200`}>
            <Text
              style={[
                fontStyles.headingS,
                tw`text-gray-500 text-xs text-[11px] text-center mb-1`,
              ]}
            >
              © 2025 JF VENTURES PRIVATE LIMITED | ALL RIGHTS RESERVED.
            </Text>
            <Text
              style={[
                fontStyles.headingS,
                tw`text-gray-500 text-xs text-[10px] text-center`,
              ]}
            >
              Developed by Probey Services
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AboutUsScreen;
