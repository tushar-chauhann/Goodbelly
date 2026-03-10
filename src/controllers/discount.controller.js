import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Create a new discount
const createDiscount = asyncHandler(async (req, res) => {
  const vendorId = req.user?.vendor?.id;

  if (!vendorId) {
    throw new ApiError(401, "Unauthorized access");
  }

  const { type, code, value, expiry, minItems, minTotalPrice } = req.body;

  if (!type || !code || !expiry || !minItems || !minTotalPrice) {
    throw new ApiError(400, "Missing required fields");
  }

  // Ensure the discount type is valid
  if (!["percentage", "PERCENTAGE", "fixed", "FIXED"].includes(type)) {
    throw new ApiError(400, "Invalid discount type");
  }
  //CHECK CODE uniqueness
  const existingDiscount = await prisma.discount.findUnique({
    where: { code },
  });
  if (existingDiscount) {
    throw new ApiError(400, "Discount code already exists");
  }

  const discount = await prisma.discount.create({
    data: {
      vendorId,
      type,
      code,
      expiry: new Date(expiry),
      value: parseFloat(value) || 0,
      minItems: parseInt(minItems),
      minTotalPrice: parseFloat(minTotalPrice),
    },
  });

  res
    .status(201)
    .json(new ApiResponse(201, discount, "Discount created successfully"));
});

// Update an existing discount
const updateDiscount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type, code, expiry, value, minItems, minTotalPrice } = req.body;

  // Ensure the discount type is valid
  if (!["percentage", "PERCENTAGE", "fixed", "FIXED"].includes(type)) {
    throw new ApiError(400, "Invalid discount type");
  }

  //check discount for given id
  const existingDiscount = await prisma.discount.findUnique({
    where: { id },
  });
  if (!existingDiscount) {
    throw new ApiError(404, "Discount not found");
  }

  const discount = await prisma.discount.update({
    where: { id },
    data: {
      type: type || existingDiscount.type,
      code: code || existingDiscount.code,
      expiry: new Date(expiry) || existingDiscount.expiry,
      value: parseFloat(value) || existingDiscount.value,
      minItems: parseInt(minItems) || existingDiscount.minItems,
      minTotalPrice:
        parseFloat(minTotalPrice) || existingDiscount.minTotalPrice,
    },
  });

  if (!discount) {
    throw new ApiError(404, "Discount not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, discount, "Discount updated successfully"));
});

// Delete a discount by ID
const deleteDiscount = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const discount = await prisma.discount.findUnique({
    where: { id },
  });

  if (!discount) {
    throw new ApiError(404, "Discount not found");
  }

  await prisma.discount.delete({
    where: { id },
  });

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Discount deleted successfully"));
});

// Get all discounts
const getAllDiscounts = asyncHandler(async (req, res) => {
  const discounts = await prisma.discount.findMany();

  if (!discounts) {
    throw new ApiError(404, "No discounts found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, discounts, "Discounts retrieved successfully"));
});

const getAllDiscountByVendorId = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;

  if (!vendorId) throw new ApiError(400, "Vendor ID is required");

  const discounts = await prisma.discount.findMany({
    where: { vendorId },
  });

  if (!discounts) {
    throw new ApiError(404, "No discounts found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, discounts, "Discounts retrieved successfully"));
});

// Get a discount by ID
const getDiscountById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const discount = await prisma.discount.findUnique({
    where: { id },
  });

  if (!discount) {
    throw new ApiError(404, "Discount not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, discount, "Discount retrieved successfully"));
});

const applyDiscount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orderTotal, itemCount } = req.body;

  const discount = await prisma.discount.findUnique({
    where: { id },
  });

  if (!discount) {
    throw new ApiError(404, "Discount not found");
  }

  if (discount.type === "percentage" || discount.type === "PERCENTAGE") {
    if (itemCount < discount.minItems || orderTotal < discount.minTotalPrice) {
      throw new ApiError(
        400,
        "Your plan does not meet the minimum requirements for this discount"
      );
    }

    const discountAmount = (orderTotal * discount.value) / 100;
    const finalPrice = orderTotal - discountAmount;

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { discountAmount, finalPrice },
          "Discount applied successfully"
        )
      );
  } else {
    //ITS FLAT
    if (itemCount < discount.minItems || orderTotal < discount.minTotalPrice) {
      throw new ApiError(
        400,
        "Your plan does not meet the minimum requirements for this discount"
      );
    }

    const discountAmount = discount.value;
    const finalPrice = orderTotal - discountAmount;

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { discountAmount, finalPrice },
          "Discount applied successfully"
        )
      );
  }
});

export {
  createDiscount,
  updateDiscount,
  deleteDiscount,
  getAllDiscounts,
  getDiscountById,
  applyDiscount,
  getAllDiscountByVendorId,
};
