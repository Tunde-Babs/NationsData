import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { CountriesService } from './countries.service';
import { PlacesService } from './places.service';
import { SearchResult, Country } from '../models/geo.models';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly countries = inject(CountriesService);
  private readonly places = inject(PlacesService);

  /** Search countries + capitals (fast, no city dataset). */
  quick(query: string, limit = 8): Observable<SearchResult[]> {
    const q = query.trim().toLowerCase();
    return this.countries.getAll().pipe(
      map((list) => {
        if (q.length < 2) return [];
        const results: SearchResult[] = [];
        for (const c of list) {
          if (c.name.toLowerCase().includes(q)) {
            results.push(this.countryResult(c));
          } else if (c.capital.some((cap) => cap.toLowerCase().includes(q))) {
            results.push(this.capitalResult(c));
          }
          if (results.length >= limit) break;
        }
        return results;
      })
    );
  }

  /** Full search: countries + capitals + cities. */
  full(query: string): Observable<SearchResult[]> {
    const q = query.trim().toLowerCase();
    return this.countries.getAll().pipe(
      map((list) => {
        if (q.length < 2) return [];
        const countryResults: SearchResult[] = [];
        for (const c of list) {
          if (c.name.toLowerCase().includes(q)) {
            countryResults.push(this.countryResult(c));
          } else if (c.capital.some((cap) => cap.toLowerCase().includes(q))) {
            countryResults.push(this.capitalResult(c));
          }
        }

        const iso2ToCountry = new Map(list.map((c) => [c.cca2, c]));
        const cityResults: SearchResult[] = this.places
          .searchCities(q, 25)
          .map((city) => {
            const country = iso2ToCountry.get(city.countryCode);
            return {
              kind: 'city' as const,
              label: city.name,
              sublabel: country ? country.name : city.countryCode,
              link: [
                '/place',
                city.latitude ?? 0,
                city.longitude ?? 0
              ],
              queryParams: {
                name: city.name,
                country: country?.name ?? '',
                cca3: country?.cca3 ?? ''
              },
              flagPng: country?.flagPng,
              lat: city.latitude ?? undefined,
              lng: city.longitude ?? undefined
            } satisfies SearchResult;
          })
          .filter((r) => r.lat !== undefined && r.lng !== undefined);

        return [...countryResults.slice(0, 30), ...cityResults];
      })
    );
  }

  private countryResult(c: Country): SearchResult {
    return {
      kind: 'country',
      label: c.name,
      sublabel: `${c.subregion || c.region} · ${c.capital[0] ?? '—'}`,
      link: ['/country', c.cca3],
      flagPng: c.flagPng
    };
  }

  private capitalResult(c: Country): SearchResult {
    return {
      kind: 'capital',
      label: c.capital[0] ?? c.name,
      sublabel: `Capital of ${c.name}`,
      link: ['/country', c.cca3],
      flagPng: c.flagPng
    };
  }
}
