import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Image, StyleSheet, View } from "react-native";
import HomeScreen from "../views/screens/HomeScreen";
import CartScreen from "../views/screens/CartScreen";
import OrdersScreen from "../views/screens/OrdersScreen";
import ProfileScreen from "../views/screens/ProfileScreen";
import ProfileCardScreen from "../views/screens/ProfileCardScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fontStyles } from "../utils/fontStyles";
import * as Haptics from "expo-haptics";
import ScoopTooltip from "../components/home/ScoopTooltip";
import { authService } from "../services/authService";

const Tab = createBottomTabNavigator();
const ProfileStack = createNativeStackNavigator();

/* ---------------- PROFILE STACK ---------------- */
function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="ProfileCard" component={ProfileCardScreen} />
    </ProfileStack.Navigator>
  );
}

/* ---------------- MIDDLE LOGO ---------------- */
function MiddleLogo() {
  return (
    <View style={styles.middleLogo}>
      <Image
        source={require("../assets/logo.png")}
        style={styles.middleIcon}
        resizeMode="contain"
      />
    </View>
  );
}

/* ---------------- TAB NAVIGATOR ---------------- */
export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  const [showScoop, setShowScoop] = React.useState(false);
  const [scoopData, setScoopData] = React.useState(null);

  const stripHtml = (html) => {
    if (!html) return "";
    // Replace block tags and breaks with newlines to preserve structure
    let clean = html.replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>|<\/div>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();
    return clean;
  };

  const fetchScoop = async () => {
    try {
      const response = await authService.getScoop();
      if (response && response.data) {
        const rawContent = response.data.content || "";
        const cleanContent = stripHtml(rawContent);

        let mainContent = cleanContent;
        let sources = "";
        let proTip = "";

        const sourcesMatch = cleanContent.match(/Sources:\s*(.*?)(?=Pro tip:|$)/s);
        if (sourcesMatch) {
          sources = sourcesMatch[1].trim();
          mainContent = mainContent.replace(sourcesMatch[0], "").trim();
        }

        const proTipMatch = cleanContent.match(/Pro tip:\s*(.*?)$/s);
        if (proTipMatch) {
          proTip = proTipMatch[1].trim();
          mainContent = mainContent.replace(proTipMatch[0], "").trim();
        }

        setScoopData({
          heading: stripHtml(response.data.heading),
          content: mainContent.replace(/\s+/g, " ").trim(),
          sources,
          proTip,
        });
      }
    } catch (err) {
      console.error("Error fetching scoop for tooltip:", err);
    }
  };

  React.useEffect(() => {
    if (showScoop && !scoopData) {
      fetchScoop();
    }
  }, [showScoop]);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={({ route }) => ({
          headerShown: false,

          tabBarIcon: ({ focused }) => {
            let iconSource;

            if (route.name === "Home") {
              iconSource = require("../assets/icons/home.png");
              return (
                <Image
                  source={iconSource}
                  style={[
                    styles.homeTabIcon,
                    {
                      tintColor: focused ? "#6B9080" : "#999",
                      opacity: focused ? 1 : 0.7,
                    },
                  ]}
                  resizeMode="contain"
                />
              );
            } else if (route.name === "Cart") {
              iconSource = require("../assets/icons/cart.png");
            } else if (route.name === "Orders") {
              iconSource = require("../assets/icons/order.png");
            } else if (route.name === "ProfileTab") {
              iconSource = require("../assets/icons/profile.png");
            }

            return (
              <Image
                source={iconSource}
                style={[
                  styles.tabIcon,
                  {
                    tintColor: focused ? "#6B9080" : "#999",
                    opacity: focused ? 1 : 0.7,
                  },
                ]}
                resizeMode="contain"
              />
            );
          },

          tabBarActiveTintColor: "#6B9080",
          tabBarInactiveTintColor: "#999",

          tabBarStyle: {
            paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 16,
            paddingTop: 8,
            height: 60 + (insets.bottom > 0 ? insets.bottom : 16),
            borderTopWidth: 1,
            borderTopColor: "#F0F0F0",
            backgroundColor: "#FFFFFF",
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          },

          /*   GLOBAL FONT APPLIED HERE */
          tabBarLabelStyle: fontStyles.tabLabel,

          tabBarItemStyle: {
            paddingVertical: 6,
          },
          sceneContainerStyle: {
            backgroundColor: "#FFFFFF",
          },
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarLabel: "Home" }}
          listeners={{
            tabPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowScoop(false);
            },
          }}
        />
        <Tab.Screen
          name="Cart"
          component={CartScreen}
          options={{ tabBarLabel: "Cart" }}
          listeners={{
            tabPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowScoop(false);
            },
          }}
        />

        <Tab.Screen
          name="MiddleLogo"
          component={HomeScreen}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowScoop(!showScoop);
            },
          })}
          options={{
            tabBarLabel: "",
            tabBarIcon: () => <MiddleLogo />,
          }}
        />

        <Tab.Screen
          name="Orders"
          component={OrdersScreen}
          options={{ tabBarLabel: "Orders" }}
          listeners={{
            tabPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowScoop(false);
            },
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileStackScreen}
          options={{ tabBarLabel: "Profile" }}
          listeners={{
            tabPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowScoop(false);
            },
          }}
        />
      </Tab.Navigator>

      {/* Scoop Tooltip */}
      <ScoopTooltip
        visible={showScoop}
        data={scoopData}
        onClose={() => setShowScoop(false)}
      />
    </View>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  tabIcon: {
    width: 28,
    height: 28,
  },
  homeTabIcon: {
    width: 24,
    height: 24,
  },
  middleLogo: {
    top: -25,
    justifyContent: "center",
    alignItems: "center",
  },
  middleIcon: {
    width: 70,
    height: 70,
  },
});
