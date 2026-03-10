import {
  cancelDeliveryTask,
  createDeliveryTask,
  getServiceability,
  getTaskStatus,
} from "../integrations/uengage.service.js";
import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  sendOrderConfirmationEmail,
  sendVendorNewOrderEmail,
} from "../utils/mail.service.js";
import {
  calculateCartTotal,
  formatAddOnsForStorage,
} from "../utils/addons.helper.js";
import { sendPushNotification } from "../services/pushNotification.service.js";

const calculateCharges = (totalPrice, distance) => {
  // 5% GST on item total
  const gstCharges = totalPrice * 0.05;

  // Delivery partner fee: ₹60 for 0–3 km, +₹12 per km after that
  const baseDelivery = 30;
  const extraDistance = Math.max(0, distance - 3);
  const deliveryBase = baseDelivery + extraDistance * 12;

  // Add 18% GST on delivery fee  now free
  const deliveryGST = deliveryBase * 0;
  const deliveryCharges = deliveryBase + deliveryGST;

  // Platform fee (example ₹20) + 18% GST
  const platformBase = 0;
  const platformGST = platformBase * 0.18;
  const platformCharges = platformBase + platformGST;

  // Return all calculated charges
  return {
    gstCharges, // 5% on items
    deliveryCharges, // includes 18% GST
    platformCharges, // includes 18% GST
  };
};

// Validate kitchen open/close timing
const isKitchenCurrentlyOpen = (vendor) => {
  if (!vendor) return false;

  // Manual switch
  if (!vendor.isOpen) return false;

  // Always evaluate time in IST
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (vendor.openTime && vendor.closeTime) {
    const [openH, openM] = vendor.openTime.split(":").map(Number);
    const [closeH, closeM] = vendor.closeTime.split(":").map(Number);

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    // If close time is next day (cross-midnight)
    if (closeMinutes < openMinutes) {
      return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
    }

    // Normal case
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  }

  return vendor.isOpen;
};

const checkServiceability = asyncHandler(async (req, res) => {
  const { pickup, drop, storeId } = req.body;
  const result = await getServiceability(pickup, drop, storeId);
  res
    .status(200)
    .json(new ApiResponse(200, result, "Serviceability checked successfully"));
});

const trackTaskByTaskId = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { storeId } = req.body;

  if (!taskId || !storeId) {
    throw new ApiError(400, "Missing required taskId or storeId");
  }

  const result = await getTaskStatus(taskId, storeId);

  const statusCode = result?.status_code || result?.Status_code; // e.g. ACCEPTED, ARRIVED, DELIVERED, NA
  const riderData = result.data;

  // Do NOT update DB if:
  // 1) status is DELIVERED
  // 2) No task found (status_code = "NA")
  if (statusCode === "DELIVERED" || statusCode === "NA") {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          result,
          "Task tracked successfully (no DB update required)"
        )
      );
  }

  // Extract vendor order ID
  const referenceId = riderData?.vendor_order_id;

  // Build update data only if fields exist (avoid overwriting with empty strings)
  const updateData = {
    deliveryPartnerStatus: statusCode,
  };

  if (riderData?.rider_name) updateData.riderName = riderData.rider_name;
  if (riderData?.rider_contact) updateData.riderPhone = riderData.rider_contact;
  if (riderData?.latitude) updateData.riderLatitude = riderData.latitude;
  if (riderData?.longitude) updateData.riderLongitude = riderData.longitude;
  if (riderData?.tracking_url) updateData.trackingUrl = riderData.tracking_url;

  // Prevent empty updates
  if (Object.keys(updateData).length > 0) {
    await prisma.order.updateMany({
      where: {
        OR: [
          taskId ? { deliveryTaskId: taskId } : undefined,
          referenceId ? { referenceId } : undefined,
        ].filter(Boolean),
      },
      data: updateData,
    });
  }

  res
    .status(200)
    .json(new ApiResponse(200, result, "Task tracked successfully"));
});

// Create Order (Apply Promo & Use Reward Points)
const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    referenceId,
    addressId,
    promoCodeId,
    useRewardPoints,
    paymentMethod,
    Addition,
    fromOrderNow,
    productId,
    weightId,
    quantity,
    instructions,
    distanceKm = 0, // you can send distance between user and vendor (in km)
  } = req.body;

  if (!referenceId || !addressId || !paymentMethod) {
    throw new ApiError(400, "Missing required fields");
  }

  // Fetch and validate address
  const address = await prisma.address.findUnique({
    where: { id: addressId, userId },
  });

  if (!address) throw new ApiError(400, "Invalid address");

  const createdOrders = [];

  // MULTI-VENDOR CART FLOW
  if (!fromOrderNow) {
    const carts = await prisma.cart.findMany({
      where: { userId },
      include: {
        vendor: true,
        items: {
          include: {
            product: { include: { weights: true } },
          },
        },
      },
    });

    if (!carts || carts.length === 0) {
      throw new ApiError(400, "Cart is empty");
    }

    for (const cart of carts) {
      if (!cart.items.length) continue;

      // Kitchen open check
      if (!isKitchenCurrentlyOpen(cart?.vendor)) {
        throw new ApiError(
          400,
          "This kitchen is currently closed. Please check back during their business hours."
        );
      }

      // Calculate item total WITH add-ons
      const { total: totalPrice } = calculateCartTotal(cart.items);

      // Promo only on 1st vendor
      let discount = 0;
      let discountType = null;
      if (promoCodeId && createdOrders.length === 0) {
        const promo = await prisma.promoCode.findUnique({
          where: { id: promoCodeId },
        });
        if (!promo || new Date(promo.expiry) <= new Date())
          throw new ApiError(400, "Invalid or expired promo code");

        const used = await prisma.usedPromo.findFirst({
          where: { userId, promoCodeId },
        });
        if (used) throw new ApiError(400, "Promo code already used");
        discountType = promo.discountType;
        discount = Math.min(promo.discount, totalPrice);
      }

      // Reward points only once
      let rewardPointsUsed = 0;
      if (useRewardPoints && createdOrders.length === 0) {
        const reward = await prisma.reward.findUnique({ where: { userId } });
        if (reward && reward.points > 0) {
          rewardPointsUsed = Math.min(reward.points, totalPrice);
          await prisma.reward.update({
            where: { userId },
            data: { points: reward.points - rewardPointsUsed },
          });
        }
      }

      // Charges
      const { gstCharges, deliveryCharges, platformCharges } = calculateCharges(
        totalPrice,
        distanceKm
      );

      const subtotal =
        totalPrice + gstCharges + deliveryCharges + platformCharges;
      const discountValue =
        discountType === "PERCENTAGE" ? (subtotal * discount) / 100 : discount;

      const grandTotal = subtotal - discountValue;

      // Create Order
      const order = await prisma.order.create({
        data: {
          userId,
          vendorId: cart.vendorId,
          addressId,
          totalPrice,
          gstCharges,
          deliveryCharges,
          platformCharges,
          discount: discountValue,
          grandTotal,
          status:
            paymentMethod === "CASH_ON_DELIVERY" ? "PROCESSING" : "PENDING",
          paymentStatus: "PENDING",
          paymentMethod,
          referenceId,
          paymentReference:
            paymentMethod === "CASH_ON_DELIVERY" ? null : referenceId,
          rewardPoints: rewardPointsUsed,
          promoCodeId: createdOrders.length === 0 ? promoCodeId : null,
          items: {
            create: cart.items.map((i) => ({
              productId: i.productId,
              weightId: i.weightId,
              quantity: i.quantity,
              price: i.price,
              Addition: i.Addition || null, // Use each item's own Addition
              isAdded: !!i.Addition,
            })),
          },
          instructions: instructions || null,
        },
        include: {
          items: { include: { product: true } },
          user: true,
          vendor: { include: { user: true } },
          address: true,
        },
      });

      if (order.promoCodeId) {
        await prisma.usedPromo.create({ data: { userId, promoCodeId } });
      }

      // Create delivery task (only for COD)
      if (paymentMethod === "CASH_ON_DELIVERY") {
        try {
          const pickup = {
            latitude: order.vendor.latitude,
            longitude: order.vendor.longitude,
          };

          const drop = {
            latitude: order.address.latitude,
            longitude: order.address.longitude,
          };

          const storeId = order.vendor?.kitchenId;

          if (!storeId) throw new ApiError(400, "Restaurant ID not found.");
          // Check serviceability
          const service = await getServiceability(pickup, drop, storeId);
          console.log("UEngage Serviceability and payouts:", service);
          if (
            !service?.serviceability?.riderServiceAble ||
            !service?.serviceability?.locationServiceAble
          ) {
            throw new ApiError(
              400,
              "Delivery not serviceable at this location. Please try another location."
            );
          }

          // Create uEngage delivery task
          const task = await createDeliveryTask(order, storeId);
          console.log("Delivery task created from CART:", task);

          // Save taskId + status in DB
          await prisma.order.update({
            where: { id: order.id },
            data: {
              deliveryTaskId: task?.taskId,
              deliveryPartnerStatus: task?.status_code || task?.Status_code,
              deliveryInitiated: true,
            },
          });
        } catch (err) {
          console.error("Delivery task creation failed:", err);
        }
      }

      createdOrders.push(order);
      // Delete cart now
      await prisma.cart.delete({ where: { id: cart.id } });
    }

    //if paymentMethod === "CASH_ON_DELIVERY" send emails
    // Send emails asynchronously (don’t block)
    // if (paymentMethod === "CASH_ON_DELIVERY") {
    //   const vendorEmail = createdOrders[0].vendor?.user?.email;
    //   const vendorName = createdOrders[0].vendor?.user?.name;
    //   const userEmail = createdOrders[0].user.email;
    //   Promise.all([
    //     sendOrderConfirmationEmail(userEmail, createdOrders[0]),
    //     sendVendorNewOrderEmail(vendorEmail, vendorName, createdOrders[0]),
    //   ])
    //     .then(() => console.log(`Order emails sent for TXNID: ${txnid}`))
    //     .catch((err) => console.error("Order email error:", err));
    // }

    // FCM Notification (ONLY for COD orders, NOT for PENDING online payment orders)
    // Online payment orders will get notification from PayU webhook on payment SUCCESS
    // FCM Notification
    if (createdOrders.length > 0) {
      const order = createdOrders[0];
      const firstProductName = order.items?.[0]?.product?.name || "items";
      const itemCount = order.items?.length || 0;
      const productText = itemCount > 1
        ? `${firstProductName} and ${itemCount - 1} more item${itemCount > 2 ? 's' : ''}`
        : firstProductName;

      if (paymentMethod === "CASH_ON_DELIVERY") {
        // User Notification
        sendPushNotification(
          order.userId,
          "Order Placed",
          `Your order of ${productText} has been placed successfully.`,
          { type: "ORDER_PLACED", orderId: order.id }
        );
        // Vendor Notification
        sendPushNotification(
          order.vendor.userId,
          "New Order Received",
          `You have received a new order for ${productText}.`,
          { type: "VENDOR_NEW_ORDER", orderId: order.id },
          "USER"
        );
      }
      // NOTE: For Online Payment, we do NOT send "Order Pending" here anymore.
      // It is triggered by the frontend when the user returns from PayU screen (if payment not completed).
    }

    return res
      .status(201)
      .json(new ApiResponse(201, createdOrders, "Orders placed successfully"));
  }

  // SINGLE PRODUCT (Order Now)
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { weights: true, vendor: true },
  });
  if (!product) throw new ApiError(404, "Product not found");

  // Kitchen open check
  if (!isKitchenCurrentlyOpen(product?.vendor)) {
    throw new ApiError(
      400,
      "This kitchen is currently closed. Please check back during their business hours."
    );
  }

  const weight = product.weights.find((w) => w.id === weightId);
  if (!weight) throw new ApiError(404, "Selected Weight not found");

  // Calculate add-on price and format Addition
  let addOnPrice = 0;
  let formattedAddition = null;

  if (Addition && typeof Addition === "object") {
    formattedAddition = formatAddOnsForStorage(Addition);
    addOnPrice = formattedAddition?.addOnTotal || 0;
  }

  let totalPrice = (weight.discountPrice + addOnPrice) * quantity;

  // Promo check
  let discount = 0;
  let discountType = null;
  if (promoCodeId) {
    const promo = await prisma.promoCode.findUnique({
      where: { id: promoCodeId },
    });
    if (!promo || new Date(promo.expiry) <= new Date())
      throw new ApiError(400, "Invalid or expired promo code");

    const used = await prisma.usedPromo.findFirst({
      where: { userId, promoCodeId },
    });
    if (used) throw new ApiError(400, "Promo code already used");

    discountType = promo.discountType;
    discount = Math.min(promo.discount, totalPrice);
  }

  // Reward points (single)
  let rewardPointsUsed = 0;
  if (useRewardPoints) {
    const reward = await prisma.reward.findUnique({ where: { userId } });
    if (reward && reward.points > 0) {
      rewardPointsUsed = Math.min(reward.points, totalPrice);
      await prisma.reward.update({
        where: { userId },
        data: { points: reward.points - rewardPointsUsed },
      });
    }
  }

  // Charges
  const { gstCharges, deliveryCharges, platformCharges } = calculateCharges(
    totalPrice,
    distanceKm
  );

  const subtotal = totalPrice + gstCharges + deliveryCharges + platformCharges;

  const discountValue =
    discountType === "PERCENTAGE" ? (subtotal * discount) / 100 : discount;

  const grandTotal = subtotal - discountValue;

  // Create order (NO DELIVERY TASK)
  const order = await prisma.order.create({
    data: {
      userId,
      vendorId: product.vendorId,
      addressId,
      totalPrice,
      gstCharges,
      deliveryCharges,
      platformCharges,
      discount: discountValue,
      grandTotal,
      status: paymentMethod === "CASH_ON_DELIVERY" ? "PROCESSING" : "PENDING",
      paymentStatus: "PENDING",
      paymentMethod,
      referenceId,
      paymentReference:
        paymentMethod === "CASH_ON_DELIVERY" ? null : referenceId,
      rewardPoints: rewardPointsUsed,
      promoCodeId,
      items: {
        create: [
          {
            productId,
            weightId,
            quantity,
            price: weight.discountPrice + addOnPrice, // Include add-on price
            Addition: formattedAddition,
            isAdded: !!formattedAddition,
          },
        ],
      },
      instructions: instructions || null,
    },
    include: {
      items: { include: { product: true } },
      user: true,
      vendor: { include: { user: true } },
      address: true,
    },
  });

  if (promoCodeId) {
    await prisma.usedPromo.create({ data: { userId, promoCodeId } });
  }

  // Create delivery task (only for COD)
  if (paymentMethod === "CASH_ON_DELIVERY") {
    try {
      const pickup = {
        latitude: order.vendor.latitude,
        longitude: order.vendor.longitude,
      };

      const drop = {
        latitude: order.address.latitude,
        longitude: order.address.longitude,
      };

      const storeId = order.vendor.kitchenId;
      // Check serviceability
      const service = await getServiceability(pickup, drop, storeId);
      console.log("UEngage Serviceability and payouts:", service);
      if (
        !service?.serviceability?.riderServiceAble ||
        !service?.serviceability?.locationServiceAble
      ) {
        throw new ApiError(
          400,
          "Delivery not serviceable at this location. Please try another location."
        );
      }

      // Create uEngage delivery task
      const task = await createDeliveryTask(order, storeId);
      console.log("Delivery task created from ORDER NOW:", task);

      // Save taskId + status in DB
      await prisma.order.update({
        where: { id: order.id },
        data: {
          deliveryTaskId: task?.taskId,
          deliveryPartnerStatus: task?.status_code || task?.Status_code,
          deliveryInitiated: true,
        },
      });
    } catch (err) {
      console.error("Delivery task creation failed:", err);
    }
  }

  //if paymentMethod === "CASH_ON_DELIVERY" =>Send emails asynchronously (don’t block)
  // if (paymentMethod === "CASH_ON_DELIVERY") {
  //   const vendorEmail = order.vendor?.user?.email;
  //   const vendorName = order.vendor?.user?.name;
  //   const userEmail = order.user.email;
  //   Promise.all([
  //     sendOrderConfirmationEmail(userEmail, order),
  //     sendVendorNewOrderEmail(vendorEmail, vendorName, order),
  //   ])
  //     .then(() => console.log(`Order emails sent for TXNID: ${txnid}`))
  //     .catch((err) => console.error("Order email error:", err));
  // }

  // FCM Notification (Single Order / Buy Now)
  const firstProductName = order.items?.[0]?.product?.name || "items";
  const itemCount = order.items?.length || 0;
  const productText = itemCount > 1
    ? `${firstProductName} and ${itemCount - 1} more item${itemCount > 2 ? 's' : ''}`
    : firstProductName;

  sendPushNotification(
    order.userId,
    "Order Placed",
    `Your order of ${productText} has been placed successfully.`,
    { type: "ORDER_Placed", orderId: order.id }
  );
  sendPushNotification(
    order.vendor.userId,
    "New Order Received",
    `You have received a new order for ${productText}.`,
    { type: "VENDOR_NEW_ORDER", orderId: order.id },
    "USER"
  );

  return res
    .status(201)
    .json(new ApiResponse(201, order, "Order placed successfully"));
});

const createTask = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
      user: true,
      vendor: { include: { user: true } },
      address: true,
    },
  });
  if (!order) throw new ApiError(404, "Order not found");

  const storeId = order.vendor?.kitchenId;
  if (!storeId) throw new ApiError(400, "Restaurant ID not found.");

  //create uEngage task
  const result = await createDeliveryTask(order, storeId);
  console.log("UEngage task created from the API:", result);

  return res
    .status(201)
    .json(new ApiResponse(201, result, "Task created successfully"));
});

const getUserOrders = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: true,
            },
          },
          Weight: true,
        },
      },
      address: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      vendor: {
        select: {
          id: true,
          kitchenName: true,
          city: true,
          address: true,
          kitchenId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json(new ApiResponse(200, orders, "Orders retrieved"));
});

// Get Order Details (Admin only)
const getOrderByAdmin = asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    include: {
      items: {
        include: {
          product: {
            include: {
              images: true,
            },
          },
          Weight: true,
        },
      },
      address: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      vendor: {
        select: {
          id: true,
          kitchenName: true,
          kitchenId: true,
          city: true,
          address: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!orders) {
    throw new ApiError(404, "Orders not found");
  }

  return res.status(200).json(new ApiResponse(200, orders, "Orders retrieved"));
});

// Get Order Details
const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await prisma.order.findUnique({
    where: { referenceId: id },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: true,
            },
          },
          Weight: true,
        },
      },
      address: true,
      user: true,
      vendor: {
        select: {
          id: true,
          kitchenName: true,
          city: true,
          address: true,
          kitchenId: true,
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order details retrieved"));
});

// Update Order Status (Admin only) - No changes needed
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  await prisma.order.update({
    where: { id },
    data: { status },
  });
  //if status is DELIVERED then update payment status to SUCCESS
  if (status === "DELIVERED") {
    await prisma.order.update({
      where: { id },
      data: { paymentStatus: "SUCCESS" },
    });
  }
  //if status is CANCELLED then update payment status to FAILED
  if (status === "CANCELLED") {
    await prisma.order.updateMany({
      where: { id },
      data: { paymentStatus: "FAILED" },
    });
  }

  const updatedOrder = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  // Send notification based on order status
  if (updatedOrder) {
    // Get first product name for notification
    const firstProductName = updatedOrder.items?.[0]?.product?.name || "your order";
    const itemCount = updatedOrder.items?.length || 0;
    const productText = itemCount > 1
      ? `${firstProductName} and ${itemCount - 1} more item${itemCount > 2 ? 's' : ''}`
      : firstProductName;

    const statusMessages = {
      PENDING: {
        title: "Order Pending",
        body: `Your order of ${productText} is pending confirmation.`
      },
      CONFIRMED: {
        title: "Order Confirmed",
        body: `Your order of ${productText} has been confirmed!`
      },
      PREPARING: {
        title: "Order Being Prepared",
        body: `Your order of ${productText} is being prepared.`
      },
      OUT_FOR_DELIVERY: {
        title: "Out for Delivery",
        body: `Your order of ${productText} is on its way!`
      },
      DELIVERED: {
        title: "Order Delivered",
        body: `Your order of ${productText} has been delivered successfully!`
      },
      CANCELLED: {
        title: "Order Cancelled",
        body: `Your order of ${productText} has been cancelled.`
      }
    };

    if (statusMessages[status]) {
      sendPushNotification(
        updatedOrder.userId,
        statusMessages[status].title,
        statusMessages[status].body,
        { type: `ORDER_${status}`, orderId: updatedOrder.id }
      ).catch(err => console.error("Push notification failed:", err));
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedOrder, "Order status updated"));
});

// Cancel Order (Refund Reward Points if Used)
const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized: User not found");
  }

  const order = await prisma.order.findUnique({
    where: { id, userId },
    include: {
      vendor: true,
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const storeId = order.vendor.kitchenId;
  const taskId = order.deliveryTaskId;
  //first cancel in uengage.
  if (taskId && storeId) {
    try {
      const result = await cancelDeliveryTask(taskId, storeId);
      console.log("UEngage task cancelled api response:", result);
    } catch (err) {
      console.error("Failed to cancel task in uEngage:", err?.message);
    }
  } else {
    console.log("No taskId or storeId found — skipped uEngage cancel.");
  }

  // Refund Reward Points (if used)
  if (order.rewardPoints > 0) {
    await prisma.reward.update({
      where: { userId },
      data: { points: { increment: order.rewardPoints } },
    });
  }

  // Mark Order Cancelled in DB (always)
  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      status: "CANCELLED",
      deliveryPartnerStatus: "CANCELLED",
    },
  });

  // Send Push Notification
  sendPushNotification(
    userId,
    "Order Cancelled",
    `Your order has been cancelled.`,
    { type: "ORDER_CANCELLED", orderId: id }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedOrder, "Order cancelled successfully"));
});



const getOrderByVendor = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true },
  });
  const vendorId = vendor.id;

  if (!vendorId) {
    return res
      .status(403)
      .json(
        new ApiResponse(
          403,
          null,
          "Access denied: Only vendors can view this data."
        )
      );
  }

  // Step 1: Get all Orders by vendorId
  const orders = await prisma.order.findMany({
    where: { vendorId },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: true,
            },
          },
          Weight: true,
        },
      },
      address: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      vendor: {
        select: {
          id: true,
          kitchenName: true,
          city: true,
          address: true,
          kitchenId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!orders || orders.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No orders found for this vendor."));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, orders, "Order details retrieved"));
});

const deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.order.delete({
    where: { id },
  });
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Order deleted successfully"));
});

const uengageWebhook = asyncHandler(async (req, res) => {
  try {
    const event = req.body;
    console.log(" UEngage Webhook Received:", event);

    // Must return 200 immediately or uEngage retries
    res.status(200).json({ status: true });

    const data = event.data || {};
    const statusCode = event.status_code || event.Status_code;

    if (!data?.taskId) {
      console.error(" Missing taskId in webhook.");
      return;
    }

    // Map uEngage status → order status
    let internalStatus = null;

    switch (statusCode) {
      case "ACCEPTED":
      case "ALLOTTED":
      case "ARRIVED":
        internalStatus = "PROCESSING";
        break;

      case "DISPATCHED":
      case "ARRIVED_CUSTOMER_DOORSTEP":
        internalStatus = "SHIPPED";
        break;

      case "DELIVERED":
        internalStatus = "DELIVERED";
        break;

      case "CANCELLED":
        internalStatus = "CANCELLED";
        break;

      case "RTO_INIT":
      case "RTO_COMPLETE":
        internalStatus = "RETURNED";
        break;

      default:
        internalStatus = null;
    }

    // Update the order in DB
    const updated = await prisma.order.updateMany({
      where: { deliveryTaskId: data.taskId },
      data: {
        deliveryPartnerStatus: statusCode,
        riderName: data?.rider_name,
        riderPhone: data?.rider_contact,
        riderLatitude: data?.latitude,
        riderLongitude: data?.longitude,
        trackingUrl: data?.tracking_url,
        rtoReason: data?.rto_reason,
        status: internalStatus || "PROCESSING", // update only if mapped
      },
    });

    // Send notifications based on delivery status
    if (updated.count > 0) {
      // Fetch the order to send notification
      const order = await prisma.order.findFirst({
        where: { deliveryTaskId: data.taskId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (order) {
        // Get first product name for notification
        const firstProductName = order.items?.[0]?.product?.name || "your order";
        const itemCount = order.items?.length || 0;
        const productText = itemCount > 1
          ? `${firstProductName} and ${itemCount - 1} more item${itemCount > 2 ? 's' : ''}`
          : firstProductName;

        // Send specific notifications based on status
        switch (statusCode) {
          case "ALLOTTED":
            sendPushNotification(
              order.userId,
              "Rider Allotted",
              `A delivery rider has been assigned to your order!`,
              { type: "RIDER_ALLOTTED", orderId: order.id }
            );
            break;

          case "DISPATCHED":
            const riderName = data?.rider_name || "Delivery Partner";
            sendPushNotification(
              order.userId,
              "Rider On The Way",
              `Your order of ${productText} is on its way! Rider: ${riderName}`,
              { type: "RIDER_ON_WAY", orderId: order.id }
            );
            break;

          case "DELIVERED":
            sendPushNotification(
              order.userId,
              "Order Delivered",
              `Your order of ${productText} has been delivered successfully!`,
              { type: "ORDER_DELIVERED", orderId: order.id }
            );
            break;
        }
      }
    }

    console.log("Updated order:", updated);
    console.log("UEngage webhook processed:", {
      taskId: data.taskId,
      status: statusCode,
    });
  } catch (err) {
    console.error("UEngage Webhook Error:", err);
  }
});

// ACCEPT / REJECT ORDER
const acceptOrRejectOrder = asyncHandler(async (req, res) => {
  const { id } = req.params; // order id
  const { action, reason } = req.body; // action = "ACCEPT" or "REJECT"
  const vendorId = req.user?.vendor?.id; // vendor user id

  // Validate action
  if (!["ACCEPT", "REJECT"].includes(action)) {
    throw new ApiError(400, "Invalid action. Use ACCEPT or REJECT.");
  }

  // Fetch order
  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Ensure only vendor for that order can take action
  // if (order.vendorId !== vendorId) {
  //   throw new ApiError(403, "Unauthorized: You cannot modify this order");
  // }

  // // Already processed?
  // if (order.status !== "PENDING") {
  //   throw new ApiError(400, `Order is already ${order.status}`);
  // }

  // ACTION: ACCEPT ORDER
  if (action === "ACCEPT") {
    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: "PREPARING",
        isAccepted: true,
      },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, updated, "Order accepted successfully"));
  }

  // ACTION: REJECT ORDER
  if (action === "REJECT") {
    // refund reward points if user used any
    if (order.rewardPoints > 0) {
      await prisma.reward.update({
        where: { userId: order.userId },
        data: { points: { increment: order.rewardPoints } },
      });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: "REJECTED",
        isAccepted: false,
        rtoReason: reason || "Rejected by vendor",
      },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, updated, "Order rejected successfully"));
  }
});

// GET RECENT ORDERS FOR VENDOR / ADMIN
const getRecentOrders = asyncHandler(async (req, res) => {
  const user = req.user;

  let whereClause = {};

  // ADMIN → all recent orders
  if (user.role === "ADMIN") {
    whereClause = {}; // no filter
  }

  // VENDOR → only vendor orders
  if (user.role === "VENDOR") {
    const vendorId = user?.vendor?.id;

    if (!vendorId) {
      throw new ApiError(400, "Vendor ID not found");
    }

    whereClause.vendorId = vendorId;
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    select: {
      id: true,
      createdAt: true,
      user: {
        select: { name: true, email: true, phone: true },
      },
      address: {
        select: { phone: true, city: true },
      },
      status: true,
      referenceId: true,
      paymentMethod: true,
      paymentStatus: true,
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, orders, "Recent orders fetched successfully"));
});

export {
  createOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderById,
  getUserOrders,
  getOrderByAdmin,
  getOrderByVendor,
  deleteOrder,
  checkServiceability,
  trackTaskByTaskId,
  uengageWebhook,
  createTask,
  acceptOrRejectOrder,
  getRecentOrders,

};
