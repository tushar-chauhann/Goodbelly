import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendUserDiscountOfferEmail } from "../utils/mail.service.js";

//  Create Promo Code (Admin Only)
const createPromoCode = asyncHandler(async (req, res) => {
  const {
    code,
    discount,
    discountType,
    expiry,
    minOrder,
    isHidden = false, // 🆕 optional for secret codes
    influencerName = null, // 🆕 optional for influencer
  } = req.body;

  if (!code || !discount || !expiry || !minOrder || !discountType) {
    throw new ApiError(400, "All required fields must be provided");
  }

  const existingPromo = await prisma.promoCode.findUnique({
    where: { code },
  });

  if (existingPromo) {
    throw new ApiError(400, "Promo code already exists");
  }

  const newPromo = await prisma.promoCode.create({
    data: {
      code,
      discount: parseFloat(discount),
      discountType,
      expiry: new Date(expiry),
      minOrder: parseFloat(minOrder),
      isHidden,
      influencerName,
    },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newPromo, "Promo code created successfully"));
});

const createUserPromoCode = asyncHandler(async (req, res) => {
  const { code, discount, discountType, expiry, minOrder } = req.body;
  const { userId } = req.params;

  if (!code || !discount || !expiry || !minOrder || !userId) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const existingPromo = await prisma.promoCode.findUnique({ where: { code } });

  if (existingPromo) {
    throw new ApiError(400, "Promo code already exists");
  }

  const newPromo = await prisma.promoCode.create({
    data: {
      code,
      userId,
      discountType,
      discount: parseFloat(discount),
      expiry: new Date(expiry),
      minOrder: parseFloat(minOrder),
    },
  });

  res
    .status(201)
    .json(new ApiResponse(201, newPromo, "Promo code created successfully"));

  // 📩 Send discount email (after response)
  sendUserDiscountOfferEmail(user.email, newPromo).catch((err) =>
    console.error("Error sending promo email:", err)
  );
});

const updatePromoCode = asyncHandler(async (req, res) => {
  const { code, discount, discountType, expiry, minOrder } = req.body;
  const existingPromo = await prisma.promoCode.findUnique({ where: { code } });
  if (!existingPromo) {
    throw new ApiError(404, "Promo code not found");
  }

  const updatedPromo = await prisma.promoCode.update({
    where: { id: existingPromo.id },
    data: {
      code,
      discountType,
      discount: parseFloat(discount),
      expiry: new Date(expiry),
      minOrder: parseFloat(minOrder),
    },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPromo, "Promo code updated successfully")
    );
});

//  Get All Promo Codes
const getAllPromoCodes = asyncHandler(async (req, res) => {
  const promoCodes = await prisma.promoCode.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, promoCodes, "All promo codes retrieved successfully")
    );
});

//  Validate Promo Code
const validatePromoCode = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { code } = req.params;

  const promoCode = await prisma.promoCode.findUnique({ where: { code } });

  if (!promoCode) {
    throw new ApiError(404, "Promo code not found");
  }

  if (new Date(promoCode.expiry) < new Date()) {
    throw new ApiError(400, "Promo code has expired");
  }

  // Fetch user's cart total
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, "Your cart is empty");
  }

  const cartTotal = cart.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  const totalEmbroideryPrice = cart.items.reduce(
    (total, item) => total + item.embroideryPrice * item.quantity,
    0
  );
  const totalPrice = cartTotal + totalEmbroideryPrice;
  // Validate minimum order requirement
  if (totalPrice < promoCode.minOrder) {
    throw new ApiError(
      400,
      `Promo code requires a minimum order of ₹${promoCode.minOrder}`
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, promoCode, "Promo code is valid"));
});

//  Delete Promo Code
const deletePromoCode = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const promoCode = await prisma.promoCode.findUnique({ where: { code } });

  if (!promoCode) {
    throw new ApiError(404, "Promo code not found");
  }

  await prisma.promoCode.delete({ where: { code } });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Promo code deleted successfully"));
});

const getUnusedPromoCodes = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Find promo codes already used by this user
  const usedPromoIds = await prisma.usedPromo.findMany({
    where: { userId },
    select: { promoCodeId: true },
  });

  const usedPromoIdsArray = usedPromoIds.map((promo) => promo.promoCodeId);

  // 🧾 1️⃣ User-specific promos (not used + valid + visible)
  const userSpecificPromos = await prisma.promoCode.findMany({
    where: {
      id: { notIn: usedPromoIdsArray },
      userId, // specific to this user
      expiry: { gte: new Date() },
      isHidden: false, // 🆕 exclude secret influencer coupons
    },
    orderBy: { createdAt: "desc" },
  });

  // 🧾 2️⃣ General public promos (no userId + valid + visible)
  const generalPromos = await prisma.promoCode.findMany({
    where: {
      id: { notIn: usedPromoIdsArray },
      userId: null,
      expiry: { gte: new Date() },
      isHidden: false, // 🆕 exclude secret influencer coupons
    },
    orderBy: { createdAt: "desc" },
  });

  // Merge both lists
  const allAvailablePromos = [...userSpecificPromos, ...generalPromos];

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        allAvailablePromos,
        "Unused promo codes retrieved successfully"
      )
    );
});

const applyPromoCode = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { code, productAmount } = req.body;

  const promoCode = await prisma.promoCode.findUnique({ where: { code } });

  if (!promoCode) {
    throw new ApiError(404, "Promo code not found");
  }

  if (new Date(promoCode.expiry) < new Date()) {
    throw new ApiError(400, "Promo code has expired");
  }

  //CHECK USED promo of the user.
  const usedPromo = await prisma.usedPromo.findFirst({
    where: { userId, promoCodeId: promoCode.id },
  });

  if (usedPromo) {
    throw new ApiError(400, "You have already used this promo code.");
  }

  let totalPrice = 0;
  if (!productAmount) {
    // Fetch user's cart total
    const carts = await prisma.cart.findMany({
      where: { userId },
      include: { items: true },
    });
    //user can have multiple carts so get all.

    if (!carts || carts.length === 0) {
      throw new ApiError(400, "Your cart is empty");
    }

    const items = carts.flatMap((cart) => cart.items);

    totalPrice = items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  } else {
    // Use product amount
    totalPrice = productAmount;
  }

  // Validate minimum order requirement
  if (totalPrice < promoCode.minOrder) {
    throw new ApiError(
      400,
      `Promo code requires a minimum order of ₹${promoCode.minOrder}`
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, promoCode, "Promo code applied successfully"));
});

export {
  createPromoCode,
  getAllPromoCodes,
  validatePromoCode,
  deletePromoCode,
  getUnusedPromoCodes,
  applyPromoCode,
  updatePromoCode,
  createUserPromoCode,
};
