import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Kitchen, admin and kiosk are for signed-in staff only. */
export const staffGuard: CanActivateFn = async (_route, state) => {
  const router = inject(Router);
  if (await inject(AuthService).isStaff()) return true;
  return router.createUrlTree(['/login'], { queryParams: { next: state.url } });
};
