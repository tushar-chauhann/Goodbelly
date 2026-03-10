import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import tw from "twrnc";
import { authService } from "../services/authService";
import api from "../services/api";
import { useDispatch, useSelector } from "react-redux";
import {
  addToCart as addToCartThunk,
  fetchCart,
  updateCartItemQty,
  removeCartItem,
} from "../redux/slicer";
import { fontStyles } from "../utils/fontStyles";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import KitchenConflictPopup from "./CustomPopup/KitchenConflictPopup";
import CustomizationPopup from "./CustomizationPopup";
import ProductSkeleton from "./ProductSkeleton";
import { API_BASE_URL } from "@env";
const { width: screenWidth } = Dimensions.get("window");

/* ---------------------------------- utils --------------------------------- */
const unwrap = (res) => {
  if (!res) return null;
  if (res.data && res.success === undefined) {
    const d = res.data;
    if (d?.data !== undefined) return d.data;
    return d;
  }
  if (res.success !== undefined) return res.data ?? null;
  if (res.data !== undefined) return res.data;
  return res;
};

const extractArray = async (resp) => {
  try {
    if (resp && typeof resp.json === "function") {
      const j = await resp.json();
      if (Array.isArray(j)) return j;
      if (Array.isArray(j?.data)) return j.data;
      if (Array.isArray(j?.data?.data)) return j.data.data;
      return [];
    }
  } catch { }
  const d = unwrap(resp);
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  return [];
};

// Use environment variable with fallback to local development
// Use environment variable 
const API_BASE = API_BASE_URL;
if (!API_BASE) console.warn("    API_BASE_URL missing in .env");
const SEARCH_KEYS = ["q", "search", "keyword", "name", "query", "term"];

const getCanonicalIdFromObj = (p) =>
  String(p?.id ?? p?._id ?? p?.productId ?? p?.sku ?? "");
const getCanonicalId = (idLike) => (idLike != null ? String(idLike) : "");

/* try to resolve product id by name using search endpoints */
const resolveProductIdByName = async (name) => {
  if (!name) return null;
  const paramsVariants = SEARCH_KEYS.map((k) => ({ [k]: name }));
  const paths = [
    "/products/search",
    "/product/search",
    "/search/products",
    "/products",
  ];

  for (const pth of paths) {
    for (const params of paramsVariants) {
      try {
        const res = await api.get(pth, { params });
        const arr = await extractArray(res);
        const match =
          arr?.find(
            (x) => (x?.name || "").toLowerCase() === name.toLowerCase()
          ) ||
          arr?.find((x) =>
            (x?.name || "").toLowerCase().includes(name.toLowerCase())
          );
        if (match) return getCanonicalIdFromObj(match);
      } catch { }
    }
  }

  try {
    for (const pth of paths) {
      for (const params of paramsVariants) {
        const u = new URL((API_BASE + pth).replace(/\/{2,}/g, "/"));
        Object.entries(params).forEach(([k, v]) => u.searchParams.append(k, v));
        const r = await fetch(u.toString());
        if (!r.ok) continue;
        const arr = await extractArray(r);
        const match =
          arr?.find(
            (x) => (x?.name || "").toLowerCase() === name.toLowerCase()
          ) ||
          arr?.find((x) =>
            (x?.name || "").toLowerCase().includes(name.toLowerCase())
          );
        if (match) return getCanonicalIdFromObj(match);
      }
    }
  } catch { }

  return null;
};

/* ------------------------------- component -------------------------------- */
const ProductDetails = () => {
  const [selectedSize, setSelectedSize] = useState("300");
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  // Add scrollViewRef to control scroll position
  const scrollViewRef = useRef(null);

  // cart state (needed to locate existing cartItemId for update/remove)
  const cartItems = useSelector((s) => s?.cart?.items ?? []);

  // route inputs
  const routeId =
    route?.params?.productId != null
      ? getCanonicalId(route?.params?.productId)
      : "";
  const initialDataFromNav = route?.params?.initialData ?? null;
  const contextToken = route?.params?.contextToken ?? null;

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // related
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  // favorites
  const [isFavorite, setIsFavorite] = useState(
    route?.params?.initialFavorite ?? false
  );
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // reviews
  const [reviewsData, setReviewsData] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const [showDescription, setShowDescription] = useState(false);
  const [showReviews, setShowReviews] = useState(false);

  // Kitchen conflict popup state
  const [showKitchenConflict, setShowKitchenConflict] = useState(false);
  const [kitchenConflictMessage, setKitchenConflictMessage] = useState("");
  const [showCustomizationPopup, setShowCustomizationPopup] = useState(false);
  const [selectedProductForCustomization, setSelectedProductForCustomization] = useState(null);
  const [customizationProductId, setCustomizationProductId] = useState(null);
  const [customizationWeightId, setCustomizationWeightId] = useState(null);

  // canonical product id
  const canonicalProductId = useMemo(() => {
    const pid = getCanonicalIdFromObj(product) || routeId || "";
    return getCanonicalId(pid);
  }, [product, routeId]);

  // Reset scroll position when product changes
  useEffect(() => {
    if (scrollViewRef.current && product) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [product]);

  // show any cached data asap
  useEffect(() => {
    if (initialDataFromNav && !product) {
      setProduct((prev) => prev ?? initialDataFromNav);
      setLoading(false);
    }
  }, [initialDataFromNav, product]);

  // favorite status
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      try {
        if (!canonicalProductId) return;
        setFavoriteLoading(true);
        const response = await authService.checkFavorite?.(canonicalProductId);
        if (response?.success) setIsFavorite(response.data.isFavorite);
      } finally {
        setFavoriteLoading(false);
      }
    };
    checkFavoriteStatus();
  }, [canonicalProductId]);

  const handleToggleFavorite = async () => {
    try {
      if (!canonicalProductId) return;
      setFavoriteLoading(true);
      const response = await authService.toggleFavorite?.(canonicalProductId);
      if (response?.success) {
        setIsFavorite((v) => !v);
        dispatch(toggleWishlistItem(canonicalProductId));
      }
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to update favorite status"
      );
    } finally {
      setFavoriteLoading(false);
    }
  };

  const deriveCategoryId = (p) =>
    getCanonicalId(
      p?.categoryId ??
      p?.category?.id ??
      p?.category?._id ??
      (Array.isArray(p?.categories)
        ? p.categories[0]?.id ?? p.categories[0]?._id
        : "")
    );

  const deriveOccasion = (p) =>
    String(
      p?.occasion ??
      p?.occasionKey ??
      (Array.isArray(p?.occasions) ? p.occasions[0] : "") ??
      ""
    );

  const parseContext = (token) => {
    if (!token || typeof token !== "string") return {};
    if (token.startsWith("cat:")) return { categoryId: token.slice(4) };
    if (token.startsWith("occ:")) return { occasion: token.slice(4) };
    return {};
  };

  /* ------------------------ RELATED PRODUCTS FETCHERS ----------------------- */
  const fetchRelatedViaController = async ({
    productId,
    categoryId,
    occasion,
  }) => {
    const queryCandidates = [
      {
        path: "/products/related",
        params: { productId, categoryId, occasion },
      },
      { path: "/product/related", params: { productId, categoryId, occasion } },
      {
        path: "/product/related-products",
        params: { productId, categoryId, occasion },
      },
      { path: "/products/by-category", params: { categoryId } },
      { path: "/products/by-occasion", params: { occasion } },
    ];

    for (const c of queryCandidates) {
      try {
        const res = await api.get(c.path, {
          params: Object.fromEntries(
            Object.entries(c.params).filter(
              ([, v]) => v != null && String(v).trim() !== ""
            )
          ),
        });
        const arr = await extractArray(res);
        if (Array.isArray(arr) && arr.length) return arr;
      } catch { }
    }

    const idCandidates = [
      `/products/${productId}/related`,
      `/product/${productId}/related`,
      `/product/related/${productId}`,
    ];
    for (const pth of idCandidates) {
      try {
        const res = await api.get(pth);
        const arr = await extractArray(res);
        if (Array.isArray(arr) && arr.length) return arr;
      } catch { }
    }

    const postCandidates = [
      { path: "/products/related", body: { productId, categoryId, occasion } },
      { path: "/product/related", body: { productId, categoryId, occasion } },
    ];
    for (const c of postCandidates) {
      try {
        const res = await api.post(c.path, c.body);
        const arr = await extractArray(res);
        if (Array.isArray(arr) && arr.length) return arr;
      } catch { }
    }

    return [];
  };

  const fetchRelatedFallback = async ({ categoryId, occasion, excludeId }) => {
    try {
      const baseParams = {};
      if (categoryId) baseParams.categoryId = categoryId;
      if (occasion) baseParams.occasion = occasion;

      const res = await authService.getFilteredProducts?.(baseParams);
      const payload = unwrap(res);
      let list = Array.isArray(payload) ? payload : payload?.data ?? [];
      if (excludeId) {
        list = list.filter(
          (x) => getCanonicalIdFromObj(x) !== getCanonicalId(excludeId)
        );
      }
      if (list.length) return list;
    } catch { }

    const searchPaths = [
      "/products/search",
      "/product/search",
      "/search/products",
      "/products",
      "/product",
      "/product/all",
    ];
    for (const pth of searchPaths) {
      try {
        const res = await api.get(pth, { params: { categoryId, occasion } });
        let list = await extractArray(res);
        if (excludeId) {
          list = list.filter(
            (x) => getCanonicalIdFromObj(x) !== getCanonicalId(excludeId)
          );
        }
        if (Array.isArray(list) && list.length) return list;
      } catch { }
    }

    try {
      const allRes = await authService.getAllProducts?.();
      const base = unwrap(allRes);
      let arr = Array.isArray(base) ? base : base?.data ?? [];
      if (categoryId) {
        arr = arr.filter((x) => {
          const cid =
            x?.categoryId ??
            x?.category?.id ??
            x?.category?._id ??
            (Array.isArray(x?.categories)
              ? x.categories[0]?.id ?? x.categories[0]?._id
              : "");
          return getCanonicalId(cid) === getCanonicalId(categoryId);
        });
      }
      if (occasion) {
        arr = arr.filter((x) => {
          const occ =
            x?.occasion ??
            x?.occasionKey ??
            (Array.isArray(x?.occasions) ? x.occasions[0] : "");
          return (
            String(occ || "").toLowerCase() ===
            String(occasion || "").toLowerCase()
          );
        });
      }
      if (excludeId) {
        arr = arr.filter(
          (x) => getCanonicalIdFromObj(x) !== getCanonicalId(excludeId)
        );
      }
      return arr.slice(0, 20);
    } catch { }

    return [];
  };

  const fetchRelatedProducts = async (p) => {
    try {
      setRelatedLoading(true);
      const productId = getCanonicalIdFromObj(p) || canonicalProductId;
      const ctx = parseContext(contextToken);
      const categoryId = ctx.categoryId || deriveCategoryId(p);
      const occasion = ctx.occasion || deriveOccasion(p);

      let list = await fetchRelatedViaController({
        productId,
        categoryId,
        occasion,
      });
      if (!list || list.length === 0) {
        list = await fetchRelatedFallback({
          categoryId,
          occasion,
          excludeId: productId,
        });
      }

      const excludeId = getCanonicalId(productId);
      const byId = new Map();
      (list || []).forEach((it) => {
        const id = getCanonicalIdFromObj(it);
        if (id && id !== excludeId && !byId.has(id)) byId.set(id, it);
      });

      setRelatedProducts(Array.from(byId.values()).slice(0, 12));
    } finally {
      setRelatedLoading(false);
    }
  };

  /* ----------------------------- PRODUCT FETCH ----------------------------- */
  const robustFetchById = async (id) => {
    // 1) Try native endpoint via service (may 404 on some backends)
    try {
      const response = await authService.getProductById?.(id);
      const payload = unwrap(response);
      if (payload && typeof payload === "object") {
        const pid = getCanonicalIdFromObj(payload);
        if (pid) return payload;
      }
    } catch (e) { }

    // 2) Candidate REST patterns commonly used
    const candidatePaths = [
      `/product/${id}`,
      `/products/${id}`,
      `/product/find/${id}`,
      `/product/detail/${id}`,
      `/product`, // ?id=...
    ];
    for (const pth of candidatePaths) {
      try {
        if (pth === "/product") {
          const r = await api.get(pth, { params: { id } });
          const d = unwrap(r);
          if (d && typeof d === "object") {
            const pid = getCanonicalIdFromObj(d);
            if (pid) return d;
          }
        } else {
          const r = await api.get(pth);
          const d = unwrap(r);
          if (d && typeof d === "object") {
            const pid = getCanonicalIdFromObj(d);
            if (pid) return d;
            if (d?.data && typeof d.data === "object") {
              const pid2 = getCanonicalIdFromObj(d.data);
              if (pid2) return d.data;
            }
          }
        }
      } catch { }
    }

    // 3) Verified catalog (getAllProducts) find by id
    try {
      const allRes = await authService.getAllProducts?.();
      const base = unwrap(allRes);
      const arr = Array.isArray(base) ? base : base?.data ?? [];
      const found = arr.find((p) => getCanonicalIdFromObj(p) === id);
      if (found) return found;
    } catch { }

    // 4) Admin/all routes find by id (unverified also visible)
    const allPaths = ["/product/all", "/products/all", "/products", "/product"];
    for (const pth of allPaths) {
      try {
        const r = await api.get(pth);
        const list = await extractArray(r);
        const found = list.find((p) => getCanonicalIdFromObj(p) === id);
        if (found) return found;
      } catch { }
    }

    throw new Error("NotFound");
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!routeId && initialDataFromNav) {
        setProduct((prev) => prev ?? initialDataFromNav);
        await fetchRelatedProducts(initialDataFromNav);
        return;
      }
      if (!routeId) throw new Error("Product not found");

      try {
        const payload = await robustFetchById(routeId);
        setProduct(payload);
        await fetchRelatedProducts(payload);
        return;
      } catch (e) { }

      if (initialDataFromNav?.name) {
        const resolvedId = await resolveProductIdByName(
          initialDataFromNav.name
        );
        if (resolvedId) {
          try {
            const payload = await robustFetchById(resolvedId);
            setProduct({ ...payload, id: resolvedId });
            await fetchRelatedProducts(payload);
            return;
          } catch { }
        }
      }

      if (initialDataFromNav) {
        setProduct((prev) => prev ?? initialDataFromNav);
        setError("Live data not found. Showing cached product details.");
        await fetchRelatedProducts(initialDataFromNav);
        return;
      }

      throw new Error("Product not found");
    } catch (err) {
      if (err?.response?.status === 404) {
        setError(
          "Product not found. It may have been removed or is unavailable."
        );
      } else if (err?.response?.status === 500) {
        setError("Server error. Please try again later.");
      } else {
        setError(err?.message || "Failed to load product");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------- REVIEWS API ------------------------------ */
  const fetchProductReviews = async () => {
    const pid = canonicalProductId;
    if (!pid) return;
    try {
      setReviewsLoading(true);
      setReviewsError(null);

      try {
        const resp = await authService.getProductReviews?.(pid);
        const list = await extractArray(resp);
        setReviewsData(list);
        return;
      } catch { }

      const axiosCandidates = [
        `/reviews/product/${pid}`,
        `/review/product/${pid}`,
        `/reviews/${pid}`,
      ];
      for (const pth of axiosCandidates) {
        try {
          const res = await api.get(pth);
          const list = await extractArray(res);
          if (Array.isArray(list)) {
            setReviewsData(list);
            return;
          }
        } catch { }
      }

      setReviewsData([]);
    } catch {
      setReviewsError("Failed to load reviews");
      setReviewsData([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct(); // eslint-disable-line
  }, [routeId]);

  useEffect(() => {
    fetchProductReviews(); // eslint-disable-line
  }, [canonicalProductId]);

  const calculateAverageRating = (reviewsArr) => {
    if (!reviewsArr || reviewsArr.length === 0) return 0;
    const sum = reviewsArr.reduce((total, r) => total + (r.rating || 0), 0);
    return Math.round((sum / reviewsArr.length) * 10) / 10;
  };

  /* ----------------------------- ADD TO CART ------------------------------- */
  const normalizeSize = (val) => {
    if (val == null) return "";
    const raw = String(val);
    const onlyNums = raw.replace(/[^\d.]/g, "");
    return onlyNums || raw.trim();
  };

  const resolveSelectedWeightId = () => {
    if (!product) return "";
    const weights = Array.isArray(product?.weights) ? product.weights : [];
    if (weights.length === 0) return "";
    const want = normalizeSize(selectedSize);

    let found =
      weights.find((w) => normalizeSize(w?.weight) === want) ||
      weights.find(
        (w) =>
          String(w?.weight).toLowerCase() === String(selectedSize).toLowerCase()
      ) ||
      weights[0];

    const idCandidate =
      found?.weightId ??
      found?.variantId ??
      found?.id ??
      found?._id ??
      (found?.value && (found?.value?.id || found?.value?._id));

    return idCandidate ? String(idCandidate) : "";
  };

  const ensureAuthenticated = async () => {
    const ok = await authService.isAuthenticated?.();
    return !!ok;
  };

  // locate an existing cart item in redux for this product + weight
  const findExistingCartItem = (productId, weightId) => {
    const pid = getCanonicalId(productId);
    const wid = getCanonicalId(weightId);
    return cartItems.find((it) => {
      const itPid = getCanonicalId(it?.productId ?? it?.product?.id);
      const itWid = getCanonicalId(it?.weightId ?? it?.Weight?.id);
      return itPid === pid && itWid === wid;
    });
  };

  // helper getters
  const getItemId = (it) => String(it?.id ?? it?._id ?? it?.cartItemId ?? "");

  //   INSTANT: Get current quantity from Redux (no local state needed)
  const getCurrentQuantity = () => {
    const productId = canonicalProductId || routeId;
    const weightId = resolveSelectedWeightId();
    const existing = findExistingCartItem(productId, weightId);
    return existing?.quantity || 0;
  };

  //   INSTANT: Check if should show quantity toggle
  const shouldShowQtyToggle = () => {
    return getCurrentQuantity() > 0;
  };

  //   INSTANT: Add to cart function - uses Redux directly
  const handleAddToCart = async () => {
    // Check if product is customizable
    if (product?.isCustomizable) {
      try {
        const addOnsResponse = await authService.getProductAddOns(canonicalProductId);
        const productWithAddOns = {
          ...product,
          addOnCategories: addOnsResponse?.data?.addOnCategories || [],
        };
        // Store IDs for use in handleCustomizationAddToCart
        const hasWeights = Array.isArray(product?.weights) && product.weights.length > 0;
        const weightToUse = hasWeights ? product.weights.find(w => normalizeSize(w.weight) === normalizeSize(selectedSize))?.id : null;
        setCustomizationProductId(canonicalProductId);
        setCustomizationWeightId(weightToUse);
        setSelectedProductForCustomization(productWithAddOns);
        setShowCustomizationPopup(true);
        return;
      } catch (error) {
        console.error("Error fetching add-ons:", error);
        // Continue with normal add to cart if add-ons fetch fails
      }
    }

    try {
      const logged = await ensureAuthenticated();
      if (!logged) {
        Alert.alert("Login required", "Please sign in to add items to cart.", [
          { text: "Cancel" },
          { text: "Sign in", onPress: () => navigation.navigate("Login") },
        ]);
        return;
      }

      const hasWeights =
        Array.isArray(product?.weights) && product.weights.length > 0;
      const weightId = resolveSelectedWeightId();
      if (hasWeights && !weightId) {
        Alert.alert(
          "Select a size",
          "Please choose a serving option before adding to cart."
        );
        return;
      }

      const productId = canonicalProductId || routeId;

      // Direct Redux dispatch - INSTANT FEEDBACK
      await dispatch(
        addToCartThunk({
          productId,
          weightId: hasWeights ? weightId : undefined,
          quantity: 1,
          Addition: null,
        })
      ).unwrap();

      // No need to set local state - Redux will update and component will re-render
    } catch (e) {
      const msg =
        e?.payload?.message ||
        e?.response?.data?.message ||
        e?.message ||
        "Failed to add to cart";

      // Check if it's a kitchen conflict error
      if (msg.toLowerCase().includes("kitchen") || msg.toLowerCase().includes("conflict")) {
        setKitchenConflictMessage(msg);
        setShowKitchenConflict(true);
      } else {
        Alert.alert("Error", msg);
      }
    }
  };

  //   FIXED: Quantity update function with proper error handling for removal
  const handleUpdateCartQuantity = async (newQuantity) => {
    try {
      const productId = canonicalProductId || routeId;
      const weightId = resolveSelectedWeightId();

      const existing = findExistingCartItem(productId, weightId);

      if (newQuantity <= 0) {
        if (existing) {
          await dispatch(removeCartItem(getItemId(existing))).unwrap();
        }
        return;
      }

      if (existing) {
        await dispatch(
          updateCartItemQty({
            cartItemId: getItemId(existing),
            quantity: newQuantity,
          })
        ).unwrap();
      }

      // No need to set local state - Redux will update and component will re-render
    } catch (error) {
      console.error("  Error updating cart:", error);
      // If item not found in cart, refresh cart to sync state
      if (error?.message?.includes("Item not found in cart")) {
        dispatch(fetchCart());
      } else {
        Alert.alert("Error", "Failed to update quantity");
      }
    }
  };

  //   FIXED: Minus button handler with proper error handling
  const handleQtyMinus = async () => {
    try {
      const currentQty = getCurrentQuantity();
      const next = Math.max(0, currentQty - 1);
      await handleUpdateCartQuantity(next);
    } catch (error) {
      console.error("Error in handleQtyMinus:", error);
    }
  };

  // Plus button handler
  const handleQtyPlus = async () => {
    const currentQty = getCurrentQuantity();
    const next = currentQty + 1;
    await handleUpdateCartQuantity(next);
  };

  // Handle add to cart from customization popup
  const handleCustomizationAddToCart = async (customizationData) => {
    // Check authentication first
    const logged = await ensureAuthenticated();
    if (!logged) {
      Alert.alert("Login required", "Please sign in to add items to cart.", [
        { text: "Cancel" },
        { text: "Sign in", onPress: () => navigation.navigate("Login") },
      ]);
      return;
    }

    try {
      // Use existing Redux addToCart thunk with Addition field
      await dispatch(
        addToCartThunk({
          productId: customizationData.productId,
          weightId: customizationData.weightId,
          quantity: customizationData.quantity,
          Addition: customizationData.addOns,
        })
      ).unwrap();

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

      if (errorMessage.toLowerCase().includes("kitchen") || errorMessage.toLowerCase().includes("conflict")) {
        setKitchenConflictMessage(errorMessage);
        setShowKitchenConflict(true);
      } else {
        Alert.alert("Error", errorMessage);
      }
    }
  };

  const handleOrderNow = async () => {
    try {
      const logged = await ensureAuthenticated();
      if (!logged) {
        Alert.alert("Login required", "Please sign in to continue.", [
          { text: "Cancel" },
          { text: "Sign in", onPress: () => navigation.navigate("Login") },
        ]);
        return;
      }

      const productId = canonicalProductId || routeId;
      if (!productId) {
        Alert.alert("Error", "Unable to determine product ID");
        return;
      }

      const hasWeights =
        Array.isArray(product?.weights) && product.weights.length > 0;

      let selectedWeightObject = null;
      if (hasWeights) {
        const weights = product.weights;
        const want = normalizeSize(selectedSize);
        selectedWeightObject =
          weights.find((w) => normalizeSize(w?.weight) === want) ||
          weights.find(
            (w) =>
              String(w?.weight).toLowerCase() === String(selectedSize).toLowerCase()
          ) ||
          weights[0];

        if (!selectedWeightObject) {
          Alert.alert("Select a size", "Please choose a serving option.");
          return;
        }
      }

      // Navigate directly to Checkout ("Buy Now" flow)
      navigation.navigate("Checkout", {
        fromOrderNow: true,
        product: product,
        selectedWeight: selectedWeightObject
      });

    } catch (e) {
      console.error("Error in Order Now:", e);
      Alert.alert("Error", "Failed to proceed to checkout");
    }
  };

  /* --------------------------------- UI ------------------------------------ */
  if (loading && !product) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={tw`text-gray-600 mt-2`}>Loading product...</Text>
      </View>
    );
  }

  if (error && !product) {
    return (
      <View style={tw`flex-1 justify-center items-center px-4`}>
        <Ionicons name="alert-circle-outline" size={50} color="#ef4444" />
        <Text style={tw`text-red-500 text-center text-lg mb-4`}>{error}</Text>
        <TouchableOpacity
          style={tw`bg-green-600 px-6 py-3 rounded-lg`}
          onPress={fetchProduct}
        >
          <Text style={tw`text-white font-semibold`}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <Text style={tw`text-gray-500 text-lg`}>Product not found</Text>
      </View>
    );
  }

  const productName = product.name || "Product Name";
  const productImagesRaw = Array.isArray(product.images) ? product.images : [];
  const productImages = productImagesRaw.map((im) =>
    typeof im === "string" ? { url: im } : im
  );
  const weights = product.weights || [];
  const firstWeight = weights[0] || {};
  const sellingPrice = Number(firstWeight.discountPrice || 0); // Selling Price
  const rawPrice = Number(firstWeight.price || 0);
  const hasDiscount = sellingPrice > 0 && sellingPrice < rawPrice;
  const finalPrice = hasDiscount ? sellingPrice : rawPrice;
  const savings = hasDiscount ? rawPrice - finalPrice : 0;
  const vendor = product.vendor || {};
  const descriptionText = (product.description || "").trim();
  const hasDescription = Boolean(descriptionText);

  // Check if nutrition data has any actual meaningful values
  // Only check actual nutrition fields, exclude metadata (id, productId) and benchmark fields
  const nutritionFields = ['calories', 'protein', 'carbs', 'fats', 'fiber', 'sugar', 'sodium'];
  const hasNutritionData = Boolean(
    product.Nutrition &&
    typeof product.Nutrition === 'object' &&
    nutritionFields.some(field => {
      const value = product.Nutrition[field];
      // Must have a value that's not null, undefined, empty string, and greater than 0
      return value !== null && value !== undefined && value !== "" && Number(value) > 0;
    })
  );

  console.log("hasNutritionData:", hasNutritionData);

  const reviews = reviewsData;
  const averageRating = calculateAverageRating(reviews);

  //   Get current quantity directly from Redux
  const currentQuantity = getCurrentQuantity();
  const showQtyToggle = shouldShowQtyToggle();

  // Quantity toggle UI
  const QtyToggle = () => (
    <View
      style={[
        tw`flex-row items-center justify-between h-12`,
        {
          flex: 1,
          backgroundColor: "#F7F8FA",
          borderRadius: 9999,
          paddingHorizontal: 10,
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
      ]}
    >
      <TouchableOpacity
        onPress={handleQtyMinus}
        style={[
          tw`w-10 h-10 rounded-2xl items-center justify-center`,
          { backgroundColor: "#FFFFFF" },
        ]}
      >
        <Text style={tw`text-xl text-black`}>−</Text>
      </TouchableOpacity>

      <Text style={tw`text-base font-semibold text-black`}>{currentQuantity}</Text>

      <TouchableOpacity
        onPress={handleQtyPlus}
        style={[
          tw`w-10 h-10 rounded-2xl items-center justify-center`,
          { backgroundColor: "#FFFFFF" },
        ]}
      >
        <Text style={tw`text-xl text-black`}>+</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={tw`flex-1 bg-white`} edges={["top"]}>
        <ScrollView
          ref={scrollViewRef}
          style={tw`flex-1`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        >
          {/* Image Gallery */}
          <View style={tw`bg-white`}>
            <TouchableOpacity
              style={tw`absolute z-10 top-4 left-4 bg-white/80 rounded-full p-2`}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#111" />
            </TouchableOpacity>

            {productImages.length > 0 ? (
              <>
                <View>
                  <Image
                    source={{ uri: productImages[selectedImageIndex]?.url }}
                    style={tw`w-full h-80`}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={tw`absolute top-4 right-4 bg-white/80 rounded-full p-2`}
                    onPress={handleToggleFavorite}
                    disabled={favoriteLoading}
                  >
                    {favoriteLoading ? (
                      <ActivityIndicator size={26} color="#e11d48" />
                    ) : (
                      <Ionicons
                        name={isFavorite ? "heart" : "heart-outline"}
                        size={26}
                        color={isFavorite ? "#e11d48" : "#111"}
                      />
                    )}
                  </TouchableOpacity>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={tw`flex-row px-4`}
                    style={tw`absolute bottom-[-35px] left-0 right-0`}
                  >
                    {productImages.map((img, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => setSelectedImageIndex(index)}
                        style={tw`mr-3`}
                      >
                        <View
                          style={[
                            tw`w-16 h-16 rounded-full overflow-hidden border-4`,
                            {
                              borderColor:
                                selectedImageIndex === index
                                  ? "#6A8A8B"
                                  : "#E5E7EB",
                            },
                          ]}
                        >
                          <Image
                            source={{ uri: img.url }}
                            style={tw`w-full h-full`}
                            resizeMode="cover"
                          />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={tw`h-5`} />
              </>
            ) : (
              <View
                style={tw`w-full h-80 bg-gray-200 justify-center items-center`}
              >
                <Ionicons name="image-outline" size={50} color="#9ca3af" />
                <Text style={tw`text-gray-500 mt-2`}>No Image Available</Text>
              </View>
            )}
          </View>

          {/* Product Info Section - UPDATED UI */}
          <View style={tw`p-5`}>
            {/* Product Header */}
            <View style={tw`mb-2`}>
              <Text
                style={[fontStyles.headingS, tw`text-lg text-gray-900 mb-1`]}
              >
                {productName}
              </Text>

              {/* Kitchen Name and Rating in same row */}
              <View style={tw`flex-row justify-between items-center mb-2`}>
                <Text
                  style={[
                    fontStyles.headingM,
                    tw`text-[#6A8A8B] text-xs font-medium`,
                  ]}
                >
                  From {vendor.kitchenName || "Clock to Fit"}
                </Text>

                <View style={tw`flex-row items-center`}>
                  <Ionicons name="star" size={18} color="#fbbf24" />
                  <Text
                    style={[
                      fontStyles.headingS,
                      tw`text-xs text-gray-900 font-semibold ml-1`,
                    ]}
                  >
                    {averageRating.toFixed(1)}
                  </Text>
                  <Text style={tw`text-gray-500 ml-1`}>({reviews.length})</Text>
                </View>
              </View>

              {/* Price */}
              {/* Price Row: Strikethrough -> Final -> % OFF */}
              {/* Price Row: Strikethrough -> Final -> % OFF */}
              <View style={tw`flex-row items-center mb-1`}>
                {hasDiscount && (
                  <Text style={[fontStyles.body, tw`text-base text-gray-400 line-through mr-2`]}>
                    ₹{Math.round(rawPrice)}
                  </Text>
                )}
                <Text style={[fontStyles.headingS, tw`text-2xl text-gray-900`]}>
                  ₹{Math.round(finalPrice)}
                </Text>
                {hasDiscount && (
                  <Text style={[fontStyles.headingS, tw`text-lg text-orange-500 ml-2`]}>
                    {Math.round((savings / rawPrice) * 100)}% OFF
                  </Text>
                )}
              </View>
            </View>

            {/* Serving Options */}
            <View style={tw`mb-4`}>
              <Text
                style={[fontStyles.headingS, tw`text-xs text-gray-900 mb-2`]}
              >
                Serving Option
              </Text>
              {weights.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={tw`mb-1`}
                >
                  <View style={tw`flex-row`}>
                    {weights.map((w, i) => (
                      <TouchableOpacity
                        key={`weight-${i}`}
                        onPress={() => setSelectedSize(w.weight)}
                        style={[
                          tw`px-4 py-1.5 rounded-xl mr-3 border-2`,
                          {
                            backgroundColor:
                              normalizeSize(selectedSize) ===
                                normalizeSize(w.weight)
                                ? "#6A8A8B"
                                : "#FFFFFF",
                            borderColor:
                              normalizeSize(selectedSize) ===
                                normalizeSize(w.weight)
                                ? "#6A8A8B"
                                : "#E5E7EB",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            tw`text-xs font-semibold text-center`,
                            {
                              color:
                                normalizeSize(selectedSize) ===
                                  normalizeSize(w.weight)
                                  ? "#FFFFFF"
                                  : "#111827",
                            },
                          ]}
                        >
                          {w.weight}
                        </Text>
                        <Text
                          style={[
                            tw`text-[10px] text-center mt-1`,
                            {
                              color:
                                normalizeSize(selectedSize) ===
                                  normalizeSize(w.weight)
                                  ? "#FFFFFF"
                                  : "#6B7280",
                            },
                          ]}
                        >
                          {(() => {
                            const wPrice = Number(w.price || 0);
                            const wSelling = Number(w.discountPrice || 0);
                            const isDisc = wSelling > 0 && wSelling < wPrice;
                            const wFinal = isDisc ? wSelling : wPrice;
                            return `₹${Math.round(wFinal)}`;
                          })()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <Text style={tw`text-gray-500`}>
                  No serving options available.
                </Text>
              )}
            </View>

            {/* Action Buttons */}
            <View style={tw`flex-row mb-4`}>
              <TouchableOpacity
                style={[
                  tw`flex-1 rounded-xl h-12 mr-2 justify-center items-center`,
                  { backgroundColor: "#6A8A8B" },
                ]}
                onPress={handleOrderNow}
              >
                <Text
                  style={tw`text-white text-center font-semibold text-sm`}
                >
                  Order Now
                </Text>
              </TouchableOpacity>

              {/* Right side: Add to Cart button or Qty Toggle */}
              {showQtyToggle ? (
                <View style={tw`flex-1 ml-2`}>
                  <QtyToggle />
                </View>
              ) : (
                <TouchableOpacity
                  style={tw`flex-1 border-2 border-[#6A8A8B] rounded-xl h-12 ml-2 justify-center items-center`}
                  onPress={handleAddToCart}
                >
                  <Text
                    style={tw`text-[#6A8A8B] text-center font-semibold text-sm`}
                  >
                    Add to Cart
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Description */}
            {hasDescription && (
              <View style={tw`border border-gray-200 rounded-lg overflow-hidden mb-4`}>
                <TouchableOpacity
                  onPress={() => setShowDescription(!showDescription)}
                  style={tw`flex-row justify-between items-center p-4 bg-gray-50`}
                >
                  <Text
                    style={[
                      fontStyles.headingItalic,
                      tw`text-base font-semibold text-gray-900`,
                    ]}
                  >
                    Description
                  </Text>
                  <Ionicons
                    name={showDescription ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#111"
                  />
                </TouchableOpacity>

                {showDescription && (
                  <View style={tw`p-4 bg-white border-t border-gray-200`}>
                    <Text style={fontStyles.description}>
                      {descriptionText.replace(/\s+/g, " ").trim()}
                    </Text>

                  </View>
                )}
              </View>
            )}

            {/* Nutrition Facts */}
            {hasNutritionData && (
              <View style={tw`mb-1`}>
                <Text
                  style={[
                    fontStyles.headingItalic,
                    tw`text-base font-semibold text-gray-900 mb-2`,
                  ]}
                >
                  Nutrition Facts
                </Text>
                <View style={tw`bg-gray-50 rounded-xl p-3`}>
                  <View style={tw`flex-row flex-wrap justify-between`}>
                    <View style={tw`w-1/2`}>
                      {Number(product.Nutrition.calories) > 0 && (
                        <View style={tw`flex-row items-center mb-2`}>
                          <View
                            style={[
                              tw`w-2 h-2 rounded-full mr-2`,
                              { backgroundColor: "#6A8A8B" },
                            ]}
                          />
                          <Text style={tw`text-gray-700 text-xs`}>
                            <Text style={tw`font-semibold`}>Calories: </Text>
                            {product.Nutrition.calories} kcal
                          </Text>
                        </View>
                      )}
                      {Number(product.Nutrition.carbs) > 0 && (
                        <View style={tw`flex-row items-center mb-2`}>
                          <View
                            style={[
                              tw`w-2 h-2 rounded-full mr-2`,
                              { backgroundColor: "#6A8A8B" },
                            ]}
                          />
                          <Text style={tw`text-gray-700 text-xs`}>
                            <Text style={tw`font-semibold`}>Carbs: </Text>
                            {product.Nutrition.carbs} g
                          </Text>
                        </View>
                      )}
                      {Number(product.Nutrition.fiber) > 0 && (
                        <View style={tw`flex-row items-center mb-2`}>
                          <View
                            style={[
                              tw`w-2 h-2 rounded-full mr-2`,
                              { backgroundColor: "#6A8A8B" },
                            ]}
                          />
                          <Text style={tw`text-gray-700 text-xs`}>
                            <Text style={tw`font-semibold`}>Fiber: </Text>
                            {product.Nutrition.fiber} g
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={tw`w-1/2`}>
                      {Number(product.Nutrition.protein) > 0 && (
                        <View style={tw`flex-row items-center mb-2`}>
                          <View
                            style={[
                              tw`w-2 h-2 rounded-full mr-2`,
                              { backgroundColor: "#6A8A8B" },
                            ]}
                          />
                          <Text style={tw`text-gray-700 text-xs`}>
                            <Text style={tw`font-semibold`}>Protein: </Text>
                            {product.Nutrition.protein} g
                          </Text>
                        </View>
                      )}
                      {Number(product.Nutrition.fats) > 0 && (
                        <View style={tw`flex-row items-center mb-2`}>
                          <View
                            style={[
                              tw`w-2 h-2 rounded-full mr-2`,
                              { backgroundColor: "#6A8A8B" },
                            ]}
                          />
                          <Text style={tw`text-gray-700 text-xs`}>
                            <Text style={tw`font-semibold`}>Fats: </Text>
                            {product.Nutrition.fats} g
                          </Text>
                        </View>
                      )}
                      {Number(product.Nutrition.sugar) > 0 && (
                        <View style={tw`flex-row items-center mb-2`}>
                          <View
                            style={[
                              tw`w-2 h-2 rounded-full mr-2`,
                              { backgroundColor: "#6A8A8B" },
                            ]}
                          />
                          <Text style={tw`text-gray-700 text-xs`}>
                            <Text style={tw`font-semibold`}>Sugar: </Text>
                            {product.Nutrition.sugar} g
                          </Text>
                        </View>
                      )}
                      {Number(product.Nutrition.sodium) > 0 && (
                        <View style={tw`flex-row items-center mb-2`}>
                          <View
                            style={[
                              tw`w-2 h-2 rounded-full mr-2`,
                              { backgroundColor: "#6A8A8B" },
                            ]}
                          />
                          <Text style={tw`text-gray-700 text-xs`}>
                            <Text style={tw`font-semibold`}>Sodium: </Text>
                            {product.Nutrition.sodium} mg
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Customer Reviews */}
            {/* Customer Reviews */}
            <View
              style={tw`border border-gray-200 rounded-lg overflow-hidden mb-4`}
            >
              <TouchableOpacity
                onPress={() => setShowReviews(!showReviews)}
                style={tw`flex-row justify-between items-center p-4 bg-gray-50`}
              >
                <Text
                  style={[
                    fontStyles.headingItalic,
                    tw`text-base font-semibold text-gray-900`,
                  ]}
                >
                  Customer Reviews
                </Text>
                <Ionicons
                  name={showReviews ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#111"
                />
              </TouchableOpacity>

              {showReviews && (
                <View style={tw`p-4 bg-white border-t border-gray-200`}>
                  <View style={tw`flex-row items-center mb-4`}>
                    <Text style={tw`text-2xl font-bold text-gray-900 mr-2`}>
                      {averageRating.toFixed(1)}
                    </Text>
                    <View style={tw`flex-row mr-2`}>
                      {[...Array(5)].map((_, i) => (
                        <Ionicons
                          key={`rating-star-${i}`}
                          name={
                            i < Math.floor(averageRating)
                              ? "star"
                              : "star-outline"
                          }
                          size={20}
                          color="#fbbf24"
                        />
                      ))}
                    </View>
                    <Text style={tw`text-gray-600`}>
                      ({reviews.length} reviews)
                    </Text>
                  </View>

                  {reviewsLoading ? (
                    <View style={tw`items-center py-6`}>
                      <ActivityIndicator size="small" color="#6A8A8B" />
                    </View>
                  ) : reviewsError ? (
                    <Text style={tw`text-red-500 mb-2`}>{reviewsError}</Text>
                  ) : reviews.length > 0 ? (
                    reviews.map((reviewItem, idx) => (
                      <View
                        key={reviewItem.id || reviewItem._id || `review-${idx}`}
                        style={tw`mb-4 pb-4 border-b border-gray-200`}
                      >
                        <View
                          style={tw`flex-row justify-between items-start mb-2`}
                        >
                          <Text style={tw`font-semibold text-sm text-gray-900`}>
                            {reviewItem.user?.name || "Anonymous"}
                          </Text>
                          <Text style={tw`text-gray-500 text-sm`}>
                            {reviewItem.createdAt
                              ? new Date(
                                reviewItem.createdAt
                              ).toLocaleDateString()
                              : ""}
                          </Text>
                        </View>
                        <View style={tw`flex-row mb-2`}>
                          {[...Array(5)].map((_, i) => (
                            <Ionicons
                              key={`review-star-${i}`}
                              name={
                                i < (reviewItem.rating || 0)
                                  ? "star"
                                  : "star-outline"
                              }
                              size={16}
                              color="#fbbf24"
                            />
                          ))}
                        </View>
                        {reviewItem.comment && (
                          <Text style={tw`text-gray-600 text-sm mb-2`}>
                            {reviewItem.comment}
                          </Text>
                        )}
                        {reviewItem.image && (
                          <Image
                            source={{ uri: reviewItem.image }}
                            style={tw`w-20 h-20 rounded-lg`}
                            resizeMode="cover"
                          />
                        )}
                      </View>
                    ))
                  ) : (
                    <View style={tw`items-center py-8`}>
                      <Ionicons
                        name="chatbubble-outline"
                        size={50}
                        color="#9ca3af"
                      />
                      <Text style={tw`text-gray-500 text-lg mt-2`}>
                        No reviews yet
                      </Text>
                      <Text style={tw`text-gray-400 text-center mt-1`}>
                        Be the first to review this product!
                      </Text>
                    </View>
                  )}

                  {/* Add Review */}
                  <View style={tw`mt-6`}>
                    <Text
                      style={[
                        fontStyles.headingS,
                        tw`text-base text-gray-900 mb-2`,
                      ]}
                    >
                      Add Your Review
                    </Text>

                    <Text style={tw`text-gray-700 text-sm mb-2`}>
                      Your Rating
                    </Text>
                    <View style={tw`flex-row items-center mb-4`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                          key={`rating-${star}`}
                          onPress={() => setRating(star)}
                          style={tw`mr-1`}
                        >
                          <Ionicons
                            name={rating >= star ? "star" : "star-outline"}
                            size={28}
                            color={rating >= star ? "#fbbf24" : "#d1d5db"}
                          />
                        </TouchableOpacity>
                      ))}
                      <Text style={tw`text-gray-600 ml-2`}>
                        {rating === 0
                          ? "Select rating"
                          : `${rating} star${rating > 1 ? "s" : ""}`}
                      </Text>
                    </View>

                    <Text style={tw`text-gray-700 text-sm mb-2`}>
                      Your Review
                    </Text>
                    <TextInput
                      style={tw`border border-gray-300 rounded-lg p-3 text-gray-700 min-h-24`}
                      placeholder="What did you like or dislike about this product? Share your experience..."
                      placeholderTextColor="#9ca3af"
                      multiline
                      value={review}
                      onChangeText={setReview}
                    />

                    <TouchableOpacity
                      style={tw`bg-green-600 rounded-lg py-3 mt-4`}
                      onPress={async () => {
                        if (rating === 0) {
                          Alert.alert("Error", "Please select a rating");
                          return;
                        }
                        const primaryId = canonicalProductId || routeId;
                        if (!primaryId) {
                          Alert.alert(
                            "Error",
                            "Unable to determine product ID"
                          );
                          return;
                        }
                        try {
                          const res = await authService.submitReview?.({
                            productId: primaryId,
                            rating,
                            comment: review,
                          });
                          if (res?.success) {
                            setRating(0);
                            setReview("");
                            fetchProductReviews();
                            return;
                          }
                          throw new Error(
                            res?.message || "Failed to submit review"
                          );
                        } catch (e) {
                          Alert.alert(
                            "Error",
                            e?.response?.data?.message ||
                            e?.message ||
                            "Failed to submit review"
                          );
                        }
                      }}
                    >
                      <Text
                        style={tw`text-white text-center font-semibold text-sm`}
                      >
                        Submit Review
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* You May Also Like - FIXED LAYOUT */}
            <View style={tw`mt-2`}>
              <Text
                style={[
                  fontStyles.headingItalic,
                  tw`text-base font-semibold text-gray-900 mb-2`,
                ]}
              >
                You May Also Like
              </Text>

              {relatedLoading ? (
                <View style={tw`mx-[-4px]`}>
                  <FlatList
                    data={[1, 2, 3, 4]}
                    renderItem={() => <ProductSkeleton />}
                    keyExtractor={(item) => `skeleton-${item}`}
                    numColumns={2}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={tw`px-0`}
                  />
                </View>
              ) : relatedProducts.length === 0 ? (
                <Text style={tw`text-gray-500`}>
                  No related products found.
                </Text>
              ) : (
                <View style={tw`flex-row flex-wrap justify-between`}>
                  {relatedProducts.map((item, index) => {
                    const weightsSP = item.weights || [];
                    const w0 = weightsSP[0] || {};
                    const priceNow = w0.discountPrice || w0.price || 0;
                    const priceWas = w0.price || 0;

                    const img0 = item.images?.[0];
                    const img =
                      typeof img0 === "string" ? img0 : img0?.url || null;

                    const spId =
                      getCanonicalIdFromObj(item) || `related-${index}`;

                    //   Get cart info from Redux store - EXACTLY like ProductsByIngredients
                    const getCartItemInfo = (productId) => {
                      if (!cartItems || !Array.isArray(cartItems)) {
                        return { cartItemId: null, quantity: 0 };
                      }

                      const cartItem = cartItems.find(
                        (cartItem) =>
                          getCanonicalId(
                            cartItem?.productId ?? cartItem?.product?.id
                          ) === getCanonicalId(productId)
                      );
                      if (cartItem) {
                        return {
                          cartItemId: getItemId(cartItem),
                          quantity: cartItem.quantity || 0,
                        };
                      }
                      return { cartItemId: null, quantity: 0 };
                    };

                    const cartInfo = getCartItemInfo(spId);
                    const currentQuantity = cartInfo.quantity || 0;
                    const cartItemId = cartInfo.cartItemId;

                    //   FIXED: Add to cart function for related products with proper error handling
                    const handleRelatedAddToCart = async (
                      productId,
                      weightId
                    ) => {
                      try {
                        const logged = await ensureAuthenticated();
                        if (!logged) {
                          Alert.alert(
                            "Login required",
                            "Please sign in to add items to cart.",
                            [
                              { text: "Cancel" },
                              {
                                text: "Sign in",
                                onPress: () => navigation.navigate("Login"),
                              },
                            ]
                          );
                          return;
                        }

                        // Direct Redux dispatch - INSTANT FEEDBACK
                        await dispatch(
                          addToCartThunk({
                            productId,
                            weightId: weightId || undefined,
                            quantity: 1,
                            Addition: null,
                          })
                        ).unwrap();
                      } catch (e) {
                        const msg =
                          e?.payload?.message ||
                          e?.response?.data?.message ||
                          e?.message ||
                          "Failed to add to cart";

                        if (msg.toLowerCase().includes("kitchen") || msg.toLowerCase().includes("conflict")) {
                          setKitchenConflictMessage(msg);
                          setShowKitchenConflict(true);
                        } else {
                          Alert.alert("Error", msg);
                        }
                      }
                    };

                    //   FIXED: Quantity update function for related products with proper error handling
                    const handleRelatedUpdateCartQuantity = async (
                      newQuantity
                    ) => {
                      try {
                        if (newQuantity <= 0) {
                          if (cartItemId) {
                            await dispatch(removeCartItem(cartItemId)).unwrap();
                          }
                          return;
                        }

                        if (cartItemId) {
                          await dispatch(
                            updateCartItemQty({
                              cartItemId,
                              quantity: newQuantity,
                            })
                          ).unwrap();
                        }
                      } catch (error) {
                        console.error("  Error updating cart:", error);
                        // If item not found in cart, refresh cart to sync state
                        if (
                          error?.message?.includes("Item not found in cart")
                        ) {
                          dispatch(fetchCart());
                        } else {
                          Alert.alert("Error", "Failed to update quantity");
                        }
                      }
                    };

                    //   FIXED: Minus button handler for related products
                    const handleRelatedQtyMinus = async () => {
                      try {
                        const next = Math.max(0, currentQuantity - 1);
                        await handleRelatedUpdateCartQuantity(next);
                      } catch (error) {
                        console.error("Error in handleRelatedQtyMinus:", error);
                      }
                    };

                    // Plus button handler for related products
                    const handleRelatedQtyPlus = async () => {
                      const next = currentQuantity + 1;
                      await handleRelatedUpdateCartQuantity(next);
                    };

                    const cardWidth = (screenWidth - 40) / 2;

                    return (
                      <View
                        key={spId}
                        style={[
                          tw`mb-1`,
                          {
                            width: cardWidth,
                          },
                        ]}
                      >
                        <TouchableOpacity
                          style={[
                            tw`bg-white rounded-2xl p-3 border border-gray-200 mx-1`,
                            tw`shadow-lg shadow-black/10`,
                            { height: 280 },
                          ]}
                          onPress={() => {
                            const pid = spId;
                            if (!pid) return;
                            navigation.navigate("ProductDetails", {
                              productId: pid,
                              initialFavorite: false,
                              contextToken,
                              initialData: item,
                            });
                          }}
                        >
                          {img ? (
                            <Image
                              source={{ uri: img }}
                              style={tw`w-full h-32 rounded-xl mb-2`}
                              resizeMode="cover"
                            />
                          ) : (
                            <View
                              style={tw`w-full h-32 rounded-xl mb-2 bg-gray-200 justify-center items-center`}
                            >
                              <Text style={tw`text-gray-500 text-xs`}>
                                No Image
                              </Text>
                            </View>
                          )}

                          <View style={tw`flex-1`}>
                            <Text
                              style={[
                                fontStyles.headingS,
                                tw`text-sm font-semibold text-gray-900 mb-1`,
                              ]}
                              numberOfLines={2}
                            >
                              {item.name || "Product Name"}
                            </Text>
                            <Text
                              style={[tw`text-gray-500 text-[10px] leading-[14px] mb-2`]}
                              numberOfLines={2}
                            >
                              {item.description || "Healthy and delicious meal"}
                            </Text>

                            <View
                              style={tw`flex-row justify-between items-center mt-auto`}
                            >
                              <Text
                                style={[
                                  fontStyles.headingS,
                                  tw`text-sm font-semibold text-gray-800`,
                                ]}
                              >
                                {priceNow > 0 ? `₹${priceNow}` : "₹---"}
                              </Text>

                              {/*   EXACTLY like ProductsByIngredients cart buttons */}
                              {currentQuantity === 0 ? (
                                <TouchableOpacity
                                  style={tw`bg-[#6B9080] h-8 w-20 justify-center items-center rounded-xl`}
                                  onPress={() =>
                                    handleRelatedAddToCart(
                                      spId,
                                      weightsSP[0]?.id
                                    )
                                  }
                                >
                                  <Text style={tw`text-white text-xs`}>
                                    Add
                                  </Text>
                                </TouchableOpacity>
                              ) : (
                                <View
                                  style={tw`flex-row items-center justify-between bg-[#6B9080] rounded-xl h-8 w-20 px-2`}
                                >
                                  <TouchableOpacity
                                    style={tw`h-full justify-center`}
                                    onPress={handleRelatedQtyMinus}
                                  >
                                    <Ionicons
                                      name="remove"
                                      size={14}
                                      color="white"
                                    />
                                  </TouchableOpacity>

                                  <Text style={tw`text-white text-xs font-bold`}>
                                    {currentQuantity}
                                  </Text>

                                  <TouchableOpacity
                                    style={tw`h-full justify-center`}
                                    onPress={handleRelatedQtyPlus}
                                  >
                                    <Ionicons
                                      name="add"
                                      size={14}
                                      color="white"
                                    />
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Kitchen Conflict Popup */}
      <KitchenConflictPopup
        visible={showKitchenConflict}
        onClose={() => setShowKitchenConflict(false)}
        message={kitchenConflictMessage}
        onViewCart={() => {
          setShowKitchenConflict(false);
          navigation.navigate("CartScreen");
        }}
      />

      {/* Customization Popup */}
      <CustomizationPopup
        visible={showCustomizationPopup}
        onClose={() => {
          setShowCustomizationPopup(false);
          setSelectedProductForCustomization(null);
        }}
        product={selectedProductForCustomization}
        onAddToCart={handleCustomizationAddToCart}
        productId={customizationProductId}
        weightId={customizationWeightId}
      />
    </>
  );
};

export default ProductDetails;
