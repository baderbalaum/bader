import { Injectable, inject } from '@angular/core';
import { Database, ref, onValue, push, set, runTransaction } from '@angular/fire/database';
import { Order } from '../models/order.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

const DEMO_KEY = 'toroz_demo_orders';

const RECENT_KEY = 'toroz_recent_orders';

export interface RecentOrder { id: string; num: number; createdAt: number; total: number; }

/**
 * Order access for the customer app. Unlike OrderService it never listens to the
 * whole order list — a customer only ever reads the one order they placed.
 */
@Injectable({ providedIn: 'root' })
export class CustomerOrderService {
  private db = inject(Database);
  private auth = inject(AuthService);

  async placeOrder(order: Omit<Order, 'id' | 'num'>): Promise<{ id: string; num: number }> {
    if (environment.demo) return this.placeDemoOrder(order);
    const user = await this.auth.ensureCustomer();
    let num = 200;
    await runTransaction(ref(this.db, 'meta/lastOrderNum'), current => {
      num = (current ?? 200) + 1;
      return num;
    });
    const newRef = push(ref(this.db, 'todayOrders'));
    await set(newRef, stripUndefined({ ...order, num, customerUid: user.uid }));
    const id = newRef.key!;
    this.rememberOrder({ id, num, createdAt: order.createdAt, total: order.total });
    return { id, num };
  }

  /**
   * Live updates for one order. Active orders live under todayOrders and are moved to
   * doneOrders when delivered. The rules only let the customer read a path while their
   * order is actually there, so we listen to one path at a time and switch over when the
   * order leaves it. `null` means the order was cancelled, doesn't exist, or isn't theirs.
   */
  watchOrder(id: string, cb: (order: Order | null) => void): () => void {
    if (environment.demo) return this.watchDemoOrder(id, cb);
    let stopped = false;
    let off: () => void = () => {};
    const other = (p: string) => (p === 'todayOrders' ? 'doneOrders' : 'todayOrders');

    const listen = (path: string, triedOther: boolean) => {
      if (stopped) return;
      let hadData = false;
      const leave = () => {
        off();
        if (stopped) return;
        // Order moved away from here → follow it. Never found here → try the other list once.
        if (hadData) listen(other(path), false);
        else if (!triedOther) listen(other(path), true);
        else cb(null);
      };
      off = onValue(ref(this.db, `${path}/${id}`), s => {
        if (s.exists()) { hadData = true; cb({ ...(s.val() as Order), id }); }
        else leave();
      }, () => leave());
    };

    this.auth.ensureCustomer().then(() => listen('todayOrders', false)).catch(() => cb(null));
    return () => { stopped = true; off(); };
  }

  // ── Offline demo: orders live on this device and move through the statuses on a timer ──

  private demoOrders(): Record<string, Order> {
    try { return JSON.parse(localStorage.getItem(DEMO_KEY) ?? '{}') as Record<string, Order>; }
    catch { return {}; }
  }

  private placeDemoOrder(order: Omit<Order, 'id' | 'num'>): { id: string; num: number } {
    const all = this.demoOrders();
    const num = 201 + Object.keys(all).length;
    const id = 'demo' + Date.now().toString(36);
    all[id] = { ...order, id, num } as Order;
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(all)); } catch { /* storage unavailable */ }
    this.rememberOrder({ id, num, createdAt: order.createdAt, total: order.total });
    return { id, num };
  }

  private watchDemoOrder(id: string, cb: (order: Order | null) => void): () => void {
    const tick = () => {
      const o = this.demoOrders()[id];
      if (!o) { cb(null); return; }
      const sec = (Date.now() - o.createdAt) / 1000;
      const status: Order['status'] =
        sec < 8 ? 'new' : sec < 20 ? 'preparing' : sec < 30 ? 'ready'
        : sec < 45 && o.type === 'delivery' ? 'on_the_way' : sec < 45 ? 'ready' : 'done';
      cb({ ...o, status });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
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
