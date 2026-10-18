import { DestroyRef, inject, Service } from '@angular/core';
import { DBSchema, IDBPDatabase, IDBPTransaction, openDB, StoreNames } from 'idb';
import { HuntingEvent } from '../model/event';
import { FEEDING_PLACE_TYPES, FeedingPlace, FeedingPlaceType } from '../model/feeding-place';
import { Animal, Item } from '../model/item';

const DB_NAME = 'vhonitbe';
const DB_VERSION = 3;

export interface VhonitbeDB extends DBSchema {
  events: {
    key: string;
    value: HuntingEvent;
    indexes: {
      'by-type': Item;
      'by-animal': Animal;
      'by-occurred-at': string;
    };
  };
  /** Feeders and salt licks, kept apart from the events as they are places rather than happenings */
  'feeding-places': {
    key: string;
    value: FeedingPlace;
  };
  /** Compressed photos of events and feeding places, kept apart so listing them doesn't load the photos */
  photos: {
    key: string;
    value: Blob;
  };
}

/** Opens the IndexedDB database shared by the stores of events, feeding places and photos */
@Service()
export class Database {
  private db?: Promise<IDBPDatabase<VhonitbeDB>>;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.db?.then((db) => db.close()));
  }

  open(): Promise<IDBPDatabase<VhonitbeDB>> {
    return (this.db ??= openDB<VhonitbeDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          const events = db.createObjectStore('events', { keyPath: 'id' });
          events.createIndex('by-type', 'type');
          // Events without an animal (animal: null) are simply left out of this index
          events.createIndex('by-animal', 'animal');
          events.createIndex('by-occurred-at', 'occurredAt');
        }
        if (oldVersion < 2) {
          db.createObjectStore('photos');
        }
        if (oldVersion < 3) {
          db.createObjectStore('feeding-places', { keyPath: 'id' });
          await moveFeedingPlaces(transaction);
        }
      },
      // Let a newer version of the app (e.g. in another tab) upgrade the database
      blocking: () => {
        void this.db?.then((db) => db.close());
        this.db = undefined;
      },
      terminated: () => {
        this.db = undefined;
      },
    }));
  }
}

/** Feeders and salt licks used to be stored as events; they keep their id, location, note and photo but lose the dates */
async function moveFeedingPlaces(
  transaction: IDBPTransaction<VhonitbeDB, StoreNames<VhonitbeDB>[], 'versionchange'>,
): Promise<void> {
  const places = transaction.objectStore('feeding-places');
  for (let cursor = await transaction.objectStore('events').openCursor(); cursor; cursor = await cursor.continue()) {
    const { id, type, location, note, photoId } = cursor.value;
    if ((FEEDING_PLACE_TYPES as readonly string[]).includes(type)) {
      await places.put({ id, type: type as unknown as FeedingPlaceType, location, note, photoId: photoId ?? null });
      await cursor.delete();
    }
  }
}
