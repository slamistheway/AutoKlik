import {Component, ElementRef, HostListener, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NavbarComponent } from '../../shared/layout/navbar/navbar';
import { Footer } from '../../shared/layout/footer/footer';
import {
  faSearch,
  faCar,
  faMotorcycle,
  faShuttleVan,
  faTruck,
  faEllipsis,
  faTrailer,
  faTractor,
  faChevronDown,
  faRoadBarrier, faTools
} from '@fortawesome/free-solid-svg-icons';

import {Router, RouterLink} from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import {BehaviorSubject, distinctUntilChanged, filter, finalize, Observable, of, Subject, take, timeout} from 'rxjs';
import {Auth} from '../auth/auth';
import {CurrentUser} from '../../models/current-user.model';
import {
  getAdImageUrl as getAdImageUrlFn,
  getCategoryLabel as getCategoryLabelFn,
  getSubcategoryLabel as getSubcategoryLabelFn,
  clampPage,
  getPageNumbers,
  getLoadErrorMessage,
  LanguagePreferenceService,
  ToastType,
  SaveToast,
  getSaveErrorMessage, getToastCSS, saveAdToasts, enqueueToast
} from '../../shared/functions/shared-functions';
import type { HomeTranslationEntry, HomeTranslationKey, HomeTranslationsByLanguage, AppLanguage } from '../../shared/types/translations';
import {faGear} from '@fortawesome/free-solid-svg-icons/faGear';





interface PublicAd {
  id: number;
  user_id: number;
  category: string;
  subcategory: string;
  brand: string;
  model: string;
  title: string;
  description: string;
  year: number;
  created_at?: string;
  updated_at?: string;
  images?: string[];
  is_saved?: boolean;
}

interface AdSaveResponse {
  message: string;
  saved?: boolean;
  deleted?: boolean;
}


interface PagedAdsResponse {
  items: PublicAd[];
  totalCount: number;
  limit: number;
  offset: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, NavbarComponent, Footer, RouterLink],
  templateUrl: './home.html',
  styleUrls: [],
})

export class HomeComponent implements OnInit {
  protected readonly faSearch = faSearch;
  protected readonly faCar = faCar;
  protected readonly faMotorcycle = faMotorcycle;
  protected readonly faShuttleVan = faShuttleVan;
  protected readonly faTruck = faTruck;
  protected readonly faChevronDown = faChevronDown;
  protected readonly faTractor = faTractor;
  protected readonly faTrailer = faTrailer;
  protected readonly faRoadBarrier = faRoadBarrier;
  readonly getCategoryLabel = getCategoryLabelFn;
  readonly getSubcategoryLabel = getSubcategoryLabelFn;

  // Vehicle Type Selection States
  selectedVehicle_type = 'car';
  carSelected = true;
  motorcycleSelected = false;
  vanSelected = false;
  otherSelected = false;

  showMoreFilters = false;

  errorMessage$ = new Subject<string>();

  private readonly defaultCurrentUser: CurrentUser = {
    id: 0,
    username: 'guest',
    email: '',
    pfp: 'default-pfp.jpg',
  };
  currentUser$: Observable<CurrentUser | null> = of(null);
  currentUser: CurrentUser = this.defaultCurrentUser;

  PublicAds$ = new BehaviorSubject<PublicAd[] | null>(null);
  readonly adsPerPage = 5;
  currentPage = 1;
  totalAdsCount = 0;
  private isRequestInFlight = false;

  private searchFilter = "";
  searchText = '';
  currentLanguage: AppLanguage = 'hr';


  private readonly emptyTranslations: Record<HomeTranslationKey, string> = {
    searchPlaceholder: '',
    filtersTitle: '',
    showMoreFilters: '',
    clearFilters: '',
    searchButton: '',
    featuredTitle: '',
    adsTitle: '',
    loadingAds: '',
    noAdsFound: '',
    publishedOn: '',
    saveAd: '',
    savedAd: '',
    savingAd: '',
  };

  private homeTranslations: HomeTranslationsByLanguage = {
    hr: {...this.emptyTranslations},
    en: {...this.emptyTranslations},
  };

  private readonly translationKeys: HomeTranslationKey[] = [
    'searchPlaceholder',
    'filtersTitle',
    'showMoreFilters',
    'clearFilters',
    'searchButton',
    'featuredTitle',
    'adsTitle',
    'loadingAds',
    'noAdsFound',
    'publishedOn',
    'saveAd',
    'savedAd',
    'savingAd',
  ];

  private loadTranslations(): void {
    this.http.get<HomeTranslationEntry[]>('/translations.json').subscribe({
      next: (entries) => {
        const nextTranslations: HomeTranslationsByLanguage = {
          hr: {...this.emptyTranslations},
          en: {...this.emptyTranslations},
        };

        if (!Array.isArray(entries)) {
          this.homeTranslations = nextTranslations;
          return;
        }

        for (const entry of entries) {
          if (!entry || (entry.language !== 'hr' && entry.language !== 'en')) {
            continue;
          }

          const translationForLanguage: Record<HomeTranslationKey, string> = {...this.emptyTranslations};
          for (const key of this.translationKeys) {
            translationForLanguage[key] = (entry as any)[key] ?? '';
          }

          nextTranslations[entry.language] = translationForLanguage;
        }

        this.homeTranslations = nextTranslations;
      },
      error: () => {
        this.homeTranslations = {
          hr: {...this.emptyTranslations},
          en: {...this.emptyTranslations},
        };
      },
    });
  }


  t(key: HomeTranslationKey): string {
    const text = this.homeTranslations[this.currentLanguage]?.[key];
    if (typeof text === 'string' && text.trim().length > 0) {
      return text;
    }

    const fallback = this.homeTranslations.hr?.[key];
    if (typeof fallback === 'string' && fallback.trim().length > 0) {
      return fallback;
    }

    return key;
  }


  /*SAVE AD BUTTON*/
  saveAdButton$ = new BehaviorSubject<boolean>(true);
  private readonly savingAdIds = new Set<number>();
  private readonly savedAdIds = new Set<number>();



  isAdSaved(adId: number): boolean {
    return this.savedAdIds.has(adId);
  }

  toggleSaveAd(adId: number): void {
    if (this.currentUser.id <= 0) {
      enqueueToast('Morate biti prijavljeni da biste spremili oglas.', 'error');
      return;
    }

    if (this.savingAdIds.has(adId) || !this.saveAdButton$.value) {
      return;
    }

    this.savingAdIds.add(adId);
    const wasSaved = this.savedAdIds.has(adId);
    const request$ = wasSaved
      ? this.http.delete<AdSaveResponse>(`http://localhost:3000/ad/save/${adId}`)
      : this.http.post<AdSaveResponse>(`http://localhost:3000/ad/save/${adId}`, {});

    request$.subscribe({
      next: () => {
        if (wasSaved) {
          this.savedAdIds.delete(adId);
          enqueueToast('Oglas je uklonjen iz spremljenih.', 'info');
        } else {
          this.savedAdIds.add(adId);
          enqueueToast('Oglas je spremljen.', 'success');
        }

        this.updateAdSavedFlag(adId, !wasSaved);
        this.savingAdIds.delete(adId);
      },
      error: (error: HttpErrorResponse) => {
        enqueueToast(getSaveErrorMessage(error), 'error');
        this.savingAdIds.delete(adId);
      },
    });
  }

  private updateAdSavedFlag(adId: number, isSaved: boolean): void {
    const ads = this.PublicAds$.value;

    if (!ads) {
      return;
    }

    this.PublicAds$.next(
      ads.map((ad) => (ad.id === adId ? {...ad, is_saved: isSaved} : ad)),
    );
  }

  private markSavedAds(ads: PublicAd[]): void {
    console.log("marking saved ads based on API response")

    if (ads.length === 0) {
      this.PublicAds$.next([]);
      console.log("no found ads in database")
      return;
    }

    if (this.currentUser.id <= 0) {
      console.log("no user logged in, marking all ads as not saved")
      this.PublicAds$.next(ads.map((ad) => ({...ad, is_saved: false})));
      return;
    }

    ads.forEach((ad) => {
      if (ad.is_saved) {
        console.log(`ad ${ad.id} saved based on API response`)
        this.savedAdIds.add(ad.id);
      } else {
        console.log(`ad ${ad.id} NOT saved based on API response`)
        this.savedAdIds.delete(ad.id);
      }
    });

    this.PublicAds$.next(
      ads.map((ad) => ({...ad, is_saved: this.savedAdIds.has(ad.id)})),
    );
  }


  constructor(
    private readonly http: HttpClient,
    private readonly auth: Auth,
    private readonly languagePreference: LanguagePreferenceService,
    private readonly router: Router,
    private eRef: ElementRef
  ) {

  }


  ngOnInit(): void {
    this.loadTranslations();
    this.languagePreference.language$.subscribe((language) => {
      this.currentLanguage = language;
    });

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
        this.loadAllAds();
      });
  }


  private loadAllAds(page = 1): void {
    if (this.isRequestInFlight) {
      return;
    }

    const safeTotalPages = this.totalPages > 0 ? this.totalPages : 1;
    const safePage = clampPage(page, safeTotalPages);

    this.isRequestInFlight = true;
    this.errorMessage$.next("");


    const url = 'http://localhost:3000/ad/all';
    this.http
      .get<PagedAdsResponse>(url)
      .pipe(
        timeout(10000),
        finalize(() => {
          this.isRequestInFlight = false;
        }),
      )
      .subscribe({
        next: (response) => {
          const ads = Array.isArray(response?.items) ? response.items : [];
          this.totalAdsCount = Number(response?.totalCount ?? 0);
          this.currentPage = safePage;
          this.markSavedAds(ads);
        },
        error: (error: unknown) => {
          this.errorMessage$.next(getLoadErrorMessage(error));
          this.totalAdsCount = 0;
          this.PublicAds$.next([]);
          this.currentPage = 1;
        }
      });
  }


  get totalPages(): number {
    return this.totalAdsCount > 0 ? Math.ceil(this.totalAdsCount / this.adsPerPage) : 0;
  }

  get pageNumbers(): number[] {
    return getPageNumbers(this.totalPages);
  }

  get pagedAds(): PublicAd[] {
    return this.PublicAds$.value ?? [];
  }

  goToPage(page: number): void {
    if (this.totalPages <= 0) {
      return;
    }

    const targetPage = clampPage(page, this.totalPages);
    if (targetPage === this.currentPage) {
      return;
    }

    this.loadAllAds(targetPage);
  }

  goToPreviousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  goToNextPage(): void {
    this.goToPage(this.currentPage + 1);
  }


  protected readonly getAdImageUrl = getAdImageUrlFn;
  protected readonly faEllipsis = faEllipsis;


  /*-------------DROPDOWN-------------*/
  dropdowns: Record<string, boolean> = {
    brand: false,
    model: false,
    enginePowerMin: false,
    enginePowerMax: false,
    engineSizeMin: false,
    engineSizeMax: false,
    drivingLicence: false,
    payloadMin: false,
    payloadMax: false,
    weightMin: false,
    weightMax: false,
    truckType: false,
    volumeMin: false,
    volumeMax: false,
    priceMin: false,
    priceMax: false,
    yearMin: false,
    yearMax: false,
    kilometrageMin: false,
    kilometrageMax: false,
    gasType: false,
    condition: false,
    county: false,
    gearType: false,
    buyOrLease: false,
    color: false,
    doorNumber: false,
    sellerType: false
  };

  hideAllDropdowns(): void {
    console.log("hiding all dropdowns")
    Object.keys(this.dropdowns).forEach(key => {
      this.dropdowns[key] = false;
    });
  }


  /*-----------------FUNCTIONS--------------------*/


  /*-----------------CLICK FUNCTIONS--------------------*/


  /*-----------------SEARCH--------------------*/
  search_cars(): void {
    this.searchFilter = this.searchText.trim();

    if (this.searchFilter.length === 0) {
      return;
    }

    this.currentPage = 1;
    void this.router.navigate(['/pretrazi'], {
      queryParams: {
        search: this.searchFilter,
      },
    });
  }




  protected readonly faGear = faGear;
}


