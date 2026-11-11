export type OrderStatus = 'new' | 'preparing' | 'ready' | 'on_the_way' | 'done';

/** here/takeaway come from the in-store kiosk; the customer app creates takeaway (pickup) or delivery. */
export type OrderType = 'here' | 'takeaway' | 'delivery';

export type OrderSource = 'kiosk' | 'app';

export interface DeliveryAddress {
  city: string;
  street: string;
  floor?: string;
  apartment?: string;
  notes?: string;
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
