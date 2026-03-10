import { Router } from "express";
import {
  deleteUser,
  getCurrentUser,
  getUserById,
  getUsers,
  loginUser,
  logoutUser,
  registerUser,
  updateUser,
  sendOTP,
  verifyOTP,
  resetPassword,
  sendSignupOTP,
  verifySignupOTP,
  updateFcmToken,
  deleteMyAccount,
} from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register").post(upload.single("profileImage"), registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(authenticate, logoutUser);
router.route("/delete-my-account").post(authenticate, deleteMyAccount);

//secured routes
router.route("/current-user").get(authenticate, getCurrentUser);
router.route("/all-users").get(authenticate, authorizeRoles("ADMIN"), getUsers);
router
  .route("/user/:userId")
  .get(authenticate, authorizeRoles("ADMIN"), getUserById);
router
  .route("/delete-user/:userId")
  .delete(authenticate, authorizeRoles("ADMIN"), deleteUser);

router
  .route("/update")
  .put(authenticate, upload.single("profileImage"), updateUser);

router.route("/update-fcm-token").put(authenticate, updateFcmToken);

router.route("/send-otp").post(sendOTP);
router.route("/verify-otp").post(verifyOTP);
router.route("/reset-password").post(resetPassword);

//signup otp route
router.route("/signup-otp").post(sendSignupOTP);
router.route("/verify-signup-otp").post(verifySignupOTP);
export default router;
