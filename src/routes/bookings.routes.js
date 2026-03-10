import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import {
  createBooking,
  getBookingById,
  updatePaymentStatus,
  updateBookingStatus,
  getAllBookings,
  getBookingByUser,
  getBookingByConsultant,
} from "../controllers/booking.controller.js";

const router = express.Router();

// Route to create a new booking
router
  .route("/")
  .post(authenticate, createBooking)
  .get(authenticate, authorizeRoles("ADMIN"), getAllBookings);

router.route("/user").get(authenticate, getBookingByUser);

router.route("/consultant").get(authenticate, getBookingByConsultant);

// Route to get booking details by ID
router.route("/:id").get(authenticate, getBookingById);

// Route to update the payment status (for online payments)
router.route("/payment/:id").put(authenticate, updatePaymentStatus);

// Route to update the booking status (e.g., confirmed, cancelled)
router.route("/status/:id").patch(authenticate, updateBookingStatus);

export default router;
