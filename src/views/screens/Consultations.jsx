import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import tw from "twrnc";
import { authService } from "../../services/authService.js";
import { fontStyles } from "../../utils/fontStyles.js";
import { useSelector, useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Consultations = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const user = useSelector((state) => state.auth?.user);

  const [activeFilter, setActiveFilter] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [consultants, setConsultants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Format currency like web version
  const formatCurrency = (value) => {
    if (!value || value === 0) return "Free";
    return `₹${value}`;
  };

  // Get base price like web version
  const getBasePrice = (consultant) => {
    return consultant.durations?.length > 0
      ? Math.min(...consultant.durations.map((slot) => slot.price))
      : 0;
  };

  // Fetch consultants from API
  const fetchConsultants = async () => {
    try {
      setIsLoading(true);

      // Fetch both all consultants and top consultants in parallel
      const [allRes, topRes] = await Promise.all([
        authService.getConsultants(),
        authService.getTopConsultants()
      ]);

      const all = allRes?.data || [];
      const top = topRes?.data || [];

      if (all.length > 0) {
        // Create a Set of Top Consultant IDs for efficient lookup
        const topIds = new Set(top.map(t => t.id));

        // Split all consultants into Top (Pinned) and Others
        const topExperts = all.filter(c => topIds.has(c.id)).map(c => ({ ...c, isPinned: true }));
        const others = all.filter(c => !topIds.has(c.id));

        // Merge: Top Experts first, then others
        setConsultants([...topExperts, ...others]);
      } else {
        setConsultants([]);
      }
    } catch (err) {
      console.error("Error fetching consultants:", err);
      setConsultants([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConsultants();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConsultants();
  };

  // Get specialization filters dynamically
  const specializationFilters = useMemo(() => {
    const specializations = [
      ...new Set(
        consultants.map((item) => item.specialization).filter(Boolean)
      ),
    ];
    return ["All", ...specializations];
  }, [consultants]);

  // Filter consultants based on search and specialization
  const filteredConsultants = useMemo(() => {
    const trimmedSearch = searchText.trim().toLowerCase();

    return consultants.filter((consultant) => {
      const matchesSpecialization =
        activeFilter === "All" || consultant.specialization === activeFilter;

      const matchesSearch =
        trimmedSearch.length === 0 ||
        consultant.name?.toLowerCase().includes(trimmedSearch) ||
        consultant.focusAreas?.some((area) =>
          area.label.toLowerCase().includes(trimmedSearch)
        );

      return matchesSpecialization && matchesSearch;
    });
  }, [consultants, searchText, activeFilter]);

  const handleConsultantLogin = () => {
    // 🌐 Redirect to web for consultant login
    Linking.openURL('https://goodbelly.in/consultations');
  };

  const handleLogoutAndProceed = async () => {
    try {
      await authService.logout();
      setShowLogoutModal(false);

      // Reset navigation stack to Login screen (like ProfileScreen does)
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      );
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout fails, clear storage and navigate
      try {
        await AsyncStorage.multiRemove(["accessToken", "user"]);
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Login" }],
          })
        );
      } catch (storageError) {
        console.error("Storage clear error:", storageError);
      }
      setShowLogoutModal(false);
    }
  };

  const renderConsultantCard = ({ item }) => {
    const basePrice = getBasePrice(item);

    return (
      <View
        style={tw`bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-200 flex-row relative`}
      >
        {/* Top Expert Badge - Same style as HomeScreen */}
        {item.isPinned && (
          <View
            style={[
              tw`absolute top-18 left-8 z-10 bg-[#6B9080] rounded-full flex-row items-center shadow-sm`,
              {
                paddingHorizontal: 6,
                paddingVertical: 2,
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={10} color="white" />
            <Text
              numberOfLines={1}
              style={[
                fontStyles.bodyBold,
                {
                  color: 'white',
                  fontSize: 8,
                  marginLeft: 2,
                },
              ]}
            >
              Top Expert
            </Text>
          </View>
        )}

        {/* Consultant Image */}
        <View style={tw`w-20 h-20 rounded-xl overflow-hidden mr-4`}>
          {item.profileImage ? (
            <Image
              source={{ uri: item.profileImage }}
              style={tw`w-full h-full`}
              resizeMode="cover"
            />
          ) : (
            <View
              style={tw`w-full h-full justify-center items-center bg-gray-200`}
            >
              <Ionicons name="person-outline" size={24} color="#666" />
            </View>
          )}
        </View>

        {/* Consultant Info */}
        <View style={tw`flex-1`}>
          {/* Name and Rating */}
          <View style={tw`flex-row justify-between items-start mb-1`}>
            <Text style={[fontStyles.headingS, tw`text-sm text-gray-900 flex-1`]}>
              {item.name}
            </Text>
            <View
              style={tw`flex-row items-center bg-amber-50 rounded-lg px-2 py-1`}
            >
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={tw`text-xs font-medium text-gray-800 ml-1`}>
                {item.rating ? Number(item.rating).toFixed(1) : "New"}
              </Text>
            </View>
          </View>

          {/* Specialization */}
          {item.specialization && (
            <Text style={[fontStyles.headingS, tw`text-xs text-[#6A8B78] mb-1`]}>
              {item.specialization}
            </Text>
          )}

          {/* Languages */}
          {item.languages?.length > 0 && (
            <View style={tw`flex-row items-center mb-1`}>
              <Ionicons name="chatbubbles-outline" size={14} color="#666" />
              <Text
                style={tw`text-xs text-gray-600 ml-1 flex-1`}
                numberOfLines={1}
              >
                {item.languages.map((lang) => lang.language).join(", ")}
              </Text>
            </View>
          )}

          {/* Location */}
          {item.city && (
            <View style={tw`flex-row items-center mb-2`}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={tw`text-xs text-gray-700 ml-1`}>
                {item.city.slice(0, 1).toUpperCase() + item.city.slice(1)}
              </Text>
            </View>
          )}

          {/* Price and Book Button */}
          <View style={tw`flex-row justify-between items-center`}>
            <Text style={[fontStyles.headingS, tw`text-sm font-semibold text-gray-900`]}>
              {formatCurrency(basePrice)}
            </Text>
            <TouchableOpacity
              style={tw`bg-[#6A8B78] rounded-lg px-3 py-2`}
              onPress={() =>
                navigation.navigate("ConsultProfile", { expert: item })
              }
            >
              <Text style={[fontStyles.headingS, tw`text-white text-xs`]}>Book Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={tw`flex-1 bg-white justify-center items-center`}>
        <ActivityIndicator size="large" color="#6A8B78" />
        <Text style={tw`text-gray-600 mt-3`}>Loading consultants...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <View style={tw`pt-2 px-4 pb-4`}>
          {/* Back Button and Top Tag */}
          <View style={tw`flex-row items-center mb-2`}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={tw`absolute left-0 p-2 z-10`}
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View style={tw`flex-1`}>
              <View
                style={tw`bg-[#6A8B78] bg-opacity-10 rounded-full px-4 py-2 self-center`}
              >
                <Text style={[fontStyles.headingS, tw`text-[#6A8B78] text-xs`]}>
                  Book a nutrition consultation
                </Text>
              </View>
            </View>
          </View>

          {/* Title */}
          <Text style={[fontStyles.headingS, tw`text-base text-gray-900 text-center`]}>
            Match with a consultant who fits your goals
          </Text>
        </View>

        {/* Search and Filters Section */}
        <View style={tw`px-4 pb-4`}>
          {/* Search Bar */}
          <View
            style={tw`flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 mb-4 h-12`}
          >
            <Ionicons name="search-outline" size={18} color="#888" />
            <TextInput
              style={tw`flex-1 text-sm ml-2`}
              placeholder="Search by name or goal"
              placeholderTextColor="#888"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Specialization Filters */}
          <Text style={[fontStyles.headingS, tw`text-sm text-gray-900 mb-2`]}>
            Specialization
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={tw`mb-1`}
            contentContainerStyle={tw`pr-4`}
          >
            {specializationFilters.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setActiveFilter(item)}
                style={[
                  tw`mr-2 rounded-xl px-2.5`,
                  activeFilter === item
                    ? tw`bg-[#6A8B78]`
                    : tw`bg-gray-100 border border-gray-300`,
                ]}
              >
                <Text
                  style={[
                    fontStyles.headingS,
                    activeFilter === item
                      ? tw`text-white text-[10px]`
                      : tw`text-gray-700 text-[10px]`
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Consultants List */}
        <View style={tw`px-4 pb-8`}>
          {filteredConsultants.length > 0 ? (
            <FlatList
              data={filteredConsultants}
              renderItem={renderConsultantCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={tw`justify-center items-center py-8`}>
              <Ionicons name="search-outline" size={48} color="#9ca3af" />
              <Text style={tw`text-gray-500 text-base mt-3 text-center`}>
                No consultants found matching your criteria
              </Text>
              <Text style={tw`text-gray-400 text-sm text-center mt-1`}>
                Try adjusting your search or filters
              </Text>
            </View>
          )}
        </View>

        {/* Consultant CTA Section */}
        <View style={tw`bg-gray-50 mx-4 rounded-xl p-4 mb-8`}>
          <Text style={[fontStyles.headingS, tw`text-base text-gray-900 mb-1`]}>
            Are you a practicing consultant?
          </Text>
          <Text style={tw`text-sm text-gray-600 mb-3`}>
            Share your expertise and start accepting consultations on Goodbelly.
          </Text>
          <View style={tw`flex-row`}>
            <TouchableOpacity
              style={tw`border border-[#6A8B78] rounded-lg px-4 py-2 mr-2 flex-1 justify-center items-center`}
              onPress={handleConsultantLogin}
            >
              <Text style={[fontStyles.headingS, tw`text-[#6A8B78] text-sm`]}>
                Consultant login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tw`bg-[#6A8B78] rounded-lg px-4 py-2 flex-1`}
              onPress={() => navigation.navigate("ConsultantRegister")}
            >
              <Text style={[fontStyles.headingS, tw`text-white text-center text-sm`]}>
                Become a consultant
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={tw`flex-1 justify-center items-center bg-black/50`}>
          <View style={tw`bg-white rounded-2xl p-6 mx-6 w-80`}>
            <Text style={[fontStyles.headingS, tw`text-lg text-gray-900 mb-2`]}>
              Logout Required
            </Text>
            <Text style={tw`text-sm text-gray-600 mb-6`}>
              You are currently logged in as a user. You need to logout first to access your consultant account.
            </Text>
            <View style={tw`flex-row gap-3`}>
              <TouchableOpacity
                onPress={() => setShowLogoutModal(false)}
                style={tw`flex-1 bg-gray-100 rounded-lg px-4 py-3`}
              >
                <Text style={[fontStyles.headingS, tw`text-gray-700 text-center text-sm`]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleLogoutAndProceed}
                style={tw`flex-1 bg-red-600 rounded-lg px-4 py-3`}
              >
                <Text style={[fontStyles.headingS, tw`text-white text-center text-sm`]}>
                  Logout
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Consultations;
