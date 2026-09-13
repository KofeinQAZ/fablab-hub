import { supabase } from "@/integrations/supabase/client";

export type ImageBucket =
  | "avatars"
  | "project-covers"
  | "club-covers"
  | "devlog-images"
  | "equipment-images";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB before compression

type CompressOptions = {
  maxSize?: number; // max side in px
  quality?: number;
  square?: boolean; // crop to centered square (avatars)
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable-image"));
    };
    img.src = url;
  });
}

/**
 * Resize + re-encode an image in the browser.
 * PNG/SVG with possible transparency is kept as-is when `keepTransparency` applies.
 */
export async function compressImage(file: File, opts: CompressOptions = {}): Promise<Blob> {
  const { maxSize = 1600, quality = 0.8, square = false } = opts;

  // Vector images and GIF animations are uploaded untouched.
  if (file.type === "image/svg+xml" || file.type === "image/gif") return file;

  const img = await loadImage(file);

  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (square) {
    const side = Math.min(sw, sh);
    sx = (sw - side) / 2;
    sy = (sh - side) / 2;
    sw = side;
    sh = side;
  }

  const scale = Math.min(1, maxSize / Math.max(sw, sh));
  const dw = Math.round(sw * scale);
  const dh = Math.round(sh * scale);

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  // White background so transparent PNG converted to JPEG does not turn black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, dw, dh);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) return file;
  // If compression somehow made it bigger, keep the original.
  return blob.size < file.size ? blob : file;
}

export function publicImageUrl(bucket: ImageBucket, path: string) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function uploadImage(params: {
  file: File;
  bucket: ImageBucket;
  /** Folder — must be the user id for user-owned buckets (RLS). */
  folder: string;
  square?: boolean;
  maxSize?: number;
  quality?: number;
}): Promise<string> {
  const { file, bucket, folder, square, maxSize, quality } = params;

  if (!file.type.startsWith("image/")) throw new Error("not-an-image");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("too-large");

  const blob = await compressImage(file, { square, maxSize, quality });
  const isJpeg = blob.type === "image/jpeg" || !("type" in blob) || blob === (file as unknown as Blob);
  const ext = blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${folder}/${crypto.randomUUID()}.${isJpeg && blob.type === "image/jpeg" ? "jpg" : ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    cacheControl: "3600",
    upsert: false,
    contentType: blob.type || file.type,
  });
  if (error) throw error;

  return publicImageUrl(bucket, path);
}
