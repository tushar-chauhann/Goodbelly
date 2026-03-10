import prisma from "../prismaClient.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToS3 } from "../utils/s3.js";
import { deleteFromS3 } from "../utils/s3Delete.js";

const createTestimonial = asyncHandler(async (req, res) => {
  const { name, description, city, rating } = req.body;

  let imageUrl = null;
  let publicId = null;

  if (req.file) {
    // Upload the new image
    const uploadedImage = await uploadToS3(req.file, "testimonials");
    imageUrl = uploadedImage;
    publicId = uploadedImage.split("/").pop();
  }
  const testimonial = await prisma.testimonial.create({
    data: {
      name,
      description,
      city,
      rating: parseInt(rating),
      imageUrl,
      publicId,
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, testimonial, "Testimonial created successfully")
    );
});

const getAllTestimonials = asyncHandler(async (req, res) => {
  const testimonials = await prisma.testimonial.findMany();

  res
    .status(200)
    .json(
      new ApiResponse(200, testimonials, "Testimonials retrieved successfully")
    );
});

const getTestimonialById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const testimonial = await prisma.testimonial.findUnique({
    where: { id },
  });

  if (!testimonial) {
    throw new ApiError(404, "Testimonial not found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, testimonial, "Testimonial retrieved successfully")
    );
});

const updateTestimonial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, city, rating } = req.body;

  let imageUrl = null;
  let publicId = null;

  if (req.file) {
    // Upload the new image
    const uploadedImage = await uploadToS3(req.file, "testimonials");
    imageUrl = uploadedImage;
    publicId = uploadedImage.split("/").pop();
  }

  const testimonial = await prisma.testimonial.update({
    where: { id },
    data: {
      name,
      description,
      city,
      rating: parseInt(rating),

      imageUrl,
      publicId,
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, testimonial, "Testimonial updated successfully")
    );
});

const deleteTestimonial = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const testimonial = await prisma.testimonial.findUnique({
    where: { id },
  });

  if (!testimonial) {
    throw new ApiError(404, "Testimonial not found");
  }

  // Delete the image from S3

  if (testimonial.publicId) {
    await deleteFromS3(testimonial.publicId);
  }

  await prisma.testimonial.delete({
    where: { id },
  });

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Testimonial deleted successfully"));
});

export {
  createTestimonial,
  getAllTestimonials,
  getTestimonialById,
  updateTestimonial,
  deleteTestimonial,
};
