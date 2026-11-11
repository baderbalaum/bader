import { Injectable, signal } from '@angular/core';

const PIN_KEY = 'toroz_admin_pin';
const SESSION_KEY = 'toroz_admin_session';
const DEFAULT_PIN = '1234';

@Injectable({ providedIn: 'root' })
export class PinService {
  readonly isAuthenticated = signal(sessionStorage.getItem(SESSION_KEY) === '1');

  getPin(): string {
    return localStorage.getItem(PIN_KEY) ?? DEFAULT_PIN;
  }

  tryUnlock(input: string): boolean {
    if (input === this.getPin()) {
      sessionStorage.setItem(SESSION_KEY, '1');
      this.isAuthenticated.set(true);
      return true;
    }
    return false;
  }

  lock(): void {
    sessionStorage.removeItem(SESSION_KEY);
    this.isAuthenticated.set(false);
  }
}
