// routes/googleAuth.routes.js
import express from "express";
import passport from "../middlewares/passport.middleware.js";
import { googleCallbackHandler } from "../controllers/googleAuth.controller.js";

const router = express.Router();

// Step 1: Redirect to Google for login
router.get(
  "/",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Step 2: Google redirects here after login
router.get(
  "/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  googleCallbackHandler
);

export default router;
