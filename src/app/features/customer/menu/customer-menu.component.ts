import {
  Component, ChangeDetectionStrategy, inject, signal, computed, viewChild, HostListener,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MenuService } from '../../../core/services/menu.service';
import { SettingsService } from '../../../core/services/settings.service';
import { CartService, FulfillmentMode } from '../../../core/services/cart.service';
import { CustomerOrderService } from '../../../core/services/customer-order.service';
import { ReviewService } from '../../../core/services/review.service';
import { MenuItem, MenuCategory } from '../../../core/models/menu.model';
import { CartItem } from '../../../core/models/order.model';
import { deliveryFeeFor, etaMinutesFor } from '../../../core/models/settings.model';
import { ItemCustomizerComponent } from '../../kiosk/components/item-customizer/item-customizer.component';
import { ToastComponent } from '../../../shared/components/toast/toast.component';

interface CatView { key: string; cat: MenuCategory; items: MenuItem[]; }

const ACTIVE_ORDER_WINDOW_MS = 3 * 60 * 60 * 1000;

@Component({
  selector: 'app-customer-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ItemCustomizerComponent, ToastComponent, RouterLink],
  templateUrl: './customer-menu.component.html',
  styleUrl: './customer-menu.component.scss',
})
export class CustomerMenuComponent {
  protected menuSvc = inject(MenuService);
  protected settingsSvc = inject(SettingsService);
  protected cart = inject(CartService);
  private router = inject(Router);
  private orders = inject(CustomerOrderService);
  protected reviews = inject(ReviewService);

  constructor() { this.reviews.watchStats(); }

  private toast = viewChild<ToastComponent>('toast');

  readonly s = this.settingsSvc.settings;
  readonly customizerItem = signal<MenuItem | null>(null);
  readonly activeCat = signal<string>('');

  readonly categories = computed((): CatView[] => {
    const m = this.menuSvc.menuResource.value();
    if (!m) return [];
    return Object.entries(m)
      .sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0))
      .map(([key, cat]) => ({ key, cat, items: Object.values(cat.items ?? {}) }))
      .filter(c => c.items.length > 0);
  });

  readonly eta = computed(() => etaMinutesFor(this.cart.mode(), this.s()));
  readonly fee = computed(() => deliveryFeeFor(this.cart.subtotal(), this.s()));

  readonly activeOrder = (() => {
    const recent = this.orders.recentOrders()[0];
    return recent && Date.now() - recent.createdAt < ACTIVE_ORDER_WINDOW_MS ? recent : null;
  })();

  setMode(m: FulfillmentMode): void {
    if (m === 'delivery' && !this.s().deliveryEnabled) return;
    if (m === 'pickup' && !this.s().pickupEnabled) return;
    this.cart.mode.set(m);
  }

  fromPrice(item: MenuItem): number {
    if (item.hasBurgerSize && item.burgerSizes?.length) return item.burgerSizes[0].price;
    if (item.hasSizeOption && item.sizes?.length) return item.sizes[0].price;
    return item.basePrice;
  }

  hasOptions(item: MenuItem): boolean {
    return !!(item.hasSpreads || item.hasVeggies || item.hasSauces || item.hasExtras ||
      item.hasSizeOption || item.hasBurgerSize || item.extras?.length || item.burgerExtras?.length);
  }

  catIcon(key: string): string {
    return this.menuSvc.menuResource.value()?.[key]?.icon ?? '🍽️';
  }

  open(item: MenuItem): void { this.customizerItem.set(item); }

  quickAdd(item: MenuItem, e: Event): void {
    e.stopPropagation();
    if (this.hasOptions(item)) { this.open(item); return; }
    this.cart.add({ id: Date.now(), name: item.name, details: [], unitPrice: item.basePrice, qty: 1 });
    this.toast()?.show(`${item.name} נוסף לסל ✓`, 'success');
  }

  onAdded(ci: CartItem): void {
    this.cart.add(ci);
    this.customizerItem.set(null);
    this.toast()?.show('נוסף לסל ✓', 'success');
  }

  /** Scroll-spy is paused while a tab click is smooth-scrolling, so the clicked tab stays highlighted. */
  private spyPausedUntil = 0;

  scrollTo(key: string): void {
    this.activeCat.set(key);
    this.spyPausedUntil = Date.now() + 1000;
    const el = document.getElementById('cat-' + key);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: 'smooth' });
  }

  goCheckout(): void { this.router.navigate(['/order/checkout']); }

  @HostListener('window:scroll')
  onScroll(): void {
    if (Date.now() < this.spyPausedUntil) return;
    let current = '';
    for (const c of this.categories()) {
      const el = document.getElementById('cat-' + c.key);
      if (el && el.getBoundingClientRect().top <= 90) current = c.key;
    }
    if (current && current !== this.activeCat()) {
      this.activeCat.set(current);
      document.getElementById('tab-' + current)?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }
}
