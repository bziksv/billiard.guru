import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { resolveUploadsSubdir } from "@/lib/uploads-dir";

export async function saveClubPhotoFile(file: File): Promise<string> {
  const uploadsDir = resolveUploadsSubdir("clubs");
  await mkdir(uploadsDir, { recursive: true });
  const ext = path.extname(file.name) || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), buffer);
  return `/uploads/clubs/${filename}`;
}
