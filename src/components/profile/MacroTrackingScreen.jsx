import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Image,
    ActivityIndicator,
    StatusBar,
    Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";
import { authService } from "../../services/authService";

const { width } = Dimensions.get("window");
const CARD_GAP = 12;
const CARD_WIDTH = (width - 32 - CARD_GAP) / 2; // 16px padding on each side

/* ─── Routine Card ─── */
const RoutineCard = ({ title, value, iconName, iconColor, bgColor, progress = 0.6 }) => (
    <View
        style={[
            tw`rounded-2xl p-4`,
            {
                backgroundColor: bgColor,
                width: CARD_WIDTH,
                minHeight: 110,
            },
        ]}
    >
        <View style={tw`flex-row items-center justify-between mb-2`}>
            <Text style={[fontStyles.bodyBold, { color: "#1F2937", fontSize: 15 }]}>
                {title}
            </Text>
            <Ionicons name={iconName} size={24} color={iconColor} />
        </View>

        <Text style={[fontStyles.headingM, { color: "#1F2937", fontSize: 18 }]}>
            {value}
        </Text>

        {/* Stats Bar (Progress Bar) */}
        <View style={[tw`mt-3 bg-white bg-opacity-50 rounded-full`, { height: 6, overflow: 'hidden' }]}>
            <View
                style={{
                    height: '100%',
                    width: `${progress * 100}%`,
                    backgroundColor: iconColor,
                    borderRadius: 3,
                }}
            />
        </View>
    </View>
);

/* ─── Meal Card ─── */
const MealCard = ({ order }) => {
    const firstItem = order.items?.[0];
    const productImage = firstItem?.product?.images?.[0]?.url || firstItem?.product?.image;

    return (
        <View style={tw`flex-row items-center bg-white rounded-xl p-3 mb-3 border border-gray-100`}>
            <View style={[tw`rounded-lg overflow-hidden bg-gray-100 mr-3`, { width: 50, height: 50 }]}>
                {productImage ? (
                    <Image source={{ uri: productImage }} style={{ width: 50, height: 50 }} />
                ) : (
                    <View style={tw`flex-1 items-center justify-center`}>
                        <Ionicons name="fast-food-outline" size={20} color="#9CA3AF" />
                    </View>
                )}
            </View>
            <View style={tw`flex-1`}>
                <Text style={[fontStyles.bodyBold, { fontSize: 14, color: "#1F2937" }]} numberOfLines={1}>
                    {firstItem?.product?.name || "Order Item"}
                </Text>
                <Text style={[fontStyles.bodyMedium, { fontSize: 12, color: "#6B7280", marginTop: 2 }]}>
                    Delivered • Qty: {firstItem?.quantity || 1}
                </Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        </View>
    );
};

/* ─── Main Screen ─── */
const MacroTrackingScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const [orders, setOrders] = useState([]);
    const [macroTotals, setMacroTotals] = useState({
        protein: 0,
        kcal: 0,
        carbs: 0,
        fat: 0
    });
    const [loading, setLoading] = useState(true);

    // Daily Targets for progress bars
    const TARGETS = {
        protein: 150,
        carbs: 300,
        kcal: 2500,
        fat: 80
    };

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await authService.getOrders();
                const ordersData = response?.data || (Array.isArray(response) ? response : []);
                const dataArray = Array.isArray(ordersData) ? ordersData : [];

                // Filter for delivered orders
                const delivered = dataArray.filter(
                    o => o.status?.toLowerCase() === "delivered"
                );

                // Calculate macro totals
                let p = 0, k = 0, c = 0, f = 0;
                delivered.forEach(order => {
                    order.items?.forEach(item => {
                        const nut = item.product?.Nutrition || item.product?.nutrition;
                        const qty = item.quantity || 1;
                        if (nut) {
                            p += (Number(nut.protein) || 0) * qty;
                            k += (Number(nut.calories || nut.kcal || nut.Kcal) || 0) * qty;
                            c += (Number(nut.carbs) || 0) * qty;
                            f += (Number(nut.fats || nut.fat) || 0) * qty;
                        }
                    });
                });

                setMacroTotals({ protein: p, kcal: k, carbs: c, fat: f });
                setOrders(delivered);
            } catch (err) {
                console.error("Error fetching orders for macro tracking:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const routineData = [
        {
            title: "Protein",
            value: `${macroTotals.protein.toFixed(0)}g`,
            iconName: "fitness",
            iconColor: "#3B82F6",
            bgColor: "#EBF5FB",
            progress: Math.min(macroTotals.protein / TARGETS.protein, 1)
        },
        {
            title: "Carbs",
            value: `${macroTotals.carbs.toFixed(0)}g`,
            iconName: "leaf",
            iconColor: "#10B981",
            bgColor: "#EBF5FB",
            progress: Math.min(macroTotals.carbs / TARGETS.carbs, 1)
        },
        {
            title: "Kcal",
            value: `${macroTotals.kcal.toFixed(0)} Cal`,
            iconName: "flame",
            iconColor: "#EF4444",
            bgColor: "#FDEDEC",
            progress: Math.min(macroTotals.kcal / TARGETS.kcal, 1)
        },
        {
            title: "Fat",
            value: `${macroTotals.fat.toFixed(0)}g`,
            iconName: "water",
            iconColor: "#F59E0B",
            bgColor: "#FDEDEC",
            progress: Math.min(macroTotals.fat / TARGETS.fat, 1)
        },
    ];

    return (
        <View style={[tw`flex-1 bg-white`, { paddingTop: insets.top, paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0 }]}>
            <StatusBar barStyle="dark-content" backgroundColor="white" />
            {/* ─── Header ─── */}
            <View style={tw`flex-row items-center px-4 py-3 border-b border-gray-100`}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={tw`p-1 mr-3`}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={[fontStyles.headingS, { fontSize: 18 }]}>
                    Macro Tracking
                </Text>
            </View>

            {loading ? (
                <View style={tw`flex-1 justify-center items-center`}>
                    <ActivityIndicator size="large" color="#5F7F67" />
                    <Text style={[fontStyles.bodyMedium, tw`mt-4 text-gray-500`]}>Fetching your nutrition data...</Text>
                </View>
            ) : orders.length > 0 ? (
                <ScrollView
                    style={tw`flex-1`}
                    contentContainerStyle={tw`px-4 pt-5 pb-10`}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ─── Macro's Dashboard ─── */}
                    <View style={tw`flex-row items-center justify-between mb-4`}>
                        <Text style={[fontStyles.headingS, { fontSize: 20 }]}>
                            Macro's Dashboard
                        </Text>
                    </View>

                    {/* 2×2 Grid */}
                    <View style={{ gap: CARD_GAP }}>
                        <View style={{ flexDirection: "row", gap: CARD_GAP }}>
                            <RoutineCard {...routineData[0]} />
                            <RoutineCard {...routineData[1]} />
                        </View>
                        <View style={{ flexDirection: "row", gap: CARD_GAP }}>
                            <RoutineCard {...routineData[2]} />
                            <RoutineCard {...routineData[3]} />
                        </View>
                    </View>

                    {/* ─── Your Day meals ─── */}
                    <View style={tw`mt-8`}>
                        <View style={tw`flex-row items-center justify-between mb-4`}>
                            <Text style={[fontStyles.headingS, { fontSize: 20 }]}>
                                Your Day meals
                            </Text>
                            <Text style={[fontStyles.bodyMedium, { color: "#10B981", fontSize: 12 }]}>
                                {orders.length} Delivered
                            </Text>
                        </View>

                        {orders.map((order, index) => (
                            <MealCard key={order.id || order._id || index} order={order} />
                        ))}
                    </View>
                </ScrollView>
            ) : (
                <View style={tw`flex-1 justify-center items-center px-10`}>
                    <View style={tw`bg-gray-50 p-8 rounded-full mb-6`}>
                        <Ionicons name="restaurant" size={60} color="#D1D5DB" />
                    </View>
                    <Text style={[fontStyles.headingS, tw`text-center text-gray-800 mb-2`]}>
                        No Delivered Orders Found
                    </Text>
                    <Text style={[fontStyles.bodyMedium, tw`text-center text-gray-500 mb-8`]}>
                        Macro tracking and meal history will appear here once your orders are delivered.
                    </Text>
                    <TouchableOpacity
                        style={[tw`bg-[#5F7F67] px-8 py-3 rounded-full shadow-sm`]}
                        onPress={() => navigation.navigate("SeeMoreButton")}
                    >
                        <Text style={[fontStyles.bodyBold, tw`text-white`]}>Order Now</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

export default MacroTrackingScreen;
