import { Injectable, inject, signal } from '@angular/core';
import {
  Auth, User, ConfirmationResult, RecaptchaVerifier,
  onAuthStateChanged, signInWithEmailAndPassword, signInWithPhoneNumber, signOut,
} from '@angular/fire/auth';
import { Database, ref, get, set } from '@angular/fire/database';
import { environment } from '../../../environments/environment';

export type StaffLoginResult = 'ok' | 'not-staff' | 'bad-credentials' | 'error';
export type SendCodeResult = 'sent' | 'invalid-phone' | 'too-many' | 'error';
export type VerifyCodeResult = 'ok' | 'bad-code' | 'expired' | 'error';

const DEMO_PHONE_KEY = 'toroz_demo_phone';
/** The demo build accepts this code instead of sending an SMS. */
export const DEMO_CODE = '123456';

/** 050-1234567 / 0501234567 → +972501234567. Returns '' for anything that isn't an Israeli mobile. */
export function toE164(local: string): string {
  const d = local.replace(/\D/g, '');
  if (/^05\d{8}$/.test(d)) return '+972' + d.slice(1);
  if (/^9725\d{8}$/.test(d)) return '+' + d;
  return '';
}

/** +972501234567 → 050-1234567 */
export function displayPhone(e164: string): string {
  const d = e164.replace(/\D/g, '');
  const local = d.startsWith('972') ? '0' + d.slice(3) : d;
  return local.length === 10 ? `${local.slice(0, 3)}-${local.slice(3)}` : local;
}

/**
 * Two kinds of users:
 *  - Customers verify their mobile number with an SMS code (once per device). The
 *    database rules use that account so a customer reads only their own orders.
 *  - Staff (kitchen, admin, kiosk) sign in with email + password and must be listed
 *    under staff/{uid}. The very first account to sign in becomes the owner.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private db = inject(Database);

  readonly user = signal<User | null | undefined>(undefined);
  /** Verified customer phone in +972 format, '' when not signed in with a phone. */
  readonly phone = signal('');
  private staffCache: { uid: string; staff: boolean } | null = null;
  private recaptcha: RecaptchaVerifier | null = null;
  private confirmation: ConfirmationResult | null = null;

  constructor() {
    if (environment.demo) {
      this.phone.set(readDemoPhone());
      return;
    }
    if (environment.useEmulators) this.auth.settings.appVerificationDisabledForTesting = true;
    onAuthStateChanged(this.auth, u => {
      this.user.set(u);
      this.phone.set(u?.phoneNumber ?? '');
      if (this.staffCache && this.staffCache.uid !== u?.uid) this.staffCache = null;
    });
  }

  /** The signed-in customer (verified phone), or null. */
  async customer(): Promise<User | null> {
    if (environment.demo) return null;
    await this.auth.authStateReady();
    const u = this.auth.currentUser;
    return u?.phoneNumber ? u : null;
  }

  /** Customer id for database paths; in the demo build a stable fake id. */
  async customerUid(): Promise<string> {
    if (environment.demo) return this.phone() ? 'demo-' + this.phone().slice(-4) : '';
    return (await this.customer())?.uid ?? '';
  }

  /**
   * Sends the SMS code. `containerId` is an element the invisible reCAPTCHA can attach
   * to (Firebase uses it to stop bots from sending SMS on your bill).
   */
  async sendCode(localPhone: string, containerId: string): Promise<SendCodeResult> {
    const e164 = toE164(localPhone);
    if (!e164) return 'invalid-phone';
    if (environment.demo) { this.pendingDemoPhone = e164; return 'sent'; }
    try {
      this.recaptcha ??= new RecaptchaVerifier(this.auth, containerId, { size: 'invisible' });
      this.confirmation = await signInWithPhoneNumber(this.auth, e164, this.recaptcha);
      return 'sent';
    } catch (e: unknown) {
      this.recaptcha?.clear();
      this.recaptcha = null;
      const code = (e as { code?: string }).code ?? '';
      if (code.includes('invalid-phone')) return 'invalid-phone';
      if (code.includes('too-many-requests') || code.includes('quota')) return 'too-many';
      return 'error';
    }
  }

  async verifyCode(code: string): Promise<VerifyCodeResult> {
    const c = code.replace(/\D/g, '');
    if (environment.demo) {
      if (c !== DEMO_CODE || !this.pendingDemoPhone) return 'bad-code';
      try { localStorage.setItem(DEMO_PHONE_KEY, this.pendingDemoPhone); } catch { /* storage unavailable */ }
      this.phone.set(this.pendingDemoPhone);
      return 'ok';
    }
    if (!this.confirmation) return 'expired';
    try {
      await this.confirmation.confirm(c);
      this.confirmation = null;
      return 'ok';
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? '';
      if (code.includes('invalid-verification-code')) return 'bad-code';
      if (code.includes('code-expired') || code.includes('session-expired')) return 'expired';
      return 'error';
    }
  }

  private pendingDemoPhone = '';

  async isStaff(): Promise<boolean> {
    await this.auth.authStateReady();
    const u = this.auth.currentUser;
    if (!u || u.isAnonymous) return false;
    if (this.staffCache?.uid === u.uid) return this.staffCache.staff;
    let staff = false;
    try {
      staff = (await get(ref(this.db, `staff/${u.uid}`))).val() === true;
    } catch { staff = false; }
    this.staffCache = { uid: u.uid, staff };
    return staff;
  }

  async staffLogin(email: string, password: string): Promise<StaffLoginResult> {
    try {
      await signInWithEmailAndPassword(this.auth, email.trim(), password);
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? '';
      return /invalid-credential|wrong-password|user-not-found|invalid-email/.test(code) ? 'bad-credentials' : 'error';
    }
    this.staffCache = null;
    if (await this.isStaff()) return 'ok';
    // Bootstrap: the rules only allow this write while no staff exist yet.
    try {
      await set(ref(this.db, `staff/${this.auth.currentUser!.uid}`), true);
      this.staffCache = null;
      return (await this.isStaff()) ? 'ok' : 'not-staff';
    } catch {
      return 'not-staff';
    }
  }

  uid(): string { return this.auth.currentUser?.uid ?? ''; }

  async logout(): Promise<void> {
    this.staffCache = null;
    if (environment.demo) {
      try { localStorage.removeItem(DEMO_PHONE_KEY); } catch { /* storage unavailable */ }
      this.phone.set('');
      return;
    }
    await signOut(this.auth);
  }
}

function readDemoPhone(): string {
  try { return localStorage.getItem(DEMO_PHONE_KEY) ?? ''; } catch { return ''; }
}
