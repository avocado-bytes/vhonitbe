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
}
