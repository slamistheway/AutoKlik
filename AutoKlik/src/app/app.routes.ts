import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home';
import { CarsComponent} from './features/cars/cars';
import { LoginPage } from './features/auth/login/login-page/login-page';
import { RegisterPage } from './features/auth/register/register-page/register-page';
import { MyAds } from './features/my-ads/my-ads';
import { MyMessages } from './features/my-messages/my-messages';
import { MyProfile } from './features/my-profile/my-profile';
import { MySavedAds } from './features/my-saved-ads/my-saved-ads';
import { MySettings } from './features/my-settings/my-settings';
import { authGuard } from './core/guards/auth-guard';
import { guestOnlyGuard } from './core/guards/guest-only.guard';
import { Ad } from './features/ad/ad';
import { Pretrazi } from './features/pretrazi/pretrazi';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'cars', component: CarsComponent },
  { path: 'login', component: LoginPage, canActivate: [guestOnlyGuard] },
  { path: 'register', component: RegisterPage, canActivate: [guestOnlyGuard] },
  { path: 'ad/:id', component: Ad },
  { path: 'pretrazi', component: Pretrazi},
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadChildren: () => import('./features/checkout/checkout.routes').then((m) => m.checkoutRoutes),
  },
  { path: 'my-profile', component: MyProfile, canActivate: [authGuard] },
  { path: 'my-ads', component: MyAds, canActivate: [authGuard] },
  { path: 'my-messages', component: MyMessages, canActivate: [authGuard] },
  { path: 'my-saved-ads', component: MySavedAds, canActivate: [authGuard] },
  { path: 'my-settings', component: MySettings, canActivate: [authGuard] },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
