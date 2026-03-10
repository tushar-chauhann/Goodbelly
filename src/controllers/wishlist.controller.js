import prisma from "../prismaClient.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleWishlist = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.params;

  // Find user's wishlist
  let wishlist = await prisma.wishlist.findUnique({
    where: { userId },
    include: { products: true },
  });

  if (!wishlist) {
    // Create wishlist if it doesn't exist
    wishlist = await prisma.wishlist.create({
      data: { userId },
      include: { products: true },
    });
  }

  const isProductInWishlist = wishlist.products.some((p) => p.id === productId);

  if (isProductInWishlist) {
    // Remove product if it exists
    await prisma.wishlist.update({
      where: { id: wishlist.id },
      data: {
        products: {
          disconnect: { id: productId },
        },
      },
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { productId, added: false },
          "Product removed from wishlist"
        )
      );
  } else {
    // Add product if it doesn't exist
    const updatedWishlist = await prisma.wishlist.update({
      where: { id: wishlist.id },
      data: {
        products: {
          connect: { id: productId },
        },
      },
      include: {
        products: {
          where: { id: productId },
          include: {
            weights: true,
            category: { select: { id: true, name: true } },
            images: true,
          },
        },
      },
    });

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { product: updatedWishlist.products[0], added: true },
          "Product added to wishlist"
        )
      );
  }
});

const getWishlist = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId },
    include: {
      products: {
        include: {
          weights: true,
          category: { select: { id: true, name: true } },
          images: true,
        },
      },
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        wishlist?.products || [],
        "Product from wishlist retrieved"
      )
    );
});

export { toggleWishlist, getWishlist };
