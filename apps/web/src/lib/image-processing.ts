import sharp, { type Sharp } from "sharp";

/** Максимальная сторона изображения после ресайза (px). Фото клубов/тренеров/игроков. */
export const IMAGE_MAX_DIMENSION = 1600;
/** Качество WebP (0–100). 80 — хороший баланс размер/качество. */
export const IMAGE_WEBP_QUALITY = 80;
/** Лимит размера исходного файла при загрузке (байты). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export class ImageProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageProcessingError";
  }
}

export interface ProcessImageOptions {
  /** Максимальная сторона (px). По умолчанию IMAGE_MAX_DIMENSION. */
  maxDimension?: number;
  /** Качество WebP. По умолчанию IMAGE_WEBP_QUALITY. */
  quality?: number;
}

/**
 * Приводит любое растровое изображение к WebP с ресайзом «по большей стороне»
 * без увеличения мелких картинок. Учитывает EXIF-ориентацию (поворот с телефона).
 * Бросает ImageProcessingError, если вход — не изображение.
 */
export async function processImageToWebp(
  input: Buffer | Uint8Array,
  options: ProcessImageOptions = {},
): Promise<Buffer> {
  const maxDimension = options.maxDimension ?? IMAGE_MAX_DIMENSION;
  const quality = options.quality ?? IMAGE_WEBP_QUALITY;

  let pipeline: Sharp;
  try {
    pipeline = sharp(input, { failOn: "none" });
    const meta = await pipeline.metadata();
    if (!meta.width || !meta.height) {
      throw new ImageProcessingError("Файл не является изображением");
    }
  } catch (error) {
    if (error instanceof ImageProcessingError) throw error;
    throw new ImageProcessingError("Не удалось прочитать изображение");
  }

  return pipeline
    .rotate()
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();
}

/** Проверяет размер исходного файла перед обработкой. */
export function assertUploadSize(bytes: number): void {
  if (bytes > MAX_UPLOAD_BYTES) {
    const mb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
    throw new ImageProcessingError(`Файл слишком большой (максимум ${mb} МБ)`);
  }
}
