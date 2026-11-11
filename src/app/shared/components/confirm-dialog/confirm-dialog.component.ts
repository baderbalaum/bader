import { Component, ChangeDetectionStrategy, signal, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="modal-bg open" (click)="onBackdrop($event)">
        <div class="modal">
          <h3>{{ title() }}</h3>
          <div class="modal-b">{{ message() }}</div>
          <div class="modal-f">
            <button class="btn" (click)="cancel()">ביטול</button>
            <button class="btn primary" (click)="confirm()">אישור</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-bg { position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:20px;z-index:150;backdrop-filter:blur(6px); }
    .modal { background:var(--card);border:1px solid var(--border);border-radius:18px;width:min(420px,100%);box-shadow:0 30px 80px rgba(0,0,0,.6); }
    h3 { color:var(--gold);padding:18px 22px;border-bottom:1px solid var(--border);font-size:1.1rem; }
    .modal-b { padding:18px 22px;line-height:1.5; }
    .modal-f { padding:14px 22px;border-top:1px solid var(--border);display:flex;gap:10px;justify-content:flex-end; }
  `],
})
export class ConfirmDialogComponent {
  readonly open = signal(false);
  readonly title = signal('אישור');
  readonly message = signal('האם אתה בטוח?');
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private onYes: (() => void) | null = null;

  ask(msg: string, onYes: () => void, title = 'אישור'): void {
    this.title.set(title);
    this.message.set(msg);
    this.onYes = onYes;
    this.open.set(true);
  }

  confirm(): void {
    this.open.set(false);
    this.onYes?.();
    this.onYes = null;
  }

  cancel(): void {
    this.open.set(false);
    this.onYes = null;
  }

  onBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-bg')) this.cancel();
  }
}
