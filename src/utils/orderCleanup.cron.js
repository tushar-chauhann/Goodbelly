import cron from "node-cron";
import prisma from "../prismaClient.js";
import {
  sendSubscriptionExpiredEmail,
  sendSubscriptionReminderEmail,
} from "./mail.service.js";

// 🕒 CRON JOB — hourly cleanup for pending online payments
cron.schedule("0 * * * *", async () => {
  try {
    console.log(
      "🧹 Running hourly cleanup for abandoned pending online orders/bookings..."
    );

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Delete pending online orders older than 1 day
    const deletedOrders = await prisma.order.deleteMany({
      where: {
        status: "PENDING",
        paymentMethod: "ONLINE",
        paymentStatus: "PENDING",
        createdAt: { lt: oneDayAgo },
      },
    });

    // Delete pending online bookings older than 1 day
    const deletedBookings = await prisma.booking.deleteMany({
      where: {
        status: "PENDING",
        paymentMethod: "ONLINE",
        paymentStatus: "PENDING",
        createdAt: { lt: oneDayAgo },
      },
    });

    // Find pending billings older than 1 day and delete related subscriptions
    const pendingBillings = await prisma.billing.findMany({
      where: {
        paymentStatus: "PENDING",
        createdAt: { lt: oneDayAgo },
      },
    });

    if (pendingBillings.length > 0) {
      const subscriptionIds = pendingBillings.map((b) => b.subscriptionId);

      await prisma.subscription.deleteMany({
        where: { id: { in: subscriptionIds } },
      });

      await prisma.billing.deleteMany({
        where: { paymentStatus: "PENDING" },
      });
    }

    if (
      deletedOrders.count > 0 ||
      deletedBookings.count > 0 ||
      pendingBillings.length > 0
    ) {
      console.log(
        `    Deleted ${deletedOrders.count} pending orders, ${deletedBookings.count} bookings, and ${pendingBillings.length} subscriptions.`
      );
    } else {
      console.log("ℹ️ No pending online records found for cleanup.");
    }
  } catch (error) {
    console.error("❌ Error while deleting pending records:", error.message);
  }
});

// 🌙 Daily midnight CRON — check expiring & expired subscriptions
cron.schedule("0 0 * * *", async () => {
  try {
    console.log("📬 Running daily subscription expiry check...");

    const today = new Date();
    const twoDaysLater = new Date(today);
    twoDaysLater.setDate(today.getDate() + 2);

    // Find active subs expiring in 2 days
    const nearExpirySubs = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        endDate: { gte: today, lt: twoDaysLater },
      },
      include: { user: true },
    });

    if (nearExpirySubs.length > 0) {
      await Promise.all(
        nearExpirySubs.map((sub) =>
          sendSubscriptionReminderEmail(
            sub.user.email,
            sub.user.name,
            sub.id,
            sub.endDate
          )
        )
      );
      console.log(`📧 Sent ${nearExpirySubs.length} reminder emails.`);
    }

    // Find subscriptions that have already expired
    const expiredSubs = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        endDate: { lt: today },
      },
      include: { user: true },
    });

    if (expiredSubs.length > 0) {
      await Promise.all(
        expiredSubs.map(async (sub) => {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "EXPIRED" },
          });
          await sendSubscriptionExpiredEmail(
            sub.user.email,
            sub.user.name,
            sub.id
          );
        })
      );

      console.log(`    Marked ${expiredSubs.length} subscriptions as EXPIRED.`);
    } else {
      console.log("ℹ️ No subscriptions reached expiry today.");
    }
  } catch (error) {
    console.error("❌ Error updating expired subscriptions:", error.message);
  }
});
