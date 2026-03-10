import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToS3 } from "../utils/s3.js";
import { deleteFromS3 } from "../utils/s3Delete.js";

// Create Community
const createCommunity = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    throw new ApiError(400, "Community name is required");
  }

  let imageUrl = null;
  let publicImageId = null;

  if (req.file) {
    const uploadedImage = await uploadToS3(req.file, "communities");
    imageUrl = uploadedImage;
    publicImageId = uploadedImage.split("/").pop();
  }

  const community = await prisma.community.create({
    data: {
      name,
      image: imageUrl,
      publicId: publicImageId,
    },
  });

  res
    .status(201)
    .json(new ApiResponse(201, community, "Community created successfully"));
});

// Get All Communities
const getAllCommunities = asyncHandler(async (req, res) => {
  const communities = await prisma.community.findMany({
    include: {
      products: {
        include: {
          images: true,
        },
      },
    },
  });
  res
    .status(200)
    .json(
      new ApiResponse(200, communities, "Communities retrieved successfully")
    );
});

// Update Community
const updateCommunity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  const existingCommunity = await prisma.community.findUnique({
    where: { id },
  });

  if (!existingCommunity) {
    throw new ApiError(404, "Community not found");
  }

  let imageUrl = existingCommunity.image;
  let publicImageId = existingCommunity.publicId;

  if (req.file) {
    if (existingCommunity.publicId) {
      await deleteFromS3(existingCommunity.publicId);
    }

    const uploadedImage = await uploadToS3(req.file, "communities");
    imageUrl = uploadedImage;
    publicImageId = uploadedImage.split("/").pop();
  }

  const updatedCommunity = await prisma.community.update({
    where: { id },
    data: {
      name,
      image: imageUrl,
      publicId: publicImageId,
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, updatedCommunity, "Community updated successfully")
    );
});

// Delete Community
const deleteCommunity = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const community = await prisma.community.findUnique({
    where: { id },
    select: { publicId: true },
  });

  if (!community) {
    throw new ApiError(404, "Community not found");
  }

  if (community.publicId) {
    await deleteFromS3(community.publicId);
  }

  await prisma.community.delete({ where: { id } });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Community deleted successfully"));
});

// Get Community by ID
const getCommunityById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const community = await prisma.community.findUnique({ where: { id } });

  if (!community) {
    throw new ApiError(404, "Community not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, community, "Community retrieved successfully"));
});

const addProductToCommunity = asyncHandler(async (req, res) => {
  const { communityId, productId } = req.body;

  const community = await prisma.community.findUnique({
    where: { id: communityId },
  });

  if (!community) {
    throw new ApiError(404, "Community not found");
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const updatedCommunity = await prisma.community.update({
    where: { id: communityId },
    data: {
      products: {
        connect: {
          id: productId,
        },
      },
    },
    include: {
      products: true,
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedCommunity,
        "Product added to community successfully"
      )
    );
});

const removeProductToCommunity = asyncHandler(async (req, res) => {
  const { communityId, productId } = req.body;

  const community = await prisma.community.findUnique({
    where: { id: communityId },
  });

  if (!community) {
    throw new ApiError(404, "Community not found");
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const updatedCommunity = await prisma.community.update({
    where: { id: communityId },
    data: {
      products: {
        disconnect: {
          id: productId,
        },
      },
    },
    include: {
      products: true,
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedCommunity,
        "Product removed from community successfully"
      )
    );
});

export {
  createCommunity,
  getAllCommunities,
  getCommunityById,
  updateCommunity,
  deleteCommunity,
  addProductToCommunity,
  removeProductToCommunity,
};
