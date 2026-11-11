import { Injectable, inject, signal } from '@angular/core';
import { Database, ref, onValue, set } from '@angular/fire/database';
import { DEFAULT_SETTINGS, StoreSettings } from '../models/settings.model';
import { environment } from '../../../environments/environment';


@Injectable({ providedIn: 'root' })
export class SettingsService {
  private db = inject(Database);

  readonly settings = signal<StoreSettings>(DEFAULT_SETTINGS);
  readonly loaded = signal(false);

  constructor() {
    if (environment.demo) { this.loaded.set(true); return; }
    onValue(ref(this.db, 'settings'), snap => {
      const raw = snap.exists() ? (snap.val() as Partial<StoreSettings>) : {};
      // Firebase drops empty arrays, so a missing list means "use the default area".
      this.settings.set({ ...DEFAULT_SETTINGS, ...raw, cities: raw.cities ?? DEFAULT_SETTINGS.cities });
      this.loaded.set(true);
    });
  }

  async save(s: StoreSettings): Promise<void> {
    await set(ref(this.db, 'settings'), s);
  }

  /** Phone formatted for display, e.g. 052-755-8858. */
  displayPhone(): string {
    const p = this.settings().phone.replace(/\D/g, '');
    const local = p.startsWith('972') ? '0' + p.slice(3) : p;
    return local.length === 10 ? `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}` : local;
  }
}
