import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ============================================
// Cloudflare R2 Client (S3-compatible)
// ============================================

function getR2Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

const r2Client = getR2Client();

/**
 * Check if R2 is configured.
 */
export function isR2Configured(): boolean {
  return r2Client !== null && !!process.env.R2_BUCKET_NAME;
}

/**
 * Upload a file buffer to Cloudflare R2.
 * Returns the public URL of the uploaded file.
 *
 * Falls back to local file system if R2 is not configured.
 */
export async function uploadToR2(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL; // e.g. https://cdn.novelbase.com

  if (!r2Client || !bucket || !publicUrl) {
    throw new Error("R2 not configured");
  }

  const key = `covers/${fileName}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return `${publicUrl.replace(/\/$/, "")}/${key}`;
}
