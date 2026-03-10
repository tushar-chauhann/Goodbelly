/**
 * Helper function to get vendorId based on user role
 * Admin can work with any vendor (if vendorId provided)
 * Vendor can only work with their own products
 */
export const getVendorIdForAddOns = (req, requestVendorId = null) => {
  const isAdmin = req.user.role === "ADMIN";
  const userVendorId = req.user.vendor?.id || req.user.vendorId;

  if (isAdmin) {
    // Admin can use provided vendorId or their own if they have one
    return requestVendorId || userVendorId || null;
  } else {
    // Vendors can only use their own vendorId
    return userVendorId || null;
  }
};

/**
 * Verify if user can access a specific vendor's resources
 * @param {Object} req - Express request object
 * @param {String} targetVendorId - The vendor ID to check access for
 * @returns {Boolean} - Whether user has access
 */
export const canAccessVendor = (req, targetVendorId) => {
  const isAdmin = req.user.role === "ADMIN";
  const userVendorId = req.user.vendor?.id || req.user.vendorId;

  if (isAdmin) {
    // Admin can access any vendor
    return true;
  }

  // Vendor can only access their own
  return userVendorId === targetVendorId;
};

/**
 * Build where clause for querying add-on categories
 * @param {Object} req - Express request object
 * @param {String} queryVendorId - Optional vendor ID from query params
 * @returns {Object} - Prisma where clause
 */
export const buildAddOnCategoriesWhere = (req, queryVendorId = null) => {
  const isAdmin = req.user.role === "ADMIN";
  const userVendorId = req.user.vendor?.id || req.user.vendorId;

  const where = {};

  if (isAdmin) {
    // Admin can filter by specific vendor or see all
    if (queryVendorId) {
      where.vendorId = queryVendorId;
    }
    // else: no vendorId filter, admin sees all
  } else {
    // Vendor sees only their own
    if (!userVendorId) {
      throw new Error("Vendor access required");
    }
    where.vendorId = userVendorId;
  }

  return where;
};
