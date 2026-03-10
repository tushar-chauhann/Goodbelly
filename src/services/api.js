import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@env";

//  FORCE LIVE: Hardcoding to ensure production connection
const ENV_URL = API_BASE_URL;

if (!ENV_URL) {
  console.warn("    API URL is not defined in .env file!");
}

// Normalize URL: Ensure it doesn't end with slash, then ensure it ends with /api/v1
const normalizeUrl = (url) => {
  if (!url) return API_BASE_URL;

  const cleanUrl = url.replace(/\/$/, ""); // Remove trailing slash
  if (cleanUrl.endsWith("/api/v1")) {
    return cleanUrl;
  }
  return `${cleanUrl}/api/v1`;
};

const BASE_URL = normalizeUrl(ENV_URL);

console.log(`🔌 API Configured: ${BASE_URL}`);

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error getting token from storage:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      try {
        await AsyncStorage.removeItem("accessToken");
        await AsyncStorage.removeItem("user");
      } catch (storageError) {
        console.log("Storage error during logout:", storageError);
      }
    }
    return Promise.reject(error);
  }
);

// Update FCM Token based on logged-in role
export const updateFcmToken = async (fcmToken) => {
  try {
    if (!fcmToken) return;

    const token = await AsyncStorage.getItem("accessToken");
    if (!token) return;

    // Check if consultant
    const consultant = await AsyncStorage.getItem("consultant");
    const isConsultant = !!consultant;

    const url = isConsultant
      ? "/consultant/update-fcm-token"
      : "/users/update-fcm-token";

    console.log(`Updating FCM Token for ${isConsultant ? 'Consultant' : 'User'}...`);
    console.log("FCM TOKEN:", fcmToken);

    await api.put(url, { fcmToken }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("FCM Token updated successfully");
  } catch (error) {
    console.error("Error updating FCM token:", error.response?.data || error.message);
  }
};

export const deleteAccount = async (reason) => {
  try {
    const response = await api.post("/users/delete-my-account", { reason });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default api;
