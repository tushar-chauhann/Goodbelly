import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  // Category management
  createAddOnCategory,
  getAddOnCategoryById,
  updateAddOnCategory,
  deleteAddOnCategory,

  // Add-on item management
  createAddOn,
  getAddOnsByCategory,
  updateAddOn,
  deleteAddOn,

  // Product-AddOn association
  linkAddOnToProduct,
  unlinkAddOnFromProduct,
  getProductAddOns,

  // Customer-facing
  getProductAddOnsForCustomer,
  validateAddOnSelections,
  getAddOnCategories,
} from "../controllers/addons.controller.js";

const router = express.Router();

// ============================================
// VENDOR/ADMIN ROUTES - Add-on Category Management
// ============================================

router
  .route("/categories")
  .post(authenticate, authorizeRoles("VENDOR", "ADMIN"), createAddOnCategory)
  .get(authenticate, authorizeRoles("VENDOR", "ADMIN"), getAddOnCategories);

router
  .route("/categories/:id")
  .get(authenticate, authorizeRoles("VENDOR", "ADMIN"), getAddOnCategoryById)
  .put(authenticate, authorizeRoles("VENDOR", "ADMIN"), updateAddOnCategory)
  .delete(authenticate, authorizeRoles("VENDOR", "ADMIN"), deleteAddOnCategory);

// ============================================
// VENDOR/ADMIN ROUTES - Add-on Items Management
// ============================================

router
  .route("/categories/:categoryId/items")
  .post(
    authenticate,
    authorizeRoles("VENDOR", "ADMIN"),
    upload.single("image"),
    createAddOn
  )
  .get(authenticate, authorizeRoles("VENDOR", "ADMIN"), getAddOnsByCategory);

router
  .route("/items/:id")
  .put(
    authenticate,
    authorizeRoles("VENDOR", "ADMIN"),
    upload.single("image"),
    updateAddOn
  )
  .delete(authenticate, authorizeRoles("VENDOR", "ADMIN"), deleteAddOn);

// ============================================
// VENDOR/ADMIN ROUTES - Product-AddOn Association
// ============================================

router
  .route("/products/:productId")
  .post(authenticate, authorizeRoles("VENDOR", "ADMIN"), linkAddOnToProduct)
  .get(authenticate, authorizeRoles("VENDOR", "ADMIN"), getProductAddOns);

router
  .route("/products/:productId/:categoryId")
  .delete(
    authenticate,
    authorizeRoles("VENDOR", "ADMIN"),
    unlinkAddOnFromProduct
  );

// ============================================
// CUSTOMER ROUTES - Public access
// ============================================

// Get add-ons for a specific product (customer view)
router.get("/product/:productId", getProductAddOnsForCustomer);

// Validate add-on selections
router.post("/validate", validateAddOnSelections);

export default router;
