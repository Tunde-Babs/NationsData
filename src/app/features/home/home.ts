import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { CountriesService } from '../../core/services/countries.service';
import { CONTINENTS } from '../../core/data/continents';
import { SearchBar } from '../../shared/search-bar/search-bar';
import { ChatWidget } from '../../shared/chat-widget/chat-widget';
import { Country, ContinentMeta } from '../../core/models/geo.models';
import { compact, full } from '../../core/util/format';

interface ContinentCard extends ContinentMeta {
  count: number;
  population: number;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, SearchBar, ChatWidget],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {
  private readonly countriesSvc = inject(CountriesService);
  readonly loading = this.countriesSvc.loading;
  readonly error = this.countriesSvc.error;

  private readonly countries = toSignal(this.countriesSvc.getAll(), {
    initialValue: [] as Country[]
  });

  readonly cards = computed<ContinentCard[]>(() => {
    const list = this.countries();
    return CONTINENTS.map((meta) => {
      const inContinent = list.filter((c) => c.continent === meta.id);
      return {
        ...meta,
        count: inContinent.length,
        population: inContinent.reduce((sum, c) => sum + c.population, 0)
      };
    });
  });

  readonly totals = computed(() => {
    const list = this.countries();
    return {
      countries: list.length,
      population: list.reduce((s, c) => s + c.population, 0),
      area: list.reduce((s, c) => s + c.area, 0)
    };
  });

  /** A few headline countries to invite exploration. */
  readonly featured = computed<Country[]>(() =>
    [...this.countries()].sort((a, b) => b.population - a.population).slice(0, 8)
  );

  gradient(card: ContinentCard): string {
    return `linear-gradient(135deg, ${card.gradient[0]}, ${card.gradient[1]})`;
  }

  compact = compact;
  full = full;
}
