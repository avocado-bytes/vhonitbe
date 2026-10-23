import { afterNextRender, Component, DestroyRef, effect, ElementRef, inject, input, model, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import type * as Leaflet from 'leaflet';
import { GeoPoint } from '../model/event';
import { EVENT_PIN_OPTIONS } from '../shared/event-pin';
import { OPEN_TOPO_MAP_OPTIONS, OPEN_TOPO_MAP_URL } from '../shared/map-tiles';
import { SHOT_LINE_OPTIONS } from '../shared/shot-line';

const ZOOM = 15;
/** ~10 cm; avoids noise like 49.00000000001 from map projections */
const PRECISION = 1e6;

/** Leaflet is a CommonJS module; depending on the bundler its API is the namespace or its default export */
async function loadLeaflet(): Promise<typeof Leaflet> {
  const leaflet = await import('leaflet');
  return (leaflet as unknown as { default?: typeof Leaflet }).default ?? leaflet;
}

/**
 * A small map with a crosshair in its center; panning the map moves the location, and a location set
 * from outside, e.g. back to the user's position, moves the map. A target, e.g. the location of a harvest when picking
 * the shooter's position, is marked with the event pin and joined to the crosshair by the line of the shot.
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
  /** Translation keys of the map's accessible name and the hint below it, for a picker of another kind of location */
  readonly label = input('LOCATION_PICKER.MAP');
  readonly hint = input('LOCATION_PICKER.HINT');
  /** Whether the read-only coordinates are shown below the map; off when the parent lets them be typed instead */
  readonly showCoordinates = input(true);
  readonly target = input<GeoPoint | null>(null);

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('map');
  private map?: Leaflet.Map;
  /** The map is being moved to a location set from outside, whose center snaps to whole pixels; that isn't a new location */
  private following = false;
  /** Leaflet, once loaded and the map created */
  private readonly leaflet = signal<typeof Leaflet | null>(null);
  /** The pin of the target and the line from the crosshair to it */
  private shot?: { pin: Leaflet.Marker; line: Leaflet.Polyline; target: Leaflet.LatLng };

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
        this.shot?.line.setLatLngs([map.getCenter(), this.shot.target]);
        if (this.following) {
          return;
        }
        const center = map.getCenter();
        this.location.set({
          latitude: Math.round(center.lat * PRECISION) / PRECISION,
          longitude: Math.round(center.lng * PRECISION) / PRECISION,
        });
      });
      this.map = map;
      this.leaflet.set(L);

      // The map may be created while its dialog is still hidden; re-measure once it becomes visible
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => map.invalidateSize());
        resizeObserver.observe(this.container().nativeElement);
      }
    });

    // Follows a location set from outside; one set by panning is already the map's center
    effect(() => {
      const { latitude, longitude } = this.location();
      const map = this.map;
      if (!map) {
        return;
      }
      const center = map.getCenter();
      if (Math.abs(center.lat - latitude) > 1 / PRECISION || Math.abs(center.lng - longitude) > 1 / PRECISION) {
        this.following = true;
        map.setView([latitude, longitude], map.getZoom(), { animate: false });
        this.following = false;
      }
    });

    effect(() => {
      const L = this.leaflet();
      const point = this.target();
      const map = this.map;
      this.shot?.pin.remove();
      this.shot?.line.remove();
      this.shot = undefined;
      if (!L || !map || !point) {
        return;
      }
      const target = L.latLng(point.latitude, point.longitude);
      this.shot = {
        pin: L.marker(target, { icon: L.divIcon(EVENT_PIN_OPTIONS), interactive: false }).addTo(map),
        line: L.polyline([map.getCenter(), target], SHOT_LINE_OPTIONS).addTo(map),
        target,
      };
    });

    inject(DestroyRef).onDestroy(() => {
      destroyed = true;
      resizeObserver?.disconnect();
      this.map?.remove();
    });
  }
}
