import {Component, OnInit} from '@angular/core';
import { NavbarComponent } from '../../shared/layout/navbar/navbar';
import { Footer } from '../../shared/layout/footer/footer';
import {MyProfileAside} from '../../shared/layout/my-profile-aside/my-profile-aside';
import {CommonModule} from '@angular/common';
import {BehaviorSubject, filter, finalize, Observable, of, Subject, take, timeout} from 'rxjs';
import {CurrentUser} from '../../models/current-user.model';
import {Auth} from '../auth/auth';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {
  clampPage,
  getAdImageUrl, getCategoryLabel, getPageNumbers, getPaginatedItems, getSubcategoryLabel, getTotalPages,
  ToastType, SaveToast, getToastCSS as getToastCSSFn, getSaveErrorMessage as getSaveErrorMessageFn, getToastCSS,
  enqueueToast, dismissToast, saveAdToasts
} from '../../shared/functions/shared-functions';
import {RouterLink} from '@angular/router';



interface MySavedAd {
  ad_id: number;
  user_id: number;
  category: string;
  subcategory: string;
  brand: string;
  model: string;
  title: string;
  description: string;
  year: number;
  created_at: string;
  updated_at: string;
  saved_ad_id: string;
  images: string[];
}


interface AdSaveResponse {
  message: string;
  saved?: boolean;
  deleted?: boolean;
}

@Component({
  selector: 'app-my-saved-ads',
  imports: [CommonModule, NavbarComponent, Footer, MyProfileAside, RouterLink],
  templateUrl: './my-saved-ads.html',
})

export class MySavedAds implements OnInit {
  currentUser$: Observable<CurrentUser | null> = of(null);
  currentUser: CurrentUser = {
    id: 0,
    username: 'guest',
    email: '',
    pfp: 'default-pfp.jpg',
  };

  mySavedAds$ = new BehaviorSubject<MySavedAd[] | null>(null);
  readonly adsPerPage = 5;
  currentPage = 1;
  errorMessage$ = new Subject<string>();
  successMessage$ = new Subject<string>();
  isLoading$ = new Subject<boolean>();
  private isRequestInFlight = false;
  readonly saveToasts$ = saveAdToasts;

  constructor(
    private readonly auth: Auth,
    private readonly http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.auth.loadUser();
    this.currentUser$ = this.auth.user$;
    this.currentUser$
      .pipe(
        filter((user): user is CurrentUser => Boolean(user?.id)),
        take(1),
      )
      .subscribe((user) => {
        this.currentUser = user;
        this.saveAdButton$.next(user.id > 0);
        console.log('current user id:', user.id);
        this.loadMyAds(user.id);
      });
  }



  /*------------SAVE AD BUTTON----------------*/
  saveAdButton$ = new BehaviorSubject<boolean>(true);
  private readonly unsavedAdIds = new Set<number>();
  toggleSaveAd(adId: number): void {
    if (this.currentUser.id <= 0) {
      return;
    }

    const wasSaved = !this.unsavedAdIds.has(adId);
    const request$ = wasSaved
      ? this.http.delete<AdSaveResponse>(`http://localhost:3000/ad/save/${adId}`)
      : this.http.post<AdSaveResponse>(`http://localhost:3000/ad/save/${adId}`, {});

    request$.subscribe({
      next: () => {
        if (wasSaved) {
          this.unsavedAdIds.add(adId);
          enqueueToast('Oglas je uklonjen iz spremljenih.', 'info');
        } else {
          this.unsavedAdIds.delete(adId);
          enqueueToast('Oglas je spremljen.', 'success');
        }
        this.updateAdSavedFlag(adId, !wasSaved);
      },
      error: (error: HttpErrorResponse) => {
        enqueueToast(getSaveErrorMessageFn(error), 'error');
      },
    });
  }

  isAdSaved(adId: number): boolean {
    if (this.unsavedAdIds.has(adId)) {
      return false;
    }

    return (this.mySavedAds$.value ?? []).some((ad) => ad.ad_id === adId);
  }


  private updateAdSavedFlag(adId: number, isSaved: boolean): void {
    const ads = this.mySavedAds$.value;

    if (ads == null) {
      return;
    }

    this.mySavedAds$.next(
      ads.map((ad) => (ad.ad_id === adId ? { ...ad, is_saved: isSaved } : ad)),
    );
   }

   /*---------------------------- TOASTS -------------------------------------*/

   getToastCSS(type: ToastType): string {
     return getToastCSSFn(type);
   }


  get totalPages(): number {
    return getTotalPages(this.mySavedAds$.value, this.adsPerPage);
  }

  get pageNumbers(): number[] {
    return getPageNumbers(this.totalPages);
  }

  get pagedAds(): MySavedAd[] {
    return getPaginatedItems(this.mySavedAds$.value, this.currentPage, this.adsPerPage);
  }


  goToPage(page: number): void {
    this.currentPage = clampPage(page, this.totalPages);
  }

  goToPreviousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  goToNextPage(): void {
    this.goToPage(this.currentPage + 1);
  }


  private loadMyAds(_userId: number): void {
    if (this.isRequestInFlight) {
      return;
    }

    const token = localStorage.getItem('sessionApiToken');
    if (!token) {
      this.isLoading$.next(false);
      this.errorMessage$.next('Morate biti prijavljeni da biste vidjeli svoje oglase.');
      this.mySavedAds$.next([]);
      this.currentPage = 1;
      return;
    }

    this.isLoading$.next(true);
    this.isRequestInFlight = true;
    this.errorMessage$.next("");

    this.http
      .get<MySavedAd[]>('http://localhost:3000/ad/me/saved')
      .pipe(timeout(10000))
      .pipe(finalize(() => {
        this.isLoading$.next(false);
        this.isRequestInFlight = false;
      }))
      .subscribe({
        next: (ads) => {
          this.mySavedAds$.next(ads);
          console.log(this.mySavedAds$.value);
          this.currentPage = 1;
        },
        error: (error: unknown) => {
          this.errorMessage$.next(this.getLoadErrorMessage(error));
          this.mySavedAds$.next([]);
          this.currentPage = 1;
        },
      });
  }

  private getLoadErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 403) {
        return 'Vaša prijava je istekla. Molimo prijavite se ponovo.';
      }

      if (error.status === 404) {
        return 'Ruta za učitavanje oglasa nije pronađena.';
      }

      if (error.status === 0) {
        return 'Server nije dostupan..';
      }

      return `Neuspješno učitavanje oglasa (greška ${error.status}).`;
    }

    if (error instanceof Error && error.name === 'TimeoutError') {
      return 'Učitavanje oglasa traje predugo. Pokušajte ponovo.';
    }

    return 'Nije moguće učitati vaše oglase. Pokušajte ponovo.';
  }


  protected readonly getSubcategoryLabel = getSubcategoryLabel;
  protected readonly getCategoryLabel = getCategoryLabel;
  protected readonly getAdImageUrl = getAdImageUrl;
}
