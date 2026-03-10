import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, Pressable } from 'react-native';
import tw from 'twrnc';
import { fontStyles } from '../../utils/fontStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ScoopTooltip = ({ visible, data, onClose }) => {
    const insets = useSafeAreaInsets();
    if (!visible || !data) return null;

    const { heading, content, sources, proTip } = data;

    // Responsive bottom position calculation
    // 135 was the user's preferred height on their device.
    // We adjust it by the safe area to keep it consistent across devices.
    const bottomPosition = 120 + (insets.bottom > 0 ? insets.bottom / 2 : 0);

    return (
        <View style={styles.overlayContainer}>
            {/* Backdrop: Tapping anywhere else closes the bubble */}
            <Pressable style={styles.backdrop} onPress={onClose} />

            {/* Bubble Container (positioned specifically) */}
            <View style={[styles.bubbleContainer, { bottom: bottomPosition }]}>
                <View style={styles.bubble}>
                    {/* Header (No more X button) */}
                    <View style={tw`mb-2.5 px-1`}>
                        <Text style={[fontStyles.headingS, tw`text-black text-base font-bold`]}>
                            Goodbelly Scoop
                        </Text>
                    </View>

                    {/* Content Area */}
                    <ScrollView
                        style={styles.scrollView}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={tw`pb-2`}
                    >
                        {/* Heading */}
                        {heading && (
                            <Text style={[fontStyles.headingS, tw`text-black text-sm font-semibold mb-2`]}>
                                {heading}
                            </Text>
                        )}

                        {/* Main Content */}
                        {content && (
                            <Text style={[fontStyles.body, tw`text-slate-700 text-[13px] leading-5 mb-4`]}>
                                {content}
                            </Text>
                        )}

                        {/* Sources Section */}
                        {sources && (
                            <View style={tw`mb-3`}>
                                <Text style={[fontStyles.bodyBold, tw`text-slate-500 text-[11px] uppercase mb-1`]}>
                                    Sources:
                                </Text>
                                {sources.split(/,|\n|\\n|\/n/).map((s, i) => {
                                    const source = s.trim();
                                    if (!source) return null;
                                    return (
                                        <Text key={i} style={[fontStyles.body, tw`text-slate-500 text-[11px] leading-4 mb-0.5`]}>
                                            {source}
                                        </Text>
                                    );
                                })}
                            </View>
                        )}

                        {/* Pro Tip Section */}
                        {proTip && (
                            <View style={tw`bg-yellow-50 rounded-lg p-2.5 border-l-3 border-yellow-400`}>
                                <Text style={[fontStyles.bodyBold, tw`text-yellow-700 text-[11px] font-bold mb-1`]}>
                                    Pro tip:
                                </Text>
                                <Text style={[fontStyles.body, tw`text-slate-700 text-[12px] leading-4`]}>
                                    {proTip}
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Pointer/Arrow */}
                    <View style={styles.arrow} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
    },
    bubbleContainer: {
        position: 'absolute',
        // bottom position is now dynamic
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    bubble: {
        width: SCREEN_WIDTH * 0.9,
        maxWidth: 360,
        backgroundColor: '#FFFFFF', // White background
        borderRadius: 16,
        padding: 12,
        paddingBottom: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 12,
        maxHeight: SCREEN_HEIGHT * 0.5,
        borderWidth: 1,
        borderColor: '#F1F5F9', // Light gray border
    },
    scrollView: {
        maxHeight: SCREEN_HEIGHT * 0.45,
    },
    arrow: {
        position: 'absolute',
        bottom: -8,
        alignSelf: 'center',
        width: 0,
        height: 0,
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderTopWidth: 10,
        borderStyle: 'solid',
        backgroundColor: 'transparent',
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#FFFFFF',
    }
});

export default ScoopTooltip;
