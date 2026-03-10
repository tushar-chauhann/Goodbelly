import api from "./api";
import axios from "axios";

// API Key from .env (Manual fallback to ensure frontend-only fix works immediately)
const GOOGLE_API_KEY = "AIzaSyCIl0VtI96HlI_Sfdi990gmVGEN8-np8fg";

export const fetchUserAddresses = async () => {
    try {
        const response = await api.get("/address");
        return response.data.data;
    } catch (error) {
        throw error;
    }
};

export const createAddress = async (addressData) => {
    try {
        const response = await api.post("/address", addressData);
        return response.data.data;
    } catch (error) {
        throw error;
    }
};

export const updateAddress = async (id, addressData) => {
    try {
        const response = await api.put(`/address/${id}`, addressData);
        return response.data.data;
    } catch (error) {
        throw error;
    }
};

export const deleteAddress = async (id) => {
    try {
        const response = await api.delete(`/address/${id}`);
        return response.data.data;
    } catch (error) {
        throw error;
    }
};

export const setPrimaryAddress = async (id) => {
    try {
        const response = await api.put(`/address/set-primary/${id}`);
        return response.data.data;
    } catch (error) {
        throw error;
    }
};

// ============================================
// CLIENT-SIDE GEOCODING (Frontend Only Fix)
// ============================================
const clientSideGeocode = async (query) => {
    if (!query) return null;
    try {
        console.log(`   Google Geocoding (Client-Side): ${query}`);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
        const response = await axios.get(url);

        if (response.data.status === "OK" && response.data.results.length > 0) {
            const location = response.data.results[0].geometry.location;
            console.log(`  Google Resolved: ${location.lat}, ${location.lng}`);
            return { latitude: location.lat, longitude: location.lng };
        } else {
            console.warn(`    Google Geocode Failed: ${response.data.status}`);
            return null;
        }
    } catch (error) {
        console.error("     Client-Side Geocode Error:", error.message);
        return null;
    }
};

// New function for location services (with fallback)
export const searchLocations = async (query) => {
    try {
        // Attempt Backend First (might 404)
        const response = await api.get(
            `/location/search?query=${encodeURIComponent(query)}`
        );
        return response.data.data;
    } catch (error) {
        // Fallback to Google Client Side if backend fails
        const googleResult = await clientSideGeocode(query);
        if (googleResult) return { results: [googleResult] };
        throw error;
    }
};

export const autocompleteLocations = async (query, latitude, longitude) => {
    try {
        let url = `/location/autocomplete?query=${encodeURIComponent(query)}`;
        if (latitude && longitude) {
            url += `&latitude=${latitude}&longitude=${longitude}`;
        }
        const response = await api.get(url);
        return response.data.data;
    } catch (error) {
        throw error;
    }
};

export const getCurrentLocation = async (latitude, longitude) => {
    try {
        const response = await api.get(
            `/location/current-location?latitude=${latitude}&longitude=${longitude}`
        );
        return response.data.data;
    } catch (error) {
        // Fallback: Client-Side Google Reverse Geocode (if backend 404s)
        try {
            console.log(`   Google Reverse Geocode (Client-Side Fallback): ${latitude}, ${longitude}`);
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`;
            const prevRes = await axios.get(url);
            if (prevRes.data.status === "OK" && prevRes.data.results.length > 0) {
                const result = prevRes.data.results[0];
                let city = "";
                let zipCode = "";
                result.address_components.forEach(comp => {
                    if (comp.types.includes("locality")) city = comp.long_name;
                    if (comp.types.includes("postal_code")) zipCode = comp.long_name;
                });
                return {
                    formattedAddress: result.formatted_address,
                    addressLine: result.formatted_address,
                    city: city || "",
                    zipCode: zipCode || "",
                    latitude: latitude,
                    longitude: longitude
                };
            }
        } catch (clientError) {
            console.error("Client-side reverse geocode failed:", clientError.message);
        }
        throw error;
    }
};

export const getLocationDetails = async (placeId) => {
    try {
        const response = await api.get(`/location/details/${placeId}`);
        return response.data.data;
    } catch (error) {
        throw error;
    }
};

export const reverseGeocode = async (lat, lng) => {
    try {
        // aligning with backend which expects distinct latitude/longitude params
        return getCurrentLocation(lat, lng);
    } catch (error) {
        throw error;
    }
};

// Helper to calculate distance in km
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Radius of the earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const cDist = R * c;
    return cDist;
};

export const checkAddressServiceability = async (
    addressOrId,
    vendorData = null
) => {
    // STRICT MODE: Only return "Serviceable" if valid backend response.
    try {
        console.log("     DEBUG: STRICT Serviceability Check Started (Frontend-Only Mode)");

        // ===========================
        // 1. Resolve User Address
        // ===========================
        let address;
        if (typeof addressOrId === "object" && addressOrId !== null) {
            address = addressOrId;
        } else {
            const addressesResponse = await api.get("/address");
            const addresses = addressesResponse.data.data;
            address = addresses.find((addr) => addr.id === addressOrId);
        }

        if (!address) throw new Error("Address not found");

        // Address Coords & Fallback
        let addressLat = parseFloat(address.latitude);
        let addressLng = parseFloat(address.longitude);
        let hasAddressCoords = !isNaN(addressLat) && !isNaN(addressLng) && addressLat !== 0 && addressLng !== 0;

        if (!hasAddressCoords && (address.addressLine || address.city)) {
            console.log("    User Coords missing. Trying Google...");
            const query = [address.addressLine, address.city, address.zipCode].filter(Boolean).join(", ");
            const coords = await clientSideGeocode(query);
            if (coords) {
                addressLat = coords.latitude;
                addressLng = coords.longitude;
                hasAddressCoords = true;
            }
        }

        // ===========================
        // 2. Resolve Vendor Location
        // ===========================
        let vendorLat = parseFloat(vendorData?.latitude);
        let vendorLng = parseFloat(vendorData?.longitude);
        let storeId = vendorData?.kitchenId || vendorData?.id || vendorData?.userId;
        const vendorRadius = parseFloat(vendorData?.serviceRadius || 15);
        let hasVendorCoords = !isNaN(vendorLat) && !isNaN(vendorLng) && vendorLat !== 0 && vendorLng !== 0;

        if (vendorData && !hasVendorCoords && (vendorData.address || vendorData.city)) {
            console.log("    Vendor Coords missing. Trying Google...");
            const query = [vendorData.kitchenName, vendorData.address, vendorData.city].filter(Boolean).join(", ");
            const coords = await clientSideGeocode(query);
            if (coords) {
                vendorLat = coords.latitude;
                vendorLng = coords.longitude;
                hasVendorCoords = true;
            }
        }

        // ===========================
        // 3. Validation Prerequisite
        // ===========================
        if (!hasAddressCoords) {
            console.warn("⛔ Check Failed: User Location missing");
            return {
                serviceability: { locationServiceAble: false, riderServiceAble: false },
                payouts: { message: "Address location invalid" },
                data: address
            };
        }

        if (!hasVendorCoords) {
            console.warn("⛔ Check Failed: Vendor Location missing");
            return {
                serviceability: { locationServiceAble: false, riderServiceAble: false },
                payouts: { message: "Store location unavailable for check" },
                data: address
            };
        }

        // ===========================
        // 4. Client-Side Distance Check
        // ===========================
        const distance = calculateDistance(vendorLat, vendorLng, addressLat, addressLng);
        console.log(`📏 Distance: ${distance?.toFixed(2)}km (Radius: ${vendorRadius}km)`);

        // CLIENT-SIDE DISTANCE CHECK REMOVED per user request
        // We log it but let the backend decide.
        if (distance && distance > vendorRadius) {
            console.warn(`    Client Calc: Distance ${distance.toFixed(1)}km > Radius ${vendorRadius}km. Calling backend anyway...`);
        }

        // ===========================
        // 5. API Serviceability Check (MANDATORY)
        // ===========================
        if (storeId) {
            try {
                console.log("🚀 Calling Backend Serviceability API...");
                const payload = {
                    pickup: { latitude: vendorLat, longitude: vendorLng },
                    drop: { latitude: addressLat, longitude: addressLng },
                    storeId: String(storeId)
                };
                const response = await api.post("/orders/check-serviceability", payload);
                console.log("  API Response:", response.data?.data);
                return response.data.data;
            } catch (apiError) {
                console.error("     API Error:", apiError.message);
                // STRICT FAIL
                return {
                    serviceability: { locationServiceAble: false, riderServiceAble: false },
                    payouts: { message: apiError.response?.data?.message || "Serviceability check failed" },
                    data: address
                };
            }
        } else {
            console.warn("⛔ Check Failed: No Store ID");
            return {
                serviceability: { locationServiceAble: false, riderServiceAble: false },
                payouts: { message: "Store identification missing" },
                data: address
            };
        }

    } catch (error) {
        console.error(
            "     CRITICAL ERROR in checkAddressServiceability:",
            error
        );
        return {
            serviceability: { locationServiceAble: false, riderServiceAble: false },
            payouts: { message: "Unable to verify serviceability" },
        };
    }
};
