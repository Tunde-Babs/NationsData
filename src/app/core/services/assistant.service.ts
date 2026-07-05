import { Injectable, inject } from '@angular/core';
import { Observable, of, from, switchMap, map } from 'rxjs';

import { CountriesService } from './countries.service';
import { WikiService, Reign } from './wiki.service';
import { continentMeta } from '../data/continents';
import { Country } from '../models/geo.models';
import { compact, full, usd, area as fmtArea, density } from '../util/format';

export interface AssistantAnswer {
  text: string;
  /** Optional router link to the relevant country page. */
  link?: unknown[];
}

/** The exact message required for unanswerable / invalid input. */
export const NO_ANSWER =
  'There are no found answers to your question, please try to ask another question or rephrase your questions for better understanding';

/** Common short-hands people type that don't substring-match the full name. */
const ALIASES: Record<string, string> = {
  usa: 'united states',
  us: 'united states',
  america: 'united states',
  uk: 'united kingdom',
  britain: 'united kingdom',
  england: 'united kingdom',
  uae: 'united arab emirates',
  drc: 'democratic republic of the congo',
  'south korea': 'south korea',
  'north korea': 'north korea'
};

/**
 * A no-LLM "data assistant": it detects the country and intent in a question,
 * answers current facts from the offline datasets, and fetches historical facts
 * (founding year, rulers) live from Wikidata/Wikipedia. Anything it can't
 * resolve returns the required fallback message.
 */
@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly countries = inject(CountriesService);
  private readonly wiki = inject(WikiService);

  ask(question: string): Observable<AssistantAnswer> {
    const text = question.trim();
    if (!text) return of({ text: NO_ANSWER });
    if (/^(hi|hello|hey|help|yo|what can you|who are you)\b/i.test(text)) {
      return of({ text: this.helpText() });
    }
    return this.countries.getAll().pipe(
      switchMap((list) => {
        const country = this.detectCountry(text, list);
        if (!country) return of({ text: NO_ANSWER });
        // Remove the country's own name before intent parsing, so phrases like
        // "United States" (contains "states") don't trigger the wrong intent.
        return this.route(this.stripCountry(text, country), country, list);
      })
    );
  }

  // ---------- routing ----------
  private route(
    q: string,
    c: Country,
    list: Country[]
  ): Observable<AssistantAnswer> {
    if (/\bcapital\b/.test(q)) return of(this.capital(c));
    // \bresidents\b (not bare "residents" — it substring-matches "presidents").
    if (/population|how many people|populous|inhabitants|\bresidents\b/.test(q))
      return of(this.population(c));
    if (/currency|money|legal tender|dollar|naira|pay with/.test(q))
      return of(this.currency(c));
    if (/gdp|economy|economic|per capita|wealth/.test(q)) return of(this.gdp(c));
    if (/\barea\b|land ?mass|how big|size|square|km2|km²/.test(q))
      return of(this.area(c));
    if (/continent/.test(q)) return of(this.continent(c));
    if (
      /how many (states|provinces|regions|cities|towns|municipalit)|number of (states|provinces|regions|cities|towns)|(states|provinces|regions|cities|towns) (in|of|does|are)/.test(
        q
      )
    ) {
      return this.statesCities(c, q);
    }
    if (/language|spoken|speak/.test(q)) return of(this.languages(c));
    if (/border|neighbou?r|next to|adjacent/.test(q))
      return of(this.borders(c, list));

    if (/found|establish|independen|inception|creat|\bhow old\b|came into/.test(q))
      return this.founded(c);

    if (
      /president|king|queen|monarch|emperor|ruler|leader|prime minister|head of state|head of government|chancellor|premier|taoiseach|sultan|\bpm\b|who (rules|ruled|leads|led|governs|governed|is in charge|is the leader|was the leader)/.test(
        q
      )
    ) {
      return this.leaders(c, q);
    }

    // Anything else about a recognised country → Wikipedia overview.
    return this.about(c);
  }

  // ---------- offline (current) answers ----------
  private capital(c: Country): AssistantAnswer {
    const cap = c.capital[0];
    return {
      text: cap
        ? `The capital of ${c.name} is ${cap}.`
        : `${c.name} has no designated capital city.`,
      link: ['/country', c.cca3]
    };
  }
  private population(c: Country): AssistantAnswer {
    return {
      text: c.population
        ? `${c.name} has a population of about ${full(c.population)} (${compact(
            c.population
          )}), a density of ${density(c.population, c.area)}.`
        : `I don't have current population data for ${c.name}.`,
      link: ['/country', c.cca3]
    };
  }
  private currency(c: Country): AssistantAnswer {
    if (!c.currencies.length)
      return { text: `${c.name} has no listed official currency.`, link: ['/country', c.cca3] };
    const list = c.currencies
      .map((x) => `${x.name} (${x.symbol || x.code})`)
      .join(', ');
    return { text: `${c.name}'s currency is ${list}.`, link: ['/country', c.cca3] };
  }
  private gdp(c: Country): AssistantAnswer {
    const e = c.economy;
    if (!e.gdpPerCapitaUsd && !e.gdpTotalUsd)
      return { text: `I don't have GDP data for ${c.name}.`, link: ['/country', c.cca3] };
    return {
      text:
        `${c.name}'s GDP per capita is ${usd(e.gdpPerCapitaUsd, false)}` +
        (e.year ? ` (${e.year})` : '') +
        `, with a total GDP of about ${usd(e.gdpTotalUsd)}.`,
      link: ['/country', c.cca3]
    };
  }
  private area(c: Country): AssistantAnswer {
    return {
      text: `${c.name} covers a land area of ${fmtArea(c.area)}.`,
      link: ['/country', c.cca3]
    };
  }
  private continent(c: Country): AssistantAnswer {
    const meta = continentMeta(c.continent);
    return {
      text: `${c.name} is in ${meta?.name ?? c.region}${
        c.subregion ? ` (${c.subregion})` : ''
      }.`,
      link: ['/continent', c.continent]
    };
  }
  private languages(c: Country): AssistantAnswer {
    return {
      text: c.languages.length
        ? `Languages spoken in ${c.name}: ${c.languages.join(', ')}.`
        : `I don't have language data for ${c.name}.`,
      link: ['/country', c.cca3]
    };
  }
  private borders(c: Country, list: Country[]): AssistantAnswer {
    if (!c.borders.length)
      return {
        text: `${c.name} has no land borders — it's an island or otherwise isolated.`,
        link: ['/country', c.cca3]
      };
    const byCode = new Map(list.map((x) => [x.cca3, x.name]));
    const names = c.borders.map((b) => byCode.get(b) ?? b).join(', ');
    return { text: `${c.name} borders ${names}.`, link: ['/country', c.cca3] };
  }

  // ---------- web (historical) answers ----------
  private founded(c: Country): Observable<AssistantAnswer> {
    return this.wiki.inceptionYear(c.cca2).pipe(
      map((inc) =>
        inc
          ? {
              text: `According to Wikidata, ${c.name} was established on ${this.prettyDate(
                inc.date
              )} (${inc.year}).`,
              link: ['/country', c.cca3]
            }
          : { text: NO_ANSWER }
      )
    );
  }

  private leaders(c: Country, q: string): Observable<AssistantAnswer> {
    const pm = /prime minister|head of government|chancellor|premier|taoiseach|\bpm\b/.test(q);
    const role = pm
      ? /chancellor/.test(q)
        ? 'chancellor'
        : /taoiseach/.test(q)
          ? 'Taoiseach'
          : /premier/.test(q)
            ? 'premier'
            : 'head of government'
      : 'head of state';
    const yearMatch = q.match(/\b(1[5-9]\d{2}|20\d{2})\b/);
    const year = yearMatch ? Number(yearMatch[1]) : null;
    const wantsFirst = /\bfirst\b|\bearliest\b/.test(q);
    const wantsList = /\blist\b|\ball\b|every|past and present|full list|history of/.test(q);
    const roleTitle = pm
      ? /chancellor/.test(q)
        ? 'Chancellors'
        : /premier/.test(q)
          ? 'Premiers'
          : 'Heads of government'
      : 'Heads of state';

    return this.wiki.leaders(c.cca2, pm ? 'P6' : 'P35').pipe(
      map((reigns): AssistantAnswer => {
        if (!reigns.length) return { text: NO_ANSWER };
        const link = ['/country', c.cca3];

        // Order by term start. Leaders are sequential, so the person in office
        // at year Y is the one who took office most recently on/before Y — this
        // is robust to Wikidata terms that are missing an end date.
        const dated = reigns
          .filter((r) => r.start !== null)
          .sort((a, b) => (a.start as number) - (b.start as number));
        if (!dated.length) return { text: NO_ANSWER };

        if (wantsList && year === null) {
          const items = dated.map((r) => `${r.name}${this.period(r)}`);
          return {
            text: `${roleTitle} of ${c.name} recorded in Wikidata (${items.length}): ${items.join(
              '; '
            )}.`,
            link
          };
        }

        if (year !== null) {
          const upto = dated.filter((r) => (r.start as number) <= year);
          // Prefer whoever took office most recently by Y and whose term still
          // covers Y (handles same-year successions like Edward VIII → George VI).
          const covering = upto.filter((r) => r.end === null || r.end >= year);
          const match = covering.length
            ? covering[covering.length - 1]
            : upto[upto.length - 1];
          return match
            ? {
                text: `In ${year}, the ${role} of ${c.name} was ${match.name}${this.period(
                  match
                )}.`,
                link
              }
            : { text: NO_ANSWER };
        }

        if (wantsFirst) {
          const f = dated[0];
          return {
            text: `The earliest ${role} of ${c.name} recorded in Wikidata is ${f.name}${this.period(
              f
            )}.`,
            link
          };
        }

        const current = dated[dated.length - 1];
        const predecessors = dated.slice(0, -1).slice(-3).reverse();
        let text = `The current ${role} of ${c.name} is ${current.name}${
          current.start ? ` (in office since ${current.start})` : ''
        }.`;
        if (predecessors.length) {
          text += ` Recent predecessors: ${predecessors
            .map((r) => `${r.name} (${r.start ?? '?'}–${r.end ?? '?'})`)
            .join(', ')}.`;
        }
        return { text, link };
      })
    );
  }

  /** Accurate state/region and city counts from the offline dataset (lazy-loaded). */
  private statesCities(c: Country, q: string): Observable<AssistantAnswer> {
    const wantsStates = /state|province|region/.test(q);
    const wantsCities = /cit|town|municipalit/.test(q);
    return from(import('country-state-city')).pipe(
      map(({ State, City }): AssistantAnswer => {
        const stateCount = State.getStatesOfCountry(c.cca2).length;
        const cityCount = (City.getCitiesOfCountry(c.cca2) ?? []).length;
        const link = ['/country', c.cca3];
        const statesPart = `${full(stateCount)} states/regions`;
        const citiesPart = `${full(cityCount)} cities & towns`;

        if (wantsCities && !wantsStates) {
          if (!cityCount)
            return { text: `I don't have city data for ${c.name}.`, link };
          return {
            text: `${c.name} has ${citiesPart} in the NationsData dataset.`,
            link
          };
        }
        if (wantsStates && !wantsCities) {
          if (!stateCount)
            return { text: `${c.name} has no sub-regions in the dataset.`, link };
          return {
            text: `${c.name} has ${statesPart} in the NationsData dataset.`,
            link
          };
        }
        return {
          text: `${c.name} has ${statesPart} and ${citiesPart} in the NationsData dataset.`,
          link
        };
      })
    );
  }

  private about(c: Country): Observable<AssistantAnswer> {
    return this.wiki.summary(c.name).pipe(
      map((extract) =>
        extract
          ? { text: this.trimSentences(extract, 3), link: ['/country', c.cca3] }
          : { text: NO_ANSWER }
      )
    );
  }

  // ---------- helpers ----------
  private detectCountry(question: string, list: Country[]): Country | undefined {
    const s = ` ${question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ')} `;
    let best: Country | undefined;
    let bestLen = 0;

    const consider = (needle: string, c: Country) => {
      if (needle.length >= 3 && needle.length > bestLen && s.includes(` ${needle} `)) {
        best = c;
        bestLen = needle.length;
      }
    };

    for (const c of list) {
      consider(c.name.toLowerCase(), c);
      for (const cap of c.capital) consider(cap.toLowerCase(), c);
      if (s.includes(` ${c.cca3.toLowerCase()} `) && bestLen < 3) {
        best = c;
        bestLen = 3;
      }
    }
    for (const [alias, canonical] of Object.entries(ALIASES)) {
      if (s.includes(` ${alias} `)) {
        const c = list.find((x) => x.name.toLowerCase() === canonical);
        if (c && canonical.length > bestLen) {
          best = c;
          bestLen = canonical.length;
        }
      }
    }
    return best;
  }

  /** Blank out the country's name/aliases/capitals so they don't match intents. */
  private stripCountry(question: string, c: Country): string {
    let s = ` ${question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')} `;
    const needles = [
      c.name.toLowerCase(),
      ...c.capital.map((x) => x.toLowerCase()),
      c.cca2.toLowerCase(),
      c.cca3.toLowerCase(),
      'united states of america',
      'of america'
    ];
    for (const [alias, canonical] of Object.entries(ALIASES)) {
      if (canonical === c.name.toLowerCase()) needles.push(alias);
    }
    needles.sort((a, b) => b.length - a.length);
    for (const n of needles) {
      if (n.length >= 2) s = s.split(` ${n} `).join('  ');
    }
    return s;
  }

  private period(r: Reign): string {
    if (r.start && r.end) return ` (${r.start}–${r.end})`;
    if (r.start) return ` (from ${r.start})`;
    return '';
  }

  private prettyDate(iso: string): string {
    const d = new Date(iso + 'T00:00:00Z');
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    });
  }

  private trimSentences(text: string, count: number): string {
    const parts = text.match(/[^.!?]+[.!?]+/g);
    if (!parts) return text;
    return parts.slice(0, count).join(' ').trim();
  }

  private helpText(): string {
    return (
      "Hi! I'm the NationsData assistant. Ask me about any country — for example: " +
      '“What is the capital of Japan?”, “Population of India”, “When was Brazil founded?”, ' +
      '“Who is the president of Kenya?”, or “Who ruled France in 1789?”.'
    );
  }
}
