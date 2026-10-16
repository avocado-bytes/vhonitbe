import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import type * as Leaflet from 'leaflet';
import { GeoPoint } from '../model/event';
import { LocationPicker } from './location-picker';

@Component({
  imports: [LocationPicker],
  template: `<app-location-picker [(location)]="location" />`,
})
class Host {
  readonly location = signal<GeoPoint>({ latitude: 49.0, longitude: 13.5 });
}

describe('LocationPicker', () => {
  let fixture: ComponentFixture<Host>;
  const element = () => fixture.nativeElement as HTMLElement;
  const map = () => (fixture.debugElement.children[0].componentInstance as LocationPicker)['map'] as Leaflet.Map;
  const input = (id: string) => element().querySelector(`#${id}`) as HTMLInputElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideTranslateService()] });
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    // Leaflet is imported on demand
    await vi.waitFor(() => expect(map()).toBeDefined());
  });

  it('should show an OpenTopoMap map centered on the location', () => {
    expect(element().querySelector('.picker-map.leaflet-container')).not.toBeNull();
    expect(element().querySelector('.leaflet-control-attribution')?.textContent).toContain('OpenTopoMap');
    expect(map().getCenter()).toEqual(expect.objectContaining({ lat: 49.0, lng: 13.5 }));
  });

  it('should show a crosshair over the center of the map', () => {
    expect(element().querySelector('.picker svg.crosshair')).not.toBeNull();
  });

  it('should show the coordinates in read-only fields', () => {
    expect(input('location-picker-latitude').readOnly).toBe(true);
    expect(input('location-picker-longitude').readOnly).toBe(true);
    expect(input('location-picker-latitude').value).toBe('49.000000');
    expect(input('location-picker-longitude').value).toBe('13.500000');
  });

  it('should update the location when the map is moved', async () => {
    map().setView([49.123456789, 13.987654321], 15, { animate: false });
    await fixture.whenStable();

    expect(fixture.componentInstance.location()).toEqual({ latitude: 49.123457, longitude: 13.987654 });
    expect(input('location-picker-latitude').value).toBe('49.123457');
    expect(input('location-picker-longitude').value).toBe('13.987654');
  });
});
