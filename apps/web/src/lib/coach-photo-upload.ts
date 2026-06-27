import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  assertUploadSize,
  processImageToWebp,
} from "@/lib/image-processing";
import { resolveUploadsSubdir } from "@/lib/uploads-dir";

/** Сохраняет фото тренера: ресайз + конвертация в WebP, отдаёт публичный URL. */
export async function saveCoachPhotoFile(file: File): Promise<string> {
  assertUploadSize(file.size);
  const uploadsDir = resolveUploadsSubdir("coaches");
  await mkdir(uploadsDir, { recursive: true });
  const input = Buffer.from(await file.arrayBuffer());
  const webp = await processImageToWebp(input);
  const filename = `${randomUUID()}.webp`;
  await writeFile(path.join(uploadsDir, filename), webp);
  return `/uploads/coaches/${filename}`;
}
