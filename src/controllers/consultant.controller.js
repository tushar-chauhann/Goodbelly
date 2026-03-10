import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  notifyOpsConsultantIntake,
  sendConsultantIntakeEmail,
  sendConsultantVerifiedEmail,
  sendOTPEmail,
} from "../utils/mail.service.js";
import { uploadToS3 } from "../utils/s3.js";
import { deleteFromS3 } from "../utils/s3Delete.js";

const updateFcmToken = asyncHandler(async (req, res) => {
  const userId = req.consultant.id;
  const { fcmToken } = req.body;

  if (!fcmToken) {
    throw new ApiError(400, "FCM Token is required");
  }

  const consultant = await prisma.consultant.findUnique({ where: { id: userId } });
  if (!consultant) throw new ApiError(404, "Consultant not found");

  let assocData = {};
  if (consultant.professionalAssociations) {
    try {
      assocData = JSON.parse(consultant.professionalAssociations);
      if (typeof assocData !== 'object') {
        assocData = { original: consultant.professionalAssociations };
      }
    } catch (e) {
      assocData = { original: consultant.professionalAssociations };
    }
  }

  assocData.fcmToken = fcmToken;

  await prisma.consultant.update({
    where: { id: userId },
    data: { professionalAssociations: JSON.stringify(assocData) },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "FCM Token updated successfully"));
});

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCT_NO_REGEX = /^\d{8,18}$/;

const clean = (v = "") => String(v).trim();
const onlyDigits = (v = "") => String(v).replace(/\D/g, "");
const upper = (v = "") => String(v).toUpperCase();

const parseJSONSafe = (val, fallback = null) => {
  if (val == null) return fallback;
  if (Array.isArray(val) || typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

const registerConsultant = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    city,
    password,
    credentials,
    specialization,
    rating,
    reviewCount,
    experience,
    location,
    clinic,
    bio,
    approach,
    durations,
    languages,
    focusAreas,
    availability,
    highlights,
    tagline,
    professionalAssociations,
    allowInstantCall,
    consultantTypes,
  } = req.body;

  if (!name || !email || !phone || !password) {
    throw new ApiError(400, "name, email, phone, and password are required");
  }

  // Uniqueness checks
  const existingByEmail = await prisma.consultant.findUnique({
    where: { email },
  });
  if (existingByEmail) throw new ApiError(409, "Email already registered");
  const existingByPhone = await prisma.consultant.findFirst({
    where: { phone },
  });
  if (existingByPhone) throw new ApiError(409, "Phone already registered");

  const username = email.split("@")[0];
  const existingByUsername = await prisma.consultant.findUnique({
    where: { username },
  });
  if (existingByUsername)
    throw new ApiError(409, "Username already taken try different email");

  // Parse arrays
  const _durations = parseJSONSafe(durations, []);
  const _languages = parseJSONSafe(languages, []);
  const _focusAreas = parseJSONSafe(focusAreas, []);
  const _availability = parseJSONSafe(availability, []);
  const _highlights = parseJSONSafe(highlights, []);
  const _consultantTypes = parseJSONSafe(consultantTypes, []);

  const durationCreates = _durations
    .filter(
      (d) => d && (d.code || d.id) && d.label && (d.price ?? d.price === 0)
    )
    .map((d) => ({
      code: String(d.code ?? d.id).trim(),
      label: String(d.label).trim(),
      price: Number(d.price),
    }));

  // ✅ Profile image upload
  let imageUrl = null;
  let imagePublicId = null;
  if (req.files?.profileImage?.length) {
    const uploaded = await uploadToS3(req.files.profileImage[0], "consultants");
    imageUrl = uploaded;
    imagePublicId = uploaded.split("/").pop();
  }

  // ✅ Certification uploads (MANDATORY)
  if (!req.files?.certifications || req.files.certifications.length === 0) {
    throw new ApiError(400, "At least one certification file is required");
  }

  const certUploads = await Promise.all(
    req.files.certifications.map(async (file) => {
      const uploaded = await uploadToS3(file, "certifications");
      return {
        name: file.originalname,
        document: uploaded,
      };
    })
  );

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  const created = await prisma.$transaction(async (tx) => {
    const consultant = await tx.consultant.create({
      data: {
        name,
        username,
        email,
        phone,
        city: city || null,
        password: passwordHash,
        credentials: credentials || null,
        specialization: specialization || null,
        rating: rating ? Number(rating) : 0,
        reviewCount: reviewCount ? Number(reviewCount) : 0,
        experience: experience || null,
        location: location || null,
        clinic: clinic || null,
        tagline: tagline || null,
        professionalAssociations: professionalAssociations || null,
        profileImage: imageUrl,
        publicId: imagePublicId,
        bio: bio || null,
        approach: approach || null,
        allowInstantCall:
          allowInstantCall === "true" || allowInstantCall === true, // ✅ convert string to boolean

        durations: durationCreates.length
          ? { create: durationCreates }
          : undefined,
        languages: _languages.length
          ? { create: _languages.map((l) => ({ language: String(l).trim() })) }
          : undefined,
        focusAreas: _focusAreas.length
          ? { create: _focusAreas.map((x) => ({ label: String(x).trim() })) }
          : undefined,
        availability: _availability.length
          ? {
            create: _availability.map((s) => ({
              timeSlot: String(s.timeSlot).trim(),
              dayOfWeek: String(s.dayOfWeek).trim(),
            })),
          }
          : undefined,
        highlights: _highlights.length
          ? {
            create: _highlights.map((h) => ({ highlight: String(h).trim() })),
          }
          : undefined,
        certifications: { create: certUploads },
        consultantTypes: _consultantTypes.length
          ? { create: _consultantTypes.map((role) => ({ role })) }
          : undefined, // ✅
      },
      include: {
        durations: true,
        languages: true,
        focusAreas: true,
        availability: true,
        highlights: true,
        certifications: true,
        consultantTypes: true,
      },
    });

    return consultant;
  });

  res
    .status(201)
    .json(new ApiResponse(201, created, "Consultant registered successfully"));

  // Fire-and-forget emails (don't block the response)
  (async () => {
    try {
      await sendConsultantIntakeEmail({
        email: created.email,
        name: created.name,
        specialization: created.specialization || undefined,
        consultantTypes: (created.consultantTypes || []).map((t) => t.role),
        city: created.city || undefined,
        allowInstantCall: !!created.allowInstantCall,
      });

      await notifyOpsConsultantIntake({
        name: created.name,
        email: created.email,
        phone: created.phone,
        city: created.city || undefined,
        specialization: created.specialization || undefined,
        consultantTypes: (created.consultantTypes || []).map((t) => t.role),
        allowInstantCall: !!created.allowInstantCall,
        certCount: (created.certifications || []).length,
      });
    } catch (err) {
      console.error("Consultant intake email error:", err);
    }
  })();
});

const addBankDetails = asyncHandler(async (req, res) => {
  // must be authenticated vendor
  const id = req.consultant.id;
  if (!id) throw new ApiError(401, "Unauthorized");

  const consultant = await prisma.consultant.findUnique({
    where: { id },
  });
  if (!consultant) throw new ApiError(404, "Consultant profile not found");

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

  const payload = {
    consultantId: consultant.id,
    accountHolderName: clean(accountHolderName),
    accountNumber: acctNumDigits, // keep as string
    ifscCode: ifsc,
    bankName: clean(bankName),
    branchName: clean(branchName) || null,
    accountType: accountType === "CURRENT" ? "CURRENT" : "SAVINGS",
    upiId: clean(upiId) || null,
  };

  // Upsert on consultantId (unique)
  const bankAccount = await prisma.bankAccount.upsert({
    where: { consultantId: consultant.id },
    create: payload,
    update: payload,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { bankAccount }, "Bank details saved."));
});

const updateAvailability = asyncHandler(async (req, res) => {
  const consultantId = req.consultant?.id;
  if (!consultantId) throw new ApiError(401, "Unauthorized");

  const consultant = await prisma.consultant.findUnique({
    where: { id: consultantId },
  });
  if (!consultant) throw new ApiError(404, "Consultant profile not found");

  const { availability } = req.body; // expected array of { dayOfWeek, timeSlot[] } or flat array

  if (!availability || !Array.isArray(availability)) {
    throw new ApiError(400, "Availability array is required");
  }

  // Normalize the input (handle if times come nested under days)
  let normalized = [];
  for (const item of availability) {
    if (Array.isArray(item.timeSlot)) {
      item.timeSlot.forEach((t) => {
        normalized.push({ dayOfWeek: item.dayOfWeek, timeSlot: t });
      });
    } else if (item.timeSlot) {
      normalized.push({ dayOfWeek: item.dayOfWeek, timeSlot: item.timeSlot });
    }
  }

  // 🧹 Delete all old availability slots for this consultant
  await prisma.consultationAvailability.deleteMany({
    where: { consultantId },
  });

  // 🆕 Create new availability slots
  if (normalized.length > 0) {
    await prisma.consultationAvailability.createMany({
      data: normalized.map((slot) => ({
        consultantId,
        dayOfWeek: slot.dayOfWeek,
        timeSlot: slot.timeSlot,
      })),
    });
  }

  // ✅ Return updated consultant with fresh availability
  const updatedConsultant = await prisma.consultant.findUnique({
    where: { id: consultantId },
    include: { availability: true },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedConsultant,
        "Consultant availability updated successfully"
      )
    );
});

const loginConsultant = asyncHandler(async (req, res) => {
  const { email, phone, password } = req.body;

  if (!(email || phone)) {
    throw new ApiError(400, "Email or phone is required");
  }

  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  // Find the consultant by email or phone
  const consultant = await prisma.consultant.findFirst({
    where: {
      OR: [{ email: email || undefined }, { phone: phone || undefined }],
    },
  });

  if (!consultant) {
    throw new ApiError(404, "Consultant does not exist");
  }

  const isPasswordValid = await bcrypt.compare(password, consultant.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Incorrect Password");
  }

  const accessToken = jwt.sign(
    { id: consultant.id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );

  //remove password from consultant object
  delete consultant.password;

  return res
    .status(200)
    .cookie("accessToken", accessToken, { httpOnly: true, secure: true })
    .json({
      consultant,
      message: "Consultant logged in successfully",
    });
});

const deleteConsultant = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.consultant.findUnique({
    where: { id },
    select: { publicId: true },
  });

  if (!existing) throw new ApiError(404, "Consultant not found");

  if (existing.publicId) {
    await deleteFromS3(existing.publicId);
  }

  await prisma.consultant.delete({ where: { id } });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Consultant deleted successfully"));
});

const getConsultantById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.user?.role === "ADMIN") {
    const data = await prisma.consultant.findUnique({
      where: { username: id },
      include: {
        durations: true,
        languages: true,
        focusAreas: true,
        availability: true,
        highlights: true,
        certifications: true,
        consultantTypes: true,
        bankDetails: true,
        reviews: {
          where: {
            isVerified: true, // ✅ Only include verified reviews
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
      },
    });
    if (!data) throw new ApiError(404, "Consultant not found");
    return res
      .status(200)
      .json(new ApiResponse(200, data, "Consultant retrieved successfully"));
  }

  const data = await prisma.consultant.findUnique({
    where: { username: id, isVerified: true },
    include: {
      durations: true,
      languages: true,
      focusAreas: true,
      availability: true,
      highlights: true,
      bankDetails: true,
      certifications: true,
      consultantTypes: true,
      reviews: {
        where: {
          isVerified: true, // ✅ Only include verified reviews
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
    },
  });
  if (!data) throw new ApiError(404, "Consultant not found");
  return res
    .status(200)
    .json(new ApiResponse(200, data, "Consultant retrieved successfully"));
});

const updateConsultant = asyncHandler(async (req, res) => {
  const id = req.consultant.id;

  //check consultant exists
  const consultant = await prisma.consultant.findUnique({
    where: { id },
  });

  if (!consultant) {
    throw new ApiError(404, "Consultant does not exist");
  }
  const {
    name,
    phone,
    password,
    tagline,
    experience,
    credentials,
    specialization,
    bio,
    isActive,
  } = req.body;
  let hashedPassword = null;
  if (password) hashedPassword = await bcrypt.hash(password, 10);

  const dataToUpdate = {
    ...(name && { name }),
    ...(phone && { phone }),
    ...(password && { password: hashedPassword }),
    ...(tagline && { tagline }),
    ...(experience && { experience }),
    ...(credentials && { credentials }),
    ...(specialization && { specialization }),
    ...(bio && { bio }),
    ...(isActive && { isActive: isActive === "true" ? true : false }),
  };

  if (req.file) {
    const uploadedImage = await uploadToS3(req.file, "users");
    const profileUrl = uploadedImage || "";
    const publicId = uploadedImage.split("/").pop() || "";
    dataToUpdate.profileImage = profileUrl;
    dataToUpdate.publicId = publicId;
  }

  const data = await prisma.consultant.update({
    where: { id },
    data: dataToUpdate,
  });
  return res
    .status(200)
    .json(new ApiResponse(200, data, "Consultant updated successfully"));
});

const listConsultants = asyncHandler(async (req, res) => {
  if (req.user?.role == "ADMIN") {
    const data = await prisma.consultant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        durations: true,
        languages: true,
        focusAreas: true,
        availability: true,
        highlights: true,
      },
    });
    return res
      .status(200)
      .json(
        new ApiResponse(200, data, "All Consultants retrieved successfully")
      );
  }

  const data = await prisma.consultant.findMany({
    where: { isVerified: true },
    orderBy: { createdAt: "desc" },
    include: {
      durations: true,
      languages: true,
      focusAreas: true,
      availability: true,
      highlights: true,
    },
  });
  return res
    .status(200)
    .json(
      new ApiResponse(200, data, "Verified Consultants retrieved successfully")
    );
});

const verifyUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const data = await prisma.consultant.findUnique({
    where: { username },
  });
  if (!data) throw new ApiError(404, "Consultant not found");
  //verify the consultant
  await prisma.consultant.update({
    where: { username },
    data: { isVerified: true },
  });
  res
    .status(200)
    .json(new ApiResponse(200, null, "Consultant verified successfully"));

  // Send email to the consultant about the verification
  try {
    await sendConsultantVerifiedEmail(data.email, data.name);
    console.log(`Verification email sent to ${data.email}`);
  } catch (err) {
    console.error("Error sending verification email/notification:", err);
  }
});

const sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const consultant = await prisma.consultant.findUnique({
    where: { email },
  });

  if (!consultant) {
    throw new ApiError(404, "consultant not found");
  }

  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

  //delete old OTPs if any for this email
  await prisma.tempOTP.deleteMany({
    where: { email },
  });
  //hash the OTP before storing
  const hashedOTP = await bcrypt.hash(otp, 10);

  // Save OTP and its expiry in the database
  await prisma.tempOTP.create({
    data: {
      email,
      otp: hashedOTP,
      otpExpiry,
    },
  });

  // Send OTP via email
  try {
    const response = await sendOTPEmail(email, otp, "reset");
    console.log(response);
    return res
      .status(200)
      .json(new ApiResponse(200, { message: "OTP sent successfully" }));
  } catch (error) {
    throw new ApiError(500, "Failed to send OTP email");
  }
});

const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  //find OTP from database and compare hashed OTP
  const tempOTP = await prisma.tempOTP.findFirst({
    where: { email },
  });

  if (!tempOTP) {
    throw new ApiError(404, "OTP not found");
  }

  const isOTPValid = await bcrypt.compare(otp, tempOTP.otp);
  if (!isOTPValid || new Date() > tempOTP.otpExpiry) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { message: "OTP verified successfully" }));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    throw new ApiError(400, "Email, OTP, and new password are required");
  }

  const user = await prisma.consultant.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }
  //find OTP from database and compare hashed OTP
  const tempOTP = await prisma.tempOTP.findFirst({
    where: { email },
  });

  if (!tempOTP) {
    throw new ApiError(404, "OTP not found");
  }

  const isOTPValid = await bcrypt.compare(otp, tempOTP.otp);
  if (!isOTPValid || new Date() > tempOTP.otpExpiry) {
    throw new ApiError(400, "Invalid or expired OTP");
  }

  // Optional: delete OTP after verification
  await prisma.tempOTP.delete({ where: { email } });
  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update user password
  await prisma.consultant.update({
    where: { email },
    data: {
      password: hashedPassword,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { message: "Password reset successfully" }));
});

const updateConsultantDurations = asyncHandler(async (req, res) => {
  const consultantId = req.consultant.id;

  if (!consultantId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { durations } = req.body;

  // Validate input
  if (!durations || !Array.isArray(durations) || durations.length === 0) {
    throw new ApiError(400, "Durations array is required and cannot be empty");
  }

  // Validate each duration object
  for (const [index, duration] of durations.entries()) {
    if (!duration.code || !duration.label || duration.price === undefined) {
      throw new ApiError(
        400,
        `Duration at index ${index} is missing required fields: code, label, or price`
      );
    }

    if (typeof duration.price !== "number" || duration.price < 0) {
      throw new ApiError(
        400,
        `Duration at index ${index} has invalid price. Price must be a non-negative number`
      );
    }

    if (typeof duration.code !== "string" || duration.code.trim() === "") {
      throw new ApiError(400, `Duration at index ${index} has invalid code`);
    }

    if (typeof duration.label !== "string" || duration.label.trim() === "") {
      throw new ApiError(400, `Duration at index ${index} has invalid label`);
    }
  }

  // Use transaction to delete existing and create new durations
  const result = await prisma.$transaction(async (tx) => {
    // Delete existing durations for this consultant
    await tx.consultationDuration.deleteMany({
      where: { consultantId },
    });

    // Create new durations
    await tx.consultationDuration.createMany({
      data: durations.map((duration) => ({
        consultantId,
        code: duration.code.trim(),
        label: duration.label.trim(),
        price: duration.price,
      })),
      skipDuplicates: true,
    });

    // Fetch the updated consultant with durations
    const updatedConsultant = await tx.consultant.findUnique({
      where: { id: consultantId },
      include: {
        durations: {
          select: {
            id: true,
            code: true,
            label: true,
            price: true,
          },
        },
      },
    });

    return updatedConsultant;
  });

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Durations updated successfully"));
});

// GET /consultants/top
const getTopConsultants = asyncHandler(async (req, res) => {
  const topConsultants = await prisma.consultant.findMany({
    where: { isPinned: true },
    orderBy: { order: "asc" },
    take: 3,
    include: {
      durations: true,
      languages: true,
      focusAreas: true,
      availability: true,
      highlights: true,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, topConsultants, "Top consultants fetched"));
});

const pinConsultant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isPinned, order } = req.body;

  // Validate when pinning
  if (isPinned) {
    if (![1, 2, 3].includes(order)) {
      throw new ApiError(400, "Order must be 1, 2, or 3");
    }

    // Count already pinned consultants
    const pinnedCount = await prisma.consultant.count({
      where: { isPinned: true },
    });

    if (pinnedCount >= 3) {
      throw new ApiError(400, "You can only pin up to 3 consultants");
    }

    // Check if order number is already assigned
    const existingOrder = await prisma.consultant.findFirst({
      where: { order },
    });

    if (existingOrder) {
      throw new ApiError(
        400,
        `Position ${order} is already assigned to another consultant`
      );
    }
  }

  // Update consultant pin status
  const updatedConsultant = await prisma.consultant.update({
    where: { id },
    data: {
      isPinned,
      order: isPinned ? order : null, // remove order if unpinned
    },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedConsultant,
        `Consultant ${isPinned ? "pinned" : "unpinned"} successfully`
      )
    );
});

export {
  registerConsultant,
  deleteConsultant,
  getConsultantById,
  listConsultants,
  verifyUsername,
  loginConsultant,
  updateConsultant,
  sendOTP,
  verifyOTP,
  resetPassword,
  addBankDetails,
  updateAvailability,
  updateConsultantDurations,
  pinConsultant,
  getTopConsultants,
  updateFcmToken,
};
