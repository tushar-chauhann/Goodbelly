// src/components/CustomPopup/CustomPopup.jsx
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

const { width } = Dimensions.get("window");

// Color scheme matching your project
const COLORS = {
  primary: "#5F7F67",
  background: "#FFFFFF",
  text: "#111827",
  textLight: "#6B7280",
  border: "#E5E7EB",
  error: "#EF4444",
  success: "#10B981",
};

const CustomPopup = ({
  visible,
  onClose,
  title,
  message,
  type = "info",
  showCancelButton = true,
  cancelText = "Cancel",
  confirmText = "OK",
  onConfirm,
  onCancel,
  iconName,
}) => {
  // Determine colors based on type
  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return {
          iconColor: COLORS.success,
          iconName: iconName || "checkmark-circle",
        };
      case "error":
        return {
          iconColor: COLORS.error,
          iconName: iconName || "close-circle",
        };
      case "warning":
        return {
          iconColor: "#F59E0B",
          iconName: iconName || "warning",
        };
      default: // info
        return {
          iconColor: COLORS.primary,
          iconName: iconName || "information-circle",
        };
    }
  };

  const typeStyles = getTypeStyles();

  const handleConfirm = () => {
    onClose?.();
    onConfirm?.();
  };

  const handleCancel = () => {
    onClose?.();
    onCancel?.();
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
          {/* Icon - Smaller */}
          <View style={styles.iconContainer}>
            <Ionicons
              name={typeStyles.iconName}
              size={32}
              color={typeStyles.iconColor}
            />
          </View>

          {/* Title - Smaller */}
          <Text style={styles.title}>{title}</Text>

          {/* Message - Smaller */}
          <Text style={styles.message}>{message}</Text>

          {/* Buttons - More compact */}
          <View style={styles.buttonContainer}>
            {showCancelButton && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
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
    borderRadius: 16,
    padding: 20,
    width: width * 0.8,
    maxWidth: 320,
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
    marginBottom: 12,
  },
  title: {
    ...fontStyles.headingS,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "600",
    color: COLORS.text,
  },
  message: {
    ...fontStyles.body,
    fontSize: 14,
    textAlign: "center",
    color: COLORS.textLight,
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#5F7F67", // Your primary color
  },
  confirmButton: {
    backgroundColor: "#DC2626", // Red color
  },
  cancelButtonText: {
    ...fontStyles.body,
    fontSize: 14,
    color: "#5F7F67", // Your primary color
    fontWeight: "500",
  },
  confirmButtonText: {
    ...fontStyles.bodyBold,
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});

export default CustomPopup;
