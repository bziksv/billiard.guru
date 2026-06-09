import path from "path";

const UPLOAD_SUBDIRS = ["clubs", "coaches", "players"] as const;

/** Каталог user uploads (prod: ~/billiard.guru/shared/uploads, dev: public/uploads). */
export function resolveUploadsRoot(): string {
  const fromEnv = process.env.UPLOADS_DIR?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }

  const cwd = path.resolve(process.cwd());
  const currentMarker = `${path.sep}current${path.sep}`;
  const currentIdx = cwd.indexOf(currentMarker);
  if (currentIdx >= 0) {
    return path.join(cwd.slice(0, currentIdx), "shared", "uploads");
  }

  return path.join(cwd, "public", "uploads");
}

export function resolveUploadsSubdir(
  kind: (typeof UPLOAD_SUBDIRS)[number],
): string {
  return path.join(resolveUploadsRoot(), kind);
}

export { UPLOAD_SUBDIRS };
