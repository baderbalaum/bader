import { Component, ChangeDetectionStrategy, inject, input, output, signal, computed, OnDestroy, OnInit } from '@angular/core';
import { AuthService, DEMO_CODE, displayPhone } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

const RESEND_SECONDS = 30;

/** Mobile number → SMS code → verified. Shows the verified number once done. */
@Component({
  selector: 'app-phone-verify',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (auth.phone(); as p) {
      <div class="done">
        <span class="ok">✓</span>
        <div class="done-text"><b dir="ltr">{{ display(p) }}</b><small>מספר מאומת</small></div>
        <button type="button" class="link" (click)="change()">החלפת מספר</button>
      </div>
    } @else if (step() === 'phone') {
      <div class="field" [class.err]="!!error()">
        <label for="pv-phone">טלפון נייד</label>
        <div class="row">
          <input id="pv-phone" type="tel" inputmode="tel" autocomplete="tel-national" dir="ltr"
                 placeholder="05X-XXXXXXX" [value]="phone()" (input)="phone.set(val($event))" (keydown.enter)="send()"/>
          <button id="pv-send" type="button" class="btn gold" [disabled]="busy()" (click)="send()">
            {{ busy() ? 'שולחים...' : 'שלחו קוד' }}
          </button>
        </div>
        <span class="hint">נשלח אליכם קוד ב-SMS. מאמתים פעם אחת בלבד.</span>
        @if (error()) { <span class="msg">{{ error() }}</span> }
      </div>
    } @else {
      <div class="field" [class.err]="!!error()">
        <label for="pv-code">הקוד שקיבלתם ב-SMS ל-<span dir="ltr">{{ phone() }}</span></label>
        <div class="row">
          <input id="pv-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" dir="ltr"
                 class="code" placeholder="••••••" [value]="code()" (input)="onCode($event)" (keydown.enter)="verify()"/>
          <button type="button" class="btn gold" [disabled]="busy() || code().length < 6" (click)="verify()">
            {{ busy() ? 'בודקים...' : 'אימות' }}
          </button>
        </div>
        @if (demo) { <span class="hint">בגרסת ההדגמה הקוד הוא {{ demoCode }}</span> }
        @if (error()) { <span class="msg">{{ error() }}</span> }
        <div class="links">
          <button type="button" class="link" (click)="step.set('phone'); error.set('')">שינוי מספר</button>
          @if (resendIn() > 0) {
            <span class="muted">שליחה חוזרת בעוד {{ resendIn() }} שנ׳</span>
          } @else {
            <button type="button" class="link" (click)="send()">שליחת קוד חוזרת</button>
          }
        </div>
      </div>
    }
    <div id="pv-recaptcha"></div>
  `,
  styles: [`
    :host { display: block; }
    .row { display: flex; gap: 8px; }
    .row input { flex: 1; min-width: 0; background: var(--dark); border: 1px solid var(--border); color: var(--text);
      padding: 11px 13px; border-radius: 10px; font: 16px 'Heebo', sans-serif; text-align: right; }
    .row input:focus { outline: none; border-color: var(--gold); }
    .row input.code { text-align: center; letter-spacing: .4em; font-weight: 900; }
    .row .btn { flex-shrink: 0; }
    .err input { border-color: var(--danger); }
    .hint, .muted { display: block; color: var(--muted); font-size: .75rem; margin-top: 6px; }
    .msg { display: block; color: #f08a8a; font-size: .8rem; margin-top: 6px; font-weight: 700; }
    .links { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
    .link { background: none; border: none; color: var(--gold); font: 700 .82rem 'Heebo', sans-serif; cursor: pointer; padding: 0; }
    .done { display: flex; align-items: center; gap: 10px; background: rgba(76,175,114,.1);
      border: 1px solid rgba(76,175,114,.35); border-radius: 12px; padding: 10px 12px; margin-bottom: 14px; }
    .ok { width: 26px; height: 26px; border-radius: 50%; background: var(--green); color: #fff;
      display: flex; align-items: center; justify-content: center; font-weight: 900; flex-shrink: 0; }
    .done-text { flex: 1; display: flex; flex-direction: column; }
    .done-text b { color: var(--cream); text-align: right; }
    .done-text small { color: var(--muted); font-size: .72rem; }
  `],
})
export class PhoneVerifyComponent implements OnInit, OnDestroy {
  protected auth = inject(AuthService);
  readonly initialPhone = input('');
  readonly verified = output<void>();

  readonly demo = environment.demo;
  readonly demoCode = DEMO_CODE;
  readonly step = signal<'phone' | 'code'>('phone');
  readonly phone = signal('');
  readonly code = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  private resendAt = signal(0);
  private now = signal(Date.now());
  readonly resendIn = computed(() => Math.max(0, Math.ceil((this.resendAt() - this.now()) / 1000)));
  private timer = setInterval(() => this.now.set(Date.now()), 1000);

  ngOnInit(): void { if (!this.phone()) this.phone.set(this.initialPhone()); }

  display = displayPhone;
  val(e: Event): string { return (e.target as HTMLInputElement).value; }

  onCode(e: Event): void {
    const digits = this.val(e).replace(/\D/g, '').slice(0, 6);
    this.code.set(digits);
    if (digits.length === 6) void this.verify();
  }

  async send(): Promise<void> {
    if (this.busy()) return;
    this.error.set('');
    this.busy.set(true);
    const res = await this.auth.sendCode(this.phone(), 'pv-recaptcha');
    this.busy.set(false);
    if (res === 'sent') {
      this.step.set('code');
      this.code.set('');
      this.resendAt.set(Date.now() + RESEND_SECONDS * 1000);
      setTimeout(() => document.getElementById('pv-code')?.focus(), 50);
    } else {
      this.error.set({
        'invalid-phone': 'מספר נייד לא תקין. הזינו מספר שמתחיל ב-05',
        'too-many': 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות',
        error: 'לא הצלחנו לשלוח SMS. בדקו את החיבור ונסו שוב',
      }[res]);
    }
  }

  async verify(): Promise<void> {
    if (this.busy() || this.code().length < 6) return;
    this.error.set('');
    this.busy.set(true);
    const res = await this.auth.verifyCode(this.code());
    this.busy.set(false);
    if (res === 'ok') { this.verified.emit(); return; }
    this.error.set({
      'bad-code': 'הקוד שגוי. בדקו את ההודעה ונסו שוב',
      expired: 'הקוד פג תוקף. בקשו קוד חדש',
      error: 'האימות נכשל. נסו שוב',
    }[res]);
  }

  async change(): Promise<void> {
    await this.auth.logout();
    this.step.set('phone');
  }

  ngOnDestroy(): void { clearInterval(this.timer); }
}
