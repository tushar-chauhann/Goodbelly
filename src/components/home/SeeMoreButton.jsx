import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Alert,
  Pressable,
  Animated,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import tw from "twrnc";
import axios from "axios";
import Icon from "react-native-vector-icons/MaterialIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import * as AuthModule from "../../services/authService.js";
import { useRoute } from "@react-navigation/native";
import { fontStyles } from "../../utils/fontStyles";
import CustomizationPopup from "../CustomizationPopup";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchCart,
  addToCart,
  updateCartItemQty,
  removeCartItem,
} from "../../redux/slicer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LeftCategories from "../seeMoreProducts/LeftCategories";
import FilterOverlay from "../seeMoreProducts/FilterOverlay";
import SortOverlay from "../seeMoreProducts/SortOverlay";
import KitchenConflictPopup from "../CustomPopup/KitchenConflictPopup";
import ProductSkeleton from "../ProductSkeleton";

import { API_BASE_URL } from "@env";

const authService = AuthModule.authService ?? AuthModule.default ?? AuthModule;

const { width, height } = Dimensions.get("window");

// --- API base
const ENV_URL = API_BASE_URL;
if (!ENV_URL) console.warn("    API_BASE_URL missing in .env");
const API_BASE = ENV_URL.replace(/\/$/, "").endsWith("/api/v1")
  ? ENV_URL
  : `${ENV_URL.replace(/\/$/, "")}/api/v1`;

const UI = {
  cardBg: "#FFFFFF",
  title: "#111827",
  price: "#111827",
  muted: "#6B7280",
  btnBg: "#5F7F67",
  btnText: "#FFFFFF",
  iconBg: "#FFFFFF",
  iconBorder: "#E5E7EB",
  sheetBorder: "#E5E7EB",
  accent: "#5F7F67",
  gridBg: "#F3F4F6",
  // Status bar styles based on background
  getStatusBarStyle: (bgColor) => {
    const lightBackgrounds = ["#FFFFFF", "#F3F4F6", "#FAFAFA", "#F9FAFB"];
    return lightBackgrounds.includes(bgColor) ? "dark-content" : "light-content";
  },
};

const bandParamMap = {
  calories: "calories",
  protein: "protein",
  carbs: "carbs",
  fats: "fats",
};
const SEARCH_KEYS = ["q", "search", "keyword", "name", "query", "term"];

// ---------- id helpers (frontend only)
const isHex24 = (s) => typeof s === "string" && /^[a-f0-9]{24}$/i.test(s);
const isUuid = (s) => typeof s === "string" && s.includes("-");
const nonUuid = (s) => typeof s === "string" && s.trim() !== "" && !isUuid(s);

// Prefer something your backend can find by /product/:id
const pickBackendId = (p) => {
  if (isHex24(p?._id)) return String(p._id);
  if (isHex24(p?.mongoId)) return String(p.mongoId);
  if (nonUuid(p?.id)) return String(p.id);
  if (nonUuid(p?.productId)) return String(p.productId);
  if (nonUuid(p?.sku)) return String(p.sku);
  if (nonUuid(p?.code)) return String(p.code);
  return "";
};

//   ADD: AsyncStorage keys
const STORAGE_KEYS = {
  LEFT_LIST: "seeMore_leftList",
  LAST_FETCHED: "seeMore_leftList_lastFetched",
};

//   ADD: Cache duration (24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

//   ADD: Create animated FlatList component
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const SeeMoreButton = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  // Get cart from Redux store
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const cart = useSelector((state) => state.cart);
  const cartItems = cart.items || [];

  // --- Map user profile preference (lowercase) to productType filter values (uppercase) ---
  const mapUserPreferenceToFilter = (preference) => {
    if (!preference) return "";
    const pref = preference.toLowerCase().replace(/-/g, "_");
    if (pref === "veg") return "VEG";
    if (pref === "non_veg" || pref === "non-veg") return "NON_VEG";
    if (pref === "eggetarian") return "EGGETARIAN";
    return "";
  };

  const userPreferenceFilter = mapUserPreferenceToFilter(user?.preference);

  // Popup state
  const [showKitchenConflictPopup, setShowKitchenConflictPopup] =
    useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  // Extract route params like web version
  const {
    selectedCategory,
    categoryName,
    from,
    ingredientId, //   ADD: ingredientId from route params
    categoryId, //   ADD: categoryId from route params
    occasion, //   ADD: occasion from route params
    communityId, //   ADD: communityId from route params
    searchQuery, //   ADD: searchQuery from route params
    ingredientFilter, // Auto-trigger ingredient filter from ProductsByIngredients
  } = route?.params || {};

  //   ADD: Missing state declarations
  // Initialize dietary preference from user's profile preference in Redux
  const [dietaryPreference, setDietaryPreference] = useState(userPreferenceFilter);

  // Left list (categories + occasions)
  const [leftList, setLeftList] = useState([]);
  const [customizationProductId, setCustomizationProductId] = useState(null);
  const [customizationWeightId, setCustomizationWeightId] = useState(null);
  const [showCustomizationPopup, setShowCustomizationPopup] = useState(false);
  const [selectedProductForCustomization, setSelectedProductForCustomization] =
    useState(null);
  const [selectedToken, setSelectedToken] = useState(null);

  // Add ref for FlatList
  const flatListRef = useRef(null);
  //   ADD: Animation value for smooth scrolling
  const scrollY = useRef(new Animated.Value(0)).current;
  const itemHeight = 80; // Approximate height of each category item

  // Track if we're coming from ChooseYourFuel for initial scroll
  const isInitialMount = useRef(true);
  // Track if we've handled the initial selection from ChooseYourFuel
  const hasHandledInitialSelection = useRef(false);

  // Filters - same as web version
  const [nutriBand, setNutriBand] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
  });

  const [activeFilterTab, setActiveFilterTab] = useState("calories");
  // Initialize selectedIngredients from route param (auto-trigger from ProductsByIngredients)
  const [selectedIngredients, setSelectedIngredients] = useState(
    ingredientFilter ? [ingredientFilter] : []
  );
  // Map of ingredient name -> array of product IDs (for precise filtering)
  const [ingredientProductMap, setIngredientProductMap] = useState({});

  // Sort
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState(""); // '', 'priceLow', 'priceHigh', 'alphabetical'

  // Filter panel state
  const [filterOpen, setFilterOpen] = useState(false);

  //   ADD: Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (dietaryPreference) count++;
    Object.values(nutriBand).forEach((val) => {
      if (val) count++;
    });
    if (selectedIngredients.length > 0) count += selectedIngredients.length;
    return count;
  }, [dietaryPreference, nutriBand, selectedIngredients]);

  // Products + status
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]); //   ADD: Store all fetched products
  const [loadingCatsOccs, setLoadingCatsOccs] = useState(false);
  const [loadingProds, setLoadingProds] = useState(false);
  const [errorCatsOccs, setErrorCatsOccs] = useState(null);
  const [errorProds, setErrorProds] = useState(null);

  // Favorites
  const [favById, setFavById] = useState({});
  const [favLoadingById, setFavLoadingById] = useState({});

  // Infinite scroll pagination
  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Abort control
  const abortRef = useRef(null);
  const reqIdRef = useRef(0);

  // HTTP
  const http = axios.create({
    baseURL: API_BASE,
    timeout: 15000,
    headers: { Accept: "application/json" },
    withCredentials: false,
  });

  //   ADD: Get cart item info from Redux store
  const getCartItemInfo = (productId) => {
    if (!cartItems || !Array.isArray(cartItems)) {
      return { cartItemId: null, quantity: 0 };
    }

    const cartItem = cartItems.find((item) => item.productId === productId);
    if (cartItem) {
      return {
        cartItemId: cartItem.id,
        quantity: cartItem.quantity || 0,
      };
    }
    return { cartItemId: null, quantity: 0 };
  };

  //   ADD: AsyncStorage functions
  const getCachedLeftList = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(STORAGE_KEYS.LEFT_LIST);
      const lastFetched = await AsyncStorage.getItem(STORAGE_KEYS.LAST_FETCHED);

      if (cachedData && lastFetched) {
        const now = Date.now();
        const lastFetchTime = parseInt(lastFetched, 10);

        // Check if cache is still valid (within 24 hours)
        if (now - lastFetchTime < CACHE_DURATION) {
          return JSON.parse(cachedData);
        }
      }
    } catch (error) {
      console.error("Error reading cached left list:", error);
    }
    return null;
  };

  const saveLeftListToCache = async (data) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LEFT_LIST, JSON.stringify(data));
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_FETCHED,
        Date.now().toString()
      );
    } catch (error) {
      console.error("Error saving left list to cache:", error);
    }
  };

  const getArrayFromResponse = (r) => {
    if (!r) return [];
    const d = r.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    if (Array.isArray(d?.data?.data)) return d.data.data;
    return [];
  };

  const fetchFirstSuccessful = async (paths, paramsList, signal) => {
    let lastErr = null;
    for (const p of paths) {
      for (const params of paramsList) {
        try {
          const res = await http.get(p, { params, signal });
          const arr = getArrayFromResponse(res);
          if (Array.isArray(arr)) return arr;
        } catch (err) {
          if (signal?.aborted) return null;
          lastErr = err;
        }
      }
    }
    if (lastErr) {
      console.error(
        "Fetch failed:",
        lastErr?.response?.status,
        lastErr?.response?.data || lastErr?.message
      );
    }
    return null;
  };

  // number helpers
  const toNum = (v) => {
    if (v == null) return null;
    const n =
      typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : null;
  };
  const getMinWeightPrice = (weights) => {
    if (!Array.isArray(weights) || weights.length === 0) return null;
    const nums = weights
      .map((w) => {
        const raw = toNum(w?.price);
        const disc = toNum(w?.discountPrice) || 0;
        if (raw == null) return null;
        // Backend: discountPrice is the SELLING PRICE
        return (disc > 0 && disc < raw) ? disc : raw;
      })
      .filter((x) => x != null);
    if (nums.length === 0) return null;
    return Math.min(...nums);
  };

  //   UPDATED: Remove cart info from mapProduct since we get it directly
  const mapProduct = (p) => {
    const minWeightPrice = getMinWeightPrice(p?.weights);
    const priceNum = minWeightPrice != null ? minWeightPrice : toNum(p?.price);
    const detailId = pickBackendId(p);

    return {
      id: String(p.id ?? p._id ?? p.sku ?? Math.random()), // UI key (might be uuid)
      detailId, // safe for /product/:id (may be "")
      name: p.name ?? "",
      price: priceNum != null ? `₹${priceNum}` : "₹---",
      priceValue: priceNum,
      description: p.description ?? "",
      image:
        p?.images?.[0]?.url ||
        p?.image ||
        "https://picsum.photos/seed/fallback/600/600",
      isFavorite: !!p?.isFavorite,
      raw: p, // pass to details for instant paint + ID healing
      weights: p?.weights || [],
      //   REMOVED: cartItemId and quantity - we get them directly from Redux
      productType: p?.productType || "",
      Nutrition: p?.Nutrition || {},
    };
  };

  // sort - same as web version
  const sortLocal = (arr, mode) => {
    const a = [...arr];
    if (mode === "priceLow") {
      a.sort((x, y) => (x.priceValue ?? 0) - (y.priceValue ?? 0));
    } else if (mode === "priceHigh") {
      a.sort((x, y) => (y.priceValue ?? 0) - (x.priceValue ?? 0));
    } else if (mode === "alphabetical") {
      a.sort((x, y) => x.name.localeCompare(y.name));
    }
    return a;
  };

  //   FIXED: Build filters like web version
  const buildBaseParams = (token) => {
    const params = {};

    // Handle route params first (like web version URL params)
    if (categoryId) params.categoryId = categoryId;
    if (occasion) params.occasion = occasion;
    if (communityId) params.communityId = communityId;
    if (ingredientId) params.ingredientId = ingredientId;

    // Then handle selected token (left list selection)
    if (token?.startsWith("cat:")) params.categoryId = token.slice(4);
    else if (token?.startsWith("occ:")) params.occasion = token.slice(4);

    return params;
  };

  const buildSearchParamVariants = (base, q) => {
    if (!q?.trim()) return [base];
    return SEARCH_KEYS.map((k) => ({ ...base, [k]: q.trim() }));
  };

  // fetchers
  const cancelInFlight = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  const fetchCatsAndOccs = useCallback(async () => {
    try {
      setLoadingCatsOccs(true);
      setErrorCatsOccs(null);

      //   ADD: Try to get cached data first
      const cachedData = await getCachedLeftList();
      if (cachedData) {
        setLeftList(cachedData);

        //   FIXED: Handle route params like web version with cached data
        if (cachedData.length && !selectedToken && !hasHandledInitialSelection.current) {
          // Priority 1: If we have ingredientId from route, don't auto-select category
          if (ingredientId) {
            hasHandledInitialSelection.current = true;
          }
          // Priority 2: Handle category from ChooseYourFuel
          else if (selectedCategory) {
            // Set flag BEFORE async operations to prevent race conditions
            hasHandledInitialSelection.current = true;
            const matchedCategory = cachedData.find((item) => {
              const itemKey = item.id.replace(/^(cat:|occ:)/, "");
              return (
                itemKey === selectedCategory ||
                item.name.toLowerCase().includes(selectedCategory.toLowerCase())
              );
            });
            if (matchedCategory) {
              setSelectedToken(matchedCategory.id);
            } else {
              setSelectedToken(cachedData[0].id);
            }
          }
          // Priority 3: Default to first category (only if no special filter)
          else if (!ingredientId && !route.params?.specialFilter) {
            setSelectedToken(cachedData[0].id);
            hasHandledInitialSelection.current = true;
          }
        }

        setLoadingCatsOccs(false);

        //   Still fetch fresh data in background
        fetchFreshCatsAndOccs();
        return;
      }

      //   If no cache, fetch fresh data
      await fetchFreshCatsAndOccs();
    } catch (e) {
      setErrorCatsOccs("Failed to load categories/occasions");
      setLoadingCatsOccs(false);
    }
  }, [
    // selectedToken, //   FIXED: Removed to prevent re-fetching on selection
    // selectedCategory, //   FIXED: Removed, handled by initial mount logic
    from,
    ingredientId,
    categoryId,
    occasion,
  ]);

  //   ADD: Separate function for fresh data fetching
  const fetchFreshCatsAndOccs = async () => {
    try {
      const categoryPaths = ["/categories", "/category", "/category/all"];
      const occasionPaths = ["/occasions", "/occasion", "/occasion/all"];

      const fetchWithFallback = async (paths) => {
        for (const p of paths) {
          try {
            const res = await http.get(p);
            const arr = getArrayFromResponse(res);
            if (Array.isArray(arr)) return arr;
          } catch { }
        }
        return null;
      };

      const [cats, occs] = await Promise.all([
        fetchWithFallback(categoryPaths),
        fetchWithFallback(occasionPaths),
      ]);

      const mappedCats = (cats || []).map((c) => ({
        id: `cat:${String(c.id ?? c._id ?? "")}`,
        name: c.name ?? "Unnamed",
        image:
          c.image || "https://cdn-icons-png.flaticon.com/512/706/706195.png",
        kind: "cat",
      }));
      const mappedOccs = (occs || []).map((o) => ({
        id: `occ:${String(o.key ?? o.id ?? o._id ?? "")}`,
        name: o.label ?? o.name ?? o.key ?? "Occasion",
        image:
          o.icon || "https://cdn-icons-png.flaticon.com/512/706/706195.png",
        kind: "occ",
      }));

      const combined = [...mappedCats, ...mappedOccs];

      //   Save to cache
      await saveLeftListToCache(combined);

      //   Only update state if we're not using cached data
      if (!leftList.length) {
        setLeftList(combined);

        //   FIXED: Handle route params like web version
        if (combined.length && !selectedToken && !hasHandledInitialSelection.current) {
          // Priority 1: If we have ingredientId from route, don't auto-select category
          if (ingredientId) {
            hasHandledInitialSelection.current = true;
          }
          // Priority 2: Handle category from ChooseYourFuel
          else if (selectedCategory) {
            // Set flag BEFORE async operations to prevent race conditions
            hasHandledInitialSelection.current = true;
            const matchedCategory = combined.find((item) => {
              const itemKey = item.id.replace(/^(cat:|occ:)/, "");
              return (
                itemKey === selectedCategory ||
                item.name.toLowerCase().includes(selectedCategory.toLowerCase())
              );
            });
            if (matchedCategory) {
              setSelectedToken(matchedCategory.id);
            } else {
              setSelectedToken(combined[0].id);
            }
          }
          // Priority 3: Default to first category (only if no special filter)
          else if (!ingredientId && !route.params?.specialFilter) {
            setSelectedToken(combined[0].id);
            hasHandledInitialSelection.current = true;
          }
        }
      }
    } catch (e) {
      console.error("Error fetching fresh categories/occasions:", e);
    } finally {
      setLoadingCatsOccs(false);
    }
  };

  const fetchProducts = useCallback(
    async (token) => {
      //   FIXED: Always fetch when ingredientId or specialFilter is present, regardless of token
      if (!token && !ingredientId && !categoryId && !occasion && !communityId && !route.params?.specialFilter)
        return;

      cancelInFlight();
      const controller = new AbortController();
      abortRef.current = controller;
      const myReqId = ++reqIdRef.current;

      try {
        setLoadingProds(true);
        setErrorProds(null);

        // OPTIMIZED: Try the known working endpoint first
        const productPaths = [
          "/products",
          "/product/all",
          "/product",
          "/products/search",
          "/product/search",
          "/search/products",
        ];

        const base = buildBaseParams(token);
        //   FIXED: Use searchQuery from route params if available
        const paramsList = buildSearchParamVariants(base, searchQuery || "");

        // Fetch products and wishlist in parallel
        // Note: fetchFirstSuccessful does not return a full response object, just the array
        const [list, wishlistResponse] = await Promise.all([
          fetchFirstSuccessful(
            productPaths,
            paramsList,
            controller.signal
          ),
          authService.getWishlist().catch((err) => {
            console.warn("Failed to fetch wishlist SeeMore:", err);
            return { data: [] };
          }),
        ]);

        if (controller.signal.aborted) return;

        const productList = list || [];

        // Process Wishlist Items
        let wishlistItems = [];
        if (wishlistResponse?.data?.items) {
          wishlistItems = wishlistResponse.data.items;
        } else if (wishlistResponse?.data && Array.isArray(wishlistResponse.data)) {
          wishlistItems = wishlistResponse.data;
        } else if (Array.isArray(wishlistResponse)) {
          wishlistItems = wishlistResponse;
        }

        //   FIXED: Store all products without filtering
        const mapped = productList.map(mapProduct);
        if (myReqId === reqIdRef.current) {
          setAllProducts(mapped); // Store all products
          setProducts(mapped); // Initially show all products
          setFavById((prev) => {
            const next = { ...prev };

            // 1. Check product's own isFavorite flag
            mapped.forEach((m) => {
              if (next[m.id] == null) next[m.id] = !!m.isFavorite;
            });

            // 2. Override/Merge with actual Wishlist Data
            if (Array.isArray(wishlistItems)) {
              wishlistItems.forEach((item) => {
                const id = item.id || item._id || item.productId;
                if (id) next[id] = true;
              });
            }

            return next;
          });
        }
      } catch (e) {
        if (e?.name !== "CanceledError") {
          setErrorProds("Failed to load products");
          setProducts([]);
          setAllProducts([]);
        }
      } finally {
        if (myReqId === reqIdRef.current) setLoadingProds(false);
      }
    },
    [ingredientId, categoryId, occasion, communityId, searchQuery]
  );

  //   ADD: Function to apply filters to all products
  const applyFiltersToProducts = useCallback(() => {
    if (allProducts.length === 0) return;

    let filteredList = [...allProducts];

    // Dietary filter - sync with Redux preference if none explicitly selected in filter overlay
    const currentPreference = dietaryPreference || mapUserPreferenceToFilter(user?.preference);

    if (currentPreference) {
      filteredList = filteredList.filter(
        (product) => product.productType === currentPreference
      );
    }

    // Special filters from SmartPeopleSection
    if (route.params?.specialFilter) {
      filteredList = filteredList.filter((product) => {
        const firstWeight = product.weights?.[0];
        const price = Number(firstWeight?.price || product.price || 0);
        const discountPrice = Number(firstWeight?.discountPrice || 0); // Selling Price
        const finalPrice = (discountPrice > 0 && discountPrice < price) ? discountPrice : price;

        if (route.params.specialFilter === 'dietsFrom99') {
          return finalPrice >= 99;
        }
        if (route.params.specialFilter === 'everythingUnder99') {
          return finalPrice < 99;
        }
        return true;
      });
    }

    // Macro filters
    filteredList = filteredList.filter((product) => {
      const nutrition = product.Nutrition;
      if (!nutrition) return true;

      // Calories filters
      if (nutriBand.calories === "lowCal" && (nutrition.calories || 0) > 200)
        return false;
      if (
        nutriBand.calories === "medCal" &&
        ((nutrition.calories || 0) < 201 || (nutrition.calories || 0) > 400)
      )
        return false;
      if (nutriBand.calories === "highCal" && (nutrition.calories || 0) < 401)
        return false;

      // Protein filters
      if (nutriBand.protein === "lowPro" && (nutrition.protein || 0) > 10)
        return false;
      if (
        nutriBand.protein === "medPro" &&
        ((nutrition.protein || 0) < 11 || (nutrition.protein || 0) > 25)
      )
        return false;
      if (nutriBand.protein === "highPro" && (nutrition.protein || 0) < 26)
        return false;

      // Carbs filters
      if (nutriBand.carbs === "lowCarb" && (nutrition.carbs || 0) > 15)
        return false;
      if (
        nutriBand.carbs === "medCarb" &&
        ((nutrition.carbs || 0) < 16 || (nutrition.carbs || 0) > 30)
      )
        return false;
      if (nutriBand.carbs === "highCarb" && (nutrition.carbs || 0) < 31)
        return false;

      // Fats filters
      if (nutriBand.fats === "lowFat" && (nutrition.fats || 0) > 10)
        return false;
      if (
        nutriBand.fats === "medFat" &&
        ((nutrition.fats || 0) < 11 || (nutrition.fats || 0) > 20)
      )
        return false;
      if (nutriBand.fats === "highFat" && (nutrition.fats || 0) < 21)
        return false;

      // Ingredient filters - use product ID map for precise matching
      if (selectedIngredients.length > 0) {
        if (Object.keys(ingredientProductMap).length > 0) {
          // Precise: check if product ID is in any selected ingredient's product list
          const productId = String(product.id ?? product._id ?? "");
          const matchesIngredient = selectedIngredients.some((ing) => {
            const ids = ingredientProductMap[ing] || [];
            return ids.includes(productId);
          });
          if (!matchesIngredient) return false;
        } else {
          // Fallback: name/description text match
          const matchesIngredient = selectedIngredients.some((ing) =>
            (product.name || "").toLowerCase().includes(ing.toLowerCase()) ||
            (product.description || "").toLowerCase().includes(ing.toLowerCase())
          );
          if (!matchesIngredient) return false;
        }
      }

      return true;
    });

    // Apply sorting
    const sorted = sortLocal(filteredList, sortBy);
    setProducts(sorted);
    setVisibleCount(PAGE_SIZE); // Reset visible count when filters change
  }, [allProducts, dietaryPreference, nutriBand, selectedIngredients, ingredientProductMap, sortBy, user?.preference, route.params?.specialFilter]);

  // Auto-update dietary filter when user's profile preference changes in Redux
  useEffect(() => {
    const mapped = mapUserPreferenceToFilter(user?.preference);
    setDietaryPreference(mapped);
  }, [user?.preference]);

  useEffect(() => {
    fetchCatsAndOccs();
  }, [fetchCatsAndOccs]);

  // Fetch ingredient→productIds map for precise ingredient filtering
  useEffect(() => {
    const fetchIngredientMap = async () => {
      try {
        const res = await authService.getIngredients();
        if (res?.data && Array.isArray(res.data)) {
          const map = {};
          res.data.forEach((ing) => {
            const name = ing.name;
            if (name) {
              // Each ingredient has a `products` array of product objects or IDs
              const ids = (ing.products || []).map((p) =>
                String(p?.id ?? p?._id ?? p ?? "")
              ).filter(Boolean);
              map[name] = ids;
            }
          });
          setIngredientProductMap(map);
        }
      } catch (e) {
        console.log("Could not fetch ingredient map:", e.message);
      }
    };
    fetchIngredientMap();
  }, []);

  //   FIXED: Apply filters whenever filter states change
  useEffect(() => {
    if (allProducts.length > 0) {
      applyFiltersToProducts();
    }
  }, [
    dietaryPreference,
    nutriBand,
    selectedIngredients,
    sortBy,
    allProducts,
    applyFiltersToProducts,
  ]);

  //   FIXED: Fetch products when route params change (ingredientId, categoryId, etc.)
  useEffect(() => {
    if (ingredientId || categoryId || occasion || communityId) {
      fetchProducts(selectedToken);
    }
  }, [ingredientId, categoryId, occasion, communityId, fetchProducts]);

  //   UPDATED: Improved scroll to selected category function with smooth animation
  const scrollToSelectedItem = useCallback(() => {
    if (selectedToken && leftList.length > 0 && flatListRef.current) {
      const selectedIndex = leftList.findIndex(
        (item) => item.id === selectedToken
      );

      if (selectedIndex !== -1) {
        const delay = isInitialMount.current ? 500 : 100;

        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: selectedIndex,
            animated: true,
            viewPosition: 0.5, // Center the selected item
            viewOffset: 0,
          });
        }, delay);

        if (isInitialMount.current) {
          isInitialMount.current = false;
        }
      }
    }
  }, [selectedToken, leftList]);

  //   REMOVED: This useEffect was redundant and caused re-selection issues.
  // The initial category selection is now handled exclusively in fetchCatsAndOccs (lines 405-431 and 501-527)
  // to prevent race conditions and multiple competing state updates.

  //   if (leftList.length > 0) {
  //     scrollToSelectedItem();
  //   }
  // }, [selectedToken, leftList]);

  //   UPDATED: Handle category selection without auto-scroll to prevent interrupting user browsing
  const handleCategorySelect = useCallback((token) => {
    setSelectedToken(token);
    hasHandledInitialSelection.current = true;

    //   REMOVED: Auto-scroll to selected item - let user maintain their scroll position
    // setTimeout(() => {
    //   scrollToSelectedItem();
    // }, 50);
  }, []);

  useEffect(() => {
    fetchProducts(selectedToken);
  }, [selectedToken, fetchProducts]);

  // Helper to check if product is customizable
  const isProductCustomizable = (product) => {
    // Check explicit flag from backend
    if (product?.isCustomizable === true) return true;

    // Check if product has addOnCategories (embedded data)
    if (product?.addOnCategories && Array.isArray(product.addOnCategories) && product.addOnCategories.length > 0) return true;

    // Check if product has Addition with addOns (embedded data)
    if (product?.Addition?.addOns && Array.isArray(product.Addition.addOns) && product.Addition.addOns.length > 0) return true;

    return false;
  };

  // Handle add to cart from customization popup
  const handleCustomizationAddToCart = async (customizationData) => {
    // Check authentication - rely on token check as primary validation
    console.log("🔐 Auth Check:");
    console.log("  - isAuthenticated:", isAuthenticated);
    console.log("  - user exists:", !!user);

    const hasValidToken = await authService.isAuthenticated();
    console.log("  - hasValidToken:", hasValidToken);

    // Primary check: if no valid token, definitely not authenticated
    if (!hasValidToken) {
      console.error("     No valid token found");
      Alert.alert("Login Required", "Please login to add items to cart", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Login",
          onPress: () => navigation.navigate("Login"),
        },
      ]);
      return;
    }

    // If we have a valid token but Redux state is stale, try to hydrate
    if (!isAuthenticated || !user) {
      console.log("    Valid token but Redux state not hydrated, attempting to hydrate...");
      await dispatch(hydrateUser());
    }

    try {
      // Use IDs from payload (New Popup) OR Fallback to State (Old/Cached Popup)
      const productId = customizationData.productId || customizationProductId;
      const weightId = customizationData.weightId || customizationWeightId;
      const { quantity, addOns, addOnTotal } = customizationData;

      console.log("🛒 Received from CustomizationPopup:", {
        payloadProductId: customizationData.productId,
        stateProductId: customizationProductId,
        finalProductId: productId,
      });

      // Prepare payload
      const payload = {
        productId: productId,
        weightId: weightId,
        quantity: quantity || 1,
      };

      // Only add Addition field if add-ons are present
      if (addOns && addOns.length > 0) {
        payload.Addition = addOns;
      }

      console.log("🚀 Final API payload:", JSON.stringify(payload, null, 2));

      // Use existing Redux addToCart thunk with Addition field
      await dispatch(addToCart(payload)).unwrap();

      // Success - cart will refresh automatically
    } catch (error) {
      console.error("Error adding customized product:", error);

      let errorMessage = "Failed to add item to cart";
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      if (errorMessage.includes("different kitchens")) {
        setPopupMessage(errorMessage);
        setShowKitchenConflictPopup(true);
      } else {
        Alert.alert("Error", errorMessage);
      }
    }
  };

  //   FIXED: Cart functions - only update Redux, don't refresh products
  const handleAddToCart = async (productId, weightId, product) => {
    // Check if product is customizable FIRST (before auth check)
    // This allows users to see customization options without logging in
    if (isProductCustomizable(product)) {
      // Fetch add-ons and show customization popup
      try {
        const addOnsResponse = await authService.getProductAddOns(productId);
        const productWithAddOns = {
          ...product,
          id: productId,  // Ensure ID is explicitly set
          weights: product.weights || [],  // Ensure weights array exists
          addOnCategories: addOnsResponse?.data?.addOnCategories || [],
          // Store the weightId that was clicked
          selectedWeightId: weightId,
        };

        console.log("    Product with add-ons:", {
          id: productWithAddOns.id,
          hasWeights: productWithAddOns.weights?.length > 0,
          selectedWeightId: weightId
        });

        // Store IDs in state for use by handleCustomizationAddToCart
        setCustomizationProductId(productId);
        setCustomizationWeightId(weightId);
        setSelectedProductForCustomization(productWithAddOns);
        setShowCustomizationPopup(true);
        // Auth check will happen in handleCustomizationAddToCart
        return;
      } catch (error) {
        console.error("Error fetching add-ons:", error);
        // Continue with normal add to cart if add-ons fetch fails
      }
    }

    const hasValidToken = await authService.isAuthenticated();

    if (!isAuthenticated || !user || !hasValidToken) {
      // Use custom popup for login required
      setPopupMessage("Please login to add items to cart");
      // You can create a login required popup or use Alert for now
      Alert.alert("Login Required", "Please login to add items to cart", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Login",
          onPress: () => navigation.navigate("Login"),
        },
      ]);
      return;
    }

    try {
      await dispatch(
        addToCart({
          productId,
          weightId,
          quantity: 1,
        })
      ).unwrap();
    } catch (error) {
      let errorMessage = "Failed to add item to cart";

      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      //   FIXED: Use custom popup for kitchen conflict
      if (
        errorMessage.includes("different kitchens") ||
        errorMessage.includes("kitchen") ||
        errorMessage.includes("complete those orders first")
      ) {
        //   SUPPRESS: Don't log this error to console since we're handling it gracefully
        setPopupMessage(errorMessage);
        setShowKitchenConflictPopup(true);
      } else if (
        errorMessage.includes("Authentication") ||
        errorMessage.includes("token") ||
        errorMessage.includes("login")
      ) {
        //   SUPPRESS: Don't log authentication errors either
        await authService.logout();
        // Use custom popup for session expired
        setPopupMessage("Your session has expired. Please login again.");
        // You can create a session expired popup or use Alert for now
        Alert.alert("Session Expired", "Please login again", [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
      } else {
        //   Only log unexpected errors, not expected ones like kitchen conflicts
        console.error("  Unexpected error adding to cart:", error);
        // Use custom popup for other errors
        setPopupMessage(errorMessage);
        // You can create a generic error popup or use Alert for now
        Alert.alert("Error", errorMessage);
      }
    }
  };

  // Handle view cart from popup
  const handleViewCart = () => {
    setShowKitchenConflictPopup(false);
    navigation.navigate("CartScreen");
  };

  // Handle popup close
  const handleClosePopup = () => {
    setShowKitchenConflictPopup(false);
  };

  // Update cart quantity function - no product refresh
  const handleUpdateCartQuantity = async (
    cartItemId,
    productId,
    newQuantity
  ) => {
    if (!isAuthenticated || !user) {
      Alert.alert("Login Required", "Please login to update cart");
      navigation.navigate("Login");
      return;
    }

    try {
      await dispatch(
        updateCartItemQty({
          cartItemId,
          quantity: newQuantity,
        })
      ).unwrap();
      //   FIXED: No product refresh
    } catch (error) {
      console.error("  Error updating cart:", error);
      Alert.alert("Error", "Failed to update quantity");
    }
  };

  //   FIXED: Remove from cart function - no product refresh
  const handleRemoveFromCart = async (cartItemId, productId) => {
    if (!isAuthenticated || !user) {
      Alert.alert("Login Required", "Please login to modify cart");
      navigation.navigate("Login");
      return;
    }

    try {
      await dispatch(removeCartItem(cartItemId)).unwrap();
      //   FIXED: No product refresh
    } catch (error) {
      console.error("  Error removing from cart:", error);
      Alert.alert("Error", "Failed to remove item");
    }
  };

  //   FIXED: Macro filter handler like web version
  const handleMacroFilterChange = (nutrient, value) => {
    setNutriBand((prev) => ({
      ...prev,
      [nutrient]: prev[nutrient] === value ? "" : value,
    }));
  };

  const handleApplyFilters = (filters) => {
    setDietaryPreference(filters.dietaryPreference);
    setNutriBand(filters.macroFilters);
    setSelectedIngredients(filters.selectedIngredients || []);
    setFilterOpen(false);
  };

  const handleClearAll = () => {
    setDietaryPreference("");
    setNutriBand({
      calories: "",
      protein: "",
      carbs: "",
      fats: "",
    });
    setSelectedIngredients([]);
    setSortBy("");
  };

  // navigation + favorites
  const navigateToProduct = (item) => {
    const backendId =
      pickBackendId(item.raw ?? item) || pickBackendId(item) || "";
    navigation.navigate("ProductDetails", {
      productId: backendId,
      initialFavorite: !!item.isFavorite,
      contextToken: selectedToken,
      initialData: item.raw ?? item,
    });
  };

  //   MODIFIED: Removed Alert.alert for favorite toggle
  const toggleFavoriteFromCard = async (id, detailId) => {
    const useId = String(detailId || id || "");
    if (!useId) {
      return; // Silently return if no valid ID
    }
    setFavLoadingById((s) => ({ ...s, [id]: true }));
    try {
      const res = await authService.toggleFavorite(useId);
      if (res?.success) {
        setFavById((s) => ({ ...s, [id]: !s[id] }));
        //   REMOVED: Alert.alert for success message
      }
    } catch (e) {
      //   REMOVED: Alert.alert for error message
      console.error("Failed to update favorite:", e?.response?.data?.message || e?.message);
    } finally {
      setFavLoadingById((s) => ({ ...s, [id]: false }));
    }
  };

  // Function to navigate to search screen
  const handleSearchPress = () => {
    navigation.navigate("SearchScreen");
  };

  // FIXED: Calculate proper card width with better distribution
  const cardWidth = (width - 110) / 2;

  const ProductCard = ({ item }) => {
    const isFav = !!favById[item.id];
    const favLoading = !!favLoadingById[item.id];

    //   FIXED: Get current quantity directly from Redux store in real-time
    const currentCartItem = cartItems.find(
      (cartItem) => cartItem.productId === item.id
    );
    const currentQuantity = currentCartItem?.quantity || 0;
    const cartItemId = currentCartItem?.id;

    const productId = item.id;
    const weightId = item.weights?.[0]?.id;

    const isCustomizable = isProductCustomizable(item);

    return (
      <View style={[tw`mb-2 mx-0.5`, { width: cardWidth }]}>
        <TouchableOpacity
          style={[
            tw`bg-white rounded-2xl p-3 flex-1 border border-gray-200`,
            tw`shadow-lg shadow-black/10`,
          ]}
          onPress={() => navigateToProduct(item)}
          activeOpacity={0.9}
        >
          {/* Favorite Heart Icon */}
          <View style={tw`absolute right-2 top-2 z-10`}>
            <TouchableOpacity
              onPress={() => toggleFavoriteFromCard(item.id, item.detailId)}
              disabled={favLoading}
              style={tw`bg-white rounded-full p-1 shadow-sm`}
            >
              {favLoading ? (
                <ActivityIndicator size="small" color="#e11d48" />
              ) : (
                <Ionicons
                  name={isFav ? "heart" : "heart-outline"}
                  size={16}
                  color={isFav ? "#e11d48" : "#111"}
                />
              )}
            </TouchableOpacity>
          </View>

          <Image
            source={{ uri: item.image }}
            style={tw`w-full h-28 rounded-xl mb-2`}
            resizeMode="cover"
          />

          <View style={tw`flex-1`}>
            <Text
              style={[
                fontStyles.headingS,
                tw`text-sm font-semibold text-gray-900 mb-0.5 leading-4`,
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>

            <Text
              style={tw`text-gray-500 text-[10px] leading-[14px] mb-1`}
              numberOfLines={1}
            >
              {item.description || "No description available"}
            </Text>

            <Text
              style={[
                fontStyles.headingS,
                tw`text-xs font-semibold text-[#5F7F67] mb-1`,
              ]}
              numberOfLines={1}
            >
              {item.raw?.vendor?.kitchenName || item.raw?.kitchenName || "GoodBelly Kitchen"}
            </Text>

            {isCustomizable && (
              <Text style={[fontStyles.caption, tw`text-[10px] text-[#6B9080] font-medium mb-1`]}>
                Customisable
              </Text>
            )}

            <View style={tw`flex-row justify-between items-center mt-auto`}>
              <View>
                <Text
                  style={[
                    fontStyles.headingS,
                    tw`text-sm font-semibold text-gray-900`,
                  ]}
                >
                  {item.price}
                </Text>
              </View>

              {/*   FIXED: Dynamic Add/Quantity Controls using real-time cart data */}
              {currentQuantity === 0 ? (
                <TouchableOpacity
                  style={tw`bg-[#6B9080] px-3 py-1.5 rounded-xl`}
                  onPress={() => handleAddToCart(productId, weightId, item)}
                >
                  <Text
                    style={[
                      fontStyles.bodyBold,
                      tw`text-white text-xs font-bold`,
                    ]}
                  >
                    Add
                  </Text>
                </TouchableOpacity>
              ) : (
                <View
                  style={tw`flex-row items-center bg-[#6B9080] rounded-xl ml-1`}
                >
                  <TouchableOpacity
                    style={tw`px-1.1 py-1.5`}
                    onPress={() => {
                      if (currentQuantity === 1) {
                        handleRemoveFromCart(cartItemId, productId);
                      } else {
                        handleUpdateCartQuantity(
                          cartItemId,
                          productId,
                          currentQuantity - 1
                        );
                      }
                    }}
                  >
                    <Ionicons name="remove" size={14} color="white" />
                  </TouchableOpacity>

                  <Text
                    style={[
                      fontStyles.bodyBold,
                      tw`text-white text-xs px-2 font-bold`,
                    ]}
                  >
                    {currentQuantity}
                  </Text>

                  <TouchableOpacity
                    style={tw`px-1.1 py-1.5`}
                    onPress={() =>
                      handleUpdateCartQuantity(
                        cartItemId,
                        productId,
                        currentQuantity + 1
                      )
                    }
                  >
                    <Ionicons name="add" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity >
      </View >
    );
  };

  const handleLoadMore = useCallback(() => {
    if (visibleCount < products.length) {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, products.length));
    }
  }, [visibleCount, products.length]);

  const sliced = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  const renderGridItem = ({ item }) => <ProductCard item={item} />;

  const renderListFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={tw`py-4 items-center`}>
        <ActivityIndicator size="small" color="#5F7F67" />
      </View>
    );
  };

  const sortLabel = useMemo(() => {
    switch (sortBy) {
      case "priceLow":
        return "Price Low to High";
      case "priceHigh":
        return "Price High to Low";
      case "alphabetical":
        return "A–Z";
      default:
        return "Sort By";
    }
  }, [sortBy]);

  // Updated Sort Dropdown Component
  const SortButton = () => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setSortOpen(true)}
      style={tw`flex-row items-center bg-white rounded-full border border-gray-200 px-3 py-2 min-h-9`}
    >
      <Text style={[fontStyles.headingS, tw`text-xs text-gray-900`]}>
        {sortLabel}
      </Text>
    </TouchableOpacity>
  );

  const FilterButton = () => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        setFilterOpen(true);
      }}
      style={tw`flex-row items-center bg-white rounded-full border border-gray-200 px-3 py-2 min-h-9`}
    >
      <Text
        style={[fontStyles.headingS, tw`text-xs text-gray-900`]}
      >
        {activeFilterCount > 0 ? `Filter (${activeFilterCount})` : "Filter"}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Dynamic StatusBar based on background */}
      <StatusBar
        barStyle={UI.getStatusBarStyle("#FFFFFF")}
        backgroundColor="#FFFFFF"
      />
      {/*   ADD: Kitchen Conflict Custom Popup */}
      <KitchenConflictPopup
        visible={showKitchenConflictPopup}
        onClose={handleClosePopup}
        message={popupMessage}
        onViewCart={handleViewCart}
      />
      {/* Header with Back Button and Search Icon */}
      <View
        style={tw`flex-row items-center px-4 py-3 border-b border-gray-200`}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={tw`w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-1`}
        >
          <Icon name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={[fontStyles.headingS, tw`text-gray-900 flex-1`]}>
          {categoryName
            ? categoryName
            : ingredientId
              ? "Products by Ingredient"
              : from === "ProductsByIngredients"
                ? "Products by Ingredients"
                : "Browse Products"}
        </Text>
        {/* Search Icon */}
        <TouchableOpacity onPress={handleSearchPress} style={tw`ml-2`}>
          <Ionicons name="search-outline" size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      {/*   ADD: Clear All button when filters are applied */}
      {/* {activeFilterCount > 0 && (
        <View style={tw`px-4 py-2 flex-row justify-end`}>
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={[fontStyles.bodyBold, tw`text-[#6B9080] text-xs`]}>
              Clear All
            </Text>
          </TouchableOpacity>
        </View>
      )} */}

      <View style={tw`flex-1 flex-row`}>
        {/*   FIXED: Use separated LeftCategories component */}
        <LeftCategories
          leftList={leftList}
          loadingCatsOccs={loadingCatsOccs}
          errorCatsOccs={errorCatsOccs}
          selectedToken={selectedToken}
          onCategorySelect={handleCategorySelect}
          scrollY={scrollY}
          flatListRef={flatListRef}
          scrollToSelectedItem={scrollToSelectedItem}
          isInitialMount={isInitialMount}
          hasHandledInitialSelection={hasHandledInitialSelection}
          ingredientId={ingredientId}
        />

        {/* FIXED: Right content with more space */}
        <View style={tw`flex-1`}>
          <View style={tw`flex-row items-center gap-1 px-2 pt-3 pb-2`}>
            <SortButton />
            <FilterButton />
          </View>

          {/* Product grid */}
          {loadingProds ? (
            <View style={tw`mx-2`}>
              <FlatList
                data={[1, 2, 3, 4, 5, 6]}
                keyExtractor={(item) => `skeleton-${item}`}
                numColumns={2}
                renderItem={() => (
                  <ProductSkeleton
                    style={{ width: cardWidth, minWidth: 0 }}
                  />
                )}
                scrollEnabled={false}
                contentContainerStyle={tw`pb-3`}
                columnWrapperStyle={tw`justify-between`}
              />
            </View>
          ) : errorProds ? (
            <Text
              style={[fontStyles.body, tw`text-red-500 px-2 text-[13px]`]}
            >
              {errorProds}
            </Text>
          ) : products.length === 0 ? (
            <Text
              style={[
                fontStyles.body,
                tw`text-gray-500 px-2 py-4 text-[13px]`,
              ]}
            >
              No products found.
            </Text>
          ) : (
            <FlatList
              data={sliced}
              keyExtractor={(item) =>
                String(item.id ?? item.detailId ?? item.sku ?? Math.random())
              }
              numColumns={2}
              renderItem={renderGridItem}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.3}
              ListFooterComponent={renderListFooter}
              contentContainerStyle={tw`px-2 pb-6`}
              columnWrapperStyle={tw`justify-between`}
              showsVerticalScrollIndicator={false}
              onScrollBeginDrag={() => {
                if (filterOpen) setFilterOpen(false);
              }}
              extraData={[
                sortBy,
                nutriBand,
                favById,
                favLoadingById,
                cartItems,
                cart,
                visibleCount,
              ]}
            />
          )}
        </View>
      </View>

      {/*   ADD: Sort Overlay Modal */}
      <SortOverlay
        sortOpen={sortOpen}
        setSortOpen={setSortOpen}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {/*   FIXED: Use separated FilterOverlay component */}
      <FilterOverlay
        filterOpen={filterOpen}
        setFilterOpen={setFilterOpen}
        onClearAll={handleClearAll}
        onApplyFilters={handleApplyFilters}
        initialFilters={{
          dietaryPreference,
          macroFilters: nutriBand,
          selectedIngredients,
        }}
      />

      {/* Customization Popup */}
      <CustomizationPopup
        visible={showCustomizationPopup}
        onClose={() => setShowCustomizationPopup(false)}
        product={selectedProductForCustomization}
        initialAddOns={[]} // Always start fresh for new add
        onAddToCart={handleCustomizationAddToCart}
        productId={customizationProductId}
        weightId={customizationWeightId}
      />
    </SafeAreaView>
  );
};

export default SeeMoreButton;
