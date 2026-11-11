import { Component, ChangeDetectionStrategy, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <form class="card" (submit)="$event.preventDefault(); submit()">
        <img src="Toroz.jpg" alt="" class="logo"/>
        <h1>כניסת צוות</h1>
        <p class="sub">מטבח · ניהול · קיוסק</p>

        <div class="field">
          <label for="l-email">אימייל</label>
          <input id="l-email" type="email" dir="ltr" autocomplete="username" [value]="email()" (input)="email.set(val($event))"/>
        </div>
        <div class="field">
          <label for="l-pass">סיסמה</label>
          <input id="l-pass" type="password" dir="ltr" autocomplete="current-password" [value]="password()" (input)="password.set(val($event))"/>
        </div>

        @if (message()) { <div class="msg">{{ message() }}</div> }
        @if (notStaffUid()) {
          <div class="uid">מזהה החשבון (לשליחה לבעל המסעדה):<code>{{ notStaffUid() }}</code></div>
        }

        <button class="btn gold go" type="submit" [disabled]="busy()">{{ busy() ? 'מתחברים...' : 'כניסה' }}</button>
      </form>
    </div>
  `,
  styles: [`
    .wrap { min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 16px;
      background: radial-gradient(100% 70% at 50% 0%, rgba(200,150,46,.2), transparent 60%), var(--dark); }
    .card { width: min(380px, 100%); background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 24px; text-align: center; }
    .logo { width: 72px; height: 72px; border-radius: 50%; border: 2px solid var(--gold); object-fit: cover; }
    h1 { margin-top: 10px; font-size: 1.4rem; font-weight: 900; color: var(--gold2); }
    .sub { color: var(--muted); font-size: .85rem; margin-bottom: 18px; }
    .field { text-align: start; }
    .field input { width: 100%; background: var(--dark); border: 1px solid var(--border); color: var(--text); padding: 12px 13px; border-radius: 10px; font: 16px 'Heebo', sans-serif; }
    .field input:focus { outline: none; border-color: var(--gold); }
    .msg { color: #f08a8a; font-size: .85rem; margin: 4px 0 10px; font-weight: 700; }
    .uid { color: var(--muted); font-size: .75rem; margin-bottom: 10px; }
    .uid code { display: block; margin-top: 4px; color: var(--cream); direction: ltr; word-break: break-all; user-select: all; }
    .go { width: 100%; justify-content: center; padding: 13px; font-size: 1rem; margin-top: 6px; }
  `],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly next = input<string>('/kitchen');
  readonly email = signal('');
  readonly password = signal('');
  readonly busy = signal(false);
  readonly message = signal('');
  readonly notStaffUid = signal('');

  val(e: Event): string { return (e.target as HTMLInputElement).value; }

  async submit(): Promise<void> {
    if (this.busy()) return;
    this.message.set(''); this.notStaffUid.set('');
    this.busy.set(true);
    const res = await this.auth.staffLogin(this.email(), this.password());
    this.busy.set(false);
    switch (res) {
      case 'ok':
        this.router.navigateByUrl(this.next() || '/kitchen');
        break;
      case 'bad-credentials':
        this.message.set('אימייל או סיסמה שגויים');
        break;
      case 'not-staff':
        this.message.set('החשבון הזה לא מורשה. בעל המסעדה צריך להוסיף אותו.');
        this.notStaffUid.set(this.auth.uid());
        break;
      default:
        this.message.set('שגיאת חיבור. נסו שוב.');
    }
  }
}
