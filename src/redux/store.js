// src/redux/store.js
import { configureStore } from "@reduxjs/toolkit";
import { productsReducer, cartReducer, authReducer, wishlistReducer, ingredientsReducer, occasionsReducer, categoriesReducer } from "./slicer";
import promoReducer from "./promoSlice";

export const store = configureStore({
  reducer: {
    products: productsReducer,
    cart: cartReducer,
    auth: authReducer,
    promo: promoReducer,
    wishlist: wishlistReducer,
    ingredients: ingredientsReducer,
    occasions: occasionsReducer,
    categories: categoriesReducer,
  },
  middleware: (getDefault) => getDefault({ serializableCheck: false }),
});

export default store;
