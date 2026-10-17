import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GeoPoint } from '../model/event';
import { BackstopOverlay } from '../state/shooting-safety/shooting-safety.model';
import { BackstopOptions, DEFAULT_BACKSTOP_OPTIONS } from './backstop';
import { BackstopRequest, BackstopResponse } from './backstop-messages';

/** Loads the elevation around a point and draws where the terrain provides a backstop, in a web worker */
@Injectable({ providedIn: 'root' })
export class BackstopAnalyzer {
  /** Unsubscribing terminates the worker, so an obsolete analysis stops right away */
  analyze(origin: GeoPoint, options: BackstopOptions = DEFAULT_BACKSTOP_OPTIONS): Observable<BackstopOverlay> {
    return new Observable<BackstopOverlay>((subscriber) => {
      if (typeof Worker === 'undefined') {
        subscriber.error('Web workers are not supported');
        return;
      }

      const worker = new Worker(new URL('./backstop.worker', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }: MessageEvent<BackstopResponse>) => {
        if ('overlay' in data) {
          subscriber.next(data.overlay);
          subscriber.complete();
        } else {
          subscriber.error(data.error);
        }
      };
      worker.onerror = (event) => subscriber.error(event.message);
      worker.postMessage({
        origin: { latitude: origin.latitude, longitude: origin.longitude },
        options,
      } satisfies BackstopRequest);

      return () => worker.terminate();
    });
  }
}
