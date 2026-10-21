/** A load development series: working up a handload for one caliber */
export interface LoadSeries {
  id: string;
  /** As for a firearm, e.g. ".308 Win" */
  caliber: string;
}

/** The fields the user provides; `id` is set when stored */
export type NewLoadSeries = Omit<LoadSeries, 'id'>;
