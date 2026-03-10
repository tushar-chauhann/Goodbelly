import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  cancelOrder,
  createOrder,
  getOrderById,
  getUserOrders,
  updateOrderStatus,
  getOrderByAdmin,
  getOrderByVendor,
  deleteOrder,
  checkServiceability,
  trackTaskByTaskId,
  acceptOrRejectOrder,
  createTask,
  getRecentOrders,
} from "../controllers/order.controller.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";

const router = Router();
router
  .route("/all")
  .get(authenticate, authorizeRoles("ADMIN"), getOrderByAdmin);
router
  .route("/vendor")
  .get(authenticate, authorizeRoles("VENDOR"), getOrderByVendor);
router
  .route("/")
  .post(authenticate, createOrder)
  .get(authenticate, getUserOrders);

router.route("/check-serviceability").post(checkServiceability);
router.route("/create-task/:orderId").post(createTask);
router.route("/track-task/:taskId").post(trackTaskByTaskId);

router
  .route("/recent-orders")
  .get(authenticate, authorizeRoles("ADMIN", "VENDOR"), getRecentOrders);

router
  .route("/:id")
  .get(authenticate, getOrderById)
  .put(authenticate, authorizeRoles("ADMIN", "VENDOR"), updateOrderStatus)
  .delete(authenticate, authorizeRoles("ADMIN"), deleteOrder);
router.route("/cancel/:id").put(authenticate, cancelOrder);

router.put(
  "/vendor-action/:id",
  authenticate,
  authorizeRoles("VENDOR", "ADMIN"),
  acceptOrRejectOrder
);

export default router;
