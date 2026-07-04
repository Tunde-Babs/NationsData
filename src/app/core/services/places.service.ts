import { Injectable } from '@angular/core';
import { State, City } from 'country-state-city';

import { StateInfo, CityInfo } from '../models/geo.models';

function num(v: string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Offline states & cities, sourced from the bundled `country-state-city`
 * dataset. All lookups key off the ISO-3166 alpha-2 country code.
 */
@Injectable({ providedIn: 'root' })
export class PlacesService {
  statesOf(cca2: string): StateInfo[] {
    return State.getStatesOfCountry(cca2)
      .map((s) => ({
        name: s.name,
        isoCode: s.isoCode,
        countryCode: s.countryCode,
        latitude: num(s.latitude),
        longitude: num(s.longitude)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  citiesOfState(cca2: string, stateCode: string): CityInfo[] {
    return City.getCitiesOfState(cca2, stateCode)
      .map((c) => this.toCity(c))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  citiesOfCountry(cca2: string): CityInfo[] {
    return (City.getCitiesOfCountry(cca2) ?? [])
      .map((c) => this.toCity(c))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Case-insensitive city search across the whole dataset (capped). */
  searchCities(query: string, limit = 15): CityInfo[] {
    const q = query.trim().toLowerCase();
    if (q.length < 3) return [];
    const out: CityInfo[] = [];
    for (const c of City.getAllCities()) {
      if (c.name.toLowerCase().startsWith(q)) {
        out.push(this.toCity(c));
        if (out.length >= limit) break;
      }
    }
    return out;
  }

  private toCity(c: {
    name: string;
    countryCode: string;
    stateCode: string;
    latitude?: string | null;
    longitude?: string | null;
  }): CityInfo {
    return {
      name: c.name,
      countryCode: c.countryCode,
      stateCode: c.stateCode,
      latitude: num(c.latitude),
      longitude: num(c.longitude)
    };
  }
}
