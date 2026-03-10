import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import {
  createDiscount,
  updateDiscount,
  deleteDiscount,
  getAllDiscounts,
  getDiscountById,
  getAllDiscountByVendorId,
  applyDiscount,
} from "../controllers/discount.controller.js";

const router = Router();

// Route to get all discounts (Admin only)
router
  .route("/")
  .get(getAllDiscounts)
  .post(authenticate, authorizeRoles("VENDOR"), createDiscount);

//route for get all discount by vendor id
router.route("/vendor/:vendorId").get(getAllDiscountByVendorId);
//apply discount route.
router.route("/apply/:id").post(authenticate, applyDiscount);

router
  .route("/:id")
  .get(authenticate, authorizeRoles("ADMIN", "VENDOR"), getDiscountById)
  .put(authenticate, authorizeRoles("VENDOR"), updateDiscount)
  .delete(authenticate, authorizeRoles("ADMIN", "VENDOR"), deleteDiscount);

export default router;
