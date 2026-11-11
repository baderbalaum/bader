import { Component, ChangeDetectionStrategy, input, output, signal, computed, OnInit } from '@angular/core';
import { MenuItem, MenuMeta, CustomSelections, Extra } from '../../../../core/models/menu.model';
import { CartItem } from '../../../../core/models/order.model';
import { MENU_META_SEED } from '../../../../core/services/menu.service';

@Component({
  selector: 'app-item-customizer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './item-customizer.component.html',
  styleUrl: './item-customizer.component.scss',
})
export class ItemCustomizerComponent implements OnInit {
  readonly item = input.required<MenuItem>();
  readonly meta = input<MenuMeta | undefined>(undefined);
  readonly added = output<CartItem>();
  readonly closed = output<void>();

  readonly qty = signal(1);
  readonly sel = signal<CustomSelections>({
    size: null, burgerSize: null,
    spreads: [], veggies: [], sauces: [],
    extras: [], globalExtras: [], burgerExtras: [],
  });

  readonly unitPrice = computed(() => this.calcPrice(this.item(), this.sel()));

  get effectiveMeta(): MenuMeta { return this.meta() ?? MENU_META_SEED; }

  ngOnInit(): void {
    const it = this.item();
    this.sel.update(s => ({
      ...s,
      size: it.hasSizeOption ? 0 : null,
      burgerSize: it.hasBurgerSize ? 0 : null,
      veggies: it.defaultVeggies ? [...it.defaultVeggies] : [],
      sauces: it.defaultSauces ? [...it.defaultSauces] : [],
    }));
  }

  setSize(i: number): void { this.sel.update(s => ({ ...s, size: i })); }
  setBurgerSize(i: number): void { this.sel.update(s => ({ ...s, burgerSize: i })); }

  toggleSpread(v: string): void  { this.sel.update(s => ({ ...s, spreads: toggle(s.spreads, v) })); }
  toggleVeggie(v: string): void  { this.sel.update(s => ({ ...s, veggies: toggle(s.veggies, v) })); }
  toggleSauce(v: string): void   { this.sel.update(s => ({ ...s, sauces: toggle(s.sauces, v) })); }
  toggleExtra(i: number): void   { this.sel.update(s => ({ ...s, extras: toggleIdx(s.extras, i) })); }
  toggleGlobalExtra(i: number): void { this.sel.update(s => ({ ...s, globalExtras: toggleIdx(s.globalExtras, i) })); }
  toggleBurgerExtra(i: number): void { this.sel.update(s => ({ ...s, burgerExtras: toggleIdx(s.burgerExtras, i) })); }

  changeQty(d: number): void { this.qty.update(q => Math.max(1, q + d)); }

  addToCart(): void {
    const it = this.item();
    const s = this.sel();
    const meta = this.effectiveMeta;

    const details: string[] = [];
    if (it.hasBurgerSize && s.burgerSize != null && it.burgerSizes?.[s.burgerSize]) details.push(it.burgerSizes[s.burgerSize].label);
    else if (it.hasSizeOption && s.size != null && it.sizes?.[s.size]) details.push(it.sizes[s.size].label);
    if (s.spreads.length)      details.push(`ממרחים: ${s.spreads.join(', ')}`);
    if (s.veggies.length)      details.push(`ירקות: ${s.veggies.join(', ')}`);
    if (s.sauces.length)       details.push(`רוטב: ${s.sauces.join(', ')}`);
    const extLabels = s.extras.map(i => it.extras?.[i]?.label ?? '');
    const gExtLabels = s.globalExtras.map(i => meta.extras[i]?.label ?? '');
    const bExtLabels = s.burgerExtras.map(i => it.burgerExtras?.[i]?.label ?? '');
    const allExtras = [...extLabels, ...gExtLabels, ...bExtLabels];
    if (allExtras.length) details.push(`תוספות: ${allExtras.join(', ')}`);

    this.added.emit({ id: Date.now(), name: it.name, details, unitPrice: this.unitPrice(), qty: this.qty() });
  }

  private calcPrice(item: MenuItem, sel: CustomSelections): number {
    let p = 0;
    const bs = item.burgerSizes?.[sel.burgerSize ?? 0];
    if (item.hasBurgerSize && sel.burgerSize != null && bs) {
      p = item.specialPrice ? ((item.burgerSizes?.[0]?.price ?? 0) + bs.price) : bs.price;
    } else if (item.hasSizeOption && sel.size != null && item.sizes?.[sel.size]) {
      p = item.sizes[sel.size].price;
    } else {
      p = item.basePrice;
    }
    const meta = this.effectiveMeta;
    sel.extras.forEach(i => { p += (item.extras?.[i]?.price ?? 0); });
    sel.globalExtras.forEach(i => { p += (meta.extras[i]?.price ?? 0); });
    sel.burgerExtras.forEach(i => { p += (item.burgerExtras?.[i]?.price ?? 0); });
    return p;
  }

  onBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('customizer-bg')) this.closed.emit();
  }
}

function toggle(arr: string[], v: string): string[] {
  return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
}
function toggleIdx(arr: number[], i: number): number[] {
  return arr.includes(i) ? arr.filter(x => x !== i) : [...arr, i];
}
