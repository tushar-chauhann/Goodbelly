import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToS3 } from "../utils/s3.js";
import { deleteFromS3 } from "../utils/s3Delete.js";

const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    throw new ApiError(400, "Category name is required");
  }

  let imageUrl = null;
  let publicId = null;

  if (req.file) {
    const uploadedImage = await uploadToS3(req.file, "categories"); // Upload to "categories" folder
    imageUrl = uploadedImage;
    publicId = uploadedImage.split("/").pop(); //store key of s3
  }

  const category = await prisma.category.create({
    data: {
      name,
      description,
      image: imageUrl,
      publicId: publicId, // Save S3 KEY in DB
    },
  });

  res
    .status(201)
    .json(new ApiResponse(201, category, "Category created successfully"));
});

const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany();

  res
    .status(200)
    .json(
      new ApiResponse(200, categories, "Categories retrieved successfully")
    );
});

const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, category, "Category retrieved successfully"));
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const { description } = req.body;

  // Fetch existing category to get the old publicId
  const existingCategory = await prisma.category.findUnique({
    where: { id },
    select: { publicId: true },
  });

  if (!existingCategory) {
    throw new ApiError(404, "Category not found");
  }

  let imageUrl = null;
  let publicId = existingCategory.publicId; // Default to old publicId

  if (req.file) {
    // Delete the old image from S3 if it exists
    if (existingCategory.publicId) {
      await deleteFromS3(existingCategory.publicId);
    }

    // Upload the new image
    const uploadedImage = await uploadToS3(req.file, "categories");
    imageUrl = uploadedImage;
    publicId = uploadedImage.split("/").pop();
  }

  // Update the category in the database
  const category = await prisma.category.update({
    where: { id },
    data: {
      name,
      description,
      image: imageUrl || undefined, // Update image only if provided
      publicId, // Update new publicId in DB
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, category, "Category updated successfully"));
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Fetch category to get the stored publicId
  const category = await prisma.category.findUnique({
    where: { id },
    select: { publicId: true },
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  // Delete image from S3 if publicId exists
  if (category.publicId) {
    await deleteFromS3(category.publicId);
  }

  // Delete the category from the database
  await prisma.category.delete({ where: { id } });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Category deleted successfully"));
});

export {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
