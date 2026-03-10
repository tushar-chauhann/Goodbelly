import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  registerConsultant,
  deleteConsultant,
  getConsultantById,
  listConsultants,
  verifyUsername,
  loginConsultant,
  updateConsultant,
  sendOTP,
  verifyOTP,
  resetPassword,
  addBankDetails,
  updateAvailability,
  updateConsultantDurations,
  pinConsultant,
  getTopConsultants,
  updateFcmToken,
} from "../controllers/consultant.controller.js";

const router = express.Router();

router
  .route("/")
  .post(
    upload.fields([
      { name: "profileImage", maxCount: 1 },
      { name: "certifications", maxCount: 6 }, //     multiple certs
    ]),
    registerConsultant
  )
  .get(listConsultants);

router.route("/bank-details").post(authenticate, addBankDetails);
router.route("/update-slots").put(authenticate, updateAvailability);

router
  .route("/admin")
  .get(authenticate, authorizeRoles("ADMIN"), listConsultants);

router.route("/top-consultants").get(getTopConsultants);

router.route("/login").post(loginConsultant);

router
  .route("/:id")
  .get(getConsultantById)
  .delete(authenticate, authorizeRoles("ADMIN"), deleteConsultant);

router
  .route("/admin/:id")
  .get(authenticate, authorizeRoles("ADMIN"), getConsultantById);

router
  .route("/update")
  .patch(authenticate, upload.single("profileImage"), updateConsultant);

router.route("/update-fcm-token").put(authenticate, updateFcmToken);

router.route("/update-durations").put(authenticate, updateConsultantDurations);

router
  .route("/verify/:username")
  .put(authenticate, authorizeRoles("ADMIN"), verifyUsername);

router.route("/send-otp").post(sendOTP);
router.route("/verify-otp").post(verifyOTP);
router.route("/reset-password").post(resetPassword);

router
  .route("/pin/:id")
  .put(authenticate, authorizeRoles("ADMIN"), pinConsultant);
export default router;
