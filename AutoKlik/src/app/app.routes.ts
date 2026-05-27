import { inject } from '@angular/core';
import { CanActivateFn, Routes, Router } from '@angular/router';
import { HomeComponent } from './features/home/home';
import { CarsComponent} from './features/cars/cars';
import { LoginPage } from './features/login-page/login-page';
import { RegisterPage } from './features/register-page/register-page';
import { MyAds } from './features/my-ads/my-ads';
import { MyMessages } from './features/my-messages/my-messages';
import { MyProfile } from './features/my-profile/my-profile';
import { MySavedAds } from './features/my-saved-ads/my-saved-ads';
import { MySettings } from './features/my-settings/my-settings';
import { Ad } from './features/ad/ad';
import { Pretrazi } from './features/pretrazi/pretrazi';
import { VehicleCategory } from './features/checkout/vehicle-category/vehicle-category';
import { Details } from './features/checkout/details/details';
import { PaymentOptions } from './features/checkout/payment-options/payment-options';
import { CheckoutStateService } from './features/checkout/checkout-state.service';
import { AdPostedSuccessfully } from './features/checkout/ad-posted-successfully/ad-posted-successfully';


/*------------------------AUTHORIZATION GUARD-----------------------*/
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('sessionApiToken');

  if (token) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const guestOnlyGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('sessionApiToken');

  if (token) {
    return router.createUrlTree(['/']);
  }

  return true;
};


/*------------------------CHECKOUT NAVIGATING GUARD-----------------------*/
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


/*------------------------RUTE-----------------------*/
export const routes: Routes = [
  { path: '', pathMatch: "full", component: HomeComponent },
  { path: 'cars', component: CarsComponent },
  { path: 'login', component: LoginPage, canActivate: [guestOnlyGuard] },
  { path: 'register', component: RegisterPage, canActivate: [guestOnlyGuard] },
  { path: 'ad/:id', component: Ad },
  { path: 'pretrazi', component: Pretrazi},
  {
    path: 'checkout',
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'vehicle-category' },
      { path: 'vehicle-category', component: VehicleCategory },
      { path: 'details', component: Details, canActivate: [categoryCompletedGuard] },
      { path: 'payment-options', component: PaymentOptions, canActivate: [detailsCompletedGuard] },
      { path: 'ad-posted-successfully', component: AdPostedSuccessfully },
      { path: '**', redirectTo: 'vehicle-category' },
    ],
  },
  { path: 'my-profile', component: MyProfile, canActivate: [authGuard] },
  { path: 'my-ads', component: MyAds, canActivate: [authGuard] },
  { path: 'my-messages', component: MyMessages, canActivate: [authGuard] },
  { path: 'my-saved-ads', component: MySavedAds, canActivate: [authGuard] },
  { path: 'my-settings', component: MySettings, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
