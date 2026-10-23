import { afterNextRender, Component, DestroyRef, effect, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import type * as Leaflet from 'leaflet';
import { GeoPoint } from '../model/event';
import { EVENT_PIN_OPTIONS } from '../shared/event-pin';
import { huntingGroundOutline } from '../shared/hunting-ground-outline';
import { OPEN_TOPO_MAP_OPTIONS, OPEN_TOPO_MAP_URL } from '../shared/map-tiles';
import { SHOOTER_MARKER_OPTIONS, SHOT_LINE_OPTIONS } from '../shared/shot-line';
import { selectGround } from '../state/hunting-ground/hunting-ground.reducer';
import { selectHuntingGround } from '../state/map-options/map-options.reducer';

const ZOOM = 15;
/** Room around the shooter's position and the event, so neither marker sits at the edge */
const SHOT_PADDING = 48;

/** Leaflet is a CommonJS module; depending on the bundler its API is the namespace or its default export */
async function loadLeaflet(): Promise<typeof Leaflet> {
  const leaflet = await import('leaflet');
  return (leaflet as unknown as { default?: typeof Leaflet }).default ?? leaflet;
}

/**
 * A map centered on an event's location, marked with the event pin, with the boundary of the hunting ground when the map options show it.
 * With the shooter's position of a harvest, it shows both, joined by the line of the shot.
 * Leaflet is loaded on demand, so it stays out of the initial bundle.
 */
@Component({
  imports: [TranslatePipe],
  selector: 'app-event-map',
  styleUrl: './event-map.scss',
  templateUrl: './event-map.html',
})
export class EventMap {
  private readonly store = inject(Store);
  readonly location = input.required<GeoPoint>();
  readonly shooterLocation = input<GeoPoint | null>(null);

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('map');
  private readonly leaflet = signal<{ L: typeof Leaflet; map: Leaflet.Map } | null>(null);
  private readonly huntingGroundEnabled = this.store.selectSignal(selectHuntingGround);
  private readonly huntingGround = this.store.selectSignal(selectGround);

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
      const shooter = this.shooterLocation();
      if (shooter) {
        const from = L.latLng(shooter.latitude, shooter.longitude);
        L.polyline([from, [latitude, longitude]], SHOT_LINE_OPTIONS).addTo(map);
        L.marker(from, { icon: L.divIcon(SHOOTER_MARKER_OPTIONS), interactive: false }).addTo(map);
      }
      // Shows both positions once the map has its size, which it may not have yet while its dialog opens
      let fitted = !shooter;
      const fit = () => {
        if (!fitted && shooter && this.container().nativeElement.clientHeight > 0) {
          fitted = true;
          const bounds = L.latLngBounds([[shooter.latitude, shooter.longitude], [latitude, longitude]]);
          map.fitBounds(bounds, { padding: [SHOT_PADDING, SHOT_PADDING], maxZoom: ZOOM + 1 });
        }
      };
      fit();
      L.marker([latitude, longitude], { icon: L.divIcon(EVENT_PIN_OPTIONS), interactive: false }).addTo(map);
      this.leaflet.set({ L, map });

      // The map may be created while its dialog is still opening; re-measure once it has its size
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          map.invalidateSize();
          fit();
        });
        resizeObserver.observe(this.container().nativeElement);
      }
    });

    let outline: Leaflet.Polygon | undefined;
    effect(() => {
      const leaflet = this.leaflet();
      const ground = this.huntingGround();
      const enabled = this.huntingGroundEnabled();
      if (!leaflet) {
        return;
      }

      outline?.remove();
      outline = enabled && ground ? huntingGroundOutline(leaflet.L, ground).addTo(leaflet.map) : undefined;
    });

    inject(DestroyRef).onDestroy(() => {
      destroyed = true;
      resizeObserver?.disconnect();
      this.leaflet()?.map.remove();
    });
  }
}
