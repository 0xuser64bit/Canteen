import "server-only";
import sharp from "sharp";
import { LIMITS } from "@/lib/validation";

/** The server enforces the privacy guarantee even when the browser is bypassed. */
export async function preparePostImage(bytes: Buffer) {
  const image = sharp(bytes, { limitInputPixels: 25_000_000 });
  const { format } = await image.metadata();
  if (format !== "jpeg" && format !== "png" && format !== "webp")
    throw new Error("Unsupported image format");

  // Re-encoding drops EXIF, GPS, XMP and camera metadata by default.
  return image
    .autoOrient()
    .resize(LIMITS.imageEdge, LIMITS.imageEdge, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 86 })
    .timeout({ seconds: 10 })
    .toBuffer({ resolveWithObject: true });
}
