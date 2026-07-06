import { test as base, expect, Route } from '@playwright/test';

/**
 * Fully deterministic environment for the two areas that depend on flaky,
 * rate-limited third parties: the Overpass streets map and the Wikidata/Wikipedia
 * history answers in the assistant. Everything is stubbed so these specs are
 * stable and offline-capable. (Bundled data — countries, states, cities — needs
 * no network and is used as-is.)
 */

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// ---- Overpass: a small, fully-controlled road network near Abuja ----
// 6 ways; 5 named + 1 unnamed → 83% coverage. Node 2 is shared by 3 ways
// (a real junction). "Main Street" touches 3 other streets (nodes 2 & 3).
const NODE: Record<number, [number, number]> = {
  1: [9.0760, 7.3980], 2: [9.0770, 7.3990], 3: [9.0780, 7.4000],
  4: [9.0770, 7.4010], 5: [9.0770, 7.4030], 6: [9.0790, 7.4000],
  7: [9.0800, 7.4000], 8: [9.0760, 7.4010], 9: [9.0750, 7.4010],
  10: [9.0755, 7.3970], 11: [9.0745, 7.3970], 12: [9.0770, 7.3970], 13: [9.0770, 7.3950]
};
const geom = (nodes: number[]) =>
  nodes.map((n) => ({ lat: NODE[n][0], lon: NODE[n][1] }));
const way = (id: number, nodes: number[], tags: Record<string, string>) => ({
  type: 'way', id, nodes, geometry: geom(nodes), tags
});

const OVERPASS_ABUJA = {
  elements: [
    way(101, [1, 2, 3], { highway: 'residential', name: 'Main Street' }),
    way(102, [2, 4, 5], { highway: 'residential', name: 'Second Avenue' }),
    way(106, [2, 12, 13], { highway: 'tertiary', name: 'Central Cross' }),
    way(103, [3, 6, 7], { highway: 'tertiary', name: 'Third Road' }),
    way(104, [4, 8, 9], { highway: 'residential', name: 'Market Lane' }),
    way(105, [10, 11], { highway: 'residential' }) // unnamed
  ]
};

// ---- Wikidata: officeholders (P39 via office) with real labels ----
type Reign = [string, string, string | null]; // [name, startISO, endISO|null]
const LEADERS: Record<string, Reign[]> = {
  KE: [
    ['William Ruto', '2022-09-13', null],
    ['Uhuru Kenyatta', '2013-04-09', '2022-09-13'],
    ['Mwai Kibaki', '2002-12-30', '2013-04-09'],
    ['Daniel arap Moi', '1978-08-22', '2002-12-30'],
    ['Jomo Kenyatta', '1964-12-12', '1978-08-22']
  ],
  GB: [
    ['Charles III', '2022-09-08', null],
    ['Elizabeth II', '1952-02-06', '2022-09-08'],
    ['George VI', '1936-12-11', '1952-02-06'],
    ['Edward VIII', '1936-01-20', '1936-12-11'],
    ['George V', '1910-05-06', '1936-01-20']
  ]
};
const INCEPTION: Record<string, string> = { BR: '1822-09-07', KE: '1963-12-12' };

const sparqlBindings = (query: string) => {
  const iso = /P297\s+"([A-Z]{2})"/.exec(query)?.[1] ?? '';
  if (/P571/.test(query)) {
    const date = INCEPTION[iso];
    return { results: { bindings: date ? [{ inception: { value: `${date}T00:00:00Z` } }] : [] } };
  }
  const reigns = LEADERS[iso] ?? [];
  return {
    results: {
      bindings: reigns.map(([name, start, end]) => ({
        person: { value: `http://www.wikidata.org/entity/Q_${name.replace(/\s/g, '')}` },
        personLabel: { value: name },
        start: { value: `${start}T00:00:00Z` },
        ...(end ? { end: { value: `${end}T00:00:00Z` } } : {})
      }))
    }
  };
};

const WIKI_SUMMARY: Record<string, string> = {
  Ghana:
    'Ghana, officially the Republic of Ghana, is a country in West Africa. ' +
    'It borders Ivory Coast to the west, Burkina Faso to the north, and Togo to the east.'
};

export const test = base.extend({
  page: async ({ page }, use) => {
    // Economics — empty but well-formed so the app resolves fast, offline.
    await page.route(/api\.worldbank\.org/, (r: Route) =>
      r.fulfill({ json: [{ page: 1, pages: 1, total: 0 }, []] })
    );
    // Images: flags + CARTO tiles.
    await page.route(/flagcdn\.com|basemaps\.cartocdn\.com/, (r: Route) =>
      r.fulfill({ contentType: 'image/png', body: PNG_1x1 })
    );
    // Streets.
    await page.route(/overpass-api\.de|overpass\.kumi\.systems/, (r: Route) =>
      r.fulfill({ json: OVERPASS_ABUJA })
    );
    // Wikidata SPARQL — branch on the query.
    await page.route(/query\.wikidata\.org/, (r: Route) => {
      const query = new URL(r.request().url()).searchParams.get('query') ?? '';
      r.fulfill({ json: sparqlBindings(query) });
    });
    // Wikidata entity API (label fallback) — labels already supplied inline.
    await page.route(/wikidata\.org\/w\/api\.php/, (r: Route) =>
      r.fulfill({ json: { entities: {} } })
    );
    // Wikipedia summaries.
    await page.route(/wikipedia\.org\/api\/rest/, (r: Route) => {
      const title = decodeURIComponent(r.request().url().split('/').pop() ?? '');
      r.fulfill({ json: { extract: WIKI_SUMMARY[title] ?? '' } });
    });
    await use(page);
  }
});

export { expect };
