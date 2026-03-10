// Enums for various statuses in the application

// Role Enums for User Roles
export const Role = {
  USER: "USER",
  VENDOR: "VENDOR",
  ADMIN: "ADMIN",
  SUB_ADMIN: "SUB_ADMIN",
};

// Order Status Enum
export const OrderStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  RETURNED: "RETURNED",
};

// Payment Method Enum (COD or Online)
export const PaymentMethod = {
  ONLINE: "ONLINE",
  CASH_ON_DELIVERY: "CASH_ON_DELIVERY",
};

// Payment Status Enum for Payment Statuses
export const PaymentStatus = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
};

// Product Type Enum (Veg or Non-Veg)
export const ProductType = {
  VEG: "VEG",
  NON_VEG: "NON_VEG",
};

// Booking Status Enum for Managing Bookings
export const BookingStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
  COMPLETED: "COMPLETED",
};

// Consultant Role Enum (For various types of consultants)
export const ConsultantRole = {
  NUTRITIONIST: "NUTRITIONIST",
  DIETICIAN: "DIETICIAN",
  DOCTOR: "DOCTOR",
};

// Account Type Enum (Savings or Current)
export const AccountType = {
  SAVINGS: "SAVINGS",
  CURRENT: "CURRENT",
};

// Verification Status Enum (For Document verification)
export const VerificationStatus = {
  UNVERIFIED: "UNVERIFIED",
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
};

// Document Type Enum (For different types of user documents)
export const DocumentType = {
  AADHAAR: "AADHAAR",
  PAN: "PAN",
  FSSAI: "FSSAI",
  GST: "GST",
};

// Document Status Enum (For the status of user documents)
export const DocStatus = {
  NOT_AVAILABLE: "NOT_AVAILABLE",
  UPLOADED: "UPLOADED",
  PENDING_REVIEW: "PENDING_REVIEW",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
};

// Consultant Status Enum for active/inactive consultants
export const ConsultantStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
};

export const MealTypes = {
  BREAKFAST: "BREAKFAST",
  LUNCH: "LUNCH",
  DINNER: "DINNER",
};

export const SubscriptionStatus = {
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  CANCELLED: "CANCELLED",
};
