import { Injectable } from '@angular/core';

interface Entry<T> {
  v: T;
  exp: number; // epoch ms expiry
}

/**
 * Small persistent cache backed by localStorage with a per-key TTL.
 * Used to avoid re-hitting rate-limited public APIs (REST Countries,
 * World Bank, Overpass) on every navigation.
 */
@Injectable({ providedIn: 'root' })
export class CacheService {
  private readonly prefix = 'wd:';
  private readonly mem = new Map<string, Entry<unknown>>();

  get<T>(key: string): T | null {
    const k = this.prefix + key;
    let entry = this.mem.get(k) as Entry<T> | undefined;
    if (!entry) {
      const raw = this.safeRead(k);
      if (raw) {
        try {
          entry = JSON.parse(raw) as Entry<T>;
          this.mem.set(k, entry);
        } catch {
          entry = undefined;
        }
      }
    }
    if (!entry) return null;
    if (Date.now() > entry.exp) {
      this.remove(key);
      return null;
    }
    return entry.v;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    const k = this.prefix + key;
    const entry: Entry<T> = { v: value, exp: Date.now() + ttlMs };
    this.mem.set(k, entry);
    this.safeWrite(k, JSON.stringify(entry));
  }

  remove(key: string): void {
    const k = this.prefix + key;
    this.mem.delete(k);
    this.safeRemove(k);
  }

  private safeRead(k: string): string | null {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  }

  private safeWrite(k: string, v: string): void {
    try {
      localStorage.setItem(k, v);
    } catch {
      // Quota exceeded / private mode — memory cache still works this session.
    }
  }

  private safeRemove(k: string): void {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}
