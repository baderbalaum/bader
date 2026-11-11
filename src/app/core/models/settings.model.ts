export interface StoreSettings {
  /** Master switch: when false the customer app shows "closed" and blocks checkout. */
  isOpen: boolean;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  deliveryFee: number;
  /** Subtotal from which delivery is free. 0 = never free. */
  freeDeliveryOver: number;
  /** Minimum subtotal for delivery orders. */
  minOrder: number;
  prepMinutes: number;
  deliveryMinutes: number;
  /** Cities you deliver to. Empty = customer types the city freely. */
  cities: string[];
  /** International format without +, e.g. 972501234567. */
  phone: string;
  address: string;
  /** Optional banner shown at the top of the customer app (promo, holiday hours...). */
  announcement: string;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  isOpen: true,
  deliveryEnabled: true,
  pickupEnabled: true,
  deliveryFee: 15,
  freeDeliveryOver: 0,
  minOrder: 60,
  prepMinutes: 20,
  deliveryMinutes: 20,
  cities: [],
  phone: '972527558858',
  address: '',
  announcement: '',
};

export function deliveryFeeFor(subtotal: number, s: StoreSettings): number {
  if (s.freeDeliveryOver > 0 && subtotal >= s.freeDeliveryOver) return 0;
  return s.deliveryFee;
}

/** Minutes promised to the customer for this fulfillment mode. */
export function etaMinutesFor(mode: 'delivery' | 'pickup', s: StoreSettings): number {
  return mode === 'delivery' ? s.prepMinutes + s.deliveryMinutes : s.prepMinutes;
}
