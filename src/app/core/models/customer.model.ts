import { DeliveryAddress } from './order.model';

export interface CustomerRecord {
  /** Verified phone, +972 format. */
  phone: string;
  name: string;
  address?: DeliveryAddress;
  /** Explicit opt-in to promotional messages (Israeli anti-spam law requires it). */
  marketingConsent: boolean;
  /** When consent was last given or withdrawn. */
  consentAt?: number;
  createdAt: number;
  lastOrderAt?: number;
  ordersCount?: number;
}

export interface CustomerRow extends CustomerRecord { uid: string; }
