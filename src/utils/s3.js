// s3.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

export const uploadToS3 = async (file, folder = "") => {
  if (!file) return null;

  const randomString = crypto.randomBytes(16).toString("hex");
  const cleanName = file.originalname.replace(/\s+/g, "_"); // remove spaces
  const fileName = `${randomString}-${cleanName}`;

  // final S3 key (path)
  const key = folder ? `${folder}/${fileName}` : fileName;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  await s3.send(new PutObjectCommand(params));

  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};
