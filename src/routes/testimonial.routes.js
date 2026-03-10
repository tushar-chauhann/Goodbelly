import { Router } from "express";
import {
  createTestimonial,
  deleteTestimonial,
  getAllTestimonials,
  getTestimonialById,
  updateTestimonial,
} from "../controllers/testimonial.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router
  .route("/")
  .get(getAllTestimonials)
  .post(
    authenticate,
    authorizeRoles("ADMIN"),
    upload.single("image"),
    createTestimonial
  );

router
  .route("/:id")
  .get(authenticate, getTestimonialById)
  .put(
    authenticate,
    authorizeRoles("ADMIN"),
    upload.single("image"),
    updateTestimonial
  )
  .delete(authenticate, authorizeRoles("ADMIN"), deleteTestimonial);

export default router;
