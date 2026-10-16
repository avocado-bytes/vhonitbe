import { Animal, Item } from './item';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * An event recorded by the user (sighting, harvest, tracks, …).
 *
 * Named `HuntingEvent` rather than `Event` so it doesn't shadow the DOM `Event` type.
 * Dates are ISO 8601 strings, so the object stays serializable for the NgRx store
 * and sorts chronologically in IndexedDB indexes.
 */
export interface HuntingEvent {
  id: string;
  type: Item;
  animal: Animal | null;
  location: GeoPoint | null;
  note: string;
  /** When the event happened */
  occurredAt: string;
  /** When the record was created / last changed */
  createdAt: string;
  updatedAt: string;
}

/** The fields the user provides; `id`, `createdAt` and `updatedAt` are set when stored */
export type NewHuntingEvent = Omit<HuntingEvent, 'id' | 'createdAt' | 'updatedAt'>;
