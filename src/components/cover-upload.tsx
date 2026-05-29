"use client";

import React, { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageIcon, Loader2, X, Upload, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

const COVER_ASPECT = 2 / 3; // Portrait novel cover
const MAX_INPUT_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["image/webp", "image/jpeg", "image/png"];
const WEBP_QUALITY = 0.85;
const OUTPUT_WIDTH = 800; // Output width in px
const OUTPUT_HEIGHT = 1200; // 800 * 3/2

/**
 * Crop the image using canvas and export as WebP Blob.
 */
async function getCroppedBlob(
  imageSrc: string,
  crop: Area
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_WIDTH;
      canvas.height = OUTPUT_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(
        img,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        OUTPUT_WIDTH,
        OUTPUT_HEIGHT
      );
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Failed to crop"))),
        "image/webp",
        WEBP_QUALITY
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageSrc;
  });
}

interface CoverUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  /** If true, sends x-upload-source: submission header (no auth required) */
  isPublic?: boolean;
}

export function CoverUpload({
  value,
  onChange,
  label = "Cover Image",
  isPublic = false,
}: CoverUploadProps) {
  const [mode, setMode] = useState<"idle" | "cropping" | "uploading">("idle");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Only WebP, JPEG, and PNG files are allowed");
      return;
    }
    if (file.size > MAX_INPUT_SIZE) {
      toast.error("File must be under 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setMode("cropping");
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleCropConfirm() {
    if (!imageSrc || !croppedArea) return;
    setMode("uploading");

    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea);
      const formData = new FormData();
      formData.append("file", blob, "cover.webp");

      const headers: Record<string, string> = {};
      if (isPublic) headers["x-upload-source"] = "submission";

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        headers,
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Upload failed");
        setMode("cropping");
        return;
      }

      onChange(result.url);
      toast.success("Cover uploaded!");
      setMode("idle");
      setImageSrc(null);
    } catch {
      toast.error("Upload failed");
      setMode("cropping");
    }
  }

  function handleRemove() {
    onChange("");
    setImageSrc(null);
    setMode("idle");
  }

  function handleCropCancel() {
    setImageSrc(null);
    setMode("idle");
  }

  // Cropping modal
  if (mode === "cropping" && imageSrc) {
    return (
      <div className="space-y-3">
        <Label>{label}</Label>
        <div className="relative w-full rounded-lg border overflow-hidden bg-black" style={{ height: "400px" }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={COVER_ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleCropCancel} className="flex-1">
            Cancel
          </Button>
          <Button type="button" onClick={handleCropConfirm} className="flex-1">
            <Upload className="mr-1.5 h-4 w-4" />
            Crop & Upload
          </Button>
        </div>
      </div>
    );
  }

  // Uploading state
  if (mode === "uploading") {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Cropping & uploading...</p>
        </div>
      </div>
    );
  }

  // Preview or upload trigger
  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {value ? (
        <div className="relative group rounded-lg border overflow-hidden bg-muted" style={{ maxWidth: "180px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Cover" className="w-full aspect-[2/3] object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              Replace
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={handleRemove}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
          style={{ maxWidth: "240px", aspectRatio: "2/3" }}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground text-center">
            Click to upload
          </p>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            JPG, PNG, WebP
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Auto-cropped to 2:3
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".webp,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* URL input toggle */}
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setShowUrlInput(!showUrlInput)}
      >
        <LinkIcon className="h-3 w-3" />
        {showUrlInput ? "Hide URL input" : "Or paste image URL"}
      </button>

      {showUrlInput && (
        <Input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="max-w-sm"
        />
      )}
    </div>
  );
}
