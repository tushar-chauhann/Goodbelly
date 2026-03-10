import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToS3 } from "../utils/s3.js";
import { deleteFromS3 } from "../utils/s3Delete.js";

// CREATE Banner
const createBanner = asyncHandler(async (req, res) => {
  const { title, description, offer, link, isActive, platform } = req.body; // 👈 Added platform

  let imageUrl = null;
  let publicId = null;

  if (!req.file) {
    throw new ApiError(400, "Banner image is required");
  }

  if (req.file) {
    //upload to s3

    const response = await uploadToS3(req.file);
    if (!response) {
      throw new ApiError(500, "Failed to upload image");
    }
    imageUrl = response;
    publicId = response.split("/").pop();
  }

  const banner = await prisma.banner.create({
    data: {
      title,
      description,
      offer,
      link,
      isActive: isActive === "true" || isActive === true,
      imageUrl,
      publicId,
      platform: platform?.toUpperCase() || "WEB", // 👈 Default to WEB
    },
  });

  res
    .status(201)
    .json(new ApiResponse(201, banner, "Banner created successfully"));
});

// GET ALL Banners (with optional platform filter)
const getAllBanners = asyncHandler(async (req, res) => {
  const { platform } = req.query; // 👈 Filter support
  const banners = await prisma.banner.findMany({
    where: platform ? { platform: platform.toUpperCase() } : {}, // if platform provided, filter
    orderBy: { createdAt: "desc" },
  });

  res
    .status(200)
    .json(new ApiResponse(200, banners, "Banners retrieved successfully"));
});

// GET Banner By ID
const getBannerById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const banner = await prisma.banner.findUnique({ where: { id } });

  if (!banner) throw new ApiError(404, "Banner not found");

  res
    .status(200)
    .json(new ApiResponse(200, banner, "Banner retrieved successfully"));
});

// UPDATE Banner
const updateBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, offer, isActive, link, platform } = req.body; // 👈 Added platform

  // Fetch existing banner
  const existingBanner = await prisma.banner.findUnique({
    where: { id },
    select: { publicId: true },
  });

  if (!existingBanner) throw new ApiError(404, "Banner not found");

  let imageUrl = existingBanner.imageUrl;
  let publicId = existingBanner.publicId;

  // If new image uploaded → replace old image
  if (req.file) {
    // DELETE OLD IMAGE FROM S3
    if (publicId) {
      await deleteFromS3(publicId);
    }
    // UPLOAD NEW IMAGE
    const uploadedUrl = await uploadToS3(req.file);
    imageUrl = uploadedUrl;
    // Extract key from URL (last part)
    publicId = uploadedUrl.split("/").pop();
  }

  const banner = await prisma.banner.update({
    where: { id },
    data: {
      title,
      description,
      offer,
      isActive:
        isActive === "false"
          ? false
          : isActive === "true"
          ? true
          : Boolean(isActive),
      link,
      publicId,
      imageUrl: imageUrl || undefined,
      platform: platform?.toUpperCase() || undefined, // 👈 Allow updating platform
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, banner, "Banner updated successfully"));
});

// DELETE Banner
const deleteBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const banner = await prisma.banner.findUnique({
    where: { id },
    select: { publicId: true },
  });

  if (!banner) throw new ApiError(404, "Banner not found");

  if (banner.publicId) {
    // console.log("Deleting Banner Image:", banner.publicId);
    await deleteFromS3(banner.publicId);
  }

  await prisma.banner.delete({ where: { id } });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Banner deleted successfully"));
});

export {
  createBanner,
  getAllBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
};
