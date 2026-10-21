import { TestBed } from '@angular/core/testing';
// jsdom has no IndexedDB; installs an in-memory implementation of all IndexedDB globals
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { openDB } from 'idb';
import { AmmunitionStorage } from './ammunition-storage';
import { LoadSeriesStorage } from './load-series-storage';

describe('LoadSeriesStorage', () => {
  let storage: LoadSeriesStorage;

  beforeEach(() => {
    // Fresh, empty database for every test
    globalThis.indexedDB = new IDBFactory();
    storage = TestBed.inject(LoadSeriesStorage);
  });

  it('should add a series with a generated id', async () => {
    const stored = await storage.add({ caliber: '.308 Win' });

    expect(stored).toEqual({ id: expect.any(String), caliber: '.308 Win' });
    expect(await storage.getAll()).toEqual([stored]);
  });

  it('should add the load series store to a database of the previous version, keeping the ammunition', async () => {
    const old = await openDB('vhonitbe', 5, {
      upgrade(db) {
        for (const name of ['events', 'feeding-places', 'firearms', 'ammunition']) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
        db.createObjectStore('photos');
      },
    });
    await old.put('ammunition', { id: 'a1', caliber: '.308 Win' });
    old.close();

    expect(await storage.getAll()).toEqual([]);
    expect((await TestBed.inject(AmmunitionStorage).getAll()).map((ammunition) => ammunition.id)).toEqual(['a1']);
  });
});
