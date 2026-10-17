/// <reference lib="webworker" />

import { analyzeBackstop, renderBackstop } from './backstop';
import { BackstopRequest, BackstopResponse } from './backstop-messages';
import { loadElevation } from './elevation';

/** Loads the elevation, analyzes it and draws the overlay, keeping the user interface responsive */
addEventListener('message', async ({ data }: MessageEvent<BackstopRequest>) => {
  const { origin, options } = data;
  try {
    // The rays look `backstopDistance` beyond the radius
    const elevation = await loadElevation(origin, options.radius + options.backstopDistance + options.step);
    const grid = analyzeBackstop((point) => elevation.heightAt(point), origin, options);
    postMessage({ overlay: await renderBackstop(grid, origin) } satisfies BackstopResponse);
  } catch (error) {
    postMessage({ error: String(error) } satisfies BackstopResponse);
  }
});
