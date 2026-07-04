import { ContinentId, ContinentMeta } from '../models/geo.models';

export const CONTINENTS: ContinentMeta[] = [
  {
    id: 'africa',
    restName: 'Africa',
    name: 'Africa',
    emoji: '🌍',
    blurb: 'The cradle of humanity — 54 nations across savanna, desert and rainforest.',
    gradient: ['#f7971e', '#ff5e62']
  },
  {
    id: 'asia',
    restName: 'Asia',
    name: 'Asia',
    emoji: '🏯',
    blurb: 'The largest, most populous continent — from the Himalayas to the Pacific.',
    gradient: ['#ee0979', '#ff6a00']
  },
  {
    id: 'europe',
    restName: 'Europe',
    name: 'Europe',
    emoji: '🏰',
    blurb: 'A dense mosaic of history, culture and closely-knit nation states.',
    gradient: ['#4776e6', '#8e54e9']
  },
  {
    id: 'north-america',
    restName: 'North America',
    name: 'North America',
    emoji: '🗽',
    blurb: 'From Arctic tundra to tropical isthmus, spanning three great nations and beyond.',
    gradient: ['#11998e', '#38ef7d']
  },
  {
    id: 'south-america',
    restName: 'South America',
    name: 'South America',
    emoji: '🌴',
    blurb: 'Home to the Amazon, the Andes, and vibrant, diverse cultures.',
    gradient: ['#00b09b', '#96c93d']
  },
  {
    id: 'oceania',
    restName: 'Oceania',
    name: 'Oceania',
    emoji: '🏝️',
    blurb: 'Thousands of islands scattered across the vast blue Pacific.',
    gradient: ['#2193b0', '#6dd5ed']
  },
  {
    id: 'antarctica',
    restName: 'Antarctica',
    name: 'Antarctica',
    emoji: '🧊',
    blurb: 'The frozen frontier — governed by treaty, inhabited only by science.',
    gradient: ['#83a4d4', '#b6fbff']
  }
];

const REST_NAME_TO_ID = new Map<string, ContinentId>(
  CONTINENTS.map((c) => [c.restName, c.id])
);

const ID_TO_META = new Map<ContinentId, ContinentMeta>(
  CONTINENTS.map((c) => [c.id, c])
);

export function continentIdFromRestName(restName: string): ContinentId {
  return REST_NAME_TO_ID.get(restName) ?? 'asia';
}

/**
 * Derive one of our 7 continents from the mledoze `region` / `subregion`
 * fields, which split the Americas but not into our North/South buckets.
 */
export function continentFromRegion(
  region: string | undefined,
  subregion: string | undefined
): ContinentId {
  const r = (region ?? '').toLowerCase();
  const s = (subregion ?? '').toLowerCase();
  if (r === 'africa') return 'africa';
  if (r === 'europe') return 'europe';
  if (r === 'asia') return 'asia';
  if (r === 'oceania') return 'oceania';
  if (r.startsWith('antarctic')) return 'antarctica';
  if (r === 'americas') {
    return s.includes('south america') ? 'south-america' : 'north-america';
  }
  return 'asia';
}

export function continentMeta(id: ContinentId): ContinentMeta | undefined {
  return ID_TO_META.get(id);
}
