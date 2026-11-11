import {
  Component, ChangeDetectionStrategy, signal, computed, inject, OnInit, viewChild,
} from '@angular/core';
import { MenuService, MENU_META_SEED } from '../../core/services/menu.service';
import { OrderService } from '../../core/services/order.service';
import { MenuItem, MenuCategory } from '../../core/models/menu.model';
import { CartItem } from '../../core/models/order.model';
import { ToastComponent } from '../../shared/components/toast/toast.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ItemCustomizerComponent } from './components/item-customizer/item-customizer.component';
import { CartDrawerComponent } from './components/cart-drawer/cart-drawer.component';
import { BrandMarkComponent } from '../../shared/components/brand-mark/brand-mark.component';

export type KioskScreen = 'welcome' | 'dine' | 'customer' | 'category' | 'menu' | 'payment' | 'confirmation';

const RESTAURANT_PHONE = '972527558858';

@Component({
  selector: 'app-kiosk-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToastComponent, ConfirmDialogComponent, ItemCustomizerComponent, CartDrawerComponent, BrandMarkComponent],
  templateUrl: './kiosk-shell.component.html',
  styleUrl: './kiosk-shell.component.scss',
})
export class KioskShellComponent implements OnInit {
  protected menuSvc = inject(MenuService);
  private orderSvc = inject(OrderService);

  // ── Navigation ──
  readonly screen = signal<KioskScreen>('welcome');

  // ── Order state ──
  readonly orderType = signal<'here' | 'takeaway'>('here');
  readonly customerName = signal('');
  readonly customerPhone = signal('');
  readonly paymentMethod = signal<'cash' | 'credit' | ''>('');
  readonly currentCat = signal<string | null>(null);

  // ── Cart ──
  readonly cart = signal<CartItem[]>([]);
  readonly cartTotal = computed(() => this.cart().reduce((s, i) => s + i.unitPrice * i.qty, 0));
  readonly cartCount = computed(() => this.cart().reduce((s, i) => s + i.qty, 0));

  // ── Customizer ──
  readonly customizerItem = signal<MenuItem | null>(null);
  readonly cartOpen = signal(false);

  // ── Confirmation ──
  readonly receiptLines = signal<string[]>([]);
  readonly orderNum = signal(0);

  // ── Credit flow ──
  readonly creditStep = signal(0);
  readonly creditSteps = ['הכנס כרטיס', 'הזן קוד סודי', 'מאשר תשלום...', 'תשלום אושר ✓'];
  private creditTimer: ReturnType<typeof setTimeout> | null = null;

  get menu() { return this.menuSvc.menuResource.value(); }
  get meta() { return this.menuSvc.metaResource.value(); }

  get sortedCategories(): [string, MenuCategory][] {
    const m = this.menu;
    if (!m) return [];
    return Object.entries(m).sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0));
  }

  get currentCatData(): MenuCategory | null {
    const m = this.menu;
    const key = this.currentCat();
    return (m && key) ? (m[key] ?? null) : null;
  }

  get currentCatItems(): MenuItem[] {
    const cat = this.currentCatData;
    if (!cat) return [];
    return Object.values(cat.items ?? {});
  }

  ngOnInit(): void {}

  // ── Screens ──
  goToDine(): void { this.screen.set('dine'); }
  goToWelcome(): void { this.screen.set('welcome'); this.resetOrder(); }

  selectDine(type: 'here' | 'takeaway'): void {
    this.orderType.set(type);
    this.screen.set('customer');
  }

  submitCustomer(): void {
    if (!this.customerName().trim()) {
      this.showToast('יש להזין שם', 'danger');
      return;
    }
    if (!this.customerPhone().trim()) {
      this.showToast('יש להזין מספר טלפון', 'danger');
      return;
    }
    this.screen.set('category');
  }

  openCategory(key: string): void {
    this.currentCat.set(key);
    this.screen.set('menu');
  }

  goToCategories(): void { this.screen.set('category'); }

  openCustomizer(item: MenuItem): void { this.customizerItem.set(item); }
  closeCustomizer(): void { this.customizerItem.set(null); }

  onItemAdded(cartItem: CartItem): void {
    this.cart.update(c => [...c, cartItem]);
    this.customizerItem.set(null);
    this.showToast('נוסף לסל ✓', 'success');
  }

  confirmOrder(): void {
    if (this.cartCount() === 0) return;
    this.cartOpen.set(false);
    this.screen.set('payment');
  }

  selectPayment(method: 'cash' | 'credit'): void {
    this.paymentMethod.set(method);
    if (method === 'cash') {
      this.finishOrder('מזומן 💵');
    } else {
      this.creditStep.set(0);
      this.runCreditFlow();
    }
  }

  private runCreditFlow(): void {
    const advance = (step: number) => {
      if (step >= this.creditSteps.length) {
        this.finishOrder('אשראי 💳');
        return;
      }
      this.creditStep.set(step);
      this.creditTimer = setTimeout(() => advance(step + 1), step === 2 ? 2000 : 900);
    };
    advance(0);
  }

  cancelCredit(): void {
    if (this.creditTimer) clearTimeout(this.creditTimer);
    this.screen.set('payment');
  }

  private async finishOrder(payLabel: string): Promise<void> {
    const num = await this.orderSvc.getNextOrderNum();
    this.orderNum.set(num);

    const lines: string[] = [
      `🐂 TOROZ MEAT`,
      `הזמנה מס׳ #${num}`,
      `סוג: ${this.orderType() === 'here' ? 'לשבת פה 🪑' : 'לקחת 🥡'}`,
      `תשלום: ${payLabel}`,
      '─────────────────',
      ...this.cart().flatMap(item => [
        `${item.qty}× ${item.name}  ₪${item.unitPrice * item.qty}`,
        ...item.details.map(d => `   ${d}`),
      ]),
      '─────────────────',
      `סה"כ: ₪${this.cartTotal()}`,
      `תאריך: ${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`,
    ];
    this.receiptLines.set(lines);

    const orderItems = this.cart().map(i => ({ name: i.name, qty: i.qty, details: i.details }));
    const order = {
      num,
      status: 'new' as const,
      type: this.orderType(),
      payment: payLabel,
      ...(this.customerName().trim() ? { customerName: this.customerName().trim() } : {}),
      ...(this.customerPhone().trim() ? { customerPhone: this.customerPhone().trim() } : {}),
      createdAt: Date.now(),
      total: this.cartTotal(),
      items: orderItems,
    };
    await this.orderSvc.addOrder(order);

    this.screen.set('confirmation');
    setTimeout(() => this.sendWhatsApp(num, payLabel), 500);
  }

  private sendWhatsApp(num: number, payLabel: string): void {
    const lines = [
      `*הזמנה חדשה #${num}*`,
      `סוג: ${this.orderType() === 'here' ? 'לשבת פה' : 'לקחת'}`,
      `תשלום: ${payLabel}`,
      this.customerName() ? `לקוח: ${this.customerName()}` : '',
      '',
      ...this.cart().map(i => `• ${i.qty}× ${i.name} ₪${i.unitPrice * i.qty}\n${i.details.map(d => `  ${d}`).join('\n')}`),
      '',
      `*סה"כ: ₪${this.cartTotal()}*`,
    ].filter(l => l !== undefined).join('\n');

    window.open(`https://wa.me/${RESTAURANT_PHONE}?text=${encodeURIComponent(lines)}`, '_blank');
  }

  newOrder(): void {
    this.resetOrder();
    this.screen.set('welcome');
  }

  private resetOrder(): void {
    this.cart.set([]);
    this.customerName.set('');
    this.customerPhone.set('');
    this.paymentMethod.set('');
    this.currentCat.set(null);
    this.orderNum.set(0);
    this.receiptLines.set([]);
  }

  removeCartItem(id: number): void {
    this.cart.update(c => c.filter(i => i.id !== id));
  }

  private toastRef = viewChild<ToastComponent>('toast');
  showToast(msg: string, kind: 'success' | 'danger' | '' = ''): void { this.toastRef()?.show(msg, kind); }
}
