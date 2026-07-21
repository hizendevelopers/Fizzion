import { mkdir, writeFile } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getOptionalSupabaseSecretKey } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type StoredWebAdAsset = {
  storageKey: string;
  publicUrl: string;
};

function getWebAdUploadDriver() {
  const explicit = process.env.WEB_AD_UPLOAD_DRIVER?.trim().toLowerCase();
  if (explicit) {
    return explicit;
  }

  if (getOptionalSupabaseSecretKey()) {
    return "supabase";
  }

  return process.env.OOH_UPLOAD_DRIVER?.trim().toLowerCase() || "local";
}

function getWebAdStorageBucket() {
  return process.env.WEB_AD_STORAGE_BUCKET?.trim() || "web-advertising";
}

async function storeLocalAsset(bytes: Buffer, folder: string, extension: string): Promise<StoredWebAdAsset> {
  const finalName = `${randomUUID()}${extension}`;
  const relativeDir = path.posix.join("uploads", "web-ads", folder);
  const targetDir = path.join(process.cwd(), "public", relativeDir);
  await mkdir(targetDir, { recursive: true });

  const targetPath = path.join(targetDir, finalName);
  await writeFile(targetPath, bytes);

  const publicUrl = `/${path.posix.join(relativeDir, finalName)}`;
  return {
    storageKey: publicUrl,
    publicUrl,
  };
}

async function storeSupabaseAsset(bytes: Buffer, folder: string, extension: string, contentType: string): Promise<StoredWebAdAsset> {
  const bucket = getWebAdStorageBucket();
  const objectPath = `${folder}/${new Date().toISOString().slice(0, 10).replaceAll("-", "/")}/${randomUUID()}${extension}`;
  const supabase = getSupabaseAdminClient();

  await supabase.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: 25 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  }).catch(() => null);

  const upload = await supabase.storage.from(bucket).upload(objectPath, bytes, {
    contentType,
    upsert: false,
  });

  if (upload.error) {
    throw new Error(`Supabase storage upload failed: ${upload.error.message}`);
  }

  return {
    storageKey: `${bucket}/${objectPath}`,
    publicUrl: `${bucket}/${objectPath}`,
  };
}

export async function storeWebAdScreenshot(bytes: Buffer, folder: "crops" | "evidence", contentType = "image/png") {
  const extension = contentType === "image/webp" ? ".webp" : contentType === "image/jpeg" ? ".jpg" : ".png";
  const driver = getWebAdUploadDriver();

  if (driver === "supabase") {
    return storeSupabaseAsset(bytes, folder, extension, contentType);
  }

  return storeLocalAsset(bytes, folder, extension);
}

export function resolveLocalWebAdPath(storageKey: string) {
  if (!storageKey.startsWith("/uploads/web-ads/")) {
    return null;
  }

  return path.join(process.cwd(), "public", storageKey.replace(/^\//, "").replaceAll("/", path.sep));
}

export function localWebAdAssetExists(storageKey: string) {
  const localPath = resolveLocalWebAdPath(storageKey);
  return localPath ? fs.existsSync(localPath) : false;
}
