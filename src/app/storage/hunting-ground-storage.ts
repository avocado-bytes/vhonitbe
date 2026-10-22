import { inject, Service } from '@angular/core';
import { HuntingGround } from '../model/hunting-ground';
import { Database } from './database';

/** Persists the user's hunting ground in IndexedDB, so its boundary is shown offline too */
@Service()
export class HuntingGroundStorage {
  private readonly database = inject(Database);

  /** The hunting ground, or null when none was chosen */
  async get(): Promise<HuntingGround | null> {
    const [ground] = await (await this.database.open()).getAll('hunting-ground');
    return ground ?? null;
  }

  /** Stores the hunting ground in place of any earlier one */
  async save(ground: HuntingGround): Promise<HuntingGround> {
    const tx = (await this.database.open()).transaction('hunting-ground', 'readwrite');
    await Promise.all([tx.store.clear(), tx.store.put(ground), tx.done]);
    return ground;
  }

  async remove(): Promise<void> {
    await (await this.database.open()).clear('hunting-ground');
  }
}
