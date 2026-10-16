import { Component, DestroyRef, effect, ElementRef, inject, viewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import * as L from 'leaflet';
import { LocationActions } from '../state/location/location.actions';
import { selectError, selectPosition, selectStatus } from '../state/location/location.reducer';

const OPEN_TOPO_MAP_URL = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
const OPEN_TOPO_MAP_ATTRIBUTION =
  'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
  '<a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> ' +
  '(<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)';

const LOCATED_ZOOM = 14;

const LOCATION_COLOR = '#355e3b';

@Component({
  imports: [TranslatePipe],
  selector: 'app-map',
  styleUrl: './map.scss',
  templateUrl: './map.html',
})
export class MapView {
  private readonly store = inject(Store);
  /** Only rendered once the location is known */
  private readonly container = viewChild<ElementRef<HTMLElement>>('map');
  private map?: L.Map;

  protected readonly status = this.store.selectSignal(selectStatus);
  protected readonly error = this.store.selectSignal(selectError);
  protected readonly position = this.store.selectSignal(selectPosition);

  constructor() {
    this.store.dispatch(LocationActions.locate());

    const locationLayer = L.layerGroup();
    effect(() => {
      const container = this.container();
      const position = this.position();
      if (!container || !position) {
        return;
      }

      const center: L.LatLngTuple = [position.latitude, position.longitude];
      const map = (this.map ??= this.createMap(container.nativeElement));
      locationLayer.clearLayers();
      L.circle(center, { radius: position.accuracy, color: LOCATION_COLOR, weight: 1, fillOpacity: 0.1 }).addTo(locationLayer);
      L.circleMarker(center, { radius: 8, color: '#fff', weight: 2, fillColor: LOCATION_COLOR, fillOpacity: 1 }).addTo(
        locationLayer,
      );
      locationLayer.addTo(map);
      map.setView(center, LOCATED_ZOOM);
    });

    inject(DestroyRef).onDestroy(() => this.map?.remove());
  }

  private createMap(container: HTMLElement): L.Map {
    const map = L.map(container);
    L.tileLayer(OPEN_TOPO_MAP_URL, { maxZoom: 17, attribution: OPEN_TOPO_MAP_ATTRIBUTION }).addTo(map);
    return map;
  }
}
