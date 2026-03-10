import axios from "axios";
import { UENGAGE_CONFIG } from "./uengage.config.js";

/**
 * Generic helper to call uEngage APIs with standard headers and error handling.
 */
export const uengageRequest = async (endpoint, data = {}) => {
  try {
    const url = `${UENGAGE_CONFIG.BASE_URL}${endpoint}`;
    const response = await axios.post(url, data, {
      headers: UENGAGE_CONFIG.HEADERS,
    });

    return response.data;
  } catch (error) {
    console.error("UENGAGE API Error:", error.response?.data || error.message);
    throw error;
  }
};
