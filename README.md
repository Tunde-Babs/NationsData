# 🌍 NationsData

An open, interactive atlas of the world. Browse continents and countries, dive
into capitals, populations, currencies, GDP and land area, drill down to states
and cities, and map their **interconnected streets and roads** live from
OpenStreetMap.

Built with **Angular 20** (standalone components + signals), TypeScript, SCSS
and **Leaflet**.

## Features

- **Landing page** — 7 continent widgets with live country counts + populations,
  a global search bar, and headline stats.
- **Continent pages** — every country in a continent, filterable and sortable by
  population / land area / name.
- **Country pages** — flag, capital, population, land area, density, GDP per
  capita, total GDP, currencies, languages, internet TLD, neighbouring
  countries, and a browsable list of states/regions & cities.
- **Streets & roads pages** — for any city, the live road network from
  OpenStreetMap rendered on a map, colour-coded by road class, with an
  **interconnection graph**: click a street to trace every street it connects to
  via shared junctions. Adjustable area radius, junction overlay, and a
  searchable street list.
- **Global search** — countries, capitals and cities in one place.
- Light/dark theme, responsive layout, persistent client-side caching.

## Data sources

| Data | Source | How |
| --- | --- | --- |
| Country profiles | [`world-countries`](https://www.npmjs.com/package/world-countries) | Offline dataset, loaded via dynamic `import()` |
| Population & GDP | [World Bank API](https://data.worldbank.org/) | One bulk call per indicator, cached 7 days |
| Flags | [flagcdn.com](https://flagcdn.com) | Built from ISO country codes |
| States & cities | [`country-state-city`](https://www.npmjs.com/package/country-state-city) | Offline dataset (lazy-loaded) |
| Streets & roads | [OpenStreetMap Overpass API](https://overpass-api.de) | On-demand per area, cached |
| Map tiles | [CARTO](https://carto.com/) basemaps | Light/dark aware |

No API keys required. All network data is cached in `localStorage` to stay
friendly to the free public APIs.

## Requirements

- **Node 22.18.0** (pinned in `.nvmrc`) — `nvm use`
- npm

## Getting started

```bash
nvm use          # Node 22.18.0
npm install
npm start        # dev server at http://localhost:4200
```

## Build & run (SSR)

```bash
npm run build              # builds browser + server bundles, prerenders home
npm run serve:ssr:nations-data   # runs the SSR Node server (default :4000)
```

## Server-side rendering (SEO)

The app uses **`@angular/ssr`** with client hydration. Render strategy per route:

| Route | Mode | Why |
| --- | --- | --- |
| `/` (home) | **Prerender** | Static HTML with data baked in at build time |
| `/country/:cca3`, `/continent/:id` | **Server** | Rendered on demand so crawlers get full HTML |
| `/place/:lat/:lng` (streets map) | **Client** | Leaflet needs `window`; not SEO-critical |
| `/search` | **Client** | Loads the ~9 MB city dataset; not SEO-critical |

Configured in [`src/app/app.routes.server.ts`](src/app/app.routes.server.ts).
Browser-only code (Leaflet, `localStorage`, `document`) is guarded so server
rendering never touches it.

> **Deployment note:** Angular 20 validates the incoming `Host` header (SSRF
> protection). `angular.json → security.allowedHosts` currently allows
> `localhost`; **add your production domain there** or on-demand SSR pages fall
> back to client rendering. SSR requires a Node runtime (Vercel, Netlify,
> Firebase App Hosting, Render, etc. all support Angular SSR).

## Architecture

```
src/app/
  app.ts / app.html / app.scss     App shell: header, search, theme, footer
  app.routes.ts                    Lazy-loaded feature routes
  core/
    models/geo.models.ts           Typed domain models
    data/continents.ts             Continent metadata + region→continent mapping
    services/
      countries.service.ts         world-countries + World Bank enrichment
      places.service.ts            States & cities (country-state-city)
      overpass.service.ts          Road fetch + interconnection graph builder
      search.service.ts            Combined country/capital/city search
      cache.service.ts             localStorage TTL cache
    util/format.ts                 Number/currency/area formatting
  shared/search-bar/               Reusable quick-search component
  features/
    home/  continent/  country/  place/  search/
```

The heavy datasets (`world-countries`, `country-state-city`) are code-split into
lazy chunks so the initial bundle stays small; they load on demand.

## Notes / next steps

- **SSR/SEO**: ✅ implemented — see the SSR section above. Remember to add your
  production domain to `security.allowedHosts` before deploying.
- **Overpass rate limits**: street data is fetched live and cached. A thin
  backend proxy with a shared cache (or self-hosted Overpass) would scale better
  for heavy traffic.
- **Name coverage**: the streets page shows a "named-road coverage" indicator
  because OpenStreetMap name completeness varies by region (rich in big cities,
  sparse in some small towns) and links out to help map an area.
