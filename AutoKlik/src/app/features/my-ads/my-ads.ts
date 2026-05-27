import { Component, OnInit } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {BehaviorSubject, filter, finalize, Observable, of, Subject, take, timeout} from 'rxjs';
import { CurrentUser } from '../../models/current-user.model';
import { Auth } from '../../core/services/auth';

import { NavbarComponent } from '../../shared/layout/navbar/navbar';
import { Footer } from '../../shared/layout/footer/footer';
import { MyProfileAside } from '../../shared/layout/my-profile-aside/my-profile-aside';
import {
  clampPage, enqueueToast,
  getAdImageUrl,
  getCategoryLabel,
  getPageNumbers,
  getPaginatedItems, getSaveErrorMessage as getSaveErrorMessageFn,
  getSubcategoryLabel,
  getTotalPages,
} from '../../shared/functions/shared-functions';

interface MyAd {
  id: number;
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
  images?: string[];
}

interface AdSaveResponse {
  message: string;
  saved?: boolean;
  deleted?: boolean;
}

interface AdSavedStatusResponse {
  isSaved: boolean;
}

@Component({
  selector: 'app-my-ads',
  standalone: true,
  templateUrl: './my-ads.html',
  imports: [
    CommonModule,
    NavbarComponent,
    Footer,
    AsyncPipe,
    MyProfileAside,
    RouterLink,
  ],
})
export class MyAds implements OnInit {
  currentUser$: Observable<CurrentUser | null> = of(null);
  myAds$ = new BehaviorSubject<MyAd[] | null>(null);
  readonly adsPerPage = 5;
  currentPage = 1;
  errorMessage$ = new Subject<string>();
  successMessage$ = new Subject<string>();
  isLoading$ = new Subject<boolean>();
  private isRequestInFlight = false;
  readonly getCategoryLabel = getCategoryLabel;
  readonly getSubcategoryLabel = getSubcategoryLabel;
  readonly getAdImageUrl = getAdImageUrl;

  /*SAVE AD BUTTON*/



  constructor(
    private readonly auth: Auth,
    private readonly http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.auth.loadUser();
    this.currentUser$ = this.auth.currentUser$;
    this.currentUser$
      .pipe(
        filter((user): user is CurrentUser => Boolean(user?.id)),
        take(1),
      )
      .subscribe((user) => this.loadMyAds(user.id));
  }

  get totalPages(): number {
    return getTotalPages(this.myAds$.value, this.adsPerPage);
  }

  get pageNumbers(): number[] {
    return getPageNumbers(this.totalPages);
  }

  get pagedAds(): MyAd[] {
    return getPaginatedItems(this.myAds$.value, this.currentPage, this.adsPerPage);
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


  async deleteAd(adId: number, userId: number) {
    const request$ = this.http.delete<void>(
      `http://localhost:3000/ad/delete/${adId}`
    );

    request$.subscribe({
      next: () => {
        enqueueToast('Oglas je izbrisan.', 'info');

        this.myAds$.next(
          this.myAds$.value?.filter(ad => ad.id !== adId) || []
        );
      },
      error: (error: HttpErrorResponse) => {
        enqueueToast(getSaveErrorMessageFn(error), 'error');
      },
    });
  }

  confirmDelete(adId: number, userId: number): void {
    if (confirm('Jeste li sigurni da želite izbrisati ovaj oglas? Ova radnja se ne može poništiti.')) {
      this.deleteAd(adId, userId);
    }
  }




  private loadMyAds(_userId: number): void {
    if (this.isRequestInFlight) {
      return;
    }

    const token = localStorage.getItem('sessionApiToken');
    if (!token) {
      this.isLoading$.next(false);
      this.errorMessage$.next('Morate biti prijavljeni da biste vidjeli svoje oglase.');
      this.myAds$.next([]);
      this.currentPage = 1;
      return;
    }

    this.isLoading$.next(true);
    this.isRequestInFlight = true;
    this.errorMessage$.next("");

    this.http
      .get<MyAd[]>('http://localhost:3000/ad/me')
      .pipe(timeout(10000))
      .pipe(finalize(() => {
        this.isLoading$.next(false);
        this.isRequestInFlight = false;
      }))
      .subscribe({
        next: (ads) => {
          this.myAds$.next(ads);
          this.currentPage = 1;
        },
        error: (error: unknown) => {
          this.errorMessage$.next(this.getLoadErrorMessage(error));
          this.myAds$.next([]);
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
}
