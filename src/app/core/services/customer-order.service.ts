import { Injectable, inject } from '@angular/core';
import { Database, ref, onValue, push, set, runTransaction } from '@angular/fire/database';
import { Order } from '../models/order.model';

const RECENT_KEY = 'toroz_recent_orders';

export interface RecentOrder { id: string; num: number; createdAt: number; total: number; }

/**
 * Order access for the customer app. Unlike OrderService it never listens to the
 * whole order list — a customer only ever reads the one order they placed.
 */
@Injectable({ providedIn: 'root' })
export class CustomerOrderService {
  private db = inject(Database);

  async placeOrder(order: Omit<Order, 'id' | 'num'>): Promise<{ id: string; num: number }> {
    let num = 200;
    await runTransaction(ref(this.db, 'meta/lastOrderNum'), current => {
      num = (current ?? 200) + 1;
      return num;
    });
    const newRef = push(ref(this.db, 'todayOrders'));
    await set(newRef, stripUndefined({ ...order, num }));
    const id = newRef.key!;
    this.rememberOrder({ id, num, createdAt: order.createdAt, total: order.total });
    return { id, num };
  }

  /**
   * Live updates for one order. Active orders live under todayOrders, finished ones
   * are moved to doneOrders; `null` means the order was cancelled or doesn't exist.
   */
  watchOrder(id: string, cb: (order: Order | null) => void): () => void {
    let active: Order | null | undefined;
    let done: Order | null | undefined;
    const emit = () => {
      if (active === undefined || done === undefined) return;
      cb(active ?? done ?? null);
    };
    const offActive = onValue(ref(this.db, `todayOrders/${id}`), s => {
      active = s.exists() ? { ...(s.val() as Order), id } : null;
      emit();
    });
    const offDone = onValue(ref(this.db, `doneOrders/${id}`), s => {
      done = s.exists() ? { ...(s.val() as Order), id } : null;
      emit();
    });
    return () => { offActive(); offDone(); };
  }

  recentOrders(): RecentOrder[] {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as RecentOrder[]; }
    catch { return []; }
  }

  private rememberOrder(o: RecentOrder): void {
    const list = [o, ...this.recentOrders().filter(r => r.id !== o.id)].slice(0, 10);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
  }
}

function stripUndefined(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, stripUndefined(v)])
    );
  }
  return obj;
}
