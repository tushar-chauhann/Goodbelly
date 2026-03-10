import React, { useEffect, useCallback } from 'react';
import { View, Text, Modal, Dimensions, StyleSheet, StatusBar } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSpring,
    withDelay,
    Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CENTER_X = SCREEN_WIDTH / 2;
const CENTER_Y = SCREEN_HEIGHT / 2;

// Arc ring component — a partial circle that rotates continuously
const RotatingArc = ({ radius, thickness, arcLength, color, duration, clockwise, delay = 0, opacity = 0.6, startAngle = 0 }) => {
    const rotation = useSharedValue(startAngle);

    useEffect(() => {
        rotation.value = withDelay(
            delay,
            withRepeat(
                withTiming(startAngle + (clockwise ? 360 : -360), {
                    duration,
                    easing: Easing.linear,
                }),
                -1 // infinite
            )
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    const diameter = radius * 2;

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    width: diameter,
                    height: diameter,
                    borderRadius: radius,
                    borderWidth: thickness,
                    borderColor: 'transparent',
                    borderTopColor: color,
                    borderRightColor: arcLength > 90 ? color : 'transparent',
                    borderBottomColor: arcLength > 180 ? color : 'transparent',
                    borderLeftColor: arcLength > 270 ? color : 'transparent',
                    opacity,
                    left: CENTER_X - radius,
                    top: CENTER_Y - radius,
                },
                animatedStyle,
            ]}
        />
    );
};

// Orbiting food icon around the center
const OrbitingFood = ({ emoji, radius, duration, startAngle, size = 32 }) => {
    const angle = useSharedValue(startAngle);

    useEffect(() => {
        angle.value = withRepeat(
            withTiming(startAngle + 360, {
                duration,
                easing: Easing.linear,
            }),
            -1
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        const rad = (angle.value * Math.PI) / 180;
        return {
            transform: [
                { translateX: CENTER_X - size / 2 + Math.cos(rad) * radius },
                { translateY: CENTER_Y - size / 2 + Math.sin(rad) * radius - 40 },
            ],
        };
    });

    return (
        <Animated.View style={[{ position: 'absolute', width: size, height: size }, animatedStyle]}>
            <Text style={{ fontSize: size - 6 }}>{emoji}</Text>
        </Animated.View>
    );
};

const VegModeOverlay = ({ visible, isVeg, onDismiss }) => {
    // Center circle scale animation
    const centerScale = useSharedValue(0);
    const centerOpacity = useSharedValue(0);
    // Text fade
    const textOpacity = useSharedValue(0);
    const textTranslateY = useSharedValue(20);

    const handleDismiss = useCallback(() => {
        if (onDismiss) onDismiss();
    }, [onDismiss]);

    useEffect(() => {
        if (visible) {
            // Reset values
            centerScale.value = 0;
            centerOpacity.value = 0;
            textOpacity.value = 0;
            textTranslateY.value = 20;

            // Animate center circle in
            centerScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 100 }));
            centerOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));

            // Animate text in
            textOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
            textTranslateY.value = withDelay(600, withSpring(0, { damping: 15 }));

            // Auto-dismiss after 2.5 seconds
            const timer = setTimeout(() => {
                centerScale.value = withTiming(0.5, { duration: 300 });
                centerOpacity.value = withTiming(0, { duration: 300 });
                textOpacity.value = withTiming(0, { duration: 200 });

                setTimeout(() => {
                    handleDismiss();
                }, 350);
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    const centerCircleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: centerScale.value }],
        opacity: centerOpacity.value,
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
        transform: [{ translateY: textTranslateY.value }],
    }));

    if (!visible) return null;

    const accentColor = isVeg ? '#6A8B7A' : '#888888';
    const bgColor = isVeg ? '#0F1F17' : '#1A1A1A';
    const ringColor = isVeg ? '#6A8B7A' : '#555555';
    const lightRingColor = isVeg ? '#8AAF9A' : '#777777';
    const thinRingColor = isVeg ? 'rgba(106, 139, 122, 0.3)' : 'rgba(150, 150, 150, 0.25)';
    const statusText = isVeg ? 'Switching on\nveg mode for you' : 'Switching off\nveg mode for you';

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true}
            onRequestClose={handleDismiss}
        >
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <View style={[styles.overlay, { backgroundColor: bgColor }]}>

                {/* === CONCENTRIC ROTATING ARC RINGS === */}

                {/* Ring 1: Outermost — from top, slow */}
                <RotatingArc
                    radius={SCREEN_WIDTH * 1.1}
                    thickness={2}
                    arcLength={120}
                    color={thinRingColor}
                    duration={1200}
                    clockwise={true}
                    delay={0}
                    opacity={0.5}
                    startAngle={0}
                />

                {/* Ring 2: Large — from bottom */}
                <RotatingArc
                    radius={SCREEN_WIDTH * 0.90}
                    thickness={2}
                    arcLength={90}
                    color={lightRingColor}
                    duration={1000}
                    clockwise={false}
                    delay={200}
                    opacity={0.4}
                    startAngle={180}
                />

                {/* Ring 3: Medium-large — from top */}
                <RotatingArc
                    radius={SCREEN_WIDTH * 0.70}
                    thickness={2}
                    arcLength={150}
                    color={ringColor}
                    duration={750}
                    clockwise={true}
                    delay={100}
                    opacity={0.55}
                    startAngle={30}
                />

                {/* Ring 4: Medium — from bottom */}
                <RotatingArc
                    radius={SCREEN_WIDTH * 0.50}
                    thickness={2}
                    arcLength={80}
                    color={lightRingColor}
                    duration={600}
                    clockwise={false}
                    delay={300}
                    opacity={0.5}
                    startAngle={210}
                />

                {/* Ring 5: Inner — from top */}
                <RotatingArc
                    radius={SCREEN_WIDTH * 0.30}
                    thickness={1.5}
                    arcLength={110}
                    color={ringColor}
                    duration={500}
                    clockwise={true}
                    delay={150}
                    opacity={0.45}
                    startAngle={-20}
                />




                {/* === CENTER CIRCLE — "100% VEG" BADGE === */}
                <View style={styles.centerCircleOuter}>
                    <View
                        style={[
                            styles.centerCircle,
                            {
                                borderColor: accentColor,
                                backgroundColor: isVeg ? 'rgba(13, 31, 13, 0.95)' : 'rgba(26, 26, 26, 0.95)',
                            },
                        ]}
                    >
                        <Text style={styles.percentText}>100%</Text>
                        <Text style={styles.vegText}>VEG</Text>
                    </View>
                </View>

                {/* === STATUS TEXT === */}
                <View style={styles.textContainer}>
                    <Text style={[styles.statusText, { color: isVeg ? 'rgba(106,139,122,0.7)' : 'rgba(180,180,180,0.6)' }]}>
                        {statusText}
                    </Text>
                </View>

            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerCircleOuter: {
        position: 'absolute',
        left: CENTER_X - 75,
        top: CENTER_Y - 75,
        width: 150,
        height: 150,
    },
    centerCircle: {
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    percentText: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: 1,
    },
    vegText: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: 2,
        marginTop: -2,
    },
    textContainer: {
        position: 'absolute',
        top: CENTER_Y + 110,
        alignSelf: 'center',
    },
    statusText: {
        fontSize: 18,
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 26,
        fontStyle: 'italic',
    },
});

export default VegModeOverlay;
