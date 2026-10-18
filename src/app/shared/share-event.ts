import { TranslateService } from '@ngx-translate/core';
import { GeoPoint, HuntingEvent } from '../model/event';

/** How sharing an event ended: sent through the share sheet, copied as a fallback, or dismissed by the user */
export type ShareResult = 'shared' | 'copied' | 'cancelled';

const JPEG_QUALITY = 0.85;

export function googleMapsUrl({ latitude, longitude }: GeoPoint): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

/** Opens the outdoor map with a pin, which shows paths and terrain */
export function mapyCzUrl({ latitude, longitude }: GeoPoint): string {
  return `https://mapy.cz/fnc/v1/showmap?mapset=outdoor&center=${longitude},${latitude}&zoom=15&marker=true`;
}

/**
 * The event as a plain text message. Messaging apps differ in what formatting they support,
 * so it uses no markup, only line breaks and a few emoji; links are made clickable by the apps.
 */
export function eventShareText(event: HuntingEvent, translate: TranslateService, dateFormat: Intl.DateTimeFormat): string {
  const type = translate.instant(`ITEMS.${event.type}`);
  const lines = [event.animal ? `${type} – ${translate.instant(`ANIMALS.${event.animal}`)}` : type];
  lines.push(`📅 ${dateFormat.format(new Date(event.occurredAt))}`);
  if (event.note) {
    lines.push(`📝 ${event.note}`);
  }
  if (event.location) {
    const { latitude, longitude } = event.location;
    lines.push(
      '',
      `📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      `${translate.instant('SHARE.GOOGLE_MAPS')}: ${googleMapsUrl(event.location)}`,
      `${translate.instant('SHARE.MAPY_CZ')}: ${mapyCzUrl(event.location)}`,
    );
  }
  return lines.join('\n');
}

/** Some messaging apps don't accept WebP photos, so they are shared as JPEG */
export async function toJpeg(photo: Blob): Promise<Blob> {
  if (photo.type === 'image/jpeg') {
    return photo;
  }
  const bitmap = await createImageBitmap(photo);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Canvas is not supported');
  }
  // JPEG has no transparency, which would otherwise turn black
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
}

/**
 * Opens the system share sheet, which lists messaging apps such as WhatsApp or Messenger, with the text and photo.
 * Without a share sheet (e.g. desktop Firefox) the text is copied to the clipboard instead.
 * Must be called soon after a click, as browsers only allow sharing in response to user input.
 */
export async function shareText(navigator: Navigator, text: string, photo: File | null): Promise<ShareResult> {
  if (typeof navigator.share === 'function') {
    const data: ShareData = { text };
    // Leaves the photo out where files can't be shared, rather than not sharing at all
    if (photo && navigator.canShare?.({ files: [photo] })) {
      data.files = [photo];
    }
    try {
      await navigator.share(data);
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled';
      }
      throw error;
    }
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}
