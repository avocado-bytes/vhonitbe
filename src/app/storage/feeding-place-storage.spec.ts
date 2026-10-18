import { TestBed } from '@angular/core/testing';
// jsdom has no IndexedDB; installs an in-memory implementation of all IndexedDB globals
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { openDB } from 'idb';
import { NewFeedingPlace } from '../model/feeding-place';
import { EventStorage } from './event-storage';
import { FeedingPlaceStorage } from './feeding-place-storage';

describe('FeedingPlaceStorage', () => {
  let storage: FeedingPlaceStorage;
  let events: EventStorage;

  const draft = (overrides: Partial<NewFeedingPlace> = {}): NewFeedingPlace => ({
    type: 'feeding',
    location: { latitude: 49.0, longitude: 13.5 },
    note: '',
    photoId: null,
    ...overrides,
  });

  beforeEach(() => {
    // Fresh, empty database for every test
    globalThis.indexedDB = new IDBFactory();
    storage = TestBed.inject(FeedingPlaceStorage);
    events = TestBed.inject(EventStorage);
  });

  it('should add a place with a generated id and no dates', async () => {
    const stored = await storage.add(draft({ note: 'By the oak' }));

    expect(stored).toEqual({ ...draft({ note: 'By the oak' }), id: expect.any(String) });
    expect(await storage.getAll()).toEqual([stored]);
  });

  it('should keep places apart from the events', async () => {
    await storage.add(draft());

    expect(await events.getAll()).toEqual([]);
    expect((await events.getPage(0, 10)).total).toBe(0);
  });

  it('should update a place and delete the replaced photo', async () => {
    const oldPhoto = await events.addPhoto(new Blob(['old']));
    const stored = await storage.add(draft({ photoId: oldPhoto }));

    const updated = await storage.update({ ...stored, type: 'salt-lick', photoId: null });

    expect(await storage.getAll()).toEqual([updated]);
    expect(await events.getPhoto(oldPhoto)).toBeUndefined();
  });

  it('should refuse to update a place that does not exist', async () => {
    await expect(storage.update({ ...draft(), id: 'missing' })).rejects.toThrow('does not exist');
  });

  it('should delete a place together with its photo', async () => {
    const photoId = await events.addPhoto(new Blob(['photo']));
    const stored = await storage.add(draft({ photoId }));

    await storage.delete(stored.id);

    expect(await storage.getAll()).toEqual([]);
    expect(await events.getPhoto(photoId)).toBeUndefined();
  });

  it('should keep the photos of places when clearing the events', async () => {
    const photoId = await events.addPhoto(new Blob(['photo']));
    await storage.add(draft({ photoId }));

    await events.clear();

    expect(await events.getPhoto(photoId)).toBeDefined();
  });

  it('should move feeders and salt licks stored as events into their own store, without their dates', async () => {
    // A database as the previous version left it, with feeding places among the events
    const old = await openDB('vhonitbe', 2, {
      upgrade(db) {
        const store = db.createObjectStore('events', { keyPath: 'id' });
        store.createIndex('by-type', 'type');
        store.createIndex('by-animal', 'animal');
        store.createIndex('by-occurred-at', 'occurredAt');
        db.createObjectStore('photos');
      },
    });
    const dates = { occurredAt: '2026-10-01T06:30:00.000Z', createdAt: '2026-10-01T06:31:00.000Z', updatedAt: '2026-10-01T06:31:00.000Z' };
    const location = { latitude: 49, longitude: 13.5 };
    await old.put('events', { id: 'spot', type: 'spotting', animal: 'roe-deer', location, note: '', ...dates });
    await old.put('events', { id: 'feeder', type: 'feeding', animal: null, location, note: 'Hay', photoId: 'p1', ...dates });
    await old.put('events', { id: 'lick', type: 'salt-lick', animal: null, location: null, note: '', ...dates });
    old.close();

    const places = await storage.getAll();

    expect(places).toEqual([
      { id: 'feeder', type: 'feeding', location, note: 'Hay', photoId: 'p1' },
      { id: 'lick', type: 'salt-lick', location: null, note: '', photoId: null },
    ]);
    expect((await events.getAll()).map((event) => event.id)).toEqual(['spot']);
  });
});
