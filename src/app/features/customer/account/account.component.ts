import { Component, ChangeDetectionStrategy, inject, signal, effect, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService, displayPhone } from '../../../core/services/auth.service';
import { CustomerService } from '../../../core/services/customer.service';
import { CustomerOrderService } from '../../../core/services/customer-order.service';
import { PhoneVerifyComponent } from '../../../shared/components/phone-verify/phone-verify.component';
import { DemoBannerComponent } from '../../../shared/components/demo-banner/demo-banner.component';

@Component({
  selector: 'app-account',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PhoneVerifyComponent, DemoBannerComponent],
  template: `
    <app-demo-banner/>
    <div class="page">
      <header class="bar">
        <a class="back" routerLink="/order" aria-label="לתפריט">→</a>
        <h1>החשבון שלי</h1>
        <span></span>
      </header>

      @if (!auth.phone()) {
        <section class="card">
          <h2>כניסה עם מספר טלפון</h2>
          <p class="sub">כדי לראות הזמנות קודמות ולקבל הטבות</p>
          <app-phone-verify (verified)="customers.load()"/>
        </section>
      } @else {
        <section class="card who">
          <div class="avatar">{{ (customers.me()?.name || '?').slice(0, 1) }}</div>
          <div>
            <b>{{ customers.me()?.name || 'לקוח/ה' }}</b>
            <span dir="ltr">{{ display(auth.phone()) }}</span>
          </div>
        </section>

        <section class="card">
          <h2>מבצעים והטבות</h2>
          <label class="toggle" for="a-consent">
            <span>לקבל מבצעים ב-SMS ובוואטסאפ</span>
            <input id="a-consent" type="checkbox" [checked]="customers.me()?.marketingConsent === true"
                   [disabled]="saving()" (change)="setConsent($any($event.target).checked)"/>
            <span class="sw" aria-hidden="true"></span>
          </label>
          @if (saved()) { <p class="saved">{{ saved() }}</p> }
        </section>

        @if (recent.length) {
          <section class="card">
            <h2>ההזמנות שלי</h2>
            @for (o of recent; track o.id) {
              <a class="order" [routerLink]="['/track', o.id]">
                <span>#{{ o.num }}</span>
                <span class="muted">{{ date(o.createdAt) }}</span>
                <b>₪{{ o.total }}</b>
                <span class="go">←</span>
              </a>
            }
          </section>
        }

        <button class="btn logout" (click)="auth.logout()">יציאה מהחשבון</button>
      }
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; background: var(--dark); }
    .page { max-width: 640px; margin: 0 auto; padding: 0 16px 40px; }
    .bar { position: sticky; top: 0; z-index: 10; display: grid; grid-template-columns: 40px 1fr 40px; align-items: center;
      margin: 0 -16px; padding: 12px 16px; background: rgba(18,11,4,.94); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border); }
    .bar h1 { text-align: center; font-size: 1.1rem; font-weight: 900; color: var(--cream); }
    .back { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
      background: var(--card); color: var(--cream); text-decoration: none; font-size: 1.2rem; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 14px; margin-top: 14px; }
    h2 { font-size: 1rem; font-weight: 900; color: var(--gold2); margin-bottom: 10px; }
    .sub { color: var(--muted); font-size: .85rem; margin: -6px 0 12px; }
    .who { display: flex; align-items: center; gap: 12px; }
    .who div { display: flex; flex-direction: column; }
    .who b { color: var(--cream); font-size: 1.05rem; }
    .who span { color: var(--muted); text-align: right; }
    .avatar { width: 48px; height: 48px; border-radius: 50%; background: var(--gold); color: var(--dark);
      display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.3rem; }
    .toggle { display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; font-weight: 700; }
    .toggle input { position: absolute; opacity: 0; width: 1px; height: 1px; }
    .sw { width: 46px; height: 26px; border-radius: 999px; background: var(--card2); position: relative; flex-shrink: 0; transition: background .15s; }
    .sw::after { content: ''; position: absolute; top: 3px; right: 3px; width: 20px; height: 20px; border-radius: 50%; background: var(--muted); transition: all .15s; }
    .toggle input:checked + .sw { background: var(--green); }
    .toggle input:checked + .sw::after { right: 23px; background: #fff; }
    .toggle input:focus-visible + .sw { outline: 2px solid var(--gold); outline-offset: 2px; }
    .saved { color: #7fdc9f; font-size: .8rem; margin-top: 8px; }
    .order { display: grid; grid-template-columns: auto 1fr auto auto; gap: 10px; align-items: center; padding: 10px 0;
      border-bottom: 1px solid var(--border); color: var(--cream); text-decoration: none; }
    .order:last-child { border-bottom: none; }
    .muted { color: var(--muted); font-size: .85rem; }
    .order b { color: var(--gold); }
    .go { color: var(--gold); }
    .logout { width: 100%; justify-content: center; margin-top: 18px; padding: 13px; }
  `],
})
export class AccountComponent {
  protected auth = inject(AuthService);
  protected customers = inject(CustomerService);
  readonly recent = inject(CustomerOrderService).recentOrders();
  readonly saving = signal(false);
  readonly saved = signal('');
  display = displayPhone;

  constructor() {
    effect(() => { if (this.auth.phone()) untracked(() => void this.customers.load().catch(() => null)); });
  }

  async setConsent(v: boolean): Promise<void> {
    this.saving.set(true);
    try {
      await this.customers.setMyConsent(v);
      this.saved.set(v ? 'נרשמתם לקבלת מבצעים ✓' : 'הוסרתם מרשימת המבצעים');
    } catch {
      this.saved.set('');
    } finally {
      this.saving.set(false);
    }
  }

  date(ts: number): string {
    return new Date(ts).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
