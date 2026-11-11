import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

export type ToastKind = 'success' | 'danger' | '';

@Component({
  selector: 'app-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast" [class.show]="visible()" [class.success]="kind() === 'success'" [class.danger]="kind() === 'danger'">
      {{ message() }}
    </div>
  `,
  styles: [`
    .toast {
      position: fixed; bottom: 24px; left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: var(--dark); border: 1px solid var(--gold); color: var(--cream);
      padding: 12px 22px; border-radius: 999px;
      font-size: .9rem; font-weight: 700;
      box-shadow: 0 10px 40px rgba(0,0,0,.5);
      opacity: 0; pointer-events: none;
      transition: opacity .2s, transform .2s;
      z-index: 200;
    }
    .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
    .toast.success { border-color: var(--green); }
    .toast.danger  { border-color: var(--danger); }
  `],
})
export class ToastComponent {
  readonly message = signal('');
  readonly kind = signal<ToastKind>('');
  readonly visible = signal(false);

  private timer: ReturnType<typeof setTimeout> | null = null;

  show(msg: string, kind: ToastKind = '', duration = 2200): void {
    if (this.timer) clearTimeout(this.timer);
    this.message.set(msg);
    this.kind.set(kind);
    this.visible.set(true);
    this.timer = setTimeout(() => this.visible.set(false), duration);
  }
}
