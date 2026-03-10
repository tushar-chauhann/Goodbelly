import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  cancelSubscription,
  createSubscription,
  deleteSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  getUserSubscriptions,
  getVendorSubscriptions,
  toggleSubscriptionStatus,
} from "../controllers/subscription.controller.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";

const router = Router();

router.route("/user").get(authenticate, getUserSubscriptions);
router.route("/vendor").get(authenticate, getVendorSubscriptions);

router.route("/cancel/:id").patch(authenticate, cancelSubscription);
router.route("/toggle/:id").put(authenticate, toggleSubscriptionStatus);

router
  .route("/")
  .get(authenticate, authorizeRoles("ADMIN"), getAllSubscriptions)
  .post(authenticate, createSubscription);

router
  .route("/:id")
  .get(authenticate, getSubscriptionById)
  .delete(authenticate, authorizeRoles("ADMIN"), deleteSubscription);

export default router;
