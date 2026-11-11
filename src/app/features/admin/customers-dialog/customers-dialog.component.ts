import { Component, ChangeDetectionStrategy, inject, output, signal, computed, OnDestroy } from '@angular/core';
import { CustomerService } from '../../../core/services/customer.service';
import { CustomerRow } from '../../../core/models/customer.model';
import { displayPhone } from '../../../core/services/auth.service';

const DEFAULT_PROMO = 'פרסומת: טורוז מיט 🐂\nרק השבוע: ...\nלהזמנה: \nלהסרה מרשימת התפוצה השיבו "הסר"';

@Component({
  selector: 'app-customers-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-bg" (click)="onBackdrop($event)">
      <div class="modal">
        <div class="head">
          <h2>👥 לקוחות ומבצעים</h2>
          <button class="x" (click)="closed.emit()" aria-label="סגור">×</button>
        </div>

        <div class="stats">
          <div><b>{{ rows().length }}</b><span>לקוחות רשומים</span></div>
          <div><b>{{ optedIn().length }}</b><span>מסכימים למבצעים</span></div>
          <div><b>{{ repeat() }}</b><span>הזמינו יותר מפעם אחת</span></div>
        </div>

        <div class="promo">
          <label for="promo-text">הודעת מבצע (נשלחת רק למי שהסכים)</label>
          <textarea id="promo-text" rows="4" [value]="promo()" (input)="promo.set($any($event.target).value)"></textarea>
          <p class="law">חובה לפי החוק: המילה "פרסומת" בתחילת ההודעה ודרך להסרה. מי שמשיב "הסר" – כבו לו את המתג ברשימה.</p>
          <div class="actions">
            <button class="btn gold" (click)="copyNumbers()">📋 העתקת {{ optedIn().length }} מספרים</button>
            <button class="btn" (click)="exportCsv()">⬇ ייצוא לאקסל</button>
          </div>
          @if (note()) { <p class="note">{{ note() }}</p> }
        </div>

        <div class="filters">
          <button [class.on]="filter() === 'all'" (click)="filter.set('all')">כולם</button>
          <button [class.on]="filter() === 'in'" (click)="filter.set('in')">מסכימים למבצעים</button>
        </div>

        <div class="body">
          @if (loading()) { <p class="muted">טוען...</p> }
          @for (c of visible(); track c.uid) {
            <div class="row">
              <div class="who">
                <b>{{ c.name || 'ללא שם' }}</b>
                <span class="muted" dir="ltr">{{ display(c.phone) }}</span>
              </div>
              <div class="muted small">{{ c.ordersCount ?? 0 }} הזמנות · אחרונה {{ date(c.lastOrderAt ?? c.createdAt) }}</div>
              <label class="consent" [title]="c.marketingConsent ? 'מסכים למבצעים' : 'לא מסכים'">
                <input type="checkbox" [checked]="c.marketingConsent" (change)="toggle(c, $any($event.target).checked)"/>
                <span>מבצעים</span>
              </label>
              @if (c.marketingConsent) {
                <a class="wa" [href]="waLink(c)" target="_blank" rel="noopener">שליחה בוואטסאפ</a>
              } @else {
                <span class="wa off">לא הסכים</span>
              }
            </div>
          } @empty {
            @if (!loading()) { <p class="muted">עדיין אין לקוחות רשומים</p> }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 90; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(4px); }
    .modal { background: var(--card); border: 1px solid var(--border); border-radius: 18px; width: min(760px, 100%); max-height: 92vh; display: flex; flex-direction: column; }
    .head { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid var(--border); }
    h2 { font-size: 1.1rem; font-weight: 900; color: var(--gold); }
    .x { background: none; border: none; color: var(--muted); font-size: 1.6rem; cursor: pointer; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 12px 18px; border-bottom: 1px solid var(--border); }
    .stats div { display: flex; flex-direction: column; align-items: center; }
    .stats b { font-size: 1.5rem; font-weight: 900; color: var(--gold2); }
    .stats span { color: var(--muted); font-size: .72rem; text-align: center; }
    .promo { padding: 12px 18px; border-bottom: 1px solid var(--border); }
    .promo label { display: block; color: var(--muted); font-size: .78rem; font-weight: 700; margin-bottom: 6px; }
    .promo textarea { width: 100%; background: var(--dark); border: 1px solid var(--border); color: var(--text); border-radius: 10px; padding: 10px 12px; font: .9rem 'Heebo', sans-serif; resize: vertical; }
    .law { color: var(--amber); font-size: .72rem; margin-top: 6px; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
    .note { color: #7fdc9f; font-size: .8rem; margin-top: 8px; }
    .filters { display: flex; gap: 6px; padding: 10px 18px 0; }
    .filters button { background: var(--dark); color: var(--cream); border: 1px solid var(--border); border-radius: 999px; padding: 6px 12px; font: 700 .8rem 'Heebo', sans-serif; cursor: pointer; }
    .filters button.on { background: var(--gold); color: var(--dark); border-color: var(--gold); }
    .body { padding: 6px 18px 16px; overflow-y: auto; }
    .row { display: grid; grid-template-columns: 1.2fr 1.4fr auto auto; gap: 10px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); }
    .who { display: flex; flex-direction: column; min-width: 0; }
    .who .muted { text-align: right; }
    .muted { color: var(--muted); font-size: .8rem; }
    .small { font-size: .74rem; }
    .consent { display: flex; align-items: center; gap: 4px; font-size: .75rem; color: var(--muted); cursor: pointer; }
    .consent input { accent-color: var(--green); width: 16px; height: 16px; }
    .wa { background: #25D366; color: #062b14; text-decoration: none; font-size: .72rem; font-weight: 900; padding: 5px 10px; border-radius: 999px; white-space: nowrap; }
    .wa.off { background: var(--dark); color: var(--muted); font-weight: 500; }
    @media (max-width: 560px) { .row { grid-template-columns: 1fr auto; } .small { grid-column: 1 / -1; } }
  `],
})
export class CustomersDialogComponent implements OnDestroy {
  private svc = inject(CustomerService);
  readonly closed = output<void>();

  readonly rows = signal<CustomerRow[]>([]);
  readonly loading = signal(true);
  readonly filter = signal<'all' | 'in'>('all');
  readonly promo = signal(DEFAULT_PROMO);
  readonly note = signal('');

  readonly optedIn = computed(() => this.rows().filter(r => r.marketingConsent));
  readonly repeat = computed(() => this.rows().filter(r => (r.ordersCount ?? 0) > 1).length);
  readonly visible = computed(() => (this.filter() === 'in' ? this.optedIn() : this.rows()));

  private off = this.svc.watchAll(r => { this.rows.set(r); this.loading.set(false); });
  display = displayPhone;

  waLink(c: CustomerRow): string {
    return `https://wa.me/${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(this.promo())}`;
  }

  async toggle(c: CustomerRow, v: boolean): Promise<void> {
    await this.svc.staffSetConsent(c.uid, v);
    this.note.set(v ? `${c.name || c.phone} נוסף/ה לרשימת המבצעים` : `${c.name || c.phone} הוסר/ה מרשימת המבצעים`);
  }

  async copyNumbers(): Promise<void> {
    const text = this.optedIn().map(r => displayPhone(r.phone)).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      this.note.set(`הועתקו ${this.optedIn().length} מספרים. אפשר להדביק ברשימת תפוצה בוואטסאפ ביזנס או בשירות SMS.`);
    } catch {
      this.note.set('ההעתקה נחסמה בדפדפן. השתמשו בייצוא לאקסל.');
    }
  }

  exportCsv(): void {
    const head = ['שם', 'טלפון', 'הסכמה למבצעים', 'מספר הזמנות', 'הזמנה אחרונה'];
    const lines = this.rows().map(r => [
      r.name, displayPhone(r.phone), r.marketingConsent ? 'כן' : 'לא', String(r.ordersCount ?? 0),
      new Date(r.lastOrderAt ?? r.createdAt).toLocaleDateString('he-IL'),
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    // BOM so Excel opens Hebrew correctly.
    const blob = new Blob(['﻿' + [head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `toroz-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  date(ts: number): string { return new Date(ts).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }); }

  onBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-bg')) this.closed.emit();
  }

  ngOnDestroy(): void { this.off(); }
}
