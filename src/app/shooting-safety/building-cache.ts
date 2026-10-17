import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { Bounds } from './hazards';

/** Separate from the events database, so the two never block each other's upgrades */
const DB_NAME = 'vhonitbe-cache';
const DB_VERSION = 1;

export interface CachedBuildingTile {
  /** `zoom/x/y` */
  key: string;
  buildings: Bounds[];
  /** When the tile was loaded, in milliseconds since the epoch */
  loadedAt: number;
}

interface CacheDB extends DBSchema {
  'building-tiles': {
    key: string;
    value: CachedBuildingTile;
  };
}

/** Building tiles stored in IndexedDB; available in the app and in web workers */
export class BuildingCache {
  private db?: Promise<IDBPDatabase<CacheDB>>;

  /** The stored tile, or undefined when it isn't stored or the storage isn't available */
  async get(key: string): Promise<CachedBuildingTile | undefined> {
    try {
      return await (await this.open()).get('building-tiles', key);
    } catch {
      return undefined;
    }
  }

  /** Stores the tile; without storage (e.g. a private window) it is simply loaded again next time */
  async put(tile: CachedBuildingTile): Promise<void> {
    try {
      await (await this.open()).put('building-tiles', tile);
    } catch {
      // Caching is an optimization only
    }
  }

  private open(): Promise<IDBPDatabase<CacheDB>> {
    this.db ??= openDB<CacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('building-tiles', { keyPath: 'key' });
      },
    });
    return this.db;
  }
}
