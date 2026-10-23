import { TranslateService } from '@ngx-translate/core';
import { GeoPoint, HuntingEvent } from '../model/event';
import { FeedingPlace } from '../model/feeding-place';
import { EventStorage } from '../storage/event-storage';
import { formatTagNumber } from './tag-number';

/** How sharing an event ended: sent through the share sheet, copied as a fallback, or dismissed by the user */
export type ShareResult = 'shared' | 'copied' | 'cancelled';

const JPEG_QUALITY = 0.85;

/** Opens the outdoor map with a pin, which shows paths and terrain */
export function mapyCzUrl({ latitude, longitude }: GeoPoint): string {
  return `https://mapy.cz/fnc/v1/showmap?mapset=outdoor&center=${longitude},${latitude}&zoom=15&marker=true`;
}

/**
 * A plain text message: the title, further lines such as the date, and the location with a link to the map.
 * Messaging apps differ in what formatting they support, so it uses no markup, only line breaks and a few emoji;
 * links are made clickable by the apps. A line that doesn't apply, such as a missing date, is simply left out.
 */
function shareMessage(title: string, lines: string[], location: GeoPoint | null, translate: TranslateService): string {
  const message = [title, ...lines];
  if (location) {
    const { latitude, longitude } = location;
    message.push(
      '',
      `📍 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      `${translate.instant('SHARE.MAPY_CZ')}: ${mapyCzUrl(location)}`,
    );
  }
  return message.join('\n');
}

/** The event as a plain text message, without its note */
export function eventShareText(event: HuntingEvent, translate: TranslateService, dateFormat: Intl.DateTimeFormat): string {
  const details: string[] = [];
  if (event.animal) {
    details.push(translate.instant(`ANIMALS.${event.animal}`));
  }
  if (event.sex) {
    details.push(translate.instant(`SEXES.${event.sex}`));
  }
  if (event.herd) {
    details.push(translate.instant(event.herdSize ? 'OVERVIEW.HERD_OF' : 'OVERVIEW.HERD', { count: event.herdSize }));
  }
  const type = translate.instant(`ITEMS.${event.type}`);
  // The note is left out, as it may hold remarks meant only for the user
  const lines = [`📅 ${dateFormat.format(new Date(event.occurredAt))}`];
  if (event.tagNumber) {
    lines.push(`🏷️ ${translate.instant('OVERVIEW.TAG_NUMBER')} ${formatTagNumber(event.tagNumber)}`);
  }
  if (event.shotDistance !== null && event.shotDistance !== undefined) {
    // In the language of the date
    const distance = new Intl.NumberFormat(dateFormat.resolvedOptions().locale).format(event.shotDistance);
    lines.push(`🎯 ${translate.instant('SHARE.SHOT_DISTANCE')} ${distance} m`);
  }
  return shareMessage(details.length ? `${type} – ${details.join(' · ')}` : type, lines, event.location, translate);
}

/** The feeding place as a plain text message; it has no date, so only its type and location are shared, without its note */
export function placeShareText(place: FeedingPlace, translate: TranslateService): string {
  return shareMessage(translate.instant(`FEEDING.TYPES.${place.type}`), [], place.location, translate);
}

/** Loads a photo as a JPEG file to attach to the message; a missing photo doesn't stop sharing */
export async function sharedPhoto(photoId: string | null | undefined, fileName: string, storage: EventStorage): Promise<File | null> {
  if (!photoId) {
    return null;
  }
  try {
    const photo = await storage.getPhoto(photoId);
    if (!photo) {
      return null;
    }
    const jpeg = await toJpeg(photo);
    return new File([jpeg], `${fileName}.jpg`, { type: 'image/jpeg' });
  } catch {
    return null;
  }
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
