import { StyleSheet, Dimensions, PixelRatio, Platform } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Responsive font scale helper
const scaleFont = (size) => {
  const scale = SCREEN_WIDTH / 375; // Standard width based on iPhone X/11/12/13
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  }
};

// Font Families
const fontFamilies = {
  primary: {
    light: "Roboto-Light",
    regular: "Roboto-Regular",
    medium: "Roboto-Medium",
    bold: "Roboto-Bold",
    black: "Roboto-Black",
    italic: "Roboto-Italic",
  },
  secondary: {
    regular: "RobotoSlab-Regular",
    medium: "RobotoSlab-Medium",
    bold: "RobotoSlab-Bold",
  }
};

// Font Sizes
const fontSizes = {
  xs: scaleFont(10),
  s: scaleFont(12),
  m: scaleFont(14),
  l: scaleFont(16),
  xl: scaleFont(18),
  xxl: scaleFont(20),
  xxxl: scaleFont(24),
  display: scaleFont(30),
};

export const fontStyles = StyleSheet.create({
  /* ---------------- HEADINGS ---------------- */
  headingXL: {
    fontFamily: fontFamilies.secondary.medium,
    fontSize: fontSizes.display,
    lineHeight: fontSizes.display * 1.2,
    fontWeight: "500",
    letterSpacing: 0,
    color: "#111827",
  },

  headingL: {
    fontFamily: fontFamilies.secondary.medium,
    fontSize: fontSizes.xxxl,
    lineHeight: fontSizes.xxxl * 1.3,
    fontWeight: "500",
    letterSpacing: 0,
    color: "#111827",
  },

  headingM: {
    fontFamily: fontFamilies.secondary.medium,
    fontSize: fontSizes.xxl,
    lineHeight: fontSizes.xxl * 1.3,
    fontWeight: "500",
    letterSpacing: 0,
    color: "#111827",
  },

  headingS: {
    fontFamily: fontFamilies.secondary.medium,
    fontSize: fontSizes.xl,
    lineHeight: fontSizes.xl * 1.4,
    fontWeight: "600",
    letterSpacing: 0,
    color: "#111827",
  },

  headingXS: {
    fontFamily: fontFamilies.secondary.medium,
    fontSize: fontSizes.l,
    lineHeight: fontSizes.l * 1.4,
    fontWeight: "500",
    letterSpacing: 0,
    color: "#111827",
  },

  // Kept for backward compatibility
  headingItalic: {
    fontFamily: fontFamilies.secondary.medium,
    fontSize: fontSizes.xl,
    lineHeight: fontSizes.xl * 1.4,
    fontWeight: "500",
    letterSpacing: 0,
    // fontStyle: 'italic', // Removed to ensure consistency with Android/iOS (user prefers non-italic look)
    color: "#111827",
  },

  /* ---------------- DESCRIPTION ---------------- */
  description: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: fontSizes.s,
    lineHeight: fontSizes.s * 1.5,
    fontWeight: "400",
    letterSpacing: 0,
    color: "#4B5563",
  },

  /* ---------------- TAB BAR LABEL ---------------- */
  tabLabel: {
    fontFamily: fontFamilies.primary.medium,
    fontSize: fontSizes.xs,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  caption: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.4,
    color: "#6B7280",
  },

  /* ---------------- BODY ---------------- */
  bodyBold: {
    fontFamily: fontFamilies.primary.bold,
    fontSize: fontSizes.m,
    lineHeight: fontSizes.m * 1.5,
    fontWeight: "700",
    color: "#1F2937",
  },

  bodyMedium: {
    fontFamily: fontFamilies.primary.medium,
    fontSize: fontSizes.m,
    lineHeight: fontSizes.m * 1.5,
    fontWeight: "500",
    color: "#1F2937",
  },

  body: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: fontSizes.m,
    lineHeight: fontSizes.m * 1.5,
    fontWeight: "400",
    color: "#1F2937",
  },

  bodyRegular: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: fontSizes.m,
    lineHeight: fontSizes.m * 1.5,
    fontWeight: "400",
    color: "#1F2937",
  },

  bodyLight: {
    fontFamily: fontFamilies.primary.light,
    fontSize: fontSizes.m,
    lineHeight: fontSizes.m * 1.5,
    fontWeight: "400",
    color: "#1F2937",
  },

  /* ---------------- SMALL ---------------- */
  smallBold: {
    fontFamily: fontFamilies.primary.bold,
    fontSize: fontSizes.s,
    lineHeight: fontSizes.s * 1.5,
    fontWeight: "700",
    color: "#1F2937",
  },

  smallRegular: {
    fontFamily: fontFamilies.primary.regular,
    fontSize: fontSizes.s,
    lineHeight: fontSizes.s * 1.5,
    fontWeight: "400",
    color: "#1F2937",
  },

  smallLight: {
    fontFamily: fontFamilies.primary.light,
    fontSize: fontSizes.s,
    lineHeight: fontSizes.s * 1.5,
    fontWeight: "400",
    color: "#1F2937",
  },

  italic: {
    fontStyle: "italic",
  },
});
