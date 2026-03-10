import { Router } from "express";
import {
  approveVendor,
  deleteVendor,
  getCustomersByVendor,
  getProductsByVendor,
  getVendorById,
  registerVendor,
  requestVendorOTP,
  updateVendor,
  // NEW
  uploadVendorDocuments,
  addBankDetails,
  getAllVendorKitchens,
  getKitchenById,
  toggleVendorStatus,
  requestEmailChangeOTP,
  verifyEmailChange,
  updatePayoutDetails,
  // 📞 Phone management
  addVendorPhone,
  getVendorPhones,
  updateVendorPhone,
  deleteVendorPhone,
} from "../controllers/vendor.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";

const router = Router();

router.route("/request-otp").post(requestVendorOTP);
router.route("/register").post(registerVendor);

// In vendor routes
router
  .route("/request-email-change-otp")
  .post(authenticate, authorizeRoles("VENDOR"), requestEmailChangeOTP);

router
  .route("/verify-email-change")
  .post(authenticate, authorizeRoles("VENDOR"), verifyEmailChange);

// STEP 3 — Upload documents (VENDOR)
router.route("/documents").post(
  authenticate,
  authorizeRoles("VENDOR"),
  upload.fields([
    { name: "fssaiDoc", maxCount: 1 },
    { name: "gstDoc", maxCount: 1 },
    { name: "panDoc", maxCount: 1 },
    { name: "aadhaarDoc", maxCount: 2 }, // allow front/back; controller uses first
  ]),
  uploadVendorDocuments
);

// STEP 4 — Add bank details (VENDOR)
router
  .route("/bank-details")
  .post(
    authenticate,
    authorizeRoles("VENDOR"),
    upload.single("cancelledCheque"),
    addBankDetails
  );

// Approve vendor (ADMIN)
router
  .route("/admin/approve/:userId")
  .put(authenticate, authorizeRoles("ADMIN"), approveVendor);

router
  .route("/admin/payment/:vendorId")
  .patch(authenticate, authorizeRoles("ADMIN"), updatePayoutDetails);
// Vendor resources
router
  .route("/products")
  .get(authenticate, authorizeRoles("VENDOR"), getProductsByVendor);
router
  .route("/customers")
  .get(authenticate, authorizeRoles("VENDOR"), getCustomersByVendor);

router.route("/kitchens").get(getAllVendorKitchens);
router.route("/kitchen/:vendorId").get(getKitchenById);
router
  .route("/toggle-kitchen")
  .patch(authenticate, authorizeRoles("VENDOR"), toggleVendorStatus);

// 📞 Vendor phone number management
router
  .route("/phones")
  .get(authenticate, authorizeRoles("VENDOR", "ADMIN"), getVendorPhones)
  .post(authenticate, authorizeRoles("VENDOR", "ADMIN"), addVendorPhone);

router
  .route("/phones/:id")
  .put(authenticate, authorizeRoles("VENDOR", "ADMIN"), updateVendorPhone)
  .delete(authenticate, authorizeRoles("VENDOR", "ADMIN"), deleteVendorPhone);

// Vendor by ID
router
  .route("/:id")
  .get(authenticate, authorizeRoles("VENDOR", "ADMIN"), getVendorById)
  .put(
    authenticate,
    authorizeRoles("VENDOR"),
    upload.fields([
      { name: "profileImage", maxCount: 1 },
      { name: "coverImage", maxCount: 1 },
    ]),
    updateVendor
  )
  .delete(authenticate, authorizeRoles("ADMIN"), deleteVendor);

export default router;
