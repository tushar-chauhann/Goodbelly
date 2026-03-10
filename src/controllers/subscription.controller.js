import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSubscriptionCancelledEmail } from "../utils/mail.service.js";
import { sendPushNotification } from "../services/pushNotification.service.js";

const createSubscription = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized access");

  const {
    mealTypes,
    startDate,
    endDate,
    frequency,
    nextBillingDate,
    transactionId,
    discountId = null,
    weeklySchedule, // New format for day-based subscriptions
  } = req.body;
  let items = req.body.items;
  let deliveryTimes = req.body.deliveryTimes;

  // Validate required fields
  if (
    !startDate ||
    !endDate ||
    !frequency ||
    !nextBillingDate ||
    !transactionId
  ) {
    throw new ApiError(400, "Missing required fields");
  }

  // Check if using new weeklySchedule format or old flat items format
  const isWeeklyFormat =
    weeklySchedule && Object.keys(weeklySchedule).length > 0;

  if (!isWeeklyFormat && (!mealTypes || !deliveryTimes || !items)) {
    throw new ApiError(400, "Missing required fields for subscription");
  }

  //     Parse JSON if needed (for old format)
  if (typeof items === "string") items = JSON.parse(items);
  if (typeof deliveryTimes === "string")
    deliveryTimes = JSON.parse(deliveryTimes);

  //     Calculate total number of days between startDate and endDate (inclusive)
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  if (totalDays <= 0) {
    throw new ApiError(400, "End date must be after start date");
  }

  //     Initialize price calculation
  let totalPrice = 0;
  let vendorId = null;
  let allItems = []; // Collect all items for creation
  let allDeliveryTimes = []; // Collect all delivery times

  if (isWeeklyFormat) {
    //     NEW FORMAT: Process weeklySchedule
    const daysOfWeek = Object.keys(weeklySchedule);

    // Calculate weekly total
    let weeklyTotal = 0;

    for (const day of daysOfWeek) {
      const dayData = weeklySchedule[day];

      if (!dayData.items || dayData.items.length === 0) continue;

      for (let item of dayData.items) {
        const weight = await prisma.weight.findUnique({
          where: { id: item.weightId },
          select: { price: true, discountPrice: true, product: true },
        });

        if (!weight)
          throw new ApiError(400, `Weight with ID ${item.weightId} not found`);

        // Get vendor from first product
        if (!vendorId) vendorId = weight.product.vendorId;

        const itemTotalPrice = weight.discountPrice * (item.quantity || 1);
        weeklyTotal += itemTotalPrice;

        // Store item with price for later creation
        allItems.push({
          itemId: item.itemId,
          weightId: item.weightId,
          price: itemTotalPrice,
          quantity: item.quantity || 1,
        });
      }
    }

    //     ACCURATE CALCULATION: Calculate exact cost per actual delivery day
    // Instead of averaging over 7 days, we calculate the cost for each actual day in the subscription period

    const daysOfWeekMap = {
      SUNDAY: 0,
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
    };

    // Create a map of day-of-week to daily cost
    const dailyCostMap = {};

    for (const day of daysOfWeek) {
      const dayData = weeklySchedule[day];
      if (!dayData.items || dayData.items.length === 0) continue;

      let dayCost = 0;
      for (let item of dayData.items) {
        const weight = await prisma.weight.findUnique({
          where: { id: item.weightId },
          select: { discountPrice: true },
        });
        if (weight) {
          dayCost += weight.discountPrice * (item.quantity || 1);
        }
      }
      dailyCostMap[day.toUpperCase()] = dayCost;
    }

    // Now iterate through each day in the subscription period and add cost if that day has items
    totalPrice = 0;
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Find the matching day name from our map
      const dayName = Object.keys(daysOfWeekMap).find(
        (key) => daysOfWeekMap[key] === dayOfWeek
      );

      // Add the cost for this day if it exists in the schedule
      if (dayName && dailyCostMap[dayName]) {
        totalPrice += dailyCostMap[dayName];
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  } else {
    //     OLD FORMAT: Process flat items array (backward compatibility)
    // Get vendor from first product
    const firstProduct = await prisma.product.findUnique({
      where: { id: items[0].itemId },
    });
    if (!firstProduct) throw new ApiError(404, "Product not found");
    vendorId = firstProduct.vendorId;

    // Calculate per-day total for all selected items
    let totalPricePerDay = 0;
    for (let item of items) {
      const weight = await prisma.weight.findUnique({
        where: { id: item.weightId },
        select: { price: true, discountPrice: true },
      });

      if (!weight)
        throw new ApiError(400, `Weight with ID ${item.weightId} not found`);

      const itemTotalPrice = weight.discountPrice * (item.quantity || 1);
      item.price = itemTotalPrice;
      totalPricePerDay += itemTotalPrice;
    }

    totalPrice = totalPricePerDay * totalDays;
    allItems = items;
    allDeliveryTimes = deliveryTimes;
  }

  //     Calculate discount
  let discountAmount = 0;

  if (discountId) {
    const discount = await prisma.discount.findUnique({
      where: { id: discountId },
    });

    if (discount) {
      const now = new Date();

      //     Validate discount expiry
      if (new Date(discount.expiry) < now) {
        throw new ApiError(400, "This discount code has expired.");
      }

      //     Validate minimum total price condition
      if (discount.minTotalPrice && totalPrice < discount.minTotalPrice) {
        throw new ApiError(
          422,
          `Minimum plan value of ₹${discount.minTotalPrice} is required to apply this discount.`
        );
      }

      //     Validate minimum items condition
      const totalItems = allItems.reduce(
        (sum, item) => sum + (item.quantity || 1),
        0
      );
      if (discount.minItems && totalItems < discount.minItems) {
        throw new ApiError(
          422,
          `You must have at least ${discount.minItems} items to use this discount.`
        );
      }

      //     Handle both PERCENTAGE and FIXED types
      if (discount.type?.toUpperCase() === "PERCENTAGE" && discount.value > 0) {
        discountAmount = (totalPrice * discount.value) / 100;
      } else if (
        discount.type?.toUpperCase() === "FIXED" &&
        discount.value > 0
      ) {
        discountAmount = discount.value;
      }

      //     Ensure discount doesn't exceed total price
      if (discountAmount > totalPrice) discountAmount = totalPrice;
    }
  }

  const finalPrice = totalPrice - discountAmount;

  //     Prepare subscription data
  const subscriptionData = {
    user: { connect: { id: userId } },
    vendor: { connect: { id: vendorId } },
    startDate,
    endDate,
    frequency,
    nextBillingDate,
    totalPrice,
    discountAmount,
    finalPrice,
  };

  // Add weeklySchedule if using new format
  if (isWeeklyFormat) {
    subscriptionData.weeklySchedule = weeklySchedule;
  } else {
    // Add mealTypes for old format
    subscriptionData.mealTypes = mealTypes;
  }

  // Add delivery times if present (old format or fallback)
  if (allDeliveryTimes && allDeliveryTimes.length > 0) {
    subscriptionData.deliveryTimes = {
      create: allDeliveryTimes.map((time) => ({
        startTime: time.startTime,
        endTime: time.endTime,
      })),
    };
  }

  // Add items
  if (allItems && allItems.length > 0) {
    subscriptionData.items = {
      create: allItems.map((item) => ({
        itemId: item.itemId,
        variantId: item.weightId,
        price: item.price || 0,
        quantity: item.quantity || 1,
      })),
    };
  }

  // Add billing
  subscriptionData.Billing = {
    create: {
      amount: finalPrice,
      paymentStatus: "PENDING",
      paymentReference: transactionId,
      nextBillingDate: new Date(nextBillingDate),
    },
  };

  // Include discount relation if exists
  if (discountId) {
    subscriptionData.discount = { connect: { id: discountId } };
  }

  //  Create subscription along with billing
  const subscription = await prisma.subscription.create({
    data: subscriptionData,
  });

  //     Update discount usage count (if applicable)
  if (discountId) {
    await prisma.discount.update({
      where: { id: discountId },
      data: { usageCount: { increment: 1 } },
    });
  }



  res
    .status(201)
    .json(
      new ApiResponse(201, subscription, "Subscription created successfully")
    );
});

// Get all subscriptions for a user
const getUserSubscriptions = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized access");
  }

  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    include: {
      items: true, // Include items in the subscription
      deliveryTimes: true, // Include delivery times
      vendor: true,
      Billing: true, // Include billing info
      SubsReview: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!subscriptions) {
    throw new ApiError(404, "No subscriptions found for this user");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscriptions,
        "Subscriptions retrieved successfully"
      )
    );
});

const getAllSubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await prisma.subscription.findMany({
    include: {
      items: true, // Include items in the subscription
      deliveryTimes: true, // Include delivery times
      Billing: true, // Include billing info
      SubsReview: true,
      vendor: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!subscriptions) {
    throw new ApiError(404, "No subscriptions found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscriptions,
        "All Subscriptions retrieved successfully"
      )
    );
});

const getVendorSubscriptions = asyncHandler(async (req, res) => {
  const vendorId = req.user?.vendor?.id;
  if (!vendorId) {
    throw new ApiError(401, "Unauthorized access");
  }

  const subscriptions = await prisma.subscription.findMany({
    where: { vendorId },
    include: {
      items: {
        include: {
          item: true,
          variant: true,
        },
      }, // Include items in the subscription
      deliveryTimes: true, // Include delivery times
      Billing: true, // Include billing info
      SubsReview: true,
      vendor: true,
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!subscriptions) {
    throw new ApiError(404, "No subscriptions found for this vendor");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscriptions,
        "Subscriptions retrieved successfully"
      )
    );
});

// Get a subscription by ID
const getSubscriptionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const billing = await prisma.billing.findUnique({
    where: { paymentReference: id },
  });
  if (!billing) {
    throw new ApiError(404, "Billing record not found for this reference");
  }

  const subscription = await prisma.subscription.findUnique({
    where: { id: billing?.subscriptionId },
    include: {
      items: true,
      deliveryTimes: true,
      Billing: true,
      SubsReview: true,
    },
  });

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, subscription, "Subscription retrieved successfully")
    );
});

// Update subscription details
const updateSubscription = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    mealTypes,
    startDate,
    endDate,
    frequency,
    nextBillingDate,
    totalPrice,
    deliveryTimes,
    items,
  } = req.body;

  const subscription = await prisma.subscription.update({
    where: { id },
    data: {
      mealTypes,
      startDate,
      endDate,
      frequency,
      nextBillingDate,
      totalPrice,
      deliveryTimes: {
        deleteMany: {}, // First, delete old delivery times
        create: deliveryTimes.map((time) => ({
          startTime: time.startTime,
          endTime: time.endTime,
        })),
      },
      items: {
        deleteMany: {}, // First, delete old items
        create: items.map((item) => ({
          itemId: item.itemId,
          variantId: item.variantId,
          price: item.price,
          quantity: item.quantity,
        })),
      },
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, subscription, "Subscription updated successfully")
    );
});

// Delete subscription
const deleteSubscription = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const subscription = await prisma.subscription.findUnique({
    where: { id },
  });

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  // Delete associated items and delivery times
  await prisma.subscriptionItem.deleteMany({
    where: { subscriptionId: id },
  });

  await prisma.timeWindow.deleteMany({
    where: { subscriptionId: id },
  });

  // Finally, delete the subscription
  await prisma.subscription.delete({
    where: { id },
  });

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Subscription deleted successfully"));
});

const cancelSubscription = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const subscription = await prisma.subscription.findUnique({
    where: { id },
    include: {
      user: true,
      items: {
        include: {
          item: true,
        },
      },
    },
  });

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  //mark as cancelled
  await prisma.subscription.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  // Get first item name for notification
  const firstItemName = subscription.items?.[0]?.item?.name;
  const itemCount = subscription.items?.length || 0;
  const productText = firstItemName
    ? (itemCount > 1 ? `${firstItemName} and ${itemCount - 1} more item${itemCount > 2 ? 's' : ''}` : firstItemName)
    : "your subscription";

  // Send notification to user
  sendPushNotification(
    subscription.userId,
    "Subscription Cancelled",
    `Your subscription for ${productText} has been cancelled.`,
    { type: "SUBSCRIPTION_CANCELLED", subscriptionId: subscription.id }
  ).catch(err => console.error("Push notification failed:", err));

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Subscription cancelled successfully"));

  //send email
  try {
    await sendSubscriptionCancelledEmail(
      subscription.user.email,
      subscription.user.name,
      subscription.id
    );
  } catch (error) {
    console.error("Error sending email:", error);
  }
});

const toggleSubscriptionStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const subscription = await prisma.subscription.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          item: true,
        },
      },
    },
  });

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  await prisma.subscription.update({
    where: { id },
    data: { status },
  });

  // Get first item name for notification
  const firstItemName = subscription.items?.[0]?.item?.name;
  const itemCount = subscription.items?.length || 0;
  const productText = firstItemName
    ? (itemCount > 1 ? `${firstItemName} and ${itemCount - 1} more item${itemCount > 2 ? 's' : ''}` : firstItemName)
    : "your subscription";

  // Send notification based on status
  // Note: CANCELLED is handled by cancelSubscription() function, not here
  const statusMessages = {
    ACTIVE: { title: "Subscription Activated", body: `Your subscription for ${productText} is now active!` },
    PAUSED: { title: "Subscription Paused", body: `Your subscription for ${productText} has been paused.` }
  };

  if (statusMessages[status]) {
    sendPushNotification(
      subscription.userId,
      statusMessages[status].title,
      statusMessages[status].body,
      { type: `SUBSCRIPTION_${status}`, subscriptionId: subscription.id }
    ).catch(err => console.error("Push notification failed:", err));
  }

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Subscription status updated successfully"));
});

export {
  createSubscription,
  getAllSubscriptions,
  getUserSubscriptions,
  getSubscriptionById,
  getVendorSubscriptions,
  updateSubscription,
  deleteSubscription,
  cancelSubscription,
  toggleSubscriptionStatus,
};
