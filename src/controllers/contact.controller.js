import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  sendContactAcknowledgementEmail,
  sendSubscriptionEmail,
} from "../utils/mail.service.js";
import { sendPushNotification } from "../services/pushNotification.service.js";

const createContact = asyncHandler(async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  // Case 1: Email only (Newsletter / Subscription)
  if (!name && !phone && !message) {
    let subs;
    try {
      subs = await prisma.subscribers.upsert({
        where: { email },
        update: {},
        create: { email },
      });
    } catch (dbError) {
      console.error("Failed to subscribe:", dbError);
      throw new ApiError(500, "Failed to subscribe");
    }

    // Send email in background (don't wait for it)
    sendSubscriptionEmail(email).catch(emailError => {
      console.error("Failed to send subscription email:", emailError);
    });

    // Send push notification if user is registered
    const user = await prisma.user.findFirst({ where: { email } });
    if (user) {
      try {
        await sendPushNotification(
          user.id,
          "Welcome to GoodBelly!",
          "You have successfully subscribed to our newsletter.",
          { type: "NEWSLETTER_SUBSCRIPTION" }
        );
      } catch (pushError) {
        console.error("Failed to send push notification:", pushError);
      }
    }

    return res
      .status(200)
      .json(new ApiResponse(200, subs, "Subscription email sent successfully"));
  }

  // Case 2: Full contact form
  if (!name || !phone || !message) {
    throw new ApiError(400, "All fields are required for contact form");
  }

  const contact = await prisma.contact.create({
    data: { name, email, phone, message },
  });

  // Optional: Send acknowledgment email to the user
  await sendContactAcknowledgementEmail({ name, email, message });

  res
    .status(201)
    .json(new ApiResponse(201, contact, "Contact form submitted successfully"));
});

const getAllContacts = asyncHandler(async (req, res) => {
  const contacts = await prisma.contact.findMany();

  res
    .status(200)
    .json(
      new ApiResponse(200, contacts, "All contacts retrieved successfully")
    );
});

const getContactById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const contact = await prisma.contact.findUnique({
    where: { id },
  });

  if (!contact) {
    throw new ApiError(404, "Contact not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, contact, "Contact retrieved successfully"));
});

const deleteContact = asyncHandler(async (req, res) => {
  let { id } = req.params;

  //check in subscribers first and delete
  const subscriber = await prisma.subscribers.findUnique({
    where: { id },
  });
  if (subscriber) {
    await prisma.subscribers.delete({
      where: { id },
    });
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Subscriber deleted successfully"));
  }

  const contact = await prisma.contact.findUnique({
    where: { id },
  });

  if (!contact) {
    throw new ApiError(404, "Contact not found");
  }

  await prisma.contact.delete({
    where: { id },
  });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Contact deleted successfully"));
});

const getAllSubscribers = asyncHandler(async (req, res) => {
  const subscribers = await prisma.subscribers.findMany();

  if (!subscribers) {
    throw new ApiError(404, "Subscribers not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribers,
        "All subscribers retrieved successfully"
      )
    );
});

export {
  createContact,
  getAllContacts,
  getContactById,
  deleteContact,
  getAllSubscribers,
};
