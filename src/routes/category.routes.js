import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
} from "../controllers/category.controller.js";

const router = express.Router();

router
  .route("/")
  .post(
    authenticate,
    authorizeRoles("ADMIN"),
    upload.single("image"),
    createCategory
  )
  .get(getAllCategories);

router
  .route("/:id")
  .get(getCategoryById)
  .put(
    authenticate,
    authorizeRoles("ADMIN"),
    upload.single("image"),
    updateCategory
  )
  .delete(authenticate, authorizeRoles("ADMIN"), deleteCategory);

export default router;
