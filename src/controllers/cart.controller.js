import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  formatAddOnsForStorage,
  calculateCartTotal,
} from "../utils/addons.helper.js";

// Add Item to Cart (1 cart per vendor per user)
const addToCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  let { productId, weightId, quantity, Addition } = req.body;

  // Validate inputs
  if (!productId || !weightId || !quantity || quantity < 1) {
    throw new ApiError(400, "Invalid product, weight, or quantity");
  }

  // Fetch product with vendor info
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      images: true,
      weights: true,
      vendor: true,
    },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const vendorId = product.vendorId;

  // 🔒 RESTRICTION: Check if user already has carts from other vendors
  const userCarts = await prisma.cart.findMany({
    where: {
      userId: userId,
    },
    include: {
      vendor: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  // Filter out empty carts and get vendors with actual items
  const vendorsWithItems = userCarts.filter(
    (cart) => cart.items.length > 0 && cart.vendorId !== vendorId
  );

  if (vendorsWithItems.length > 0) {
    throw new ApiError(
      409,
      `You already have items from different kitchens in your cart. Please complete those orders first or remove those items.`
    );
  }

  // Find cart for this user+vendor combination
  let cart = await prisma.cart.findUnique({
    where: {
      userId_vendorId: {
        userId,
        vendorId,
      },
    },
    include: {
      items: true,
    },
  });

  // If no cart exists for this vendor, create one
  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId,
        vendorId,
      },
      include: {
        items: true,
      },
    });
  }

  // Fetch weight details
  const weight = await prisma.weight.findUnique({
    where: { id: weightId },
  });
  if (!weight) {
    throw new ApiError(404, "Selected weight not found");
  }

  // Calculate add-on price and format Addition
  let addOnPrice = 0;
  let formattedAddition = null;

  if (Addition && typeof Addition === "object") {
    formattedAddition = formatAddOnsForStorage(Addition);
    addOnPrice = formattedAddition?.addOnTotal || 0;
  }

  // Check if the item already exists in the cart (including same add-ons)
  const existingItem = cart.items.find(
    (item) =>
      item.productId === productId &&
      item.weightId === weightId &&
      JSON.stringify(item.Addition) === JSON.stringify(formattedAddition)
  );

  let updatedItem;

  if (existingItem) {
    // If exists, update quantity
    updatedItem = await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: {
        quantity: existingItem.quantity + parseInt(quantity),
      },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, updatedItem, "Item quantity updated"));
  }

  // Else, create new cart item with add-ons price included
  const cartItem = await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId,
      weightId,
      quantity: parseInt(quantity),
      price: weight.discountPrice + addOnPrice, // Include add-on price
      Addition: formattedAddition,
      isAdded: !!formattedAddition,
    },
    include: {
      product: {
        include: {
          images: true,
        },
      },
      Weight: true,
    },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, cartItem, "Added to your cart"));
});

const removeFromCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { cartItemId } = req.params;

  // Find the cart item first to get the cartId
  const item = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { cart: true },
  });

  if (!item || item.cart.userId !== userId) {
    throw new ApiError(404, "Item not found in cart");
  }

  const cartId = item.cartId;

  // Delete the item
  await prisma.cartItem.delete({ where: { id: cartItemId } });

  // Check if the cart is now empty and delete the cart if so
  const remainingItems = await prisma.cartItem.findMany({ where: { cartId } });

  if (remainingItems.length === 0) {
    await prisma.cart.delete({ where: { id: cartId } });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Item removed from cart"));
});

// Get Cart Items updated
const getCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const carts = await prisma.cart.findMany({
    where: {
      userId,
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: true,
              Nutrition: true,
            },
          },
          Weight: true,
        },
      },
      vendor: true,
    },
  });

  const formattedCarts = carts.map((cart) => {
    const { subtotal, addOnsTotal, total } = calculateCartTotal(cart.items);

    return {
      ...cart,
      itemsTotal: subtotal,
      addOnsTotal,
      total,
    };
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, formattedCarts, "All carts retrieved successfully")
    );
});

//updated
const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const vendorId = req.body.vendorId || req.query.vendorId;

  if (!vendorId) {
    throw new ApiError(400, "Vendor ID is required to clear the cart");
  }

  const cart = await prisma.cart.findFirst({
    where: {
      userId,
      vendorId,
    },
  });

  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cart.delete({ where: { id: cart.id } });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Cart cleared successfully"));
});

// Update Cart Item Quantity or Embroidery
const updateCartItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { cartItemId } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity < 1) {
    throw new ApiError(400, "Quantity must be at least 1");
  }

  const item = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { cart: true },
  });

  if (!item || item.cart.userId !== userId) {
    throw new ApiError(404, "Item not found in cart");
  }

  const updatedItem = await prisma.cartItem.update({
    where: { id: cartItemId },
    data: { quantity },
    include: {
      product: {
        include: { images: true },
      },
      Weight: true,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, updatedItem, "Cart item updated"));
});

export {
  addToCart,
  removeFromCart,
  getCart,
  clearCart,
  updateCartItem as updateCartQuantity,
};
