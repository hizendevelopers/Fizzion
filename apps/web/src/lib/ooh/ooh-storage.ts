import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

type StoredUpload = {
  imageUrl: string;
  storageKey: string;
};

function sanitizeFileName(name: string) {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  return base || "upload";
}

function getUploadDriver() {
  return process.env.OOH_UPLOAD_DRIVER?.trim().toLowerCase() || "local";
}

export async function validateOohUpload(file: File) {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Only JPG, PNG, WebP, and SVG image uploads are allowed.");
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("Images must be 10MB or smaller.");
  }
}

async function storeLocalUpload(file: File, folder = "site-photos"): Promise<StoredUpload> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = path.extname(file.name || "").toLowerCase() || ".bin";
  const safeName = sanitizeFileName(path.basename(file.name, extension));
  const finalName = `${randomUUID()}-${safeName}${extension}`;
  const relativeDir = path.posix.join("uploads", "ooh", folder);
  const targetDir = path.join(process.cwd(), "public", relativeDir);
  await mkdir(targetDir, { recursive: true });

  const targetPath = path.join(targetDir, finalName);
  await writeFile(targetPath, bytes);

  return {
    imageUrl: `/${relativeDir}/${finalName}`.replaceAll("\\", "/"),
    storageKey: path.posix.join(relativeDir, finalName),
  };
}

export async function storeOohUpload(file: File, folder?: string) {
  await validateOohUpload(file);

  const driver = getUploadDriver();
  if (driver === "local") {
    return storeLocalUpload(file, folder);
  }

  throw new Error(`Unsupported OOH upload driver: ${driver}. Configure OOH_UPLOAD_DRIVER=local for this environment.`);
}

export async function removeOohUpload(imageUrl: string | null | undefined) {
  if (!imageUrl || !imageUrl.startsWith("/uploads/ooh/")) {
    return;
  }

  const targetPath = path.join(process.cwd(), "public", imageUrl.replaceAll("/", path.sep));
  await unlink(targetPath).catch(() => null);
}
