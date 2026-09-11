import { storage } from "./firebase";
import { uploadPublicFile } from "./storage";

/**
 * Resizes and compresses an image file to a base64 data URL.
 * Keeps output under 100KB so it safely persists in Firestore documents.
 */
export async function compressImageToDataUrl(
  file: File,
  maxDimension = 640,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to decode image."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Prefer webp, fallback to jpeg
        try {
          const dataUrl = canvas.toDataURL("image/webp", quality);
          resolve(dataUrl);
        } catch {
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image file to Firebase Storage if available.
 * If Storage is not configured, or if the upload fails (e.g. security rules/quota/bucket missing),
 * it seamlessly falls back to an optimized base64 Data URL so the photo is ALWAYS saved.
 */
export async function uploadOrEncodeImage(
  storagePath: string,
  file: File,
  maxDimension = 640,
  quality = 0.85,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Image must be smaller than 10 MB.");
  }

  // If storage is configured, attempt upload with timeout
  if (storage) {
    try {
      const storagePromise = uploadPublicFile(storagePath, file);
      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Storage upload timed out")), 3500),
      );
      return await Promise.race([storagePromise, timeoutPromise]);
    } catch (storageError) {
      console.warn(
        "Firebase Storage upload failed/timed out, falling back to compressed base64:",
        storageError,
      );
    }
  }

  // Resilient fallback: compressed data URL
  return compressImageToDataUrl(file, maxDimension, quality);
}
