import { DestroyRef, inject, Service } from '@angular/core';
import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { HuntingEvent, NewHuntingEvent } from '../model/event';
import { Animal, Item } from '../model/item';

const DB_NAME = 'vhonitbe';
const DB_VERSION = 1;

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

  /** One page of events, newest first, together with the total number of events */
  async getPage(offset: number, limit: number): Promise<EventPage> {
    const tx = (await this.open()).transaction('events');
    const total = await tx.store.count();

    const events: HuntingEvent[] = [];
    let cursor = await tx.store.index('by-occurred-at').openCursor(null, 'prev');
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

  /** Replaces an existing event, refreshing its `updatedAt` timestamp */
  async update(event: HuntingEvent): Promise<HuntingEvent> {
    const db = await this.open();
    const tx = db.transaction('events', 'readwrite');
    if (!(await tx.store.getKey(event.id))) {
      tx.abort();
      // Aborting rejects `tx.done`; that rejection is expected here
      await tx.done.catch(() => undefined);
      throw new Error(`Event ${event.id} does not exist`);
    }
    const stored: HuntingEvent = { ...event, updatedAt: new Date().toISOString() };
    await Promise.all([tx.store.put(stored), tx.done]);
    return stored;
  }

  async delete(id: string): Promise<void> {
    await (await this.open()).delete('events', id);
  }

  async clear(): Promise<void> {
    await (await this.open()).clear('events');
  }

  private open(): Promise<IDBPDatabase<VhonitbeDB>> {
    return (this.db ??= openDB<VhonitbeDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const events = db.createObjectStore('events', { keyPath: 'id' });
        events.createIndex('by-type', 'type');
        // Events without an animal (animal: null) are simply left out of this index
        events.createIndex('by-animal', 'animal');
        events.createIndex('by-occurred-at', 'occurredAt');
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
