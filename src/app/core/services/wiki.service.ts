import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, map, switchMap, catchError } from 'rxjs';

import { CacheService } from './cache.service';

const WDQS = 'https://query.wikidata.org/sparql';
const WIKI_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const TTL = 1000 * 60 * 60 * 24; // 1 day

/** A single term of office / reign, derived from Wikidata qualifiers. */
export interface Reign {
  name: string;
  start: number | null;
  end: number | null;
}

export interface Inception {
  date: string; // YYYY-MM-DD
  year: number;
}

interface SparqlValue {
  value?: string;
}
type SparqlRow = Record<string, SparqlValue>;

/**
 * Free, key-less access to Wikidata (structured facts: founding dates, heads of
 * state/government with reign years) and Wikipedia (natural-language summaries).
 * Both endpoints send `Access-Control-Allow-Origin: *`, so the browser can call
 * them directly. Results are cached to stay friendly to the public endpoints.
 */
@Injectable({ providedIn: 'root' })
export class WikiService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(CacheService);

  /** First ~sentences of a country's Wikipedia article. */
  summary(title: string): Observable<string | null> {
    const key = `wiki:sum:${title}`;
    const cached = this.cache.get<string>(key);
    if (cached) return of(cached);
    return this.http
      .get<{ extract?: string }>(WIKI_SUMMARY + encodeURIComponent(title))
      .pipe(
        map((r) => {
          const t = r?.extract ?? null;
          if (t) this.cache.set(key, t, TTL);
          return t;
        }),
        catchError(() => of(null))
      );
  }

  /** Country inception / founding date (Wikidata P571), keyed by ISO-3166 alpha-2. */
  inceptionYear(iso2: string): Observable<Inception | null> {
    const key = `wd:inc:${iso2}`;
    const cached = this.cache.get<Inception>(key);
    if (cached) return of(cached);
    const q = `SELECT ?inception WHERE { ?c wdt:P297 "${iso2}". OPTIONAL { ?c wdt:P571 ?inception. } } LIMIT 1`;
    return this.sparql(q).pipe(
      map((rows) => {
        const v = rows[0]?.['inception']?.value;
        if (!v) return null;
        const out: Inception = { date: v.slice(0, 10), year: Number(v.slice(0, 4)) };
        this.cache.set(key, out, TTL);
        return out;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Everyone who has held the country's head-of-state (kind `P35`) or
   * head-of-government (kind `P6`) office, with term start/end years. We follow
   * the *office* (P1906 / P1313) to its officeholders (P39) rather than the
   * country's P35/P6, because republics don't attach past presidents to the
   * country node. Fictional holders are excluded (must be a human, P31=Q5), and
   * any labels the SPARQL service fails to resolve are looked up via the entity API.
   */
  leaders(iso2: string, kind: 'P35' | 'P6'): Observable<Reign[]> {
    const officeProp = kind === 'P6' ? 'P1313' : 'P1906';
    const key = `wd:office:${kind}:${iso2}`;
    const cached = this.cache.get<Reign[]>(key);
    if (cached) return of(cached);

    const officeQ =
      `SELECT DISTINCT ?person ?personLabel ?start ?end WHERE { ` +
      `?c wdt:P297 "${iso2}". ?c wdt:${officeProp} ?office. ` +
      `?person p:P39 ?st. ?st ps:P39 ?office. ?st pq:P580 ?start. ` +
      `OPTIONAL { ?st pq:P582 ?end. } ?person wdt:P31 wd:Q5. ` +
      `SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } LIMIT 200`;
    // Fallback for countries without the office statement.
    const directQ =
      `SELECT DISTINCT ?person ?personLabel ?start ?end WHERE { ` +
      `?c wdt:P297 "${iso2}". ?c p:${kind} ?s. ?s ps:${kind} ?person. ` +
      `OPTIONAL { ?s pq:P580 ?start. } OPTIONAL { ?s pq:P582 ?end. } ` +
      `SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } LIMIT 200`;

    return this.sparql(officeQ).pipe(
      switchMap((rows) => (rows.length ? of(rows) : this.sparql(directQ))),
      switchMap((rows) => this.toReigns(rows)),
      map((reigns) => {
        this.cache.set(key, reigns, TTL);
        return reigns;
      }),
      catchError(() => of([] as Reign[]))
    );
  }

  /** Build Reigns from officeholder rows, resolving any unlabelled QID names. */
  private toReigns(rows: SparqlRow[]): Observable<Reign[]> {
    const seen = new Set<string>();
    const draft: Reign[] = [];
    for (const r of rows) {
      const name = r['personLabel']?.value;
      if (!name) continue;
      const s = r['start']?.value;
      const e = r['end']?.value;
      const start = s ? Number(s.slice(0, 4)) : null;
      const end = e ? Number(e.slice(0, 4)) : null;
      const dedupe = `${name}:${start}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      draft.push({ name, start, end });
    }
    const qids = Array.from(
      new Set(draft.filter((r) => /^Q\d+$/.test(r.name)).map((r) => r.name))
    ).slice(0, 50);
    if (!qids.length) return of(draft);
    return this.entityLabels(qids).pipe(
      map((labels) =>
        draft
          .map((r) =>
            /^Q\d+$/.test(r.name) ? { ...r, name: labels[r.name] ?? r.name } : r
          )
          .filter((r) => !/^Q\d+$/.test(r.name))
      )
    );
  }

  /**
   * QID → readable English name via the Wikidata action API. Falls back to the
   * English Wikipedia sitelink title when the entity's `label` is missing (some
   * prominent entities currently have an empty label but an intact sitelink).
   */
  private entityLabels(ids: string[]): Observable<Record<string, string>> {
    const params = new HttpParams()
      .set('action', 'wbgetentities')
      .set('ids', ids.join('|'))
      .set('props', 'labels|sitelinks')
      .set('sitefilter', 'enwiki')
      .set('languages', 'en')
      .set('format', 'json')
      .set('origin', '*');
    return this.http
      .get<{
        entities?: Record<
          string,
          {
            labels?: { en?: { value?: string } };
            sitelinks?: { enwiki?: { title?: string } };
          }
        >;
      }>('https://www.wikidata.org/w/api.php', { params })
      .pipe(
        map((r) => {
          const out: Record<string, string> = {};
          for (const [id, ent] of Object.entries(r.entities ?? {})) {
            const name = ent.labels?.en?.value || ent.sitelinks?.enwiki?.title;
            if (name) out[id] = name;
          }
          return out;
        }),
        catchError(() => of({} as Record<string, string>))
      );
  }

  private sparql(query: string): Observable<SparqlRow[]> {
    const params = new HttpParams().set('query', query).set('format', 'json');
    return this.http
      .get<{ results?: { bindings?: SparqlRow[] } }>(WDQS, { params })
      .pipe(map((r) => r?.results?.bindings ?? []));
  }
}
