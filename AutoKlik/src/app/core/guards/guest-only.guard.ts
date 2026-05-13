import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const guestOnlyGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('sessionApiToken');

  if (token) {
    return router.createUrlTree(['/']);
  }

  return true;
};

