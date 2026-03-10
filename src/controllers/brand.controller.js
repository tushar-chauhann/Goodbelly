import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToS3 } from "../utils/s3.js";
import { deleteFromS3 } from "../utils/s3Delete.js";

const createBrand = asyncHandler(async (req, res) => {
  const { name, description, website, isActive } = req.body;

  if (!name) {
    throw new ApiError(400, "Brand name is required");
  }

  if (!req.file) {
    throw new ApiError(400, "Brand image is required");
  }

  let imageUrl = null;
  let publicId = null;

  if (req.file) {
    const response = await uploadToS3(req.file, "brands");
    imageUrl = response;
    publicId = response.split("/").pop();
  }

  const brand = await prisma.brand.create({
    data: {
      name,
      description,
      website,
      isActive: isActive === "true",
      imageUrl,
      publicId,
    },
  });

  res
    .status(201)
    .json(new ApiResponse(201, brand, "Brand created successfully"));
});

const getAllBrands = asyncHandler(async (req, res) => {
  const brands = await prisma.brand.findMany();
  res
    .status(200)
    .json(new ApiResponse(200, brands, "Brands retrieved successfully"));
});

const getBrandById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const brand = await prisma.brand.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      website: true,
      imageUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!brand) {
    throw new ApiError(404, "Brand not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, brand, "Brand retrieved successfully"));
});

const updateBrand = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, website, isActive } = req.body;

  const existingBrand = await prisma.brand.findUnique({
    where: { id },
    select: { publicId: true },
  });

  if (!existingBrand) {
    throw new ApiError(404, "Brand not found");
  }

  let imageUrl = null;
  let publicId = existingBrand.publicId;

  if (req.file) {
    if (existingBrand.publicId) {
      await deleteFromS3(existingBrand.publicId);
    }

    const uploadedImage = await uploadToS3(req.file, "brands");
    imageUrl = uploadedImage;
    publicId = uploadedImage.split("/").pop();
  }

  const brand = await prisma.brand.update({
    where: { id },
    data: {
      name,
      description,
      website,
      isActive:
        isActive === "false"
          ? false
          : isActive === "true"
          ? true
          : Boolean(isActive),
      imageUrl: imageUrl || undefined,
      publicId,
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, brand, "Brand updated successfully"));
});

const deleteBrand = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const brand = await prisma.brand.findUnique({
    where: { id },
    select: { publicId: true },
  });

  if (!brand) {
    throw new ApiError(404, "Brand not found");
  }

  if (brand.publicId) {
    await deleteFromS3(brand.publicId);
  }

  await prisma.brand.delete({ where: { id } });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Brand deleted successfully"));
});

export { createBrand, getAllBrands, getBrandById, updateBrand, deleteBrand };
