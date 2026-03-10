import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToS3 } from "../utils/s3.js";

//  Create a Review
const createReview = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { productId, consultantId, rating, comment } = req.body;
  let imageUrl = null; // Initialize as null

  //check for consultantId or productId at least one exists
  if (!productId && !consultantId) {
    throw new ApiError(400, "productId or consultantId is required");
  }
  if (!rating) {
    throw new ApiError(400, "rating is required");
  }

  // Handle file upload if exists
  if (req.file) {
    const response = await uploadToS3(req.file, "reviews");
    if (!response) {
      throw new ApiError(500, "Failed to upload image");
    }
    imageUrl = response;
  }

  if (productId) {
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    // Check if the user already reviewed this product
    const existingReview = await prisma.review.findFirst({
      where: { userId, productId },
    });
    if (existingReview) {
      throw new ApiError(400, "You have already reviewed this product");
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        userId,
        productId,
        rating: parseInt(rating),
        comment,
        image: imageUrl, // This can be null if no image was uploaded
        isVerified: true,
      },
    });

    return res
      .status(201)
      .json(new ApiResponse(201, review, "Product Review added successfully"));
  } else {
    // Check if consultant exists
    const consultant = await prisma.consultant.findUnique({
      where: { id: consultantId },
    });
    if (!consultant) {
      throw new ApiError(404, "Consultant not found");
    }

    // Check if the user already reviewed this consultant
    const existingReview = await prisma.review.findFirst({
      where: { userId, consultantId },
    });
    if (existingReview) {
      throw new ApiError(400, "You have already reviewed this consultant");
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        userId,
        consultantId,
        rating: parseInt(rating),
        comment,
        image: imageUrl, // This can be null if no image was uploaded
        isVerified: true,
      },
    });

    // Update review count for consultant first
    await prisma.consultant.update({
      where: { id: consultantId },
      data: {
        reviewCount: consultant.reviewCount + 1, // Increment reviewCount first
      },
    });

    // Now update the average rating correctly
    const updatedConsultant = await prisma.consultant.findUnique({
      where: { id: consultantId },
      select: { rating: true, reviewCount: true },
    });

    const newRating =
      (updatedConsultant.rating * updatedConsultant.reviewCount +
        parseInt(rating)) /
      (updatedConsultant.reviewCount + 1);

    // Update consultant's rating with the new calculated value
    await prisma.consultant.update({
      where: { id: consultantId },
      data: { rating: newRating },
    });

    return res
      .status(201)
      .json(
        new ApiResponse(201, review, "Consultant Review added successfully")
      );
  }
});

//  Get All Reviews for a Product
const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const reviews = await prisma.review.findMany({
    where: { productId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, reviews, "Product reviews retrieved successfully")
    );
});

//  Get Reviews by a User
const getUserReviews = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const reviews = await prisma.review.findMany({
    where: { userId, productId },
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, reviews, "User reviews retrieved successfully"));
});

//  Delete a Review (User or Admin)
const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find the review
  const review = await prisma.review.findUnique({
    where: { id },
  });

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  // Delete the review
  await prisma.review.delete({ where: { id } });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Review deleted successfully"));
});

const verifyReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isVerified } = req.body;

  // Find the review
  const review = await prisma.review.findUnique({
    where: { id },
  });

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  if (typeof isVerified !== "boolean") {
    throw new ApiError(404, "Invalid isVerified value.");
  }

  // Update the review
  await prisma.review.update({
    where: { id },
    data: { isVerified },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        isVerified
          ? "Review verified successfully!"
          : "Review unverified successfully!"
      )
    );
});

const getAllReviews = asyncHandler(async (req, res) => {
  const reviews = await prisma.review.findMany({
    include: {
      user: { select: { name: true } },
      product: { select: { name: true } },
      consultant: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, reviews, "All reviews retrieved successfully"));
});

export {
  createReview,
  getProductReviews,
  getUserReviews,
  deleteReview,
  verifyReview,
  getAllReviews,
};
