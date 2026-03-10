import {
  failureForward,
  hashGenerator,
  payUWebhookHandler,
  successForward,
  addEventData,
  getEventData,
  deleteEventData,
} from "../controllers/payU.controller.js";
import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/hash").post(hashGenerator);

router.post("/success-forward", authenticate, successForward);

router.post("/failure-forward", authenticate, failureForward);

router.post("/webhook", payUWebhookHandler);

router.post("/event-data", addEventData);
router.get("/event-data", getEventData);
router.delete("/event-data/:id", deleteEventData);

export default router;
