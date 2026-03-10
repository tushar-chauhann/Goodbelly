import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import {
  addArticles,
  deleteArticles,
  getArticles,
} from "../controllers/articles.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
const router = Router();

router
  .route("/")
  .post(
    authenticate,
    authorizeRoles("ADMIN"),
    upload.single("image"),
    addArticles
  )
  .get(getArticles);
router
  .route("/:id")
  .delete(authenticate, authorizeRoles("ADMIN"), deleteArticles);

export default router;
