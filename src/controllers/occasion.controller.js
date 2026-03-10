import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToS3 } from "../utils/s3.js";
import { deleteFromS3 } from "../utils/s3Delete.js";

const slugify = (str) => {
  return str
    .toLowerCase()
    .trim() // Trim leading/trailing spaces
    .replace(/[^\w\s-]/g, "") // Remove non-word characters except spaces and hyphens
    .replace(/[\s-]+/g, "-"); // Replace spaces and consecutive hyphens with a single hyphen
};

// Create Occasion  -->tested
const createOccasion = asyncHandler(async (req, res) => {
  const { label } = req.body;

  if (!label || !req.file) {
    throw new ApiError(400, "Label and icon are required");
  }

  let iconUrl = null;
  let publicIconId = null;
  //generate key by slugify
  const key = slugify(label);
  //check for uniqueness
  const existingOccasion = await prisma.occasion.findUnique({ where: { key } });
  if (existingOccasion) {
    throw new ApiError(400, "Occasion with this key already exists");
  }

  if (req.file) {
    const uploadedIcon = await uploadToS3(req.file, "occasions");
    iconUrl = uploadedIcon;
    publicIconId = uploadedIcon.split("/").pop();
  }

  const occasion = await prisma.occasion.create({
    data: {
      key,
      label,
      icon: iconUrl,
      publicId: publicIconId,
    },
  });

  res
    .status(201)
    .json(new ApiResponse(201, occasion, "Occasion created successfully"));
});

// Get All Occasions  -->tested
const getAllOccasions = asyncHandler(async (req, res) => {
  const occasions = await prisma.occasion.findMany({
    include: { products: true },
    orderBy: { createdAt: "asc" },
  });
  res
    .status(200)
    .json(new ApiResponse(200, occasions, "Occasions retrieved successfully"));
});

// Get Occasion by ID
const getOccasionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const occasion = await prisma.occasion.findUnique({ where: { id } });

  if (!occasion) {
    throw new ApiError(404, "Occasion not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, occasion, "Occasion retrieved successfully"));
});

// Update Occasion  -->tested
const updateOccasion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { label } = req.body;

  const existingOccasion = await prisma.occasion.findUnique({ where: { id } });

  if (!existingOccasion) {
    throw new ApiError(404, "Occasion not found");
  }

  let iconUrl = existingOccasion.icon;
  let publicIconId = existingOccasion.publicId;

  if (req.file) {
    if (existingOccasion.publicId) {
      await deleteFromS3(existingOccasion.publicId);
    }
    const uploadedIcon = await uploadToS3(req.file, "occasions");
    iconUrl = uploadedIcon;
    publicIconId = uploadedIcon.split("/").pop();
  }
  let key = existingOccasion.key;
  if (label) key = slugify(label);

  //uniqueness check
  const existingOccasionWithKey = await prisma.occasion.findUnique({
    where: { key },
  });
  if (existingOccasionWithKey && existingOccasionWithKey.id !== id) {
    throw new ApiError(400, "Occasion with this key already exists");
  }

  const updatedOccasion = await prisma.occasion.update({
    where: { id },
    data: {
      key,
      label: label || existingOccasion.label,
      icon: iconUrl,
      publicId: publicIconId,
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, updatedOccasion, "Occasion updated successfully")
    );
});

// Delete Occasion
const deleteOccasion = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const occasion = await prisma.occasion.findUnique({
    where: { id },
    select: { publicId: true },
  });

  if (!occasion) {
    throw new ApiError(404, "Occasion not found");
  }

  if (occasion.publicId) {
    await deleteFromS3(occasion.publicId);
  }

  await prisma.occasion.delete({ where: { id } });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Occasion deleted successfully"));
});

export {
  createOccasion,
  getAllOccasions,
  getOccasionById,
  updateOccasion,
  deleteOccasion,
};
