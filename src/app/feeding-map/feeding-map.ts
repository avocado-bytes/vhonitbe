import { afterNextRender, Component, computed, DestroyRef, effect, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import type * as Leaflet from 'leaflet';
import { HuntingEvent } from '../model/event';
import { FEEDING_ITEMS, FeedingItem } from '../model/item';
import { eventPinOptions } from '../shared/event-pin';
import { OPEN_TOPO_MAP_OPTIONS, OPEN_TOPO_MAP_URL } from '../shared/map-tiles';
import { selectLanguage } from '../state/settings/settings.reducer';

/** Pin colors telling feeders and salt licks apart; also used by the legend */
export const FEEDING_PIN_COLORS: Record<FeedingItem, string> = {
  feeding: '#8a5a2b',
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
 * A small map showing all feeders and salt licks, zoomed to fit them; a marker's popup names it and its date.
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
  /** Events with a location */
  readonly events = input.required<readonly HuntingEvent[]>();

  protected readonly items = FEEDING_ITEMS;
  protected readonly colors = FEEDING_PIN_COLORS;

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('map');
  private readonly leaflet = signal<{ L: typeof Leaflet; map: Leaflet.Map } | null>(null);

  private readonly language = inject(Store).selectSignal(selectLanguage);
  /** Changes once the translations of a newly selected language are loaded */
  private readonly translationsChanged = toSignal(this.translate.onLangChange);
  private readonly dateFormat = computed(
    () => new Intl.DateTimeFormat(this.language(), { dateStyle: 'medium', timeStyle: 'short' }),
  );

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
      const events = this.events();
      this.translationsChanged();
      this.dateFormat();
      if (!leaflet || events.length === 0) {
        return;
      }
      const { L, map } = leaflet;

      markers?.remove();
      markers = L.layerGroup();
      const icons = new Map(FEEDING_ITEMS.map((item) => [item, L.divIcon(eventPinOptions(FEEDING_PIN_COLORS[item]))]));
      for (const event of events) {
        if (event.location) {
          L.marker([event.location.latitude, event.location.longitude], {
            icon: icons.get(event.type as FeedingItem),
            title: this.translate.instant(`ITEMS.${event.type}`),
            keyboard: true,
          })
            .bindPopup(() => this.popupContent(event))
            .addTo(markers);
        }
      }
      markers.addTo(map);

      const bounds = L.latLngBounds(events.flatMap((event) => (event.location ? [[event.location.latitude, event.location.longitude] as Leaflet.LatLngTuple] : [])));
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: MAX_FIT_ZOOM });
    });

    inject(DestroyRef).onDestroy(() => {
      destroyed = true;
      resizeObserver?.disconnect();
      this.leaflet()?.map.remove();
    });
  }

  /** Built from DOM nodes rather than an HTML string, so no user data is ever parsed as HTML */
  private popupContent(event: HuntingEvent): HTMLElement {
    const content = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'fw-semibold';
    title.textContent = this.translate.instant(`ITEMS.${event.type}`);
    const time = document.createElement('time');
    time.className = 'small';
    time.dateTime = event.occurredAt;
    time.textContent = this.dateFormat().format(new Date(event.occurredAt));
    content.append(title, time);
    return content;
  }
}
