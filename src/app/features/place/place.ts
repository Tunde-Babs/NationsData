import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import * as L from 'leaflet';

import { OverpassService } from '../../core/services/overpass.service';
import { RoadNetwork, Street } from '../../core/models/geo.models';
import { full } from '../../core/util/format';

/** Colour ramp by OSM highway class. */
const ROAD_COLORS: Record<string, string> = {
  motorway: '#ff5e6c',
  motorway_link: '#ff8a94',
  trunk: '#ff7a45',
  trunk_link: '#ffa887',
  primary: '#ffa24d',
  primary_link: '#ffc48a',
  secondary: '#ffd24d',
  secondary_link: '#ffe08a',
  tertiary: '#9be86a',
  tertiary_link: '#bcf29b',
  residential: '#5b8cff',
  living_street: '#7c9dff',
  unclassified: '#6d8fd6',
  pedestrian: '#c07cff',
  road: '#8aa0c4'
};

@Component({
  selector: 'app-place',
  imports: [RouterLink],
  templateUrl: './place.html',
  styleUrl: './place.scss'
})
export class Place implements AfterViewInit, OnDestroy {
  private readonly overpass = inject(OverpassService);

  // Route params + query params (bound via withComponentInputBinding).
  readonly lat = input.required<string>();
  readonly lng = input.required<string>();
  readonly name = input<string>('');
  readonly country = input<string>('');
  readonly cca3 = input<string>('');

  @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly network = signal<RoadNetwork | null>(null);
  readonly radiusKm = signal(1.1);
  readonly selectedKey = signal<string | null>(null);
  readonly showIntersections = signal(true);
  readonly streetFilter = signal('');

  private map?: L.Map;
  private readonly roadLayer = L.layerGroup();
  private readonly nodeLayer = L.layerGroup();
  private readonly highlightLayer = L.layerGroup();
  private centerMarker?: L.CircleMarker;
  private readonly segLayers = new Map<number, L.Polyline>();
  private lastLoadKey = '';

  readonly coords = computed<[number, number] | null>(() => {
    const la = Number(this.lat());
    const ln = Number(this.lng());
    if (!Number.isFinite(la) || !Number.isFinite(ln) || (la === 0 && ln === 0)) {
      return null;
    }
    return [la, ln];
  });

  readonly stats = computed(() => {
    const net = this.network();
    if (!net) return null;
    const identified = net.streets.filter((s) => s.identified);
    const totalKm = net.streets.reduce((s, x) => s + x.lengthKm, 0);
    const total = net.segments.length;
    const named = net.segments.filter((s) => s.hasName).length;
    return {
      segments: total,
      streets: identified.length,
      intersections: net.intersections.length,
      km: Math.round(totalKm * 10) / 10,
      namedSegments: named,
      coveragePct: total ? Math.round((named / total) * 100) : 0
    };
  });

  readonly streets = computed<Street[]>(() => {
    const net = this.network();
    if (!net) return [];
    const q = this.streetFilter().trim().toLowerCase();
    const list = net.streets.filter((s) => s.identified);
    return q ? list.filter((s) => s.name.toLowerCase().includes(q)) : list;
  });

  /** Link to view/improve the current area in the OSM editor. */
  readonly osmEditUrl = computed(() => {
    const c = this.coords();
    return c ? `https://www.openstreetmap.org/#map=17/${c[0]}/${c[1]}` : '';
  });

  readonly selectedStreet = computed<Street | null>(() => {
    const key = this.selectedKey();
    if (!key) return null;
    return this.network()?.streets.find((s) => s.key === key) ?? null;
  });

  /** Streets that physically connect to the selected street. */
  readonly connectedStreets = computed<Street[]>(() => {
    const net = this.network();
    const street = this.selectedStreet();
    if (!net || !street) return [];
    const segToStreet = new Map<number, string>();
    for (const s of net.streets) {
      for (const id of s.segmentIds) segToStreet.set(id, s.key);
    }
    const connectedKeys = new Set<string>();
    for (const segId of street.segmentIds) {
      for (const neighbour of net.adjacency[segId] ?? []) {
        const key = segToStreet.get(neighbour);
        if (key && key !== street.key) connectedKeys.add(key);
      }
    }
    return net.streets.filter((s) => connectedKeys.has(s.key));
  });

  constructor() {
    // Re-load whenever the point or radius changes (once the map exists).
    effect(() => {
      const c = this.coords();
      const r = this.radiusKm();
      if (this.map && c) this.maybeLoad(c, r);
    });
  }

  ngAfterViewInit(): void {
    const start = this.coords() ?? [0, 20];
    this.map = L.map(this.mapEl.nativeElement, {
      center: start as L.LatLngExpression,
      zoom: 15,
      zoomControl: true,
      preferCanvas: true
    });
    this.tileLayer().addTo(this.map);
    this.roadLayer.addTo(this.map);
    this.nodeLayer.addTo(this.map);
    this.highlightLayer.addTo(this.map);

    const c = this.coords();
    if (c) this.maybeLoad(c, this.radiusKm());
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private tileLayer(): L.TileLayer {
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    const style = dark ? 'dark_all' : 'light_all';
    return L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`,
      {
        maxZoom: 19,
        attribution:
          '&copy; OpenStreetMap contributors &copy; CARTO'
      }
    );
  }

  private maybeLoad(coords: [number, number], radius: number): void {
    const key = `${coords[0].toFixed(4)},${coords[1].toFixed(4)},${radius}`;
    if (key === this.lastLoadKey) return;
    this.lastLoadKey = key;
    this.load(coords, radius);
  }

  private load(coords: [number, number], radius: number): void {
    if (!this.map) return;
    this.map.setView(coords as L.LatLngExpression, radius <= 1 ? 16 : 15);
    this.loading.set(true);
    this.error.set(null);
    this.selectedKey.set(null);

    this.overpass.getNetwork(coords[0], coords[1], radius).subscribe({
      next: (net) => {
        this.network.set(net);
        this.loading.set(false);
        this.draw(net, coords);
      },
      error: (err) => {
        console.error('Overpass error', err);
        this.loading.set(false);
        this.error.set(
          'The map service is busy or unreachable. Try a smaller radius or retry in a moment.'
        );
      }
    });
  }

  private draw(net: RoadNetwork, coords: [number, number]): void {
    this.roadLayer.clearLayers();
    this.nodeLayer.clearLayers();
    this.highlightLayer.clearLayers();
    this.segLayers.clear();

    for (const seg of net.segments) {
      const color = ROAD_COLORS[seg.highway] ?? ROAD_COLORS['road'];
      const weight = this.weightFor(seg.highway);
      const line = L.polyline(seg.coords as L.LatLngExpression[], {
        color,
        weight,
        opacity: 0.85,
        interactive: true
      });
      line.on('click', () => this.selectSegment(seg.id));
      line.bindTooltip(seg.name, { sticky: true, direction: 'top' });
      line.addTo(this.roadLayer);
      this.segLayers.set(seg.id, line);
    }

    this.drawIntersections(net);

    this.centerMarker = L.circleMarker(coords as L.LatLngExpression, {
      radius: 7,
      color: '#fff',
      weight: 2,
      fillColor: '#5b8cff',
      fillOpacity: 1
    });
    this.centerMarker.addTo(this.roadLayer);

    if (net.segments.length) {
      const bounds = L.latLngBounds(net.segments.flatMap((s) => s.coords));
      this.map?.fitBounds(bounds, { padding: [24, 24] });
    }
  }

  private drawIntersections(net: RoadNetwork): void {
    this.nodeLayer.clearLayers();
    if (!this.showIntersections()) return;
    for (const node of net.intersections) {
      if (node.segmentIds.length < 3) continue; // only real junctions
      L.circleMarker([node.lat, node.lng], {
        radius: 3.2,
        color: '#ffd24d',
        weight: 1,
        fillColor: '#ffd24d',
        fillOpacity: 0.9,
        interactive: false
      }).addTo(this.nodeLayer);
    }
  }

  private weightFor(highway: string): number {
    if (highway.startsWith('motorway') || highway.startsWith('trunk')) return 5;
    if (highway.startsWith('primary')) return 4;
    if (highway.startsWith('secondary')) return 3.4;
    if (highway.startsWith('tertiary')) return 3;
    return 2.2;
  }

  selectSegment(segId: number): void {
    const net = this.network();
    if (!net) return;
    const street = net.streets.find((s) => s.segmentIds.includes(segId));
    if (street) this.selectStreet(street.key);
  }

  selectStreet(key: string): void {
    if (this.selectedKey() === key) {
      this.selectedKey.set(null);
      this.highlightLayer.clearLayers();
      return;
    }
    this.selectedKey.set(key);
    this.renderHighlight();
  }

  private renderHighlight(): void {
    const net = this.network();
    const street = this.selectedStreet();
    if (!net || !street || !this.map) return;
    this.highlightLayer.clearLayers();

    const connected = new Set(
      this.connectedStreets().flatMap((s) => s.segmentIds)
    );

    // Draw connected streets in amber, then the selected street on top in white.
    for (const segId of connected) {
      const seg = net.segments.find((s) => s.id === segId);
      if (!seg) continue;
      L.polyline(seg.coords as L.LatLngExpression[], {
        color: '#ffd24d',
        weight: 5,
        opacity: 0.95
      }).addTo(this.highlightLayer);
    }
    const allCoords: L.LatLngExpression[] = [];
    for (const segId of street.segmentIds) {
      const seg = net.segments.find((s) => s.id === segId);
      if (!seg) continue;
      L.polyline(seg.coords as L.LatLngExpression[], {
        color: '#ffffff',
        weight: 6,
        opacity: 1
      }).addTo(this.highlightLayer);
      allCoords.push(...(seg.coords as L.LatLngExpression[]));
    }
    if (allCoords.length) {
      this.map.fitBounds(L.latLngBounds(allCoords), {
        padding: [60, 60],
        maxZoom: 17
      });
    }
  }

  setRadius(km: number): void {
    this.radiusKm.set(km);
  }

  toggleIntersections(): void {
    this.showIntersections.update((v) => !v);
    const net = this.network();
    if (net) this.drawIntersections(net);
  }

  retry(): void {
    const c = this.coords();
    if (c) {
      this.lastLoadKey = '';
      this.maybeLoad(c, this.radiusKm());
    }
  }

  colorFor(highway: string): string {
    return ROAD_COLORS[highway] ?? ROAD_COLORS['road'];
  }

  full = full;
}
