import { Component, ChangeDetectionStrategy, inject, signal, computed, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartService, FulfillmentMode } from '../../../core/services/cart.service';
import { SettingsService } from '../../../core/services/settings.service';
import { CustomerOrderService } from '../../../core/services/customer-order.service';
import { deliveryFeeFor, etaMinutesFor, distanceKm } from '../../../core/models/settings.model';
import { DeliveryAddress, GeoPoint, Order } from '../../../core/models/order.model';
import { ToastComponent } from '../../../shared/components/toast/toast.component';
import { LocationPickerComponent } from '../../../shared/components/location-picker/location-picker.component';

type PayMethod = 'cash' | 'card_on_delivery';

const PAY_LABELS: Record<PayMethod, string> = {
  cash: 'מזומן',
  card_on_delivery: 'אשראי בעת המסירה',
};

const PLACE_TIMEOUT_MS = 15000;

@Component({
  selector: 'app-checkout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ToastComponent, LocationPickerComponent],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
})
export class CheckoutComponent {
  protected cart = inject(CartService);
  protected settingsSvc = inject(SettingsService);
  private orders = inject(CustomerOrderService);
  private router = inject(Router);
  private toast = viewChild<ToastComponent>('toast');

  readonly s = this.settingsSvc.settings;
  private p = this.cart.profile();

  readonly name = signal(this.p.name);
  readonly phone = signal(this.p.phone);
  readonly city = signal(this.p.address.city);
  readonly street = signal(this.p.address.street);
  readonly floor = signal(this.p.address.floor ?? '');
  readonly apartment = signal(this.p.address.apartment ?? '');
  readonly addrNotes = signal(this.p.address.notes ?? '');
  readonly location = signal<GeoPoint | undefined>(this.p.address.location);
  readonly note = signal('');
  readonly pay = signal<PayMethod>('cash');
  readonly submitting = signal(false);
  readonly showErrors = signal(false);

  readonly payOptions: { key: PayMethod; label: string; icon: string }[] = [
    { key: 'cash', label: PAY_LABELS.cash, icon: '💵' },
    { key: 'card_on_delivery', label: PAY_LABELS.card_on_delivery, icon: '💳' },
  ];

  readonly isDelivery = computed(() => this.cart.mode() === 'delivery');
  readonly fee = computed(() => (this.isDelivery() ? deliveryFeeFor(this.cart.subtotal(), this.s()) : 0));
  readonly total = computed(() => this.cart.subtotal() + this.fee());
  readonly eta = computed(() => etaMinutesFor(this.cart.mode(), this.s()));
  readonly missingForMin = computed(() =>
    this.isDelivery() ? Math.max(0, this.s().minOrder - this.cart.subtotal()) : 0);

  /** With a single delivery city there is nothing to choose: it is filled in automatically. */
  readonly singleCity = computed(() => (this.s().cities.length === 1 ? this.s().cities[0] : ''));
  readonly effectiveCity = computed(() => this.singleCity() || this.city().trim());

  readonly outOfArea = computed(() => {
    const loc = this.location(), s = this.s();
    if (!this.isDelivery() || !loc || !s.deliveryRadiusKm) return false;
    return distanceKm(loc, s.deliveryCenter) > s.deliveryRadiusKm;
  });

  readonly errors = computed(() => {
    const e: Record<string, string> = {};
    if (!this.name().trim()) e['name'] = 'נא למלא שם';
    if (!/^0\d{8,9}$/.test(this.phone().replace(/\D/g, ''))) e['phone'] = 'מספר טלפון לא תקין';
    if (this.isDelivery()) {
      if (!this.effectiveCity()) e['city'] = 'נא לבחור עיר';
      // Many homes have no house number: a pin on the map is enough on its own.
      if (!this.street().trim() && !this.location()) e['street'] = 'נא למלא רחוב/שכונה או לשתף מיקום';
    }
    return e;
  });

  readonly blocker = computed((): string => {
    if (this.cart.count() === 0) return 'הסל ריק';
    if (!this.s().isOpen) return 'המסעדה סגורה כרגע';
    if (this.isDelivery() && !this.s().deliveryEnabled) return 'משלוחים לא זמינים כרגע';
    if (!this.isDelivery() && !this.s().pickupEnabled) return 'איסוף עצמי לא זמין כרגע';
    if (this.outOfArea()) return `המיקום שסימנתם מחוץ לאזור המשלוחים (${this.s().cities.join(', ') || 'האזור שלנו'})`;
    if (this.missingForMin() > 0) return `חסרים ₪${this.missingForMin()} למינימום הזמנה במשלוח`;
    return '';
  });

  setMode(m: FulfillmentMode): void { this.cart.mode.set(m); }

  val(e: Event): string { return (e.target as HTMLInputElement).value; }

  async placeOrder(): Promise<void> {
    if (this.submitting() || this.blocker()) return;
    if (Object.keys(this.errors()).length) {
      this.showErrors.set(true);
      this.toast()?.show('יש להשלים את הפרטים המסומנים', 'danger');
      return;
    }

    const address: DeliveryAddress | undefined = this.isDelivery()
      ? { city: this.effectiveCity(), street: this.street().trim(), floor: this.floor().trim(),
          apartment: this.apartment().trim(), notes: this.addrNotes().trim(), location: this.location() }
      : undefined;

    const order: Omit<Order, 'id' | 'num'> = {
      status: 'new',
      type: this.isDelivery() ? 'delivery' : 'takeaway',
      source: 'app',
      payment: PAY_LABELS[this.pay()],
      customerName: this.name().trim(),
      customerPhone: this.phone().replace(/\D/g, ''),
      address,
      createdAt: Date.now(),
      etaMinutes: this.eta(),
      subtotal: this.cart.subtotal(),
      deliveryFee: this.fee(),
      total: this.total(),
      note: this.note().trim(),
      items: this.cart.items().map(i => ({ name: i.name, qty: i.qty, details: i.details, unitPrice: i.unitPrice })),
    };

    this.submitting.set(true);
    try {
      const res = await Promise.race([
        this.orders.placeOrder(order),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), PLACE_TIMEOUT_MS)),
      ]);
      this.cart.saveProfile({
        name: order.customerName!, phone: this.phone(),
        address: address ?? this.cart.profile().address,
      });
      this.cart.clear();
      this.router.navigate(['/track', res.id]);
    } catch {
      this.toast()?.show('לא הצלחנו לשלוח את ההזמנה. בדקו את החיבור ונסו שוב', 'danger');
    } finally {
      this.submitting.set(false);
    }
  }
}
