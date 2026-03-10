import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";

const AppFooter = () => {
  const [email, setEmail] = useState("");

  const handleSocialPress = (url) => {
    Linking.openURL(url);
  };

  const handleSubscribe = () => {
    console.log("Subscribed with email:", email);
    setEmail("");
  };

  return (
    <View style={tw`bg-gray-900 py-7.5 px-5`}>
      {/* About Section */}
      <View style={tw`mb-5`}>
        <Text style={tw`text-base font-bold text-white mb-2.5`}>About</Text>
        <TouchableOpacity>
          <Text style={tw`text-xs text-gray-300 mb-2`}>Buy A Timeshare</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text style={tw`text-xs text-gray-300 mb-2`}>Sell A Timeshare</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text style={tw`text-xs text-gray-300 mb-2`}>Hot Buy Timeshare</Text>
        </TouchableOpacity>
      </View>

      {/* Services Section */}
      <View style={tw`mb-5`}>
        <Text style={tw`text-base font-bold text-white mb-2.5`}>Services</Text>
        <TouchableOpacity>
          <Text style={tw`text-xs text-gray-300 mb-2`}>Buy A Timeshare</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text style={tw`text-xs text-gray-300 mb-2`}>Sell A Timeshare</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text style={tw`text-xs text-gray-300 mb-2`}>Hot Buy Timeshare</Text>
        </TouchableOpacity>
      </View>

      {/* Newsletter Section */}
      <View style={tw`mb-5`}>
        <Text style={tw`text-base font-bold text-white mb-2.5`}>
          Join A Newsletter
        </Text>
        <Text style={tw`text-xs text-gray-300 mb-2`}>Your Email</Text>
        <View style={tw`flex-row items-center bg-white rounded px-3 h-11`}>
          <TextInput
            style={tw`flex-1 text-xs text-gray-800 py-0`}
            placeholder="Enter Your Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <TouchableOpacity
            style={tw`flex-row items-center gap-1.5`}
            onPress={handleSubscribe}
          >
            <Text style={tw`text-xs font-semibold text-black`}>Send</Text>
            <Ionicons name="send" size={16} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Social Media Icons */}
      <View style={tw`flex-row gap-3 mb-5`}>
        <TouchableOpacity
          style={tw`w-10 h-10 rounded-full bg-gray-700 justify-center items-center`}
          onPress={() => handleSocialPress("https://facebook.com")}
        >
          <Ionicons name="logo-facebook" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={tw`w-10 h-10 rounded-full bg-gray-700 justify-center items-center`}
          onPress={() => handleSocialPress("https://instagram.com")}
        >
          <Ionicons name="logo-instagram" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={tw`w-10 h-10 rounded-full bg-gray-700 justify-center items-center`}
          onPress={() => handleSocialPress("https://twitter.com")}
        >
          <Ionicons name="logo-twitter" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={tw`w-10 h-10 rounded-full bg-gray-700 justify-center items-center`}
          onPress={() => handleSocialPress("https://linkedin.com")}
        >
          <Ionicons name="logo-linkedin" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={tw`w-10 h-10 rounded-full bg-gray-700 justify-center items-center`}
          onPress={() => handleSocialPress("https://youtube.com")}
        >
          <Ionicons name="logo-youtube" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Contact Info */}
      <View style={tw`mb-5`}>
        <View style={tw`flex-row items-center mb-3 gap-2.5`}>
          <Ionicons name="call" size={16} color="#FFFFFF" />
          <Text style={tw`text-xs text-gray-300 flex-1`}>407-382-3800</Text>
        </View>
        <View style={tw`flex-row items-center mb-3 gap-2.5`}>
          <Ionicons name="mail" size={16} color="#FFFFFF" />
          <Text style={tw`text-xs text-gray-300 flex-1`}>demo@gelloz.com</Text>
        </View>
        <View style={tw`flex-row items-center mb-3 gap-2.5`}>
          <Ionicons name="location" size={16} color="#FFFFFF" />
          <Text style={tw`text-xs text-gray-300 flex-1`}>
            Add Your Full Address here with pin code (123456)
          </Text>
        </View>
      </View>

      {/* Copyright */}
      <Text style={tw`text-xs text-gray-400 text-left mt-2.5`}>
        © 2024 - Timeshare Professionals Inc.
      </Text>
    </View>
  );
};

export default AppFooter;
