import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-brand-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="brand">
      <img class="brand-logo" [style.width.px]="size()" [style.height.px]="size()" src="Toroz.jpg" alt="TOROZ"/>
      <div class="brand-text">
        <div class="b1">טורוז מיט</div>
        <div class="b2">{{ subtitle() }}</div>
      </div>
    </div>
  `,
  styles: [`
    .brand { display:flex;align-items:center;gap:14px; }
    .brand-logo { object-fit:cover;border-radius:50%; }
    .brand-text { line-height:1.1; }
    .b1 { color:var(--gold);font-weight:900;font-size:1.05rem; }
    .b2 { color:var(--muted);font-size:.7rem;letter-spacing:.12em; }
  `],
})
export class BrandMarkComponent {
  readonly size = input(42);
  readonly subtitle = input('');
}
