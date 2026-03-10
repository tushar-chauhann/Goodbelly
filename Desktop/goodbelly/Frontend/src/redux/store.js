// src/redux/store.js
import { configureStore } from "@reduxjs/toolkit";
import { productsReducer, cartReducer, authReducer } from "./slicer";
import promoReducer from "./promoSlice";

export const store = configureStore({
  reducer: {
    products: productsReducer,
    cart: cartReducer,
    auth: authReducer,
    promo: promoReducer,
  },
  middleware: (getDefault) => getDefault({ serializableCheck: false }),
});

export default store;
