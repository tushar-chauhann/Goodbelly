import prisma from "../prismaClient.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import crypto from "crypto";
import {
  sendBookingConfirmationEmail,
  sendBookingNotificationEmail,
  sendOrderConfirmationEmail,
  sendVendorNewOrderEmail,
  sendSubscriptionCreatedEmail,
  sendVendorNewSubscriptionEmail,
} from "../utils/mail.service.js";
import {
  createDeliveryTask,
  getServiceability,
} from "../integrations/uengage.service.js";
import { sendPushNotification } from "../services/pushNotification.service.js";
/* ---------------------------- 🔹 HASH GENERATOR ---------------------------- */
const hashGenerator = asyncHandler(async (req, res) => {
  const { name, email, phone, amount, orderInfo, transactionId } = req.body;

  const data = {
    key: process.env.PAYMENT_KEY,
    salt: process.env.PAYMENT_SALT,
    txnid: transactionId,
    amount,
    productinfo: orderInfo,
    firstname: name,
    email,
    udf1: phone,
    udf2: "",
    udf3: "",
    udf4: "",
    udf5: "",
  };

  const hashString = `${data.key}|${data.txnid}|${data.amount}|${data.productinfo}|${data.firstname}|${data.email}|${data.udf1}|${data.udf2}|${data.udf3}|${data.udf4}|${data.udf5}||||||${data.salt}`;
  const hash = crypto.createHash("sha512").update(hashString).digest("hex");

  return res
    .status(200)
    .json(new ApiResponse(200, { hash, transactionId }, "Hash generated"));
});

/* ------------------------- 🔹 SUCCESS FORWARD FLOW ------------------------- */
const successForward = asyncHandler(async (req, res) => {
  const txnid = req.body.txnid;
  const clientUrl = new URL("/payment-success", process.env.CORS_ORIGIN);
  clientUrl.searchParams.set("txnid", txnid);
  return res.redirect(303, clientUrl.toString());
});

const failureForward = asyncHandler(async (req, res) => {
  const txnid = req.body.txnid;
  const clientUrl = new URL("/payment-failure", process.env.CORS_ORIGIN);
  clientUrl.searchParams.set("txnid", txnid);
  return res.redirect(303, clientUrl.toString());
});

/* ---------------------------- 🔹 PAYU WEBHOOK HANDLER ---------------------------- */

const payUWebhookHandler = asyncHandler(async (req, res) => {
  try {
    const data = req.body;
    console.log("PayU Webhook Received:", data);

    const txnid = data.txnid;
    const email = data?.email;
    const phone = data?.phone;
    const status = data.status?.toUpperCase();
    const bankRef = data.bank_ref_num || null;

    if (!txnid) return res.status(400).send("Missing txnid");

    // Immediately ACK the webhook (so PayU doesn’t retry)
    res.status(200).send("OK");

    // Normalize transaction type
    let type = "";
    if (txnid.startsWith("Order")) type = "ORDER";
    else if (txnid.startsWith("Booking")) type = "BOOKING";
    else if (txnid.startsWith("SUB")) type = "SUBSCRIPTION";

    console.log(`Processing ${type} Webhook: ${txnid} - ${status}`);

    /* ==============================
       HANDLE ORDER PAYMENTS
    ============================== */
    if (type === "ORDER") {
      const order = await prisma.order.findUnique({
        where: { referenceId: txnid },
        include: {
          items: {
            include: {
              product: true,
              Weight: true, // Added for email template (item.Weight.weight)
            },
          },
          user: true,
          vendor: { include: { user: true } },
          address: true,
        },
      });

      if (!order) {
        console.warn(`No order found for TXNID: ${txnid}`);
        return;
      }

      const vendorEmail = order.vendor?.user?.email;
      const vendorName = order.vendor?.user?.name;
      const userEmail = order.user?.email;

      if (status === "SUCCESS") {
        await prisma.order.update({
          where: { referenceId: txnid },
          data: {
            status: "PROCESSING",
            paymentStatus: "SUCCESS",
            paymentReference: bankRef,
          },
        });

        // 🧩 CREATE UENGAGE DELIVERY TASK (ONLY FOR ONLINE PAYMENTS)
        try {
          // Pickup = vendor location
          const pickup = {
            latitude: order.vendor.latitude,
            longitude: order.vendor.longitude,
          };

          // Drop = user's delivery address
          const drop = {
            latitude: order.address.latitude,
            longitude: order.address.longitude,
          };
          const storeId = order.vendor?.kitchenId;

          if (!storeId) {
            console.error("No store ID found for order:", order.referenceId);
            return;
          }
          // 1️⃣ Check serviceability
          const service = await getServiceability(pickup, drop, storeId);
          console.log("UEngage Serviceability and payouts:", service);
          if (
            !service?.serviceability?.riderServiceAble ||
            !service?.serviceability?.locationServiceAble
          ) {
            console.error("UEngage: Not Serviceable for order:", order.id);
            return;
          }

          // 2️⃣ Create delivery task
          const task = await createDeliveryTask(order, storeId);
          console.log("UEngage Task Created (Webhook):", task);

          // 3️⃣ Save task details in DB
          await prisma.order.update({
            where: { id: order.id },
            data: {
              deliveryTaskId: task?.taskId || null,
              deliveryPartnerStatus: task?.status_code || task?.Status_code,
              deliveryInitiated: true,
            },
          });
        } catch (err) {
          console.error("Error creating UEngage task inside webhook:", err);
        }

        // Send emails asynchronously (don’t block)
        Promise.all([
          sendOrderConfirmationEmail(userEmail, order),
          sendVendorNewOrderEmail(vendorEmail, vendorName, order),
        ])
          .then(() => console.log(`Order emails sent for TXNID: ${txnid}`))
          .catch((err) => console.error("Order email error:", err));

        // FCM Notification
        sendPushNotification(
          order.userId,
          "Order Placed",
          `Your order #${order.referenceId} has been placed successfully.`,
          { type: "ORDER_PLACED", orderId: order.id }
        );
        sendPushNotification(
          order.vendor.userId,
          "New Order Received",
          `You have received a new order #${order.referenceId}.`,
          { type: "VENDOR_NEW_ORDER", orderId: order.id },
          "USER" // Vendors are users in the system
        );
      } else if (status === "FAILURE") {
        await prisma.order.updateMany({
          where: { referenceId: txnid },
          data: {
            status: "CANCELLED",
            paymentStatus: "FAILED",
            paymentReference: bankRef,
          },
        });

        // FCM Notification for payment failure
        sendPushNotification(
          order.userId,
          "Payment Canceled",
          `Payment for order #${order.referenceId} was canceled.`,
          { type: "PAYMENT_CANCELED", orderId: order.id }
        );
      }
    } else if (type === "BOOKING") {
      /* ==============================
       🧩 HANDLE BOOKING PAYMENTS
    ============================== */
      const booking = await prisma.booking.findUnique({
        where: { bookingReference: txnid },
        include: { duration: true, slot: true, user: true, consultant: true },
      });

      if (!booking) {
        console.warn(`No booking found for TXNID: ${txnid}`);
        return;
      }

      const userEmail = booking.user.email;
      const consultantEmail = booking.consultant.email;
      const consultantName = booking.consultant.name;

      if (status === "SUCCESS") {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: "CONFIRMED",
            paymentStatus: "SUCCESS",
            paymentReference: txnid,
          },
        });

        Promise.all([
          sendBookingConfirmationEmail(
            userEmail,
            {
              name: booking.user.name,
              date: booking.date,
              duration: booking.duration.label,
              time: booking.slot.timeSlot,
              bookingReference: booking.bookingReference,
            },
            consultantName,
            consultantEmail
          ),
          sendBookingNotificationEmail(
            consultantEmail,
            {
              name: booking.user.name,
              date: booking.date,
              duration: booking.duration.label,
              time: booking.slot.timeSlot,
              bookingReference: booking.bookingReference,
            },
            consultantName
          ),
        ])
          .then(() => console.log(`Booking emails sent for TXNID: ${txnid}`))
          .catch((err) => console.error("Booking email error:", err));

        // FCM Notification
        sendPushNotification(
          booking.userId,
          "Booking Confirmed",
          `Your booking with ${consultantName} is confirmed for ${new Date(booking.date).toDateString()} at ${booking.slot.timeSlot}.`,
          { type: "BOOKING_CONFIRMED", bookingId: booking.id }
        );
        sendPushNotification(
          booking.consultantId,
          "New Booking Request",
          `You have a new booking with ${booking.user.name}.`,
          { type: "CONSULTANT_NEW_BOOKING", bookingId: booking.id },
          "CONSULTANT"
        );
      } else if (status === "FAILURE") {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: "REJECTED",
            paymentStatus: "FAILED",
          },
        });
      }
    } else if (type === "SUBSCRIPTION") {
      /* ==============================
       🧩 HANDLE SUBSCRIPTION PAYMENTS
    ============================== */
      const billing = await prisma.billing.findUnique({
        where: { paymentReference: txnid },
        include: {
          subscription: {
            include: {
              user: true,
              vendor: { include: { user: true } },
              items: { include: { item: true } }  // Include items to get product names
            },
          },
        },
      });

      if (!billing) {
        console.warn(`No billing found for TXNID: ${txnid}`);
        return;
      }

      const subscription = billing.subscription;
      const userEmail = subscription.user.email;
      const userName = subscription.user.name;
      const vendorEmail = subscription.vendor.user.email;
      const vendorName = subscription.vendor.user.name;

      if (status === "SUCCESS") {
        await prisma.billing.update({
          where: { id: billing.id },
          data: { paymentStatus: "SUCCESS" },
        });

        Promise.all([
          sendSubscriptionCreatedEmail(userEmail, userName, txnid),
          sendVendorNewSubscriptionEmail(vendorEmail, vendorName, subscription),
        ])
          .then(() =>
            console.log(`Subscription emails sent for TXNID: ${txnid}`)
          )
          .catch((err) => console.error("Subscription email error:", err));

        // FCM Notification - Payment verified, subscription is now created
        // Get first item name for notification
        const firstItemName = subscription.items?.[0]?.item?.name;
        const itemCount = subscription.items?.length || 0;
        const productText = firstItemName
          ? (itemCount > 1 ? `${firstItemName} and ${itemCount - 1} more item${itemCount > 2 ? 's' : ''}` : firstItemName)
          : "items";

        sendPushNotification(
          subscription.userId,
          "Subscription Created",
          `Your subscription for ${productText} has been created successfully!`,
          { type: "SUBSCRIPTION_CREATED", subscriptionId: subscription.id }
        );
        sendPushNotification(
          subscription.vendor.userId,
          "New Subscriber",
          `You have a new subscriber for ${productText}: ${userName}.`,
          { type: "VENDOR_NEW_SUBSCRIPTION", subscriptionId: subscription.id },
          "USER"
        );
      } else if (status === "FAILURE") {
        await Promise.all([
          prisma.billing.update({
            where: { id: billing.id },
            data: { paymentStatus: "FAILED" },
          }),
          prisma.subscription.update({
            where: { id: billing.subscriptionId },
            data: { status: "CANCELLED" },
          }),
        ]);
      }
    } else {
      //update the event payment status
      const event = await prisma.eventData.updateMany({
        where: { phone: phone },
        data: { paymentStatus: status },
      });
      console.log(
        `Event payment status updated for ${email}: ${status}`,
        event
      );
    }

    console.log(`Webhook processing complete for ${txnid}`);
  } catch (err) {
    console.error("PayU Webhook Handler Error:", err);
    res.status(500).send("Webhook processing error");
  }
});

const addEventData = asyncHandler(async (req, res) => {
  const { email, name, phone, amount, transactionId, eventType } = req.body;

  (!name || !phone) &&
    res.status(400).json(new ApiResponse(400, null, "Missing required fields"));

  const eventData = await prisma.eventData.create({
    data: {
      email: email || "",
      name,
      amount: amount || 400,
      phone,
      txnid: transactionId,
      eventType: eventType || "GENERAL",
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, eventData, "Event data added"));
});

const getEventData = asyncHandler(async (req, res) => {
  //descending order of createdAt
  const eventData = await prisma.eventData.findMany({
    orderBy: { createdAt: "desc" },
  });
  return res
    .status(200)
    .json(new ApiResponse(200, eventData, "Event data retrieved successfully"));
});

const deleteEventData = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const eventData = await prisma.eventData.delete({ where: { id } });
  return res
    .status(200)
    .json(new ApiResponse(200, eventData, "Event data deleted successfully"));
});

export {
  hashGenerator,
  successForward,
  failureForward,
  payUWebhookHandler,
  addEventData,
  getEventData,
  deleteEventData,
};
