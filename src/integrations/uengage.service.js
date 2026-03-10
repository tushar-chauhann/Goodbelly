import { uengageRequest } from "./uengage.utils.js";
/**
 * Check if a drop location is serviceable by uEngage riders.
 */
export const getServiceability = async (pickup, drop, storeId) => {
  const payload = {
    store_id: storeId,
    pickupDetails: {
      latitude: pickup.latitude,
      longitude: pickup.longitude,
    },
    dropDetails: {
      latitude: drop.latitude,
      longitude: drop.longitude,
    },
  };

  return await uengageRequest("/getServiceability", payload);
};

/**
 * Create a delivery task in uEngage
 */
export const createDeliveryTask = async (order, storeId) => {
  const payload = {
    store_id: storeId,
    order_id: order.referenceId,
    pickup_details: {
      name: order.vendor.kitchenName,
      contact_number: order.vendor.user.phone,
      address: order.vendor.address,
      city: order.vendor.city,
      latitude: order.vendor.latitude,
      longitude: order.vendor.longitude,
    },
    drop_details: {
      name: order.user.name,
      contact_number: order.address.phone || order.user.phone,
      address: order.address.addressLine,
      city: order.address.city,
      latitude: order.address.latitude,
      longitude: order.address.longitude,
    },
    order_details: {
      order_total: order.grandTotal,
      paid: order.paymentMethod === "ONLINE" ? "true" : "false",
      vendor_order_id: order.referenceId,
      order_source: "Web-app",
      customer_orderId: "optional",
    },
    order_items: order.items.map((item) => ({
      id: item.id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.price,
    })),
    authentication: {
      delivery_otp: "optional",
      rto_otp: "optional",
    },
  };

  return await uengageRequest("/createTask", payload);
};

/**
 * Cancel a task
 */
export const cancelDeliveryTask = async (taskId, storeId) => {
  const payload = {
    storeId: storeId,
    taskId: taskId,
  };

  return await uengageRequest("/cancelTask", payload);
};
/**
 * Fetch task status
 */
export const getTaskStatus = async (taskId, storeId) => {
  const payload = {
    storeId: storeId,
    taskId: taskId,
  };

  return await uengageRequest("/trackTaskStatus", payload);
};
