import { GeoPoint } from './event';

/** In the order they are listed; the key 'feeding' is kept for the krmelec so stored places stay valid */
export const FEEDING_PLACE_TYPES = [
  'feeding', // krmelec
  'feed-pile', // hromada
  'bait-site', // zásyp
  'salt-lick', // slanisko
] as const;
export type FeedingPlaceType = (typeof FEEDING_PLACE_TYPES)[number];

/**
 * A place where game is fed: a feeder or a salt lick.
 *
 * Unlike an event it is a lasting facility rather than something that happened, so it has no date.
 */
export interface FeedingPlace {
  id: string;
  type: FeedingPlaceType;
  location: GeoPoint | null;
  note: string;
  /** Key of the place's photo in the photo store; null without a photo */
  photoId: string | null;
}

/** The fields the user provides; `id` is set when stored */
export type NewFeedingPlace = Omit<FeedingPlace, 'id'>;
