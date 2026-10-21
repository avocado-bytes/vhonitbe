import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./overview/overview').then((m) => m.Overview) },
  { path: 'map', loadComponent: () => import('./map/map').then((m) => m.MapView) },
  { path: 'feeding', loadComponent: () => import('./feeding/feeding').then((m) => m.Feeding) },
  { path: 'firearms', loadComponent: () => import('./firearms/firearms').then((m) => m.Firearms) },
  { path: 'handloading', loadComponent: () => import('./handloading/handloading').then((m) => m.Handloading) },
  { path: 'guide', loadComponent: () => import('./guide/guide').then((m) => m.Guide) },
  { path: '**', redirectTo: '' },
];
