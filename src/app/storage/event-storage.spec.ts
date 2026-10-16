import { TestBed } from '@angular/core/testing';
// jsdom has no IndexedDB; installs an in-memory implementation of all IndexedDB globals
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { NewHuntingEvent } from '../model/event';
import { EventStorage } from './event-storage';

describe('EventStorage', () => {
  let storage: EventStorage;

  const draft = (overrides: Partial<NewHuntingEvent> = {}): NewHuntingEvent => ({
    type: 'spotting',
    animal: 'roe-deer',
    location: { latitude: 49.0, longitude: 13.5 },
    note: '',
    occurredAt: '2026-10-01T06:30:00.000Z',
    ...overrides,
  });

  beforeEach(() => {
    // Fresh, empty database for every test
    globalThis.indexedDB = new IDBFactory();
    storage = TestBed.inject(EventStorage);
  });

  it('should add an event with a generated id and timestamps', async () => {
    const stored = await storage.add(draft());

    expect(stored.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(stored.createdAt).toBe(stored.updatedAt);
    expect(await storage.get(stored.id)).toEqual(stored);
  });

  it('should return all events ordered by when they occurred', async () => {
    const later = await storage.add(draft({ occurredAt: '2026-10-02T18:00:00.000Z' }));
    const earlier = await storage.add(draft({ occurredAt: '2026-10-01T06:30:00.000Z' }));

    expect(await storage.getAll()).toEqual([earlier, later]);
  });

  it('should find events by type and by animal', async () => {
    const harvest = await storage.add(draft({ type: 'harvest', animal: 'wild-boar' }));
    const spotting = await storage.add(draft({ type: 'spotting', animal: 'roe-deer' }));
    await storage.add(draft({ type: 'poaching', animal: null }));

    expect(await storage.getByType('harvest')).toEqual([harvest]);
    expect(await storage.getByAnimal('roe-deer')).toEqual([spotting]);
  });

  it('should find events within a time range', async () => {
    await storage.add(draft({ occurredAt: '2026-09-30T23:59:59.000Z' }));
    const inside = await storage.add(draft({ occurredAt: '2026-10-15T12:00:00.000Z' }));
    await storage.add(draft({ occurredAt: '2026-11-01T00:00:00.000Z' }));

    expect(await storage.getBetween('2026-10-01T00:00:00.000Z', '2026-10-31T23:59:59.999Z')).toEqual([inside]);
  });

  it('should update an existing event and refresh updatedAt', async () => {
    const stored = await storage.add(draft());
    await new Promise((resolve) => setTimeout(resolve, 5));

    const updated = await storage.update({ ...stored, note: 'Doe with two fawns' });

    expect(updated.note).toBe('Doe with two fawns');
    expect(updated.createdAt).toBe(stored.createdAt);
    expect(updated.updatedAt > stored.updatedAt).toBe(true);
    expect(await storage.get(stored.id)).toEqual(updated);
  });

  it('should refuse to update an event that does not exist', async () => {
    const stored = await storage.add(draft());
    await storage.delete(stored.id);

    await expect(storage.update(stored)).rejects.toThrow(`Event ${stored.id} does not exist`);
    expect(await storage.getAll()).toEqual([]);
  });

  it('should delete a single event and clear all events', async () => {
    const first = await storage.add(draft());
    const second = await storage.add(draft());

    await storage.delete(first.id);
    expect(await storage.getAll()).toEqual([second]);

    await storage.clear();
    expect(await storage.getAll()).toEqual([]);
  });

  describe('getPage', () => {
    const addEvents = async (count: number) => {
      const stored = [];
      for (let day = 1; day <= count; day++) {
        stored.push(await storage.add(draft({ occurredAt: `2026-10-${String(day).padStart(2, '0')}T12:00:00.000Z` })));
      }
      return stored;
    };

    it('should return the newest events first with the total count', async () => {
      const stored = await addEvents(5);

      expect(await storage.getPage(0, 2)).toEqual({ events: [stored[4], stored[3]], total: 5 });
    });

    it('should skip to the requested offset', async () => {
      const stored = await addEvents(5);

      expect(await storage.getPage(2, 2)).toEqual({ events: [stored[2], stored[1]], total: 5 });
      expect(await storage.getPage(4, 2)).toEqual({ events: [stored[0]], total: 5 });
    });

    it('should return an empty page past the end and for an empty database', async () => {
      expect(await storage.getPage(0, 10)).toEqual({ events: [], total: 0 });

      await addEvents(2);
      expect(await storage.getPage(10, 10)).toEqual({ events: [], total: 2 });
    });
  });

  describe('requestPersistence', () => {
    // jsdom does not implement navigator.storage
    const mockStorage = (manager: Partial<StorageManager> | undefined) =>
      Object.defineProperty(navigator, 'storage', { value: manager, configurable: true });

    afterEach(() => Reflect.deleteProperty(navigator, 'storage'));

    it('should not ask again when storage is already persistent', async () => {
      const persist = vi.fn();
      mockStorage({ persisted: vi.fn().mockResolvedValue(true), persist });

      expect(await storage.requestPersistence()).toBe(true);
      expect(persist).not.toHaveBeenCalled();
    });

    it('should ask the browser to persist storage', async () => {
      const persist = vi.fn().mockResolvedValue(true);
      mockStorage({ persisted: vi.fn().mockResolvedValue(false), persist });

      expect(await storage.requestPersistence()).toBe(true);
      expect(persist).toHaveBeenCalled();
    });

    it('should report false when the browser declines or does not support it', async () => {
      mockStorage({ persisted: vi.fn().mockResolvedValue(false), persist: vi.fn().mockResolvedValue(false) });
      expect(await storage.requestPersistence()).toBe(false);

      mockStorage(undefined);
      expect(await storage.requestPersistence()).toBe(false);
    });
  });
});
