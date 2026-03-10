import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createBrand,
  getAllBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
} from "../controllers/brand.controller.js";

const router = express.Router();

// Public routes
router.route("/").get(getAllBrands);
router.route("/:id").get(getBrandById);

// Admin routes
router
  .route("/")
  .post(
    authenticate,
    authorizeRoles("ADMIN"),
    upload.single("image"),
    createBrand
  );
router
  .route("/:id")
  .put(
    authenticate,
    authorizeRoles("ADMIN"),
    upload.single("image"),
    updateBrand
  )
  .delete(authenticate, authorizeRoles("ADMIN"), deleteBrand);

export default router;
