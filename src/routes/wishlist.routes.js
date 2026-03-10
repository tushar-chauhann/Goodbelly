import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { getWishlist, toggleWishlist } from "../controllers/wishlist.controller.js";



const router = Router()


router.route("/").get(authenticate, getWishlist)
router.route("/:productId").post(authenticate, toggleWishlist)


export default router