import { TestBed } from '@angular/core/testing';
// jsdom has no IndexedDB; installs an in-memory implementation of all IndexedDB globals
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { HuntingGround } from '../model/hunting-ground';
import { HuntingGroundStorage } from './hunting-ground-storage';

describe('HuntingGroundStorage', () => {
  let storage: HuntingGroundStorage;
  const ground = (code: string): HuntingGround => ({
    code,
    name: `Ground ${code}`,
    area: 1200,
    outline: [[[{ latitude: 49.7, longitude: 13.9 }, { latitude: 49.7, longitude: 14 }, { latitude: 49.8, longitude: 14 }]]],
    searchedAt: { latitude: 49.72, longitude: 13.95 },
    fetchedAt: '2026-10-22T10:00:00.000Z',
  });

  beforeEach(() => {
    // Fresh, empty database for every test
    globalThis.indexedDB = new IDBFactory();
    storage = TestBed.inject(HuntingGroundStorage);
  });

  it('should have no hunting ground at first', async () => {
    expect(await storage.get()).toBeNull();
  });

  it('should keep only the last saved hunting ground', async () => {
    await storage.save(ground('A'));
    await storage.save(ground('B'));

    expect(await storage.get()).toEqual(ground('B'));
  });

  it('should remove the hunting ground', async () => {
    await storage.save(ground('A'));

    await storage.remove();

    expect(await storage.get()).toBeNull();
  });
});
