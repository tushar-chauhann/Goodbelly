import React, { useEffect, useRef } from "react";
import { View, Image, StatusBar, Animated, Text } from "react-native";
import tw from "twrnc";

export default function Splashscreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={tw`flex-1 bg-[#F5F5F0] justify-center items-center`}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F0" />

      <Animated.View
        style={[
          tw`justify-center items-center`,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Circular Logo with GOODBELLY text */}
        <View
          style={tw`w-40 h-40 rounded-full bg-[#6B9080] justify-center items-center shadow-lg mb-3`}
        >
          <Image
            source={require("../../assets/logo.png")}
            style={tw`w-35 h-35`}
            resizeMode="contain"
          />
        </View>

        {/* Tagline */}
        <View style={tw`justify-center items-center mt-0`}>
          <Text
            style={tw`text-base font-medium text-gray-600 text-center tracking-wide leading-6`}
          >
            Fuel Your Fitness,
          </Text>
          <Text
            style={tw`text-base font-medium text-gray-600 text-center tracking-wide leading-6`}
          >
            Eat Right
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
