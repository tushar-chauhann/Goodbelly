import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  createReview,
  deleteReview,
  getProductReviews,
  getUserReviews,
  verifyReview,
  getAllReviews
} from "../controllers/review.controller.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router
  .route("/")
  .post(authenticate, upload.single("reviewImage"), createReview)
  .get(authenticate, authorizeRoles("ADMIN"), getAllReviews);

router.route("/:productId").get(getProductReviews);

router.route("/user").get(authenticate, getUserReviews);

router
  .route("/:id")
  .delete(authenticate, authorizeRoles("USER", "ADMIN"), deleteReview)
  .patch(authenticate, authorizeRoles("ADMIN"), verifyReview);

export default router;
