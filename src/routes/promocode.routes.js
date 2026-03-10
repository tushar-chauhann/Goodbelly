import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import {
  applyPromoCode,
  createPromoCode,
  deletePromoCode,
  getAllPromoCodes,
  getUnusedPromoCodes,
  validatePromoCode,
  updatePromoCode,
  createUserPromoCode,
} from "../controllers/promocode.controller.js";

const router = Router();

router
  .route("/")
  .post(authenticate, authorizeRoles("ADMIN"), createPromoCode)
  .get(authenticate, authorizeRoles("ADMIN", "SUB_ADMIN"), getAllPromoCodes);

router
  .route("/user/:userId")
  .post(authenticate, authorizeRoles("ADMIN"), createUserPromoCode);

router.route("/validate/:code").get(authenticate, validatePromoCode);
router
  .route("/:code")
  .delete(authenticate, authorizeRoles("ADMIN"), deletePromoCode)
  .put(authenticate, authorizeRoles("ADMIN"), updatePromoCode);
router.route("/unused").get(authenticate, getUnusedPromoCodes);
router.route("/apply").post(authenticate, applyPromoCode);

export default router;
