import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import morgan from "morgan";
import session from "express-session";
import passport from "./middlewares/passport.middleware.js";
import "./utils/orderCleanup.cron.js";
dotenv.config();
const app = express();
app.use(morgan("dev"));
app.use(
  cors({
    origin: [
      process.env.CORS_ORIGIN,
      process.env.CORS_ORIGIN2,
      process.env.CORS_ORIGIN3,
      process.env.CORS_ORIGIN_ADMIN,
      process.env.CORS_ORIGIN_ADMIN2,
    ],
    credentials: true,
  })
);
app.use(
  express.json({
    limit: "16kb",
  })
);
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

//G-auth
app.use(
  session({
    secret: process.env.SESSION_SECRET || "mydefaultsecret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// //routes import
import userRouter from "./routes/user.routes.js";
import productRouter from "./routes/product.routes.js";
import categoryRouter from "./routes/category.routes.js";
import wishlistRouter from "./routes/wishlist.routes.js";
import addressRouter from "./routes/address.routes.js";
import cartRouter from "./routes/cart.routes.js";
import rewardRouter from "./routes/reward.routes.js";
import promoCodeRouter from "./routes/promocode.routes.js";
import orderRouter from "./routes/order.routes.js";
import reviewRouter from "./routes/review.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import referralRouter from "./routes/referral.routes.js";
import bannerRouter from "./routes/banner.routes.js";
import testimonialRouter from "./routes/testimonial.routes.js";
import reportRouter from "./routes/report.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import articleRouter from "./routes/articles.routes.js";
import brandRouter from "./routes/brand.routes.js";
import vendorRoutes from "./routes/vendor.routes.js";
import ingredientsRouter from "./routes/ingredients.routes.js";
import communityRouter from "./routes/community.routes.js";
import occasionRouter from "./routes/occasion.routes.js";
import consultantRouter from "./routes/consultant.routes.js";
import bookingRouter from "./routes/bookings.routes.js";
import payURouter from "./routes/payU.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import discountRouter from "./routes/discount.routes.js";
import uengageRouter from "./routes/uengage.routes.js";
import googleAuthRoutes from "./routes/googleAuth.routes.js";
import locationRouter from "./routes/location.routes.js";
import addonsRouter from "./routes/addons.routes.js"; // Add-ons routes

//routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/wishlist", wishlistRouter);
app.use("/api/v1/address", addressRouter);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/rewards", rewardRouter);
app.use("/api/v1/promoCode", promoCodeRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/uengage", uengageRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/payment", paymentRouter);
app.use("/api/v1/referral", referralRouter);
app.use("/api/v1/banner", bannerRouter);
app.use("/api/v1/testimonials", testimonialRouter);
app.use("/api/v1/reports", reportRouter);
app.use("/api/v1/contact", contactRoutes);
app.use("/api/v1/articles", articleRouter);
app.use("/api/v1/brands", brandRouter);
app.use("/api/v1/vendor", vendorRoutes);
app.use("/api/v1/ingredients", ingredientsRouter);
app.use("/api/v1/community", communityRouter);
app.use("/api/v1/occasion", occasionRouter);
app.use("/api/v1/consultant", consultantRouter);
app.use("/api/v1/booking", bookingRouter);
app.use("/api/v1/payU", payURouter);
app.use("/api/v1/subscription", subscriptionRouter);
app.use("/api/v1/discount", discountRouter);

app.use("/api/v1/auth/google", googleAuthRoutes);

app.use("/api/v1/location", locationRouter);
app.use("/api/v1/addons", addonsRouter); // Add-ons routes

// Error handling middleware
import errorHandler from "./middlewares/errorHandler.js";
app.use(errorHandler); // <-- Add this LAST
app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
