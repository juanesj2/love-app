import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LoveApiService } from '../services/love-api.service';

export const authGuard: CanActivateFn = (route, state) => {
  const api = inject(LoveApiService);
  const router = inject(Router);

  // If we have a token, allow access
  if (api.token$.value) {
    return true;
  }
  
  // Otherwise, redirect to login
  return router.parseUrl('/login');
};
