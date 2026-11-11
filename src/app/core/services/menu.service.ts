import { Injectable, inject, signal } from '@angular/core';
import { Database, ref, get, set, update, remove } from '@angular/fire/database';
import { MenuData, MenuCategory, MenuItem, MenuMeta } from '../models/menu.model';

export const MENU_SEED: MenuData = {
  tortillas: {
    icon: '🌯', title: 'טורטיות', sub: 'מנות פתיחה טובות', order: 0,
    items: {
      1: { id: 1, name: 'טורטיה אנטריקוט', desc: 'בשר פרוס דק 170 גרם', basePrice: 65, hasSizeOption: true, sizes: [{ label: 'רגיל – 170 גרם', price: 65 }, { label: 'גדול – 340 גרם (+₪15)', price: 80 }], hasSpreads: true, hasVeggies: true, hasSauces: true, hasExtras: true },
      2: { id: 2, name: 'טורטיה חזה עוף', desc: 'חזה עוף רגיל 180 גרם', basePrice: 60, hasSizeOption: true, sizes: [{ label: 'רגיל – 180 גרם', price: 60 }, { label: 'גדול – 390 גרם (+₪15)', price: 75 }], hasSpreads: true, hasVeggies: true, hasSauces: true, hasExtras: true },
      3: { id: 3, name: 'טורטיה שניצל', desc: 'שניצל פריך', basePrice: 58, hasSpreads: true, hasVeggies: true, hasSauces: true, hasExtras: true },
      4: { id: 4, name: 'טורטיה פטריות', desc: 'פטריות טריות', basePrice: 55, hasSpreads: true, hasVeggies: true, hasSauces: true, hasExtras: true },
      5: { id: 5, name: 'טורטיה המבורגר', desc: 'קציצת בקר 200 גרם', basePrice: 68, hasExtras: true },
    },
  },
  sandwiches: {
    icon: '🥙', title: 'כריכים', sub: 'כריכים טריים ומוכנים', order: 1,
    items: {
      10: { id: 10, name: 'כריך אנטריקוט', desc: 'בשר אנטריקוט פרוס דק', basePrice: 59, hasSpreads: true, hasVeggies: true, hasSauces: true, hasExtras: true },
      11: { id: 11, name: 'כריך חזה עוף', desc: 'חזה עוף טרי על הגריל', basePrice: 48, hasSpreads: true, hasVeggies: true, hasSauces: true, hasExtras: true },
      12: { id: 12, name: 'כריך שניצל', desc: 'שניצל פריך וחם', basePrice: 48, hasSpreads: true, hasVeggies: true, hasSauces: true, hasExtras: true },
      13: { id: 13, name: 'כריך טורוז', desc: 'הכריך המיוחד של הבית', basePrice: 62, hasSpreads: true, hasVeggies: true, hasSauces: true, hasExtras: true },
    },
  },
  burgers: {
    icon: '🍔', title: 'בורגר', sub: 'קציצות בקר טריות', order: 2,
    items: {
      60: { id: 60, name: 'בורגר קלאסי', desc: 'קציצת בקר 200 גרם', basePrice: 62, hasBurgerSize: true, burgerSizes: [{ label: 'M – 200 גרם', price: 62 }, { label: 'MW – 400 גרם (+₪28)', price: 90 }, { label: 'WD – 600 גרם (+₪56)', price: 118 }], hasSauces: true, hasVeggies: true },
      61: { id: 61, name: 'צ׳יזבורגר', desc: "קציצת בקר 200 גרם – מגיע עם גבינה ורוטב", basePrice: 65, hasBurgerSize: true, burgerSizes: [{ label: 'M – 200 גרם', price: 65 }, { label: 'MW – 400 גרם (+₪28)', price: 93 }, { label: 'WD – 600 גרם (+₪56)', price: 121 }], hasSauces: true },
      62: { id: 62, name: 'בורגר טורוז', desc: "קציצת בקר 200 גרם עם אנטריקוט פרוס וצ׳ימיצ׳ורי", basePrice: 0, specialPrice: true, hasBurgerSize: true, burgerSizes: [{ label: 'M – 200 גרם', price: 0 }, { label: 'MW – 400 גרם (+₪28)', price: 28 }, { label: 'WD – 600 גרם (+₪56)', price: 56 }], hasSauces: true, hasVeggies: true },
    },
  },
  fried: {
    icon: '🍟', title: 'מטוגנים', sub: 'טריים ופריכים', order: 3,
    items: {
      20: { id: 20, name: "צ׳יפס רגיל", desc: "צ׳יפס זהוב ופריך", basePrice: 12 },
      21: { id: 21, name: "צ׳יפס בטטה", desc: 'בטטה פריכה', basePrice: 14 },
      22: { id: 22, name: 'כדורי פריי', desc: 'כדורי תפוח אדמה מטוגנים', basePrice: 15 },
      23: { id: 23, name: 'טבעות בצל', desc: 'טבעות בצל בבלילה פריכה', basePrice: 15 },
      24: { id: 24, name: 'אצבעות מוצרלה', desc: 'גבינת מוצרלה מטוגנת', basePrice: 32 },
      25: { id: 25, name: 'הום פריז', desc: "צ׳יפס ביתי", basePrice: 22 },
      26: { id: 26, name: 'הום פריז אנטריקוט', desc: "צ׳יפס ביתי עם אנטריקוט", basePrice: 42 },
      27: { id: 27, name: 'הום פריז חזה עוף', desc: "צ׳יפס ביתי עם חזה עוף", basePrice: 38 },
      28: { id: 28, name: "צ׳יפס דילוקס", desc: "צ׳יפס עם תוספות", basePrice: 28 },
      29: { id: 29, name: "צ׳יפס דילוקס + קציצה", desc: "צ׳יפס דילוקס עם קציצת בורגר", basePrice: 48 },
    },
  },
  drinks: {
    icon: '🥤', title: 'שתיה', sub: 'קרה וחמה לכל טעם', order: 4,
    items: {
      30: { id: 30, name: 'קולה רגיל', desc: 'קוקה קולה 330 מ"ל', basePrice: 7 },
      31: { id: 31, name: 'קולה זירו', desc: 'קוקה קולה זירו 330 מ"ל', basePrice: 7 },
      32: { id: 32, name: 'ספריט רגיל', desc: 'ספריט 330 מ"ל', basePrice: 7 },
      33: { id: 33, name: 'ספריט זירו', desc: 'ספריט זירו 330 מ"ל', basePrice: 7 },
      34: { id: 34, name: 'פאנטה רגיל', desc: 'פאנטה תפוז 330 מ"ל', basePrice: 7 },
      35: { id: 35, name: 'פאנטה אקזוטי', desc: 'פאנטה אקזוטי 330 מ"ל', basePrice: 7 },
      36: { id: 36, name: 'ענבים', desc: 'מיץ ענבים', basePrice: 8 },
      37: { id: 37, name: 'אשכוליות', desc: 'מיץ אשכוליות', basePrice: 8 },
      38: { id: 38, name: 'תפוזים', desc: 'מיץ תפוזים', basePrice: 8 },
      39: { id: 39, name: 'תות בננה', desc: 'מיץ תות בננה', basePrice: 8 },
      40: { id: 40, name: 'פיוזטי', desc: 'תה קר', basePrice: 8 },
      41: { id: 41, name: 'סודה', desc: 'סודה 330 מ"ל', basePrice: 7 },
      42: { id: 42, name: 'מים', desc: 'בקבוק מים 500 מ"ל', basePrice: 5 },
    },
  },
  desserts: {
    icon: '🍩', title: 'קינוחים', sub: 'מתוק לסיום', order: 5,
    items: {
      50: { id: 50, name: 'מאלבה', desc: 'גלידת מאלבה קרמית', basePrice: 9 },
    },
  },
};

export const MENU_META_SEED: MenuMeta = {
  extras: [
    { label: 'בצל מטוגן', price: 5 },
    { label: 'פלפל קלוי', price: 5 },
    { label: 'גבינה', price: 5 },
    { label: 'פטריות', price: 5 },
    { label: "חלפיניו", price: 5 },
    { label: 'ביצה עין', price: 5 },
    { label: 'אבוקדו', price: 5 },
  ],
  sauces: ['איולי שום', 'איולי ציפוטלה', 'איולי קארי', 'BBQ', 'צ׳ילי מתוק', 'צ׳ילי חריף', 'קטשופ', 'מיונז', 'סיראצ׳ה'],
  veggies: ['חסה', 'עגבנייה', 'בצל סגול'],
  spreads: ['אבוקדו', 'פסטו', "צ׳ימיצ׳ורי", "חלפיניו"],
};

@Injectable({ providedIn: 'root' })
export class MenuService {
  private db = inject(Database);

  private _menu = signal<MenuData | undefined>(undefined);
  private _menuLoading = signal(true);
  private _meta = signal<MenuMeta | undefined>(undefined);
  private _metaLoading = signal(true);

  // Same interface as resource() so templates need no changes
  readonly menuResource = {
    value: this._menu.asReadonly(),
    isLoading: this._menuLoading.asReadonly(),
  };

  readonly metaResource = {
    value: this._meta.asReadonly(),
    isLoading: this._metaLoading.asReadonly(),
  };

  constructor() {
    this.loadMenu();
    this.loadMeta();
  }

  private async loadMenu(): Promise<void> {
    this._menuLoading.set(true);
    try {
      const snap = await get(ref(this.db, 'menu'));
      this._menu.set(snap.exists() ? snap.val() as MenuData : MENU_SEED);
    } finally {
      this._menuLoading.set(false);
    }
  }

  private async loadMeta(): Promise<void> {
    this._metaLoading.set(true);
    try {
      const snap = await get(ref(this.db, 'menuMeta'));
      this._meta.set(snap.exists() ? snap.val() as MenuMeta : MENU_META_SEED);
    } finally {
      this._metaLoading.set(false);
    }
  }

  get menu(): MenuData | undefined { return this._menu(); }
  get meta(): MenuMeta | undefined { return this._meta(); }

  async saveCategory(key: string, cat: Omit<MenuCategory, 'items'>): Promise<void> {
    await update(ref(this.db, `menu/${key}`), { icon: cat.icon, title: cat.title, sub: cat.sub, order: cat.order });
    await this.loadMenu();
  }

  async saveItem(catKey: string, item: MenuItem): Promise<void> {
    await set(ref(this.db, `menu/${catKey}/items/${item.id}`), item);
    await this.loadMenu();
  }

  async deleteItem(catKey: string, itemId: number): Promise<void> {
    await remove(ref(this.db, `menu/${catKey}/items/${itemId}`));
    await this.loadMenu();
  }

  async deleteCategory(key: string): Promise<void> {
    await remove(ref(this.db, `menu/${key}`));
    await this.loadMenu();
  }

  async addCategory(key: string, cat: MenuCategory): Promise<void> {
    await set(ref(this.db, `menu/${key}`), cat);
    await this.loadMenu();
  }

  async resetToDefaults(): Promise<void> {
    await set(ref(this.db, 'menu'), MENU_SEED);
    await set(ref(this.db, 'menuMeta'), MENU_META_SEED);
    await Promise.all([this.loadMenu(), this.loadMeta()]);
  }

  async importMenu(data: MenuData): Promise<void> {
    await set(ref(this.db, 'menu'), data);
    await this.loadMenu();
  }

  nextItemId(): number {
    const menu = this.menu ?? {};
    let max = 0;
    Object.values(menu).forEach(c => Object.values(c.items ?? {}).forEach(i => { if (i.id > max) max = i.id; }));
    return max + 1;
  }
}
