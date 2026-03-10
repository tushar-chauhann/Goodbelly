import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Dimensions,
    Image,
    TouchableWithoutFeedback,
    TextInput,
} from "react-native";
import { fontStyles } from "../../utils/fontStyles";
import Logo from "../../assets/logo.png";

const { width } = Dimensions.get("window");

const COLORS = {
    primary: "#5F7F67", // Theme color
    background: "#FFFFFF",
    text: "#111827",
    textLight: "#6B7280",
    border: "#E5E7EB",
};

const DeleteAccountPopup = ({ visible, onClose, onProceed }) => {
    const [feedback, setFeedback] = React.useState("");
    const [step, setStep] = React.useState(1);

    React.useEffect(() => {
        if (visible) {
            setStep(1);
            setFeedback("");
        }
    }, [visible]);

    const handleProceed = () => {
        if (step === 1) {
            setStep(2);
        } else {
            onProceed(feedback);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback onPress={() => { }}>
                        <View style={styles.container}>
                            {/* Logo */}
                            <View style={styles.iconContainer}>
                                <Image
                                    source={Logo}
                                    style={styles.logo}
                                    resizeMode="contain"
                                />
                            </View>

                            {step === 1 ? (
                                <>
                                    <Text style={styles.title}>
                                        Delete Goodbelly account across apps?
                                    </Text>

                                    <Text style={styles.message}>
                                        Once deleted, you'll lose access to the account and saved details
                                        across Goodbelly apps.
                                    </Text>

                                    <TextInput
                                        style={styles.input}
                                        placeholder="Please share your reason (Optional)"
                                        placeholderTextColor="#9CA3AF"
                                        value={feedback}
                                        onChangeText={setFeedback}
                                    />
                                </>
                            ) : (
                                <>
                                    <Text style={styles.title}>
                                        Confirm Deletion ?
                                    </Text>

                                    <Text style={styles.message}>
                                        Are you really want to delete account?
                                    </Text>
                                    {/* Spacer to maintain layout balance if needed, or just let it adjust */}
                                    <View style={{ marginBottom: 24 }} />
                                </>
                            )}

                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[styles.button, styles.cancelButton]}
                                    onPress={onClose}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.button, styles.proceedButton]}
                                    onPress={handleProceed}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.proceedButtonText}>
                                        {step === 1 ? "Proceed" : "Proceed"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
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
        padding: 24,
        width: width * 0.85,
        maxWidth: 340,
        alignItems: "flex-start", // Align text to left primarily, or center based on design. Image shows left aligned title/text.
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
        marginBottom: 16,
    },
    logo: {
        width: 45,
        height: 45,
    },
    title: {
        ...fontStyles.headingS,
        fontSize: 18,
        fontWeight: "700",
        color: "#000",
        marginBottom: 12,
        textAlign: "left",
    },
    message: {
        ...fontStyles.body,
        fontSize: 14,
        color: "#4B5563",
        marginBottom: 16, // Reduced margin
        lineHeight: 20,
        textAlign: "left",
    },
    input: {
        width: "100%",
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginBottom: 24,
        fontSize: 14,
        color: COLORS.text,
        backgroundColor: COLORS.background,
        ...fontStyles.body,
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        gap: 12,
    },
    button: {
        flex: 1,
        height: 48,
        borderRadius: 24, // Fully rounded buttons
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButton: {
        backgroundColor: "#EAF2EB", // Light theme background
    },
    proceedButton: {
        backgroundColor: COLORS.primary,
    },
    cancelButtonText: {
        ...fontStyles.bodyBold,
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: "600",
    },
    proceedButtonText: {
        ...fontStyles.bodyBold,
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "600",
    },
});

export default DeleteAccountPopup;
