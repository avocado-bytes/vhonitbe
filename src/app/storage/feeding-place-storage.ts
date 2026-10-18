import { inject, Service } from '@angular/core';
import { FeedingPlace, NewFeedingPlace } from '../model/feeding-place';
import { Database } from './database';

/** Persists feeders and salt licks in IndexedDB; their photos share the photo store with the events */
@Service()
export class FeedingPlaceStorage {
  private readonly database = inject(Database);

  /** All feeding places in no particular order */
  async getAll(): Promise<FeedingPlace[]> {
    return (await this.database.open()).getAll('feeding-places');
  }

  /** Stores a new feeding place, assigning its id */
  async add(place: NewFeedingPlace): Promise<FeedingPlace> {
    const stored: FeedingPlace = { ...place, id: crypto.randomUUID() };
    await (await this.database.open()).add('feeding-places', stored);
    return stored;
  }

  /** Replaces an existing feeding place; a replaced photo is deleted */
  async update(place: FeedingPlace): Promise<FeedingPlace> {
    const tx = (await this.database.open()).transaction(['feeding-places', 'photos'], 'readwrite');
    const existing = await tx.objectStore('feeding-places').get(place.id);
    if (!existing) {
      tx.abort();
      // Aborting rejects `tx.done`; that rejection is expected here
      await tx.done.catch(() => undefined);
      throw new Error(`Feeding place ${place.id} does not exist`);
    }
    await Promise.all([
      tx.objectStore('feeding-places').put(place),
      existing.photoId && existing.photoId !== place.photoId ? tx.objectStore('photos').delete(existing.photoId) : undefined,
      tx.done,
    ]);
    return place;
  }

  /** Deletes the feeding place together with its photo */
  async delete(id: string): Promise<void> {
    const tx = (await this.database.open()).transaction(['feeding-places', 'photos'], 'readwrite');
    const photoId = (await tx.objectStore('feeding-places').get(id))?.photoId;
    await Promise.all([
      tx.objectStore('feeding-places').delete(id),
      photoId ? tx.objectStore('photos').delete(photoId) : undefined,
      tx.done,
    ]);
  }
}
