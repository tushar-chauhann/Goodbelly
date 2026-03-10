import api from "./api";

/**
 * Check if delivery address is serviceable for a given kitchen
 * @param {Object} pickup - Kitchen location {latitude, longitude}
 * @param {Object} drop - Delivery address {latitude, longitude}
 * @param {string} storeId - Kitchen ID
 * @returns {Promise} Serviceability data including rider/location status and delivery charges
 */
export const checkServiceability = async (pickup, drop, storeId) => {
    try {
        const response = await api.post("/orders/check-serviceability", {
            pickup,
            drop,
            storeId,
        });
        return response.data.data;
    } catch (error) {
        console.error("Serviceability check error:", error);
        throw error;
    }
};

/**
 * Fetch all user addresses
 */
export const getUserAddresses = async () => {
    try {
        const response = await api.get("/address");
        return response.data.data;
    } catch (error) {
        console.error("Get addresses error:", error);
        throw error;
    }
};

/**
 * Create a new address
 */
export const createAddress = async (addressData) => {
    try {
        const response = await api.post("/address", addressData);
        return response.data.data;
    } catch (error) {
        console.error("Create address error:", error);
        throw error;
    }
};

/**
 * Update an existing address
 */
export const updateAddress = async (id, addressData) => {
    try {
        const response = await api.put(`/address/${id}`, addressData);
        return response.data.data;
    } catch (error) {
        console.error("Update address error:", error);
        throw error;
    }
};

/**
 * Delete an address
 */
export const deleteAddress = async (id) => {
    try {
        const response = await api.delete(`/address/${id}`);
        return response.data.data;
    } catch (error) {
        console.error("Delete address error:", error);
        throw error;
    }
};

/**
 * Set an address as primary
 */
export const setPrimaryAddress = async (id) => {
    try {
        const response = await api.put(`/address/set-primary/${id}`);
        return response.data.data;
    } catch (error) {
        console.error("Set primary address error:", error);
        throw error;
    }
};
