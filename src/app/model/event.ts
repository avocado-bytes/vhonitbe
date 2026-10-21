import { Ammunition } from './ammunition';
import { Firearm } from './firearm';
import { Animal, Item } from './item';

/** 'mixed' only applies to a herd of both sexes */
export const SEXES = ['male', 'female', 'mixed'] as const;
export type Sex = (typeof SEXES)[number];

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * A copy of a firearm as it was when used, rather than a reference to it, so that changing or deleting
 * the firearm later keeps the record as it was
 */
export type FirearmSnapshot = Omit<Firearm, 'id'>;
/** A copy of ammunition as it was when used; see {@link FirearmSnapshot} */
export type AmmunitionSnapshot = Omit<Ammunition, 'id'>;

/** Copies a saved firearm or ammunition into a record, without its id so nothing links back to it */
export function snapshot<T extends { id: string }>({ id: _id, ...fields }: T): Omit<T, 'id'> {
  return structuredClone(fields);
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
  /** Several animals were seen together rather than an individual; only for sightings, missing in older events */
  herd?: boolean;
  /** How many animals the herd had, if counted; at least 2 */
  herdSize?: number | null;
  /** Optional for types with an animal; missing in older events */
  sex?: Sex | null;
  /** The 8 digits of the tag of a harvested mammal, without the space; missing in older events */
  tagNumber?: string | null;
  /** The firearm and ammunition used for a harvest, copied as they were; null when not given, missing in older events */
  firearm?: FirearmSnapshot | null;
  ammunition?: AmmunitionSnapshot | null;
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
