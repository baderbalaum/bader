import {
  Component, ChangeDetectionStrategy, inject, signal, computed,
  OnInit, OnDestroy, viewChild,
} from '@angular/core';
import { OrderService } from '../../core/services/order.service';
import { Order, OrderStatus } from '../../core/models/order.model';
import { BrandMarkComponent } from '../../shared/components/brand-mark/brand-mark.component';
import { ToastComponent } from '../../shared/components/toast/toast.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

type FilterType = 'active' | 'new' | 'preparing' | 'ready' | 'done';

@Component({
  selector: 'app-kitchen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrandMarkComponent, ToastComponent, ConfirmDialogComponent],
  templateUrl: './kitchen.component.html',
  styleUrl: './kitchen.component.scss',
})
export class KitchenComponent implements OnInit, OnDestroy {
  private orderSvc = inject(OrderService);

  private toast = viewChild.required<ToastComponent>('toast');
  private confirm = viewChild.required<ConfirmDialogComponent>('confirm');

  readonly filter = signal<FilterType>('active');
  readonly clock = signal('');
  readonly soundOn = signal(localStorage.getItem('toroz_kitchen_sound') !== '0');

  readonly counts = computed(() => {
    const orders = this.orderSvc.todayOrders();
    const n = (s: OrderStatus) => orders.filter(o => o.status === s).length;
    return {
      new: n('new'), preparing: n('preparing'), ready: n('ready'),
      done: this.orderSvc.doneOrders().length,
      get active() { return this.new + this.preparing + this.ready; },
    };
  });

  readonly visibleOrders = computed(() => {
    const f = this.filter();
    if (f === 'done') return this.orderSvc.doneOrders();
    const orders = this.orderSvc.todayOrders();
    const list = f === 'active' ? orders : orders.filter(o => o.status === f);
    const rank: Record<OrderStatus, number> = { new: 0, preparing: 1, ready: 2, done: 3 };
    return [...list].sort((a, b) => rank[a.status] - rank[b.status] || a.createdAt - b.createdAt);
  });

  private clockInterval: ReturnType<typeof setInterval> | null = null;
  private watchInterval: ReturnType<typeof setInterval> | null = null;
  private titleTimer: ReturnType<typeof setInterval> | null = null;
  private knownIds = new Set<string>();
  private audioCtx: AudioContext | null = null;

  ngOnInit(): void {
    this.tickClock();
    this.clockInterval = setInterval(() => this.tickClock(), 1000);

    this.watchInterval = setInterval(() => {
      const current = this.orderSvc.todayOrders();
      const newIds = current.map(o => o.id).filter(id => !this.knownIds.has(id));
      if (newIds.length) {
        newIds.forEach(id => this.knownIds.add(id));
        this.ding();
        this.flashTitle();
      }
      current.forEach(o => this.knownIds.add(o.id));
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.watchInterval) clearInterval(this.watchInterval);
    if (this.titleTimer) clearInterval(this.titleTimer);
  }

  private tickClock(): void {
    this.clock.set(new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }

  setFilter(f: FilterType): void { this.filter.set(f); }

  async setStatus(order: Order, status: OrderStatus): Promise<void> {
    await this.orderSvc.updateStatus(order.id, status);
    const msgs: Partial<Record<OrderStatus, string>> = { preparing: 'התחלת הכנה', ready: 'ההזמנה מוכנה', done: 'ההזמנה נמסרה' };
    this.toast().show(msgs[status] ?? 'עודכן', 'success');
  }

  async toggleLine(order: Order, idx: number): Promise<void> {
    await this.orderSvc.toggleLineDone(order.id, idx, !(order.lineDone?.[idx] ?? false));
  }

  cancelOrder(order: Order): void {
    this.confirm().ask(`לבטל את הזמנה #${order.num}?`, async () => {
      await this.orderSvc.cancelOrder(order.id);
      this.toast().show('ההזמנה בוטלה', 'danger');
    });
  }

  elapsedMin(ts: number): number {
    return Math.max(0, Math.floor((Date.now() - ts) / 60000));
  }

  timerClass(ts: number): string {
    const m = this.elapsedMin(ts);
    return m >= 20 ? 'late' : m >= 10 ? 'warn' : '';
  }

  formatElapsed(ts: number): string {
    const m = this.elapsedMin(ts);
    if (m < 1) return 'עכשיו';
    if (m < 60) return `${m} דק׳`;
    return `${Math.floor(m / 60)}ש ${m % 60}ד`;
  }

  formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  }

  toggleSound(): void {
    this.soundOn.update(v => !v);
    localStorage.setItem('toroz_kitchen_sound', this.soundOn() ? '1' : '0');
  }

  itemCount(order: Order): number {
    return (order.items ?? []).reduce((s, i) => s + i.qty, 0);
  }

  private ding(): void {
    if (!this.soundOn()) return;
    try {
      this.audioCtx ??= new AudioContext();
      const now = this.audioCtx.currentTime;
      [880, 1320].forEach((freq, i) => {
        const osc = this.audioCtx!.createOscillator();
        const gain = this.audioCtx!.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * .18);
        gain.gain.linearRampToValueAtTime(.18, now + i * .18 + .02);
        gain.gain.exponentialRampToValueAtTime(.001, now + i * .18 + .4);
        osc.connect(gain); gain.connect(this.audioCtx!.destination);
        osc.start(now + i * .18); osc.stop(now + i * .18 + .42);
      });
    } catch { /* ignore */ }
  }

  private flashTitle(): void {
    if (this.titleTimer) clearInterval(this.titleTimer);
    const orig = document.title;
    let n = 0;
    this.titleTimer = setInterval(() => {
      document.title = n++ % 2 === 0 ? '🔔 הזמנה חדשה!' : orig;
      if (n > 8) { clearInterval(this.titleTimer!); document.title = orig; }
    }, 700);
  }
}
