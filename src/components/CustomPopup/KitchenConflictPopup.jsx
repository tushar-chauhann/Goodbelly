import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
} from "react-native";
import { fontStyles } from "../../utils/fontStyles";
import Ionicons from "react-native-vector-icons/Ionicons";

const { width, height } = Dimensions.get("window");

const COLORS = {
  primary: "#5F7F67",
  primaryDark: "#6B9080",
  background: "#FFFFFF",
  text: "#111827",
  textLight: "#6B7280",
  border: "#E5E7EB",
  warning: "#F59E0B",
};

const KitchenConflictPopup = ({
  visible,
  onClose,
  message = "You already have items from different kitchens in your cart. Please complete those orders first or remove those items.",
  onViewCart,
}) => {
  const handleViewCart = () => {
    onClose?.();
    onViewCart?.();
  };

  const handleCancel = () => {
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="restaurant" size={32} color={COLORS.warning} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Kitchen Conflict</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleViewCart}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>View Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 24, // Increased from 18 to 24
    width: width * 0.8,
    maxWidth: 320,
    minHeight: 220, // Added minimum height
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    marginBottom: 14, // Increased from 10 to 14
  },
  title: {
    ...fontStyles.headingS,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10, // Increased from 6 to 10
    fontWeight: "700",
    color: COLORS.warning,
  },
  message: {
    ...fontStyles.body,
    fontSize: 12,
    textAlign: "center",
    color: COLORS.textLight,
    marginBottom: 20, // Increased from 16 to 20
    lineHeight: 16,
  },
  // ... rest of the styles remain the same
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 8,
  },
  button: {
    flex: 1,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  cancelButtonText: {
    ...fontStyles.bodyBold,
    color: COLORS.text,
    fontSize: 12,
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  confirmButtonText: {
    ...fontStyles.bodyBold,
    color: "#FFFFFF",
    fontSize: 12,
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});

export default KitchenConflictPopup;
