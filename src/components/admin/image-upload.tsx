"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

const MAX_INPUT_SIZE = 10 * 1024 * 1024; // 10MB input limit (before compression)
const ACCEPTED_TYPES = ["image/webp", "image/jpeg", "image/png"];
const WEBP_QUALITY = 0.85; // High quality, good compression
const MAX_DIMENSION = 1200; // Max width/height in px (covers don't need to be huge)

/**
 * Compress and convert an image file to WebP using Canvas API.
 * Resizes to MAX_DIMENSION if larger, then exports as WebP at WEBP_QUALITY.
 * Returns a Blob ready for upload.
 */
async function compressToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate dimensions (scale down if needed, never scale up)
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Compression failed"));
            return;
          }
          resolve(blob);
        },
        "image/webp",
        WEBP_QUALITY
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUpload({
  value,
  onChange,
  label = "Cover Image",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Only WebP, JPEG, and PNG files are allowed");
      return;
    }

    if (file.size > MAX_INPUT_SIZE) {
      toast.error("File size must be under 10MB");
      return;
    }

    setUploading(true);
    setCompressionInfo("");

    try {
      // Compress to WebP
      const originalSize = file.size;
      const compressed = await compressToWebP(file);
      const savedPercent = Math.round((1 - compressed.size / originalSize) * 100);

      setCompressionInfo(
        `${formatBytes(originalSize)} → ${formatBytes(compressed.size)} (${savedPercent}% saved)`
      );

      // Upload compressed WebP via API route
      const formData = new FormData();
      formData.append("file", compressed, "cover.webp");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Upload failed");
        setUploading(false);
        return;
      }

      onChange(result.url);
      toast.success(`Uploaded as WebP (${savedPercent}% smaller)`);
    } catch {
      toast.error("Upload failed. Please try again.");
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRemove() {
    onChange("");
    setCompressionInfo("");
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {value ? (
        <div className="relative group rounded-lg border overflow-hidden bg-muted max-w-[200px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Cover preview"
            className="w-full aspect-[2/3] object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-1" />
              )}
              Replace
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
          {compressionInfo && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-3 py-1.5">
              {compressionInfo}
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {uploading ? "Compressing & uploading..." : "Click to upload cover image"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG, WebP — auto-compressed to WebP
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".webp,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />

      {/* URL fallback toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
          onClick={() => setShowUrlInput(!showUrlInput)}
        >
          {showUrlInput ? "Hide URL input" : "Or enter image URL manually"}
        </button>
      </div>
      {showUrlInput && (
        <Input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
        />
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
