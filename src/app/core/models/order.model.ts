export type OrderStatus = 'new' | 'preparing' | 'ready' | 'done';

export interface OrderItem {
  name: string;
  qty: number;
  details: string[] | null;
}

export interface Order {
  id: string;
  num: number;
  status: OrderStatus;
  type: 'here' | 'takeaway';
  payment: string;
  customerName?: string;
  customerPhone?: string;
  createdAt: number;
  updatedAt?: number;
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
