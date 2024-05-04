import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_ID_KEY!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  region: "ap-south-1",
});
