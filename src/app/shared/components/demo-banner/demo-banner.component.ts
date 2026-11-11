import { Component, ChangeDetectionStrategy } from '@angular/core';
import { environment } from '../../../../environments/environment';

/** Shown only in the offline demo build so nobody mistakes it for the real ordering app. */
@Component({
  selector: 'app-demo-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (demo) {
      <div class="demo">גרסת הדגמה · ההזמנות לא נשלחות למסעדה · המעקב מתקדם לבד</div>
    }
  `,
  styles: [`
    .demo {
      background: var(--amber); color: var(--dark); text-align: center;
      font-size: .75rem; font-weight: 900; padding: 6px 16px;
    }
  `],
})
export class DemoBannerComponent {
  readonly demo = environment.demo;
}
