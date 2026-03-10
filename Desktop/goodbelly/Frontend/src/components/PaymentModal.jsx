import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { paymentConfig } from "../config/payment";

const PaymentModal = ({
  visible,
  paymentUrl,
  onClose,
  onPaymentSuccess,
  onPaymentFailure,
}) => {
  const [paymentLoading, setPaymentLoading] = useState(true);
  const webViewRef = useRef();
  const [currentUrl, setCurrentUrl] = useState("");
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const handleWebViewNavigation = (navState) => {
    const { url, title } = navState;
    setCurrentUrl(url);
    console.log("WebView navigating to:", url);
    console.log("Page title:", title);

    // Don't process if payment already completed
    if (paymentCompleted) return;

    // Check if we're on the main PayU payment page (show payment options)
    if (url.includes("test.payu.in/_payment")) {
      console.log("  On PayU payment page - waiting for user payment");
      return;
    }

    // Check for actual PayU success response (not the initial page)
    if (
      (url.includes("/success") && !url.includes("test.payu.in/_payment")) ||
      url.includes("payment/success") ||
      url.includes("status=success") ||
      url.includes("txn_status=success") ||
      title?.toLowerCase().includes("payment success") ||
      title?.toLowerCase().includes("transaction successful")
    ) {
      console.log("  Actual payment successful detected");
      setPaymentCompleted(true);
      onPaymentSuccess();
      return;
    }

    // Check for actual PayU failure response
    if (
      (url.includes("/failure") && !url.includes("test.payu.in/_payment")) ||
      url.includes("payment/failure") ||
      url.includes("status=failure") ||
      url.includes("txn_status=failure") ||
      title?.toLowerCase().includes("payment failed") ||
      title?.toLowerCase().includes("transaction failed")
    ) {
      console.log("  Actual payment failure detected");
      setPaymentCompleted(true);
      onPaymentFailure();
      return;
    }

    // Check for custom URL scheme redirects (actual payment completion)
    if (url.includes("goodbelly://payment/")) {
      console.log("🔗 Custom URL scheme detected:", url);
      if (url.includes("success")) {
        console.log("  Payment success via custom URL");
        setPaymentCompleted(true);
        onPaymentSuccess();
      } else if (url.includes("failure")) {
        console.log("  Payment failure via custom URL");
        setPaymentCompleted(true);
        onPaymentFailure();
      }
      return;
    }
  };

  // Enhanced JavaScript injection for proper PayU detection
  const injectedJavaScript = `
    (function() {
      console.log('PayU payment detection script loaded');
      
      let paymentInitiated = false;
      let paymentCompleted = false;
      
      function checkPaymentStatus() {
        if (paymentCompleted) return;
        
        const url = window.location.href;
        const title = document.title.toLowerCase();
        const bodyText = document.body.innerText.toLowerCase();
        
        console.log('Current page - URL:', url, 'Title:', title);
        
        // Success patterns (actual payment completion)
        const successPatterns = [
          (url.includes('/success') && !url.includes('test.payu.in/_payment')),
          url.includes('payment/success'),
          url.includes('status=success'),
          url.includes('txn_status=success'),
          title.includes('payment success'),
          title.includes('transaction successful'),
          bodyText.includes('transaction successful'),
          bodyText.includes('payment successful'),
          bodyText.includes('thank you for your payment')
        ];
        
        // Failure patterns (actual payment failure)
        const failurePatterns = [
          (url.includes('/failure') && !url.includes('test.payu.in/_payment')),
          url.includes('payment/failure'),
          url.includes('status=failure'),
          url.includes('txn_status=failure'),
          title.includes('payment failed'),
          title.includes('transaction failed'),
          bodyText.includes('transaction failed'),
          bodyText.includes('payment failed')
        ];
        
        if (successPatterns.some(pattern => pattern)) {
          console.log('  Payment success detected');
          paymentCompleted = true;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'payment_success',
            detectedBy: 'page_content',
            url: url,
            title: title
          }));
          return;
        }
        
        if (failurePatterns.some(pattern => pattern)) {
          console.log('  Payment failure detected');
          paymentCompleted = true;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'payment_failure',
            detectedBy: 'page_content',
            url: url,
            title: title
          }));
          return;
        }
        
        // Check if we're on payment page with options
        if (url.includes('test.payu.in/_payment') && 
            (bodyText.includes('pay using') || 
             bodyText.includes('payment options') ||
             bodyText.includes('credit card') ||
             bodyText.includes('debit card') ||
             bodyText.includes('net banking') ||
             bodyText.includes('upi') ||
             bodyText.includes('payu'))) {
          console.log('   On payment page - showing payment options');
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'payment_page_loaded',
            message: 'Payment options available'
          }));
        }
      }
      
      // Initial check
      setTimeout(checkPaymentStatus, 2000);
      
      // Monitor for page changes
      let lastUrl = window.location.href;
      const observer = new MutationObserver(function() {
        if (window.location.href !== lastUrl) {
          lastUrl = window.location.href;
          setTimeout(checkPaymentStatus, 500);
        }
      });
      
      observer.observe(document, { subtree: true, childList: true });
      
      // Listen for navigation events
      window.addEventListener('load', checkPaymentStatus);
      window.addEventListener('hashchange', checkPaymentStatus);
      window.addEventListener('popstate', checkPaymentStatus);
      
      // Override history methods
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      
      history.pushState = function(...args) {
        originalPushState.apply(this, args);
        setTimeout(checkPaymentStatus, 100);
      };
      
      history.replaceState = function(...args) {
        originalReplaceState.apply(this, args);
        setTimeout(checkPaymentStatus, 100);
      };
      
      // Periodic check
      const intervalId = setInterval(checkPaymentStatus, 3000);
      
      // Stop checking after 15 minutes
      setTimeout(() => {
        clearInterval(intervalId);
        if (!paymentCompleted) {
          console.log('Payment detection timeout after 15 minutes');
        }
      }, 900000);
      
      return true;
    })();
  `;

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log("Message from WebView:", data);

      if (data.type === "payment_success" && !paymentCompleted) {
        console.log("  Payment success confirmed via message");
        setPaymentCompleted(true);
        onPaymentSuccess();
      } else if (data.type === "payment_failure" && !paymentCompleted) {
        console.log("  Payment failure confirmed via message");
        setPaymentCompleted(true);
        onPaymentFailure();
      } else if (data.type === "payment_page_loaded") {
        console.log("   Payment page loaded with options");
        // Payment page is ready with UPI/card options
      }
    } catch (error) {
      console.log("Non-JSON message:", event.nativeEvent.data);
    }
  };

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setPaymentCompleted(false);
      setPaymentLoading(true);
      setCurrentUrl("");
    }
  }, [visible]);

  const ManualCheckButtons = () => (
    <View style={tw`p-4 bg-yellow-50 border-t border-yellow-200`}>
      <Text style={tw`text-xs text-yellow-800 text-center mb-2`}>
        Testing? Use manual checks:
      </Text>
      <View style={tw`flex-row justify-center gap-2`}>
        <TouchableOpacity
          style={tw`bg-green-500 px-3 py-1 rounded`}
          onPress={() => {
            setPaymentCompleted(true);
            onPaymentSuccess();
          }}
        >
          <Text style={tw`text-white text-xs`}>Simulate Success</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={tw`bg-red-500 px-3 py-1 rounded`}
          onPress={() => {
            setPaymentCompleted(true);
            onPaymentFailure();
          }}
        >
          <Text style={tw`text-white text-xs`}>Simulate Failure</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 bg-white`}>
        {/* Header */}
        <View
          style={tw`flex-row items-center justify-between p-4 border-b border-gray-200 bg-white`}
        >
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#4b5563" />
          </TouchableOpacity>
          <Text style={tw`text-lg font-semibold text-gray-900`}>
            Complete Payment
          </Text>
          <View style={tw`w-6`} />
        </View>

        {/* Payment Status */}
        <View style={tw`bg-blue-50 p-3 border-b border-blue-200`}>
          <Text style={tw`text-xs text-blue-800 text-center`}>
            {paymentCompleted
              ? "Payment processing completed"
              : "Please complete your payment using UPI, Card, or Net Banking"}
          </Text>
        </View>

        {/* Current URL for debugging */}
        {__DEV__ && currentUrl && (
          <View style={tw`bg-gray-100 p-2 border-b border-gray-200`}>
            <Text style={tw`text-xs text-gray-600`} numberOfLines={1}>
              {currentUrl}
            </Text>
          </View>
        )}

        {/* Loading Indicator */}
        {paymentLoading && (
          <View style={tw`absolute top-32 left-0 right-0 items-center z-10`}>
            <View
              style={tw`bg-blue-600 px-4 py-2 rounded-full flex-row items-center`}
            >
              <ActivityIndicator size="small" color="white" />
              <Text style={tw`text-white ml-2 text-sm font-medium`}>
                Loading payment gateway...
              </Text>
            </View>
          </View>
        )}

        {/* WebView */}
        <WebView
          ref={webViewRef}
          source={{ uri: paymentUrl }}
          style={tw`flex-1`}
          onLoadStart={() => {
            setPaymentLoading(true);
            console.log("WebView load started");
          }}
          onLoadEnd={() => {
            setPaymentLoading(false);
            console.log("WebView load completed");
          }}
          onLoadProgress={({ nativeEvent }) => {
            console.log("WebView progress:", nativeEvent.progress);
          }}
          onNavigationStateChange={handleWebViewNavigation}
          onMessage={handleMessage}
          injectedJavaScript={injectedJavaScript}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={tw`flex-1 justify-center items-center bg-white`}>
              <ActivityIndicator size="large" color="#6A8B78" />
              <Text style={tw`text-gray-600 mt-4`}>
                Loading payment gateway...
              </Text>
            </View>
          )}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          thirdPartyCookiesEnabled={true}
          allowsBackForwardNavigationGestures={true}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn("WebView error: ", nativeEvent);
            Alert.alert(
              "Error",
              "Failed to load payment page. Please try again."
            );
          }}
        />

        {/* Instructions for testing */}
        <View style={tw`bg-gray-50 border-t border-gray-200`}>
          <View style={tw`p-3 bg-orange-50 border-b border-orange-200`}>
            <Text style={tw`text-xs text-orange-800 text-center font-medium`}>
              Test Instructions: Use "success@payu" for successful payment or
              "failure@payu" for failed payment
            </Text>
          </View>

          <ManualCheckButtons />

          <View style={tw`p-4`}>
            <Text style={tw`text-xs text-gray-600 text-center`}>
              Secure payment processed by PayU • Your data is protected
            </Text>
            <TouchableOpacity onPress={onClose} style={tw`mt-2`}>
              <Text style={tw`text-red-600 text-xs text-center font-medium`}>
                Cancel Payment
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default PaymentModal;
