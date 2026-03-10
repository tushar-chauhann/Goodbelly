import api from "./api";

export const validatePromoCode = async (code) => {
  try {
    const response = await api.get(`/promoCode/validate/${code}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const applyPromoCode = async (data) => {
  try {
    const response = await api.post("/promoCode/apply", data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Optional: Get available promos
export const getAvailablePromos = async () => {
  try {
    const response = await api.get("/promoCode/unused");
    return response.data;
  } catch (error) {
    throw error;
  }
};
