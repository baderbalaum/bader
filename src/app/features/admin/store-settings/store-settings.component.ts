import { Component, ChangeDetectionStrategy, inject, output, signal } from '@angular/core';
import { SettingsService } from '../../../core/services/settings.service';
import { StoreSettings } from '../../../core/models/settings.model';

type NumKey = 'deliveryFee' | 'freeDeliveryOver' | 'minOrder' | 'prepMinutes' | 'deliveryMinutes';
type BoolKey = 'isOpen' | 'deliveryEnabled' | 'pickupEnabled';
type TextKey = 'phone' | 'address' | 'announcement';

@Component({
  selector: 'app-store-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-bg" (click)="onBackdrop($event)">
      <div class="modal">
        <div class="head">
          <h2>⚙ הגדרות משלוחים ואפליקציה</h2>
          <button class="x" (click)="closed.emit()" aria-label="סגור">×</button>
        </div>

        <div class="body">
          <div class="toggles">
            @for (t of toggles; track t.key) {
              <label class="toggle" [class.on]="f()[t.key]">
                <input type="checkbox" [checked]="f()[t.key]" (change)="setBool(t.key, $event)"/>
                <span class="sw"></span>{{ t.label }}
              </label>
            }
          </div>

          <div class="grid">
            @for (n of numbers; track n.key) {
              <div class="field">
                <label>{{ n.label }}</label>
                <input type="number" min="0" [value]="f()[n.key]" (input)="setNum(n.key, $event)"/>
              </div>
            }
          </div>
          <p class="hint">משלוח חינם מעל: 0 = אף פעם לא חינם.</p>

          <div class="field">
            <label>ערים למשלוח (מופרדות בפסיק, ריק = הלקוח כותב חופשי)</label>
            <input type="text" [value]="citiesText()" (input)="citiesText.set(val($event))"/>
          </div>
          <div class="grid">
            <div class="field">
              <label>טלפון המסעדה (972...)</label>
              <input type="text" dir="ltr" [value]="f().phone" (input)="setText('phone', $event)"/>
            </div>
            <div class="field">
              <label>כתובת המסעדה (לאיסוף עצמי)</label>
              <input type="text" [value]="f().address" (input)="setText('address', $event)"/>
            </div>
          </div>
          <div class="field">
            <label>הודעה ללקוחות בראש האפליקציה (מבצע, שעות מיוחדות...)</label>
            <input type="text" [value]="f().announcement" (input)="setText('announcement', $event)"/>
          </div>
        </div>

        <div class="foot">
          <button class="btn" (click)="closed.emit()">ביטול</button>
          <button class="btn gold" [disabled]="saving()" (click)="save()">{{ saving() ? 'שומר...' : 'שמירה' }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 90; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(4px); }
    .modal { background: var(--card); border: 1px solid var(--border); border-radius: 18px; width: min(640px, 100%); max-height: 92vh; display: flex; flex-direction: column; }
    .head { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid var(--border); }
    h2 { font-size: 1.1rem; font-weight: 900; color: var(--gold); }
    .x { background: none; border: none; color: var(--muted); font-size: 1.6rem; cursor: pointer; }
    .body { padding: 16px 18px; overflow-y: auto; }
    .foot { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 18px; border-top: 1px solid var(--border); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 0 12px; }
    .hint { color: var(--muted); font-size: .75rem; margin: -6px 0 14px; }
    .toggles { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; background: var(--dark); border: 1px solid var(--border); border-radius: 999px; padding: 8px 14px; font-weight: 700; font-size: .85rem; }
    .toggle input { display: none; }
    .sw { width: 34px; height: 20px; border-radius: 999px; background: var(--card2); position: relative; transition: background .15s; }
    .sw::after { content: ''; position: absolute; top: 3px; right: 3px; width: 14px; height: 14px; border-radius: 50%; background: var(--muted); transition: all .15s; }
    .toggle.on { border-color: var(--green); }
    .toggle.on .sw { background: var(--green); }
    .toggle.on .sw::after { right: 17px; background: #fff; }
  `],
})
export class StoreSettingsComponent {
  private svc = inject(SettingsService);
  readonly closed = output<void>();
  readonly savedOk = output<void>();

  readonly f = signal<StoreSettings>({ ...this.svc.settings() });
  readonly citiesText = signal(this.svc.settings().cities.join(', '));
  readonly saving = signal(false);

  readonly toggles: { key: BoolKey; label: string }[] = [
    { key: 'isOpen', label: 'המסעדה פתוחה להזמנות' },
    { key: 'deliveryEnabled', label: 'משלוחים' },
    { key: 'pickupEnabled', label: 'איסוף עצמי' },
  ];
  readonly numbers: { key: NumKey; label: string }[] = [
    { key: 'deliveryFee', label: 'דמי משלוח (₪)' },
    { key: 'minOrder', label: 'מינימום למשלוח (₪)' },
    { key: 'freeDeliveryOver', label: 'משלוח חינם מעל (₪)' },
    { key: 'prepMinutes', label: 'זמן הכנה (דק׳)' },
    { key: 'deliveryMinutes', label: 'זמן נסיעה (דק׳)' },
  ];

  val(e: Event): string { return (e.target as HTMLInputElement).value; }
  setBool(k: BoolKey, e: Event): void { const v = (e.target as HTMLInputElement).checked; this.f.update(s => ({ ...s, [k]: v })); }
  setNum(k: NumKey, e: Event): void { const v = Math.max(0, Number(this.val(e)) || 0); this.f.update(s => ({ ...s, [k]: v })); }
  setText(k: TextKey, e: Event): void { const v = this.val(e); this.f.update(s => ({ ...s, [k]: v })); }

  async save(): Promise<void> {
    this.saving.set(true);
    try {
      const cities = this.citiesText().split(',').map(c => c.trim()).filter(Boolean);
      await this.svc.save({ ...this.f(), phone: this.f().phone.replace(/\D/g, ''), cities });
      this.savedOk.emit();
    } finally {
      this.saving.set(false);
    }
  }

  onBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-bg')) this.closed.emit();
  }
}
