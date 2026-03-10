import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToS3 } from "../utils/s3.js";
import { deleteFromS3 } from "../utils/s3Delete.js";

// Create Ingredient
const createIngredient = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    throw new ApiError(400, "Product ID and name are required");
  }

  let imageUrl = null;
  let publicId = null;

  if (req.file) {
    const uploadedImage = await uploadToS3(req.file, "ingredients");
    imageUrl = uploadedImage;
    publicId = uploadedImage.split("/").pop();
  }

  const ingredient = await prisma.ingredients.create({
    data: {
      name,
      image: imageUrl,
      publicId,
    },
  });

  res
    .status(201)
    .json(new ApiResponse(201, ingredient, "Ingredient created successfully"));
});

// Get All Ingredients
const getAllIngredients = asyncHandler(async (req, res) => {
  const ingredients = await prisma.ingredients.findMany({
    include: { products: true },
  });
  res
    .status(200)
    .json(
      new ApiResponse(200, ingredients, "Ingredients retrieved successfully")
    );
});

// Update Ingredient
const updateIngredient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  const existingIngredient = await prisma.ingredients.findUnique({
    where: { id },
  });

  if (!existingIngredient) {
    throw new ApiError(404, "Ingredient not found");
  }

  let imageUrl = existingIngredient.image;
  let publicImageId = existingIngredient.publicId;

  if (req.file) {
    // Delete the old image if a new one is uploaded
    if (existingIngredient.publicId) {
      await deleteFromS3(existingIngredient.publicId);
    }

    // Upload the new image
    const uploadedImage = await uploadToS3(req.file, "ingredients");
    imageUrl = uploadedImage;
    publicImageId = uploadedImage.split("/").pop();
  }

  const updatedIngredient = await prisma.ingredients.update({
    where: { id },
    data: {
      name: name || existingIngredient.name,
      image: imageUrl,
      publicId: publicImageId,
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, updatedIngredient, "Ingredient updated successfully")
    );
});

// Delete Ingredient
const deleteIngredient = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const ingredient = await prisma.ingredients.findUnique({
    where: { id },
    select: { publicId: true },
  });

  if (!ingredient) {
    throw new ApiError(404, "Ingredient not found");
  }

  if (ingredient.publicId) {
    await deleteFromS3(ingredient.publicId);
  }

  await prisma.ingredients.delete({ where: { id } });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Ingredient deleted successfully"));
});

// Get Ingredient by ID
const getIngredientById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const ingredient = await prisma.ingredients.findUnique({ where: { id } });

  if (!ingredient) {
    throw new ApiError(404, "Ingredient not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, ingredient, "Ingredient retrieved successfully")
    );
});

export {
  createIngredient,
  getAllIngredients,
  getIngredientById,
  updateIngredient,
  deleteIngredient,
};
