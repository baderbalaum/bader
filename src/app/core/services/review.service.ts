import { Injectable, inject, signal } from '@angular/core';
import { Database, ref, onValue, get, set, runTransaction, query, limitToLast } from '@angular/fire/database';
import { Review, ReviewStats } from '../models/review.model';
import { AuthService } from './auth.service';

const RATED_KEY = 'toroz_rated_orders';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private db = inject(Database);
  private auth = inject(AuthService);

  /** Aggregate only, so the customer app never downloads every review. */
  readonly stats = signal<ReviewStats>({ count: 0, sum: 0 });
  private statsStarted = false;

  watchStats(): void {
    if (this.statsStarted) return;
    this.statsStarted = true;
    onValue(ref(this.db, 'reviewStats'), s => {
      const v = s.val() as ReviewStats | null;
      this.stats.set({ count: v?.count ?? 0, sum: v?.sum ?? 0 });
    });
  }

  average(): number {
    const { count, sum } = this.stats();
    return count ? Math.round((sum / count) * 10) / 10 : 0;
  }

  async hasReview(orderId: string): Promise<boolean> {
    if (this.ratedLocally().includes(orderId)) return true;
    await this.auth.ensureCustomer();
    const snap = await get(ref(this.db, `reviews/${orderId}`));
    return snap.exists();
  }

  async submit(r: Review): Promise<void> {
    await this.auth.ensureCustomer();
    const clean: Review = { ...r, stars: Math.min(5, Math.max(1, Math.round(r.stars))) };
    if (!clean.comment) delete clean.comment;
    if (!clean.name) delete clean.name;
    await set(ref(this.db, `reviews/${r.orderId}`), clean);
    await runTransaction(ref(this.db, 'reviewStats'), (cur: ReviewStats | null) => ({
      count: (cur?.count ?? 0) + 1,
      sum: (cur?.sum ?? 0) + clean.stars,
    }));
    try {
      localStorage.setItem(RATED_KEY, JSON.stringify([r.orderId, ...this.ratedLocally()].slice(0, 50)));
    } catch { /* storage unavailable */ }
  }

  /** Latest reviews for the admin screen. Returns an unsubscribe function. */
  watchLatest(cb: (reviews: Review[]) => void, max = 200): () => void {
    return onValue(query(ref(this.db, 'reviews'), limitToLast(max)), s => {
      const raw = (s.val() ?? {}) as Record<string, Review>;
      cb(Object.values(raw).sort((a, b) => b.createdAt - a.createdAt));
    });
  }

  private ratedLocally(): string[] {
    try { return JSON.parse(localStorage.getItem(RATED_KEY) ?? '[]') as string[]; }
    catch { return []; }
  }
}
