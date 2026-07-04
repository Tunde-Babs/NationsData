import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
    title: 'NationsData — Explore the planet, country by country'
  },
  {
    path: 'continent/:id',
    loadComponent: () =>
      import('./features/continent/continent').then((m) => m.Continent),
    title: 'Continent — NationsData'
  },
  {
    path: 'country/:cca3',
    loadComponent: () => import('./features/country/country').then((m) => m.Country),
    title: 'Country — NationsData'
  },
  {
    // Streets/roads view for a place. Uses query params: name, country, cca3.
    path: 'place/:lat/:lng',
    loadComponent: () => import('./features/place/place').then((m) => m.Place),
    title: 'Streets & roads — NationsData'
  },
  {
    path: 'search',
    loadComponent: () => import('./features/search/search').then((m) => m.Search),
    title: 'Search — NationsData'
  },
  { path: '**', redirectTo: '' }
];
