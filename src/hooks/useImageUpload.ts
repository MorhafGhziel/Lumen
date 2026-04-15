"use client";

import { useCallback } from "react";
import { getSupabase } from "@/lib/supabase";

export function useImageUpload(userId: string | undefined) {
  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      if (!userId) return null;

      const ext = file.name.split(".").pop() || "png";
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await getSupabase().storage
        .from("images")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (error) {
        console.error("Upload error:", error);
        return null;
      }

      const { data } = getSupabase().storage.from("images").getPublicUrl(fileName);
      return data.publicUrl;
    },
    [userId]
  );

  const uploadFromPaste = useCallback(
    async (e: ClipboardEvent): Promise<string | null> => {
      const items = e.clipboardData?.items;
      if (!items) return null;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) return upload(file);
        }
      }
      return null;
    },
    [upload]
  );

  return { upload, uploadFromPaste };
}
