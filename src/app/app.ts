import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

import { SearchBar } from './shared/search-bar/search-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, SearchBar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly year = new Date().getFullYear();
  protected readonly theme = signal<'dark' | 'light'>(this.initialTheme());

  private initialTheme(): 'dark' | 'light' {
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
