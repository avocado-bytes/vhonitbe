import { Component, computed, DestroyRef, DOCUMENT, effect, ElementRef, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import * as L from 'leaflet';
import { EVENT_MENU_ITEMS, MapMenu, MapMenuItem, POINT_MENU_ITEMS } from '../map-menu/map-menu';
import { GeoPoint, HuntingEvent } from '../model/event';
import { OPEN_TOPO_MAP_OPTIONS, OPEN_TOPO_MAP_URL } from '../shared/map-tiles';
import { EventsActions } from '../state/events/events.actions';
import { selectLatest } from '../state/events/events.reducer';
import { LocationActions } from '../state/location/location.actions';
import { selectError, selectPosition, selectStatus } from '../state/location/location.reducer';
import { selectLanguage } from '../state/settings/settings.reducer';

const LOCATED_ZOOM = 14;

const LOCATION_COLOR = '#355e3b';

/** ~10 cm; avoids noise like 49.00000000001 from map projections */
const PRECISION = 1e6;

/** A pin, so events are easy to tell apart from the round "you are here" marker */
const EVENT_ICON = L.divIcon({
  className: 'event-marker',
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36" aria-hidden="true">
    <path d="M14 1C7 1 1.5 6.5 1.5 13.5 1.5 23 14 35 14 35s12.5-12 12.5-21.5C26.5 6.5 21 1 14 1z" fill="#22392a" stroke="#fff" stroke-width="2"/>
    <circle cx="14" cy="13.5" r="5" fill="#fff"/>
  </svg>`,
  iconSize: [28, 36],
  iconAnchor: [14, 35],
  popupAnchor: [0, -32],
});

@Component({
  imports: [TranslatePipe, MapMenu],
  selector: 'app-map',
  styleUrl: './map.scss',
  templateUrl: './map.html',
})
export class MapView {
  private readonly store = inject(Store);
  private readonly translate = inject(TranslateService);
  /** Only rendered once the location is known */
  private readonly container = viewChild<ElementRef<HTMLElement>>('map');
  private readonly map = signal<L.Map | undefined>(undefined);

  private readonly window = inject(DOCUMENT).defaultView;

  /** The context menu opened for a point or an event marker on the map, placed in container pixels */
  protected readonly menu = signal<{
    x: number;
    y: number;
    location: GeoPoint;
    event: HuntingEvent | null;
    items: readonly MapMenuItem[];
  } | null>(null);

  protected readonly status = this.store.selectSignal(selectStatus);
  protected readonly error = this.store.selectSignal(selectError);
  protected readonly position = this.store.selectSignal(selectPosition);
  private readonly latest = this.store.selectSignal(selectLatest);

  private readonly language = this.store.selectSignal(selectLanguage);
  /** Changes once the translations of a newly selected language are loaded */
  private readonly translationsChanged = toSignal(this.translate.onLangChange);
  private readonly dateFormat = computed(
    () => new Intl.DateTimeFormat(this.language(), { dateStyle: 'medium', timeStyle: 'short' }),
  );

  constructor() {
    this.store.dispatch(LocationActions.locate());
    this.store.dispatch(EventsActions.loadLatest());

    const locationLayer = L.layerGroup();
    effect(() => {
      const container = this.container();
      const position = this.position();
      if (!container || !position) {
        return;
      }

      const center: L.LatLngTuple = [position.latitude, position.longitude];
      const map = untracked(this.map) ?? this.createMap(container.nativeElement);
      locationLayer.clearLayers();
      L.circle(center, { radius: position.accuracy, color: LOCATION_COLOR, weight: 1, fillOpacity: 0.1 }).addTo(locationLayer);
      L.circleMarker(center, { radius: 8, color: '#fff', weight: 2, fillColor: LOCATION_COLOR, fillOpacity: 1 }).addTo(
        locationLayer,
      );
      locationLayer.addTo(map);
      map.setView(center, LOCATED_ZOOM);
    });

    const eventsLayer = L.layerGroup();
    effect(() => {
      const map = this.map();
      const events = this.latest();
      this.translationsChanged();
      this.dateFormat();
      if (!map) {
        return;
      }

      eventsLayer.clearLayers();
      for (const event of events) {
        if (event.location) {
          L.marker([event.location.latitude, event.location.longitude], {
            icon: EVENT_ICON,
            title: this.translate.instant(`ITEMS.${event.type}`),
            keyboard: true,
          })
            .bindPopup(() => this.popupContent(event))
            // Markers don't pass mouse events on to the map, so this replaces the map's menu
            .on('contextmenu', (mouseEvent: L.LeafletMouseEvent) => this.openMenu(mouseEvent, event))
            .addTo(eventsLayer);
        }
      }
      eventsLayer.addTo(map);
    });

    inject(DestroyRef).onDestroy(() => this.map()?.remove());
  }

  private createMap(container: HTMLElement): L.Map {
    const map = L.map(container);
    L.tileLayer(OPEN_TOPO_MAP_URL, OPEN_TOPO_MAP_OPTIONS).addTo(map);
    // Leaflet also fires contextmenu on a long press on touch devices
    map.on('contextmenu', (event: L.LeafletMouseEvent) => this.openMenu(event));
    // Touch devices have no right click, so a plain tap opens the menu as well
    map.on('click', (event: L.LeafletMouseEvent) => {
      if (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) {
        this.openMenu(event);
      }
    });
    // The menu belongs to a point, so it would be misplaced once the map moves
    map.on('movestart zoomstart', () => this.closeMenu());
    this.map.set(map);
    return map;
  }

  /** Opens the menu for an event marker when an event is given, otherwise for the clicked point */
  private openMenu(mouseEvent: L.LeafletMouseEvent, event: HuntingEvent | null = null): void {
    this.menu.set({
      x: mouseEvent.containerPoint.x,
      y: mouseEvent.containerPoint.y,
      location: {
        latitude: Math.round(mouseEvent.latlng.lat * PRECISION) / PRECISION,
        longitude: Math.round(mouseEvent.latlng.lng * PRECISION) / PRECISION,
      },
      event,
      items: event ? EVENT_MENU_ITEMS : POINT_MENU_ITEMS,
    });
  }

  protected onMenuSelected(item: MapMenuItem): void {
    const menu = this.menu();
    this.closeMenu();
    if (!menu) {
      return;
    }

    switch (item) {
      case 'add-item':
        this.store.dispatch(EventsActions.startAdd({ location: menu.location }));
        break;
      case 'edit-item':
        if (menu.event) {
          this.store.dispatch(EventsActions.startEdit({ event: menu.event }));
        }
        break;
      case 'delete-item':
        if (menu.event && this.window?.confirm(this.translate.instant('OVERVIEW.DELETE_CONFIRM'))) {
          this.store.dispatch(EventsActions.deleteEvent({ id: menu.event.id }));
        }
        break;
    }
  }

  protected closeMenu(): void {
    this.menu.set(null);
  }

  /** Built from DOM nodes rather than an HTML string, so no user data is ever parsed as HTML */
  private popupContent(event: HuntingEvent): HTMLElement {
    const content = document.createElement('div');
    content.className = 'event-popup';
    const line = (text: string, className: string) => {
      const element = document.createElement('div');
      element.className = className;
      element.textContent = text;
      content.append(element);
    };

    line(this.translate.instant(`ITEMS.${event.type}`), 'fw-semibold');
    if (event.animal) {
      line(this.translate.instant(`ANIMALS.${event.animal}`), '');
    }
    const time = document.createElement('time');
    // Leaflet popups are always white, so use their dark text color rather than the theme's muted one
    time.className = 'small';
    time.dateTime = event.occurredAt;
    time.textContent = this.dateFormat().format(new Date(event.occurredAt));
    content.append(time);
    return content;
  }
}
