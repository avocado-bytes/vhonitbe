import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./overview/overview').then((m) => m.Overview) },
  { path: 'map', loadComponent: () => import('./map/map').then((m) => m.MapView) },
  { path: '**', redirectTo: '' },
];
