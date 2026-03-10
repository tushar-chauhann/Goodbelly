import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    Animated,
    Easing,
    StatusBar,
    Dimensions,
    Image,
} from "react-native";
import tw from "twrnc";
import Ionicons from "react-native-vector-icons/Ionicons";

const { width, height } = Dimensions.get("window");

/**
 * ModeSwitchTransition - Reverted to previous stable version with Shared Motion
 */
const ModeSwitchTransition = ({ visible, buttonRect, mode = 'consultant', onComplete }) => {
    // Label state to fix Invariant Violation
    const [label, setLabel] = useState(mode === 'consultant' ? 'OFF' : 'AUTO');

    // Animation Values
    const motionAnim = useRef(new Animated.Value(0)).current;
    const thumbAnim = useRef(new Animated.Value(mode === 'consultant' ? 0 : 1)).current;

    const titleOpacity = useRef(new Animated.Value(0)).current;
    const titleScale = useRef(new Animated.Value(0.3)).current;
    const heartBeat = useRef(new Animated.Value(1)).current;

    // Feature item animations
    const feature1Anim = useRef(new Animated.Value(0)).current;
    const feature2Anim = useRef(new Animated.Value(0)).current;
    const feature3Anim = useRef(new Animated.Value(0)).current;
    const andMoreAnim = useRef(new Animated.Value(0)).current;

    // Exit phase
    const exitAnim = useRef(new Animated.Value(1)).current;
    const spinAnim = useRef(new Animated.Value(0)).current;

    const isConsultant = mode === 'consultant';
    const bgColor = '#121912'; // Zomato Dark Olive
    const primaryColor = '#B1FF33'; // Zomato Neon Green

    useEffect(() => {
        if (visible) {
            // Reset
            setLabel(isConsultant ? 'OFF' : 'AUTO');
            motionAnim.setValue(0);
            thumbAnim.setValue(isConsultant ? 0 : 1);
            titleOpacity.setValue(0);
            titleScale.setValue(0.3);
            feature1Anim.setValue(0);
            feature2Anim.setValue(0);
            feature3Anim.setValue(0);
            andMoreAnim.setValue(0);
            exitAnim.setValue(1);
            heartBeat.setValue(1);

            // Sequence: Shared Motion -> Title -> Features
            Animated.sequence([
                // 1. Move to Center (Shared Motion)
                Animated.timing(motionAnim, {
                    toValue: 1,
                    duration: 400,
                    easing: Easing.bezier(0.19, 1, 0.22, 1),
                    useNativeDriver: true,
                }),
                // 2. Switch Toggle State
                Animated.parallel([
                    Animated.timing(thumbAnim, {
                        toValue: isConsultant ? 1 : 0,
                        duration: 300,
                        easing: Easing.out(Easing.back(1.5)),
                        useNativeDriver: true,
                    }),
                    // Update label state halfway
                    Animated.timing(new Animated.Value(0), { toValue: 1, duration: 150, useNativeDriver: true }).start(() => {
                        setLabel(isConsultant ? 'ON' : 'AUTO');
                    }),
                ]),
                // 3. Title Reveal
                Animated.parallel([
                    Animated.timing(motionAnim, { toValue: 1.5, duration: 300, useNativeDriver: true }), // Toggle fades
                    Animated.timing(titleOpacity, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true }),
                    Animated.spring(titleScale, { toValue: 1, friction: 7, tension: 60, delay: 100, useNativeDriver: true }),
                ]),
                // 4. Staggered Features
                Animated.stagger(120, [
                    Animated.spring(feature1Anim, { toValue: 1, friction: 6, useNativeDriver: true }),
                    Animated.spring(feature2Anim, { toValue: 1, friction: 6, useNativeDriver: true }),
                    Animated.spring(feature3Anim, { toValue: 1, friction: 6, useNativeDriver: true }),
                ]),
                // 5. AND MORE
                Animated.timing(andMoreAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.delay(800),
                // 6. Exit to loading screen
                Animated.timing(exitAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]).start(() => {
                onComplete && onComplete();
            });

            // Heartbeat Pulse
            Animated.loop(
                Animated.sequence([
                    Animated.timing(heartBeat, { toValue: 1.2, duration: 150, useNativeDriver: true }),
                    Animated.timing(heartBeat, { toValue: 1, duration: 150, useNativeDriver: true }),
                    Animated.timing(heartBeat, { toValue: 1.1, duration: 100, useNativeDriver: true }),
                    Animated.timing(heartBeat, { toValue: 1, duration: 600, useNativeDriver: true }),
                ])
            ).start();

            // Exit Spinner Rotation
            Animated.loop(
                Animated.timing(spinAnim, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })
            ).start();
        }
    }, [visible]);

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    if (!visible || !buttonRect) return null;

    // Motion calculations for Shared-Element style
    const centerX = width / 2 - 35; // Toggle width 70
    const centerY = height / 2 - 55; // Toggle height 110

    const translateX = motionAnim.interpolate({
        inputRange: [0, 1, 1.5],
        outputRange: [buttonRect.x, centerX, centerX],
    });

    const translateY = motionAnim.interpolate({
        inputRange: [0, 1, 1.5],
        outputRange: [buttonRect.y, centerY, centerY],
    });

    const scale = motionAnim.interpolate({
        inputRange: [0, 1, 1.5],
        outputRange: [buttonRect.width / 70, 1, 1.2],
    });

    const toggleOpacity = motionAnim.interpolate({
        inputRange: [0, 1, 1.5],
        outputRange: [1, 1, 0],
    });

    // Branding configuration
    const titleText = isConsultant ? 'CONSULTANT' : 'USER';
    const featureData = isConsultant
        ? [
            { top: 'MANAGE YOUR', bottom: 'BOOKINGS', side: 'left', img: require('../assets/LoginFruits.png') },
            { top: 'GROW YOUR', bottom: 'CLIENTELE', side: 'right', img: require('../assets/LoginFruits.png') },
            { top: 'TRACK YOUR', bottom: 'REVENUE', side: 'left', img: require('../assets/LoginFruits.png') },
        ]
        : [
            { top: 'HIGH PROTEIN', bottom: 'RATIO', side: 'left', img: require('../assets/LoginFruits.png') },
            { top: 'COMPLEX', bottom: 'CARBS', side: 'right', img: require('../assets/LoginFruits.png') },
            { top: 'USER', bottom: 'FLOW', side: 'left', img: require('../assets/LoginFruits.png') },
        ];

    const featureAnims = [feature1Anim, feature2Anim, feature3Anim];

    return (
        <View style={tw`absolute inset-0 z-50`}>
            <StatusBar barStyle="light-content" backgroundColor={bgColor} />

            <Animated.View style={[tw`flex-1`, { backgroundColor: bgColor, opacity: exitAnim }]}>

                <View style={tw`flex-1 justify-center items-center`}>

                    {/* Shared Motion Toggle Pill */}
                    <Animated.View style={{
                        position: 'absolute',
                        left: 0, top: 0,
                        opacity: toggleOpacity,
                        transform: [{ translateX }, { translateY }, { scale }],
                        alignItems: 'center',
                        zIndex: 40
                    }}>
                        <Animated.View style={{
                            width: 70, height: 110, borderRadius: 35,
                            backgroundColor: thumbAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['rgba(0,0,0,0.6)', primaryColor]
                            }),
                            justifyContent: 'center', alignItems: 'center',
                            borderWidth: 2, borderColor: primaryColor,
                            shadowColor: primaryColor, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5
                        }}>
                            {/* OFF/ON Label Top */}
                            <Animated.Text style={{
                                fontSize: 13, fontWeight: '900', letterSpacing: 1, marginBottom: 8,
                                color: thumbAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [primaryColor, bgColor]
                                })
                            }}>
                                {label}
                            </Animated.Text>

                            {/* Center Thumb Icon */}
                            <Animated.View style={{
                                width: 48, height: 48, borderRadius: 24,
                                backgroundColor: bgColor,
                                justifyContent: 'center', alignItems: 'center',
                                transform: [{
                                    translateY: thumbAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, -10]
                                    })
                                }]
                            }}>
                                <Ionicons
                                    name={isConsultant ? "briefcase" : "person"}
                                    size={28}
                                    color={primaryColor}
                                />
                            </Animated.View>

                            {/* Bottom Label (ON for User mode) */}
                            <Animated.Text style={{
                                fontSize: 13, fontWeight: '900', letterSpacing: 1, marginTop: 8,
                                color: thumbAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [primaryColor, bgColor]
                                })
                            }}>
                                {isConsultant ? '' : 'ON'}
                            </Animated.Text>
                        </Animated.View>
                    </Animated.View>

                    {/* Mode Title (Reveals after Toggle morphs) */}
                    <Animated.View style={{
                        position: 'absolute', top: height * 0.2,
                        opacity: titleOpacity,
                        transform: [{ scale: titleScale }],
                        alignItems: 'center', zIndex: 50
                    }}>
                        <Text style={{ fontSize: 32, fontStyle: 'italic', fontWeight: '300', color: primaryColor, letterSpacing: 4 }}>
                            {titleText}
                        </Text>
                        <View style={tw`flex-row items-center`}>
                            <Text style={{ fontSize: 62, fontWeight: '900', color: primaryColor }}>M</Text>
                            <Animated.View style={{ transform: [{ scale: heartBeat }], paddingHorizontal: 4 }}>
                                <View style={{
                                    width: 52, height: 52, borderRadius: 26, backgroundColor: `${primaryColor}30`,
                                    justifyContent: 'center', alignItems: 'center'
                                }}>
                                    <Ionicons name={isConsultant ? "pulse" : "person"} size={36} color={primaryColor} />
                                </View>
                            </Animated.View>
                            <Text style={{ fontSize: 62, fontWeight: '900', color: primaryColor }}>DE</Text>
                        </View>
                    </Animated.View>

                    {/* List of Features (Staggered Intro) */}
                    <View style={[tw`w-full px-8`, { marginTop: height * 0.22 }]}>
                        {featureData.map((item, index) => {
                            const isLeft = item.side === 'left';
                            const anim = featureAnims[index];
                            return (
                                <Animated.View key={index} style={{
                                    flexDirection: 'row', alignItems: 'center', marginBottom: index === 2 ? 0 : 35,
                                    opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [isLeft ? -100 : 100, 0] }) }]
                                }}>
                                    {isLeft ? (
                                        <>
                                            <View style={tw`shadow-2xl rounded-full overflow-hidden border-2 border-[${primaryColor}]`}>
                                                <Image source={item.img} style={{ width: 90, height: 90, borderRadius: 45 }} />
                                            </View>
                                            <View style={tw`ml-6`}>
                                                <Text style={{ color: primaryColor, fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>{item.top}</Text>
                                                <Text style={{ color: primaryColor, fontSize: 32, fontWeight: '900', fontStyle: 'italic' }}>{item.bottom}</Text>
                                            </View>
                                        </>
                                    ) : (
                                        <>
                                            <View style={tw`mr-6 items-end flex-1`}>
                                                <Text style={{ color: primaryColor, fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>{item.top}</Text>
                                                <Text style={{ color: primaryColor, fontSize: 32, fontWeight: '900', fontStyle: 'italic' }}>{item.bottom}</Text>
                                            </View>
                                            <View style={tw`shadow-2xl rounded-full overflow-hidden border-2 border-[${primaryColor}]`}>
                                                <Image source={item.img} style={{ width: 90, height: 90, borderRadius: 45 }} />
                                            </View>
                                        </>
                                    )}
                                </Animated.View>
                            );
                        })}

                        {/* ... AND MORE Footer */}
                        <Animated.View style={{ opacity: andMoreAnim, marginTop: 30, alignItems: 'center' }}>
                            <Text style={{ color: primaryColor, fontSize: 24, fontWeight: '900', fontStyle: 'italic', letterSpacing: 3 }}>
                                ... AND MORE
                            </Text>
                        </Animated.View>
                    </View>
                </View>
            </Animated.View>

            {/* Exit/Spinner Overlay */}
            <Animated.View style={[tw`absolute inset-0 bg-white justify-center items-center`, {
                opacity: exitAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
            }]} pointerEvents="none">
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <View style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 5, borderColor: '#F0F0F0', borderTopColor: '#E23744' }} />
                </Animated.View>
                <Text style={tw`mt-6 text-gray-500 font-bold text-xl`}>
                    Switching {isConsultant ? 'to' : 'off'} {isConsultant ? 'Consultant' : 'User'} Mode
                </Text>
            </Animated.View>
        </View>
    );
};

export default ModeSwitchTransition;
