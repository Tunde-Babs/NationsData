import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, switchMap } from 'rxjs';

import { SearchService } from '../../core/services/search.service';
import { SearchBar } from '../../shared/search-bar/search-bar';
import { SearchResult } from '../../core/models/geo.models';

@Component({
  selector: 'app-search',
  imports: [SearchBar, RouterLink],
  templateUrl: './search.html',
  styleUrl: './search.scss'
})
export class Search {
  private readonly search = inject(SearchService);

  /** Bound from the ?q= query param. */
  readonly q = input<string>('');

  private readonly results = toSignal(
    toObservable(this.q).pipe(
      debounceTime(120),
      switchMap((query) => this.search.full(query ?? ''))
    ),
    { initialValue: [] as SearchResult[] }
  );

  readonly countries = computed(() =>
    this.results().filter((r) => r.kind === 'country')
  );
  readonly capitals = computed(() =>
    this.results().filter((r) => r.kind === 'capital')
  );
  readonly cities = computed(() => this.results().filter((r) => r.kind === 'city'));

  readonly total = computed(() => this.results().length);
}
