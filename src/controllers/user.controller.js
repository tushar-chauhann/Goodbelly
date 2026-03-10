import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendOTPEmail } from "../utils/mail.service.js";
import { uploadToS3 } from "../utils/s3.js";

const updateFcmToken = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { fcmToken } = req.body;

  if (!fcmToken) {
    throw new ApiError(400, "FCM Token is required");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  let preferenceData = {};
  if (user.preference) {
    try {
      // Try to parse existing data
      preferenceData = JSON.parse(user.preference);
      // If it's just a string or not an object, valid? 
      // If the existing preference is a simple string (e.g. "Vegan"), preserve it
      if (typeof preferenceData !== 'object') {
        preferenceData = { original: user.preference };
      }
    } catch (e) {
      // If parse fails, it's likely a simple string
      preferenceData = { original: user.preference };
    }
  }

  // Update token
  preferenceData.fcmToken = fcmToken;

  await prisma.user.update({
    where: { id: userId },
    data: { preference: JSON.stringify(preferenceData) },
  });

  console.log(`FCM Token updated for user ${userId}:`, fcmToken.substring(0, 20) + '...');

  return res
    .status(200)
    .json(new ApiResponse(200, null, "FCM Token updated successfully"));
});

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  if ([name, email, password, phone].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const query = {
    OR: [{ email }],
  };
  if (phone) {
    query.OR.push({ phone });
  }

  const existedUser = await prisma.user.findFirst({
    where: query,
  });

  if (existedUser && !existedUser.isDeleted) {
    throw new ApiError(409, "User with email or phone already exist");
  }

  let profileUrl = null;
  let publicId = null;
  if (req.file) {
    const uploadedImage = await uploadToS3(req.file, "users");
    profileUrl = uploadedImage || "";
    publicId = uploadedImage.split("/").pop();
  }

  // Hash the password before storing it
  const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

  let user;

  if (existedUser && existedUser.isDeleted) {
    // Reactivate soft-deleted account
    user = await prisma.user.update({
      where: { id: existedUser.id },
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: role,
        isDeleted: false,
        deletionReason: null,
        deletedAt: null,
        // Only update profile image if a new one is provided
        ...(profileUrl && { profileImage: profileUrl, publicId: publicId }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        profileImage: true,
        role: true,
      },
    });
  } else {
    // Create new user
    user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        profileImage: profileUrl,
        publicId: publicId,
        password: hashedPassword,
        role: role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        profileImage: true,
        role: true,
      },
    });
  }

  return res
    .status(201)
    .json(new ApiResponse(201, user, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, phone, password } = req.body;

  if (!(email || phone)) {
    throw new ApiError(400, "Email or phone is required");
  }

  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  //  Find user by email or phone
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: email || undefined }, { phone: phone || undefined }],
    },
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  if (user.isDeleted) {
    throw new ApiError(404, "User doesn't exist, sign up again");
  }

  //  Compare hashed password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Incorrect Password");
  }

  //  Generate JWT token
  const accessToken = jwt.sign(
    { id: user.id }, // Use Prisma `id`
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );

  //  Remove password before sending response
  const { password: _, ...loggedInUser } = user;

  //  Cookie options
  const isProduction = process.env.NODE_ENV === "production";
  const options = {
    httpOnly: true,
    secure: isProduction, // Only use secure in production (HTTPS)
    sameSite: isProduction ? "none" : "lax", // "none" for cross-domain in prod, "lax" for localhost
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    ...(isProduction && { domain: ".goodbelly.in" }), // Only set domain in production
  };
  //send vendorId in user object

  const vendor = await prisma.vendor.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      kitchenName: true,
      city: true,
      address: true,
    },
  });
  const vendorId = vendor ? vendor.id : null;
  const isApproved = user.isApproved;
  if (vendorId) {
    if (!vendor) {
      throw new ApiError(404, "Vendor account not found");
    }
    if (!isApproved) {
      throw new ApiError(403, "Vendor account approval pending. Please wait.");
    }

    // Add vendor info to loggedInUser
    loggedInUser.vendorId = vendor.id;
    loggedInUser.kitchenName = vendor.kitchenName;
    loggedInUser.city = vendor.city;
    loggedInUser.address = vendor.address;
    loggedInUser.vendorId = vendor ? vendor.id : null;
    loggedInUser.kitchenName = vendor ? vendor.kitchenName : null;
    loggedInUser.city = vendor ? vendor.city : null;
    loggedInUser.address = vendor ? vendor.address : null;
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // Cookie options must match the ones used during login
  const isProduction = process.env.NODE_ENV === "production";
  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    ...(isProduction && { domain: ".goodbelly.in" }),
  };

  // Clear FCM token on logout
  const userId = req.user?.id;

  if (userId) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (user && user.preference) {
        try {
          const preferenceData = JSON.parse(user.preference);
          // Remove FCM token but keep other preference data
          delete preferenceData.fcmToken;

          await prisma.user.update({
            where: { id: userId },
            data: { preference: JSON.stringify(preferenceData) },
          });

          console.log(`FCM token cleared for user ${userId} on logout`);
        } catch (e) {
          // If preference is not JSON, just set it to empty object
          await prisma.user.update({
            where: { id: userId },
            data: { preference: JSON.stringify({}) },
          });
        }
      }
    } catch (error) {
      console.error("Error clearing FCM token on logout:", error);
      // Don't throw - logout should still succeed
    }
  }

  // Clear the access token cookie with same options as login
  res.clearCookie("accessToken", options);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user?.id; // Get the user ID from the request object
  // add vendorId to user object
  if (userId && !req.user?.vendorId) {
    const vendor = await prisma.vendor.findUnique({
      where: { userId: userId },
      select: {
        id: true,
        kitchenName: true,
        longitude: true,
        latitude: true,
        city: true,
        address: true,
      },
    });
    //if user is vendor only add details.
    if (vendor) {
      req.user.vendorId = vendor.id;
      req.user.kitchenName = vendor.kitchenName;
      req.user.longitude = vendor.longitude;
      req.user.latitude = vendor.latitude;
      req.user.city = vendor.city;
      req.user.address = vendor.address;
    }
  }

  //if not user then get if from req.consultant.id
  const consultantId = req.consultant?.id;
  if (consultantId) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          req.consultant,
          "current user fetched successfully"
        )
      );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"));
});

const getUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isApproved: true,
      createdAt: true,
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, users, "Users retrieved successfully"));
});

const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, user, "User retrieved successfully"));
});

const deleteMyAccount = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { reason } = req.body;

  await prisma.user.update({
    where: { id: userId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletionReason: reason,
    },
  });

  // Clear cookies similar to logout
  const isProduction = process.env.NODE_ENV === "production";
  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    ...(isProduction && { domain: ".goodbelly.in" }),
  };

  res.clearCookie("accessToken", options);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Account deleted successfully"));
});

const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new ApiError(404, "User not found");
  }
  // First delete the Vendor if it exists
  await prisma.vendor.deleteMany({ where: { userId } });

  await prisma.user.delete({ where: { id: userId } });

  res.status(200).json(new ApiResponse(200, null, "User deleted successfully"));
});

const updateUser = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { name, phone, gender, password, preference } = req.body;

  if (!name && !phone && !gender && !password && !preference && !req.file) {
    throw new ApiError(400, "No fields provided to update.");
  }

  let profileUrl = null;
  let publicId = null;
  if (req.file) {
    const uploadedImage = await uploadToS3(req.file, "users");
    profileUrl = uploadedImage || "";
    publicId = uploadedImage.split("/").pop();
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;
  if (gender) updateData.gender = gender;
  if (preference) updateData.preference = preference;
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    updateData.password = hashedPassword;
  }

  if (profileUrl) {
    updateData.profileImage = profileUrl;
    updateData.publicId = publicId;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Profile updated successfully"));
});

// forgot password
const sendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
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

  // Send OTP via email (async)
  sendOTPEmail(email, otp, "reset")
    .then(response => console.log(response))
    .catch(error => console.error("Failed to send OTP email:", error));

  return res
    .status(200)
    .json(new ApiResponse(200, { message: "OTP sent successfully" }));
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

  // Optional: delete OTP after verification
  await prisma.tempOTP.delete({ where: { email } });
  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update user password
  await prisma.user.update({
    where: { email },
    data: {
      password: hashedPassword,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { message: "Password reset successfully" }));
});

// signup otp
const sendSignupOTP = asyncHandler(async (req, res) => {
  const { email, phone } = req.body;

  if (!email) throw new ApiError(400, "Email is required");

  const query = {
    OR: [{ email }],
  };

  if (phone) {
    query.OR.push({ phone });
  }

  const existedUser = await prisma.user.findFirst({
    where: query,
  });

  if (existedUser && !existedUser.isDeleted) {
    throw new ApiError(409, "Email or Phone already in use");
  }

  // Check for existing valid OTP to prevent overwrite/race conditions
  const existingOtp = await prisma.tempOTP.findUnique({ where: { email } });
  let otp;
  let otpExpiry;

  if (existingOtp && new Date() < existingOtp.otpExpiry) {
    otp = existingOtp.otp;
    otpExpiry = existingOtp.otpExpiry;
  } else {
    otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
    otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  }

  await prisma.tempOTP.upsert({
    where: { email },
    update: { otp, otpExpiry },
    create: { email, otp, otpExpiry },
  });

  // re-use existing email sender
  sendOTPEmail(email, otp, "signup").catch(err => {
    console.error(`Failed to send signup OTP email to ${email}:`, err);
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "OTP sent to email address"));
});

const verifySignupOTP = asyncHandler(async (req, res) => {
  let { email, otp } = req.body;

  if (!email || !otp) throw new ApiError(400, "Email and OTP required");

  // Normalize inputs to avoid type/whitespace mismatches
  otp = String(otp).trim();
  email = email.trim();

  const record = await prisma.tempOTP.findUnique({ where: { email } });

  if (!record) {
    throw new ApiError(401, "Invalid or expired OTP");
  }

  const isOtpValid = record.otp === otp;
  const isExpired = new Date() > new Date(record.otpExpiry);

  if (!isOtpValid || isExpired) {
    throw new ApiError(401, "Invalid or expired OTP");
  }

  // Optional: delete OTP after verification
  await prisma.tempOTP.delete({ where: { email } });

  return res.status(200).json(new ApiResponse(200, null, "OTP verified"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  getUsers,
  getUserById,
  deleteUser,
  updateUser,
  sendOTP,
  verifyOTP,
  resetPassword,
  sendSignupOTP,
  verifySignupOTP,
  updateFcmToken,
  deleteMyAccount,
};
