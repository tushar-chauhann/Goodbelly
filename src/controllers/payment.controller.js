import crypto from "crypto";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import prisma from "../prismaClient.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// //  Setup Razorpay
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// Initiate Payment (COD or Razorpay)
const initiatePayment = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { orderIds, method, totalAmount } = req.body;

  //     ONLINE Payment for multiple orders (from cart)
  if (method === "ONLINE" && Array.isArray(orderIds)) {
    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100,
      currency: "INR",
      receipt: `multi-${Date.now()}`,
    });

    // Fetch all orders and create payment record for each
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
    });

    await Promise.all(
      orders.map((order) =>
        prisma.payment.create({
          data: {
            orderId: order.id,
            amount: order.totalPrice, // Save exact amount for this order
            razorpayOrderId: razorpayOrder.id,
            method: "ONLINE",
            status: "PENDING",
          },
        })
      )
    );

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          razorpayOrder,
          "Online payment initiated for all orders"
        )
      );
  }

  //     COD Payment for multiple orders (from cart)
  if (method === "CASH_ON_DELIVERY" && Array.isArray(orderIds)) {
    for (const orderId of orderIds) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });

      const payment = await prisma.payment.create({
        data: {
          orderId,
          amount: order.totalPrice,
          method: "CASH_ON_DELIVERY",
          status: "PENDING",
        },
      });

      await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: "PROCESSING" },
      });

      if (order.promoCodeId) {
        await prisma.usedPromo.create({
          data: {
            userId,
            promoCodeId: order.promoCodeId,
          },
        });
      }
    }

    return res
      .status(201)
      .json(new ApiResponse(201, {}, "COD initiated for all orders"));
  }

  //     Single Order (fromOrderNow)
  const singleOrderId = orderIds?.[0];
  const order = await prisma.order.findUnique({ where: { id: singleOrderId } });

  if (!order) throw new ApiError(404, "Order not found");

  if (method === "CASH_ON_DELIVERY") {
    const payment = await prisma.payment.create({
      data: {
        orderId: singleOrderId,
        amount: order.totalPrice,
        method: "CASH_ON_DELIVERY",
        status: "PENDING",
      },
    });

    await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: "PROCESSING" },
    });

    if (order.promoCodeId) {
      await prisma.usedPromo.create({
        data: {
          userId,
          promoCodeId: order.promoCodeId,
        },
      });
    }

    return res
      .status(201)
      .json(
        new ApiResponse(201, payment, "COD Payment initiated successfully")
      );
  }

  //     ONLINE (Single Order)
  const razorpayOrder = await razorpay.orders.create({
    amount: order.totalPrice * 100,
    currency: "INR",
    receipt: singleOrderId,
  });

  await prisma.payment.create({
    data: {
      orderId: singleOrderId,
      amount: order.totalPrice,
      razorpayOrderId: razorpayOrder.id,
      method: "ONLINE",
      status: "PENDING",
    },
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        razorpayOrder,
        "Online payment initiated successfully"
      )
    );
});

// Verify Razorpay Payment
const verifyPayment = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    fromOrderNow,
  } = req.body;

  const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
  hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
  const expectedSignature = hmac.digest("hex");

  if (expectedSignature !== razorpaySignature) {
    throw new ApiError(400, "Invalid Payment Signature");
  }

  //     Fetch all payments with this Razorpay Order ID
  const payments = await prisma.payment.findMany({
    where: { razorpayOrderId },
  });

  if (payments.length === 0) {
    throw new ApiError(404, "Payment record not found");
  }

  for (const payment of payments) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCESS", razorpayPaymentId },
    });

    await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: "PROCESSING" },
    });

    const order = await prisma.order.findUnique({
      where: { id: payment.orderId },
    });

    if (order?.promoCodeId) {
      await prisma.usedPromo.create({
        data: {
          userId,
          promoCodeId: order.promoCodeId,
        },
      });
    }
  }

  //     Clear Cart if NOT fromOrderNow and if multiple cart then delete all carts by unique userId and vendorId
  if (!fromOrderNow) {
    //find all carts for the user
    const carts = await prisma.cart.findMany({
      where: { userId },
    });

    if (carts && carts.length > 0) {
      for (const cart of carts) {
        await prisma.cart.delete({ where: { id: cart.id } }); //delete cascading will remove cart items
      }
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Payment verified successfully"));
});

//  Mark COD Payment as Successful
const markCODPaymentSuccess = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  // Find Payment for the order
  const payment = await prisma.payment.findFirst({
    where: { orderId, method: "CASH_ON_DELIVERY", status: "PENDING" },
  });

  if (!payment) {
    throw new ApiError(404, "COD Payment not found or already collected");
  }

  // Mark Payment as Successful
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "SUCCESS" },
  });

  // Update Order Status
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "DELIVERED" },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "COD Payment marked as successful"));
});

//  Get Payment Details
const getPaymentDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { order: true },
  });

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, payment, "Payment details retrieved"));
});

//  Refund Payment (Admin Only)
const refundPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const payment = await prisma.payment.findUnique({ where: { id } });

  if (!payment || payment.status !== "SUCCESS") {
    throw new ApiError(400, "Invalid payment for refund");
  }

  // Process Razorpay Refund
  const refund = await razorpay.payments.refund(payment.id, {
    amount: payment.amount * 100, // Convert to paise
  });

  // Update payment status
  await prisma.payment.update({ where: { id }, data: { status: "REFUNDED" } });

  return res
    .status(200)
    .json(new ApiResponse(200, refund, "Payment refunded successfully"));
});

// Check and fail expired payments
const checkExpiredPayments = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  // Find the order and payment
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { Payment: true },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Only process pending online payments
  if (
    !order.Payment ||
    order.Payment.length === 0 ||
    order.Payment[0].method !== "ONLINE" ||
    order.Payment[0].status !== "PENDING"
  ) {
    return res.status(200).json(new ApiResponse(200, {}, "No action needed"));
  }

  // Check Razorpay payment status
  try {
    const payment = await razorpay.orders.fetchPayments(
      order.Payment[0].razorpayOrderId
    );

    if (payment.items.length === 0) {
      // No payment was made - mark as failed
      await prisma.payment.update({
        where: { id: order.Payment[0].id },
        data: { status: "FAILED" },
      });

      await prisma.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
      });

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            {},
            "Payment marked as failed - no payment received"
          )
        );
    }

    // Payment exists but wasn't verified - this shouldn't normally happen
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Payment exists but needs verification"));
  } catch (error) {
    console.error("Error checking Razorpay payment:", error);

    // If we can't verify with Razorpay, still mark as failed
    await prisma.payment.update({
      where: { id: order.Payment[0].id },
      data: { status: "FAILED" },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          "Payment marked as failed - verification error"
        )
      );
  }
});

export {
  initiatePayment,
  verifyPayment,
  markCODPaymentSuccess,
  getPaymentDetails,
  refundPayment,
  checkExpiredPayments,
};
