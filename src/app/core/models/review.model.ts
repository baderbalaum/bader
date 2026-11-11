export interface Review {
  orderId: string;
  num: number;
  /** 1–5 */
  stars: number;
  comment?: string;
  name?: string;
  createdAt: number;
}

export interface ReviewStats {
  count: number;
  sum: number;
}
