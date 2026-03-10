import React from "react";
import { View, Text, TextInput, TouchableOpacity, Image, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { fontStyles } from "../../utils/fontStyles";
import { PASSWORD_MIN_LENGTH } from "../../constants/consultantOptions";

const PRIMARY_COLOR = "#5F7F67";

export default function StepProfile({
    formData,
    updateField,
    profileImageFile,
    setProfileImageFile,
}) {
    const passwordValid = formData.password && formData.password.length >= PASSWORD_MIN_LENGTH;

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission needed", "Please grant camera roll permissions");
                return;
            }

            // Fallback for MediaType (new) vs MediaTypeOptions (old) cleanup
            const mediaTypes = ImagePicker.MediaType
                ? ImagePicker.MediaType.Images
                : ImagePicker.MediaTypeOptions.Images;

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setProfileImageFile(result.assets[0]);
            }
        } catch (error) {
            console.error("Image Picker Error:", error);
            Alert.alert("Upload Error", "Failed to pick image. Please try again.");
        }
    };

    return (
        <View style={tw`gap-6`}>
            {/* Profile Photo */}
            <View style={tw`gap-2`}>
                <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>Profile photo *</Text>
                <View style={tw`flex-row items-center gap-4`}>
                    <TouchableOpacity
                        onPress={pickImage}
                        style={tw`border border-dashed border-gray-300 rounded-xl px-4 py-3`}
                    >
                        <Text style={[fontStyles.body, tw`text-gray-600 text-sm`]}>Upload image</Text>
                    </TouchableOpacity>
                    {profileImageFile && (
                        <Image
                            source={{ uri: profileImageFile.uri }}
                            style={tw`w-16 h-16 rounded-full border border-gray-200`}
                        />
                    )}
                </View>
                <Text style={[fontStyles.body, tw`text-gray-500 text-xs`]}>
                    JPG/PNG, up to ~2MB is ideal.
                </Text>
            </View>

            {/* Form Fields */}
            <View style={tw`gap-4`}>
                <View style={tw`gap-2`}>
                    <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>Full name *</Text>
                    <TextInput
                        style={tw`border border-gray-300 rounded-lg px-3 py-2.5 text-sm`}
                        placeholder="e.g. Dr. Meera Kapoor"
                        value={formData.fullName}
                        onChangeText={(text) => updateField("fullName", text)}
                    />
                </View>

                <View style={tw`gap-2`}>
                    <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>Email *</Text>
                    <TextInput
                        style={tw`border border-gray-300 rounded-lg px-3 py-2.5 text-sm`}
                        placeholder="name@email.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={formData.email}
                        onChangeText={(text) => updateField("email", text)}
                    />
                </View>

                <View style={tw`gap-2`}>
                    <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>Password *</Text>
                    <TextInput
                        style={tw`border border-gray-300 rounded-lg px-3 py-2.5 text-sm`}
                        placeholder="Create a password"
                        secureTextEntry
                        value={formData.password}
                        onChangeText={(text) => updateField("password", text)}
                    />
                    {!passwordValid && formData.password && (
                        <Text style={[fontStyles.body, tw`text-red-500 text-xs`]}>
                            At least {PASSWORD_MIN_LENGTH} characters required.
                        </Text>
                    )}
                </View>

                <View style={tw`gap-2`}>
                    <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>Phone *</Text>
                    <TextInput
                        style={tw`border border-gray-300 rounded-lg px-3 py-2.5 text-sm`}
                        placeholder="Mobile Number (10 digits)"
                        keyboardType="number-pad"
                        maxLength={10}
                        value={formData.phone}
                        onChangeText={(text) => updateField("phone", text.replace(/[^0-9]/g, ""))}
                    />
                </View>

                <View style={tw`gap-2`}>
                    <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>City *</Text>
                    <TextInput
                        style={tw`border border-gray-300 rounded-lg px-3 py-2.5 text-sm`}
                        placeholder="Where do you primarily consult from?"
                        value={formData.city}
                        onChangeText={(text) => updateField("city", text)}
                    />
                </View>

                <View style={tw`gap-2`}>
                    <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>Experience *</Text>
                    <TextInput
                        style={tw`border border-gray-300 rounded-lg px-3 py-2.5 text-sm`}
                        placeholder="e.g. 8+ years, 500+ clients"
                        value={formData.yearsExperience}
                        onChangeText={(text) => updateField("yearsExperience", text)}
                    />
                </View>

                <View style={tw`gap-2`}>
                    <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>Profile headline *</Text>
                    <TextInput
                        style={tw`border border-gray-300 rounded-lg px-3 py-2.5 text-sm`}
                        placeholder="One line hook for your profile"
                        value={formData.tagline}
                        onChangeText={(text) => updateField("tagline", text)}
                    />
                </View>

                <View style={tw`gap-2`}>
                    <Text style={[fontStyles.bodyBold, tw`text-gray-700 text-sm`]}>Your Credentials *</Text>
                    <TextInput
                        style={tw`border border-gray-300 rounded-lg px-3 py-2.5 text-sm`}
                        placeholder="e.g. Certifications, Awards, Recognitions"
                        value={formData.credentials}
                        onChangeText={(text) => updateField("credentials", text)}
                    />
                </View>
            </View>
        </View>
    );
}
