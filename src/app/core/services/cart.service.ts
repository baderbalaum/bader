import { Injectable, computed, effect, signal } from '@angular/core';
import { CartItem, DeliveryAddress } from '../models/order.model';

const CART_KEY = 'toroz_cart';
const PROFILE_KEY = 'toroz_customer';

export type FulfillmentMode = 'delivery' | 'pickup';

export interface CustomerProfile {
  name: string;
  phone: string;
  address: DeliveryAddress;
}

const EMPTY_PROFILE: CustomerProfile = { name: '', phone: '', address: { city: '', street: '' } };

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch { return fallback; }
}

/** Cart + remembered customer details for the customer app, persisted on the device. */
@Injectable({ providedIn: 'root' })
export class CartService {
  readonly items = signal<CartItem[]>(load<{ items: CartItem[] }>(CART_KEY, { items: [] }).items);
  readonly mode = signal<FulfillmentMode>(load<{ mode: FulfillmentMode }>(CART_KEY, { mode: 'delivery' }).mode);
  readonly profile = signal<CustomerProfile>(load(PROFILE_KEY, EMPTY_PROFILE));

  readonly count = computed(() => this.items().reduce((s, i) => s + i.qty, 0));
  readonly subtotal = computed(() => this.items().reduce((s, i) => s + i.unitPrice * i.qty, 0));

  constructor() {
    effect(() => {
      const data = { items: this.items(), mode: this.mode() };
      try { localStorage.setItem(CART_KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
    });
  }

  add(item: CartItem): void { this.items.update(c => [...c, item]); }
  remove(id: number): void { this.items.update(c => c.filter(i => i.id !== id)); }
  changeQty(id: number, d: number): void {
    this.items.update(c => c.flatMap(i => (i.id !== id ? [i] : i.qty + d <= 0 ? [] : [{ ...i, qty: i.qty + d }])));
  }
  clear(): void { this.items.set([]); }

  saveProfile(p: CustomerProfile): void {
    this.profile.set(p);
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch { /* storage unavailable */ }
  }
}
