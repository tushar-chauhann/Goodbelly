import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import tw from "twrnc";
import { fontStyles } from "../../../utils/fontStyles";
import { authService } from "../../../services/authService";
import * as ImagePicker from "expo-image-picker";
import { DAYS_OF_WEEK, SLOT_OPTIONS, SPECIALIZATIONS } from "./ConsultantOptions";

const ConsultantProfileView = ({ consultant: initialConsultant, onLogout, onRefresh }) => {
    const [activeTab, setActiveTab] = useState(null); // null = main menu
    const [consultant, setConsultant] = useState(initialConsultant);
    const [isOnline, setIsOnline] = useState(initialConsultant?.isActive || false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form States
    const [profileForm, setProfileForm] = useState({
        name: initialConsultant?.name || "",
        phone: initialConsultant?.phone || "",
        tagline: initialConsultant?.tagline || "",
        experience: initialConsultant?.experience || "",
        specialization: initialConsultant?.specialization || "",
        credentials: initialConsultant?.credentials || "",
        bio: initialConsultant?.bio || "",
        password: "",
    });

    const [bankForm, setBankForm] = useState({
        accountHolderName: initialConsultant?.bankDetails?.accountHolderName || "",
        accountNumber: initialConsultant?.bankDetails?.accountNumber || "",
        ifscCode: initialConsultant?.bankDetails?.ifscCode || "",
        bankName: initialConsultant?.bankDetails?.bankName || "",
        accountType: initialConsultant?.bankDetails?.accountType || "Savings",
    });

    const [durations, setDurations] = useState(initialConsultant?.durations || []);
    const [availability, setAvailability] = useState(initialConsultant?.availability || []);
    const [bookings, setBookings] = useState([]);
    const [bookingsLoading, setBookingsLoading] = useState(false);

    const menuItems = [
        { id: "1", title: "Profile", icon: "person-outline", tab: "Profile" },
        { id: "2", title: "Bank Details", icon: "card-outline", tab: "Bank" },
        { id: "3", title: "Pricing", icon: "pricetag-outline", tab: "Pricing" },
        { id: "4", title: "Availability", icon: "calendar-outline", tab: "Availability" },
        { id: "5", title: "Bookings", icon: "clipboard-outline", tab: "Bookings" },
    ];

    useEffect(() => {
        if (activeTab === "Bookings") {
            fetchBookings();
        }
    }, [activeTab]);

    const fetchBookings = async () => {
        try {
            setBookingsLoading(true);
            const response = await authService.getConsultantBookings();
            setBookings(response?.data || response || []);
        } catch (error) {
            console.error("Error fetching bookings:", error);
        } finally {
            setBookingsLoading(false);
        }
    };

    const handleToggleOnline = async () => {
        try {
            const newStatus = !isOnline;
            setIsOnline(newStatus);
            const formData = new FormData();
            formData.append("isActive", newStatus.toString());
            await authService.updateConsultantProfile(formData);
            onRefresh();
        } catch (error) {
            setIsOnline(!isOnline);
            Alert.alert("Error", "Failed to update status");
        }
    };

    const handleUpdateProfile = async () => {
        try {
            setSaving(true);
            const formData = new FormData();
            Object.keys(profileForm).forEach(key => {
                if (profileForm[key]) {
                    formData.append(key, profileForm[key]);
                }
            });
            await authService.updateConsultantProfile(formData);
            Alert.alert("Success", "Profile updated successfully");
            onRefresh();
        } catch (error) {
            Alert.alert("Error", error.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateBank = async () => {
        try {
            setSaving(true);
            await authService.addConsultantBankDetails(bankForm);
            Alert.alert("Success", "Bank details updated successfully");
            onRefresh();
        } catch (error) {
            Alert.alert("Error", error.message || "Failed to update bank details");
        } finally {
            setSaving(false);
        }
    };

    // Rendering Sections
    const renderProfile = () => (
        <ScrollView style={tw`flex-1 p-4`} showsVerticalScrollIndicator={false}>
            <Text style={[fontStyles.headingS, tw`text-gray-700 mb-4`]}>Account Information</Text>

            <View style={tw`mb-4`}>
                <Text style={tw`text-xs text-gray-500 mb-1 ml-1`}>NAME</Text>
                <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800`}
                    value={profileForm.name}
                    onChangeText={(text) => setProfileForm(prev => ({ ...prev, name: text }))}
                />
            </View>

            <View style={tw`mb-4`}>
                <Text style={tw`text-xs text-gray-500 mb-1 ml-1`}>EMAIL (Read-only)</Text>
                <TextInput
                    style={tw`bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-gray-500`}
                    value={consultant?.email}
                    editable={false}
                />
            </View>

            <View style={tw`mb-4`}>
                <Text style={tw`text-xs text-gray-500 mb-1 ml-1`}>PHONE</Text>
                <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800`}
                    value={profileForm.phone}
                    keyboardType="phone-pad"
                    onChangeText={(text) => setProfileForm(prev => ({ ...prev, phone: text }))}
                />
            </View>

            <View style={tw`mb-4`}>
                <Text style={tw`text-xs text-gray-500 mb-1 ml-1`}>TAGLINE</Text>
                <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800`}
                    value={profileForm.tagline}
                    placeholder="e.g. 10+ in neurology"
                    onChangeText={(text) => setProfileForm(prev => ({ ...prev, tagline: text }))}
                />
            </View>

            <View style={tw`flex-row gap-4 mb-4`}>
                <View style={tw`flex-1`}>
                    <Text style={tw`text-xs text-gray-500 mb-1 ml-1`}>EXPERIENCE</Text>
                    <TextInput
                        style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800`}
                        value={profileForm.experience}
                        onChangeText={(text) => setProfileForm(prev => ({ ...prev, experience: text }))}
                    />
                </View>
                <View style={tw`flex-1`}>
                    <Text style={tw`text-xs text-gray-500 mb-1 ml-1`}>SPECIALIZATION</Text>
                    <TextInput
                        style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800`}
                        value={profileForm.specialization}
                        onChangeText={(text) => setProfileForm(prev => ({ ...prev, specialization: text }))}
                    />
                </View>
            </View>

            <View style={tw`mb-4`}>
                <Text style={tw`text-xs text-gray-500 mb-1 ml-1`}>CREDENTIALS</Text>
                <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800`}
                    value={profileForm.credentials}
                    onChangeText={(text) => setProfileForm(prev => ({ ...prev, credentials: text }))}
                />
            </View>

            <View style={tw`mb-4`}>
                <Text style={tw`text-xs text-gray-500 mb-1 ml-1`}>BIO</Text>
                <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 h-24`}
                    value={profileForm.bio}
                    multiline
                    textAlignVertical="top"
                    onChangeText={(text) => setProfileForm(prev => ({ ...prev, bio: text }))}
                />
            </View>

            <TouchableOpacity
                style={tw`bg-[#6A8B78] rounded-xl py-4 mb-8 shadow-sm`}
                onPress={handleUpdateProfile}
                disabled={saving}
            >
                {saving ? (
                    <ActivityIndicator color="white" size="small" />
                ) : (
                    <Text style={tw`text-white text-center font-bold`}>SAVE CHANGES</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );

    const renderBank = () => (
        <ScrollView style={tw`flex-1 p-4`} showsVerticalScrollIndicator={false}>
            <Text style={[fontStyles.headingS, tw`text-gray-700 mb-4`]}>Bank Details</Text>

            <View style={tw`mb-4`}>
                <Text style={tw`text-xs text-gray-500 mb-1 ml-1`}>ACCOUNT HOLDER NAME</Text>
                <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800`}
                    value={bankForm.accountHolderName}
                    onChangeText={(text) => setBankForm(prev => ({ ...prev, accountHolderName: text }))}
                />
            </View>

            <View style={tw`mb-4`}>
                <Text style={tw`text-xs text-gray-500 mb-1 ml-1`}>ACCOUNT NUMBER</Text>
                <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800`}
                    value={bankForm.accountNumber}
                    keyboardType="numeric"
                    onChangeText={(text) => setBankForm(prev => ({ ...prev, accountNumber: text }))}
                />
            </View>

            <View style={tw`mb-4`}>
                <Text style={tw`text-xs text-gray-500 mb-1 ml-1`}>IFSC CODE</Text>
                <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800`}
                    value={bankForm.ifscCode}
                    autoCapitalize="characters"
                    onChangeText={(text) => setBankForm(prev => ({ ...prev, ifscCode: text }))}
                />
            </View>

            <View style={tw`mb-4`}>
                <Text style={tw`text-xs text-gray-500 mb-1 ml-1`}>BANK NAME</Text>
                <TextInput
                    style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800`}
                    value={bankForm.bankName}
                    onChangeText={(text) => setBankForm(prev => ({ ...prev, bankName: text }))}
                />
            </View>

            <TouchableOpacity
                style={tw`bg-[#6A8B78] rounded-xl py-4 mb-8 shadow-sm`}
                onPress={handleUpdateBank}
                disabled={saving}
            >
                {saving ? (
                    <ActivityIndicator color="white" size="small" />
                ) : (
                    <Text style={tw`text-white text-center font-bold`}>UPDATE BANK DETAILS</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );

    const renderPricing = () => (
        <View style={tw`flex-1 p-4`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
                <Text style={[fontStyles.headingS, tw`text-gray-700`]}>Pricing & Durations</Text>
                <TouchableOpacity
                    style={tw`bg-[#6A8B78] px-3 py-1.5 rounded-lg`}
                    onPress={() => setDurations([...durations, { label: "", code: "", price: 0 }])}
                >
                    <Text style={tw`text-white text-xs font-bold`}>+ ADD</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={durations}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item, index }) => (
                    <View style={tw`bg-white border border-gray-200 rounded-xl p-3 mb-3 shadow-sm`}>
                        <View style={tw`flex-row justify-between mb-2`}>
                            <Text style={tw`text-[10px] font-bold text-gray-400`}>DURATION {index + 1}</Text>
                            <TouchableOpacity onPress={() => setDurations(durations.filter((_, i) => i !== index))}>
                                <Ionicons name="trash-outline" size={16} color="red" />
                            </TouchableOpacity>
                        </View>
                        <View style={tw`flex-row gap-2`}>
                            <TextInput
                                placeholder="Label (e.g. 45 min)"
                                style={tw`flex-[2] bg-gray-50 rounded-lg px-2 py-1.5 text-xs text-gray-700`}
                                value={item.label}
                                onChangeText={(t) => {
                                    const newD = [...durations];
                                    newD[index].label = t;
                                    setDurations(newD);
                                }}
                            />
                            <TextInput
                                placeholder="Mins"
                                style={tw`flex-1 bg-gray-50 rounded-lg px-2 py-1.5 text-xs text-gray-700`}
                                value={item.code}
                                keyboardType="numeric"
                                onChangeText={(t) => {
                                    const newD = [...durations];
                                    newD[index].code = t;
                                    setDurations(newD);
                                }}
                            />
                            <TextInput
                                placeholder="Price"
                                style={tw`flex-1 bg-gray-50 rounded-lg px-2 py-1.5 text-xs text-gray-700`}
                                value={item.price.toString()}
                                keyboardType="numeric"
                                onChangeText={(t) => {
                                    const newD = [...durations];
                                    newD[index].price = parseInt(t) || 0;
                                    setDurations(newD);
                                }}
                            />
                        </View>
                    </View>
                )}
            />

            <TouchableOpacity
                style={tw`bg-[#6A8B78] rounded-xl py-4 mt-2 shadow-sm`}
                onPress={async () => {
                    try {
                        setSaving(true);
                        await authService.updateConsultantPricing(durations);
                        Alert.alert("Success", "Pricing updated");
                        onRefresh();
                    } catch (e) { Alert.alert("Error", e.message); }
                    finally { setSaving(false); }
                }}
            >
                <Text style={tw`text-white text-center font-bold`}>SAVE PRICING</Text>
            </TouchableOpacity>
        </View>
    );

    const renderAvailability = () => {
        // Group slots by day for display
        const groupedSlots = {};
        DAYS_OF_WEEK.forEach(day => groupedSlots[day] = []);
        availability.forEach(slot => {
            if (groupedSlots[slot.dayOfWeek]) {
                groupedSlots[slot.dayOfWeek].push(slot.timeSlot);
            }
        });

        return (
            <View style={tw`flex-1 p-4`}>
                <View style={tw`flex-row justify-between items-center mb-4`}>
                    <Text style={[fontStyles.headingS, tw`text-gray-700`]}>Your Slots</Text>
                    <TouchableOpacity
                        style={tw`bg-[#6A8B78] px-3 py-1.5 rounded-lg`}
                        onPress={() => Alert.alert("Slots", "Slot management view coming soon. Use web for full control.")}
                    >
                        <Text style={tw`text-white text-xs font-bold`}>MANAGE</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={tw`flex-1`}>
                    {DAYS_OF_WEEK.map(day => (
                        <View key={day} style={tw`bg-white border border-gray-100 rounded-xl p-3 mb-2 shadow-sm`}>
                            <Text style={tw`text-xs font-bold text-[#6A8B78] mb-1`}>{day}</Text>
                            <View style={tw`flex-row flex-wrap gap-1.5`}>
                                {groupedSlots[day]?.length > 0 ? (
                                    groupedSlots[day].map((time, i) => (
                                        <View key={i} style={tw`bg-gray-50 border border-gray-100 px-2 py-1 rounded-md`}>
                                            <Text style={tw`text-[10px] text-gray-600`}>{time}</Text>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={tw`text-[10px] text-gray-400 italic`}>No slots configured</Text>
                                )}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const renderBookings = () => (
        <View style={tw`flex-1 p-4`}>
            <Text style={[fontStyles.headingS, tw`text-gray-700 mb-4`]}>Current Appointments</Text>
            {bookingsLoading ? (
                <ActivityIndicator color="#6A8B78" size="large" style={tw`mt-8`} />
            ) : bookings.length > 0 ? (
                <FlatList
                    data={bookings}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <View style={tw`bg-white border border-gray-100 rounded-2xl p-4 mb-3 shadow-sm`}>
                            <View style={tw`flex-row justify-between items-center mb-2`}>
                                <Text style={tw`text-xs font-bold text-gray-400`}>#{item.bookingReference || item.id}</Text>
                                <View style={[tw`px-2 py-0.5 rounded-full`, { backgroundColor: item.status === 'CONFIRMED' ? '#dcfce7' : '#fee2e2' }]}>
                                    <Text style={[tw`text-[9px] font-bold`, { color: item.status === 'CONFIRMED' ? '#166534' : '#991b1b' }]}>{item.status}</Text>
                                </View>
                            </View>
                            <Text style={tw`text-sm font-bold text-gray-800`}>{item.userName || item.user?.name || "Client"}</Text>
                            <View style={tw`flex-row items-center mt-1`}>
                                <Ionicons name="calendar-outline" size={12} color="#6A8B78" />
                                <Text style={tw`text-[11px] text-gray-500 ml-1 mr-3`}>{new Date(item.date).toLocaleDateString()}</Text>
                                <Ionicons name="time-outline" size={12} color="#6A8B78" />
                                <Text style={tw`text-[11px] text-gray-500 ml-1`}>{item.timeSlot || item.slot?.timeSlot}</Text>
                            </View>
                        </View>
                    )}
                />
            ) : (
                <View style={tw`flex-1 justify-center items-center py-20`}>
                    <Ionicons name="calendar-outline" size={48} color="#e5e7eb" />
                    <Text style={tw`text-gray-400 mt-2`}>No bookings found</Text>
                </View>
            )}
        </View>
    );

    const renderMenuItem = ({ item }) => (
        <TouchableOpacity
            style={[
                tw`bg-white rounded-lg p-3 mb-2 mx-4 shadow-sm border border-gray-100`,
                tw`active:bg-gray-50 active:border-gray-200`,
            ]}
            activeOpacity={0.7}
            onPress={() => setActiveTab(item.tab)}
        >
            <View style={tw`flex-row items-center justify-between`}>
                <View style={tw`flex-row items-center flex-1`}>
                    <View
                        style={tw`bg-gray-50 w-10 h-10 rounded-full justify-center items-center mr-3`}
                    >
                        <Ionicons name={item.icon} size={20} color="#4a5568" />
                    </View>
                    <Text
                        style={[fontStyles.headingS, tw`text-gray-800 text-xs font-medium`]}
                    >
                        {item.title}
                    </Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={18} color="#a0aec0" />
            </View>
        </TouchableOpacity>
    );

    // If a tab is active (not on main menu), show that tab content
    if (activeTab !== null) {
        return (
            <View style={tw`flex-1 bg-white`}>
                {/* Header with back button */}
                <View style={tw`bg-[#90a79b]`}>
                    <View style={tw`bg-[#7a9b8e] pt-4 pb-6`}>
                        <View style={tw`absolute -bottom-6 left-0 right-0 h-12`}>
                            <View style={tw`bg-white h-12 rounded-t-3xl`} />
                        </View>
                        <View style={tw`px-4 flex-row items-center z-10`}>
                            <TouchableOpacity onPress={() => setActiveTab(null)} style={tw`mr-3`}>
                                <Ionicons name="arrow-back" size={24} color="white" />
                            </TouchableOpacity>
                            <Text style={[fontStyles.headingItalic, tw`text-white text-lg font-medium uppercase tracking-wider flex-1`]}>
                                {activeTab}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Tab Content */}
                <View style={tw`flex-1`}>
                    {activeTab === "Profile" && renderProfile()}
                    {activeTab === "Bank" && renderBank()}
                    {activeTab === "Pricing" && renderPricing()}
                    {activeTab === "Availability" && renderAvailability()}
                    {activeTab === "Bookings" && renderBookings()}
                </View>
            </View>
        );
    }

    const handleImagePick = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission Required", "We need camera roll permissions to change your profile picture.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                await uploadProfileImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error("Error picking image:", error);
            Alert.alert("Error", "Failed to pick image");
        }
    };

    const uploadProfileImage = async (imageUri) => {
        try {
            setSaving(true);
            const formData = new FormData();
            formData.append("profileImage", {
                uri: imageUri,
                type: "image/jpeg",
                name: "profile-image.jpg",
            });

            await authService.updateConsultantProfile(formData);
            Alert.alert("Success", "Profile picture updated successfully!");
            onRefresh();
        } catch (error) {
            console.error("Error uploading profile image:", error);
            Alert.alert("Error", "Failed to update profile picture");
        } finally {
            setSaving(false);
        }
    };

    // Main menu view (matching user ProfileScreen exactly)
    return (
        <View style={tw`flex-1 bg-gray-50`}>
            {/* Curved Header Section - Same as User Profile */}
            <View style={tw`bg-[#90a79b]`}>
                <View style={tw`bg-[#7a9b8e] pt-4 pb-8`}>
                    {/* White curved bottom */}
                    <View style={tw`absolute -bottom-6 left-0 right-0 h-12`}>
                        <View style={tw`bg-white h-12 rounded-t-3xl`} />
                    </View>

                    <View style={tw`px-4 z-10`}>
                        <View style={tw`flex-row items-center`}>
                            {/* Profile Image */}
                            <View style={tw`mr-3 relative`}>
                                <View style={tw`w-16 h-16 rounded-full bg-white shadow-sm justify-center items-center`}>
                                    {consultant?.profileImage ? (
                                        <Image
                                            source={{ uri: consultant.profileImage }}
                                            style={tw`w-14 h-14 rounded-full`}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={tw`w-14 h-14 rounded-full bg-gray-200 justify-center items-center`}>
                                            <Ionicons name="person" size={22} color="#6A8B78" />
                                        </View>
                                    )}

                                    {/* Uploading overlay */}
                                    {saving && (
                                        <View style={tw`absolute inset-0 bg-black bg-opacity-50 rounded-full justify-center items-center`}>
                                            <ActivityIndicator size="small" color="white" />
                                        </View>
                                    )}
                                </View>

                                {/* Camera Icon */}
                                <TouchableOpacity
                                    style={tw`absolute -bottom-1 -right-1 bg-[#7a9b8e] w-6 h-6 rounded-full border-2 border-white justify-center items-center`}
                                    onPress={handleImagePick}
                                    disabled={saving}
                                >
                                    <Ionicons name="camera" size={12} color="white" />
                                </TouchableOpacity>
                            </View>

                            {/* Consultant Info - Vertical layout */}
                            <View style={tw`flex-1`}>
                                <Text
                                    style={[
                                        fontStyles.headingItalic,
                                        tw`text-white text-lg font-medium uppercase tracking-wider mb-1.5`,
                                    ]}
                                    numberOfLines={1}
                                >
                                    {consultant?.name || "Consultant"}
                                </Text>

                                {consultant?.phone && (
                                    <View style={tw`flex-row items-center mb-0.5`}>
                                        <Ionicons name="call-outline" size={14} color="rgba(255,255,255,0.9)" />
                                        <Text
                                            style={[fontStyles.headingS, tw`text-white opacity-90 text-xs ml-1`]}
                                            numberOfLines={1}
                                        >
                                            +91 {consultant.phone}
                                        </Text>
                                    </View>
                                )}

                                <View style={tw`flex-row items-center`}>
                                    <Ionicons name="mail-outline" size={14} color="rgba(255,255,255,0.9)" />
                                    <Text
                                        style={[fontStyles.headingS, tw`text-white opacity-90 text-xs ml-1 flex-1`]}
                                        numberOfLines={1}
                                    >
                                        {consultant?.email}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Online/Offline Toggle */}
                        <View style={tw`flex-row items-center justify-between mt-4 bg-white bg-opacity-20 p-3 rounded-2xl`}>
                            <View style={tw`flex-row items-center`}>
                                <View style={[tw`w-2 h-2 rounded-full mr-2`, { backgroundColor: isOnline ? '#22c55e' : '#94a3b8' }]} />
                                <Text style={tw`text-xs font-bold text-white`}>{isOnline ? "ONLINE" : "OFFLINE"}</Text>
                            </View>
                            <TouchableOpacity
                                style={[tw`w-12 h-6 rounded-full p-1`, { backgroundColor: isOnline ? '#22c55e' : '#e2e8f0' }]}
                                onPress={handleToggleOnline}
                            >
                                <View style={[tw`w-4 h-4 rounded-full bg-white`, { alignSelf: isOnline ? 'flex-end' : 'flex-start' }]} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>

            {/* Menu Items Section */}
            <View style={tw`flex-1 mt-0`}>
                <View style={tw`mx-4 mb-1`}>
                    <Text
                        style={[
                            fontStyles.headingItalic,
                            tw`text-black-100 text-sm font-medium uppercase tracking-wider`,
                        ]}
                    >
                        Consultant Account
                    </Text>
                </View>

                <FlatList
                    data={menuItems}
                    renderItem={renderMenuItem}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={tw`pb-4 mt-3`}
                    ItemSeparatorComponent={() => <View style={tw`h-0.5`} />}
                />
            </View>

            {/* Website Link (Replaces Logout) */}
            <View style={tw`mx-4 mb-4`}>
                <TouchableOpacity
                    style={tw`bg-[#6B9080] rounded-xl items-center justify-center h-12 w-full shadow-sm`}
                    activeOpacity={0.7}
                    onPress={() => Linking.openURL('https://goodbelly.in/consultations')}
                >
                    <View style={tw`flex-row items-center`}>
                        <Ionicons name="globe-outline" size={18} color="white" style={tw`mr-2`} />
                        <Text style={[fontStyles.bodyBold, tw`text-white text-sm`]}>
                            Go to Console Website
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default ConsultantProfileView;
