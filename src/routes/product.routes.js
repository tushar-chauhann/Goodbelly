import express from "express";

import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  verifyProduct,
  getAll,
  getProductsByVendorId,
  softDeleteProduct,
  getRecycleBinProducts,
  restoreProduct,
  getTopProducts,
  pinProduct,
  productByDiscount,
} from "../controllers/product.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { uploadProduct } from "../middlewares/multerProduct.middleware.js";

const router = express.Router();

router
  .route("/")
  .post(
    authenticate,
    authorizeRoles("VENDOR"),
    uploadProduct.array("images"),
    createProduct
  );

router.route("/").get(getAllProducts);
router.route("/admin").get(authenticate, authorizeRoles("ADMIN"), getAll);
router.route("/vendor/:vendorId").get(getProductsByVendorId);

// Get all items in recycle bin
router
  .route("/recycle-bin")
  .get(authenticate, authorizeRoles("ADMIN", "VENDOR"), getRecycleBinProducts);

// by discount
router.route("/discount").get(productByDiscount);

//verify product listing by admin
router
  .route("/verify/:id")
  .put(authenticate, authorizeRoles("ADMIN"), verifyProduct);

// Soft delete → move to recycle bin
router
  .route("/soft-delete/:id")
  .put(authenticate, authorizeRoles("ADMIN", "VENDOR"), softDeleteProduct);

// Restore product
router
  .route("/restore/:id")
  .put(authenticate, authorizeRoles("ADMIN", "VENDOR"), restoreProduct);

// Get top 3 pinned products for a vendor
router.route("/top/:vendorId").get(getTopProducts);

// Pin/unpin a product (vendor or admin only)
router
  .route("/pin/:id")
  .put(authenticate, authorizeRoles("VENDOR", "ADMIN"), pinProduct);

router.route("/:id").get(getProductById);
router
  .route("/:id")
  .put(
    authenticate,
    authorizeRoles("VENDOR", "ADMIN"),
    uploadProduct.array("images"),
    updateProduct
  );
router
  .route("/:id")
  .delete(authenticate, authorizeRoles("ADMIN", "VENDOR"), deleteProduct);



export default router;
