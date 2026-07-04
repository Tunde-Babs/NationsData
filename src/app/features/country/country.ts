import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { CountriesService } from '../../core/services/countries.service';
import { PlacesService } from '../../core/services/places.service';
import { continentMeta } from '../../core/data/continents';
import {
  Country as CountryModel,
  StateInfo,
  CityInfo
} from '../../core/models/geo.models';
import { compact, full, usd, area as fmtArea, density } from '../../core/util/format';

@Component({
  selector: 'app-country',
  imports: [RouterLink],
  templateUrl: './country.html',
  styleUrl: './country.scss'
})
export class Country {
  private readonly countriesSvc = inject(CountriesService);
  private readonly places = inject(PlacesService);

  /** Bound from the :cca3 route param. */
  readonly cca3 = input.required<string>();

  private readonly cca3$ = toObservable(this.cca3);

  readonly country = toSignal(
    this.cca3$.pipe(switchMap((c) => this.countriesSvc.getByCca3(c))),
    { initialValue: undefined }
  );

  private readonly all = toSignal(this.countriesSvc.getAll(), { initialValue: [] });

  readonly meta = computed(() => {
    const c = this.country();
    return c ? continentMeta(c.continent) : undefined;
  });

  readonly borderCountries = computed<CountryModel[]>(() => {
    const c = this.country();
    if (!c) return [];
    const byCode = new Map(this.all().map((x) => [x.cca3, x]));
    return c.borders.map((b) => byCode.get(b)).filter((x): x is CountryModel => !!x);
  });

  /** States/regions from the offline dataset. */
  readonly states = computed<StateInfo[]>(() => {
    const c = this.country();
    return c ? this.places.statesOf(c.cca2) : [];
  });

  private readonly countryCities = computed<CityInfo[]>(() => {
    const c = this.country();
    return c ? this.places.citiesOfCountry(c.cca2) : [];
  });

  readonly selectedState = signal<string | null>(null);
  readonly cityFilter = signal('');

  readonly cities = computed<CityInfo[]>(() => {
    const c = this.country();
    if (!c) return [];
    const state = this.selectedState();
    const base = state
      ? this.places.citiesOfState(c.cca2, state)
      : this.countryCities();
    const q = this.cityFilter().trim().toLowerCase();
    const filtered = q ? base.filter((x) => x.name.toLowerCase().includes(q)) : base;
    return filtered.slice(0, 400);
  });

  readonly countryCitiesLength = computed(() => this.countryCities().length);

  readonly cityCount = computed(() => {
    const c = this.country();
    if (!c) return 0;
    const state = this.selectedState();
    return state
      ? this.places.citiesOfState(c.cca2, state).length
      : this.countryCities().length;
  });

  /** Coordinates for the capital, if we can find it in the city dataset. */
  readonly capitalCity = computed<CityInfo | undefined>(() => {
    const c = this.country();
    if (!c || !c.capital.length) return undefined;
    const cap = c.capital[0].toLowerCase();
    return this.countryCities().find((x) => x.name.toLowerCase() === cap);
  });

  selectState(code: string | null): void {
    this.selectedState.set(code);
    this.cityFilter.set('');
  }

  gradient(): string {
    const m = this.meta();
    return m ? `linear-gradient(135deg, ${m.gradient[0]}, ${m.gradient[1]})` : '';
  }

  compact = compact;
  full = full;
  usd = usd;
  fmtArea = fmtArea;
  density = density;
}
