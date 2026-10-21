import { inject, Service } from '@angular/core';
import { Firearm, NewFirearm } from '../model/firearm';
import { Database } from './database';

/** Persists the user's firearms in IndexedDB */
@Service()
export class FirearmStorage {
  private readonly database = inject(Database);

  /** All firearms in no particular order */
  async getAll(): Promise<Firearm[]> {
    return (await this.database.open()).getAll('firearms');
  }

  /** Stores a new firearm, assigning its id */
  async add(firearm: NewFirearm): Promise<Firearm> {
    const stored: Firearm = { ...firearm, id: crypto.randomUUID() };
    await (await this.database.open()).add('firearms', stored);
    return stored;
  }

  /** Replaces an existing firearm */
  async update(firearm: Firearm): Promise<Firearm> {
    const tx = (await this.database.open()).transaction('firearms', 'readwrite');
    if (!(await tx.store.get(firearm.id))) {
      tx.abort();
      // Aborting rejects `tx.done`; that rejection is expected here
      await tx.done.catch(() => undefined);
      throw new Error(`Firearm ${firearm.id} does not exist`);
    }
    await Promise.all([tx.store.put(firearm), tx.done]);
    return firearm;
  }

  async delete(id: string): Promise<void> {
    await (await this.database.open()).delete('firearms', id);
  }
}
