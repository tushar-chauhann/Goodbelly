import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createIngredient,
  deleteIngredient,
  getAllIngredients,
  getIngredientById,
  updateIngredient,
} from "../controllers/ingredients.controller.js";

const router = express.Router();

router
  .route("/")
  .post(
    authenticate,
    authorizeRoles("ADMIN"),
    upload.single("image"),
    createIngredient
  )
  .get(getAllIngredients);

router
  .route("/:id")
  .get(getIngredientById)
  .put(
    authenticate,
    authorizeRoles("ADMIN"),
    upload.single("image"),
    updateIngredient
  )
  .delete(authenticate, authorizeRoles("ADMIN"), deleteIngredient);

export default router;
