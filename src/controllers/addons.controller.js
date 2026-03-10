import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToS3 } from "../utils/s3.js";
import { deleteFromS3 } from "../utils/s3Delete.js";

// ============================================
// ADD-ON CATEGORY CONTROLLERS (Global/Shared)
// ============================================

/**
 * Create a new add-on category (Global - any admin/vendor can create)
 * @route POST /api/v1/addons/categories
 * @access Admin, Vendor
 */
const createAddOnCategory = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    minSelection,
    maxSelection,
    isRequired,
    sortOrder,
    vendorId: providedVendorId, // Optional for Admins
  } = req.body;

  if (!name) {
    throw new ApiError(400, "Category name is required");
  }

  // Set vendorId based on user role
  let vendorId = null;
  if (req.user.role === "VENDOR") {
    vendorId = req.user.vendor?.id;
  } else if (req.user.role === "ADMIN" || req.user.role === "SUB_ADMIN") {
    vendorId = providedVendorId || null; // Admin can specify vendorId or keep it global
  }

  // Validate selection limits
  if (maxSelection && minSelection > maxSelection) {
    throw new ApiError(
      400,
      "Minimum selection cannot be greater than maximum selection"
    );
  }

  const category = await prisma.addOnCategory.create({
    data: {
      name,
      description,
      minSelection: minSelection || 0,
      maxSelection: maxSelection || 1,
      isRequired: isRequired || false,
      sortOrder: sortOrder || 0,
      vendorId,
    },
  });

  res
    .status(201)
    .json(
      new ApiResponse(201, category, "Add-on category created successfully")
    );
});

/**
 * Get all add-on categories (Global - shared by all)
 * @route GET /api/v1/addons/categories
 * @access Admin, Vendor
 */
const getAddOnCategories = asyncHandler(async (req, res) => {
  const { isActive, vendorId: queryVendorId } = req.query;
  const userRole = req.user.role;
  const userVendorId = req.user.vendor?.id;

  const where = {};
  if (isActive !== undefined) {
    where.isActive = isActive === "true";
  }

  // Filter based on role and vendorId
  if (userRole === "VENDOR") {
    // Vendor sees their own categories + global ones
    where.OR = [{ vendorId: userVendorId }, { vendorId: null }];
  } else if (userRole === "ADMIN" || userRole === "SUB_ADMIN") {
    // Admin can filter by vendorId if provided
    if (queryVendorId) {
      where.vendorId = queryVendorId === "null" ? null : queryVendorId;
    }
  }

  const categories = await prisma.addOnCategory.findMany({
    where,
    include: {
      addOns: {
        orderBy: { sortOrder: "asc" },
      },
      _count: {
        select: { productAddOns: true },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, categories, "Categories retrieved successfully")
    );
});

/**
 * Get single add-on category by ID
 * @route GET /api/v1/addons/categories/:id
 * @access Admin, Vendor
 */
const getAddOnCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await prisma.addOnCategory.findUnique({
    where: { id },
    include: {
      addOns: {
        orderBy: { sortOrder: "asc" },
      },
      productAddOns: {
        include: {
          product: {
            select: { id: true, name: true, coverImage: true },
          },
        },
      },
    },
  });

  if (!category) {
    throw new ApiError(404, "Add-on category not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, category, "Category retrieved successfully"));
});

/**
 * Update add-on category
 * @route PUT /api/v1/addons/categories/:id
 * @access Admin, Vendor
 */
const updateAddOnCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    minSelection,
    maxSelection,
    isRequired,
    sortOrder,
    isActive,
  } = req.body;

  const existingCategory = await prisma.addOnCategory.findUnique({
    where: { id },
  });

  if (!existingCategory) {
    throw new ApiError(404, "Add-on category not found");
  }

  // Authorization check
  const userRole = req.user.role;
  const userVendorId = req.user.vendor?.id;

  if (userRole === "VENDOR" && existingCategory.vendorId !== userVendorId) {
    throw new ApiError(403, "You can only update your own categories");
  }

  // Validate selection limits
  if (
    maxSelection !== undefined &&
    minSelection !== undefined &&
    minSelection > maxSelection
  ) {
    throw new ApiError(
      400,
      "Minimum selection cannot be greater than maximum selection"
    );
  }

  const category = await prisma.addOnCategory.update({
    where: { id },
    data: {
      name,
      description,
      minSelection,
      maxSelection,
      isRequired,
      sortOrder,
      isActive,
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, category, "Category updated successfully"));
});

/**
 * Delete add-on category
 * @route DELETE /api/v1/addons/categories/:id
 * @access Admin, Vendor
 */
const deleteAddOnCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await prisma.addOnCategory.findUnique({
    where: { id },
  });

  if (!category) {
    throw new ApiError(404, "Add-on category not found");
  }

  // Authorization check
  const userRole = req.user.role;
  const userVendorId = req.user.vendor?.id;

  if (userRole === "VENDOR" && category.vendorId !== userVendorId) {
    throw new ApiError(403, "You can only delete your own categories");
  }

  await prisma.addOnCategory.delete({ where: { id } });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Category deleted successfully"));
});

// ============================================
// ADD-ON ITEM CONTROLLERS
// ============================================

/**
 * Create a new add-on item in a category
 * @route POST /api/v1/addons/categories/:categoryId/items
 * @access Admin, Vendor
 */
const createAddOn = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { name, description, price, isVeg, stock, sortOrder } = req.body;

  if (!name || price === undefined) {
    throw new ApiError(400, "Name and price are required");
  }

  // Verify category exists
  const category = await prisma.addOnCategory.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new ApiError(404, "Add-on category not found");
  }

  // Authorization check
  const userRole = req.user.role;
  const userVendorId = req.user.vendor?.id;

  if (userRole === "VENDOR" && category.vendorId !== userVendorId) {
    throw new ApiError(403, "You can only add items to your own categories");
  }

  let imageUrl = null;
  let publicId = null;

  if (req.file) {
    const uploadedImage = await uploadToS3(req.file, "addons");
    imageUrl = uploadedImage;
    publicId = uploadedImage.split("/").pop();
  }

  const addOn = await prisma.addOn.create({
    data: {
      categoryId,
      name,
      description,
      price: parseFloat(price),
      image: imageUrl,
      publicId,
      isVeg: isVeg !== undefined ? isVeg === "true" : true,
      stock: stock ? parseInt(stock) : null,
      sortOrder: sortOrder ? parseInt(sortOrder) : 0,
    },
  });

  res
    .status(201)
    .json(new ApiResponse(201, addOn, "Add-on created successfully"));
});

/**
 * Get all add-ons in a category
 * @route GET /api/v1/addons/categories/:categoryId/items
 * @access Admin, Vendor
 */
const getAddOnsByCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  // Verify category exists
  const category = await prisma.addOnCategory.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new ApiError(404, "Add-on category not found");
  }

  const addOns = await prisma.addOn.findMany({
    where: { categoryId },
    orderBy: { sortOrder: "asc" },
  });

  res
    .status(200)
    .json(new ApiResponse(200, addOns, "Add-ons retrieved successfully"));
});

/**
 * Update add-on item
 * @route PUT /api/v1/addons/items/:id
 * @access Admin, Vendor
 */
const updateAddOn = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, price, isVeg, isAvailable, stock, sortOrder } =
    req.body;

  const existingAddOn = await prisma.addOn.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!existingAddOn) {
    throw new ApiError(404, "Add-on not found");
  }

  // Authorization check
  const userRole = req.user.role;
  const userVendorId = req.user.vendor?.id;

  if (
    userRole === "VENDOR" &&
    existingAddOn.category.vendorId !== userVendorId
  ) {
    throw new ApiError(403, "You can only update your own add-ons");
  }

  let imageUrl = null;
  let publicId = existingAddOn.publicId;

  if (req.file) {
    // Delete old image if exists
    if (existingAddOn.publicId) {
      await deleteFromS3(existingAddOn.publicId);
    }

    const uploadedImage = await uploadToS3(req.file, "addons");
    imageUrl = uploadedImage;
    publicId = uploadedImage.split("/").pop();
  }

  const addOn = await prisma.addOn.update({
    where: { id },
    data: {
      name,
      description,
      price: price !== undefined ? parseFloat(price) : undefined,
      image: imageUrl || undefined,
      publicId,
      isVeg: isVeg !== undefined ? isVeg === "true" : undefined,
      isAvailable:
        isAvailable !== undefined ? isAvailable === "true" : undefined,
      stock: stock !== undefined ? (stock ? parseInt(stock) : null) : undefined,
      sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : undefined,
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, addOn, "Add-on updated successfully"));
});

/**
 * Delete add-on item
 * @route DELETE /api/v1/addons/items/:id
 * @access Admin, Vendor
 */
const deleteAddOn = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const addOn = await prisma.addOn.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!addOn) {
    throw new ApiError(404, "Add-on not found");
  }

  // Authorization check
  const userRole = req.user.role;
  const userVendorId = req.user.vendor?.id;

  if (userRole === "VENDOR" && addOn.category.vendorId !== userVendorId) {
    throw new ApiError(403, "You can only delete your own add-ons");
  }

  // Delete image from S3 if exists
  if (addOn.publicId) {
    await deleteFromS3(addOn.publicId);
  }

  await prisma.addOn.delete({ where: { id } });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Add-on deleted successfully"));
});

// ============================================
// PRODUCT-ADDON ASSOCIATION CONTROLLERS
// ============================================

/**
 * Link add-on category to a product (Vendor can only link to their own products)
 * @route POST /api/v1/addons/products/:productId
 * @access Admin, Vendor
 */
const linkAddOnToProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { categoryId, sortOrder } = req.body;
  const isAdmin = req.user.role === "ADMIN";
  const userVendorId = req.user.vendor?.id || req.user.vendorId;

  if (!categoryId) {
    throw new ApiError(400, "Category ID is required");
  }

  // Verify product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Vendor can only link to their own products
  if (!isAdmin && product.vendorId !== userVendorId) {
    throw new ApiError(
      403,
      "You can only manage add-ons for your own products"
    );
  }

  // Verify category exists and belongs to the vendor (or is global)
  const category = await prisma.addOnCategory.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new ApiError(404, "Add-on category not found");
  }

  if (category.vendorId && category.vendorId !== product.vendorId) {
    throw new ApiError(
      403,
      "This category belongs to another kitchen and cannot be linked to this product"
    );
  }

  // Check if already linked
  const existingLink = await prisma.productAddOn.findFirst({
    where: { productId, categoryId },
  });

  if (existingLink) {
    throw new ApiError(400, "Product already linked to this category");
  }

  const productAddOn = await prisma.productAddOn.create({
    data: {
      productId,
      categoryId,
      sortOrder: sortOrder || 0,
    },
    include: {
      category: {
        include: {
          addOns: true,
        },
      },
    },
  });

  // Auto-set isCustomizable to true
  await prisma.product.update({
    where: { id: productId },
    data: { isCustomizable: true },
  });

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        productAddOn,
        "Add-on category linked to product successfully"
      )
    );
});

/**
 * Unlink add-on category from a product
 * @route DELETE /api/v1/addons/products/:productId/:categoryId
 * @access Admin, Vendor
 */
const unlinkAddOnFromProduct = asyncHandler(async (req, res) => {
  const { productId, categoryId } = req.params;
  const isAdmin = req.user.role === "ADMIN";
  const userVendorId = req.user.vendor?.id || req.user.vendorId;

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Vendor can only manage their own products
  if (!isAdmin && product.vendorId !== userVendorId) {
    throw new ApiError(
      403,
      "You can only manage add-ons for your own products"
    );
  }

  const productAddOn = await prisma.productAddOn.findFirst({
    where: { productId, categoryId },
  });

  if (!productAddOn) {
    throw new ApiError(404, "Product-AddOn link not found");
  }

  await prisma.productAddOn.delete({ where: { id: productAddOn.id } });

  // Check if product still has other add-ons
  const remainingAddOns = await prisma.productAddOn.count({
    where: { productId },
  });

  // If no more add-ons, set isCustomizable to false
  if (remainingAddOns === 0) {
    await prisma.product.update({
      where: { id: productId },
      data: { isCustomizable: false },
    });
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        null,
        "Add-on category unlinked from product successfully"
      )
    );
});

/**
 * Get all add-on categories for a product
 * @route GET /api/v1/addons/products/:productId
 * @access Admin, Vendor
 */
const getProductAddOns = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const isAdmin = req.user.role === "ADMIN";
  const userVendorId = req.user.vendor?.id || req.user.vendorId;

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Vendor can only view their own products
  if (!isAdmin && product.vendorId !== userVendorId) {
    throw new ApiError(403, "Access denied");
  }

  const productAddOns = await prisma.productAddOn.findMany({
    where: { productId },
    include: {
      category: {
        include: {
          addOns: {
            where: { isAvailable: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        productAddOns,
        "Product add-ons retrieved successfully"
      )
    );
});

// ============================================
// CUSTOMER-FACING CONTROLLERS
// ============================================

/**
 * Get available add-ons for a product (Customer view)
 * @route GET /api/v1/addons/product/:productId
 * @access Public
 */
const getProductAddOnsForCustomer = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      coverImage: true,
      isCustomizable: true,
    },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (!product.isCustomizable) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { product, addOnCategories: [] },
          "Product has no customization options"
        )
      );
  }

  const addOns = await prisma.productAddOn.findMany({
    where: {
      productId,
      category: { isActive: true },
    },
    include: {
      category: {
        include: {
          addOns: {
            where: {
              isAvailable: true,
              OR: [{ stock: { gt: 0 } }, { stock: null }],
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  const response = {
    product,
    addOnCategories: addOns.map((pa) => ({
      id: pa.category.id,
      name: pa.category.name,
      description: pa.category.description,
      minSelection: pa.category.minSelection,
      maxSelection: pa.category.maxSelection,
      isRequired: pa.category.isRequired,
      addOns: pa.category.addOns,
    })),
  };

  res
    .status(200)
    .json(
      new ApiResponse(200, response, "Product add-ons retrieved successfully")
    );
});

/**
 * Validate add-on selections
 * @route POST /api/v1/addons/validate
 * @access Public
 */
const validateAddOnSelections = asyncHandler(async (req, res) => {
  const { productId, selectedAddOns } = req.body;

  if (!productId || !selectedAddOns || !Array.isArray(selectedAddOns)) {
    throw new ApiError(
      400,
      "Product ID and selected add-ons array are required"
    );
  }

  const productAddOns = await prisma.productAddOn.findMany({
    where: { productId },
    include: {
      category: {
        include: {
          addOns: { where: { isAvailable: true } },
        },
      },
    },
  });

  const errors = [];
  const categorySelections = {};

  // Group selections by category
  selectedAddOns.forEach((selection) => {
    if (!categorySelections[selection.categoryId]) {
      categorySelections[selection.categoryId] = [];
    }
    categorySelections[selection.categoryId].push(selection);
  });

  // Validate each category
  productAddOns.forEach((pa) => {
    const category = pa.category;
    const selections = categorySelections[category.id] || [];

    // Check minimum selection
    if (category.isRequired && selections.length < category.minSelection) {
      errors.push({
        categoryId: category.id,
        categoryName: category.name,
        error: `Minimum ${category.minSelection} item(s) required`,
      });
    }

    // Check maximum selection
    if (
      category.maxSelection > 0 &&
      selections.length > category.maxSelection
    ) {
      errors.push({
        categoryId: category.id,
        categoryName: category.name,
        error: `Maximum ${category.maxSelection} item(s) allowed`,
      });
    }

    // Validate each selected add-on exists and is available
    selections.forEach((selection) => {
      const addOn = category.addOns.find((a) => a.id === selection.id);
      if (!addOn) {
        errors.push({
          categoryId: category.id,
          addOnId: selection.id,
          error: "Add-on not found or unavailable",
        });
      } else if (addOn.stock !== null && addOn.stock <= 0) {
        errors.push({
          categoryId: category.id,
          addOnId: selection.id,
          addOnName: addOn.name,
          error: "Add-on out of stock",
        });
      }
    });
  });

  // Calculate total price
  let totalAddOnPrice = 0;
  if (errors.length === 0) {
    const addOnIds = selectedAddOns.map((s) => s.id);
    const addOns = await prisma.addOn.findMany({
      where: { id: { in: addOnIds } },
    });

    addOns.forEach((addOn) => {
      totalAddOnPrice += addOn.price;
    });
  }

  const isValid = errors.length === 0;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        isValid,
        errors,
        totalAddOnPrice: isValid ? totalAddOnPrice : 0,
      },
      isValid ? "Selections are valid" : "Validation errors found"
    )
  );
});

export {
  // Category management
  createAddOnCategory,
  getAddOnCategories,
  getAddOnCategoryById,
  updateAddOnCategory,
  deleteAddOnCategory,

  // Add-on item management
  createAddOn,
  getAddOnsByCategory,
  updateAddOn,
  deleteAddOn,

  // Product-AddOn association
  linkAddOnToProduct,
  unlinkAddOnFromProduct,
  getProductAddOns,

  // Customer-facing
  getProductAddOnsForCustomer,
  validateAddOnSelections,
};
