import { afterNextRender, Component, DestroyRef, effect, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import type * as Leaflet from 'leaflet';
import { FEEDING_PLACE_TYPES, FeedingPlace, FeedingPlaceType } from '../model/feeding-place';
import { eventPinOptions } from '../shared/event-pin';
import { OPEN_TOPO_MAP_OPTIONS, OPEN_TOPO_MAP_URL } from '../shared/map-tiles';

/** Pin colors telling the types of feeding places apart; also used by the legend */
export const FEEDING_PIN_COLORS: Record<FeedingPlaceType, string> = {
  feeding: '#8a5a2b',
  'feed-pile': '#b8862b',
  'bait-site': '#7a3e6e',
  'salt-lick': '#3f6e8c',
};

/** Close enough to see the surroundings of a single place, or of places close to each other */
const MAX_FIT_ZOOM = 15;

/** Leaflet is a CommonJS module; depending on the bundler its API is the namespace or its default export */
async function loadLeaflet(): Promise<typeof Leaflet> {
  const leaflet = await import('leaflet');
  return (leaflet as unknown as { default?: typeof Leaflet }).default ?? leaflet;
}

/**
 * A small map showing all feeders and salt licks, zoomed to fit them; a marker's popup names its type.
 * Leaflet is loaded on demand, so it stays out of the initial bundle.
 */
@Component({
  imports: [TranslatePipe],
  selector: 'app-feeding-map',
  styleUrl: './feeding-map.scss',
  templateUrl: './feeding-map.html',
})
export class FeedingMap {
  private readonly translate = inject(TranslateService);
  /** Places with a location */
  readonly places = input.required<readonly FeedingPlace[]>();

  protected readonly types = FEEDING_PLACE_TYPES;
  protected readonly colors = FEEDING_PIN_COLORS;

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('map');
  private readonly leaflet = signal<{ L: typeof Leaflet; map: Leaflet.Map } | null>(null);

  /** Changes once the translations of a newly selected language are loaded */
  private readonly translationsChanged = toSignal(this.translate.onLangChange);

  constructor() {
    let destroyed = false;
    let resizeObserver: ResizeObserver | undefined;

    afterNextRender(async () => {
      const L = await loadLeaflet();
      if (destroyed) {
        return;
      }
      const map = L.map(this.container().nativeElement);
      L.tileLayer(OPEN_TOPO_MAP_URL, OPEN_TOPO_MAP_OPTIONS).addTo(map);
      this.leaflet.set({ L, map });

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => map.invalidateSize());
        resizeObserver.observe(this.container().nativeElement);
      }
    });

    let markers: Leaflet.LayerGroup | undefined;
    effect(() => {
      const leaflet = this.leaflet();
      const places = this.places();
      this.translationsChanged();
      if (!leaflet || places.length === 0) {
        return;
      }
      const { L, map } = leaflet;

      markers?.remove();
      markers = L.layerGroup();
      const icons = new Map(FEEDING_PLACE_TYPES.map((type) => [type, L.divIcon(eventPinOptions(FEEDING_PIN_COLORS[type]))]));
      for (const place of places) {
        if (place.location) {
          L.marker([place.location.latitude, place.location.longitude], {
            icon: icons.get(place.type),
            title: this.translate.instant(`FEEDING.TYPES.${place.type}`),
            keyboard: true,
          })
            .bindPopup(() => this.popupContent(place))
            .addTo(markers);
        }
      }
      markers.addTo(map);

      const bounds = L.latLngBounds(places.flatMap((place) => (place.location ? [[place.location.latitude, place.location.longitude] as Leaflet.LatLngTuple] : [])));
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: MAX_FIT_ZOOM });
    });

    inject(DestroyRef).onDestroy(() => {
      destroyed = true;
      resizeObserver?.disconnect();
      this.leaflet()?.map.remove();
    });
  }

  /** Built from DOM nodes rather than an HTML string, so no user data is ever parsed as HTML */
  private popupContent(place: FeedingPlace): HTMLElement {
    const content = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'fw-semibold';
    title.textContent = this.translate.instant(`FEEDING.TYPES.${place.type}`);
    content.append(title);
    return content;
  }
}
