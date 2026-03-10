import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";
import {
  addStats,
  getPendingOrders,
  getStats,
  getSuccessfulOrders,
  getTotalRevenue,
  getTotalUsers,
  monthlySalesReport,
  updateStats,
  weeklySalesReport,
  yearlyRevenueReport,
  updateScoop,
  createScoop,
  getScoop,
} from "../controllers/reports.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router
  .route("/weekly")
  .get(authenticate, authorizeRoles("ADMIN", "SUB_ADMIN"), weeklySalesReport);

router
  .route("/monthly")
  .get(authenticate, authorizeRoles("ADMIN", "SUB_ADMIN"), monthlySalesReport);

router
  .route("/yearly")
  .get(authenticate, authorizeRoles("ADMIN", "SUB_ADMIN"), yearlyRevenueReport);

router
  .route("/pending-orders")
  .get(authenticate, authorizeRoles("ADMIN", "SUB_ADMIN"), getPendingOrders);
router
  .route("/successful-orders")
  .get(authenticate, authorizeRoles("ADMIN", "SUB_ADMIN"), getSuccessfulOrders);

router
  .route("/revenue")
  .get(authenticate, authorizeRoles("ADMIN", "SUB_ADMIN"), getTotalRevenue);

router
  .route("/users")
  .get(authenticate, authorizeRoles("ADMIN", "SUB_ADMIN"), getTotalUsers);

router
  .route("/stats")
  .get(getStats)
  .post(
    authenticate,
    authorizeRoles("ADMIN"),
    upload.single("image"),
    addStats
  );

router
  .route("/stats/:id")
  .put(
    authenticate,
    authorizeRoles("ADMIN"),
    upload.single("image"),
    updateStats
  );

router
  .route("/scoop")
  .post(
    authenticate,
    authorizeRoles("ADMIN"),
    upload.single("image"),
    createScoop
  )
  .get(getScoop);
router
  .route("/scoop/:id")
  .put(authenticate, authorizeRoles("ADMIN"), updateScoop);

export default router;
