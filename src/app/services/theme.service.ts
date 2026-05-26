import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  public currentTheme: 'light' | 'dark' | 'system' = 'system';

  constructor() {}

  async init() {
    const res = await Preferences.get({ key: 'app_theme' });
    if (res.value) {
      this.currentTheme = res.value as any;
    }
    this.applyTheme();
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.currentTheme === 'system') {
        this.applyTheme();
      }
    });
  }

  async setTheme(theme: 'light' | 'dark' | 'system') {
    this.currentTheme = theme;
    await Preferences.set({ key: 'app_theme', value: theme });
    this.applyTheme();
  }

  private applyTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = this.currentTheme === 'dark' || (this.currentTheme === 'system' && prefersDark);
    document.body.classList.toggle('dark', isDark);
  }
}
