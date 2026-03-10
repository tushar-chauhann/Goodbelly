// src/redux/slicer.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authService } from "../services/authService.js";

/* ----------------------------- PRODUCTS ----------------------------- */
export const fetchAllProducts = createAsyncThunk(
  "products/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
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
  initialState: { items: [], selected: null, status: "idle", error: null },
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

export const { clearAuthError } = authSlice.actions;
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
