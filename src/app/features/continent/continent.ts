import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { CountriesService } from '../../core/services/countries.service';
import { CONTINENTS, continentMeta } from '../../core/data/continents';
import { Country, ContinentId } from '../../core/models/geo.models';
import { compact, area as fmtArea } from '../../core/util/format';

type SortKey = 'name' | 'population' | 'area';

@Component({
  selector: 'app-continent',
  imports: [RouterLink],
  templateUrl: './continent.html',
  styleUrl: './continent.scss'
})
export class Continent {
  private readonly countriesSvc = inject(CountriesService);

  /** Bound from the :id route param. */
  readonly id = input.required<string>();

  readonly filter = signal('');
  readonly sort = signal<SortKey>('population');

  readonly meta = computed(() => continentMeta(this.id() as ContinentId));

  private readonly all = toSignal(this.countriesSvc.getAll(), {
    initialValue: [] as Country[]
  });
  readonly loading = this.countriesSvc.loading;

  readonly countries = computed<Country[]>(() => {
    const id = this.id() as ContinentId;
    const q = this.filter().trim().toLowerCase();
    const sort = this.sort();
    let list = this.all().filter((c) => c.continent === id);
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.capital.some((cap) => cap.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'area') return b.area - a.area;
      return b.population - a.population;
    });
  });

  readonly totals = computed(() => {
    const list = this.countries();
    return {
      count: list.length,
      population: list.reduce((s, c) => s + c.population, 0),
      area: list.reduce((s, c) => s + c.area, 0)
    };
  });

  gradient(): string {
    const m = this.meta();
    return m ? `linear-gradient(135deg, ${m.gradient[0]}, ${m.gradient[1]})` : '';
  }

  setSort(value: string): void {
    this.sort.set(value as SortKey);
  }

  compact = compact;
  fmtArea = fmtArea;
  allContinents = CONTINENTS;
}
