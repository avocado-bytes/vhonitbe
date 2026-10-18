import { DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, DOCUMENT, effect, ElementRef, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import * as L from 'leaflet';
import { EVENT_MENU_ITEMS, MapMenu, MapMenuItem, POINT_MENU_ITEMS } from '../map-menu/map-menu';
import { GeoPoint, HuntingEvent } from '../model/event';
import { ELEVATION_ATTRIBUTION } from '../shooting-safety/elevation';
import { offset } from '../shooting-safety/geo';
import { EVENT_PIN_OPTIONS } from '../shared/event-pin';
import { OPEN_TOPO_MAP_OPTIONS, OPEN_TOPO_MAP_URL } from '../shared/map-tiles';
import { EventsActions } from '../state/events/events.actions';
import { selectLatest } from '../state/events/events.reducer';
import { LocationActions } from '../state/location/location.actions';
import { selectError, selectManual, selectPosition, selectStatus } from '../state/location/location.reducer';
import { MapOptionsActions } from '../state/map-options/map-options.actions';
import { selectDistanceRings, selectFollowMe, selectPanelOpen, selectTracking, selectWindCone } from '../state/map-options/map-options.reducer';
import { selectLanguage } from '../state/settings/settings.reducer';
import { ShootingSafetyActions } from '../state/shooting-safety/shooting-safety.actions';
import {
  selectShootingSafetyEnabled,
  selectShootingSafetyOverlay,
  selectShootingSafetyStatus,
} from '../state/shooting-safety/shooting-safety.reducer';
import { WeatherActions } from '../state/weather/weather.actions';
import { selectCurrentWeather, selectWeatherStatus } from '../state/weather/weather.reducer';

const LOCATED_ZOOM = 14;

const LOCATION_COLOR = '#355e3b';

/** Following re-centers the map only once the user is this share of its width or height away from the center */
const FOLLOW_THRESHOLD = 0.3;

/** Radii of the distance rings around the user, in meters */
const DISTANCE_RINGS = [100, 150, 200];

const DISTANCE_RING_COLOR = '#212529';

/** The wind cone fans out this many degrees in total, centered on the downwind direction */
const WIND_CONE_ANGLE = 30;
/** The wind cone grows linearly from its shortest length in calm wind to its longest length in strong wind */
const WIND_CONE_CALM = { speed: 1, length: 100 };
const WIND_CONE_STRONG = { speed: 8, length: 500 };

/** How far the wind carries the user's scent noticeably, in meters, for a wind speed in m/s */
function windConeLength(speed: number): number {
  const share = Math.min(1, Math.max(0, (speed - WIND_CONE_CALM.speed) / (WIND_CONE_STRONG.speed - WIND_CONE_CALM.speed)));
  return WIND_CONE_CALM.length + share * (WIND_CONE_STRONG.length - WIND_CONE_CALM.length);
}
/** Yellow fill with a darker amber, dashed outline, so it stands apart from the yellow of the shooting safety overlay */
const WIND_CONE_STYLE: L.PathOptions = {
  color: '#b8860b',
  weight: 2,
  dashArray: '6 4',
  fillColor: '#ffc107',
  fillOpacity: 0.35,
  interactive: false,
};


/** Matches the breakpoint in map.scss below which the panel is collapsed behind its toggle button */
const PHONE_MEDIA_QUERY = '(max-width: 767.98px)';

/** ~10 cm; avoids noise like 49.00000000001 from map projections */
const PRECISION = 1e6;

const EVENT_ICON = L.divIcon(EVENT_PIN_OPTIONS);

@Component({
  imports: [TranslatePipe, DecimalPipe, MapMenu],
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
  protected readonly manualPosition = this.store.selectSignal(selectManual);
  private readonly latest = this.store.selectSignal(selectLatest);

  protected readonly safetyEnabled = this.store.selectSignal(selectShootingSafetyEnabled);
  protected readonly safetyStatus = this.store.selectSignal(selectShootingSafetyStatus);
  protected readonly safetyOverlay = this.store.selectSignal(selectShootingSafetyOverlay);

  protected readonly distanceRings = this.store.selectSignal(selectDistanceRings);
  protected readonly tracking = this.store.selectSignal(selectTracking);
  protected readonly followMe = this.store.selectSignal(selectFollowMe);
  protected readonly windCone = this.store.selectSignal(selectWindCone);
  protected readonly panelOpen = this.store.selectSignal(selectPanelOpen);
  protected readonly weather = this.store.selectSignal(selectCurrentWeather);
  protected readonly weatherStatus = this.store.selectSignal(selectWeatherStatus);
  protected readonly windConeLength = computed(() => {
    const weather = this.weather();
    return weather ? Math.round(windConeLength(weather.windSpeed)) : null;
  });
  /** For the legend's explanation of how the cone length follows the wind speed */
  protected readonly windConeCalm = WIND_CONE_CALM;
  protected readonly windConeStrong = WIND_CONE_STRONG;

  private readonly language = this.store.selectSignal(selectLanguage);
  /** Changes once the translations of a newly selected language are loaded */
  private readonly translationsChanged = toSignal(this.translate.onLangChange);
  private readonly dateFormat = computed(
    () => new Intl.DateTimeFormat(this.language(), { dateStyle: 'medium', timeStyle: 'short' }),
  );

  constructor() {
    this.store.dispatch(LocationActions.locate());
    this.store.dispatch(LocationActions.startTracking());
    this.store.dispatch(EventsActions.loadLatest());
    this.store.dispatch(WeatherActions.load());
    // Keeps the wind cone current while the map is open
    this.store.dispatch(WeatherActions.startRefresh());

    const locationLayer = L.layerGroup();
    let wasFollowing = false;
    effect(() => {
      const container = this.container();
      const position = this.position();
      // Read up front, so turning following on centers the map right away
      const followMe = this.followMe();
      if (!container || !position) {
        return;
      }

      const center: L.LatLngTuple = [position.latitude, position.longitude];
      const existing = untracked(this.map);
      const map = existing ?? this.createMap(container.nativeElement);
      locationLayer.clearLayers();
      L.circle(center, { radius: position.accuracy, color: LOCATION_COLOR, weight: 1, fillOpacity: 0.1 }).addTo(locationLayer);
      L.circleMarker(center, { radius: 8, color: '#fff', weight: 2, fillColor: LOCATION_COLOR, fillOpacity: 1 }).addTo(
        locationLayer,
      );
      locationLayer.addTo(map);
      // Later updates keep the zoom, and only move the map while following the user
      if (!existing) {
        map.setView(center, LOCATED_ZOOM);
      } else if (followMe && (!wasFollowing || this.isFarFromCenter(map, center))) {
        // Turning following on centers right away; afterwards small moves don't shift the map
        map.panTo(center);
      }
      wasFollowing = followMe;
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

    // Below the markers, so they stay visible and clickable
    const safetyLayer = L.layerGroup();
    effect(() => {
      const map = this.map();
      const overlay = this.safetyOverlay();
      if (!map) {
        return;
      }

      safetyLayer.clearLayers();
      if (overlay) {
        L.imageOverlay(overlay.image, overlay.bounds, {
          interactive: false,
          attribution: ELEVATION_ATTRIBUTION,
        }).addTo(safetyLayer);
      }
      safetyLayer.addTo(map);
    });

    const ringsLayer = L.layerGroup();
    effect(() => {
      const map = this.map();
      const position = this.position();
      if (!map) {
        return;
      }

      ringsLayer.clearLayers();
      if (this.distanceRings() && position) {
        for (const radius of DISTANCE_RINGS) {
          L.circle([position.latitude, position.longitude], {
            radius,
            color: DISTANCE_RING_COLOR,
            weight: 2,
            fill: false,
            interactive: false,
          }).addTo(ringsLayer);
        }
      }
      ringsLayer.addTo(map);
    });

    const windLayer = L.layerGroup();
    effect(() => {
      const map = this.map();
      const position = this.position();
      const weather = this.weather();
      if (!map) {
        return;
      }

      windLayer.clearLayers();
      if (this.windCone() && position && weather) {
        // The wind direction says where it comes from; the scent travels the opposite way
        const downwind = weather.windDirection + 180;
        const length = windConeLength(weather.windSpeed);
        const points: L.LatLngTuple[] = [[position.latitude, position.longitude]];
        for (let angle = -WIND_CONE_ANGLE / 2; angle <= WIND_CONE_ANGLE / 2; angle++) {
          const point = offset(position, length, ((downwind + angle) * Math.PI) / 180);
          points.push([point.latitude, point.longitude]);
        }
        L.polygon(points, WIND_CONE_STYLE).addTo(windLayer);
      }
      windLayer.addTo(map);
    });

    inject(DestroyRef).onDestroy(() => {
      this.store.dispatch(LocationActions.stopTracking());
      this.store.dispatch(WeatherActions.stopRefresh());
      this.map()?.remove();
    });
  }

  private createMap(container: HTMLElement): L.Map {
    const map = L.map(container);
    L.tileLayer(OPEN_TOPO_MAP_URL, OPEN_TOPO_MAP_OPTIONS).addTo(map);
    // Leaflet also fires contextmenu on a long press on touch devices
    map.on('contextmenu', (event: L.LeafletMouseEvent) => this.openMenu(event));
    // Touch devices have no right click, so a plain tap opens the menu as well
    map.on('click', (event: L.LeafletMouseEvent) => {
      // On phones the open panel covers the map, so a tap on the map only closes it
      if (this.panelOpen() && typeof matchMedia !== 'undefined' && matchMedia(PHONE_MEDIA_QUERY).matches) {
        this.store.dispatch(MapOptionsActions.setPanelOpen({ open: false }));
        return;
      }
      if (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) {
        this.openMenu(event);
      }
    });
    // The menu belongs to a point, so it would be misplaced once the map moves
    map.on('movestart zoomstart', () => this.closeMenu());
    // Panning by hand means the user wants to look elsewhere; re-centering is only done with panTo
    map.on('dragstart', () => {
      if (this.followMe()) {
        this.setFollowMe(false);
      }
    });
    this.map.set(map);
    return map;
  }

  private isFarFromCenter(map: L.Map, center: L.LatLngTuple): boolean {
    const size = map.getSize();
    const offset = map.latLngToContainerPoint(center).subtract(size.divideBy(2));
    return Math.abs(offset.x) > size.x * FOLLOW_THRESHOLD || Math.abs(offset.y) > size.y * FOLLOW_THRESHOLD;
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
      case 'manual-position':
        // Device positions would move the user away from the chosen point again
        this.setTracking(false);
        this.setFollowMe(false);
        this.store.dispatch(LocationActions.setManualPosition({ position: { ...menu.location, accuracy: 0 } }));
        break;
      case 'share-item':
        if (menu.event) {
          this.store.dispatch(EventsActions.shareEvent({ event: menu.event }));
        }
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

  protected setSafetyEnabled(enabled: boolean): void {
    this.store.dispatch(ShootingSafetyActions.setEnabled({ enabled }));
  }

  protected setTracking(enabled: boolean): void {
    this.store.dispatch(MapOptionsActions.setTracking({ enabled }));
    // Replaces a position set by hand right away instead of at the next regular refresh
    if (enabled) {
      this.store.dispatch(LocationActions.locate());
    }
  }

  protected setFollowMe(enabled: boolean): void {
    this.store.dispatch(MapOptionsActions.setFollowMe({ enabled }));
  }

  protected setWindCone(enabled: boolean): void {
    this.store.dispatch(MapOptionsActions.setWindCone({ enabled }));
  }

  protected togglePanel(): void {
    this.store.dispatch(MapOptionsActions.setPanelOpen({ open: !this.panelOpen() }));
  }

  protected setDistanceRings(enabled: boolean): void {
    this.store.dispatch(MapOptionsActions.setDistanceRings({ enabled }));
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
