/**
 * Add-ons Helper Utilities
 * Helper functions for add-ons calculations and validations
 */

/**
 * Calculate total price of selected add-ons
 * @param {Array} selectedAddOns - Array of add-on objects with { id, price }
 * @returns {number} Total add-ons price
 */
export const calculateAddOnsTotal = (selectedAddOns) => {
  if (!selectedAddOns || !Array.isArray(selectedAddOns)) {
    return 0;
  }

  return selectedAddOns.reduce((total, addOn) => {
    return total + (parseFloat(addOn.price) || 0);
  }, 0);
};

/**
 * Format add-ons for storage in Addition JSON field
 * @param {Array} selectedAddOns - Array of selected add-ons with full details
 * @returns {Object} Formatted object for Addition field
 */
export const formatAddOnsForStorage = (selectedAddOns) => {
  if (
    !selectedAddOns ||
    !Array.isArray(selectedAddOns) ||
    selectedAddOns.length === 0
  ) {
    return null;
  }

  const addOns = selectedAddOns.map((addOn) => ({
    id: addOn.id,
    categoryId: addOn.categoryId,
    name: addOn.name,
    price: parseFloat(addOn.price),
    isVeg: addOn.isVeg !== undefined ? addOn.isVeg : true,
  }));

  const addOnTotal = calculateAddOnsTotal(addOns);

  return {
    addOns,
    addOnTotal,
  };
};

/**
 * Parse add-ons from Addition JSON field
 * @param {Object|null} additionField - The Addition JSON field from CartItem/OrderItem
 * @returns {Object} Parsed add-ons data
 */
export const parseAddOnsFromStorage = (additionField) => {
  if (!additionField || typeof additionField !== "object") {
    return {
      addOns: [],
      addOnTotal: 0,
    };
  }

  return {
    addOns: additionField.addOns || [],
    addOnTotal: additionField.addOnTotal || 0,
  };
};

/**
 * Calculate cart item total including add-ons
 * @param {Object} cartItem - Cart item with price, quantity, and Addition field
 * @returns {number} Total price including add-ons
 */
export const calculateCartItemTotal = (cartItem) => {
  const baseTotal = cartItem.price * cartItem.quantity;
  const { addOnTotal } = parseAddOnsFromStorage(cartItem.Addition);

  // Add-ons total is per item, so multiply by quantity
  return baseTotal + addOnTotal * cartItem.quantity;
};

/**
 * Calculate cart total with all add-ons
 * @param {Array} cartItems - Array of cart items
 * @returns {Object} Cart totals breakdown
 */
export const calculateCartTotal = (cartItems) => {
  if (!cartItems || !Array.isArray(cartItems)) {
    return {
      subtotal: 0,
      addOnsTotal: 0,
      total: 0,
    };
  }

  let subtotal = 0;
  let addOnsTotal = 0;

  cartItems.forEach((item) => {
    subtotal += item.price * item.quantity;
    const { addOnTotal } = parseAddOnsFromStorage(item.Addition);
    addOnsTotal += addOnTotal * item.quantity;
  });

  return {
    subtotal,
    addOnsTotal,
    total: subtotal + addOnsTotal,
  };
};

/**
 * Validate if add-on selections are within limits
 * @param {Object} category - AddOnCategory with minSelection and maxSelection
 * @param {Array} selectedAddOns - Array of selected add-on IDs for this category
 * @returns {Object} Validation result { isValid, error }
 */
export const validateCategorySelections = (category, selectedAddOns) => {
  const selectionCount = selectedAddOns.length;

  if (category.isRequired && selectionCount < category.minSelection) {
    return {
      isValid: false,
      error: `Minimum ${category.minSelection} item(s) required for ${category.name}`,
    };
  }

  if (category.maxSelection > 0 && selectionCount > category.maxSelection) {
    return {
      isValid: false,
      error: `Maximum ${category.maxSelection} item(s) allowed for ${category.name}`,
    };
  }

  return {
    isValid: true,
    error: null,
  };
};

/**
 * Generate display text for add-ons (e.g., for order summary)
 * @param {Array} addOns - Array of add-on objects
 * @returns {string} Formatted display text
 */
export const formatAddOnsDisplay = (addOns) => {
  if (!addOns || !Array.isArray(addOns) || addOns.length === 0) {
    return "";
  }

  return addOns.map((addOn) => `${addOn.name} (+₹${addOn.price})`).join(", ");
};
