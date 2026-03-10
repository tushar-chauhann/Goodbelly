import multer from "multer";

// Memory storage for S3
const productStorage = multer.memoryStorage();

// File Filter for Product Images
const productFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, and WebP images are allowed!"), false);
  }
};

// Multer Configuration
export const uploadProduct = multer({
  storage: productStorage, // ⬅ CHANGED HERE
  fileFilter: productFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
