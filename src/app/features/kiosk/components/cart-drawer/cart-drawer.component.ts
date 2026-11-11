import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CartItem } from '../../../../core/models/order.model';

@Component({
  selector: 'app-cart-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cart-drawer.component.html',
  styleUrl: './cart-drawer.component.scss',
})
export class CartDrawerComponent {
  readonly cart = input.required<CartItem[]>();
  readonly total = input.required<number>();
  readonly closed = output<void>();
  readonly removed = output<number>();
  readonly checkout = output<void>();

  onBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('drawer-bg')) this.closed.emit();
  }
}
