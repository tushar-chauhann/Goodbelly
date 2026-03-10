import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createOccasion,
  deleteOccasion,
  getAllOccasions,
  getOccasionById,
  updateOccasion,
} from "../controllers/occasion.controller.js";

const router = express.Router();

router
  .route("/")
  .post(
    authenticate,
    authorizeRoles("ADMIN"),
    upload.single("icon"),
    createOccasion
  )
  .get(getAllOccasions);

router
  .route("/:id")
  .get(getOccasionById)
  .put(
    authenticate,
    authorizeRoles("ADMIN"),
    upload.single("icon"),
    updateOccasion
  )
  .delete(authenticate, authorizeRoles("ADMIN"), deleteOccasion);

export default router;
