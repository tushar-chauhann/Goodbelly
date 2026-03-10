import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { addReward, deleteReward, getAllRewards, getUserRewards } from "../controllers/reward.controller.js";
import { authorizeRoles } from "../middlewares/authorizeRoles.middleware.js";


const router = Router()

router.route("/").get(authenticate, getUserRewards)
router.route("/add").post(authenticate,authorizeRoles("ADMIN"),addReward)
router.route("/all").get(authenticate,authorizeRoles("ADMIN"), getAllRewards)
router.route(":rewardId").delete(authenticate, authorizeRoles("ADMIN"), deleteReward)


export default router