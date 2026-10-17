import { afterNextRender, Component, DestroyRef, ElementRef, inject, input, viewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import type * as Leaflet from 'leaflet';
import { GeoPoint } from '../model/event';
import { EVENT_PIN_OPTIONS } from '../shared/event-pin';
import { OPEN_TOPO_MAP_OPTIONS, OPEN_TOPO_MAP_URL } from '../shared/map-tiles';

const ZOOM = 15;

/** Leaflet is a CommonJS module; depending on the bundler its API is the namespace or its default export */
async function loadLeaflet(): Promise<typeof Leaflet> {
  const leaflet = await import('leaflet');
  return (leaflet as unknown as { default?: typeof Leaflet }).default ?? leaflet;
}

/**
 * A map centered on an event's location, marked with the event pin.
 * Leaflet is loaded on demand, so it stays out of the initial bundle.
 */
@Component({
  imports: [TranslatePipe],
  selector: 'app-event-map',
  styleUrl: './event-map.scss',
  templateUrl: './event-map.html',
})
export class EventMap {
  readonly location = input.required<GeoPoint>();

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
      L.marker([latitude, longitude], { icon: L.divIcon(EVENT_PIN_OPTIONS), interactive: false }).addTo(map);
      this.map = map;

      // The map may be created while its dialog is still opening; re-measure once it has its size
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
