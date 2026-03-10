import { Router } from "express";
import {
  initiatePayment,
  verifyPayment,
  markCODPaymentSuccess,
  refundPayment,
  getPaymentDetails,
  checkExpiredPayments,
} from "../controllers/payment.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";

const router = Router();

router.route("/initiate").post(authenticate, initiatePayment);
router.route("/verify").post(authenticate, verifyPayment);
router
  .route("/:orderId/cod-success")
  .post(
    authenticate,
    authorizeRoles("ADMIN", "SUB_ADMIN"),
    markCODPaymentSuccess
  );
router
  .route("/:orderId/refund")
  .post(authenticate, authorizeRoles("ADMIN"), refundPayment);

router.route("/").get(authenticate, getPaymentDetails);
router.route("/check-expired/:orderId").get(checkExpiredPayments);

export default router;
