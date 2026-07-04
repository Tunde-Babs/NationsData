import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  from,
  of,
  forkJoin,
  shareReplay,
  map,
  switchMap,
  catchError
} from 'rxjs';

import { Country, ContinentId, EconomyInfo } from '../models/geo.models';
import { continentFromRegion } from '../data/continents';
import { CacheService } from './cache.service';

const CACHE_KEY = 'countries:v2';
const TTL = 1000 * 60 * 60 * 24 * 7; // 7 days
const WB = 'https://api.worldbank.org/v2/country/all/indicator';

/** Raw record shape from the offline `world-countries` dataset. */
interface RawWC {
  name: { common: string; official: string };
  cca2: string;
  cca3: string;
  capital?: string[];
  region?: string;
  subregion?: string;
  currencies?: Record<string, { name?: string; symbol?: string }>;
  languages?: Record<string, string>;
  latlng?: number[];
  borders?: string[];
  area?: number;
  tld?: string[];
}

/** One World Bank indicator row. */
interface WbRow {
  countryiso3code: string;
  value: number | null;
  date: string;
}
type WbBulk = [unknown, WbRow[] | null];

@Injectable({ providedIn: 'root' })
export class CountriesService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(CacheService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private all$?: Observable<Country[]>;

  getAll(): Observable<Country[]> {
    if (this.all$) return this.all$;

    const cached = this.cache.get<Country[]>(CACHE_KEY);
    if (cached && cached.length) {
      this.all$ = of(cached);
      return this.all$;
    }

    this.loading.set(true);
    this.error.set(null);

    // Base data (offline) + World Bank economics (network, best-effort).
    const base$ = from(import('world-countries')).pipe(
      map((mod) => ((mod as { default?: RawWC[] }).default ?? mod) as unknown as RawWC[])
    );

    this.all$ = base$.pipe(
      switchMap((raw) =>
        forkJoin({
          pop: this.indicator('SP.POP.TOTL'),
          gdpPc: this.indicator('NY.GDP.PCAP.CD'),
          gdpTot: this.indicator('NY.GDP.MKTP.CD')
        }).pipe(
          map(({ pop, gdpPc, gdpTot }) =>
            raw
              .map((r) => this.normalise(r, pop, gdpPc, gdpTot))
              .filter((c) => !!c.cca3)
              .sort((a, b) => a.name.localeCompare(b.name))
          )
        )
      ),
      map((list) => {
        this.cache.set(CACHE_KEY, list, TTL);
        this.loading.set(false);
        if (!list.some((c) => c.population > 0)) {
          this.error.set(
            'Economic data (population/GDP) is temporarily unavailable — showing base country data.'
          );
        }
        return list;
      }),
      catchError((err) => {
        this.loading.set(false);
        this.error.set('Could not load country data. Please retry.');
        console.error('Country load failed', err);
        return of([] as Country[]);
      }),
      shareReplay(1)
    );
    return this.all$;
  }

  getByContinent(id: ContinentId): Observable<Country[]> {
    return this.getAll().pipe(map((l) => l.filter((c) => c.continent === id)));
  }

  getByCca3(cca3: string): Observable<Country | undefined> {
    const target = cca3.toUpperCase();
    return this.getAll().pipe(map((l) => l.find((c) => c.cca3 === target)));
  }

  /** Fetch one World Bank indicator for every country → Map keyed by cca3. */
  private indicator(code: string): Observable<Map<string, WbRow>> {
    const url = `${WB}/${code}?format=json&mrnev=1&per_page=400`;
    return this.http.get<WbBulk>(url).pipe(
      map((res) => {
        const rows = Array.isArray(res) ? res[1] ?? [] : [];
        const byIso = new Map<string, WbRow>();
        for (const row of rows) {
          if (row.countryiso3code && row.value !== null) byIso.set(row.countryiso3code, row);
        }
        return byIso;
      }),
      catchError(() => of(new Map<string, WbRow>()))
    );
  }

  private normalise(
    r: RawWC,
    pop: Map<string, WbRow>,
    gdpPc: Map<string, WbRow>,
    gdpTot: Map<string, WbRow>
  ): Country {
    const continent: ContinentId = continentFromRegion(r.region, r.subregion);
    const currencies = Object.entries(r.currencies ?? {}).map(([code, info]) => ({
      code,
      name: info?.name ?? code,
      symbol: info?.symbol ?? ''
    }));
    const latlng =
      r.latlng && r.latlng.length >= 2
        ? ([r.latlng[0], r.latlng[1]] as [number, number])
        : ([0, 0] as [number, number]);

    const popRow = pop.get(r.cca3);
    const pcRow = gdpPc.get(r.cca3);
    const totRow = gdpTot.get(r.cca3);
    const economy: EconomyInfo = {
      gdpPerCapitaUsd: pcRow?.value ?? null,
      gdpTotalUsd: totRow?.value ?? null,
      year: pcRow?.date ?? totRow?.date ?? null
    };

    const cca2lower = (r.cca2 ?? '').toLowerCase();

    return {
      cca2: r.cca2 ?? '',
      cca3: r.cca3 ?? '',
      name: r.name?.common ?? 'Unknown',
      officialName: r.name?.official ?? r.name?.common ?? 'Unknown',
      continent,
      region: r.region ?? '',
      subregion: r.subregion ?? '',
      capital: r.capital ?? [],
      population: popRow?.value ?? 0,
      area: r.area ?? 0,
      currencies,
      languages: Object.values(r.languages ?? {}),
      tld: r.tld ?? [],
      borders: r.borders ?? [],
      latlng,
      flagPng: cca2lower ? `https://flagcdn.com/w320/${cca2lower}.png` : '',
      flagAlt: `Flag of ${r.name?.common ?? ''}`,
      mapsUrl: `https://www.openstreetmap.org/#map=5/${latlng[0]}/${latlng[1]}`,
      economy
    };
  }
}
