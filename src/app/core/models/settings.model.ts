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
  /** Courier's WhatsApp number (972...). Empty = WhatsApp asks which contact to send to. */
  courierPhone: string;
  /** Centre of the delivery area; the map opens here and pins too far from it are rejected. */
  deliveryCenter: { lat: number; lng: number };
  /** Max distance from deliveryCenter in km. 0 = no distance check. */
  deliveryRadiusKm: number;
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
  cities: ['טייבה'],
  phone: '972527558858',
  address: '',
  announcement: '',
  courierPhone: '',
  deliveryCenter: { lat: 32.2667, lng: 35.0103 }, // Tayibe
  deliveryRadiusKm: 5,
};

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function deliveryFeeFor(subtotal: number, s: StoreSettings): number {
  if (s.freeDeliveryOver > 0 && subtotal >= s.freeDeliveryOver) return 0;
  return s.deliveryFee;
}

/** Minutes promised to the customer for this fulfillment mode. */
export function etaMinutesFor(mode: 'delivery' | 'pickup', s: StoreSettings): number {
  return mode === 'delivery' ? s.prepMinutes + s.deliveryMinutes : s.prepMinutes;
}
