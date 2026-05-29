import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { isR2Configured, uploadToR2 } from "@/lib/r2";

const UPLOAD_DIR = path.join(process.cwd(), "public/uploads/covers");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (already compressed WebP from client)

/**
 * Validate that a buffer is a valid WebP file by checking magic bytes.
 */
function isValidWebP(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  const isRIFF = buffer.slice(0, 4).toString("ascii") === "RIFF";
  const isWEBP = buffer.slice(8, 12).toString("ascii") === "WEBP";
  return isRIFF && isWEBP;
}

/**
 * Upload a buffer and return the public URL.
 * Uses R2 if configured, falls back to local file system.
 */
async function saveFile(buffer: Buffer, fileName: string): Promise<string> {
  if (isR2Configured()) {
    return uploadToR2(buffer, fileName, "image/webp");
  }

  // Local fallback
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filePath = path.join(UPLOAD_DIR, fileName);

  // Path traversal protection
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(UPLOAD_DIR))) {
    throw new Error("Invalid file path");
  }

  await writeFile(filePath, buffer);
  return `/uploads/covers/${fileName}`;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Check if this is an authenticated admin upload or a public submission upload
  const source = request.headers.get("x-upload-source");
  const isPublicUpload = source === "submission";

  if (isPublicUpload) {
    // Public uploads: stricter rate limit (10 per 10 minutes)
    const limiter = await rateLimitAsync(`upload-public:${ip}`, { maxRequests: 10, windowMs: 600_000 });
    if (!limiter.success) {
      return NextResponse.json(
        { error: "Too many uploads. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfter ?? 60) } }
      );
    }
  } else {
    // Admin uploads: require auth
    const limiter = await rateLimitAsync(`upload:${ip}`, { maxRequests: 20, windowMs: 600_000 });
    if (!limiter.success) {
      return NextResponse.json(
        { error: "Too many uploads. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limiter.retryAfter ?? 60) } }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 }
      );
    }

    if (file.type !== "image/webp") {
      return NextResponse.json(
        { error: "Only WebP files are accepted" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate WebP magic bytes
    if (!isValidWebP(buffer)) {
      return NextResponse.json(
        { error: "Invalid WebP file" },
        { status: 400 }
      );
    }

    // Generate unique filename (safe — no user input in filename)
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

    const publicUrl = await saveFile(buffer, fileName);

    return NextResponse.json({ url: publicUrl });
  } catch {
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
