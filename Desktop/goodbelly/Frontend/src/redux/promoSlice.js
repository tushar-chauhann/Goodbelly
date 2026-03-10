// src/redux/slices/promoSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  promos: [],
  appliedPromo: null,
  loading: false,
  error: null,
};

const promoSlice = createSlice({
  name: "promo",
  initialState,
  reducers: {
    setPromos: (state, action) => {
      state.promos = action.payload;
      state.loading = false;
    },
    setAppliedPromo: (state, action) => {
      state.appliedPromo = action.payload;
    },
    removeAppliedPromo: (state) => {
      state.appliedPromo = null;
    },
    setPromoLoading: (state, action) => {
      state.loading = action.payload;
    },
    setPromoError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setPromos,
  setAppliedPromo,
  removeAppliedPromo,
  setPromoLoading,
  setPromoError,
} = promoSlice.actions;

export default promoSlice.reducer;

// Selectors
export const selectPromos = (state) => state.promo.promos;
export const selectAppliedPromo = (state) => state.promo.appliedPromo;
export const selectPromoLoading = (state) => state.promo.loading;
export const selectPromoError = (state) => state.promo.error;
