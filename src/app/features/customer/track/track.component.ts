import { Component, ChangeDetectionStrategy, inject, input, signal, computed, effect } from '@angular/core';
import { DemoBannerComponent } from '../../../shared/components/demo-banner/demo-banner.component';
import { RouterLink } from '@angular/router';
import { CustomerOrderService } from '../../../core/services/customer-order.service';
import { SettingsService } from '../../../core/services/settings.service';
import { ReviewService } from '../../../core/services/review.service';
import { Order, formatAddress } from '../../../core/models/order.model';

interface Step { label: string; icon: string; }

const DELIVERY_STEPS: Step[] = [
  { label: 'התקבלה', icon: '🧾' },
  { label: 'בהכנה', icon: '🔥' },
  { label: 'בדרך אליך', icon: '🛵' },
  { label: 'נמסרה', icon: '✅' },
];
const PICKUP_STEPS: Step[] = [
  { label: 'התקבלה', icon: '🧾' },
  { label: 'בהכנה', icon: '🔥' },
  { label: 'מוכנה לאיסוף', icon: '🛍️' },
  { label: 'נאספה', icon: '✅' },
];

@Component({
  selector: 'app-track',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoBannerComponent, RouterLink],
  templateUrl: './track.component.html',
  styleUrl: './track.component.scss',
})
export class TrackComponent {
  private orders = inject(CustomerOrderService);
  protected settingsSvc = inject(SettingsService);
  private reviews = inject(ReviewService);

  readonly id = input.required<string>();
  /** undefined = still loading, null = cancelled / not found. */
  readonly order = signal<Order | null | undefined>(undefined);
  readonly formatAddress = formatAddress;

  constructor() {
    effect(onCleanup => {
      const id = this.id();
      this.order.set(undefined);
      const off = this.orders.watchOrder(id, o => this.order.set(o));
      onCleanup(off);
    });

    // Once delivered, offer a rating unless this order was already rated.
    effect(() => {
      const o = this.order();
      if (o?.status !== 'done' || this.reviewState() !== 'unknown') return;
      this.reviewState.set('checking');
      this.reviews.hasReview(o.id)
        .then(has => this.reviewState.set(has ? 'already' : 'open'))
        .catch(() => this.reviewState.set('open'));
    });
  }

  // ── Rating ──
  readonly reviewState = signal<'unknown' | 'checking' | 'open' | 'sending' | 'sent' | 'already'>('unknown');
  readonly stars = signal(0);
  readonly hoverStars = signal(0);
  readonly comment = signal('');
  readonly starLabels = ['', 'גרוע', 'לא משהו', 'בסדר', 'טעים מאוד', 'מושלם! 🤩'];

  async sendReview(): Promise<void> {
    const o = this.order();
    if (!o || !this.stars() || this.reviewState() === 'sending') return;
    this.reviewState.set('sending');
    try {
      await this.reviews.submit({
        orderId: o.id, num: o.num, stars: this.stars(), comment: this.comment().trim(),
        name: o.customerName?.split(' ')[0], createdAt: Date.now(),
      });
      this.reviewState.set('sent');
    } catch {
      this.reviewState.set('open');
    }
  }

  val(e: Event): string { return (e.target as HTMLTextAreaElement).value; }

  readonly isDelivery = computed(() => this.order()?.type === 'delivery');
  readonly steps = computed(() => (this.isDelivery() ? DELIVERY_STEPS : PICKUP_STEPS));

  readonly stepIndex = computed(() => {
    const o = this.order();
    if (!o) return 0;
    switch (o.status) {
      case 'new': return 0;
      case 'preparing': return 1;
      case 'ready': return this.isDelivery() ? 1 : 2;
      case 'on_the_way': return 2;
      case 'done': return 3;
    }
  });

  readonly headline = computed(() => {
    const o = this.order();
    if (!o) return '';
    const d = this.isDelivery();
    switch (o.status) {
      case 'new': return 'ההזמנה התקבלה! 🎉';
      case 'preparing': return 'המטבח מכין את ההזמנה שלך 🔥';
      case 'ready': return d ? 'ההזמנה ארוזה ומחכה לשליח 📦' : 'ההזמנה מוכנה לאיסוף! 🛍️';
      case 'on_the_way': return 'השליח בדרך אליך 🛵';
      case 'done': return d ? 'בתיאבון! ההזמנה נמסרה' : 'בתיאבון! תודה שבחרת בנו';
    }
  });

  readonly etaTime = computed(() => {
    const o = this.order();
    if (!o?.etaMinutes || o.status === 'done') return '';
    return new Date(o.createdAt + o.etaMinutes * 60000).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  });

  whatsappLink(): string {
    const o = this.order();
    const text = o ? `היי, לגבי הזמנה #${o.num}` : 'היי';
    return `https://wa.me/${this.settingsSvc.settings().phone}?text=${encodeURIComponent(text)}`;
  }
}
