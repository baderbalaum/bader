import { Injectable, inject, signal, effect, OnDestroy } from '@angular/core';
import { Database, ref, onValue, push, update, remove, set, runTransaction } from '@angular/fire/database';
import { Order, OrderStatus } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService implements OnDestroy {
  private db = inject(Database);

  readonly todayOrders = signal<Order[]>([]);
  readonly doneOrders = signal<Order[]>([]);

  private unsubscribeToday: (() => void) | null = null;
  private unsubscribeDone: (() => void) | null = null;

  constructor() {
    this.startListeners();
  }

  private startListeners(): void {
    this.unsubscribeToday = onValue(ref(this.db, 'todayOrders'), snap => {
      if (!snap.exists()) { this.todayOrders.set([]); return; }
      const raw = snap.val() as Record<string, Omit<Order, 'id'>>;
      const orders = Object.entries(raw).map(([id, data]) => ({ ...data, id }));
      orders.sort((a, b) => a.createdAt - b.createdAt);
      this.todayOrders.set(orders);
    });

    this.unsubscribeDone = onValue(ref(this.db, 'doneOrders'), snap => {
      if (!snap.exists()) { this.doneOrders.set([]); return; }
      const raw = snap.val() as Record<string, Omit<Order, 'id'>>;
      const orders = Object.entries(raw).map(([id, data]) => ({ ...data, id }));
      orders.sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt));
      this.doneOrders.set(orders);
    });
  }

  async getNextOrderNum(): Promise<number> {
    const metaRef = ref(this.db, 'meta/lastOrderNum');
    let num = 200;
    await runTransaction(metaRef, current => {
      num = (current ?? 200) + 1;
      return num;
    });
    return num;
  }

  async addOrder(order: Omit<Order, 'id'>): Promise<string> {
    const newRef = push(ref(this.db, 'todayOrders'));
    await set(newRef, stripUndefined(order));
    return newRef.key!;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    if (status === 'done') {
      await this.moveToDone(id);
      return;
    }
    const isDone = this.doneOrders().some(o => o.id === id);
    if (isDone) {
      await this.moveToActive(id, status);
      return;
    }
    await update(ref(this.db, `todayOrders/${id}`), { status, updatedAt: Date.now() });
  }

  private async moveToActive(id: string, status: OrderStatus): Promise<void> {
    const order = this.doneOrders().find(o => o.id === id);
    if (!order) return;
    const { id: _, ...data } = order;
    await set(ref(this.db, `todayOrders/${id}`), stripUndefined({ ...data, status, updatedAt: Date.now() }));
    await remove(ref(this.db, `doneOrders/${id}`));
  }

  async toggleLineDone(id: string, idx: number, value: boolean): Promise<void> {
    await update(ref(this.db, `todayOrders/${id}/lineDone`), { [idx]: value });
  }

  async cancelOrder(id: string): Promise<void> {
    await remove(ref(this.db, `todayOrders/${id}`));
  }

  private async moveToDone(id: string): Promise<void> {
    const order = this.todayOrders().find(o => o.id === id);
    if (!order) return;
    const { id: _, ...data } = order;
    await set(ref(this.db, `doneOrders/${id}`), { ...data, status: 'done', updatedAt: Date.now() });
    await remove(ref(this.db, `todayOrders/${id}`));
  }

  ngOnDestroy(): void {
    this.unsubscribeToday?.();
    this.unsubscribeDone?.();
  }
}

// Firebase rejects undefined values — remove them recursively before any write
function stripUndefined(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)])
    );
  }
  return obj;
}
