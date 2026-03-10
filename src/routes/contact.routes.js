import {
  createContact,
  deleteContact,
  getAllContacts,
  getContactById,
  getAllSubscribers,
} from "../controllers/contact.controller.js";
import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";

const router = express.Router();

router
  .route("/")
  .post(createContact)
  .get(authenticate, authorizeRoles("ADMIN"), getAllContacts);

router
  .route("/subscribers")
  .get(authenticate, authorizeRoles("ADMIN"), getAllSubscribers);

router
  .route("/:id")
  .get(authenticate, authorizeRoles("ADMIN"), getContactById)
  .delete(authenticate, authorizeRoles("ADMIN"), deleteContact);

export default router;
