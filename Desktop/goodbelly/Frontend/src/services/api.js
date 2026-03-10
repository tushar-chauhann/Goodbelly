import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { YOUR_API_BASE_URL, API_BASE_URL } from "@env";

//    FORCE LIVE: Hardcoding to ensure production connection
const ENV_URL = "https://api.goodbelly.in/api/v1";

if (!ENV_URL) {
  console.warn("    API URL is not defined in .env file!");
}

// Normalize URL: Ensure it doesn't end with slash, then ensure it ends with /api/v1
const normalizeUrl = (url) => {
  if (!url) return "https://api.goodbelly.in/api/v1";

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
      // Debug: Log each request and headers
      console.log(`   API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      // console.log("   Headers:", JSON.stringify(config.headers)); // Uncomment if needed
    } catch (error) {
      console.log("Error getting token from storage:", error);
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

export default api;
