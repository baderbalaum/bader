import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'kiosk', pathMatch: 'full' },
  {
    path: 'kiosk',
    loadComponent: () =>
      import('./features/kiosk/kiosk-shell.component').then(m => m.KioskShellComponent),
  },
  {
    path: 'kitchen',
    loadComponent: () =>
      import('./features/kitchen/kitchen.component').then(m => m.KitchenComponent),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin-shell.component').then(m => m.AdminShellComponent),
  },
  { path: '**', redirectTo: 'kiosk' },
];
