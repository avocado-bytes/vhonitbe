import { afterNextRender, Component, DestroyRef, ElementRef, inject, model, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import type * as Leaflet from 'leaflet';
import { GeoPoint } from '../model/event';
import { OPEN_TOPO_MAP_OPTIONS, OPEN_TOPO_MAP_URL } from '../shared/map-tiles';

const ZOOM = 15;
/** ~10 cm; avoids noise like 49.00000000001 from map projections */
const PRECISION = 1e6;

/** Leaflet is a CommonJS module; depending on the bundler its API is the namespace or its default export */
async function loadLeaflet(): Promise<typeof Leaflet> {
  const leaflet = await import('leaflet');
  return (leaflet as unknown as { default?: typeof Leaflet }).default ?? leaflet;
}

/**
 * A small map with a crosshair in its center; panning the map moves the location.
 * Leaflet is loaded on demand, so it stays out of the initial bundle.
 */
@Component({
  imports: [TranslatePipe, DecimalPipe],
  selector: 'app-location-picker',
  styleUrl: './location-picker.scss',
  templateUrl: './location-picker.html',
})
export class LocationPicker {
  readonly location = model.required<GeoPoint>();

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('map');
  private map?: Leaflet.Map;

  constructor() {
    let destroyed = false;
    let resizeObserver: ResizeObserver | undefined;

    afterNextRender(async () => {
      const L = await loadLeaflet();
      if (destroyed) {
        return;
      }

      const { latitude, longitude } = this.location();
      const map = L.map(this.container().nativeElement, { center: [latitude, longitude], zoom: ZOOM });
      L.tileLayer(OPEN_TOPO_MAP_URL, OPEN_TOPO_MAP_OPTIONS).addTo(map);
      map.on('move', () => {
        const center = map.getCenter();
        this.location.set({
          latitude: Math.round(center.lat * PRECISION) / PRECISION,
          longitude: Math.round(center.lng * PRECISION) / PRECISION,
        });
      });
      this.map = map;

      // The map may be created while its dialog is still hidden; re-measure once it becomes visible
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => map.invalidateSize());
        resizeObserver.observe(this.container().nativeElement);
      }
    });

    inject(DestroyRef).onDestroy(() => {
      destroyed = true;
      resizeObserver?.disconnect();
      this.map?.remove();
    });
  }
}
