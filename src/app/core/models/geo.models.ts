/** Canonical list of continents used across the app. */
export type ContinentId =
  | 'africa'
  | 'asia'
  | 'europe'
  | 'north-america'
  | 'south-america'
  | 'oceania'
  | 'antarctica';

export interface ContinentMeta {
  id: ContinentId;
  /** Name as returned by REST Countries `continents` field. */
  restName: string;
  name: string;
  emoji: string;
  blurb: string;
  /** Two CSS colors used to build the widget gradient. */
  gradient: [string, string];
}

/** Normalised country model derived from the REST Countries API. */
export interface Country {
  cca2: string; // ISO 3166-1 alpha-2 (used by country-state-city & World Bank)
  cca3: string; // ISO 3166-1 alpha-3 (used in routes)
  name: string;
  officialName: string;
  continent: ContinentId;
  region: string;
  subregion: string;
  capital: string[];
  population: number;
  area: number; // km²
  currencies: CurrencyInfo[];
  languages: string[];
  tld: string[]; // internet top-level domains
  borders: string[]; // cca3 codes
  latlng: [number, number];
  flagPng: string;
  flagAlt: string;
  mapsUrl: string;
  economy: EconomyInfo;
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

/** GDP figures fetched lazily from the World Bank API. */
export interface EconomyInfo {
  gdpPerCapitaUsd: number | null;
  gdpTotalUsd: number | null;
  year: string | null;
}

export interface StateInfo {
  name: string;
  isoCode: string;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
}

export interface CityInfo {
  name: string;
  countryCode: string;
  stateCode: string;
  latitude: number | null;
  longitude: number | null;
}

/** A single road/street segment returned from Overpass (an OSM "way"). */
export interface RoadSegment {
  id: number;
  name: string;
  highway: string; // motorway | primary | residential | ...
  oneway: boolean;
  nodeIds: number[];
  coords: [number, number][]; // [lat, lng] points
}

/** A named street groups one or more segments that share the same name. */
export interface Street {
  key: string;
  name: string;
  highway: string;
  segmentIds: number[];
  lengthKm: number;
}

/** Result of building the interconnection graph for an area. */
export interface RoadNetwork {
  bbox: [number, number, number, number]; // south, west, north, east
  segments: RoadSegment[];
  streets: Street[];
  /** Intersections: coordinate + the segment ids that meet there. */
  intersections: Intersection[];
  /** segment id -> segment ids it connects to (shares a node with). */
  adjacency: Record<number, number[]>;
}

export interface Intersection {
  nodeId: number;
  lat: number;
  lng: number;
  segmentIds: number[];
}

export type SearchKind = 'country' | 'city' | 'capital';

export interface SearchResult {
  kind: SearchKind;
  label: string;
  sublabel: string;
  /** Router link + optional query params. */
  link: any[];
  queryParams?: Record<string, string>;
  flagPng?: string;
  lat?: number;
  lng?: number;
}
