import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { addAddress, deleteAddress, getAddresses, setPrimaryAddress, updateAddress } from "../controllers/address.controller.js";

const router = Router();

router.route("/")
    .post(authenticate, addAddress)
    .get(authenticate, getAddresses); 
router.route("/:id")
    .put(authenticate, updateAddress) 
    .delete(authenticate, deleteAddress);

router.put("/set-primary/:id", authenticate, setPrimaryAddress);


export default router