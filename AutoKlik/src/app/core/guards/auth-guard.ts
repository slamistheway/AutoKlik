import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import {Auth} from '../../features/auth/auth';


export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  const token = localStorage.getItem('sessionApiToken');

  if (token) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
