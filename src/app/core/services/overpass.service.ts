import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, map, catchError, throwError } from 'rxjs';

import {
  RoadNetwork,
  RoadSegment,
  Street,
  Intersection
} from '../models/geo.models';
import { CacheService } from './cache.service';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const TTL = 1000 * 60 * 60 * 24 * 3; // 3 days

/** Highway classes we treat as "streets & roads". */
const HIGHWAY_FILTER =
  'motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian|road|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link';

interface OverpassElement {
  type: string;
  id: number;
  nodes?: number[];
  geometry?: { lat: number; lon: number }[];
  tags?: Record<string, string>;
}
interface OverpassResponse {
  elements: OverpassElement[];
}

@Injectable({ providedIn: 'root' })
export class OverpassService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(CacheService);

  /**
   * Fetch the road network in a square around (lat,lng). `radiusKm` controls
   * the half-size of the query box. Results are cached by rounded bbox.
   */
  getNetwork(lat: number, lng: number, radiusKm = 1.1): Observable<RoadNetwork> {
    const bbox = this.bboxAround(lat, lng, radiusKm);
    const key = `overpass:${bbox.map((n) => n.toFixed(3)).join(',')}`;

    const cached = this.cache.get<RoadNetwork>(key);
    if (cached) return of(cached);

    const query = this.buildQuery(bbox);
    return this.request(query, 0).pipe(
      map((res) => {
        const network = this.buildNetwork(bbox, res.elements);
        this.cache.set(key, network, TTL);
        return network;
      })
    );
  }

  private request(query: string, endpointIndex: number): Observable<OverpassResponse> {
    const url = ENDPOINTS[endpointIndex];
    const body = new HttpParams({ fromObject: { data: query } });
    return this.http
      .post<OverpassResponse>(url, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      .pipe(
        catchError((err) => {
          // Fail over to the next mirror before giving up.
          if (endpointIndex < ENDPOINTS.length - 1) {
            return this.request(query, endpointIndex + 1);
          }
          return throwError(() => err);
        })
      );
  }

  private buildQuery(bbox: [number, number, number, number]): string {
    const [s, w, n, e] = bbox;
    return (
      `[out:json][timeout:25];` +
      `(way["highway"~"^(${HIGHWAY_FILTER})$"](${s},${w},${n},${e}););` +
      `out geom;`
    );
  }

  /** Turn raw OSM ways into segments + a connectivity graph. */
  private buildNetwork(
    bbox: [number, number, number, number],
    elements: OverpassElement[]
  ): RoadNetwork {
    const segments: RoadSegment[] = [];
    // node id -> [segment ids] sharing that node (for intersection detection).
    const nodeToSegments = new Map<number, number[]>();
    // node id -> coordinate (first time we see it).
    const nodeCoord = new Map<number, [number, number]>();

    for (const el of elements) {
      if (el.type !== 'way' || !el.geometry || !el.nodes) continue;
      const coords = el.geometry.map(
        (g) => [g.lat, g.lon] as [number, number]
      );
      const realName = el.tags?.['name'];
      const ref = el.tags?.['ref'];
      const highway = el.tags?.['highway'] ?? 'road';
      const seg: RoadSegment = {
        id: el.id,
        name: realName ?? ref ?? `Unnamed ${humanizeHighway(highway)}`,
        highway,
        oneway: el.tags?.['oneway'] === 'yes',
        hasName: !!realName,
        identified: !!(realName || ref),
        nodeIds: el.nodes,
        coords
      };
      segments.push(seg);

      el.nodes.forEach((nodeId, i) => {
        const list = nodeToSegments.get(nodeId);
        if (list) list.push(el.id);
        else nodeToSegments.set(nodeId, [el.id]);
        if (!nodeCoord.has(nodeId) && coords[i]) nodeCoord.set(nodeId, coords[i]);
      });
    }

    // Intersections = nodes shared by 2+ distinct segments.
    const intersections: Intersection[] = [];
    const adjacency: Record<number, number[]> = {};
    const adjSets = new Map<number, Set<number>>();
    for (const seg of segments) adjSets.set(seg.id, new Set());

    for (const [nodeId, segIds] of nodeToSegments) {
      const unique = Array.from(new Set(segIds));
      if (unique.length < 2) continue;
      const coord = nodeCoord.get(nodeId);
      if (coord) {
        intersections.push({
          nodeId,
          lat: coord[0],
          lng: coord[1],
          segmentIds: unique
        });
      }
      for (const a of unique) {
        for (const b of unique) {
          if (a !== b) adjSets.get(a)?.add(b);
        }
      }
    }
    for (const [id, set] of adjSets) adjacency[id] = Array.from(set);

    return {
      bbox,
      segments,
      streets: this.groupStreets(segments),
      intersections,
      adjacency
    };
  }

  /** Group segments that share a name into logical streets. */
  private groupStreets(segments: RoadSegment[]): Street[] {
    const byName = new Map<string, Street>();
    for (const seg of segments) {
      const key = `${seg.name}::${seg.highway}`;
      let street = byName.get(key);
      if (!street) {
        street = {
          key,
          name: seg.name,
          highway: seg.highway,
          hasName: seg.hasName,
          identified: seg.identified,
          segmentIds: [],
          lengthKm: 0
        };
        byName.set(key, street);
      }
      street.segmentIds.push(seg.id);
      street.lengthKm += this.segmentLengthKm(seg.coords);
    }
    return Array.from(byName.values())
      .map((s) => ({ ...s, lengthKm: Math.round(s.lengthKm * 100) / 100 }))
      .sort((a, b) => {
        // Identified (named/numbered) roads first, then longest.
        if (a.identified !== b.identified) return a.identified ? -1 : 1;
        return b.lengthKm - a.lengthKm;
      });
  }

  private segmentLengthKm(coords: [number, number][]): number {
    let km = 0;
    for (let i = 1; i < coords.length; i++) {
      km += haversineKm(coords[i - 1], coords[i]);
    }
    return km;
  }

  /** Build a square bbox [south, west, north, east] around a point. */
  private bboxAround(
    lat: number,
    lng: number,
    radiusKm: number
  ): [number, number, number, number] {
    const dLat = radiusKm / 111; // ~111 km per degree latitude
    const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
    return [lat - dLat, lng - dLng, lat + dLat, lng + dLng];
  }
}

/** Readable description of an OSM highway class, for unnamed roads. */
function humanizeHighway(hw: string): string {
  const map: Record<string, string> = {
    motorway: 'motorway',
    motorway_link: 'motorway ramp',
    trunk: 'trunk road',
    trunk_link: 'trunk ramp',
    primary: 'primary road',
    primary_link: 'primary link',
    secondary: 'secondary road',
    secondary_link: 'secondary link',
    tertiary: 'tertiary road',
    tertiary_link: 'tertiary link',
    residential: 'residential street',
    living_street: 'living street',
    unclassified: 'local road',
    pedestrian: 'pedestrian way',
    road: 'road'
  };
  return map[hw] ?? 'road';
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
