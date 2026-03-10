import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  addProductToCommunity,
  createCommunity,
  deleteCommunity,
  getAllCommunities,
  getCommunityById,
  updateCommunity,
  removeProductToCommunity
} from "../controllers/community.controller.js";

const router = express.Router();

router
  .route("/")
  .post(
    authenticate,
    authorizeRoles("ADMIN"),
    upload.single("image"),
    createCommunity
  )
  .get(getAllCommunities);

router
  .route("/add-product")
  .post(authenticate, authorizeRoles("ADMIN"), addProductToCommunity);
router
  .route("/remove-product")
  .post(authenticate, authorizeRoles("ADMIN"), removeProductToCommunity);

router
  .route("/:id")
  .get(getCommunityById)
  .put(
    authenticate,
    authorizeRoles("ADMIN"),
    upload.single("image"),
    updateCommunity
  )
  .delete(authenticate, authorizeRoles("ADMIN"), deleteCommunity);

export default router;
