import { DOCUMENT, inject, Injectable } from '@angular/core';
import { GeoPoint } from '../model/event';
import { BackstopOverlay } from '../state/shooting-safety/shooting-safety.model';
import { analyzeBackstop, BackstopOptions, DEFAULT_BACKSTOP_OPTIONS, renderBackstop } from './backstop';
import { loadElevation } from './elevation';

/** Loads the elevation around a point and draws where the terrain provides a backstop */
@Injectable({ providedIn: 'root' })
export class BackstopAnalyzer {
  private readonly document = inject(DOCUMENT);

  async analyze(origin: GeoPoint, options: BackstopOptions = DEFAULT_BACKSTOP_OPTIONS): Promise<BackstopOverlay> {
    // The rays look `backstopDistance` beyond the radius
    const elevation = await loadElevation(origin, options.radius + options.backstopDistance + options.step, this.document);
    const grid = analyzeBackstop((point) => elevation.heightAt(point), origin, options);
    return renderBackstop(grid, origin, this.document);
  }
}
