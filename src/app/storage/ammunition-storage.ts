import { inject, Service } from '@angular/core';
import { Ammunition, NewAmmunition } from '../model/ammunition';
import { Database } from './database';

/** Persists the user's ammunition in IndexedDB */
@Service()
export class AmmunitionStorage {
  private readonly database = inject(Database);

  /** All ammunition in no particular order */
  async getAll(): Promise<Ammunition[]> {
    return (await this.database.open()).getAll('ammunition');
  }

  /** Stores new ammunition, assigning its id */
  async add(ammunition: NewAmmunition): Promise<Ammunition> {
    const stored: Ammunition = { ...ammunition, id: crypto.randomUUID() };
    await (await this.database.open()).add('ammunition', stored);
    return stored;
  }

  /** Replaces existing ammunition */
  async update(ammunition: Ammunition): Promise<Ammunition> {
    const tx = (await this.database.open()).transaction('ammunition', 'readwrite');
    if (!(await tx.store.get(ammunition.id))) {
      tx.abort();
      // Aborting rejects `tx.done`; that rejection is expected here
      await tx.done.catch(() => undefined);
      throw new Error(`Ammunition ${ammunition.id} does not exist`);
    }
    await Promise.all([tx.store.put(ammunition), tx.done]);
    return ammunition;
  }

  async delete(id: string): Promise<void> {
    await (await this.database.open()).delete('ammunition', id);
  }
}
