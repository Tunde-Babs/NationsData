import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Per-route rendering strategy:
 * - Home is prerendered (static, best for SEO + instant load).
 * - Country / continent / search-shell pages are server-rendered on demand so
 *   crawlers get fully-populated HTML.
 * - The streets map (Leaflet needs `window`) and the full search page (loads the
 *   ~9 MB city dataset) render on the client only.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'place/:lat/:lng', renderMode: RenderMode.Client },
  { path: 'search', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server }
];
