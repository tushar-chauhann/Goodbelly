// controllers/googleAuth.controller.js
// import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";

const googleCallbackHandler = asyncHandler(async (req, res) => {
  const user = req.user;

  const accessToken = jwt.sign(
    { id: user.id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );

  //  Cookie options
  const isProduction = process.env.NODE_ENV === "production";
  const options = {
    httpOnly: true,
    secure: isProduction, // Only use secure in production (HTTPS)
    sameSite: isProduction ? "none" : "lax", // "none" for cross-domain in prod, "lax" for localhost
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    ...(isProduction && { domain: ".goodbelly.in" }), // Only set domain in production
  };

  res
    .cookie("accessToken", accessToken, options)
    .redirect(`${process.env.CORS_ORIGIN}`);
});

export { googleCallbackHandler };
