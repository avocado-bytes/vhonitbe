import { GeoPoint } from './event';
import { FeedingSettings, isInSeason } from './feeding-settings';

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
 * Unlike an event it is a lasting facility rather than something that happened, so it has no date of its own;
 * it only records when it was last replenished.
 */
export interface FeedingPlace {
  id: string;
  type: FeedingPlaceType;
  location: GeoPoint | null;
  note: string;
  /** Key of the place's photo in the photo store; null without a photo */
  photoId: string | null;
  /** When the place was last replenished (ISO 8601); null until it first is, missing in older places */
  lastReplenishedAt?: string | null;
}

/** The fields the user provides; `id` is set when stored */
export type NewFeedingPlace = Omit<FeedingPlace, 'id'>;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * During the feeding season a place needs attention when it was never replenished or longer ago than
 * the replenishment interval; outside of the season none does
 */
export function needsReplenishing(place: FeedingPlace, settings: FeedingSettings, now: Date): boolean {
  if (!isInSeason(settings, now)) {
    return false;
  }
  return !place.lastReplenishedAt || now.getTime() - new Date(place.lastReplenishedAt).getTime() > settings.replenishDays * DAY_MS;
}
