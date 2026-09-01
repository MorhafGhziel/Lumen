"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024; // Matches the bucket's own limit.
const ALLOWED = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"];

/**
 * Uploads into a folder named after the user's id, which is what the storage
 * policy checks. Validation happens here too so a rejected file fails
 * instantly with a readable message rather than after a round trip.
 */
export function useImageUpload(userId: string | undefined) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      if (!userId) {
        setError("Sign in to upload images.");
        return null;
      }
      if (!ALLOWED.includes(file.type)) {
        setError("That file type is not supported. Use PNG, JPEG, GIF, WebP or AVIF.");
        return null;
      }
      if (file.size > MAX_BYTES) {
        setError(`That image is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is 5MB.`);
        return null;
      }

      setUploading(true);
      setError(null);

      const supabase = createClient();
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(path, file, { cacheControl: "31536000", upsert: false });

      setUploading(false);

      if (uploadError) {
        setError(
          uploadError.message.includes("Bucket not found")
            ? "The images bucket is missing. Run supabase/schema.sql in your project."
            : uploadError.message,
        );
        return null;
      }

      return supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
    },
    [userId],
  );

  /** Pulls the first image out of a paste event, if there is one. */
  const uploadFromClipboard = useCallback(
    async (items: DataTransferItemList | null): Promise<string | null> => {
      if (!items) return null;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) return upload(file);
        }
      }
      return null;
    },
    [upload],
  );

  return { upload, uploadFromClipboard, uploading, error, clearError: () => setError(null) };
}
