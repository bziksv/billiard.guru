import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function saveCoachPhotoFile(file: File): Promise<string> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "coaches");
  await mkdir(uploadsDir, { recursive: true });
  const ext = path.extname(file.name) || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), buffer);
  return `/uploads/coaches/${filename}`;
}
