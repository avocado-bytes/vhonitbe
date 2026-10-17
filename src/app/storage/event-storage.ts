import { DestroyRef, inject, Service } from '@angular/core';
import { DBSchema, IDBPDatabase, IDBPIndex, openDB } from 'idb';
import { DEFAULT_EVENT_QUERY, EventQuery, HuntingEvent, NewHuntingEvent } from '../model/event';
import { Animal, Item } from '../model/item';

const DB_NAME = 'vhonitbe';
const DB_VERSION = 2;

interface VhonitbeDB extends DBSchema {
  events: {
    key: string;
    value: HuntingEvent;
    indexes: {
      'by-type': Item;
      'by-animal': Animal;
      'by-occurred-at': string;
    };
  };
  /** Compressed photos, kept apart from the events so listing events doesn't load them */
  photos: {
    key: string;
    value: Blob;
  };
}

export interface EventPage {
  events: HuntingEvent[];
  total: number;
}

/** Persists user defined events in IndexedDB */
@Service()
export class EventStorage {
  private db?: Promise<IDBPDatabase<VhonitbeDB>>;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.db?.then((db) => db.close()));
  }

  /** All events, oldest first */
  async getAll(): Promise<HuntingEvent[]> {
    return (await this.open()).getAllFromIndex('events', 'by-occurred-at');
  }

  /**
   * One page of events, sorted and filtered by `query` (newest first by default), together with
   * the total number of matching events
   */
  async getPage(offset: number, limit: number, query: EventQuery = DEFAULT_EVENT_QUERY): Promise<EventPage> {
    const tx = (await this.open()).transaction('events');
    const direction = query.sort === 'newest' ? 'prev' : 'next';
    if (query.type !== null || query.animal !== null) {
      return this.getFilteredPage(tx.store.index('by-occurred-at'), direction, offset, limit, query);
    }
    const total = await tx.store.count();

    const events: HuntingEvent[] = [];
    let cursor = await tx.store.index('by-occurred-at').openCursor(null, direction);
    if (cursor && offset > 0) {
      cursor = await cursor.advance(offset);
    }
    while (cursor && events.length < limit) {
      events.push(cursor.value);
      cursor = await cursor.continue();
    }

    await tx.done;
    return { events, total };
  }

  /** Walks all events in date order, as matching ones can only be counted by looking at each of them */
  private async getFilteredPage(
    index: IDBPIndex<VhonitbeDB, ['events'], 'events', 'by-occurred-at'>,
    direction: IDBCursorDirection,
    offset: number,
    limit: number,
    { type, animal }: EventQuery,
  ): Promise<EventPage> {
    const events: HuntingEvent[] = [];
    let total = 0;
    for (let cursor = await index.openCursor(null, direction); cursor; cursor = await cursor.continue()) {
      const event = cursor.value;
      if ((type === null || event.type === type) && (animal === null || event.animal === animal)) {
        if (total >= offset && events.length < limit) {
          events.push(event);
        }
        total++;
      }
    }
    return { events, total };
  }

  /**
   * Asks the browser not to clear the database under storage pressure.
   * Resolves to whether storage is (now) persistent.
   */
  async requestPersistence(): Promise<boolean> {
    const storage = globalThis.navigator?.storage;
    if (!storage?.persist) {
      return false;
    }
    return (await storage.persisted()) || storage.persist();
  }

  async get(id: string): Promise<HuntingEvent | undefined> {
    return (await this.open()).get('events', id);
  }

  async getByType(type: Item): Promise<HuntingEvent[]> {
    return (await this.open()).getAllFromIndex('events', 'by-type', type);
  }

  async getByAnimal(animal: Animal): Promise<HuntingEvent[]> {
    return (await this.open()).getAllFromIndex('events', 'by-animal', animal);
  }

  /** Events that occurred within the given range (ISO 8601, both inclusive) */
  async getBetween(from: string, to: string): Promise<HuntingEvent[]> {
    return (await this.open()).getAllFromIndex('events', 'by-occurred-at', IDBKeyRange.bound(from, to));
  }

  /** Stores a new event, assigning its id and timestamps */
  async add(event: NewHuntingEvent): Promise<HuntingEvent> {
    const now = new Date().toISOString();
    const stored: HuntingEvent = { ...event, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    await (await this.open()).add('events', stored);
    return stored;
  }

  /** Replaces an existing event, refreshing its `updatedAt` timestamp; a replaced photo is deleted */
  async update(event: HuntingEvent): Promise<HuntingEvent> {
    const db = await this.open();
    const tx = db.transaction(['events', 'photos'], 'readwrite');
    const existing = await tx.objectStore('events').get(event.id);
    if (!existing) {
      tx.abort();
      // Aborting rejects `tx.done`; that rejection is expected here
      await tx.done.catch(() => undefined);
      throw new Error(`Event ${event.id} does not exist`);
    }
    const stored: HuntingEvent = { ...event, updatedAt: new Date().toISOString() };
    await Promise.all([
      tx.objectStore('events').put(stored),
      existing.photoId && existing.photoId !== stored.photoId ? tx.objectStore('photos').delete(existing.photoId) : undefined,
      tx.done,
    ]);
    return stored;
  }

  /** Deletes the event together with its photo */
  async delete(id: string): Promise<void> {
    const tx = (await this.open()).transaction(['events', 'photos'], 'readwrite');
    const photoId = (await tx.objectStore('events').get(id))?.photoId;
    await Promise.all([
      tx.objectStore('events').delete(id),
      photoId ? tx.objectStore('photos').delete(photoId) : undefined,
      tx.done,
    ]);
  }

  async clear(): Promise<void> {
    const tx = (await this.open()).transaction(['events', 'photos'], 'readwrite');
    await Promise.all([tx.objectStore('events').clear(), tx.objectStore('photos').clear(), tx.done]);
  }

  /** Stores a photo and returns its key, to be set as an event's `photoId` */
  async addPhoto(photo: Blob): Promise<string> {
    const id = crypto.randomUUID();
    await (await this.open()).put('photos', photo, id);
    return id;
  }

  async getPhoto(id: string): Promise<Blob | undefined> {
    return (await this.open()).get('photos', id);
  }

  private open(): Promise<IDBPDatabase<VhonitbeDB>> {
    return (this.db ??= openDB<VhonitbeDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
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
