import { Injectable, inject, signal } from '@angular/core';
import { Database, ref, get, update, onValue, increment } from '@angular/fire/database';
import { AuthService } from './auth.service';
import { CustomerRecord, CustomerRow } from '../models/customer.model';
import { DeliveryAddress } from '../models/order.model';
import { environment } from '../../../environments/environment';

const DEMO_KEY = 'toroz_demo_customer';

/** The signed-in customer's profile (customers/{uid}) plus the staff view of all customers. */
@Injectable({ providedIn: 'root' })
export class CustomerService {
  private db = inject(Database);
  private auth = inject(AuthService);

  readonly me = signal<CustomerRecord | null>(null);

  async load(): Promise<CustomerRecord | null> {
    const uid = await this.auth.customerUid();
    if (!uid) { this.me.set(null); return null; }
    let rec: CustomerRecord | null = null;
    if (environment.demo) {
      try { rec = JSON.parse(localStorage.getItem(DEMO_KEY) ?? 'null') as CustomerRecord | null; } catch { rec = null; }
    } else {
      const snap = await get(ref(this.db, `customers/${uid}`));
      rec = snap.exists() ? (snap.val() as CustomerRecord) : null;
    }
    this.me.set(rec);
    return rec;
  }

  /** Called after each order: keeps name/address current and counts orders. */
  async recordOrder(name: string, address: DeliveryAddress | undefined, consent: boolean | null): Promise<void> {
    const uid = await this.auth.customerUid();
    if (!uid) return;
    const prev = this.me() ?? (await this.load());
    const now = Date.now();
    const patch: Partial<CustomerRecord> = {
      phone: this.auth.phone(), name, lastOrderAt: now,
      ...(address ? { address } : {}),
      ...(prev ? {} : { createdAt: now, marketingConsent: false }),
      ...(consent !== null ? { marketingConsent: consent, consentAt: now } : {}),
    };
    if (environment.demo) {
      const next = { ...(prev ?? {}), ...patch, ordersCount: (prev?.ordersCount ?? 0) + 1 } as CustomerRecord;
      try { localStorage.setItem(DEMO_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      this.me.set(next);
      return;
    }
    await update(ref(this.db, `customers/${uid}`), { ...clean(patch), ordersCount: increment(1) });
    await this.load();
  }

  async setMyConsent(value: boolean): Promise<void> {
    const uid = await this.auth.customerUid();
    if (!uid) return;
    const patch = { marketingConsent: value, consentAt: Date.now() };
    if (environment.demo) {
      const next = { ...(this.me() ?? { phone: this.auth.phone(), name: '', createdAt: Date.now() }), ...patch } as CustomerRecord;
      try { localStorage.setItem(DEMO_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      this.me.set(next);
      return;
    }
    await update(ref(this.db, `customers/${uid}`), { ...patch, phone: this.auth.phone(), ...(this.me() ? {} : { createdAt: Date.now(), name: '' }) });
    await this.load();
  }

  // ── Staff ──

  watchAll(cb: (rows: CustomerRow[]) => void): () => void {
    return onValue(ref(this.db, 'customers'), s => {
      const raw = (s.val() ?? {}) as Record<string, CustomerRecord>;
      cb(Object.entries(raw).map(([uid, c]) => ({ ...c, uid }))
        .sort((a, b) => (b.lastOrderAt ?? b.createdAt) - (a.lastOrderAt ?? a.createdAt)));
    });
  }

  /** For when a customer replies "הסר" to a promotion. */
  async staffSetConsent(uid: string, value: boolean): Promise<void> {
    await update(ref(this.db, `customers/${uid}`), { marketingConsent: value, consentAt: Date.now() });
  }
}

/** Firebase rejects undefined anywhere in the value, nested objects included. */
function clean<T>(o: T): T {
  if (o === null || typeof o !== 'object' || Array.isArray(o)) return o;
  return Object.fromEntries(
    Object.entries(o as Record<string, unknown>).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, clean(v)]),
  ) as T;
}
