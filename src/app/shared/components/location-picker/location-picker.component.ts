import {
  Component, ChangeDetectionStrategy, ElementRef, input, output, signal, viewChild,
  afterNextRender, OnDestroy,
} from '@angular/core';
import type * as Leaflet from 'leaflet';
import { GeoPoint } from '../../../core/models/order.model';


/**
 * Map with a draggable pin so the customer can mark exactly where their house is.
 * Leaflet is loaded lazily so it only costs bandwidth on the checkout screen.
 */
@Component({
  selector: 'app-location-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="actions">
      <button type="button" class="gps" [disabled]="locating()" (click)="useMyLocation()">
        {{ locating() ? 'מאתרים...' : value() ? '🎯 עדכון לפי המיקום שלי' : '📍 שתפו את המיקום שלי' }}
      </button>
      @if (value()) {
        <button type="button" class="clear" (click)="clear()">הסרה</button>
      }
    </div>
    @if (error()) { <p class="err">{{ error() }}</p> }
    <div class="map-wrap" [class.hidden]="!value()">
      <div #map class="map"></div>
      <div class="map-hint">גררו את הסיכה בדיוק לכניסה לבית 👆</div>
    </div>
    @if (value(); as v) {
      <p class="ok">✓ המיקום נשמר{{ v.accuracy ? ' (דיוק ' + v.accuracy + ' מ׳)' : '' }} – השליח יקבל ניווט ישיר</p>
    }
  `,
  styles: [`
    :host { display: block; }
    .actions { display: flex; gap: 8px; }
    .gps {
      flex: 1; border: 1.5px dashed var(--gold); background: rgba(200,150,46,.08); color: var(--gold2);
      font: 700 .95rem 'Heebo', sans-serif; padding: 13px; border-radius: 14px; cursor: pointer;
      &:disabled { opacity: .6; }
    }
    .clear { background: var(--dark); border: 1px solid var(--border); color: var(--muted); border-radius: 14px; padding: 0 14px; font: 700 .85rem 'Heebo', sans-serif; cursor: pointer; }
    .map-wrap { position: relative; margin-top: 10px; border-radius: 14px; overflow: hidden; border: 1px solid var(--border-strong); }
    .map-wrap.hidden { display: none; }
    .map { height: 230px; background: #2a2a2a; direction: ltr; } /* Leaflet mis-positions panes inside RTL containers */
    .map-hint {
      position: absolute; top: 8px; left: 50%; transform: translateX(-50%); z-index: 500;
      background: rgba(18,11,4,.88); color: var(--cream); font-size: .75rem; font-weight: 700;
      padding: 5px 12px; border-radius: 999px; white-space: nowrap; pointer-events: none;
    }
    .err { color: #f08a8a; font-size: .8rem; margin-top: 8px; }
    .ok { color: #7fdc9f; font-size: .8rem; margin-top: 8px; font-weight: 700; }
    :host ::ng-deep .toroz-pin {
      font-size: 34px; line-height: 1; filter: drop-shadow(0 3px 4px rgba(0,0,0,.6));
      transform: translate(-2px, -6px);
    }
  `],
})
export class LocationPickerComponent implements OnDestroy {
  readonly value = input<GeoPoint | undefined>(undefined);
  /** Where the map opens when the device location is unavailable (the delivery area). */
  readonly center = input<{ lat: number; lng: number }>({ lat: 32.2667, lng: 35.0103 });
  readonly changed = output<GeoPoint | undefined>();

  readonly locating = signal(false);
  readonly error = signal('');

  private mapEl = viewChild.required<ElementRef<HTMLDivElement>>('map');
  private L: typeof Leaflet | null = null;
  private map: Leaflet.Map | null = null;
  private marker: Leaflet.Marker | null = null;

  constructor() {
    afterNextRender(() => { if (this.value()) void this.showOnMap(this.value()!); });
  }

  useMyLocation(): void {
    this.error.set('');
    if (!('geolocation' in navigator)) {
      this.error.set('הדפדפן לא תומך בשיתוף מיקום. אפשר לסמן ידנית על המפה.');
      void this.showOnMap(this.center(), 15);
      return;
    }
    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        this.locating.set(false);
        const p: GeoPoint = {
          lat: round(pos.coords.latitude), lng: round(pos.coords.longitude),
          accuracy: Math.round(pos.coords.accuracy),
        };
        this.changed.emit(p);
        void this.showOnMap(p, 18);
      },
      err => {
        this.locating.set(false);
        this.error.set(err.code === err.PERMISSION_DENIED
          ? 'לא אישרתם גישה למיקום. אפשר לאשר בהגדרות הדפדפן או לגרור את הסיכה ידנית.'
          : 'לא הצלחנו לאתר את המיקום. נסו שוב או גררו את הסיכה ידנית.');
        const fallback = this.value() ?? this.center();
        if (!this.value()) this.changed.emit({ lat: fallback.lat, lng: fallback.lng });
        void this.showOnMap(fallback, this.value() ? 18 : 15);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  clear(): void {
    this.changed.emit(undefined);
    this.error.set('');
  }

  private async showOnMap(p: GeoPoint, zoom = 18): Promise<void> {
    if (!this.L) {
      const mod = await import('leaflet');
      this.L = ((mod as unknown as { default?: typeof Leaflet }).default ?? mod) as typeof Leaflet;
    }
    const L = this.L;
    if (!this.map) {
      this.map = L.map(this.mapEl().nativeElement, { zoomControl: true, attributionControl: true })
        .setView([p.lat, p.lng], zoom);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '© OpenStreetMap',
      }).addTo(this.map);
      this.map.attributionControl.setPrefix(false);
      const icon = L.divIcon({ className: 'toroz-pin', html: '📍', iconSize: [34, 34], iconAnchor: [17, 34] });
      this.marker = L.marker([p.lat, p.lng], { draggable: true, icon }).addTo(this.map);
      this.marker.on('dragend', () => {
        const ll = this.marker!.getLatLng();
        this.changed.emit({ lat: round(ll.lat), lng: round(ll.lng) });
      });
      this.map.on('click', (e: Leaflet.LeafletMouseEvent) => {
        this.marker!.setLatLng(e.latlng);
        this.changed.emit({ lat: round(e.latlng.lat), lng: round(e.latlng.lng) });
      });
    } else {
      this.map.setView([p.lat, p.lng], zoom);
      this.marker!.setLatLng([p.lat, p.lng]);
    }
    // The wrapper was display:none until now; let Leaflet re-measure.
    setTimeout(() => this.map?.invalidateSize(), 50);
  }

  ngOnDestroy(): void { this.map?.remove(); }
}

function round(n: number): number { return Math.round(n * 1e6) / 1e6; }
