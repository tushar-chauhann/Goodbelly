import express from "express";


import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { createBanner, deleteBanner, getAllBanners, getBannerById, updateBanner } from "../controllers/banner.controller.js";


const router = express.Router();

router.route("/")
  .post(authenticate, authorizeRoles("ADMIN"), upload.single("image"), createBanner) 
  .get(getAllBanners);

router.route("/:id")
  .get(getBannerById)
  .put(authenticate, authorizeRoles("ADMIN"), upload.single("image"), updateBanner)
  .delete(authenticate, authorizeRoles("ADMIN"), deleteBanner);

export default router;
