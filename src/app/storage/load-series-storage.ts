import { inject, Service } from '@angular/core';
import { LoadSeries, NewLoadSeries } from '../model/load-series';
import { Database } from './database';

/** Persists the user's load development series in IndexedDB */
@Service()
export class LoadSeriesStorage {
  private readonly database = inject(Database);

  /** All series in no particular order */
  async getAll(): Promise<LoadSeries[]> {
    return (await this.database.open()).getAll('load-series');
  }

  /** Stores a new series, assigning its id */
  async add(series: NewLoadSeries): Promise<LoadSeries> {
    const stored: LoadSeries = { ...series, id: crypto.randomUUID() };
    await (await this.database.open()).add('load-series', stored);
    return stored;
  }

  /** Replaces an existing series, with its test loads */
  async update(series: LoadSeries): Promise<LoadSeries> {
    const tx = (await this.database.open()).transaction('load-series', 'readwrite');
    if (!(await tx.store.get(series.id))) {
      tx.abort();
      // Aborting rejects `tx.done`; that rejection is expected here
      await tx.done.catch(() => undefined);
      throw new Error(`Load series ${series.id} does not exist`);
    }
    await Promise.all([tx.store.put(series), tx.done]);
    return series;
  }

  /** Deletes a series with its test loads; ammunition promoted from it stays */
  async delete(id: string): Promise<void> {
    await (await this.database.open()).delete('load-series', id);
  }
}
