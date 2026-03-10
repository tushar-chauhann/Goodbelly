import React, { useRef, useState } from "react";
import { View, Text, SafeAreaView, TouchableOpacity, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";

export default function InAppWebViewScreen({ route, navigation }) {
  const { url, title } = route.params || {};
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={tw`flex-row items-center justify-between px-3 py-2 border-b border-gray-200`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`}>
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={[fontStyles.bodyBold, tw`text-base`]} numberOfLines={1}>{title || "Web"}</Text>
        <View style={tw`w-10`} />
      </View>

      <View style={{ flex: 1 }}>
        {loading && (
          <View style={tw`absolute inset-0 items-center justify-center z-10`}>
            <ActivityIndicator size="large" color="#5F7F67" />
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          startInLoadingState
          style={{ flex: 1 }}
        />
      </View>
    </SafeAreaView>
  );
}
