import { TestBed } from '@angular/core/testing';
// jsdom has no IndexedDB; installs an in-memory implementation of all IndexedDB globals
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { openDB } from 'idb';
import { FeedingPlaceStorage } from './feeding-place-storage';
import { FirearmStorage } from './firearm-storage';

describe('FirearmStorage', () => {
  let storage: FirearmStorage;

  beforeEach(() => {
    // Fresh, empty database for every test
    globalThis.indexedDB = new IDBFactory();
    storage = TestBed.inject(FirearmStorage);
  });

  it('should add a firearm with a generated id', async () => {
    const stored = await storage.add({ name: 'Blaser R8', caliber: '.308 Win', optics: 'riflescope' });

    expect(stored).toEqual({ id: expect.any(String), name: 'Blaser R8', caliber: '.308 Win', optics: 'riflescope' });
    expect(await storage.getAll()).toEqual([stored]);
  });

  it('should update a firearm and refuse one that does not exist', async () => {
    const stored = await storage.add({ name: 'Blaser R8', caliber: '.308 Win', optics: 'none' });

    const updated = await storage.update({ ...stored, optics: 'riflescope', opticsModel: 'Zeiss V8', suppressed: true });

    expect(await storage.getAll()).toEqual([updated]);
    await expect(storage.update({ ...stored, id: 'missing' })).rejects.toThrow('does not exist');
  });

  it('should delete a firearm', async () => {
    const kept = await storage.add({ name: 'CZ 527', caliber: '.222 Rem', optics: 'none' });
    const deleted = await storage.add({ name: 'Blaser R8', caliber: '.308 Win', optics: 'none' });

    await storage.delete(deleted.id);

    expect(await storage.getAll()).toEqual([kept]);
  });

  it('should add the firearms store to a database of the previous version, keeping its data', async () => {
    const old = await openDB('vhonitbe', 3, {
      upgrade(db) {
        db.createObjectStore('events', { keyPath: 'id' });
        db.createObjectStore('photos');
        db.createObjectStore('feeding-places', { keyPath: 'id' });
      },
    });
    await old.put('feeding-places', { id: 'f1', type: 'feeding', location: null, note: '', photoId: null });
    old.close();

    expect(await storage.getAll()).toEqual([]);
    expect((await TestBed.inject(FeedingPlaceStorage).getAll()).map((place) => place.id)).toEqual(['f1']);
  });
});
