import { Router } from "express";
import { uengageWebhook } from "../controllers/order.controller.js";

const router = Router();

//callback webhook for tracking live status of the order.
router.route("/webhook/status").post(uengageWebhook);

export default router;
