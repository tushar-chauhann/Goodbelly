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
        console.error(" Client-Side Geocode Error:", error.message);
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
        console.log(` Autocomplete request: ${query}`);
        const response = await api.get(url);

        // Validate response structure
        if (response.data && response.data.data) {
            const suggestions = response.data.data.suggestions || [];
            console.log(`  Autocomplete returned ${suggestions.length} suggestions`);

            // Ensure each suggestion has a unique identifier
            const validatedSuggestions = suggestions.map((item, index) => {
                // Debug: Log the actual structure of each item
                if (index === 0) {
                    console.log(` First suggestion structure:`, JSON.stringify(item, null, 2));
                    console.log(`  Available keys:`, Object.keys(item));
                }

                return {
                    ...item,
                    // Ensure place_id exists, use index as fallback
                    place_id: item.place_id || item.placeId || `suggestion-${index}`,
                };
            });

            return { suggestions: validatedSuggestions };
        } else {
            console.warn(`    Invalid autocomplete response structure`);
            return { suggestions: [] };
        }
    } catch (error) {
        console.error("     Autocomplete error:", error.response?.data?.message || error.message);
        return { suggestions: [] };
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
        console.log(` Fetching location details for placeId: ${placeId}`);
        const response = await api.get(`/location/details/${placeId}`);

        if (response.data && response.data.data) {
            console.log(`  Location details fetched successfully`);
            return response.data.data;
        } else {
            console.warn(`    Invalid response structure from location details API`);
            throw new Error("Invalid response structure");
        }
    } catch (error) {
        console.error(`     Error fetching place details for ${placeId}:`, {
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
            data: error.response?.data
        });

        // Don't throw generic errors - provide meaningful error info
        const errorMessage = error.response?.data?.message || error.message || "Unknown error";
        throw new Error(`Location details error: ${errorMessage}`);
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
    try {
        // Get address - support both address object and addressId
        let address;
        if (typeof addressOrId === "object" && addressOrId !== null) {
            address = addressOrId;
        } else {
            const addressesResponse = await api.get("/address");
            const addresses = addressesResponse.data.data;
            address = addresses.find((addr) => addr.id === addressOrId);
        }

        if (!address) {
            throw new Error("Address not found");
        }

        // Extract vendor coordinates and ID with flexible field name support
        const vendorLat = vendorData?.latitude;
        const vendorLng = vendorData?.longitude;
        const storeId =
            vendorData?.kitchenId || vendorData?.id || vendorData?.userId;

        console.log("Vendor Data Extraction:", {
            vendorData: vendorData ? "Present" : "NULL",
            vendorLat,
            vendorLng,
            storeId,
            fullVendor: vendorData
        });

        // Check if address has valid coordinates
        const addressLat = parseFloat(address.latitude);
        const addressLng = parseFloat(address.longitude);
        const hasValidAddressCoords =
            addressLat && addressLng && addressLat !== 0 && addressLng !== 0;

        console.log("Address Coordinates:", {
            addressLat,
            addressLng,
            hasValidCoords: hasValidAddressCoords
        });

        // Only make API call if we have vendor data AND address has valid coordinates
        if (
            vendorData &&
            vendorLat &&
            vendorLng &&
            storeId &&
            hasValidAddressCoords
        ) {
            try {
                const requestPayload = {
                    pickup: {
                        latitude: parseFloat(vendorLat),
                        longitude: parseFloat(vendorLng),
                    },
                    drop: {
                        latitude: addressLat,
                        longitude: addressLng,
                    },
                    storeId: String(storeId),
                };

                const response = await api.post(
                    "/orders/check-serviceability",
                    requestPayload,
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );

                // Return the actual API response structure
                return response.data.data;
            } catch (apiError) {
                console.error(
                    "Serviceability API error:",
                    apiError.response?.data?.message || apiError.message
                );
                // Return not serviceable on API error
                return {
                    serviceability: {
                        locationServiceAble: false,
                        riderServiceAble: false,
                    },
                    payouts: {
                        message:
                            apiError.response?.data?.message ||
                            "Unable to check serviceability",
                    },
                };
            }
        }

        // If address doesn't have coordinates, return not serviceable
        if (!hasValidAddressCoords) {
            return {
                serviceability: {
                    locationServiceAble: false,
                    riderServiceAble: false,
                },
                payouts: {
                    message: "Not Serviceable",
                },
            };
        }

        // Basic validation as fallback
        const hasRequiredFields = address.city && address.zipCode;
        const isCompleteAddress =
            (address.latitude && address.longitude) ||
            (address.addressLine && address.addressLine.length > 10);

        const isValid = hasRequiredFields && isCompleteAddress;

        return {
            serviceability: {
                locationServiceAble: isValid,
                riderServiceAble: isValid,
            },
            payouts: {
                message: isValid
                    ? "Serviceable"
                    : !hasRequiredFields
                        ? "Incomplete address"
                        : "Location data missing",
            },
            data: address,
        };
    } catch (error) {
        console.error("Serviceability check error:", error);
        // Return serviceable by default on error (backup behavior)
        return {
            serviceability: {
                locationServiceAble: true,
                riderServiceAble: true,
            },
            payouts: {
                message: "Serviceable",
            },
        };
    }
};

