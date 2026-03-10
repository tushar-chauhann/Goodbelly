import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Dimensions
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";

export default function InAppWebViewScreen({ route, navigation }) {
  const { url, title } = route.params || {};
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);

  // Responsive sizing for tablets and iPads
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#fff" }}
      edges={['top', 'left', 'right']}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#fff"
        translucent={Platform.OS === 'android'}
      />

      {/* Header */}
      <View style={[
        tw`flex-row items-center justify-between border-b border-gray-200`,
        tw`${isTablet ? 'px-6 py-3' : 'px-3 py-2'}`
      ]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`}>
          <Ionicons name="close" size={isTablet ? 28 : 24} color="#111827" />
        </TouchableOpacity>

        <Text
          style={[
            fontStyles.bodyBold,
            tw`${isTablet ? 'text-lg' : 'text-base'}`
          ]}
          numberOfLines={1}
        >
          {title || "Web"}
        </Text>

        <View style={tw`w-10`} />
      </View>

      {/* WebView Content */}
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
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scalesPageToFit={Platform.OS === 'android'}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          androidHardwareAccelerationDisabled={false}
          style={{ flex: 1 }}
        />
      </View>
    </SafeAreaView>
  );
}
