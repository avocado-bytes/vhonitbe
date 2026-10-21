import { TestBed } from '@angular/core/testing';
// jsdom has no IndexedDB; installs an in-memory implementation of all IndexedDB globals
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { openDB } from 'idb';
import { NewAmmunition } from '../model/ammunition';
import { AmmunitionStorage } from './ammunition-storage';
import { FirearmStorage } from './firearm-storage';

describe('AmmunitionStorage', () => {
  let storage: AmmunitionStorage;
  const cartridge: NewAmmunition = {
    caliber: '.308 Win',
    source: 'handload',
    bulletWeight: 165,
    muzzleVelocity: 820,
    bulletType: 'Soft point (SP)',
    ballisticCoefficient: 0.447,
    primer: '',
    powder: '',
    brass: '',
    brassFirings: null,
  };

  beforeEach(() => {
    // Fresh, empty database for every test
    globalThis.indexedDB = new IDBFactory();
    storage = TestBed.inject(AmmunitionStorage);
  });

  it('should add ammunition with a generated id', async () => {
    const stored = await storage.add(cartridge);

    expect(stored).toEqual({ ...cartridge, id: expect.any(String) });
    expect(await storage.getAll()).toEqual([stored]);
  });

  it('should update and delete ammunition, refusing to update one that does not exist', async () => {
    const stored = await storage.add(cartridge);
    const other = await storage.add({ ...cartridge, caliber: '.243 Win' });

    const updated = await storage.update({ ...stored, brassFirings: 4 });
    expect((await storage.getAll()).find((a) => a.id === stored.id)).toEqual(updated);
    await expect(storage.update({ ...stored, id: 'missing' })).rejects.toThrow('does not exist');

    await storage.delete(stored.id);
    expect(await storage.getAll()).toEqual([other]);
  });

  it('should add the ammunition store to a database of the previous version, keeping the firearms', async () => {
    const old = await openDB('vhonitbe', 4, {
      upgrade(db) {
        db.createObjectStore('events', { keyPath: 'id' });
        db.createObjectStore('photos');
        db.createObjectStore('feeding-places', { keyPath: 'id' });
        db.createObjectStore('firearms', { keyPath: 'id' });
      },
    });
    await old.put('firearms', { id: 'g1', name: 'Blaser R8', caliber: '.308 Win', optics: 'none' });
    old.close();

    expect(await storage.getAll()).toEqual([]);
    expect((await TestBed.inject(FirearmStorage).getAll()).map((firearm) => firearm.id)).toEqual(['g1']);
  });
});
