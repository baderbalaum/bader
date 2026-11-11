import {
  Component, ChangeDetectionStrategy, inject, signal, computed, viewChild,
} from '@angular/core';
import { MenuService } from '../../core/services/menu.service';
import { StorageService } from '../../core/services/storage.service';
import { PinService } from '../../core/services/pin.service';
import { MenuItem, MenuCategory, MenuData, Size } from '../../core/models/menu.model';
import { KeyValuePipe } from '@angular/common';
import { BrandMarkComponent } from '../../shared/components/brand-mark/brand-mark.component';
import { ToastComponent } from '../../shared/components/toast/toast.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-admin-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KeyValuePipe, BrandMarkComponent, ToastComponent, ConfirmDialogComponent],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss',
})
export class AdminShellComponent {
  readonly menuSvc = inject(MenuService);
  private storageSvc = inject(StorageService);
  readonly pinSvc = inject(PinService);

  private toast = viewChild.required<ToastComponent>('toast');
  private confirm = viewChild.required<ConfirmDialogComponent>('confirm');

  // ── PIN ──
  readonly pinInput = signal('');
  readonly pinError = signal('');

  tryUnlock(): void {
    if (this.pinSvc.tryUnlock(this.pinInput())) {
      this.pinInput.set('');
      this.pinError.set('');
    } else {
      this.pinError.set('קוד שגוי, נסה שוב');
      this.pinInput.set('');
      setTimeout(() => this.pinError.set(''), 2200);
    }
  }

  lock(): void { this.pinSvc.lock(); }

  // ── Category ──
  readonly activeCat = signal<string | null>(null);
  readonly searchQ = signal('');

  readonly sortedCats = computed((): [string, MenuCategory][] => {
    const m = this.menuSvc.menuResource.value();
    if (!m) return [];
    return Object.entries(m).sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0));
  });

  readonly activeCatData = computed((): MenuCategory | null => {
    const m = this.menuSvc.menuResource.value();
    const k = this.activeCat();
    return m && k ? (m[k] ?? null) : null;
  });

  readonly filteredItems = computed((): MenuItem[] => {
    const cat = this.activeCatData();
    if (!cat) return [];
    const q = this.searchQ().trim().toLowerCase();
    const items = Object.values(cat.items ?? {});
    return q ? items.filter(i => i.name.toLowerCase().includes(q) || (i.desc ?? '').toLowerCase().includes(q)) : items;
  });

  selectCat(key: string): void {
    this.activeCat.set(key);
    this.searchQ.set('');
  }

  deleteCat(key: string): void {
    const cat = this.menuSvc.menuResource.value()?.[key];
    if (!cat) return;
    const n = Object.keys(cat.items ?? {}).length;
    this.confirm().ask(
      `למחוק את הקטגוריה "${cat.title}"${n ? ` יחד עם ${n} מנות` : ''}?`,
      async () => {
        await this.menuSvc.deleteCategory(key);
        if (this.activeCat() === key) this.activeCat.set(this.sortedCats()[0]?.[0] ?? null);
        this.toast().show('הקטגוריה נמחקה', 'success');
      }
    );
  }

  // ── Category Modal ──
  readonly catModalOpen = signal(false);
  readonly cfTitle = signal('');
  readonly cfIcon = signal('');
  readonly cfSub = signal('');

  openCatModal(): void { this.cfTitle.set(''); this.cfIcon.set(''); this.cfSub.set(''); this.catModalOpen.set(true); }
  closeCatModal(): void { this.catModalOpen.set(false); }

  async saveCat(): Promise<void> {
    const title = this.cfTitle().trim();
    if (!title) { this.toast().show('יש להזין שם קטגוריה', 'danger'); return; }
    const icon = this.cfIcon().trim() || '📋';
    const sub = this.cfSub().trim();
    let key = slugify(title) || ('cat' + Date.now());
    const m = this.menuSvc.menuResource.value() ?? {};
    let unique = key, n = 2;
    while (m[unique]) unique = key + n++;
    const newCat: MenuCategory = { icon, title, sub, order: this.sortedCats().length, items: {} };
    await this.menuSvc.addCategory(unique, newCat);
    this.activeCat.set(unique);
    this.closeCatModal();
    this.toast().show('הקטגוריה נוספה', 'success');
  }

  // ── Item Modal ──
  readonly itemModalOpen = signal(false);
  readonly editingId = signal<number | null>(null);

  readonly fName = signal('');
  readonly fDesc = signal('');
  readonly fPrice = signal(0);
  readonly fTargetCat = signal('');
  readonly fHasSpreads = signal(false);
  readonly fHasVeggies = signal(false);
  readonly fHasSauces = signal(false);
  readonly fHasExtras = signal(false);
  readonly fHasSizeOption = signal(false);
  readonly fHasBurgerSize = signal(false);
  readonly fSizes = signal<Size[]>([]);
  readonly fBSizes = signal<Size[]>([]);

  // Image upload
  readonly imagePreview = signal<string | null>(null);
  readonly imageFile = signal<File | null>(null);
  readonly uploading = signal(false);

  openItemModal(id?: number): void {
    const cat = this.activeCatData();
    if (!cat && !id) { this.toast().show('הוסף קטגוריה קודם', 'danger'); return; }
    this.editingId.set(id ?? null);
    this.fTargetCat.set(this.activeCat() ?? '');
    this.imageFile.set(null);

    if (id != null) {
      const item = cat?.items?.[id];
      if (!item) return;
      this.fName.set(item.name);
      this.fDesc.set(item.desc ?? '');
      this.fPrice.set(item.basePrice);
      this.fHasSpreads.set(item.hasSpreads ?? false);
      this.fHasVeggies.set(item.hasVeggies ?? false);
      this.fHasSauces.set(item.hasSauces ?? false);
      this.fHasExtras.set(item.hasExtras ?? false);
      this.fHasSizeOption.set(item.hasSizeOption ?? false);
      this.fHasBurgerSize.set(item.hasBurgerSize ?? false);
      this.fSizes.set(item.sizes ? [...item.sizes] : []);
      this.fBSizes.set(item.burgerSizes ? [...item.burgerSizes] : []);
      this.imagePreview.set(item.imageUrl ?? null);
    } else {
      this.fName.set(''); this.fDesc.set(''); this.fPrice.set(0);
      this.fHasSpreads.set(false); this.fHasVeggies.set(false);
      this.fHasSauces.set(false); this.fHasExtras.set(false);
      this.fHasSizeOption.set(false); this.fHasBurgerSize.set(false);
      this.fSizes.set([]); this.fBSizes.set([]);
      this.imagePreview.set(null);
    }
    this.itemModalOpen.set(true);
  }

  closeItemModal(): void { this.itemModalOpen.set(false); }

  onImagePicked(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.imageFile.set(file);
    const reader = new FileReader();
    reader.onload = () => this.imagePreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  addSize(): void { this.fSizes.update(s => [...s, { label: '', price: 0 }]); }
  removeSize(i: number): void { this.fSizes.update(s => s.filter((_, idx) => idx !== i)); }
  updateSizeLabel(i: number, v: string): void { this.fSizes.update(s => s.map((x, idx) => idx === i ? { ...x, label: v } : x)); }
  updateSizePrice(i: number, v: number): void { this.fSizes.update(s => s.map((x, idx) => idx === i ? { ...x, price: v } : x)); }

  addBSize(): void { this.fBSizes.update(s => [...s, { label: '', price: 0 }]); }
  removeBSize(i: number): void { this.fBSizes.update(s => s.filter((_, idx) => idx !== i)); }
  updateBSizeLabel(i: number, v: string): void { this.fBSizes.update(s => s.map((x, idx) => idx === i ? { ...x, label: v } : x)); }
  updateBSizePrice(i: number, v: number): void { this.fBSizes.update(s => s.map((x, idx) => idx === i ? { ...x, price: v } : x)); }

  async saveItem(): Promise<void> {
    const name = this.fName().trim();
    if (!name) { this.toast().show('יש להזין שם מנה', 'danger'); return; }
    const targetCat = this.fTargetCat();
    const id = this.editingId() ?? this.menuSvc.nextItemId();

    let imageUrl: string | undefined;
    const file = this.imageFile();
    if (file) {
      this.uploading.set(true);
      try {
        imageUrl = await this.storageSvc.uploadItemImage(targetCat, id, file);
      } finally {
        this.uploading.set(false);
      }
    } else {
      // keep existing
      const existing = this.activeCatData()?.items?.[id];
      imageUrl = existing?.imageUrl;
    }

    const item: MenuItem = {
      id, name, desc: this.fDesc().trim(), basePrice: this.fPrice(),
      ...(imageUrl ? { imageUrl } : {}),
      hasSpreads: this.fHasSpreads() || undefined,
      hasVeggies: this.fHasVeggies() || undefined,
      hasSauces: this.fHasSauces() || undefined,
      hasExtras: this.fHasExtras() || undefined,
      hasSizeOption: this.fHasSizeOption() || undefined,
      hasBurgerSize: this.fHasBurgerSize() || undefined,
      sizes: this.fHasSizeOption() ? this.fSizes().filter(s => s.label.trim()) : undefined,
      burgerSizes: this.fHasBurgerSize() ? this.fBSizes().filter(s => s.label.trim()) : undefined,
    };
    // clean undefineds
    (Object.keys(item) as (keyof MenuItem)[]).forEach(k => item[k] === undefined && delete item[k]);

    await this.menuSvc.saveItem(targetCat, item);
    this.closeItemModal();
    this.toast().show(this.editingId() != null ? 'המנה עודכנה' : 'המנה נוספה', 'success');
  }

  deleteItem(id: number): void {
    const item = this.activeCatData()?.items?.[id];
    if (!item) return;
    this.confirm().ask(`למחוק את "${item.name}"?`, async () => {
      const catKey = this.activeCat()!;
      await this.menuSvc.deleteItem(catKey, id);
      if (item.imageUrl) await this.storageSvc.deleteItemImage(catKey, id).catch(() => {});
      this.toast().show('המנה נמחקה', 'success');
    });
  }

  // ── Export / Import / Reset ──
  exportJSON(): void {
    const blob = new Blob([JSON.stringify(this.menuSvc.menuResource.value(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `toroz-menu-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    this.toast().show('הקובץ יוצא בהצלחה', 'success');
  }

  importJSON(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result as string) as MenuData;
        if (typeof data !== 'object' || !data) throw new Error('bad');
        this.confirm().ask('ייבוא יחליף את התפריט הקיים. להמשיך?', async () => {
          await this.menuSvc.importMenu(data);
          this.activeCat.set(Object.keys(data)[0] ?? null);
          this.toast().show('התפריט יובא בהצלחה', 'success');
        });
      } catch { this.toast().show('קובץ לא תקין', 'danger'); }
    };
    r.readAsText(file);
    (event.target as HTMLInputElement).value = '';
  }

  resetDefaults(): void {
    this.confirm().ask('לאפס את התפריט לערכי ברירת המחדל? כל השינויים יימחקו.', async () => {
      await this.menuSvc.resetToDefaults();
      this.toast().show('התפריט אופס', 'success');
    });
  }
}

function slugify(s: string): string {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
