import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  sendOTPEmail,
  sendVendorApprovedEmail,
  sendVendorUnderReviewEmail,
} from "../utils/mail.service.js";
import { uploadToS3 } from "../utils/s3.js";

// Helpers
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;
const FSSAI_REGEX = /^\d{14}$/;
const ACCT_NO_REGEX = /^\d{8,18}$/;

const clean = (v = "") => String(v).trim();
const onlyDigits = (v = "") => String(v).replace(/\D/g, "");
const upper = (v = "") => String(v).toUpperCase();

/**
 * Upload & save a single VendorDocument (create or update).
 * Since (vendorId, type) is not unique in schema, do findFirst → update or create.
 */
async function upsertVendorDocument({
  vendorId,
  type, // "FSSAI" | "GST" | "PAN" | "AADHAAR"
  idNumberRaw,
  idNumberMasked,
  nameOnDoc,
  businessNameOnDoc,
  expiryDate,
  file, // Multer file object (optional)
}) {
  let fileUrl, mimeType, sizeBytes;

  if (file) {
    const uploaded = await uploadToS3(file, "vendor-docs");
    fileUrl = uploaded;
    mimeType = file.mimetype;
    sizeBytes = file.size;
  }

  const existing = await prisma.vendorDocument.findFirst({
    where: { vendorId, type },
  });

  if (existing) {
    return prisma.vendorDocument.update({
      where: { id: existing.id },
      data: {
        idNumberRaw: idNumberRaw ?? existing.idNumberRaw,
        idNumberMasked: idNumberMasked ?? existing.idNumberMasked,
        nameOnDoc: nameOnDoc ?? existing.nameOnDoc,
        businessNameOnDoc: businessNameOnDoc ?? existing.businessNameOnDoc,
        expiryDate: expiryDate ?? existing.expiryDate,
        fileUrl: fileUrl ?? existing.fileUrl,
        mimeType: mimeType ?? existing.mimeType,
        sizeBytes: sizeBytes ?? existing.sizeBytes,
        status: "PENDING_REVIEW",
      },
    });
  }

  return prisma.vendorDocument.create({
    data: {
      vendorId,
      type,
      idNumberRaw: idNumberRaw ?? null,
      idNumberMasked: idNumberMasked ?? null,
      nameOnDoc: nameOnDoc ?? null,
      businessNameOnDoc: businessNameOnDoc ?? null,
      expiryDate: expiryDate ?? null,
      fileUrl: fileUrl ?? null,
      mimeType: mimeType ?? null,
      sizeBytes: sizeBytes ?? null,
      status: "PENDING_REVIEW",
    },
  });
}

// step 1
export const requestVendorOTP = asyncHandler(async (req, res) => {
  const { email, phone } = req.body;
  if (!email || !phone) {
    throw new ApiError(400, "Email and phone are required");
  }
  // Check if user exists with the same email or phone
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists with this email or phone");
  }

  // Generate OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  // Send OTP email (non-blocking)
  await sendOTPEmail(email, otp, "signup");

  // Store OTP temporarily (do not create user yet)
  await prisma.tempOTP.deleteMany({ where: { email } });
  await prisma.tempOTP.create({
    data: {
      email,
      otp,
      otpExpiry: otpExpiresAt,
    },
  });

  res.status(200).json(new ApiResponse(200, {}, "OTP sent successfully"));
});

// step 2
export const registerVendor = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    otp,
    kitchenName,
    address,
    city,
    latitude,
    longitude,
  } = req.body;

  if (!email || !otp || !kitchenName || !address || !city) {
    throw new ApiError(400, "All fields are required");
  }

  const tempOTP = await prisma.tempOTP.findFirst({ where: { email } });
  if (!tempOTP || tempOTP.otp !== otp || new Date() > tempOTP.otpExpiry) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  let user;
  let vendor;

  try {
    // Create user
    user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: await bcrypt.hash(password, 10),
        role: "VENDOR",
      },
    });

    // Create vendor
    vendor = await prisma.vendor.create({
      data: {
        userId: user.id,
        kitchenName,
        address,
        city,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
    });

    // Delete OTP record after successful registration
    await prisma.tempOTP.deleteMany({ where: { email } });

    const accessToken = jwt.sign(
      { id: user.id, role: user.role, type: "onboard" },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "30m" }
    );

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { user, vendor, accessToken },
          "Vendor registered. Continue to upload documents."
        )
      );
    // Now send vendor approval email asynchronously (non-blocking)
    (async () => {
      try {
        await sendVendorUnderReviewEmail(user.email, user.name);
      } catch (err) {
        console.error("Error sending approval email:", err);
      }
    })();
  } catch (err) {
    // Rollback: If vendor creation fails, delete both user and vendor
    if (user) {
      await prisma.user.delete({ where: { id: user.id } });
    }
    if (vendor) {
      await prisma.vendor.delete({ where: { id: vendor.id } });
    }
    throw new ApiError(
      500,
      "Error during vendor registration. Rolled back changes."
    );
  }
});

/**
 * STEP 3 — Upload documents for verification
 * Accepts any subset of: FSSAI, GST, PAN, AADHAAR
 * Files: fssaiDoc, gstDoc, panDoc, aadhaarDoc
 */
export const uploadVendorDocuments = asyncHandler(async (req, res) => {
  // must be authenticated vendor
  const authUserId = req.user?.id;
  if (!authUserId) throw new ApiError(401, "Unauthorized");

  const vendor = await prisma.vendor.findFirst({
    where: { userId: authUserId },
  });
  if (!vendor) throw new ApiError(404, "Vendor profile not found");

  // Body fields
  const fssaiNumber = onlyDigits(clean(req.body?.fssaiNumber));
  const fssaiExpiry = clean(req.body?.fssaiExpiry); // ISO date or YYYY-MM-DD
  const gstNumber = upper(clean(req.body?.gstNumber));
  const panNumber = upper(clean(req.body?.panNumber));
  const aadhaarNumber = onlyDigits(clean(req.body?.aadhaarNumber));
  const aadhaarLast4Body = onlyDigits(clean(req.body?.aadhaarLast4)); // alt path

  // Files (multer .fields)
  const fssaiFile = req.files?.fssaiDoc?.[0];
  const gstFile = req.files?.gstDoc?.[0];
  const panFile = req.files?.panDoc?.[0];
  const aadhaarFile = req.files?.aadhaarDoc?.[0]; // (front/back allowed; we take first here)

  // Validate softly (only when provided)
  if (fssaiNumber && !FSSAI_REGEX.test(fssaiNumber)) {
    throw new ApiError(400, "Invalid FSSAI license number");
  }
  if (gstNumber && !GST_REGEX.test(gstNumber)) {
    throw new ApiError(400, "Invalid GSTIN");
  }
  if (panNumber && !PAN_REGEX.test(panNumber)) {
    throw new ApiError(400, "Invalid PAN");
  }
  let aadhaarLast4 = null;
  if (aadhaarNumber) {
    if (aadhaarNumber.length !== 12)
      throw new ApiError(400, "Invalid Aadhaar number");
    aadhaarLast4 = aadhaarNumber.slice(-4);
  } else if (aadhaarLast4Body) {
    if (aadhaarLast4Body.length !== 4)
      throw new ApiError(400, "Invalid Aadhaar last 4");
    aadhaarLast4 = aadhaarLast4Body;
  }

  // Prepare DB ops
  const docResults = [];

  // FSSAI
  if (fssaiNumber || fssaiFile || fssaiExpiry) {
    const expiryDate = fssaiExpiry ? new Date(fssaiExpiry) : null;
    const saved = await upsertVendorDocument({
      vendorId: vendor.id,
      type: "FSSAI",
      idNumberRaw: fssaiNumber || null,
      idNumberMasked: fssaiNumber
        ? `${fssaiNumber.slice(0, 4)}-****-****-${fssaiNumber.slice(-2)}`
        : null,
      businessNameOnDoc: clean(req.body?.fssaiBusinessName) || null,
      expiryDate,
      file: fssaiFile,
    });
    docResults.push({ type: "FSSAI", id: saved.id, status: saved.status });
  }

  // GST
  if (gstNumber || gstFile) {
    const saved = await upsertVendorDocument({
      vendorId: vendor.id,
      type: "GST",
      idNumberRaw: gstNumber || null,
      idNumberMasked: gstNumber
        ? `${gstNumber.slice(0, 7)}****${gstNumber.slice(-3)}`
        : null,
      businessNameOnDoc: clean(req.body?.gstLegalName) || null,
      file: gstFile,
    });
    docResults.push({ type: "GST", id: saved.id, status: saved.status });
  }

  // PAN
  if (panNumber || panFile) {
    const saved = await upsertVendorDocument({
      vendorId: vendor.id,
      type: "PAN",
      idNumberRaw: panNumber || null,
      idNumberMasked: panNumber
        ? `${panNumber.slice(0, 2)}***${panNumber.slice(5)}`
        : null,
      nameOnDoc: clean(req.body?.panName) || null,
      file: panFile,
    });
    docResults.push({ type: "PAN", id: saved.id, status: saved.status });
  }

  // AADHAAR (store only last4 in Vendor; never persist full 12 here)
  if (aadhaarLast4 || aadhaarFile) {
    const masked = aadhaarLast4 ? `XXXX-XXXX-${aadhaarLast4}` : null;
    const saved = await upsertVendorDocument({
      vendorId: vendor.id,
      type: "AADHAAR",
      idNumberRaw: null, // DO NOT store full aadhaar
      idNumberMasked: masked,
      nameOnDoc: clean(req.body?.aadhaarName) || null,
      file: aadhaarFile,
    });
    docResults.push({ type: "AADHAAR", id: saved.id, status: saved.status });
  }

  // If nothing submitted
  if (docResults.length === 0) {
    throw new ApiError(400, "No document data provided");
  }

  // Update quick-access fields on Vendor
  const vendorUpdate = {};
  if (fssaiNumber) vendorUpdate.fssaiLicenseNumber = fssaiNumber;
  if (gstNumber) vendorUpdate.gstNumber = gstNumber;
  if (panNumber) vendorUpdate.pan = panNumber;
  if (aadhaarLast4) vendorUpdate.aadhaarLast4 = aadhaarLast4;

  let updatedVendor = vendor;
  if (Object.keys(vendorUpdate).length > 0) {
    updatedVendor = await prisma.vendor.update({
      where: { id: vendor.id },
      data: vendorUpdate,
    });
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { vendor: updatedVendor, documents: docResults },
        "Documents uploaded. Pending review."
      )
    );
});

// STEP 4 — Add / Update bank details
export const addBankDetails = asyncHandler(async (req, res) => {
  // must be authenticated vendor
  const authUserId = req.user?.id;
  if (!authUserId) throw new ApiError(401, "Unauthorized");

  const vendor = await prisma.vendor.findFirst({
    where: { userId: authUserId },
  });
  if (!vendor) throw new ApiError(404, "Vendor profile not found");

  const {
    accountHolderName,
    accountNumber,
    ifscCode,
    bankName,
    branchName,
    accountType, // "SAVINGS" | "CURRENT" (optional)
    upiId, // optional
  } = req.body;

  // Basic validations
  if (
    !clean(accountHolderName) ||
    !clean(accountNumber) ||
    !clean(ifscCode) ||
    !clean(bankName)
  ) {
    throw new ApiError(
      400,
      "accountHolderName, accountNumber, ifscCode, bankName are required"
    );
  }

  const acctNumDigits = onlyDigits(accountNumber);
  if (!ACCT_NO_REGEX.test(acctNumDigits)) {
    throw new ApiError(400, "Invalid account number");
  }
  const ifsc = upper(ifscCode);
  if (!IFSC_REGEX.test(ifsc)) {
    throw new ApiError(400, "Invalid IFSC code");
  }

  // Optional cheque upload (multer single)
  let cancelledChequeUrl = null;
  if (req.file) {
    const uploaded = await uploadToS3(req.file, "vendor-bank");
    cancelledChequeUrl = uploaded;
  }

  const payload = {
    vendorId: vendor.id,
    accountHolderName: clean(accountHolderName),
    accountNumber: acctNumDigits, // keep as string
    ifscCode: ifsc,
    bankName: clean(bankName),
    branchName: clean(branchName) || null,
    accountType: accountType === "CURRENT" ? "CURRENT" : "SAVINGS",
    upiId: clean(upiId) || null,
    verificationStatus: "UNVERIFIED",
    cancelledChequeUrl: cancelledChequeUrl || undefined,
    verifiedAt: null,
  };

  // Upsert on vendorId (unique)
  const bankAccount = await prisma.bankAccount.upsert({
    where: { vendorId: vendor.id },
    create: payload,
    update: payload,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { bankAccount },
        "Bank details saved. Verification pending."
      )
    );
});

export const approveVendor = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  // find vendor accounts..
  const vendor = await prisma.vendor.findFirst({
    where: {
      userId: userId,
    },
    include: {
      bankAccount: true,
      VendorDocument: true,
    },
  });

  if (!vendor) {
    throw new ApiError(404, "Vendor not found");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isApproved: true },
  });

  //mark verified all the docs of this vendor
  if (vendor.VendorDocument.length > 0) {
    await prisma.vendorDocument.updateMany({
      where: { vendorId: vendor.id },
      data: { status: "VERIFIED" },
    });
  }
  if (vendor.bankAccount) {
    await prisma.bankAccount.update({
      where: { vendorId: vendor.id },
      data: { verificationStatus: "VERIFIED", verifiedAt: new Date() },
    });
  }

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, [], "Vendor approved successfully"));
  // Send email notification
  try {
    const { sendPushNotification } = await import("../services/pushNotification.service.js"); // lazy import or top-level if ESM
    await sendVendorApprovedEmail(user.email, user.name);
    // FCM Notification
    sendPushNotification(
      user.id,
      "Account Approved",
      "Your vendor account has been approved! You can now accept orders.",
      { type: "VENDOR_APPROVED" }
    );
  } catch (error) {
    console.error("Error sending email/notification:", error);
  }
});

export const getProductsByVendor = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const vendor = await prisma.vendor.findFirst({
    where: {
      userId: userId,
    },
    include: {
      products: {
        where: { isDeleted: false },
        include: {
          category: true,
          images: true,
          weights: true,
          reviews: true,
          Nutrition: true,
          keywords: true,
        },
      },
    },
  });

  if (!vendor) {
    throw new ApiError(404, "Vendor not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, vendor.products, "Products retrieved successfully")
    );
});

export const deleteVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const vendor = await prisma.vendor.findUnique({ where: { id } });

  if (!vendor) {
    throw new ApiError(404, "Vendor not found");
  }
  // Delete the user (which will also delete the vendor via onDelete: Cascade)
  await prisma.user.delete({
    where: { id: vendor.userId },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Vendor deleted successfully"));
});

export const updateVendor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    phone,
    kitchenName,
    address,
    city,
    latitude,
    longitude,
    openTime,
    closeTime,
    secondaryEmail,
  } = req.body;

  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!vendor) {
    throw new ApiError(404, "Vendor not found");
  }

  // ===========================
  // 📸 Handle image uploads
  // ===========================
  let profileImage = vendor.user.profileImage;
  let publicId = vendor.user.publicId;
  let coverImage = vendor.coverImage;
  let coverPublicId = vendor.coverPublicId;

  //     Upload new profile image (if provided)
  if (req.files?.profileImage?.[0]) {
    const uploadedProfile = await uploadToS3(
      req.files.profileImage[0],
      "users"
    );
    profileImage = uploadedProfile;
    publicId = uploadedProfile.split("/").pop();
  }

  //     Upload new cover image (if provided)
  if (req.files?.coverImage?.[0]) {
    const uploadedCover = await uploadToS3(req.files.coverImage[0], "vendors");
    coverImage = uploadedCover;
    coverPublicId = uploadedCover.split("/").pop();
  }

  //Update User (only if needed)
  const userUpdateData = {
    ...(name?.trim() && { name: name.trim() }),
    ...(phone?.trim() && { phone: phone.trim() }),
    ...(profileImage && { profileImage }),
    ...(publicId && { publicId }),
  };

  if (Object.keys(userUpdateData).length > 0) {
    await prisma.user.update({
      where: { id: vendor.userId },
      data: userUpdateData,
    });
  }

  // Update Vendor (only provided fields)
  const vendorUpdateData = {
    ...(kitchenName?.trim() && { kitchenName: kitchenName.trim() }),
    ...(address?.trim() && { address: address.trim() }),
    ...(city?.trim() && { city: city.trim() }),
    ...(latitude && { latitude: parseFloat(latitude) }),
    ...(longitude && { longitude: parseFloat(longitude) }),
    ...(openTime?.trim() && { openTime: openTime.trim() }),
    ...(closeTime?.trim() && { closeTime: closeTime.trim() }),
    ...(coverImage && { coverImage }),
    ...(coverPublicId && { coverPublicId }),
    ...(secondaryEmail && { secondaryEmail: secondaryEmail }),
    updatedAt: new Date(),
  };

  const updatedVendor = await prisma.vendor.update({
    where: { id },
    data: vendorUpdateData,
    include: { user: true },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedVendor,
        "Vendor profile updated successfully (only provided fields)"
      )
    );
});

export const getVendorById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const vendor = await prisma.vendor.findUnique({
    where: { userId: id },
    include: {
      user: true,
      VendorDocument: true,
      bankAccount: true,
      phoneNumbers: true,
    },
  });

  if (!vendor) {
    throw new ApiError(404, "Vendor not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, vendor, "Vendor profile fetched successfully"));
});

export const getCustomersByVendor = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true },
  });
  const vendorId = vendor.id;

  if (!vendorId) {
    return res
      .status(403)
      .json(
        new ApiResponse(
          403,
          null,
          "Access denied: Only vendors can view this data."
        )
      );
  }

  // Step 1: Get all Orders by vendorId
  const orders = await prisma.order.findMany({
    where: { vendorId },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: true,
            },
          },
          Weight: true,
        },
      },
      address: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          profileImage: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  //get unique customers list with all details
  const uniqueCustomers = orders.reduce((acc, order) => {
    const customer = order.user;
    if (!acc.some((c) => c.id === customer.id)) {
      acc.push(customer);
    }
    return acc;
  }, []);
  //now i want to add orders array to each customer where vendorId is the same and user has this orders which is purchased from this vendor
  //find orders from orders array based on customer id and user.id and add to uniqueCustomers array
  orders.forEach((order) => {
    const customer = uniqueCustomers.find((c) => c.id === order.user.id);
    if (customer) {
      customer.orders = customer.orders || [];
      // Clone the order and remove the .user reference to prevent circular structure
      const orderClone = { ...order };
      delete orderClone.user;
      customer.orders.push(orderClone);
    }
  });

  return res
    .status(200)
    .json(new ApiResponse(200, uniqueCustomers, "Customer details retrieved"));
});

export const getAllVendorKitchens = asyncHandler(async (req, res) => {
  const data = await prisma.user.findMany({
    where: {
      isApproved: true,
      role: "VENDOR",
      vendor: {
        isNot: null, //     correct syntax
      },
    },
    include: {
      vendor: true,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, data, "Vendors fetched successfully"));
});

export const getKitchenById = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: { user: true },
  });

  if (!vendor) {
    throw new ApiError(404, "Vendor not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, vendor, "kitchen profile fetched successfully"));
});

export const toggleVendorStatus = asyncHandler(async (req, res) => {
  const vendorId = req.user.vendor?.id;
  const { isOpen } = req.body;

  const updated = await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      isOpen,
      lastStatusChange: new Date(),
    },
  });

  res.json({ success: true, vendor: updated });
});

// Add these to your vendor.controller.js

export const requestEmailChangeOTP = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { newEmail } = req.body;

  if (!userId || !newEmail) {
    throw new ApiError(400, "Vendor ID and new email are required");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    throw new ApiError(400, "Invalid email format");
  }

  // Get current vendor
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check if new email is same as current email
  if (user.email === newEmail) {
    throw new ApiError(400, "New email cannot be same as current email");
  }

  // Check if email already exists with another user
  const existingUser = await prisma.user.findFirst({
    where: {
      email: newEmail,
    },
  });

  if (existingUser) {
    throw new ApiError(409, "Email already exists in another account");
  }

  // Generate 6 digit OTP
  const otp = Math.floor(100000 + Math.random() * 9000).toString();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  // Send OTP to new email (non-blocking)
  await sendOTPEmail(newEmail, otp, "email-change");

  // Store OTP temporarily for email change
  await prisma.tempOTP.deleteMany({ where: { email: newEmail } });

  await prisma.tempOTP.create({
    data: {
      email: newEmail,
      otp,
      otpExpiry: otpExpiresAt,
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, null, "OTP sent successfully to new email address")
    );
});

export const verifyEmailChange = asyncHandler(async (req, res) => {
  const { newEmail, otp } = req.body;
  const userId = req.user.id;

  if (!userId || !newEmail || !otp) {
    throw new ApiError(400, "User ID, email and OTP are required");
  }

  // Find the stored OTP
  const storedOTP = await prisma.tempOTP.findFirst({
    where: {
      email: newEmail,
      otp,
      otpExpiry: { gt: new Date() },
    },
  });

  if (!storedOTP) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  // Update user email
  const updatedVendor = await prisma.user.update({
    where: { id: userId },
    data: { email: newEmail },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  // Clean up used OTP
  await prisma.tempOTP.delete({
    where: { email: newEmail },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        vendor: updatedVendor,
        message: "Email updated successfully",
      },
      "Email updated successfully"
    )
  );
});

export const updatePayoutDetails = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;

  const { newPaidAmount, totalEarnings } = req.body;

  const vendor = await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      amountReceived: newPaidAmount,
      totalEarnings: totalEarnings,
      amountPending: Math.max(totalEarnings - newPaidAmount, 0),
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, vendor, "Payout details updated successfully"));
});

// 📞 Add vendor phone number
export const addVendorPhone = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { phone, label, isPrimary } = req.body;

  if (!phone || !phone.trim()) {
    throw new ApiError(400, "Phone number is required");
  }

  // Get vendor
  const vendor = await prisma.vendor.findFirst({ where: { userId } });
  if (!vendor) {
    throw new ApiError(404, "Vendor not found");
  }

  // Check if vendor already has 5 phone numbers
  const phoneCount = await prisma.vendorPhone.count({
    where: { vendorId: vendor.id },
  });

  if (phoneCount >= 5) {
    throw new ApiError(400, "Maximum 5 phone numbers allowed per vendor");
  }

  // If marking as primary, unset other primary phones
  if (isPrimary) {
    await prisma.vendorPhone.updateMany({
      where: { vendorId: vendor.id },
      data: { isPrimary: false },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { phone: phone.trim() },
    });
  }

  const vendorPhone = await prisma.vendorPhone.create({
    data: {
      vendorId: vendor.id,
      phone: phone.trim(),
      label: label?.trim() || null,
      isPrimary: isPrimary || false,
    },
  });

  res
    .status(201)
    .json(new ApiResponse(201, vendorPhone, "Phone number added successfully"));
});

// 📞 Get all vendor phone numbers (including primary from user.phone)
export const getVendorPhones = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const vendor = await prisma.vendor.findFirst({
    where: { userId },
    include: {
      user: { select: { phone: true } },
      phoneNumbers: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!vendor) {
    throw new ApiError(404, "Vendor not found");
  }

  const response = {
    primaryPhone: vendor.user.phone, // From User table
    additionalPhones: vendor.phoneNumbers,
  };

  res
    .status(200)
    .json(new ApiResponse(200, response, "Phone numbers fetched successfully"));
});

// 📞 Update vendor phone number
export const updateVendorPhone = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params; // phone record ID
  const { phone, label, isPrimary } = req.body;

  const vendor = await prisma.vendor.findFirst({ where: { userId } });
  if (!vendor) {
    throw new ApiError(404, "Vendor not found");
  }

  // Check if phone record exists and belongs to this vendor
  const existingPhone = await prisma.vendorPhone.findFirst({
    where: { id, vendorId: vendor.id },
  });

  if (!existingPhone) {
    throw new ApiError(404, "Phone number not found");
  }

  // If marking as primary, unset others
  if (isPrimary) {
    await prisma.vendorPhone.updateMany({
      where: { vendorId: vendor.id, id: { not: id } },
      data: { isPrimary: false },
    });
  }

  const updatedPhone = await prisma.vendorPhone.update({
    where: { id },
    data: {
      ...(phone?.trim() && { phone: phone.trim() }),
      ...(label !== undefined && { label: label?.trim() || null }),
      ...(isPrimary !== undefined && { isPrimary }),
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, updatedPhone, "Phone number updated successfully")
    );
});

// 📞 Delete vendor phone number
export const deleteVendorPhone = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const vendor = await prisma.vendor.findFirst({ where: { userId } });
  if (!vendor) {
    throw new ApiError(404, "Vendor not found");
  }

  // Check if phone exists and belongs to vendor
  const phone = await prisma.vendorPhone.findFirst({
    where: { id, vendorId: vendor.id },
  });

  if (!phone) {
    throw new ApiError(404, "Phone number not found");
  }

  await prisma.vendorPhone.delete({ where: { id } });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Phone number deleted successfully"));
});
