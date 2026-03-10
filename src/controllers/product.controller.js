import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToS3 } from "../utils/s3.js";
import { deleteFromS3 } from "../utils/s3Delete.js";

//updated as per requirement
const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    brandName,
    productType,
    department,
    categoryId,
    weights, // array of size/weight info: { weight, sku, stock, price, discountPrice }
    nutrition, // { calories, protein, carbs, fats, fiber, sugar, sodium }
    label,
  } = req.body;

  let ingredientIds = req.body.ingredientIds;
  let occasionIds = req.body.occasionIds;
  let keywords = req.body.keywords;
  let highlights = req.body.highlights;

  const userId = req.user.id; // Extract the userId from authenticated user (req.user.id)

  // Fetch the vendor associated with the user
  const vendor = await prisma.vendor.findUnique({
    where: { userId }, // Find the vendor using userId
  });

  if (!vendor) {
    throw new ApiError(404, "Vendor not found for this user");
  }

  const vendorId = vendor.id; // Get vendorId from the vendor record

  if (!name || !brandName || !categoryId) {
    throw new ApiError(400, "Missing required fields");
  }

  // Validate category
  const categoryExists = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!categoryExists) {
    throw new ApiError(404, "Category not found");
  }

  if (typeof ingredientIds === "string")
    ingredientIds = JSON.parse(ingredientIds);
  if (typeof occasionIds === "string") occasionIds = JSON.parse(occasionIds);
  if (typeof keywords === "string") keywords = JSON.parse(keywords);
  // if (typeof highlights === "string") highlights = JSON.parse(highlights);

  // Create Product
  const newProduct = await prisma.product.create({
    data: {
      name,
      description,
      brandName,
      productType,
      department,
      categoryId,
      vendorId,
      Ingredients: Array.isArray(ingredientIds)
        ? { connect: ingredientIds.map((id) => ({ id })) }
        : undefined,
      occasions: Array.isArray(occasionIds)
        ? { connect: occasionIds.map((id) => ({ id })) }
        : undefined,
      keywords: Array.isArray(keywords)
        ? {
          connectOrCreate: keywords.map((keyword) => ({
            where: { name: keyword },
            create: { name: keyword },
          })),
        }
        : undefined,
      ...(highlights && { highlights }),
      ...(label && { label }),
    },
  });

  // Add Nutrition data
  if (nutrition) {
    const {
      calories,
      calBenchmark,
      protein,
      proteinBench,
      carbs,
      carbsBench,
      fats,
      fatsBench,
      fiber,
      sugar,
      sodium,
    } = typeof nutrition === "string" ? JSON.parse(nutrition) : nutrition;

    const numericNutrition = {
      calories: Number(calories),
      calBenchmark: Number(calBenchmark),
      protein: Number(protein),
      proteinBench: Number(proteinBench),
      carbs: Number(carbs),
      carbsBench: Number(carbsBench),
      fats: Number(fats),
      fatsBench: Number(fatsBench),
      fiber: Number(fiber),
      sugar: Number(sugar),
      sodium: Number(sodium),
    };

    await prisma.nutrition.create({
      data: {
        productId: newProduct.id,
        ...numericNutrition,
      },
    });
  }

  // Upload images (if any)
  // ------------ IMAGE UPLOAD (AWS S3) ------------
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const uploadedUrl = await uploadToS3(file);

      const key = uploadedUrl.split("/").pop(); // extract S3 key

      await prisma.image.create({
        data: {
          productId: newProduct.id,
          url: uploadedUrl,
          publicId: key, // store S3 file name
          altText: "",
        },
      });
    }
  }

  const parsedWeights =
    typeof weights === "string" ? JSON.parse(weights) : weights;
  if (Array.isArray(parsedWeights) && parsedWeights.length > 0) {
    const weightData = parsedWeights.map((item) => ({
      productId: newProduct.id,
      weight: item.weight,
      sku: item.sku || "",
      stock: parseInt(item.stock, 10),
      price: parseFloat(item.price),
      discountPrice: parseFloat(item.discountPrice),
    }));
    await prisma.weight.createMany({ data: weightData });
  }

  // Fetch final product
  const finalProduct = await prisma.product.findUnique({
    where: { id: newProduct.id },
    include: {
      category: true,
      images: true,
      weights: true,
      Nutrition: true,
      community: true, // include linked community
      Ingredients: true, // include ingredients
      occasions: true, // include occasions
      keywords: true, // include keywords
    },
  });

  res
    .status(201)
    .json(new ApiResponse(201, finalProduct, "Product created successfully"));
});

//updated as per requirement
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    brandName,
    productType,
    department,
    categoryId,
    weights,
    nutrition, // updated or new nutrition data
    label,
  } = req.body;

  let ingredientIds = req.body.ingredientIds;
  let occasionIds = req.body.occasionIds;
  let keywords = req.body.keywords;
  let highlights = req.body.highlights;

  const userId = req.user.id;

  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  const product = await prisma.product.findUnique({
    where: { id },
    include: { images: true },
  });

  if (!product) throw new ApiError(404, "Product not found");

  const vendorId = vendor?.id || product.vendorId;

  if (typeof ingredientIds === "string")
    ingredientIds = JSON.parse(ingredientIds);
  if (typeof occasionIds === "string") occasionIds = JSON.parse(occasionIds);
  if (typeof keywords === "string") keywords = JSON.parse(keywords);

  // Keywords
  const currentKeywords = await prisma.product
    .findUnique({
      where: { id },
      select: { keywords: { select: { id: true } } },
    })
    .keywords();

  const disconnectKeywords = currentKeywords.map((keyword) => ({
    id: keyword.id,
  }));

  await prisma.product.update({
    where: { id },
    data: {
      name,
      description,
      brandName,
      productType,
      department,
      categoryId,
      vendorId,
      Ingredients: Array.isArray(ingredientIds)
        ? { set: ingredientIds.map((id) => ({ id })) }
        : undefined,
      occasions: Array.isArray(occasionIds)
        ? { set: occasionIds.map((id) => ({ id })) }
        : undefined,
      keywords: {
        disconnect: disconnectKeywords,
        connectOrCreate: keywords.map((keyword) => ({
          where: { name: keyword },
          create: { name: keyword },
        })),
      },
      ...(highlights && { highlights }),
      label,
    },
  });

  await prisma.keyword.deleteMany({
    where: { products: { none: {} } },
  });

  // Nutrition
  const existingNutrition = await prisma.nutrition.findUnique({
    where: { productId: id },
  });

  const parsedNutrition =
    typeof nutrition === "string" ? JSON.parse(nutrition) : nutrition;

  if (parsedNutrition) {
    const {
      calories,
      calBenchmark,
      protein,
      proteinBench,
      carbs,
      carbsBench,
      fats,
      fatsBench,
      fiber,
      sugar,
      sodium,
    } = parsedNutrition;

    const numericNutrition = {
      calories: Number(calories),
      calBenchmark: Number(calBenchmark),
      protein: Number(protein),
      proteinBench: Number(proteinBench),
      carbs: Number(carbs),
      carbsBench: Number(carbsBench),
      fats: Number(fats),
      fatsBench: Number(fatsBench),
      fiber: Number(fiber),
      sugar: Number(sugar),
      sodium: Number(sodium),
    };
    if (existingNutrition) {
      await prisma.nutrition.update({
        where: { productId: id },
        data: numericNutrition,
      });
    } else {
      await prisma.nutrition.create({
        data: { productId: id, ...numericNutrition },
      });
    }
  }

  //  NOW: HANDLE IMAGES WITH AWS S3
  if (req.files && req.files.length > 0) {
    // Delete old images from S3
    for (const img of product.images) {
      if (img.publicId) {
        await deleteFromS3(img.publicId); // key/fileName
      }
    }

    // Delete old database entries
    await prisma.image.deleteMany({ where: { productId: id } });

    // Upload new images
    for (const file of req.files) {
      const uploadedUrl = await uploadToS3(file);
      const key = uploadedUrl.split("/").pop(); // extract key

      await prisma.image.create({
        data: {
          productId: id,
          url: uploadedUrl,
          publicId: key,
          altText: "",
        },
      });
    }
  }

  // Weight handling
  const parsedWeights =
    typeof weights === "string" ? JSON.parse(weights) : weights;

  if (Array.isArray(parsedWeights)) {
    const weightData = parsedWeights.map((item) => ({
      id: item.id || null,
      productId: id,
      weight: item.weight,
      sku: item.sku || "",
      stock: parseInt(item.stock, 10),
      price: parseFloat(item.price),
      discountPrice: parseFloat(item.discountPrice),
    }));

    const existingWeights = await prisma.weight.findMany({
      where: { productId: id },
    });

    const incomingWeightIds = weightData.filter((w) => w.id).map((w) => w.id);

    const weightsToDelete = existingWeights.filter(
      (existing) => !incomingWeightIds.includes(existing.id)
    );

    for (const w of weightsToDelete) {
      await prisma.weight.delete({ where: { id: w.id } });
    }

    for (const weight of weightData) {
      if (weight.id) {
        await prisma.weight.update({
          where: { id: weight.id },
          data: weight,
        });
      } else {
        await prisma.weight.create({ data: weight });
      }
    }
  }

  const updatedProduct = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      images: true,
      weights: true,
      Nutrition: true,
      community: true,
      Ingredients: true,
      occasions: true,
      keywords: true,
      vendor: true,
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, updatedProduct, "Product updated successfully"));
});

const getAllProducts = asyncHandler(async (req, res) => {
  const {
    categoryId,
    minPrice,
    maxPrice,
    search,
    sortBy,
    order,
    ingredientId,
    occasion,
  } = req.query;

  const { latitude, longitude, lat, lon } = req.query ?? {};
  const rawLatitude = latitude ?? lat;
  const rawLongitude = longitude ?? lon;
  const hasLatitude = rawLatitude !== undefined;
  const hasLongitude = rawLongitude !== undefined;

  if ((hasLatitude && !hasLongitude) || (!hasLatitude && hasLongitude)) {
    throw new ApiError(400, "Both latitude and longitude must be provided");
  }

  let userLatitude;
  let userLongitude;
  const shouldFilterByLocation = hasLatitude && hasLongitude;

  if (shouldFilterByLocation) {
    userLatitude = Number.parseFloat(rawLatitude);
    userLongitude = Number.parseFloat(rawLongitude);

    if (!Number.isFinite(userLatitude) || !Number.isFinite(userLongitude)) {
      throw new ApiError(400, "Invalid latitude or longitude provided");
    }
  }

  // Construct filters
  let filters = {};

  if (ingredientId) {
    filters.AND = filters.AND || [];
    filters.AND.push({
      Ingredients: { some: { id: ingredientId } },
    });
  }

  if (occasion) {
    filters.AND = filters.AND || [];
    filters.AND.push({
      occasions: { some: { key: occasion } },
    });
  }

  if (categoryId) {
    filters.categoryId = categoryId;
  }

  if (minPrice || maxPrice) {
    filters.AND = filters.AND || [];
    if (minPrice) {
      filters.AND.push({
        weights: { some: { price: { gte: parseFloat(minPrice) } } },
      });
    }
    if (maxPrice) {
      filters.AND.push({
        weights: { some: { price: { lte: parseFloat(maxPrice) } } },
      });
    }
  }

  if (search) {
    filters.OR = [
      { name: { contains: search } },
      // { description: { contains: search } },
      { keywords: { some: { name: { contains: search } } } },
    ];
  }

  // Sorting logic
  let orderBy = {};
  if (sortBy) {
    if (sortBy === "rating") {
      orderBy = { reviews: { _count: order === "desc" ? "desc" : "asc" } };
    } else if (sortBy === "lowToHigh") {
      orderBy = { weights: { price: "asc" } };
    } else if (sortBy === "highToLow") {
      orderBy = { weights: { price: "desc" } };
    } else if (sortBy === "newest") {
      orderBy = { createdAt: "desc" };
    }
  }

  // Fetch all products
  const products = await prisma.product.findMany({
    where: { ...filters, isVerified: true, isDeleted: false },
    orderBy,
    select: {
      id: true,
      name: true,
      description: true,
      productType: true,
      brandName: true,
      department: true,
      vendorId: true,
      vendor: {
        select: {
          userId: true,
          kitchenName: true,
          kitchenId: true,
          longitude: true,
          latitude: true,
          city: true,
          address: true,
        },
      },
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      category: { select: { id: true, name: true } },
      images: true,
      reviews: true,
      Nutrition: true,
      weights: { orderBy: { price: "asc" } },
      community: true,
      Ingredients: true,
      occasions: true,
      keywords: true,
      label: true,
      highlights: true,
      isCustomizable: true,
    },
  });

  // -------------------- RANDOM SHUFFLE --------------------
  if (!sortBy) {
    for (let i = products.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [products[i], products[j]] = [products[j], products[i]];
    }
  }

  if (!shouldFilterByLocation) {
    return res
      .status(200)
      .json(new ApiResponse(200, products, "Products retrieved successfully"));
  }

  // --- 📍 Filter products by nearby distance ---
  const R = 6371; // Earth radius in km
  const nearbyProducts = products.filter((product) => {
    const vendor = product.vendor;
    if (!vendor || !vendor.latitude || !vendor.longitude) return false;

    const dLat = (vendor.latitude - userLatitude) * (Math.PI / 180);
    const dLon = (vendor.longitude - userLongitude) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(userLatitude * (Math.PI / 180)) *
      Math.cos(vendor.latitude * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // distance in km
    return distance <= 15; // within 15 km
  });

  if (!sortBy) {
    for (let i = nearbyProducts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nearbyProducts[i], nearbyProducts[j]] = [
        nearbyProducts[j],
        nearbyProducts[i],
      ];
    }
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        nearbyProducts,
        `Nearby products retrieved successfully (${nearbyProducts.length})`
      )
    );
});

const getProductsByVendorId = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;
  const products = await prisma.product.findMany({
    where: {
      vendorId,
      isVerified: true,
      isDeleted: false,
    },
    include: {
      category: true,
      images: true,
      weights: true,
      reviews: true,
      Nutrition: true,
      keywords: true,
      vendor: true,
      occasions: true,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, products, "Products retrieved successfully"));
});

const getAll = asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      vendor: true,
      images: true,
      weights: true,
      Nutrition: true,
      keywords: true,
    },
    orderBy: {
      createdAt: "desc", // Default sorting by creation date
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, products, "Products retrieved successfully"));
});
//  Get product by ID updated..
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await prisma.product.findUnique({
    where: { id, isVerified: true },
    include: {
      weights: {
        orderBy: {
          price: "asc", //     Sort weights by price ascending
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      reviews: {
        where: {
          isVerified: true, //     Only include verified reviews
        },
        include: {
          user: {
            select: {
              name: true,
              profileImage: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      vendor: true,
      images: true,
      Nutrition: true,
      community: true,
      Ingredients: true,
      occasions: true,
    },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, product, "Product retrieved successfully"));
});
//  Delete product updated
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      weights: true,
      images: true,
    },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Delete all images from S3
  for (const image of product.images) {
    if (image && image.publicId) {
      await deleteFromS3(image.publicId);
    }
  }

  // Delete product (cascade will handle weights, and images)
  await prisma.product.delete({
    where: { id },
  });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Product deleted successfully"));
});

const verifyProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isVerified } = req.body; // boolean value
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  await prisma.product.update({
    where: { id },
    data: {
      isVerified: isVerified,
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Product verified successfully"));
});

const softDeleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  await prisma.product.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, null, "Product moved to Recycle Bin successfully")
    );
});

const getRecycleBinProducts = asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({
    where: { isDeleted: true },
    include: {
      category: true,
      vendor: true,
      images: true,
      weights: true,
      Nutrition: true,
      keywords: true,
      Ingredients: true,
      occasions: true,
    },
    orderBy: { deletedAt: "desc" },
  });

  res
    .status(200)
    .json(new ApiResponse(200, products, "Recycle bin products retrieved"));
});

const restoreProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (!product.isDeleted) {
    throw new ApiError(400, "Product is not in recycle bin");
  }

  await prisma.product.update({
    where: { id },
    data: {
      isDeleted: false,
      deletedAt: null,
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Product restored successfully"));
});

// GET /products/top/:vendorId
const getTopProducts = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;

  const top = await prisma.product.findMany({
    where: { vendorId, isPinned: true, isDeleted: false },
    select: {
      id: true,
      name: true,
      description: true,
      productType: true,
      brandName: true,
      department: true,
      vendorId: true,
      vendor: {
        select: {
          userId: true,
          kitchenName: true,
          kitchenId: true,
          longitude: true,
          latitude: true,
          city: true,
          address: true,
        },
      },
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      category: { select: { id: true, name: true } },
      images: true,
      reviews: true,
      Nutrition: true,
      weights: { orderBy: { price: "asc" } },
      community: true,
      Ingredients: true,
      occasions: true,
      keywords: true,
      label: true,
      highlights: true,
    },
    orderBy: { order: "asc" },
    take: 3,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, top, "Top products fetched"));
});

// PUT /products/pin/:id
const pinProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isPinned, order } = req.body;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // If pinning → require order
  if (isPinned) {
    if (![1, 2, 3].includes(order)) {
      throw new ApiError(400, "Order must be 1, 2 or 3");
    }

    // Count pinned products for same vendor
    const pinnedCount = await prisma.product.count({
      where: { vendorId: product.vendorId, isPinned: true },
    });
    if (pinnedCount >= 3) {
      throw new ApiError(400, "You can only pin up to 3 dishes.");
    }

    // Check if position already used
    const existing = await prisma.product.findFirst({
      where: { vendorId: product.vendorId, order },
    });
    if (existing) {
      throw new ApiError(400, `Position ${order} already assigned.`);
    }
  }

  const updated = await prisma.product.update({
    where: { id },
    data: { isPinned, order: isPinned ? order : null },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Product pinned successfully"));
});

const productByDiscount = asyncHandler(async (req, res) => {
  console.log("Fetching discounted products");

  const products = await prisma.product.findMany({
    where: {
      isVerified: true,
      isDeleted: false,
    },
    include: {
      category: {
        select: { id: true, name: true },
      },
      vendor: {
        select: {
          userId: true,
          kitchenName: true,
          kitchenId: true,
          latitude: true,
          longitude: true,
          city: true,
        },
      },
      images: true,
      Nutrition: true,
      Ingredients: true,
      occasions: true,
      keywords: true,
      weights: true,
      reviews: true,
    },
  });


  const discountedProducts = products
    .map((product) => {
      const discountedWeights = product.weights.filter((w) => {
        const isDiscounted =
          w.discountPrice !== null &&
          Number(w.discountPrice) < Number(w.price); // Strict check: discount price must be lower than original price

        return isDiscounted;
      });

      if (discountedWeights.length === 0) {
        console.log("No discounted weights found for this product");
        return null;
      }

      const maxDiscount = Math.max(
        ...discountedWeights.map(
          (w) => Number(w.price) - Number(w.discountPrice)
        )
      );
      return {
        ...product,
        weights: discountedWeights,
        maxDiscount, // temp field for sorting
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.maxDiscount - a.maxDiscount)
    .map(({ maxDiscount, ...product }) => product);

  res.status(200).json(
    new ApiResponse(
      200,
      discountedProducts,
      "Discounted products sorted by highest discount"
    )
  );
});


export {
  createProduct,
  getAllProducts,
  getAll,
  getProductById,
  updateProduct,
  deleteProduct,
  verifyProduct,
  getProductsByVendorId,
  softDeleteProduct,
  getRecycleBinProducts,
  restoreProduct,
  getTopProducts,
  pinProduct,
  productByDiscount
};
