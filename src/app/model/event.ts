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
  /** Key of the event's photo in the photo store; missing or null without a photo */
  photoId?: string | null;
  /** When the event happened */
  occurredAt: string;
  /** When the record was created / last changed */
  createdAt: string;
  updatedAt: string;
}

/** The fields the user provides; `id`, `createdAt` and `updatedAt` are set when stored */
export type NewHuntingEvent = Omit<HuntingEvent, 'id' | 'createdAt' | 'updatedAt'>;

export type EventSort = 'newest' | 'oldest';

/** How the event list is ordered and filtered */
export interface EventQuery {
  sort: EventSort;
  /** Only events of this type; null for all */
  type: Item | null;
  /** Only events with this animal; null for all */
  animal: Animal | null;
}

export const DEFAULT_EVENT_QUERY: EventQuery = { sort: 'newest', type: null, animal: null };
