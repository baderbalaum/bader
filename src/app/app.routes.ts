import { Routes } from '@angular/router';
import { staffGuard } from './core/guards/staff.guard';

export const routes: Routes = [
  // Customer app (public link) is the default; the in-store screens keep their own paths.
  { path: '', redirectTo: 'order', pathMatch: 'full' },
  {
    path: 'order',
    title: 'טורוז מיט – הזמנת משלוח',
    loadComponent: () =>
      import('./features/customer/menu/customer-menu.component').then(m => m.CustomerMenuComponent),
  },
  {
    path: 'order/checkout',
    title: 'טורוז מיט – הסל שלי',
    loadComponent: () =>
      import('./features/customer/checkout/checkout.component').then(m => m.CheckoutComponent),
  },
  {
    path: 'track/:id',
    title: 'טורוז מיט – מעקב הזמנה',
    loadComponent: () =>
      import('./features/customer/track/track.component').then(m => m.TrackComponent),
  },
  {
    path: 'kiosk',
    canActivate: [staffGuard],
    loadComponent: () =>
      import('./features/kiosk/kiosk-shell.component').then(m => m.KioskShellComponent),
  },
  {
    path: 'kitchen',
    canActivate: [staffGuard],
    loadComponent: () =>
      import('./features/kitchen/kitchen.component').then(m => m.KitchenComponent),
  },
  {
    path: 'admin',
    canActivate: [staffGuard],
    loadComponent: () =>
      import('./features/admin/admin-shell.component').then(m => m.AdminShellComponent),
  },
  {
    path: 'login',
    title: 'טורוז מיט – כניסת צוות',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent),
  },
  { path: '**', redirectTo: 'order' },
];
