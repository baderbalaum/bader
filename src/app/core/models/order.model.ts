export type OrderStatus = 'new' | 'preparing' | 'ready' | 'on_the_way' | 'done';

/** here/takeaway come from the in-store kiosk; the customer app creates takeaway (pickup) or delivery. */
export type OrderType = 'here' | 'takeaway' | 'delivery';

export type OrderSource = 'kiosk' | 'app';

export interface GeoPoint {
  lat: number;
  lng: number;
  /** GPS accuracy in metres when the point came from the device; absent when the customer placed the pin by hand. */
  accuracy?: number;
}

export interface DeliveryAddress {
  city: string;
  street: string;
  floor?: string;
  apartment?: string;
  /** Free-text directions: what the house looks like, which entrance, landmarks. */
  notes?: string;
  /** Exact spot of the house, picked on the map by the customer. */
  location?: GeoPoint;
}

export interface OrderItem {
  name: string;
  qty: number;
  details: string[] | null;
  unitPrice?: number;
}

export interface Order {
  id: string;
  num: number;
  status: OrderStatus;
  type: OrderType;
  source?: OrderSource;
  /** Auth uid of the customer who placed it (app orders); the rules let only them read it. */
  customerUid?: string;
  payment: string;
  customerName?: string;
  customerPhone?: string;
  address?: DeliveryAddress;
  createdAt: number;
  updatedAt?: number;
  /** Minutes the customer was promised when ordering. */
  etaMinutes?: number;
  subtotal?: number;
  deliveryFee?: number;
  total: number;
  note?: string;
  items: OrderItem[] | null;
  lineDone?: Record<number, boolean>;
}

export interface CartItem {
  id: number;
  name: string;
  details: string[];
  unitPrice: number;
  qty: number;
}

export function formatAddress(a: DeliveryAddress | undefined): string {
  if (!a) return '';
  const parts = [a.street, a.city].filter(Boolean).join(', ');
  const extra = [a.floor ? `קומה ${a.floor}` : '', a.apartment ? `דירה ${a.apartment}` : ''].filter(Boolean).join(', ');
  return extra ? `${parts} (${extra})` : parts;
}

export function wazeUrl(a: DeliveryAddress): string {
  return a.location
    ? `https://waze.com/ul?ll=${a.location.lat},${a.location.lng}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(`${a.street}, ${a.city}`)}&navigate=yes`;
}

export function googleMapsUrl(a: DeliveryAddress): string {
  const q = a.location ? `${a.location.lat},${a.location.lng}` : `${a.street}, ${a.city}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
