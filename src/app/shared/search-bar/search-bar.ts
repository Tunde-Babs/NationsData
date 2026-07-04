import {
  Component,
  ElementRef,
  inject,
  input,
  signal,
  ViewChild
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs';

import { CountriesService } from '../../core/services/countries.service';
import { Country, SearchResult } from '../../core/models/geo.models';

/**
 * Lightweight quick-search used in the header and hero. It only matches
 * countries + capitals (via CountriesService) so it stays out of the heavy
 * city dataset — full city search lives on the lazy /search page.
 */
@Component({
  selector: 'app-search-bar',
  imports: [RouterLink],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss'
})
export class SearchBar {
  private readonly countries = inject(CountriesService);
  private readonly router = inject(Router);

  readonly variant = input<'hero' | 'compact'>('hero');
  readonly placeholder = input('Search countries, capitals, cities…');

  @ViewChild('box') box?: ElementRef<HTMLElement>;

  readonly query = signal('');
  readonly open = signal(false);
  readonly activeIndex = signal(-1);

  readonly suggestions = toSignal(
    toObservable(this.query).pipe(
      debounceTime(180),
      distinctUntilChanged(),
      switchMap((q) => this.quick(q))
    ),
    { initialValue: [] as SearchResult[] }
  );

  private quick(query: string) {
    const q = query.trim().toLowerCase();
    return this.countries.getAll().pipe(
      map((list) => {
        if (q.length < 2) return [];
        const out: SearchResult[] = [];
        for (const c of list) {
          if (c.name.toLowerCase().includes(q)) {
            out.push(this.countryResult(c));
          } else if (c.capital.some((cap) => cap.toLowerCase().includes(q))) {
            out.push(this.capitalResult(c));
          }
          if (out.length >= 7) break;
        }
        return out;
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

  onInput(value: string): void {
    this.query.set(value);
    this.open.set(true);
    this.activeIndex.set(-1);
  }

  onFocus(): void {
    if (this.query().length >= 2) this.open.set(true);
  }

  onKeydown(ev: KeyboardEvent): void {
    const list = this.suggestions();
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.activeIndex.set(Math.min(this.activeIndex() + 1, list.length - 1));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.activeIndex.set(Math.max(this.activeIndex() - 1, -1));
    } else if (ev.key === 'Enter') {
      const i = this.activeIndex();
      if (i >= 0 && list[i]) this.go(list[i]);
      else this.submit();
    } else if (ev.key === 'Escape') {
      this.open.set(false);
    }
  }

  submit(): void {
    const q = this.query().trim();
    if (!q) return;
    this.open.set(false);
    this.router.navigate(['/search'], { queryParams: { q } });
  }

  go(result: SearchResult): void {
    this.open.set(false);
    this.router.navigate(result.link, { queryParams: result.queryParams });
  }

  onBlur(): void {
    setTimeout(() => this.open.set(false), 160);
  }
}
