import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { PinService } from '../services/pin.service';

export const adminGuard: CanActivateFn = () => {
  return inject(PinService).isAuthenticated();
};
