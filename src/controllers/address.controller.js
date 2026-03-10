import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// This is my address section
const addAddress = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const {
    addressLine,
    phone,
    town,
    area,
    district,
    city,
    state,
    country,
    zipCode,
    landmark,
    isPrimary,
    type,
    latitude,
    longitude,
  } = req.body;
  if (!addressLine || !phone) {
    throw new ApiError(400, "All fields are required.");
  }

  const newAddress = await prisma.address.create({
    data: {
      userId,
      addressLine,
      phone,
      town,
      area,
      district,
      city,
      state,
      country,
      zipCode,
      landmark,
      isPrimary,
      type,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
    },
  });

  res
    .status(201)
    .json(new ApiResponse(201, newAddress, "Address added successfully"));
});

const getAddresses = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const addresses = await prisma.address.findMany({
    where: { userId, isDeleted: false },
    orderBy: { createdAt: "desc" },
  });

  res
    .status(200)
    .json(new ApiResponse(200, addresses, "Addresses retrieved successfully"));
});

const updateAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    addressLine,
    phone,
    town,
    area,
    district,
    city,
    state,
    country,
    zipCode,
    landmark,
    isPrimary,
    type,
    latitude,
    longitude,
  } = req.body;

  // 1️⃣ Check address existence
  const address = await prisma.address.findUnique({ where: { id } });
  if (!address) throw new ApiError(404, "Address not found");

  // 2️⃣ Handle primary address logic
  if (isPrimary === true) {
    await prisma.address.updateMany({
      where: { userId: address.userId },
      data: { isPrimary: false },
    });
  }

  // 3️⃣ Dynamically build update object (only include provided fields)
  const dataToUpdate = {};

  if (addressLine !== undefined) dataToUpdate.addressLine = addressLine;
  if (phone !== undefined) dataToUpdate.phone = phone;
  if (town !== undefined) dataToUpdate.town = town;
  if (area !== undefined) dataToUpdate.area = area;
  if (district !== undefined) dataToUpdate.district = district;
  if (city !== undefined) dataToUpdate.city = city;
  if (state !== undefined) dataToUpdate.state = state;
  if (country !== undefined) dataToUpdate.country = country;
  if (zipCode !== undefined) dataToUpdate.zipCode = zipCode;
  if (landmark !== undefined) dataToUpdate.landmark = landmark;
  if (isPrimary !== undefined) dataToUpdate.isPrimary = isPrimary;
  if (type !== undefined) dataToUpdate.type = type;
  if (latitude !== undefined) dataToUpdate.latitude = parseFloat(latitude);
  if (longitude !== undefined) dataToUpdate.longitude = parseFloat(longitude);

  // 4️⃣ Update address
  const updatedAddress = await prisma.address.update({
    where: { id },
    data: dataToUpdate,
  });

  // 5️⃣ Send response
  res
    .status(200)
    .json(new ApiResponse(200, updatedAddress, "Address updated successfully"));
});

const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if address exists
  const address = await prisma.address.findUnique({ where: { id } });
  if (!address) throw new ApiError(404, "Address not found");

  try {
    // Attempt hard delete
    await prisma.address.delete({ where: { id } });

    res
      .status(200)
      .json(new ApiResponse(200, {}, "Address permanently deleted"));
  } catch (error) {
    console.error("Hard delete failed, performing soft delete:", error.message);

    // If hard delete fails, perform soft delete
    await prisma.address.update({
      where: { id },
      data: { isDeleted: true },
    });

    res
      .status(200)
      .json(new ApiResponse(200, {}, "Address soft deleted successfully"));
  }
});

const setPrimaryAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const address = await prisma.address.findUnique({ where: { id } });
  if (!address) throw new ApiError(404, "Address not found");

  await prisma.address.updateMany({
    where: { userId: address.userId },
    data: { isPrimary: false },
  });

  const primaryAddress = await prisma.address.update({
    where: { id },
    data: { isPrimary: true },
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, primaryAddress, "Primary address set successfully")
    );
});

export {
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setPrimaryAddress,
};
