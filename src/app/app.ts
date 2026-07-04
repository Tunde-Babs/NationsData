import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';

import { SearchBar } from './shared/search-bar/search-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, SearchBar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly year = new Date().getFullYear();
  protected readonly theme = signal<'dark' | 'light'>(this.initialTheme());

  private initialTheme(): 'dark' | 'light' {
    // On the server there is no storage/DOM — default to dark.
    if (!this.isBrowser) return 'dark';
    try {
      const saved = localStorage.getItem('wd:theme');
      if (saved === 'light' || saved === 'dark') {
        this.applyTheme(saved);
        return saved;
      }
    } catch {
      /* ignore */
    }
    return 'dark';
  }

  toggleTheme(): void {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    if (!this.isBrowser) return;
    this.applyTheme(next);
    try {
      localStorage.setItem('wd:theme', next);
    } catch {
      /* ignore */
    }
  }

  private applyTheme(theme: 'dark' | 'light'): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
