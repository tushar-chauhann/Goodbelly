import { Router } from "express";
import {
    createReferral,
    getUserReferrals,
    getReferralById,
    applyReferralReward,
} from "../controllers/referral.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").post( authenticate, createReferral).get( authenticate, getUserReferrals); 
router.route("/:id").get( authenticate, getReferralById); 
router.route("/apply-reward").post( authenticate, applyReferralReward); 

export default router;
