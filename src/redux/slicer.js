// src/redux/slicer.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authService } from "../services/authService.js";

/* ----------------------------- PRODUCTS ----------------------------- */
export const fetchAllProducts = createAsyncThunk(
  "products/fetchAll",
  async (force = false, { rejectWithValue, getState }) => {
    try {
      // Skip if we already have data and it's fresh (< 2 min), unless forced
      const { products } = getState();
      if (
        !force &&
        products.items.length > 0 &&
        products.lastFetchedAt &&
        Date.now() - products.lastFetchedAt < 2 * 60 * 1000
      ) {
        return products.items; // return cached data
      }
      const res = await authService.getAllProducts();
      return res?.data || []; // backend shape: { success, data: [...] }
    } catch (e) {
      return rejectWithValue(
        e?.response?.data || { message: "Failed to fetch products" }
      );
    }
  }
);

export const fetchProductById = createAsyncThunk(
  "products/fetchById",
  async (id, { getState, rejectWithValue }) => {
    try {
      const { products } = getState();
      const cached = products.items.find((p) => (p.id || p._id) === id);
      if (cached) return cached;

      const res = await authService.getProductById(id);
      return res?.data;
    } catch (e) {
      return rejectWithValue(
        e?.response?.data || { message: "Product not found" }
      );
    }
  }
);

const productsSlice = createSlice({
  name: "products",
  initialState: { items: [], selected: null, status: "idle", error: null, lastFetchedAt: null },
  reducers: {
    clearSelected(state) {
      state.selected = null;
    },
    setProducts(state, action) {
      state.items = action.payload || [];
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchAllProducts.pending, (s) => {
      s.status = "loading";
      s.error = null;
    })
      .addCase(fetchAllProducts.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.items = a.payload;
        s.lastFetchedAt = Date.now();
      })
      .addCase(fetchAllProducts.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload?.message || "Failed to load products";
      })
      .addCase(fetchProductById.pending, (s) => {
        s.status = "loading";
        s.error = null;
      })
      .addCase(fetchProductById.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.selected = a.payload;
        const id = a.payload?.id || a.payload?._id;
        if (id && !s.items.find((p) => (p.id || p._id) === id))
          s.items.push(a.payload);
      })
      .addCase(fetchProductById.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload?.message || "Failed to load product";
      });
  },
});
export const { clearSelected, setProducts } = productsSlice.actions;
export const productsReducer = productsSlice.reducer;

/* ----------------------------- INGREDIENTS ----------------------------- */
export const fetchIngredientsRedux = createAsyncThunk(
  "ingredients/fetch",
  async (force = false, { rejectWithValue, getState }) => {
    try {
      const { ingredients } = getState();
      if (
        !force &&
        ingredients.items.length > 0 &&
        ingredients.lastFetchedAt &&
        Date.now() - ingredients.lastFetchedAt < 2 * 60 * 1000
      ) {
        return ingredients.items;
      }
      const res = await authService.getIngredients();
      return res?.data || [];
    } catch (e) {
      return rejectWithValue(
        e?.response?.data || { message: "Failed to fetch ingredients" }
      );
    }
  }
);

const ingredientsSlice = createSlice({
  name: "ingredients",
  initialState: { items: [], status: "idle", error: null, lastFetchedAt: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchIngredientsRedux.pending, (s) => {
      s.status = "loading";
    })
      .addCase(fetchIngredientsRedux.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.items = a.payload;
        s.lastFetchedAt = Date.now();
      })
      .addCase(fetchIngredientsRedux.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload?.message || "Failed to load ingredients";
      });
  },
});
export const ingredientsReducer = ingredientsSlice.reducer;

/* ----------------------------- OCCASIONS ----------------------------- */
export const fetchOccasionsRedux = createAsyncThunk(
  "occasions/fetch",
  async (force = false, { rejectWithValue, getState }) => {
    try {
      const { occasions } = getState();
      if (
        !force &&
        occasions.items.length > 0 &&
        occasions.lastFetchedAt &&
        Date.now() - occasions.lastFetchedAt < 2 * 60 * 1000
      ) {
        return occasions.items;
      }
      const res = await authService.getOccasions();
      return res?.data || [];
    } catch (e) {
      return rejectWithValue(
        e?.response?.data || { message: "Failed to fetch occasions" }
      );
    }
  }
);

const occasionsSlice = createSlice({
  name: "occasions",
  initialState: { items: [], status: "idle", error: null, lastFetchedAt: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchOccasionsRedux.pending, (s) => {
      s.status = "loading";
    })
      .addCase(fetchOccasionsRedux.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.items = a.payload;
        s.lastFetchedAt = Date.now();
      })
      .addCase(fetchOccasionsRedux.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload?.message || "Failed to load occasions";
      });
  },
});
export const occasionsReducer = occasionsSlice.reducer;

/* ----------------------------- CATEGORIES ----------------------------- */
export const fetchCategoriesRedux = createAsyncThunk(
  "categories/fetch",
  async (force = false, { rejectWithValue, getState }) => {
    try {
      const { categories } = getState();
      if (
        !force &&
        categories.items.length > 0 &&
        categories.lastFetchedAt &&
        Date.now() - categories.lastFetchedAt < 2 * 60 * 1000
      ) {
        return categories.items;
      }
      const res = await authService.getCategories();
      return res?.data || [];
    } catch (e) {
      return rejectWithValue(
        e?.response?.data || { message: "Failed to fetch categories" }
      );
    }
  }
);

const categoriesSlice = createSlice({
  name: "categories",
  initialState: { items: [], status: "idle", error: null, lastFetchedAt: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchCategoriesRedux.pending, (s) => {
      s.status = "loading";
    })
      .addCase(fetchCategoriesRedux.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.items = a.payload;
        s.lastFetchedAt = Date.now();
      })
      .addCase(fetchCategoriesRedux.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload?.message || "Failed to load categories";
      });
  },
});
export const categoriesReducer = categoriesSlice.reducer;

/* ----------------------------- WISHLIST ----------------------------- */
export const fetchWishlist = createAsyncThunk(
  "wishlist/fetch",
  async (force = false, { rejectWithValue, getState }) => {
    try {
      const { wishlist } = getState();
      // Cache: skip if we have recent data (< 2 min) unless forced
      if (
        !force &&
        wishlist.lastFetchedAt &&
        Date.now() - wishlist.lastFetchedAt < 2 * 60 * 1000
      ) {
        return wishlist.items;
      }
      const res = await authService.getWishlist();
      let items = [];
      if (res?.data?.items) {
        items = res.data.items;
      } else if (res?.data && Array.isArray(res.data)) {
        items = res.data;
      } else if (Array.isArray(res)) {
        items = res;
      }
      return items;
    } catch (e) {
      return rejectWithValue(
        e?.response?.data || { message: "Failed to fetch wishlist" }
      );
    }
  }
);

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState: { items: [], status: "idle", error: null, lastFetchedAt: null },
  reducers: {
    toggleWishlistItem(state, action) {
      const payload = action.payload;
      const id = typeof payload === 'string' ? payload : (payload.id || payload._id);

      const idx = state.items.findIndex((i) => {
        const itemId = i.id || i._id || i.productId;
        const prodId = i.product?.id || i.product?._id;
        return itemId === id || prodId === id;
      });

      if (idx >= 0) {
        state.items.splice(idx, 1);
      } else {
        // If payload is object, store it fully; otherwise just store productId
        if (typeof payload === 'object') {
          state.items.push({ ...payload, productId: id });
        } else {
          state.items.push({ productId: id });
        }
      }
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchWishlist.pending, (s) => {
      s.status = "loading";
    })
      .addCase(fetchWishlist.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.items = a.payload;
        s.lastFetchedAt = Date.now();
      })
      .addCase(fetchWishlist.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload?.message || "Failed to fetch wishlist";
      });
  },
});
export const { toggleWishlistItem } = wishlistSlice.actions;
export const wishlistReducer = wishlistSlice.reducer;


/* -------------------------------- AUTH ------------------------------ */
export const signIn = createAsyncThunk(
  "auth/signIn",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await authService.login({
        email: payload.email,
        password: payload.password,
      });

      // Store token and user data properly
      if (res.extractedToken) {
        await authService.setItem("accessToken", res.extractedToken);
      }

      const me = await authService.getCurrentUser();
      return me?.data || null;
    } catch (e) {
      return rejectWithValue(
        e?.response?.data?.message || e?.message || "Login failed"
      );
    }
  }
);

export const hydrateUser = createAsyncThunk(
  "auth/hydrate",
  async (_, { rejectWithValue }) => {
    try {
      // Check if we have a valid token first
      const isAuthenticated = await authService.checkAuthentication();
      if (!isAuthenticated) {
        await authService.multiRemove(["accessToken", "user"]);
        return null;
      }

      const me = await authService.getCurrentUser();
      return me?.data || null;
    } catch (e) {
      await authService.multiRemove(["accessToken", "user"]);
      return rejectWithValue("Session expired");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    status: "idle",
    error: null,
    isAuthenticated: false,
  },
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
    // Directly update user in Redux (used after profile updates)
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
  },
  extraReducers: (b) => {
    b.addCase(signIn.pending, (s) => {
      s.status = "loading";
      s.error = null;
    })
      .addCase(signIn.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.user = a.payload;
        s.isAuthenticated = true;
      })
      .addCase(signIn.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload;
        s.isAuthenticated = false;
      })
      .addCase(hydrateUser.fulfilled, (s, a) => {
        s.user = a.payload;
        s.isAuthenticated = !!a.payload;
      })
      .addCase(hydrateUser.rejected, (s) => {
        s.user = null;
        s.isAuthenticated = false;
      });
  },
});

export const { clearAuthError, setUser } = authSlice.actions;
export const authReducer = authSlice.reducer;

/* ---------------------------------- CART ---------------------------- */
export const fetchCart = createAsyncThunk(
  "cart/fetch",
  async (_, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      if (!auth.isAuthenticated) {
        throw new Error("Authentication required");
      }

      const carts = await authService.getCart();
      return carts;
    } catch (e) {
      return rejectWithValue(
        e?.response?.data || { message: e.message || "Failed to fetch cart" }
      );
    }
  }
);

export const addToCart = createAsyncThunk(
  "cart/add",
  async (
    { productId, weightId, quantity = 1, Addition = null },
    { rejectWithValue, dispatch, getState }
  ) => {
    try {
      const { auth } = getState();
      if (!auth.isAuthenticated) {
        throw new Error("Authentication required");
      }

      await authService.addToCart({ productId, weightId, quantity, Addition });
      await dispatch(fetchCart());
      return true;
    } catch (e) {
      return rejectWithValue(
        e?.response?.data || { message: e.message || "Failed to add to cart" }
      );
    }
  }
);
// PATCH/PUT/POST robust update then refetch
export const updateCartItemQty = createAsyncThunk(
  "cart/updateQty",
  async ({ cartItemId, quantity }, { rejectWithValue, dispatch }) => {
    try {
      await authService.updateCartQuantity(cartItemId, quantity);
      await dispatch(fetchCart());
      return true;
    } catch (e) {
      return rejectWithValue(
        e?.response?.data || { message: "Failed to update item" }
      );
    }
  }
);

// DELETE/POST remove then refetch
export const removeCartItem = createAsyncThunk(
  "cart/removeItem",
  async (cartItemId, { rejectWithValue, dispatch }) => {
    try {
      await authService.removeFromCart(cartItemId);
      await dispatch(fetchCart());
      return true;
    } catch (e) {
      return rejectWithValue(
        e?.response?.data || { message: "Failed to remove item" }
      );
    }
  }
);

// POST /cart/clear then refetch
export const clearCartByVendor = createAsyncThunk(
  "cart/clearVendor",
  async (vendorId, { rejectWithValue, dispatch }) => {
    try {
      await authService.clearCart(vendorId);
      await dispatch(fetchCart());
      return { vendorId };
    } catch (e) {
      return rejectWithValue(
        e?.response?.data || { message: "Failed to clear cart" }
      );
    }
  }
);

const safeNum = (n) => Math.max(0, Number.isFinite(+n) ? +n : 0);
const lineTotal = (it) => {
  const weight = it?.weight || it?.Weight;
  const originalPrice = safeNum(weight?.price ?? it?.price ?? it?.unitPrice ?? 0);
  const discountPrice = safeNum(weight?.discountPrice ?? 0);

  // Backend: discountPrice is the SELLING PRICE
  // If discountPrice is present (>0) and less than original, use it.
  const hasDiscount = discountPrice > 0 && discountPrice < originalPrice;
  const finalPrice = hasDiscount ? discountPrice : originalPrice;

  const qty = safeNum(it?.quantity ?? it?.qty ?? 0);
  return finalPrice * qty;
};

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    cartsRaw: [],
    items: [],
    vendorId: null,
    subtotal: 0,
    deliveryFee: 6,
    total: 0,
    status: "idle",
    error: null,
  },
  reducers: {
    setActiveVendor(state, action) {
      const vendorId = action.payload;
      const chosen =
        state.cartsRaw.find((c) => c.vendorId === vendorId) || null;
      state.vendorId = chosen?.vendorId || null;
      state.items = chosen?.items || [];
      const calcSub = state.items.reduce((sum, it) => sum + lineTotal(it), 0);
      state.subtotal = safeNum(chosen?.total ?? calcSub);
      state.total = safeNum(
        state.subtotal + (state.subtotal ? state.deliveryFee : 0)
      );
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchCart.pending, (s) => {
      s.status = "loading";
      s.error = null;
    })
      .addCase(fetchCart.fulfilled, (s, a) => {
        s.status = "succeeded";
        const carts = a.payload || [];
        s.cartsRaw = carts;
        const active = carts.find((c) => c.items?.length) || carts[0] || null;
        s.vendorId = active?.vendorId || null;
        s.items = active?.items || [];
        const calcSub = s.items.reduce((sum, it) => sum + lineTotal(it), 0);
        s.subtotal = safeNum(active?.total ?? calcSub);
        s.total = safeNum(s.subtotal + (s.subtotal ? s.deliveryFee : 0));
      })
      .addCase(fetchCart.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload?.message || "Failed to fetch cart";
      })

      .addCase(addToCart.pending, (s) => {
        s.status = "loading";
        s.error = null;
      })
      .addCase(addToCart.fulfilled, (s) => {
        s.status = "succeeded";
      })
      .addCase(addToCart.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload?.message || "Failed to add to cart";
      })

      .addCase(updateCartItemQty.pending, (s) => {
        s.status = "loading";
        s.error = null;
      })
      .addCase(updateCartItemQty.fulfilled, (s) => {
        s.status = "succeeded";
      })
      .addCase(updateCartItemQty.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload?.message || "Failed to update item";
      })

      .addCase(removeCartItem.pending, (s) => {
        s.status = "loading";
        s.error = null;
      })
      .addCase(removeCartItem.fulfilled, (s) => {
        s.status = "succeeded";
      })
      .addCase(removeCartItem.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload?.message || "Failed to remove item";
      })

      .addCase(clearCartByVendor.pending, (s) => {
        s.status = "loading";
        s.error = null;
      })
      .addCase(clearCartByVendor.fulfilled, (s) => {
        s.status = "succeeded";
      })
      .addCase(clearCartByVendor.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload?.message || "Failed to clear cart";
      });
  },
});

export const { setActiveVendor } = cartSlice.actions;
export const cartReducer = cartSlice.reducer;
