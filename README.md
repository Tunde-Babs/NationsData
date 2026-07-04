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

## Build

```bash
npm run build    # production build in dist/nations-data
```

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

- **SSR/SEO**: this is a client-rendered SPA. For a public content site,
  enabling `@angular/ssr` would improve SEO and first paint.
- **Overpass rate limits**: street data is fetched live and cached. A thin
  backend proxy with a shared cache (or self-hosted Overpass) would scale better
  for heavy traffic.
