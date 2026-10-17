/** Long edge of a stored photo in pixels; plenty for viewing on a phone, a fraction of a camera's resolution */
const MAX_SIZE = 1600;
const QUALITY = 0.75;

/**
 * Scales a photo down to `MAX_SIZE` and re-encodes it as WebP, or JPEG where the browser can't encode WebP.
 * Re-encoding also drops the photo's metadata, such as its GPS position. Keeps the original when that is smaller.
 */
export async function compressImage(file: Blob): Promise<Blob> {
  // Applies the camera's EXIF rotation, so portrait photos stay upright
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_SIZE / Math.max(bitmap.width, bitmap.height));
  const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Canvas is not supported');
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let compressed = await canvas.convertToBlob({ type: 'image/webp', quality: QUALITY });
  // Browsers that can't encode WebP fall back to PNG, which is much larger
  if (compressed.type !== 'image/webp') {
    compressed = await canvas.convertToBlob({ type: 'image/jpeg', quality: QUALITY });
  }
  return compressed.size < file.size ? compressed : file;
}
