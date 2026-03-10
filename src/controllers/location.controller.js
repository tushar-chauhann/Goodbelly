import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import axios from "axios";

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES_BASE_URL = "https://places.googleapis.com/v1";

// Get current location from coordinates (using Geocoding API)

const getCurrentLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    throw new ApiError(400, "Latitude and longitude are required");
  }

  if (!GOOGLE_API_KEY) {
    throw new ApiError(500, "Google Places API key not configured");
  }

  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`
    );

    if (response.data.status !== "OK") {
      throw new ApiError(400, `Google API error: ${response.data.status}`);
    }

    const result = response.data.results[0];
    const addressComponents = result.address_components;

    const extractComponent = (type) => {
      const component = addressComponents.find((comp) =>
        comp.types.includes(type)
      );
      return component ? component.long_name : null;
    };

    const locationInfo = {
      addressLine: result.formatted_address,
      town:
        extractComponent("locality") || extractComponent("sublocality_level_1"),
      area:
        extractComponent("sublocality_level_1") ||
        extractComponent("sublocality"),
      district: extractComponent("administrative_area_level_2"),
      city:
        extractComponent("locality") ||
        extractComponent("administrative_area_level_2"),
      state: extractComponent("administrative_area_level_1"),
      country: extractComponent("country"),
      zipCode: extractComponent("postal_code"),
      landmark:
        extractComponent("point_of_interest") ||
        extractComponent("establishment"),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      placeId: result.place_id,
      formattedAddress: result.formatted_address,
    };

    res
      .status(200)
      .json(
        new ApiResponse(200, locationInfo, "Location data fetched successfully")
      );
  } catch (error) {
    console.error(
      "Google Geocoding API error:",
      error.response?.data || error.message
    );
    throw new ApiError(500, "Failed to fetch location data");
  }
});

// Autocomplete using NEW Places API - FIXED
const autocompleteLocations = asyncHandler(async (req, res) => {
  const { query, latitude, longitude, radius = 5000, limit = 8 } = req.query;

  if (!query || query.trim().length < 2) {
    throw new ApiError(400, "Query must be at least 2 characters long");
  }

  if (!GOOGLE_API_KEY) {
    throw new ApiError(500, "Google Places API key not configured");
  }

  try {
    const requestBody = {
      input: query.trim(),
      includedRegionCodes: ["in"], // India only
      languageCode: "en",
    };

    // Add location bias if coordinates provided
    if (latitude && longitude) {
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
          },
          radius: parseFloat(radius),
        },
      };
    }

    const response = await axios.post(
      `${PLACES_BASE_URL}/places:autocomplete`,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_API_KEY,
          "X-Goog-FieldMask": "suggestions.placePrediction",
        },
      }
    );

    // Process only place predictions
    const suggestions = await Promise.all(
      response.data.suggestions.slice(0, limit).map(async (suggestion) => {
        if (!suggestion.placePrediction) return null;

        const place = suggestion.placePrediction;

        try {
          const placeDetails = await getPlaceDetailsNew(place.placeId);

          return {
            id: place.placeId,
            displayName: place.text?.text || placeDetails.formattedAddress,
            addressLine: placeDetails.formattedAddress,
            placeId: place.placeId,
            latitude: placeDetails.location?.latitude || null,
            longitude: placeDetails.location?.longitude || null,
            types: placeDetails.types,
            city: extractAddressComponentNew(
              placeDetails.addressComponents,
              "locality"
            ),
            state: extractAddressComponentNew(
              placeDetails.addressComponents,
              "administrative_area_level_1"
            ),
            country: extractAddressComponentNew(
              placeDetails.addressComponents,
              "country"
            ),
            zipCode: extractAddressComponentNew(
              placeDetails.addressComponents,
              "postal_code"
            ),
          };
        } catch (error) {
          // Fallback: return basic place info without details
          return {
            id: place.placeId,
            displayName: place.text?.text,
            addressLine: place.text?.text,
            placeId: place.placeId,
          };
        }
      })
    );

    // Filter out null values
    const validSuggestions = suggestions.filter((s) => s !== null);

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { suggestions: validSuggestions },
          "Autocomplete results fetched successfully"
        )
      );
  } catch (error) {
    console.error(
      "Google Places Autocomplete error:",
      error.response?.data || error.message
    );

    if (error.response?.data?.error?.code === 400) {
      // Provide more specific error message
      const errorDetails = error.response.data.error;
      throw new ApiError(
        400,
        `Autocomplete request failed: ${errorDetails.message}`
      );
    } else if (error.response?.data?.error?.code === 429) {
      throw new ApiError(429, "API quota exceeded. Please try again later.");
    }

    throw new ApiError(500, "Failed to fetch autocomplete results");
  }
});

// Search places using NEW Places API - SearchText - FIXED
const searchLocations = asyncHandler(async (req, res) => {
  const { query, latitude, longitude, radius = 5000, limit = 10 } = req.query;

  if (!query || query.trim().length < 2) {
    throw new ApiError(400, "Search query must be at least 2 characters long");
  }

  if (!GOOGLE_API_KEY) {
    throw new ApiError(500, "Google Places API key not configured");
  }

  try {
    const requestBody = {
      textQuery: query.trim(),

      regionCode: "in",
      languageCode: "en",
      maxResultCount: parseInt(limit),
    };

    // Add location bias if coordinates provided
    if (latitude && longitude) {
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
          },
          radius: parseFloat(radius),
        },
      };
    }

    const response = await axios.post(
      `${PLACES_BASE_URL}/places:searchText`,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.addressComponents",
        },
      }
    );

    const locations = response.data.places.map((place) => ({
      id: place.id,
      addressLine: place.formattedAddress,
      name: place.displayName?.text,
      town:
        extractAddressComponentNew(place.addressComponents, "locality") ||
        extractAddressComponentNew(place.addressComponents, "sublocality"),
      area:
        extractAddressComponentNew(place.addressComponents, "sublocality") ||
        extractAddressComponentNew(place.addressComponents, "neighborhood"),
      district: extractAddressComponentNew(
        place.addressComponents,
        "administrative_area_level_2"
      ),
      city:
        extractAddressComponentNew(place.addressComponents, "locality") ||
        extractAddressComponentNew(
          place.addressComponents,
          "administrative_area_level_2"
        ),
      state: extractAddressComponentNew(
        place.addressComponents,
        "administrative_area_level_1"
      ),
      country: extractAddressComponentNew(place.addressComponents, "country"),
      zipCode: extractAddressComponentNew(
        place.addressComponents,
        "postal_code"
      ),
      landmark: place.displayName?.text,
      latitude: place.location?.latitude || null,
      longitude: place.location?.longitude || null,
      placeId: place.id,
      types: place.types,
      rating: place.rating,
      userRatingsTotal: place.userRatingCount,
      formattedAddress: place.formattedAddress,
    }));

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { results: locations },
          "Locations fetched successfully"
        )
      );
  } catch (error) {
    console.error(
      "Google Places SearchText error:",
      error.response?.data || error.message
    );

    // More specific error handling
    if (error.response?.data?.error?.code === 400) {
      throw new ApiError(400, "Invalid request parameters");
    } else if (error.response?.data?.error?.code === 429) {
      throw new ApiError(429, "API quota exceeded. Please try again later.");
    }

    throw new ApiError(500, "Failed to search locations");
  }
});

// Get place details using NEW Places API
const getLocationDetails = asyncHandler(async (req, res) => {
  const { placeId } = req.params;

  if (!placeId) {
    throw new ApiError(400, "Place ID is required");
  }

  if (!GOOGLE_API_KEY) {
    throw new ApiError(500, "Google Places API key not configured");
  }

  try {
    const placeDetails = await getPlaceDetailsNew(placeId);

    const locationInfo = {
      id: placeDetails.id,
      addressLine: placeDetails.formattedAddress,
      name: placeDetails.displayName?.text,
      town:
        extractAddressComponentNew(
          placeDetails.addressComponents,
          "locality"
        ) ||
        extractAddressComponentNew(
          placeDetails.addressComponents,
          "sublocality"
        ),
      area:
        extractAddressComponentNew(
          placeDetails.addressComponents,
          "sublocality"
        ) ||
        extractAddressComponentNew(
          placeDetails.addressComponents,
          "neighborhood"
        ),
      district: extractAddressComponentNew(
        placeDetails.addressComponents,
        "administrative_area_level_2"
      ),
      city:
        extractAddressComponentNew(
          placeDetails.addressComponents,
          "locality"
        ) ||
        extractAddressComponentNew(
          placeDetails.addressComponents,
          "administrative_area_level_2"
        ),
      state: extractAddressComponentNew(
        placeDetails.addressComponents,
        "administrative_area_level_1"
      ),
      country: extractAddressComponentNew(
        placeDetails.addressComponents,
        "country"
      ),
      zipCode: extractAddressComponentNew(
        placeDetails.addressComponents,
        "postal_code"
      ),
      landmark: placeDetails.displayName?.text,
      latitude: placeDetails.location?.latitude || null,
      longitude: placeDetails.location?.longitude || null,
      placeId: placeDetails.id,
      formattedAddress: placeDetails.formattedAddress,
      types: placeDetails.types,
      rating: placeDetails.rating,
      userRatingsTotal: placeDetails.userRatingCount,
      website: placeDetails.websiteUri,
      phoneNumber: placeDetails.nationalPhoneNumber,
      internationalPhoneNumber: placeDetails.internationalPhoneNumber,
      openingHours: placeDetails.regularOpeningHours,
      priceLevel: placeDetails.priceLevel,
      businessStatus: placeDetails.businessStatus,
      currentOpeningHours: placeDetails.currentOpeningHours,
      utcOffsetMinutes: placeDetails.utcOffsetMinutes,
    };

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          locationInfo,
          "Location details fetched successfully"
        )
      );
  } catch (error) {
    console.error(
      "Google Places Details error:",
      error.response?.data || error.message
    );
    throw new ApiError(500, "Failed to fetch location details");
  }
});

// Nearby search using NEW Places API - SearchNearby - FIXED
const getNearbyLocations = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius = 2000, limit = 10 } = req.query;

  if (!latitude || !longitude) {
    throw new ApiError(400, "Latitude and longitude are required");
  }

  if (!GOOGLE_API_KEY) {
    throw new ApiError(500, "Google Places API key not configured");
  }

  try {
    const requestBody = {
      // FIX: Use includedTypes instead of includedPrimaryTypes
      includedTypes: ["locality", "sublocality", "neighborhood"],
      maxResultCount: parseInt(limit),
      locationRestriction: {
        circle: {
          center: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
          },
          radius: parseFloat(radius),
        },
      },
      languageCode: "en",
    };

    const response = await axios.post(
      `${PLACES_BASE_URL}/places:searchNearby`,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.addressComponents",
        },
      }
    );

    const locations = response.data.places.map((place) => ({
      id: place.id,
      addressLine: place.formattedAddress,
      name: place.displayName?.text,
      town: extractAddressComponentNew(place.addressComponents, "locality"),
      area: extractAddressComponentNew(place.addressComponents, "sublocality"),
      city: extractAddressComponentNew(place.addressComponents, "locality"),
      state: extractAddressComponentNew(
        place.addressComponents,
        "administrative_area_level_1"
      ),
      country: extractAddressComponentNew(place.addressComponents, "country"),
      zipCode: extractAddressComponentNew(
        place.addressComponents,
        "postal_code"
      ),
      landmark: place.displayName?.text,
      latitude: place.location?.latitude || null,
      longitude: place.location?.longitude || null,
      placeId: place.id,
      types: place.types,
      rating: place.rating,
      userRatingsTotal: place.userRatingCount,
      distance: calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        place.location?.latitude,
        place.location?.longitude
      ),
    }));

    // Sort by distance
    locations.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { results: locations },
          "Nearby locations fetched successfully"
        )
      );
  } catch (error) {
    console.error(
      "Google Places SearchNearby error:",
      error.response?.data || error.message
    );
    throw new ApiError(500, "Failed to fetch nearby locations");
  }
});

// Alternative: Use classic Places API Text Search (as fallback)
const searchLocationsClassic = asyncHandler(async (req, res) => {
  const { query, latitude, longitude, radius = 5000, limit = 10 } = req.query;

  if (!query || query.trim().length < 2) {
    throw new ApiError(400, "Search query must be at least 2 characters long");
  }

  if (!GOOGLE_API_KEY) {
    throw new ApiError(500, "Google Places API key not configured");
  }

  try {
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      query.trim()
    )}&key=${GOOGLE_API_KEY}`;

    // Add location bias if coordinates provided
    if (latitude && longitude) {
      url += `&location=${latitude},${longitude}&radius=${radius}`;
    }

    const response = await axios.get(url);

    if (response.data.status !== "OK") {
      throw new ApiError(400, `Google API error: ${response.data.status}`);
    }

    const locations = response.data.results.map((place) => ({
      id: place.place_id,
      addressLine: place.formatted_address,
      name: place.name,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      placeId: place.place_id,
      types: place.types,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      formattedAddress: place.formatted_address,
      vicinity: place.vicinity,
    }));

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { results: locations },
          "Locations fetched successfully (classic API)"
        )
      );
  } catch (error) {
    console.error(
      "Google Places Classic API error:",
      error.response?.data || error.message
    );
    throw new ApiError(500, "Failed to search locations");
  }
});

// Helper function to get place details using NEW Places API
async function getPlaceDetailsNew(placeId) {
  try {
    const response = await axios.get(`${PLACES_BASE_URL}/places/${placeId}`, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask":
          "id,displayName,formattedAddress,location,types,rating,userRatingCount,websiteUri,nationalPhoneNumber,internationalPhoneNumber,regularOpeningHours,priceLevel,businessStatus,currentOpeningHours,utcOffsetMinutes,addressComponents",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching place details (New API):", error.message);
    throw error;
  }
}

// Helper function to extract address components from NEW API
function extractAddressComponentNew(addressComponents, type) {
  if (!addressComponents) return null;

  const component = addressComponents.find(
    (comp) => comp.types && comp.types.includes(type)
  );
  return component ? component.longText || component.shortText : null;
}

// Helper function to calculate distance between coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

export {
  getCurrentLocation,
  searchLocations,
  searchLocationsClassic,
  getLocationDetails,
  autocompleteLocations,
  getNearbyLocations,
};
