import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-2",
  credentials: {
    accessKeyId: process.env.S3_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET || "sih-swaraj";
const COMPLAINTS_FOLDER = "complaints";

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

/**
 * Upload a file buffer to S3 complaints folder
 */
export async function uploadComplaintImage(
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<UploadResult> {
  try {
    // Generate unique filename
    const fileExtension = originalFilename.split(".").pop() || "jpg";
    const uniqueFilename = `${randomUUID()}.${fileExtension}`;
    const key = `${COMPLAINTS_FOLDER}/${uniqueFilename}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await s3Client.send(command);

    // Construct the public URL
    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "ap-south-2"}.amazonaws.com/${key}`;

    return {
      success: true,
      url,
      key,
    };
  } catch (error) {
    console.error("S3 upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload file",
    };
  }
}

/**
 * Generate a presigned URL for uploading (alternative approach)
 */
export async function getPresignedUploadUrl(
  filename: string,
  mimeType: string,
  expiresIn: number = 3600
): Promise<{ url: string; key: string }> {
  const fileExtension = filename.split(".").pop() || "jpg";
  const uniqueFilename = `${randomUUID()}.${fileExtension}`;
  const key = `${COMPLAINTS_FOLDER}/${uniqueFilename}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });

  return { url, key };
}

export { s3Client, BUCKET_NAME, COMPLAINTS_FOLDER };
