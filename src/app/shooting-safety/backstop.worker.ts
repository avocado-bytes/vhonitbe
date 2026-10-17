/// <reference lib="webworker" />

import { analyzeBackstop, dangerZoneExtent, renderBackstop } from './backstop';
import { BackstopRequest, BackstopResponse } from './backstop-messages';
import { loadElevation } from './elevation';
import { DangerZones, loadHazards } from './hazards';

/**
 * Loads the elevation, analyzes it and draws the overlay, keeping the user interface responsive.
 * The terrain-only overlay is sent first, as the building data can take long on a slow network;
 * the overlay including buildings follows once they are loaded.
 */
addEventListener('message', async ({ data }: MessageEvent<BackstopRequest>) => {
  const { origin, options } = data;
  try {
    // Started right away, so it loads alongside the elevation
    const hazards = loadHazards(origin, dangerZoneExtent(options)).catch(() => null);

    // The rays look up to `distantBackstopDistance` beyond the radius
    const behind = Math.max(options.backstopDistance, options.distantBackstopDistance);
    const elevation = await loadElevation(origin, options.radius + behind + options.step);
    const heightAt = elevation.heightAt.bind(elevation);
    const terrain = analyzeBackstop(heightAt, origin, options);
    postMessage({
      overlay: await renderBackstop(terrain, origin, null, 'loading'),
      final: false,
    } satisfies BackstopResponse);

    const loaded = await hazards;
    if (!loaded) {
      postMessage({ overlay: await renderBackstop(terrain, origin, null, 'failed'), final: true } satisfies BackstopResponse);
      return;
    }
    const zones = new DangerZones(loaded, origin, dangerZoneExtent(options), options.step, options.buildingDistance);
    const grid = analyzeBackstop(heightAt, origin, options, zones);
    postMessage({ overlay: await renderBackstop(grid, origin, zones, 'loaded'), final: true } satisfies BackstopResponse);
  } catch (error) {
    postMessage({ error: String(error) } satisfies BackstopResponse);
  }
});
