import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
  updateCartQuantity,
} from "../controllers/cart.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { Router } from "express";

const router = Router();

router.route("/").get(authenticate, getCart);
router.route("/add").post(authenticate, addToCart);
router.route("/update/:cartItemId").put(authenticate, updateCartQuantity);
router.route("/remove/:cartItemId").delete(authenticate, removeFromCart);
router.route("/clear").delete(authenticate, clearCart);

export default router;
