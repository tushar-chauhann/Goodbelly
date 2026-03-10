import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { PaymentStatus, BookingStatus } from "../utils/enum.js"; // Assuming you have enums for Payment and Booking status
import {
  sendBookingConfirmationEmail,
  sendBookingNotificationEmail,
} from "../utils/mail.service.js";

// Controller to create a new booking
const createBooking = asyncHandler(async (req, res) => {
  const {
    userId,
    consultantId,
    durationId,
    slotId,
    date,
    paymentMethod,
    transactionId,
  } = req.body;

  // Validation
  if (
    !userId ||
    !consultantId ||
    !durationId ||
    !slotId ||
    !date ||
    !paymentMethod ||
    !transactionId
  ) {
    throw new ApiError(400, "Missing required fields");
  }

  //validate userId, consultantId, durationId, slotId exist in the database
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const consultant = await prisma.consultant.findUnique({
    where: { id: consultantId },
  });

  //check consultant is active or not
  if (!consultant.isActive) {
    throw new ApiError(400, "Consultant is offline");
  }

  const duration = await prisma.consultationDuration.findUnique({
    where: { id: durationId, consultantId: consultantId },
  });
  const slot = await prisma.consultationAvailability.findUnique({
    where: { id: slotId, consultantId: consultantId },
  });

  if (!user || !consultant || !duration || !slot) {
    throw new ApiError(400, "Invalid user, consultant, duration, or slot");
  }

  // Create a new booking record
  const newBooking = await prisma.booking.create({
    data: {
      userId,
      consultantId,
      durationId,
      slotId,
      date: new Date(date),
      status:
        paymentMethod === "CASH_ON_DELIVERY"
          ? BookingStatus.CONFIRMED
          : BookingStatus.PENDING, // Default status
      paymentMethod,
      paymentStatus:
        paymentMethod === "CASH_ON_DELIVERY"
          ? PaymentStatus.PENDING
          : PaymentStatus.PENDING, // Default to pending
      bookingReference: transactionId, // Use the transactionId as the booking reference
    },
    include: {
      user: true,
      consultant: true,
      duration: true,
      slot: true,
    },
  });

  res
    .status(201)
    .json(new ApiResponse(201, newBooking, "Booking created successfully"));
});

// Controller to get a booking by its ID
const getBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const booking = await prisma.booking.findUnique({
    where: { bookingReference: id },
    include: {
      user: true,
      consultant: true,
      duration: true,
      slot: true,
    },
  });

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, booking, "Booking retrieved successfully"));
});

const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await prisma.booking.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
          profileImage: true,
        },
      },
      consultant: {
        select: {
          name: true,
          email: true,
          phone: true,
          profileImage: true,
          username: true,
        },
      },
      duration: true,
      slot: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res
    .status(200)
    .json(new ApiResponse(200, bookings, "Bookings retrieved successfully"));
});

const getBookingByUser = asyncHandler(async (req, res) => {
  const userId = req.user.id; // Assuming user ID is available in req.user after authentication
  const bookings = await prisma.booking.findMany({
    where: { userId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
          profileImage: true,
        },
      },
      consultant: {
        select: {
          name: true,
          email: true,
          phone: true,
          profileImage: true,
          username: true,
        },
      },
      duration: true,
      slot: true,
    },
    orderBy: { createdAt: "desc" },
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, bookings, "User bookings retrieved successfully")
    );
});

const getBookingByConsultant = asyncHandler(async (req, res) => {
  const consultantId = req.consultant?.id; // Assuming consultant ID is passed as a URL parameter
  if (!consultantId) {
    throw new ApiError(403, "Access denied. Not a consultant.");
  }

  const bookings = await prisma.booking.findMany({
    where: { consultantId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
          profileImage: true,
        },
      },
      consultant: {
        select: {
          name: true,
          email: true,
          phone: true,
          profileImage: true,
          username: true,
        },
      },
      duration: true,
      slot: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        bookings,
        "Consultant bookings retrieved successfully"
      )
    );
});

// Controller to update the payment status of a booking
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { paymentStatus, paymentReference } = req.body;

  // Validate paymentStatus
  if (
    ![
      PaymentStatus.PENDING,
      PaymentStatus.SUCCESS,
      PaymentStatus.FAILED,
    ].includes(paymentStatus)
  ) {
    throw new ApiError(400, "Invalid payment status");
  }

  // Update payment status and payment reference (for online payments)
  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: {
      paymentStatus,
      paymentReference:
        paymentStatus === PaymentStatus.SUCCESS ? paymentReference : null,
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedBooking,
        "Payment status updated successfully"
      )
    );
});

// Controller to update the booking status (e.g., confirmed, cancelled)
const updateBookingStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  //check for already completed or cancelled bookings
  const existingBooking = await prisma.booking.findUnique({
    where: { id },
  });

  if (
    existingBooking.status === BookingStatus.COMPLETED ||
    existingBooking.status === BookingStatus.CANCELLED
  ) {
    throw new ApiError(400, "Booking is already completed or cancelled");
  }

  // Validate booking status
  if (
    ![
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.CANCELLED,
      BookingStatus.REJECTED,
      BookingStatus.COMPLETED,
    ].includes(status)
  ) {
    throw new ApiError(400, "Invalid booking status");
  }

  // Update booking status
  const updatedBooking = await prisma.booking.update({
    where: { id },
    data: {
      status,
    },
  });

  if (status === BookingStatus.CANCELLED) {
    //update payment status to refunded if booking is cancelled and payment was successful
    if (existingBooking.paymentStatus === PaymentStatus.SUCCESS) {
      await prisma.booking.update({
        where: { id },
        data: {
          paymentStatus: PaymentStatus.REFUNDED,
        },
      });
    } else {
      await prisma.booking.update({
        where: { id },
        data: {
          paymentStatus: PaymentStatus.FAILED,
        },
      });
    }
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedBooking,
        "Booking status updated successfully"
      )
    );
});

export {
  createBooking,
  getBookingById,
  updatePaymentStatus,
  updateBookingStatus,
  getAllBookings,
  getBookingByUser,
  getBookingByConsultant,
};
