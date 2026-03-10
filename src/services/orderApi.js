// src/services/orderApi.js
import api from "./api";

export const createOrder = async (orderData) => {
  try {
    const response = await api.post("/orders", orderData);
    
    // Return the full response structure to maintain consistency
    // The backend typically returns { success: true, data: {...}, message: "..." }
    if (response.data) {
      // If response.data has success property, return it as is
      if (response.data.success !== undefined) {
        return response.data;
      }
      // If response.data.data exists, wrap it in standard format
      else if (response.data.data) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message || "Order created successfully"
        };
      }
      // If response.data is the order object directly
      else {
        return {
          success: true,
          data: response.data,
          message: "Order created successfully"
        };
      }
    }
    
    throw new Error("Invalid response structure from server");
  } catch (error) {
    throw error;
  }
};
