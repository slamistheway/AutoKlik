import { inject } from '@angular/core';
import { CanActivateFn, Routes, Router } from '@angular/router';
import { VehicleCategory } from './vehicle-category/vehicle-category';
import { Details } from './details/details';
import { PaymentOptions } from './payment-options/payment-options';
import { CheckoutStateService } from './checkout-state.service';
import { AdPostedSuccessfully } from './ad-posted-successfully/ad-posted-successfully';

const categoryCompletedGuard: CanActivateFn = () => {
  const checkoutState = inject(CheckoutStateService);
  if (checkoutState.hasCategoryState()) {
    return true;
  }

  return inject(Router).createUrlTree(['/checkout/vehicle-category']);
};

const detailsCompletedGuard: CanActivateFn = () => {
  const checkoutState = inject(CheckoutStateService);
  if (checkoutState.hasCategoryState() && checkoutState.hasDetailsState()) {
    return true;
  }

  return inject(Router).createUrlTree(['/checkout/details']);
};

export const checkoutRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'vehicle-category' },
  { path: 'vehicle-category', component: VehicleCategory },
  { path: 'details', component: Details, canActivate: [categoryCompletedGuard] },
  { path: 'payment-options', component: PaymentOptions, canActivate: [detailsCompletedGuard] },
  { path: 'ad-posted-successfully', component: AdPostedSuccessfully },
  { path: 'steps/veichle-category', redirectTo: 'vehicle-category', pathMatch: 'full' },
  { path: 'steps/details', redirectTo: 'details', pathMatch: 'full' },
  { path: '**', redirectTo: 'vehicle-category', pathMatch: 'full' },
];
