import api from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";

//  HELPER: normalize any ID (transactionId / referenceId)
export const normalizeOrderId = (id) =>
  String(id || "")
    .trim()
    .replace(/\s+/g, "");

// Add this helper function to check token validity
const validateToken = async () => {
  try {
    const token = await AsyncStorage.getItem("accessToken");
    if (!token) {
      throw new Error("No token found");
    }
    return token;
  } catch (error) {
    throw new Error("Authentication required");
  }
};

// Update getAuthHeaders to use validateToken
const getAuthHeaders = async () => {
  try {
    const token = await validateToken();
    return { Authorization: `Bearer ${token}` };
  } catch (err) {
    // retry once directly from storage
    const stored = await AsyncStorage.getItem("accessToken");

    if (stored) {
      return { Authorization: `Bearer ${stored}` };
    }

    console.log("   No auth token available");
    throw new Error("AUTH_REQUIRED");
  }
};

// Add this method to check authentication status properly
const checkAuthentication = async () => {
  try {
    const token = await validateToken();
    if (!token) return false;

    // Optional: Verify token with backend
    try {
      await api.get("/users/current-user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return true;
    } catch (error) {
      // Token is invalid, clear it
      await AsyncStorage.multiRemove(["accessToken", "user"]);
      return false;
    }
  } catch (error) {
    return false;
  }
};

// Helper function to filter products based on user preference
const filterProductsByPreference = (products, userPreference) => {
  if (!userPreference || !Array.isArray(products)) {
    return products;
  }

  const pref = userPreference.toLowerCase();

  return products.filter((product) => {
    if (!product || !product.productType) {
      return pref === "non-veg";
    }

    const productType = product.productType.toLowerCase();

    if (pref === "veg") {
      return productType === "veg";
    } else if (pref === "non-veg") {
      return (
        productType === "veg" ||
        productType === "non_veg" ||
        productType === "eggetarian"
      );
    }

    return true;
  });
};

// Helper function to get user preference from storage
const getUserPreference = async () => {
  try {
    const userStr = await AsyncStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user?.preference?.toLowerCase();
    }
    return null;
  } catch (error) {
    console.error("Error getting user preference:", error);
    return null;
  }
};

export const authService = {
  //    FIXED: Login user - Extract token from cookie OR response body
  login: async (credentials) => {
    try {
      console.log("  Sending login request");

      const response = await api.post("/users/login", credentials);

      console.log("  Login response received");
      console.log("Response status:", response.status);
      console.log("  Response structure:", {
        hasData: !!response.data,
        hasNestedData: !!response.data?.data,
        hasUser: !!response.data?.data?.user,
        hasAccessTokenInBody: !!response.data?.data?.accessToken,
        hasCookie: !!response.headers?.["set-cookie"]
      });

      let accessToken = null;

      // 1️⃣ Try cookie header (web style)
      const setCookie = response.headers?.["set-cookie"];
      if (setCookie) {
        const cookieString = Array.isArray(setCookie)
          ? setCookie.join("; ")
          : setCookie;

        const match = cookieString.match(/accessToken=([^;]+)/);
        if (match && match[1]) {
          accessToken = match[1];
          console.log("🍪 Token extracted from cookie");
        }
      }

      // 2️⃣ Try JSON response field (mobile-friendly)
      if (!accessToken && response.data?.data?.accessToken) {
        accessToken = response.data.data.accessToken;
        console.log("📦 Token extracted from response body");
      }

      // 3️⃣ Store token ALWAYS (critical fix)
      if (accessToken) {
        await AsyncStorage.setItem("accessToken", accessToken);
        // Clear any consultant data/state to prevent conflicts
        await AsyncStorage.removeItem("consultant");
        console.log("💾 Token stored in AsyncStorage");
      } else {
        console.warn("    No token found in login response");
      }

      const returnData = {
        ...response.data,
        extractedToken: accessToken  // Add extracted token to response for Login.jsx
      };

      console.log("  Returning to Login.jsx:", {
        hasExtractedToken: !!returnData.extractedToken,
        hasData: !!returnData.data,
        hasUser: !!returnData.data?.user
      });

      // Update FCM token after successful login
      if (accessToken) {
        // Add delay to ensure Firebase is fully initialized
        setTimeout(async () => {
          try {
            const messaging = (await import('@react-native-firebase/messaging')).default;

            // Retry logic for FCM token
            let fcmToken = null;
            let retries = 3;

            while (!fcmToken && retries > 0) {
              try {
                fcmToken = await messaging().getToken();
                if (fcmToken) {
                  console.log("FCM token retrieved:", fcmToken.substring(0, 20) + "...");
                  break;
                }
              } catch (tokenError) {
                retries--;
                console.log(`FCM token retrieval failed (${retries} retries left):`, tokenError.message);
                if (retries > 0) {
                  // Wait 2 seconds before retry
                  await new Promise(resolve => setTimeout(resolve, 2000));
                }
              }
            }

            if (fcmToken) {
              const { updateFcmToken } = await import('./api');
              await updateFcmToken(fcmToken);
              console.log(" FCM token updated after login");
            } else {
              console.log(" FCM token not available after retries - will update on next app start");
            }
          } catch (fcmError) {
            console.log(" FCM token update skipped:", fcmError.message);
            // Don't fail login if FCM token update fails
          }
        }, 2000); // Wait 2 seconds after login before attempting FCM
      }

      return returnData;
    } catch (error) {
      console.error("     Login API error");
      console.error("Status:", error.response?.status);
      console.error("Message:", error.response?.data?.message || error.message);
      throw error;
    }
  },

  // Consultant Login - Extract and store token
  consultantLogin: async (credentials) => {
    try {
      const response = await api.post("/consultant/login", credentials);

      // Get consultant data
      const consultant = response.data?.consultant;

      if (consultant) {
        await AsyncStorage.setItem("consultant", JSON.stringify(consultant));
        // Clear any user data to prevent conflicts
        await AsyncStorage.removeItem("user");
      }

      // Extract and store access token from cookies
      let accessToken = null;
      const setCookie = response.headers?.["set-cookie"];
      if (setCookie) {
        const cookieString = Array.isArray(setCookie) ? setCookie.join("; ") : setCookie;
        const match = cookieString.match(/accessToken=([^;]+)/);
        if (match && match[1]) {
          accessToken = match[1];
          await AsyncStorage.setItem("accessToken", accessToken);
          console.log("  Consultant token stored from cookies");
        }
      }

      // Fallback: Check if token is in response body
      if (!accessToken && response.data?.accessToken) {
        accessToken = response.data.accessToken;
        await AsyncStorage.setItem("accessToken", accessToken);
        console.log("  Consultant token stored from response");
      }

      return consultant;
    } catch (error) {
      console.error("Consultant login failed:", error);
      throw error;
    }
  },

  // Get stored consultant from AsyncStorage
  getStoredConsultant: async () => {
    try {
      const consultantData = await AsyncStorage.getItem("consultant");
      return consultantData ? JSON.parse(consultantData) : null;
    } catch (error) {
      console.error("Error getting stored consultant:", error);
      return null;
    }
  },

  // Get consultant profile from API
  getConsultantProfile: async () => {
    try {
      const storedConsultant = await AsyncStorage.getItem("consultant");
      if (!storedConsultant) {
        // 🤫 Web Parity: Don't log or throw if not a consultant
        // throw new Error("No consultant data found");
        return null;
      }
      const consultant = JSON.parse(storedConsultant);
      const response = await api.get(`/consultant/${consultant.username}`);
      // Update stored data with fresh data
      if (response.data?.data) {
        await AsyncStorage.setItem("consultant", JSON.stringify(response.data.data));
      }
      return response.data;
    } catch (error) {
      // 🤫 Web Parity: Silencing this log as it can be noisy during regular user sessions
      // console.error("Error fetching consultant profile:", error);
      throw error;
    }
  },

  // Update consultant profile
  updateConsultantProfile: async (formData) => {
    try {
      console.log("  Updating consultant profile");
      const response = await api.patch("/consultant/update", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000,
      });
      console.log("  Consultant profile updated");
      // Update stored consultant data
      if (response.data?.data) {
        await AsyncStorage.setItem("consultant", JSON.stringify(response.data.data));
      }
      return response.data;
    } catch (error) {
      console.error("     Error updating consultant profile:", error);
      throw error;
    }
  },

  // Add/update consultant bank details
  addConsultantBankDetails: async (bankDetails) => {
    try {
      console.log("  Updating bank details");
      const response = await api.post("/consultant/bank-details", bankDetails);
      console.log("  Bank details updated");
      return response.data;
    } catch (error) {
      console.error("     Error updating bank details:", error);
      throw error;
    }
  },

  // Update consultant availability slots
  updateConsultantSlots: async (availability) => {
    try {
      console.log("  Updating availability slots");
      const response = await api.put("/consultant/update-slots", { availability });
      console.log("  Availability updated");
      return response.data;
    } catch (error) {
      console.error("     Error updating availability:", error);
      throw error;
    }
  },

  // Update consultant pricing/durations
  updateConsultantPricing: async (durations) => {
    try {
      console.log("  Updating pricing");
      const response = await api.put("/consultant/update-durations", { durations });
      console.log("  Pricing updated");
      return response.data;
    } catch (error) {
      console.error("     Error updating pricing:", error);
      throw error;
    }
  },

  // Get consultant bookings
  getConsultantBookings: async () => {
    try {
      console.log("  Fetching consultant bookings");
      const response = await api.get("/booking/consultant");
      console.log("  Bookings fetched");
      return response.data;
    } catch (error) {
      console.error("     Error fetching bookings:", error);
      throw error;
    }
  },

  // Register user
  register: async (userData) => {
    try {
      const formData = new FormData();

      Object.keys(userData).forEach((key) => {
        if (key === "profileImage" && userData[key]) {
          const imageUri = userData[key];
          const filename = imageUri.split("/").pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : "image/jpeg";

          formData.append(key, {
            uri: imageUri,
            name: filename,
            type: type,
          });
        } else {
          formData.append(key, userData[key]);
        }
      });

      console.log("  Registering user");

      const response = await api.post("/users/register", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000,
      });

      console.log("  Registration successful");
      return response.data;
    } catch (error) {
      console.error(
        "  Registration error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Update profile image
  updateProfileImage: async (formData) => {
    try {
      console.log("  Updating profile image");

      const response = await api.put("/users/update", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000,
      });

      console.log("  Profile image updated successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Update profile image error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Update profile
  updateProfile: async (formData) => {
    try {
      console.log("  Updating profile");

      const response = await api.put("/users/update", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000,
      });

      console.log("  Profile updated successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Update profile error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // HomeScreen Banners
  getBanners: async () => {
    try {
      const response = await api.get("/banner");
      return response.data;
    } catch (error) {
      console.error(
        "  Get banners error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // ========================================================================
  // ORDER METHODS (UPDATED)
  // ========================================================================

  // Replace the createOrder method in authService.js with this:

  createOrder: async (orderData, token) => {
    try {
      console.log("📦 Creating order", orderData);

      if (!token) throw new Error("TOKEN_REQUIRED");

      const response = await api.post("/orders", orderData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("📦 Raw order creation response:", response.data);

      //    FIX: Handle array response (backend returns [order] sometimes)
      let orderDataResponse = response?.data?.data ?? response?.data;

      // If response is an array, take the first element
      if (Array.isArray(orderDataResponse)) {
        console.log("🛒 Array response detected, taking first order");
        if (orderDataResponse.length === 0) {
          throw new Error("No orders created");
        }
        orderDataResponse = orderDataResponse[0];
      }

      // Validate response structure
      if (!orderDataResponse || typeof orderDataResponse !== 'object') {
        console.error("     Invalid order response structure:", orderDataResponse);
        throw new Error("Invalid order response");
      }

      // Ensure referenceId exists
      if (!orderDataResponse.referenceId && !orderDataResponse.id) {
        console.error("     Order missing referenceId and id:", orderDataResponse);
        throw new Error("Order creation failed - missing identifiers");
      }

      return {
        success: true,
        data: orderDataResponse,
        message: response?.data?.message || "Order created successfully"
      };
    } catch (error) {
      console.error("     Create Order Error:", error.response?.data || error);

      // Check for duplicate order error
      const errorMsg = error.response?.data?.message || error.message || "";
      if (errorMsg.includes("Order_referenceId_key") ||
        errorMsg.includes("Unique constraint failed") ||
        errorMsg.includes("duplicate key")) {
        throw new Error("DUPLICATE_ORDER");
      }

      throw error;
    }
  }
  ,
  // Get user orders
  getOrders: async () => {
    try {
      console.log("  Fetching user orders");

      await validateToken();
      const headers = await getAuthHeaders();

      const response = await api.get("/orders", { headers });

      console.log("  Orders fetched successfully");
      console.log("Total orders:", response.data?.data?.length || 0);

      return response.data;
    } catch (error) {
      console.error(
        "  Get orders error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  //  CHANGE #2 — Get order by ID with normalized ID
  getOrderById: async (orderId) => {
    try {
      const normalized = normalizeOrderId(orderId);
      console.log("  Fetching order:", normalized);

      await validateToken();
      const headers = await getAuthHeaders();

      const response = await api.get(`/orders/${normalized}`, { headers });

      console.log("  Order fetched successfully");
      console.log("Order data:", response.data);

      return response.data;
    } catch (error) {
      console.error(
        "  Get order error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Try to fetch delivery details for an order (optional endpoint)
  // Falls back gracefully if backend does not expose a dedicated delivery endpoint
  // Try to fetch delivery details for an order (optional endpoint)
  // Falls back gracefully if backend does not expose a dedicated delivery endpoint
  getOrderDelivery: async (orderId) => {
    // Disabled as per user request to avoid backend changes (endpoint does not exist)
    console.warn("  Delivery endpoint disabled by configuration.");
    return null;

    /* RE-ENABLE WHEN BACKEND ENDPOINT IS RESTORED
    try {
      const normalized = normalizeOrderId(orderId);
      console.log("  Fetching delivery info for order:", normalized);

      await validateToken();
      const headers = await getAuthHeaders();

      // Attempt common delivery endpoint
      const response = await api.get(`/orders/${normalized}/delivery`, { headers, timeout: 10000 });

      console.log("  Delivery info fetched successfully");
      return response.data;
    } catch (error) {
      // If endpoint doesn't exist or fails, just return null and let caller rely on order payload
      console.warn("  Delivery endpoint unavailable or failed:", error?.response?.status || error.message);
      return null;
    }
    */
  },

  // Cancel order
  cancelOrder: async (orderId) => {
    try {
      console.log("  Cancelling order:", orderId);

      await validateToken();
      const headers = await getAuthHeaders();

      const response = await api.put(
        `/orders/cancel/${orderId}`,
        {},
        { headers }
      );

      console.log("  Order cancelled successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Cancel order error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // ========================================================================
  // CATEGORY & PRODUCT METHODS
  // ========================================================================

  // Get all categories
  getCategories: async () => {
    try {
      console.log("  Fetching categories");

      const response = await api.get("/categories");

      console.log("  Categories fetched successfully");
      console.log("Total categories:", response.data?.data?.length || 0);

      return response.data;
    } catch (error) {
      console.error(
        "  Get categories error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Get all occasions
  getOccasions: async () => {
    try {
      console.log("  Fetching occasions");

      const response = await api.get("/occasion");

      console.log("  Occasions fetched successfully");
      console.log("Total occasions:", response.data?.data?.length || 0);

      return response.data;
    } catch (error) {
      console.error(
        "  Get occasions error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Get all ingredients (filtered by user preference)
  getIngredients: async () => {
    try {
      console.log("  Fetching ingredients");

      const response = await api.get("/ingredients");

      console.log("  Ingredients fetched successfully");
      console.log("Total ingredients (raw):", response.data?.data?.length || 0);

      const userPreference = await getUserPreference();

      let ingredients = response.data?.data || [];

      if (userPreference === "veg" && ingredients.length > 0) {
        ingredients = ingredients.filter((ingredient) => {
          if (!ingredient.products || !Array.isArray(ingredient.products)) {
            return true;
          }

          const hasVegProduct = ingredient.products.some((product) => {
            const productType = product.productType?.toLowerCase();
            return productType === "veg";
          });

          return hasVegProduct;
        });

        console.log("Total ingredients after veg filter:", ingredients.length);
      }

      return {
        ...response.data,
        data: ingredients,
      };
    } catch (error) {
      console.error(
        "  Get ingredients error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Get ingredients by category
  getIngredientsByCategory: async (categoryId) => {
    try {
      console.log("  Fetching ingredients by category:", categoryId);

      const response = await api.get(`/ingredients?category=${categoryId}`);

      console.log("  Category ingredients fetched successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Get ingredients by category error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Get all products (with user preference filtering)
  getAllProducts: async (filters = {}) => {
    try {
      console.log("  Fetching all products");

      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (
          filters[key] !== undefined &&
          filters[key] !== null &&
          filters[key] !== ""
        ) {
          queryParams.append(key, filters[key]);
        }
      });

      const queryString = queryParams.toString();
      const url = queryString ? `/products?${queryString}` : "/products";

      const response = await api.get(url);

      console.log("  Products fetched successfully");

      const userPreference = await getUserPreference();

      let products = response.data?.data || [];

      if (userPreference && products.length > 0) {
        products = filterProductsByPreference(products, userPreference);
      }

      console.log("Total products after filtering:", products.length);

      return {
        ...response.data,
        data: products,
      };
    } catch (error) {
      console.error(
        "  Get products error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Get filtered products
  getFilteredProducts: async (filters = {}) => {
    try {
      console.log("  Fetching filtered products with filters:", filters);

      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (
          filters[key] !== undefined &&
          filters[key] !== null &&
          filters[key] !== ""
        ) {
          queryParams.append(key, filters[key]);
        }
      });

      const queryString = queryParams.toString();
      const url = queryString ? `/products?${queryString}` : "/products";

      const response = await api.get(url);

      console.log("  Filtered products fetched successfully");

      const userPreference = await getUserPreference();

      let products = response.data?.data || [];

      if (userPreference && products.length > 0) {
        products = filterProductsByPreference(products, userPreference);
      }

      console.log(
        "Total filtered products after preference filter:",
        products.length
      );

      return {
        ...response.data,
        data: products,
      };
    } catch (error) {
      console.error(
        "  Get filtered products error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Get discounted products
  getDiscountedProducts: async () => {
    try {
      console.log("  Fetching discounted products");

      const response = await api.get("/products/discount");

      console.log("  Discounted products fetched successfully");

      const userPreference = await getUserPreference();
      let products = response.data?.data || [];

      if (userPreference && products.length > 0) {
        products = filterProductsByPreference(products, userPreference);
      }

      console.log("Total discounted products after preference filter:", products.length);

      return {
        ...response.data,
        data: products
      };
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn("  Discount endpoint not found, returning empty list.");
        return { data: [] };
      }
      console.error("Error fetching discounted products:", error);
      throw error;
    }
  },

  // Get product by ID
  getProductById: async (productId) => {
    try {
      console.log("  Fetching product:", productId);

      const response = await api.get(`/products/${productId}`);

      console.log("  Product fetched successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Get product error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Get all communities
  getCommunities: async () => {
    try {
      console.log("  Fetching communities");

      const response = await api.get("/community");

      console.log("  Communities fetched successfully");
      console.log("Total communities:", response.data?.data?.length || 0);

      return response.data;
    } catch (error) {
      console.error(
        "  Get communities error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  getConsultants: async () => {
    try {
      console.log("  Fetching consultants");

      const response = await api.get("/consultant");

      console.log("  Consultants fetched successfully");
      console.log("Total consultants:", response.data?.data?.length || 0);

      return response.data;
    } catch (error) {
      console.error(
        "  Get consultants error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Get top/pinned consultants for "Top Expert" badge feature
  getTopConsultants: async () => {
    try {
      console.log("  Fetching top consultants");

      const response = await api.get("/consultant/top-consultants");

      console.log("  Top consultants fetched successfully");
      console.log("Total top consultants:", response.data?.data?.length || 0);

      return response.data;
    } catch (error) {
      console.error(
        "     Get top consultants error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  getScoop: async () => {
    try {
      console.log("  Fetching scoop data");

      const response = await api.get("/reports/scoop");

      console.log("  Scoop data fetched successfully");
      console.log("Scoop data:", response.data);

      return response.data;
    } catch (error) {
      console.error(
        "  Get scoop error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Get all testimonials
  getTestimonials: async () => {
    try {
      console.log("  Fetching testimonials");

      const response = await api.get("/testimonials");

      console.log("  Testimonials fetched successfully");
      console.log("Total testimonials:", response.data?.data?.length || 0);

      return response.data;
    } catch (error) {
      console.error(
        "  Get testimonials error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Subscribe to newsletter
  subscribeToNewsletter: async (email) => {
    try {
      console.log("  Subscribing to newsletter:", email);

      const response = await api.post("/contact", { email });

      console.log("  Newsletter subscription successful");
      return response.data;
    } catch (error) {
      console.error(
        "  Newsletter subscription error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Check if product is in favorites
  checkFavorite: async (productId) => {
    try {
      // 🛡️ Must be a regular user (Web Parity)
      const user = await AsyncStorage.getItem("user");
      if (!user) return { success: true, data: { isFavorite: false } };

      console.log("  Checking favorite status for product:", productId);

      const response = await api.get("/wishlist");

      if (response.data?.success && response.data?.data) {
        const isFavorite = response.data.data.some((item) => {
          const pid = String(item?.id ?? item?._id ?? item?.productId ?? "");
          return pid === String(productId);
        });

        console.log("  Favorite status checked successfully");
        return { success: true, data: { isFavorite } };
      } else {
        return { success: true, data: { isFavorite: false } };
      }
    } catch (error) {
      console.error(
        "  Check favorite error:",
        error.response?.data || error.message
      );
      return { success: true, data: { isFavorite: false } };
    }
  },

  // Toggle favorite status
  toggleFavorite: async (productId) => {
    try {
      // 🛡️ Must be a regular user (Web Parity)
      const user = await AsyncStorage.getItem("user");
      if (!user) return { message: "Not available for consultants" };

      console.log("  Toggling favorite for product:", productId);
      const response = await api.post(`/wishlist/${productId}`);
      console.log("  Favorite toggled successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Toggle favorite error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Submit review
  submitReview: async (reviewData) => {
    try {
      console.log("  Submitting review:", reviewData);

      const response = await api.post("/reviews", reviewData, {
        headers: { "Content-Type": "application/json" },
      });

      console.log("  Review submitted successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Submit review error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Get product reviews
  getProductReviews: async (productId) => {
    try {
      console.log("  Fetching reviews for product:", productId);

      const response = await api.get(`/reviews/${productId}`);

      console.log("  Product reviews fetched successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Get product reviews error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Get user reviews
  getUserReviews: async () => {
    try {
      console.log("  Fetching user reviews");

      const response = await api.get("/reviews/user");

      console.log("  User reviews fetched successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Get user reviews error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Delete review
  deleteReview: async (reviewId) => {
    try {
      console.log("  Deleting review:", reviewId);

      const response = await api.delete(`/reviews/${reviewId}`);

      console.log("  Review deleted successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Delete review error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  getConsultantById: async (consultantId) => {
    try {
      console.log("  Fetching consultant:", consultantId);

      const response = await api.get(`/consultant/${consultantId}`);

      console.log("  Consultant fetched successfully");
      console.log("Response structure:", response.data);

      return response.data;
    } catch (error) {
      console.error(
        "  Get consultant error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  createBooking: async (bookingData) => {
    try {
      console.log("  Creating booking:", bookingData);

      const response = await api.post("/booking", bookingData);

      console.log("  Booking created successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Create booking error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  //  CHANGE #4 — Generate PayU hash with auth
  generatePayUHash: async (paymentData) => {
    try {
      console.log("  Generating PayU hash:", paymentData);

      const token = await AsyncStorage.getItem("accessToken");

      const response = await api.post("/payU/hash", paymentData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("  PayU hash generated successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Generate PayU hash error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Create booking with payment
  createBookingWithPayment: async (bookingData) => {
    try {
      console.log("  Creating booking with payment:", bookingData);

      const response = await api.post("/booking", bookingData);

      console.log("  Booking created successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Create booking with payment error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Update payment status
  updatePaymentStatus: async (bookingId, paymentData) => {
    try {
      console.log("  Updating payment status for booking:", bookingId);

      const response = await api.put(
        `/booking/payment/${bookingId}`,
        paymentData
      );

      console.log("  Payment status updated successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Update payment status error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Get booking by ID
  getBookingById: async (bookingId) => {
    try {
      console.log("  Fetching booking:", bookingId);

      const response = await api.get(`/booking/${bookingId}`);

      console.log("  Booking fetched successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Get booking error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Get user bookings
  getUserBookings: async () => {
    try {
      console.log("  Fetching user bookings");

      const response = await api.get("/booking/user");

      console.log("  User bookings fetched successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Get user bookings error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Subscription methods
  getSubscriptionPlans: async () => {
    try {
      console.log("  Fetching subscription plans");
      await validateToken();
      const headers = await getAuthHeaders();
      const response = await api.get("/subscription", { headers });
      console.log("  Subscription plans fetched successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Get subscription plans error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  getUserSubscriptions: async () => {
    try {
      console.log("  Fetching user subscriptions");
      await validateToken();
      const headers = await getAuthHeaders();
      const response = await api.get("/subscription/user", { headers });
      console.log("  User subscriptions fetched successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Get user subscriptions error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Placeholder for old createSubscription - removed to use the updated version at the bottom of file

  cancelSubscription: async (subscriptionId) => {
    try {
      console.log("  Cancelling subscription:", subscriptionId);
      await validateToken();
      const headers = await getAuthHeaders();
      const response = await api.patch(
        `/subscription/cancel/${subscriptionId}`,
        {},
        { headers }
      );
      console.log("  Subscription cancelled successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Cancel subscription error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  toggleSubscriptionStatus: async (subscriptionId, status) => {
    try {
      console.log("  Toggling subscription status:", {
        subscriptionId,
        status,
      });
      await validateToken();
      const headers = await getAuthHeaders();
      const response = await api.put(
        `/subscription/toggle/${subscriptionId}`,
        { status },
        { headers }
      );
      console.log("  Subscription status updated successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Toggle subscription status error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Vendor methods
  getVendors: async () => {
    try {
      console.log("  Fetching vendors");
      await validateToken();
      const headers = await getAuthHeaders();
      const response = await api.get("/vendor/kitchens", { headers });
      console.log("  Vendors fetched successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Get vendors error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Get all kitchens
  getKitchens: async () => {
    try {
      await validateToken();
      const headers = await getAuthHeaders();
      const response = await api.get("/vendor/kitchens", { headers });

      console.log("  Kitchens fetched successfully from: /vendor/kitchens");

      let kitchensData;
      if (response.data?.data) {
        kitchensData = response.data.data;
      } else if (response.data) {
        kitchensData = response.data;
      } else {
        kitchensData = response;
      }

      console.log("Total kitchens:", kitchensData?.length || 0);
      return kitchensData || [];
    } catch (error) {
      console.error("  Get kitchens error:", error);
      return [];
    }
  },

  getKitchenById: async (kitchenId) => {
    try {
      console.log("  Fetching kitchen by ID:", kitchenId);

      const endpoints = [
        `/vendor/kitchen/${kitchenId}`,
        `/vendor/${kitchenId}`,
        `/vendor/kitchens/${kitchenId}`,
      ];

      await validateToken();
      const headers = await getAuthHeaders();
      for (const endpoint of endpoints) {
        try {
          const response = await api.get(endpoint, { headers });
          console.log("  Kitchen fetched successfully from:", endpoint);

          let kitchenData;
          if (response.data?.data) {
            kitchenData = response.data.data;
          } else if (response.data) {
            kitchenData = response.data;
          } else {
            kitchenData = response;
          }

          if (kitchenData) {
            return kitchenData;
          }
        } catch (error) {
          console.log(`Endpoint ${endpoint} failed:`, error.message);
          continue;
        }
      }

      try {
        const vendorsResponse = await api.get("/vendor/kitchens");
        const vendors =
          vendorsResponse.data?.data || vendorsResponse.data || [];

        const kitchen = vendors.find(
          (vendor) =>
            vendor.vendor?.id === kitchenId ||
            vendor.id === kitchenId ||
            vendor.vendorId === kitchenId ||
            vendor.userId === kitchenId
        );

        if (kitchen) {
          console.log("  Kitchen found in vendors list");
          return kitchen.vendor || kitchen;
        }
      } catch (fallbackError) {
        console.error("Vendor search failed:", fallbackError);
      }

      throw new Error("Kitchen not found");
    } catch (error) {
      console.error("  Get kitchen by ID error:", error);
      throw error;
    }
  },

  // Placeholder removed as it's duplicated and messy. 
  // The correct version is at the bottom of the file using the /products?vendorId= pattern.

  getDiscounts: async (vendorId) => {
    try {
      console.log("  Fetching discounts for vendor:", vendorId);
      await validateToken();
      const headers = await getAuthHeaders();

      // Pattern fix: Try plural discounts with query parameter first (matching products fix)
      try {
        const response = await api.get(`/discounts?vendorId=${vendorId}`, {
          headers,
        });
        console.log("  Discounts fetched successfully from plural endpoint");
        return response.data;
      } catch (e) {
        // Fallback to singular endpoint
        console.log("  Trying singular discount endpoint...");
        const response = await api.get(`/discount?vendorId=${vendorId}`, {
          headers,
        });
        console.log("  Discounts fetched successfully from singular endpoint");
        return response.data;
      }
    } catch (error) {
      console.error(
        "  Get discounts error:",
        error.response?.data || error.message
      );
      // If both fail, return empty list instead of throwing to prevent component crash
      return [];
    }
  },

  applyDiscount: async (discountId, data) => {
    try {
      console.log("  Applying discount:", discountId);

      // If we have local calculation data, we can fail gracefully if APIs are down
      const canCalculateLocally = data?.orderTotal !== undefined &&
        data?.discountValue !== undefined;

      await validateToken();
      const headers = await getAuthHeaders();

      // Try plural discounts/apply first (matches listing fix /discounts)
      try {
        const response = await api.post(`/discounts/apply/${discountId}`, data, {
          headers,
        });
        return response.data;
      } catch (e1) {
        console.log("  Plural /discounts/apply failed, trying /discount/apply (singular)...");
        try {
          const response = await api.post(`/discount/apply/${discountId}`, data, {
            headers,
          });
          return response.data;
        } catch (e2) {
          console.log("  Trying /promoCode/apply as fallback...");
          try {
            const response = await api.post("/promoCode/apply", {
              id: discountId,
              productAmount: data?.orderTotal,
              ...data
            }, {
              headers,
            });
            return response.data;
          } catch (e3) {
            //    Final Fallback: Client-side calculation if we have the data
            if (canCalculateLocally) {
              console.log("    API endpoints failed. Performing client-side calculation.");

              let discountAmount = 0;
              const { orderTotal, discountValue, discountType } = data;

              if (String(discountType).toUpperCase() === 'PERCENTAGE') {
                discountAmount = (orderTotal * discountValue) / 100;
              } else {
                discountAmount = Number(discountValue);
              }

              // Ensure reasonable bounds
              // User requirement: final price must be at least 1
              let finalPrice = orderTotal - discountAmount;

              if (finalPrice < 1) {
                finalPrice = 1;
                // Adjust discount to maintain consistency (Total = Final + Discount)
                discountAmount = Math.max(0, orderTotal - 1);
              }

              return {
                success: true,
                discountAmount: discountAmount,
                finalPrice: finalPrice,
                message: "Discount applied (calculated)"
              };
            }
            throw e3;
          }
        }
      }
    } catch (error) {
      console.error(
        "  Apply discount error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  sendOTP: async (email) => {
    try {
      const response = await api.post("/users/send-otp", { email });
      return response.data;
    } catch (error) {
      console.error("  Send OTP error:", error.response?.data || error.message);
      throw error;
    }
  },

  verifyOTP: async (email, otp) => {
    try {
      const response = await api.post("/users/verify-otp", { email, otp });
      return response.data;
    } catch (error) {
      console.error(
        "  Verify OTP error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  resetPassword: async (email, otp, newPassword) => {
    try {
      const response = await api.post("/users/reset-password", {
        email,
        otp,
        newPassword,
      });
      return response.data;
    } catch (error) {
      console.error(
        "  Reset password error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  sendSignupOTP: async (email, phone) => {
    try {
      const payload = {};
      if (email) payload.email = email;
      if (phone) payload.phone = phone;

      const response = await api.post("/users/signup-otp", payload, {
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      console.error(
        "  Send signup OTP error:",
        error.response?.data || error.message
      );

      if (error.code === "ECONNABORTED") {
        const timeoutError = new Error(
          "Request timeout. Check your internet connection."
        );
        timeoutError.code = "TIMEOUT";
        throw timeoutError;
      }

      throw error;
    }
  },

  verifySignupOTP: async (emailOrPhone, otp) => {
    try {
      const payload = { otp };
      if (emailOrPhone.includes("@")) payload.email = emailOrPhone;
      else payload.phone = emailOrPhone;

      const response = await api.post("/users/verify-signup-otp", payload);
      return response.data;
    } catch (error) {
      console.error(
        "  Verify signup OTP error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  getCurrentUser: async () => {
    try {
      await validateToken();
      const headers = await getAuthHeaders();
      const response = await api.get("/users/current-user", { headers });

      if (response.data.success && response.data.data) {
        await AsyncStorage.setItem("user", JSON.stringify(response.data.data));
      }

      return response.data;
    } catch (error) {
      console.error(
        "  Get current user error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post("/users/logout");
      await AsyncStorage.multiRemove(["accessToken", "user"]);
      console.log("  Logout successful");
    } catch (error) {
      console.error("  Logout error:", error.response?.data || error.message);
      await AsyncStorage.multiRemove(["accessToken", "user"]);
      throw error;
    }
  },

  checkAuthentication,
  isAuthenticated: async () => {
    try {
      return await checkAuthentication();
    } catch (error) {
      console.error("  Check authentication error:", error);
      return false;
    }
  },

  getStoredUser: async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error("  Get stored user error:", error);
      return null;
    }
  },

  getCart: async () => {
    try {
      // 🛡️ Must be a regular user (Web Parity)
      const user = await AsyncStorage.getItem("user");
      if (!user) return [];

      await validateToken();
      const headers = await getAuthHeaders();
      const response = await api.get("/cart", { headers });
      return response.data?.data || [];
    } catch (error) {
      console.error("  Get cart error:", error.response?.data || error.message);
      throw error;
    }
  },

  addToCart: async ({ productId, weightId, quantity = 1, Addition = null }) => {
    try {
      // 🛡️ Web Parity: Double Guard
      const isConsultant = await AsyncStorage.getItem("consultant");
      if (isConsultant) return null; // Explicitly block consultants

      const user = await AsyncStorage.getItem("user");
      if (!user) return null; // Block if not a regular user

      console.log("     addToCart called with:");
      console.log("  - productId:", productId, typeof productId);
      console.log("  - weightId:", weightId, typeof weightId);
      console.log("  - quantity:", quantity, typeof quantity);
      console.log("  - Addition:", Addition ? "present" : "null");

      //   CRITICAL VALIDATION: Catch missing IDs early
      if (!productId || productId === 'undefined') {
        const error = new Error("     CRITICAL: productId is missing or undefined! This indicates the app is running cached code. Please reload the app with cache clear.");
        console.error(error.message);
        throw error;
      }

      if (!weightId || weightId === 'undefined') {
        const error = new Error("     CRITICAL: weightId is missing or undefined! This indicates the app is running cached code. Please reload the app with cache clear.");
        console.error(error.message);
        throw error;
      }

      await validateToken();
      const headers = await getAuthHeaders();
      const payload = { productId, weightId, quantity, Addition };

      console.log("  Sending to API:", JSON.stringify(payload, null, 2));

      const response = await api.post("/cart/add", payload, { headers });
      return response.data;
    } catch (error) {
      console.error(
        "  Add to cart error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  updateCartQuantity: async (cartItemId, quantity) => {
    try {
      // 🛡️ Must be a regular user
      const user = await AsyncStorage.getItem("user");
      if (!user) return null;

      await validateToken();
      const headers = await getAuthHeaders();
      const response = await api.put(
        `/cart/update/${cartItemId}`,
        { quantity },
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error(
        "  Update cart item error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  removeFromCart: async (cartItemId) => {
    try {
      // 🛡️ Must be a regular user (Web Parity)
      const user = await AsyncStorage.getItem("user");
      if (!user) return null;

      await validateToken();
      const headers = await getAuthHeaders();
      const response = await api.delete(`/cart/remove/${cartItemId}`, {
        headers,
      });
      return response.data;
    } catch (error) {
      console.error(
        "  Remove cart item error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Create subscription order (for payment)
  createSubscriptionOrder: async (orderData) => {
    try {
      console.log("  Creating subscription order:", orderData);

      await validateToken();
      const headers = await getAuthHeaders();

      const response = await api.post("/subscription/order", orderData, {
        headers,
      });

      console.log("  Subscription order created successfully");
      return response.data;
    } catch (error) {
      console.error(
        "  Create subscription order error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Get wishlist items
  getWishlist: async () => {
    try {
      console.log("  Fetching wishlist");

      const hasValidToken = await authService.isAuthenticated();
      if (!hasValidToken) {
        throw new Error("Authentication required");
      }

      const headers = await getAuthHeaders();
      const response = await api.get("/wishlist", { headers });

      console.log("  Wishlist fetched successfully");
      console.log("Wishlist items:", response.data?.data?.items?.length || 0);

      return response.data;
    } catch (error) {
      console.error(
        "  Get wishlist error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  searchProducts: async (searchTerm) => {
    try {
      const response = await api.get(
        `/products?search=${encodeURIComponent(searchTerm)}`
      );

      const userPreference = await getUserPreference();

      if (userPreference && response.data?.data) {
        const filteredProducts = filterProductsByPreference(
          response.data.data,
          userPreference
        );
        return {
          ...response.data,
          data: filteredProducts,
        };
      }

      return response.data;
    } catch (error) {
      console.error("Error searching products:", error);
      throw error;
    }
  },

  // ========================================================================
  // SUBSCRIPTION METHODS
  // ========================================================================

  // Get wishlist items
  getWishlist: async () => {
    try {
      console.log("  Fetching wishlist");

      // 🛡️ Must be a regular user (Web Parity)
      const user = await AsyncStorage.getItem("user");
      if (!user) {
        console.log("  Not a user, skipping wishlist fetch");
        return { data: { items: [] } };
      }

      await validateToken();
      const headers = await getAuthHeaders();
      const response = await api.get("/wishlist", { headers });

      console.log("  Wishlist fetched successfully");
      console.log("Wishlist items:", response.data?.data?.items?.length || 0);

      return response.data;
    } catch (error) {
      console.error(
        "  Get wishlist error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Create subscription with weekly schedule
  createSubscription: async (subscriptionData) => {
    try {
      console.log("📝 Creating subscription with data:", subscriptionData);

      await validateToken();
      const headers = await getAuthHeaders();

      const response = await api.post("/subscription", subscriptionData, {
        headers,
      });

      console.log("  Subscription created successfully");
      return response.data;
    } catch (error) {
      console.error(
        "     Create subscription error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Get vendor products for subscription meal planning
  getVendorProducts: async (vendorId) => {
    try {
      console.log("  Fetching vendor products for:", vendorId);

      // Use products endpoint with vendorId filter
      const response = await api.get(`/products?vendorId=${vendorId}`);

      console.log("  Vendor products fetched successfully");
      console.log("Total products:", response.data?.data?.length || 0);

      return response.data;
    } catch (error) {
      console.error(
        "  Get vendor products error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Get product add-ons and customization options
  getProductAddOns: async (productId) => {
    try {
      console.log("📦 Fetching add-ons for product:", productId);

      // Use the production endpoint: /addons/product/:id
      try {
        const response = await api.get(`/addons/product/${productId}`);
        console.log("   API Response:", JSON.stringify(response.data, null, 2));

        // Production response structure: { statusCode: 200, data: { addOnCategories: [...] } }
        // Sometimes it might be data.data.addOnCategories
        let addOnCategories = [];
        if (response.data?.data?.addOnCategories) {
          addOnCategories = response.data.data.addOnCategories;
        } else if (response.data?.addOnCategories) {
          addOnCategories = response.data.addOnCategories;
        }

        console.log("  Add-ons fetched:", addOnCategories.length, "categories");
        return { data: { addOnCategories } };
      } catch (endpointError) {

        // Fallback: Try to get product details which might include add-ons
        try {
          const productResponse = await api.get(`/products/${productId}`);
          const productData = productResponse?.data?.data || productResponse?.data;

          if (productData?.addOnCategories && Array.isArray(productData.addOnCategories)) {
            console.log("  Add-ons found in product data");
            return { data: { addOnCategories: productData.addOnCategories } };
          }

          // Check if product has Addition field with addOns
          if (productData?.Addition?.addOns && Array.isArray(productData.Addition.addOns)) {
            console.log("  Add-ons found in Addition field");
            // Convert to category format
            return {
              data: {
                addOnCategories: [{
                  id: 'default',
                  name: 'Add-ons',
                  addOns: productData.Addition.addOns,
                  maxSelection: productData.Addition.addOns.length,
                }]
              }
            };
          }
        } catch (productError) {
          console.log("    Could not fetch product data");
        }
      }

      // Return empty structure if no add-ons available
      console.log("ℹ️ No add-ons available for this product");
      return { data: { addOnCategories: [] } };
    } catch (error) {
      console.error(
        "     Get product add-ons error:",
        error.response?.data || error.message
      );
      // Return empty structure instead of throwing error
      return { data: { addOnCategories: [] } };
    }
  },

  // Add to cart with customization - 🛡️ User Check (Matches Web)
  addToCartWithCustomization: async (customizationData) => {
    try {
      // Must be a regular user
      const user = await AsyncStorage.getItem("user");
      if (!user) return null;

      const headers = await getAuthHeaders();
      console.log("🛒 Adding customized product to cart:", customizationData);

      const payload = {
        productId: customizationData.productId,
        weightId: customizationData.weightId,
        quantity: customizationData.quantity,
        addOns: customizationData.addOns || [],
      };

      const response = await api.post("/cart", payload, { headers });

      console.log("  Customized product added to cart");
      return response.data;
    } catch (error) {
      console.error(
        "     Add to cart with customization error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  // Update cart item customization - 🛡️ User Check (Matches Web)
  updateCartItemCustomization: async (cartItemId, customizationData) => {
    try {
      // Must be a regular user
      const user = await AsyncStorage.getItem("user");
      if (!user) return null;

      const headers = await getAuthHeaders();
      console.log("✏️ Updating cart item customization:", cartItemId);

      const payload = {
        addOns: customizationData.addOns || [],
        quantity: customizationData.quantity,
      };

      const response = await api.put(`/cart/${cartItemId}`, payload, { headers });

      console.log("  Cart item customization updated");
      return response.data;
    } catch (error) {
      console.error(
        "     Update cart item customization error:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  filterProductsByPreference,
  getUserPreference,
};
