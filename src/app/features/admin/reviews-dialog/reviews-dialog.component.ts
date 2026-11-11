import { Component, ChangeDetectionStrategy, inject, output, signal, computed, OnDestroy } from '@angular/core';
import { ReviewService } from '../../../core/services/review.service';
import { Review } from '../../../core/models/review.model';

@Component({
  selector: 'app-reviews-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-bg" (click)="onBackdrop($event)">
      <div class="modal">
        <div class="head">
          <h2>⭐ דירוגים מלקוחות</h2>
          <button class="x" (click)="closed.emit()" aria-label="סגור">×</button>
        </div>

        <div class="summary">
          <div class="avg"><b>{{ avg() || '—' }}</b><span>ממוצע</span></div>
          <div class="avg"><b>{{ reviews().length }}</b><span>דירוגים</span></div>
          <div class="bars">
            @for (n of [5, 4, 3, 2, 1]; track n) {
              <div class="bar-row">
                <span>{{ n }}★</span>
                <div class="bar"><div class="fill" [style.width.%]="pct(n)"></div></div>
                <span class="c">{{ countOf(n) }}</span>
              </div>
            }
          </div>
        </div>

        <div class="filters">
          <button [class.on]="filter() === 0" (click)="filter.set(0)">הכל</button>
          <button [class.on]="filter() === -1" (click)="filter.set(-1)">עם הערות</button>
          <button [class.on]="filter() === -2" (click)="filter.set(-2)">1–3 כוכבים</button>
        </div>

        <div class="body">
          @if (loading()) { <p class="muted">טוען...</p> }
          @for (r of visible(); track r.orderId) {
            <div class="rev" [class.low]="r.stars <= 3">
              <div class="rev-top">
                <span class="stars">{{ '★'.repeat(r.stars) }}<span class="off">{{ '★'.repeat(5 - r.stars) }}</span></span>
                <span class="muted">#{{ r.num }} · {{ r.name || 'לקוח' }} · {{ date(r.createdAt) }}</span>
              </div>
              @if (r.comment) { <p>{{ r.comment }}</p> }
            </div>
          } @empty {
            @if (!loading()) { <p class="muted">אין עדיין דירוגים</p> }
          }
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
    .summary { display: flex; gap: 18px; align-items: center; padding: 14px 18px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
    .avg { display: flex; flex-direction: column; align-items: center; b { font-size: 1.8rem; font-weight: 900; color: var(--gold2); } span { color: var(--muted); font-size: .75rem; } }
    .bars { flex: 1; min-width: 200px; }
    .bar-row { display: flex; align-items: center; gap: 8px; font-size: .75rem; color: var(--muted); }
    .bar { flex: 1; height: 7px; background: var(--dark); border-radius: 99px; overflow: hidden; }
    .fill { height: 100%; background: var(--gold); }
    .c { min-width: 24px; text-align: left; }
    .filters { display: flex; gap: 6px; padding: 10px 18px; }
    .filters button { background: var(--dark); color: var(--cream); border: 1px solid var(--border); border-radius: 999px; padding: 6px 12px; font: 700 .8rem 'Heebo', sans-serif; cursor: pointer; }
    .filters button.on { background: var(--gold); color: var(--dark); border-color: var(--gold); }
    .body { padding: 6px 18px 16px; overflow-y: auto; }
    .rev { border-bottom: 1px solid var(--border); padding: 10px 0; }
    .rev.low { border-inline-start: 3px solid var(--danger); padding-inline-start: 10px; }
    .rev-top { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .stars { color: var(--gold); letter-spacing: 2px; .off { color: var(--card2); } }
    .rev p { margin-top: 6px; font-size: .9rem; }
    .muted { color: var(--muted); font-size: .78rem; }
  `],
})
export class ReviewsDialogComponent implements OnDestroy {
  private svc = inject(ReviewService);
  readonly closed = output<void>();

  readonly reviews = signal<Review[]>([]);
  readonly loading = signal(true);
  /** 0 = all, -1 = with comment, -2 = low ratings */
  readonly filter = signal(0);

  readonly avg = computed(() => {
    const r = this.reviews();
    return r.length ? Math.round((r.reduce((s, x) => s + x.stars, 0) / r.length) * 10) / 10 : 0;
  });

  readonly visible = computed(() => {
    const f = this.filter();
    const r = this.reviews();
    if (f === -1) return r.filter(x => x.comment);
    if (f === -2) return r.filter(x => x.stars <= 3);
    return r;
  });

  private off = this.svc.watchLatest(list => { this.reviews.set(list); this.loading.set(false); });

  countOf(n: number): number { return this.reviews().filter(r => r.stars === n).length; }
  pct(n: number): number { const t = this.reviews().length; return t ? (this.countOf(n) / t) * 100 : 0; }
  date(ts: number): string { return new Date(ts).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }); }

  onBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-bg')) this.closed.emit();
  }

  ngOnDestroy(): void { this.off(); }
}
