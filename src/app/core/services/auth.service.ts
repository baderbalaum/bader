import { Injectable, inject, signal } from '@angular/core';
import {
  Auth, User, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut,
} from '@angular/fire/auth';
import { Database, ref, get, set } from '@angular/fire/database';

export type StaffLoginResult = 'ok' | 'not-staff' | 'bad-credentials' | 'error';

/**
 * Two kinds of users:
 *  - Customers get a silent anonymous account, so the database rules can let them
 *    read only the orders they placed.
 *  - Staff (kitchen, admin, kiosk) sign in with email + password and must be listed
 *    under staff/{uid}. The very first account to sign in becomes the owner.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private db = inject(Database);

  readonly user = signal<User | null | undefined>(undefined);
  private staffCache: { uid: string; staff: boolean } | null = null;

  constructor() {
    onAuthStateChanged(this.auth, u => {
      this.user.set(u);
      if (this.staffCache && this.staffCache.uid !== u?.uid) this.staffCache = null;
    });
  }

  /** Signed-in user for placing/reading an order; creates an anonymous one if needed. */
  async ensureCustomer(): Promise<User> {
    await this.auth.authStateReady();
    return this.auth.currentUser ?? (await signInAnonymously(this.auth)).user;
  }

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
    await signOut(this.auth);
  }
}
