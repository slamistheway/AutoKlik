import {Component, ElementRef, HostListener, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {NavbarComponent} from '../../shared/layout/navbar/navbar';
import {Footer} from '../../shared/layout/footer/footer';
import {FilterBrands} from '../../shared/filters/filter-brands/filter-brands';
import {FilterModels} from '../../shared/filters/filter-models/filter-models';
import {FilterPrices} from '../../shared/filters/filter-prices/filter-prices';
import {FilterYears} from '../../shared/filters/filter-years/filter-years';
import {FilterKilometrage} from '../../shared/filters/filter-kilometrage/filter-kilometrage';
import {FilterGasType} from '../../shared/filters/filter-gasType/filter-gasType';
import {FilterCondition} from '../../shared/filters/filter-condition/filter-condition';
import {FilterCounty} from '../../shared/filters/filter-county/filter-county';
import {FilterGearType} from '../../shared/filters/filter-gearType/filter-gearType';
import {FilterBuyOrLeaseType} from '../../shared/filters/filter-buyOrLeaseType/filter-buyOrLeaseType';
import {FilterColor} from '../../shared/filters/filter-color/filter-color';
import {FilterDoorNumber} from '../../shared/filters/filter-doorNumber/filter-doorNumber';
import {FilterSellerType} from '../../shared/filters/filter-sellerType/filter-sellerType';
import {ActivatedRoute, ParamMap, RouterLink} from '@angular/router';
import {FilterEnginePower} from '../../shared/filters/filter-enginePower/filter-enginePower';
import {FilterEngineSize} from '../../shared/filters/filter-engineSize/filter-engineSize';
import {FilterDrivingLicence} from '../../shared/filters/filter-drivingLicence/filter-drivingLicence';
import {FilterWeight} from '../../shared/filters/filter-weight/filter-weight';
import {FilterPayload} from '../../shared/filters/filter-payload/filter-payload';
import {FilterVolume} from '../../shared/filters/filter-volume/filter-volume';
import {CurrentUser} from '../../models/current-user.model';
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
  faRoadBarrier
} from '@fortawesome/free-solid-svg-icons';
import {
  getAdImageUrl as getAdImageUrlFn,
  getCategoryLabel as getCategoryLabelFn,
  getSubcategoryLabel as getSubcategoryLabelFn,
  clampPage,
  getPageNumbers,
  getLoadErrorMessage,
  ToastType,
  SaveToast
} from '../../shared/functions/shared-functions';

import {BehaviorSubject, distinctUntilChanged, finalize, Observable, of, pipe, Subject, timeout} from 'rxjs';
import {HttpClient, HttpErrorResponse, HttpParams} from '@angular/common/http';
import { Auth } from '../../core/services/auth';


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

interface HomeAdFilters {
  category?: string;
  brands?: string;
  models?: string;
  enginePowerMin?: string;
  enginePowerMax?: string;
  engineSizeMin?: string;
  engineSizeMax?: string;
  drivingLicence?: string;
  payloadMin?: string;
  payloadMax?: string;
  weightMin?: string;
  weightMax?: string;
  truckType?: string;
  volumeMin?: string;
  volumeMax?: string;
  yearMin?: string;
  yearMax?: string;
  search?: string;
}

interface PersistedHomeFilters {
  selectedVehicle?: string;
  searchText?: string;
  selectedBrands?: string[];
  selectedModels?: string[];
  selectedEnginePowerMIN?: string;
  selectedEnginePowerMAX?: string;
  selectedEngineSizeMIN?: string;
  selectedEngineSizeMAX?: string;
  selectedDrivingLicence?: string;
  selectedPayloadMIN?: string;
  selectedPayloadMAX?: string;
  selectedWeightMIN?: string;
  selectedWeightMAX?: string;
  selectedTruckType?: string;
  selectedVolumeMIN?: string;
  selectedVolumeMAX?: string;
  selectedPriceMIN?: string;
  selectedPriceMAX?: string;
  selectedYearMIN?: string;
  selectedYearMAX?: string;
  selectedKilometrageMIN?: string;
  selectedKilometrageMAX?: string;
  selectedGasType?: string;
  selectedCondition?: string;
  selectedCounties?: string[];
  selectedGearType?: string;
  selectedBuyOrLease?: string;
  selectedDoorNumber?: string;
  selectedColors?: string[];
  selectedSellerType?: string;
}


@Component({
  selector: 'app-pretrazi',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, NavbarComponent, Footer, FilterBrands,
    FilterModels, FilterPrices, FilterYears, FilterKilometrage, FilterGasType, FilterCondition,
    FilterCounty, FilterGearType, FilterGearType, FilterGearType, FilterGearType, FilterGasType,
    FilterCounty, FilterCondition, FilterBuyOrLeaseType, FilterColor, FilterDoorNumber,
    FilterSellerType, RouterLink, FilterEnginePower, FilterEngineSize, FilterDrivingLicence,
    FilterWeight, FilterPayload, FilterVolume],
  templateUrl: './pretrazi.html',
  styleUrls: [],
})

export class Pretrazi implements OnInit {
  private readonly homeFiltersStorageKey = 'cars.filters';
  private readonly queryFilterKeys = new Set([
    'category', 'brands', 'models', 'enginePowerMin', 'enginePowerMax', 'engineSizeMin', 'engineSizeMax',
    'drivingLicence', 'payloadMin', 'payloadMax', 'weightMin', 'weightMax', 'truckType', 'volumeMin',
    'volumeMax', 'yearMin', 'yearMax', 'search',
  ]);
  private readonly guestUser: CurrentUser = {
    id: 0,
    username: 'guest',
    email: '',
    pfp: 'default-pfp.jpg',
  };
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

  get usesJsonBrandModelFilters(): boolean {
    return (
      this.selectedVehicle_type === 'cars' ||
      this.selectedVehicle_type === 'motorcycle' ||
      this.selectedVehicle_type === 'van'
    );
  }

  showMoreFilters = false;

  isLoading$ = new Subject<boolean>();
  errorMessageSubject = new Subject<string>()
  errorMessage$ = this.errorMessageSubject.asObservable();

  successMessage$ = new Subject<string>();
  currentUser$: Observable<CurrentUser | null> = of(null);
  currentUser: CurrentUser = this.guestUser;
  PublicAds$ = new BehaviorSubject<PublicAd[] | null>(null);
  readonly adsPerPage = 5;
  currentPage = 1;
  totalAdsCount = 0;
  private isRequestInFlight = false;
  private readonly savingAdIds = new Set<number>();
  private readonly savedAdIds = new Set<number>();
  private activeFilters: HomeAdFilters = {};
  private toastIdCounter = 0;
  private readonly toastTimers = new Map<number, number>();
  searchText = '';


  /*SAVE AD BUTTON*/
  saveAdButton$ = new BehaviorSubject<boolean>(true);
  toggleSaveAd(adId: number): void {
    if (this.currentUser.id <= 0) {
      this.enqueueToast('Morate biti prijavljeni da biste spremili oglas.', 'error');
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
          this.enqueueToast('Oglas je uklonjen iz spremljenih.', 'info');
        } else {
          this.savedAdIds.add(adId);
          this.enqueueToast('Oglas je spremljen.', 'success');
        }

        this.updateAdSavedFlag(adId, !wasSaved);
        this.savingAdIds.delete(adId);
      },
      error: (error: HttpErrorResponse) => {
        this.enqueueToast(this.getSaveErrorMessage(error), 'error');
        this.savingAdIds.delete(adId);
      },
    });
  }

  private markSavedAds(ads: PublicAd[]): void {
    console.log("marking saved ads based on API response")

    if (ads.length === 0) {
      this.PublicAds$.next([]);
      console.log("no found ads in database")
      return;
    }

    // Trust the API for `is_saved`. (When user is not authenticated the API returns false.)
    this.savedAdIds.clear();
    ads.forEach((ad) => {
      if (ad.is_saved) {
        this.savedAdIds.add(ad.id);
      }
    });

    this.PublicAds$.next(ads.map((ad) => ({ ...ad, is_saved: this.savedAdIds.has(ad.id) })));
  }






  constructor(
    private readonly http: HttpClient,
    private readonly auth: Auth,
    private readonly route: ActivatedRoute,
    private eRef: ElementRef
  ) {

  }


  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.hideAllDropdowns();
    }
  }



  ngOnInit(): void {
    const restoredFromQuery = this.restoreFiltersFromQueryParams(this.route.snapshot.queryParamMap);
    if (!restoredFromQuery) {
      this.restoreFiltersFromStorage();
    } else {
      this.persistFiltersToStorage();
    }

    this.activeFilters = this.buildFiltersFromSelectedValues();

    this.auth.loadUser();
    this.currentUser$ = this.auth.user$;

    this.currentUser$
      .pipe(
        distinctUntilChanged((previous, current) => (previous?.id ?? null) === (current?.id ?? null)),
      )
      .subscribe((user) => {
        const authenticatedUser = user ?? this.guestUser;
        this.currentUser = authenticatedUser;
        this.saveAdButton$.next(authenticatedUser.id > 0);
        this.loadAllAds(this.activeFilters, this.currentPage);
        console.log("učitavanje oglasa za user id: " + authenticatedUser.id);
      });
  }



  private loadAllAds(filters: HomeAdFilters = {}, page = 1): void {
    if (this.isRequestInFlight) {
      return;
    }

    const safeTotalPages = this.totalPages > 0 ? this.totalPages : 1;
    const safePage = clampPage(page, safeTotalPages);

    this.isLoading$.next(true);
    this.isRequestInFlight = true;
    this.errorMessageSubject.next("");


    let params = new HttpParams();
    if (filters.category) {
      params = params.set('category', filters.category);
    }
    if (filters.brands) {
      params = params.set('brands', filters.brands);
    }
    if (filters.models) {
      params = params.set('models', filters.models);
    }

    if (filters.enginePowerMin) {
      params = params.set('enginePowerMin', filters.enginePowerMin);
    }

    if (filters.enginePowerMax) {
      params = params.set('enginePowerMax', filters.enginePowerMax);
    }

    if (filters.engineSizeMin) {
      params = params.set('engineSizeMin', filters.engineSizeMin);
    }

    if (filters.engineSizeMax) {
      params = params.set('engineSizeMax', filters.engineSizeMax);
    }

    if (filters.drivingLicence) {
      params = params.set('drivingLicence', filters.drivingLicence);
    }

    if (filters.payloadMin) {
      params = params.set('payloadMin', filters.payloadMin);
    }

    if (filters.payloadMax) {
      params = params.set('payloadMax', filters.payloadMax);
    }

    if (filters.weightMin) {
      params = params.set('weightMin', filters.weightMin);
    }

    if (filters.weightMax) {
      params = params.set('weightMax', filters.weightMax);
    }

    if (filters.truckType) {
      params = params.set('truckType', filters.truckType);
    }

    if (filters.volumeMin) {
      params = params.set('volumeMin', filters.volumeMin);
    }

    if (filters.volumeMax) {
      params = params.set('volumeMax', filters.volumeMax);
    }

    if (filters.yearMin) {
      params = params.set('yearMin', filters.yearMin);
    }

    if (filters.yearMax) {
      params = params.set('yearMax', filters.yearMax);
    }

    if (filters.search) {
      params = params.set('search', filters.search);
    }

    this.http.get<PublicAd[]>("http://localhost:3000/ad/all", { params })
      .pipe(
        finalize(() => {
          this.isLoading$.next(false);
          this.isRequestInFlight = false;
        }),
      )
      .subscribe({
        next: (response) => {
          const ads = Array.isArray(response) ? response : [];
          this.totalAdsCount = ads.length;
          this.currentPage = safePage;
          this.markSavedAds(ads);
        },
        error: (error: unknown) => {
          this.errorMessageSubject.next(getLoadErrorMessage(error));
          this.totalAdsCount = 0;
          this.PublicAds$.next([]);
          this.currentPage = 1;
        },
      });
  }




  get totalPages(): number {
    return this.totalAdsCount > 0 ? Math.ceil(this.totalAdsCount / this.adsPerPage) : 0;
  }

  get pageNumbers(): number[] {
    return getPageNumbers(this.totalPages);
  }

  get pagedAds(): PublicAd[] {
    const ads = this.PublicAds$.value ?? [];
    if (ads.length === 0) {
      return [];
    }

    const safePage = clampPage(this.currentPage, this.totalPages > 0 ? this.totalPages : 1);
    const start = (safePage - 1) * this.adsPerPage;
    return ads.slice(start, start + this.adsPerPage);
  }

  goToPage(page: number): void {
    if (this.totalPages <= 0) {
      return;
    }

    const targetPage = clampPage(page, this.totalPages);
    if (targetPage === this.currentPage) {
      return;
    }

    // Client-side pagination (API returns latest 30).
    this.currentPage = targetPage;
  }

  goToPreviousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  goToNextPage(): void {
    this.goToPage(this.currentPage + 1);
  }




  /*---------------------------- TOASTS -------------------------------------*/
  readonly saveToasts$ = new BehaviorSubject<SaveToast[]>([]);

  private enqueueToast(message: string, type: ToastType): void {
    const id = ++this.toastIdCounter;
    this.saveToasts$.next([...this.saveToasts$.value, { id, message, type }]);

    const timerId = window.setTimeout(() => {
      this.dismissToast(id);
    }, 3000);

    this.toastTimers.set(id, timerId);
  }

  private dismissToast(id: number): void {
    const timerId = this.toastTimers.get(id);

    if (timerId) {
      window.clearTimeout(timerId);
      this.toastTimers.delete(id);
    }

    this.saveToasts$.next(this.saveToasts$.value.filter((toast) => toast.id !== id));
  }

  getToastCSS(type: ToastType): string {
    if (type === 'success') {
      return 'bg-[var(--color-navbar)] text-white';
    }

    if (type === 'error') {
      return 'bg-red-600 text-white';
    }

    return 'bg-gray-800 text-white';
  }

  private getSaveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 403) {
        return 'Morate biti prijavljeni da biste spremili oglas.';
      }

      if (error.status === 0) {
        return 'Server nije dostupan..';
      }

      return `Neuspješno spremanje oglasa (greška ${error.status}).`;
    }

    return 'Nije moguće spremiti oglas. Pokušajte ponovo.';
  }

  protected readonly getAdImageUrl = getAdImageUrlFn;
  protected readonly faEllipsis = faEllipsis;




  isAdSaved(adId: number): boolean {
    return this.savedAdIds.has(adId);
  }

  isAdSaving(adId: number): boolean {
    return this.savingAdIds.has(adId);
  }

  private updateAdSavedFlag(adId: number, isSaved: boolean): void {
    const ads = this.PublicAds$.value;

    if (!ads) {
      return;
    }

    this.PublicAds$.next(
      ads.map((ad) => (ad.id === adId ? { ...ad, is_saved: isSaved } : ad)),
    );
  }

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


  /*BRAND*/
  manualBrandInput = '';
  selectedBrands: string[] = [];
  onBrandsChange(brands: string[]): void {
    this.selectedBrands = brands;
    this.selectedModels = [];
    this.manualBrandInput = this.selectedBrands[0] ?? '';
    this.manualModelInput = '';
  }

  /*MODEL*/
  manualModelInput = '';
  selectedModels: string[] = [];
  onModelsChange(models: string[]): void {
    this.selectedModels = models;
    this.manualModelInput = this.selectedModels[0] ?? '';
  }

  /*ENGINE POWER*/
  selectedEnginePowerMIN = '';
  selectedEnginePowerMAX = '';
  onEnginePowerMINChange(power: string): void {
    this.selectedEnginePowerMIN = power;
  }
  onEnginePowerMAXChange(power: string): void {
    this.selectedEnginePowerMAX = power;
  }

  /*ENGINE SIZE*/
  selectedEngineSizeMIN = '';
  selectedEngineSizeMAX = '';
  onEngineSizeMINChange(size: string): void {
    this.selectedEngineSizeMIN = size;
  }
  onEngineSizeMAXChange(size: string): void {
    this.selectedEngineSizeMAX = size;
  }

  /*DRIVING LICENCE*/
  selectedDrivingLicence = '';
  onDrivingLicenceChange(licence: string): void {
    this.selectedDrivingLicence = licence;
  }

  /*PAYLOAD*/
  selectedPayloadMIN = '';
  selectedPayloadMAX = '';
  onPayloadMINChange(payload: string): void {
    this.selectedPayloadMIN = payload;
  }
  onPayloadMAXChange(payload: string): void {
    this.selectedPayloadMAX = payload;
  }

  /*WEIGHT*/
  selectedWeightMIN = '';
  selectedWeightMAX = '';
  onWeightMINChange(weight: string): void {
    this.selectedWeightMIN = weight;
  }
  onWeightMAXChange(weight: string): void {
    this.selectedWeightMAX = weight;
  }

  /*TRUCK TYPE*/
  selectedTruckType = '';
  onTruckTypeChange(truckType: string): void {
    this.selectedTruckType = truckType;
  }

  /*VOLUME*/
  selectedVolumeMIN = '';
  selectedVolumeMAX = '';
  onVolumeMINChange(volume: string): void {
    this.selectedVolumeMIN = volume;
  }
  onVolumeMAXChange(volume: string): void {
    this.selectedVolumeMAX = volume;
  }

  onManualBrandInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.manualBrandInput = input.value;
    const trimmedBrand = this.manualBrandInput.trim();
    this.selectedBrands = trimmedBrand ? [trimmedBrand] : [];

    // Brand change invalidates model when using manual mode.
    this.manualModelInput = '';
    this.selectedModels = [];
  }

  onManualModelInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.manualModelInput = input.value;
    const trimmedModel = this.manualModelInput.trim();
    this.selectedModels = trimmedModel ? [trimmedModel] : [];
  }

  private syncManualInputsFromSelections(): void {
    this.manualBrandInput = this.selectedBrands[0] ?? '';
    this.manualModelInput = this.selectedModels[0] ?? '';
  }

  /*PRICE*/
  selectedPriceMIN = '';
  selectedPriceMAX = '';
  onPriceMINChange(price: string): void {
    this.selectedPriceMIN = price;
  }
  onPriceMAXChange(price: string): void {
    this.selectedPriceMAX = price;
  }

  /*YEAR*/
  selectedYearMIN = '';
  selectedYearMAX = '';
  onYearMINChange(year: string): void {
    this.selectedYearMIN = year;
  }
  onYearMAXChange(year: string): void {
    this.selectedYearMAX = year;
  }

  /*KILOMETRAGE*/
  selectedKilometrageMIN = '';
  selectedKilometrageMAX = '';
  onKilometrageMINChange(kilometrage: string): void {
    this.selectedKilometrageMIN = kilometrage;
  }
  onKilometrageMAXChange(kilometer: string): void {
    this.selectedKilometrageMAX = kilometer;
  }

  /*GAS TYPE*/
  selectedGasType = '';
  onGasTypeChange(gasType: string): void {
    this.selectedGasType = gasType;
  }

  /*CONDITION*/
  selectedCondition = '';
  onConditionChange(condition: string): void {
    this.selectedCondition = condition;
  }

  /*COUNTY*/
  selectedCounties : string[] = [];
  onCountyChange(counties: string[]): void {
    this.selectedCounties = counties;
  }

  /*GEAR SHIFT*/
  selectedGearType = '';
  onGearShiftChange(gearShift: string): void {
    this.selectedGearType = gearShift;
  }

  /*BUY OR LEASE*/
  selectedBuyOrLease = '';
  onBuyOrLeaseChange(buyOrLease: string): void {
    this.selectedBuyOrLease = buyOrLease;
  }

  /*DOOR NUMBER*/
  selectedDoorNumber = '';
  onDoorNumberChange(doorNumber: string): void {
    this.selectedDoorNumber = doorNumber;
  }

  /*COLOR*/
  selectedColors: string[] = [];
  onColorChange(colors: string[]): void {
    this.selectedColors = colors;
  }

  /*TIP PRODAVAČA*/
  selectedSellerType = '';
  onSellerTypeChange(sellerType: string): void {
    this.selectedSellerType = sellerType;
  }




  /*-----------------FUNCTIONS--------------------*/



  /*-----------------CLICK FUNCTIONS--------------------*/
  onVeichleTypeClick(parametar: string): void {
    if (parametar == "car" && this.carSelected) return;
    if (parametar == "motorcycle" && this.motorcycleSelected) return;
    if (parametar == "van" && this.vanSelected) return;
    if (parametar == "other" && this.otherSelected) return;

    this.carSelected = false;
    this.motorcycleSelected = false;
    this.vanSelected = false;
    this.otherSelected = false;


    this.hideAllDropdowns();

    this.selectedYearMIN = '';
    this.selectedYearMAX = '';
    this.selectedBrands = [];
    this.selectedModels = [];
    this.manualBrandInput = '';
    this.manualModelInput = '';
    this.selectedEnginePowerMIN = '';
    this.selectedEnginePowerMAX = '';
    this.selectedEngineSizeMIN = '';
    this.selectedEngineSizeMAX = '';
    this.selectedDrivingLicence = '';
    this.selectedPayloadMIN = '';
    this.selectedPayloadMAX = '';
    this.selectedWeightMIN = '';
    this.selectedWeightMAX = '';
    this.selectedVolumeMIN = '';
    this.selectedVolumeMAX = '';
    this.selectedKilometrageMIN = '';
    this.selectedKilometrageMAX = '';
    this.selectedGasType = '';
    this.selectedCondition = '';
    this.selectedCounties.length = 0;
    this.selectedGearType = '';
    this.selectedBuyOrLease = '';
    this.selectedDoorNumber = '';
    this.selectedColors.length = 0;
    this.selectedSellerType = '';
    this.showMoreFilters = false;



    if(parametar == "car"){
      this.carSelected = true;
      this.selectedVehicle_type = 'car';
    }
    else if(parametar == "motorcycle"){
      this.motorcycleSelected = true;
      this.selectedVehicle_type = 'motorcycle';
    }
    else if(parametar == "van"){
      this.vanSelected = true;
      this.selectedVehicle_type = 'van';
    }
    else if(parametar == "other"){
      this.otherSelected = true;
      this.selectedVehicle_type = 'other';
    }
  }


  // MORE FILTERS BUTTON
  toggleMoreFilters(): void {
    this.showMoreFilters = !this.showMoreFilters;
  }


  /*-----------------SEARCH--------------------*/
  search(): void {
    this.activeFilters = this.buildFiltersFromSelectedValues();
    this.persistFiltersToStorage();
    this.currentPage = 1;
    this.loadAllAds(this.activeFilters, 1);
  }

  clearFilters(): void {
    this.searchText = '';
    this.selectedBrands = [];
    this.selectedModels = [];
    this.manualBrandInput = '';
    this.manualModelInput = '';
    this.selectedEnginePowerMIN = '';
    this.selectedEnginePowerMAX = '';
    this.selectedEngineSizeMIN = '';
    this.selectedEngineSizeMAX = '';
    this.selectedDrivingLicence = '';
    this.selectedPayloadMIN = '';
    this.selectedPayloadMAX = '';
    this.selectedWeightMIN = '';
    this.selectedWeightMAX = '';
    this.selectedTruckType = '';
    this.selectedVolumeMIN = '';
    this.selectedVolumeMAX = '';
    this.selectedPriceMIN = '';
    this.selectedPriceMAX = '';
    this.selectedYearMIN = '';
    this.selectedYearMAX = '';
    this.selectedKilometrageMIN = '';
    this.selectedKilometrageMAX = '';
    this.selectedGasType = '';
    this.selectedCondition = '';
    this.selectedCounties = [];
    this.selectedGearType = '';
    this.selectedBuyOrLease = '';
    this.selectedDoorNumber = '';
    this.selectedColors = [];
    this.selectedSellerType = '';

    this.showMoreFilters = false;
    this.hideAllDropdowns();
    this.setSelectedVehicle('car');

    this.activeFilters = {};
    globalThis?.localStorage?.removeItem(this.homeFiltersStorageKey);
    this.currentPage = 1;
    this.loadAllAds(this.activeFilters, 1);
  }

  onSearchTextChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchText = input.value;
  }

  private buildFiltersFromSelectedValues(): HomeAdFilters {
    const filters: HomeAdFilters = {};

    const category = this.getSelectedCategoryFilter();
    if (category) {
      filters.category = category;
    }

    if (this.selectedBrands.length > 0) {
      filters.brands = this.selectedBrands.join(',');
    }

    if (this.selectedModels.length > 0) {
      filters.models = this.selectedModels.join(',');
    }

    if (this.selectedEnginePowerMIN.trim()) {
      filters.enginePowerMin = this.selectedEnginePowerMIN.trim();
    }

    if (this.selectedEnginePowerMAX.trim()) {
      filters.enginePowerMax = this.selectedEnginePowerMAX.trim();
    }

    if (this.selectedEngineSizeMIN.trim()) {
      filters.engineSizeMin = this.selectedEngineSizeMIN.trim();
    }

    if (this.selectedEngineSizeMAX.trim()) {
      filters.engineSizeMax = this.selectedEngineSizeMAX.trim();
    }

    if (this.selectedDrivingLicence.trim()) {
      filters.drivingLicence = this.selectedDrivingLicence.trim();
    }

    if (this.selectedPayloadMIN.trim()) {
      filters.payloadMin = this.selectedPayloadMIN.trim();
    }

    if (this.selectedPayloadMAX.trim()) {
      filters.payloadMax = this.selectedPayloadMAX.trim();
    }

    if (this.selectedWeightMIN.trim()) {
      filters.weightMin = this.selectedWeightMIN.trim();
    }

    if (this.selectedWeightMAX.trim()) {
      filters.weightMax = this.selectedWeightMAX.trim();
    }

    if (this.selectedTruckType.trim()) {
      filters.truckType = this.selectedTruckType.trim();
    }

    if (this.selectedVolumeMIN.trim()) {
      filters.volumeMin = this.selectedVolumeMIN.trim();
    }

    if (this.selectedVolumeMAX.trim()) {
      filters.volumeMax = this.selectedVolumeMAX.trim();
    }

    if (this.selectedYearMIN.trim()) {
      filters.yearMin = this.selectedYearMIN.trim();
    }

    if (this.selectedYearMAX.trim()) {
      filters.yearMax = this.selectedYearMAX.trim();
    }

    const searchText = this.searchText.trim();
    if (searchText) {
      filters.search = searchText;
    }

    return filters;
  }

  private getSelectedCategoryFilter(): string  {
    if (this.carSelected) {
      return 'car';
    }

    if (this.motorcycleSelected) {
      return 'motorcycle';
    }

    if (this.vanSelected) {
      return 'van';
    }

    if (this.otherSelected) {
      return 'other';
    }

    return "";
  }

  private persistFiltersToStorage(): void {
    const payload: PersistedHomeFilters = {
      selectedVehicle: this.getSelectedCategoryFilter(),
      searchText: this.searchText,
      selectedBrands: [...this.selectedBrands],
      selectedModels: [...this.selectedModels],
      selectedEnginePowerMIN: this.selectedEnginePowerMIN,
      selectedEnginePowerMAX: this.selectedEnginePowerMAX,
      selectedEngineSizeMIN: this.selectedEngineSizeMIN,
      selectedEngineSizeMAX: this.selectedEngineSizeMAX,
      selectedDrivingLicence: this.selectedDrivingLicence,
      selectedPayloadMIN: this.selectedPayloadMIN,
      selectedPayloadMAX: this.selectedPayloadMAX,
      selectedWeightMIN: this.selectedWeightMIN,
      selectedWeightMAX: this.selectedWeightMAX,
      selectedTruckType: this.selectedTruckType,
      selectedVolumeMIN: this.selectedVolumeMIN,
      selectedVolumeMAX: this.selectedVolumeMAX,
      selectedPriceMIN: this.selectedPriceMIN,
      selectedPriceMAX: this.selectedPriceMAX,
      selectedYearMIN: this.selectedYearMIN,
      selectedYearMAX: this.selectedYearMAX,
      selectedKilometrageMIN: this.selectedKilometrageMIN,
      selectedKilometrageMAX: this.selectedKilometrageMAX,
      selectedGasType: this.selectedGasType,
      selectedCondition: this.selectedCondition,
      selectedCounties: [...this.selectedCounties],
      selectedGearType: this.selectedGearType,
      selectedBuyOrLease: this.selectedBuyOrLease,
      selectedDoorNumber: this.selectedDoorNumber,
      selectedColors: [...this.selectedColors],
      selectedSellerType: this.selectedSellerType,
    };

    globalThis?.localStorage?.setItem(this.homeFiltersStorageKey, JSON.stringify(payload));
  }

  private restoreFiltersFromStorage(): void {
    const raw = globalThis?.localStorage?.getItem(this.homeFiltersStorageKey);
    if (!raw) {
      return;
    }
    let parsed: PersistedHomeFilters;

    try {
      parsed = JSON.parse(raw) as PersistedHomeFilters;
    } catch {
      globalThis?.localStorage?.removeItem(this.homeFiltersStorageKey);
      return;
    }

    this.setSelectedVehicle(parsed.selectedVehicle);
    this.searchText = typeof parsed.searchText === 'string' ? parsed.searchText : '';
    this.selectedBrands = Array.isArray(parsed.selectedBrands) ? parsed.selectedBrands : [];
    this.selectedModels = Array.isArray(parsed.selectedModels) ? parsed.selectedModels : [];
    this.syncManualInputsFromSelections();
    this.selectedEnginePowerMIN = typeof parsed.selectedEnginePowerMIN === 'string' ? parsed.selectedEnginePowerMIN : '';
    this.selectedEnginePowerMAX = typeof parsed.selectedEnginePowerMAX === 'string' ? parsed.selectedEnginePowerMAX : '';
    this.selectedEngineSizeMIN = typeof parsed.selectedEngineSizeMIN === 'string' ? parsed.selectedEngineSizeMIN : '';
    this.selectedEngineSizeMAX = typeof parsed.selectedEngineSizeMAX === 'string' ? parsed.selectedEngineSizeMAX : '';
    this.selectedDrivingLicence = typeof parsed.selectedDrivingLicence === 'string' ? parsed.selectedDrivingLicence : '';
    this.selectedPayloadMIN = typeof parsed.selectedPayloadMIN === 'string' ? parsed.selectedPayloadMIN : '';
    this.selectedPayloadMAX = typeof parsed.selectedPayloadMAX === 'string' ? parsed.selectedPayloadMAX : '';
    this.selectedWeightMIN = typeof parsed.selectedWeightMIN === 'string' ? parsed.selectedWeightMIN : '';
    this.selectedWeightMAX = typeof parsed.selectedWeightMAX === 'string' ? parsed.selectedWeightMAX : '';
    this.selectedTruckType = typeof parsed.selectedTruckType === 'string' ? parsed.selectedTruckType : '';
    this.selectedVolumeMIN = typeof parsed.selectedVolumeMIN === 'string' ? parsed.selectedVolumeMIN : '';
    this.selectedVolumeMAX = typeof parsed.selectedVolumeMAX === 'string' ? parsed.selectedVolumeMAX : '';
    this.selectedPriceMIN = typeof parsed.selectedPriceMIN === 'string' ? parsed.selectedPriceMIN : '';
    this.selectedPriceMAX = typeof parsed.selectedPriceMAX === 'string' ? parsed.selectedPriceMAX : '';
    this.selectedYearMIN = typeof parsed.selectedYearMIN === 'string' ? parsed.selectedYearMIN : '';
    this.selectedYearMAX = typeof parsed.selectedYearMAX === 'string' ? parsed.selectedYearMAX : '';
    this.selectedKilometrageMIN = typeof parsed.selectedKilometrageMIN === 'string' ? parsed.selectedKilometrageMIN : '';
    this.selectedKilometrageMAX = typeof parsed.selectedKilometrageMAX === 'string' ? parsed.selectedKilometrageMAX : '';
    this.selectedGasType = typeof parsed.selectedGasType === 'string' ? parsed.selectedGasType : '';
    this.selectedCondition = typeof parsed.selectedCondition === 'string' ? parsed.selectedCondition : '';
    this.selectedCounties = Array.isArray(parsed.selectedCounties) ? parsed.selectedCounties : [];
    this.selectedGearType = typeof parsed.selectedGearType === 'string' ? parsed.selectedGearType : '';
    this.selectedBuyOrLease = typeof parsed.selectedBuyOrLease === 'string' ? parsed.selectedBuyOrLease : '';
    this.selectedDoorNumber = typeof parsed.selectedDoorNumber === 'string' ? parsed.selectedDoorNumber : '';
    this.selectedColors = Array.isArray(parsed.selectedColors) ? parsed.selectedColors : [];
    this.selectedSellerType = typeof parsed.selectedSellerType === 'string' ? parsed.selectedSellerType : '';
  }

  private restoreFiltersFromQueryParams(queryParams: ParamMap): boolean {
    const hasFilters = queryParams.keys.some((key) => this.queryFilterKeys.has(key));
    if (!hasFilters) {
      return false;
    }

    this.setSelectedVehicle(queryParams.get('category') ?? undefined);
    this.searchText = queryParams.get('search') ?? '';
    this.selectedBrands = this.parseCsvFilter(queryParams.get('brands'));
    this.selectedModels = this.parseCsvFilter(queryParams.get('models'));
    this.syncManualInputsFromSelections();
    this.selectedEnginePowerMIN = queryParams.get('enginePowerMin') ?? '';
    this.selectedEnginePowerMAX = queryParams.get('enginePowerMax') ?? '';
    this.selectedEngineSizeMIN = queryParams.get('engineSizeMin') ?? '';
    this.selectedEngineSizeMAX = queryParams.get('engineSizeMax') ?? '';
    this.selectedDrivingLicence = queryParams.get('drivingLicence') ?? '';
    this.selectedPayloadMIN = queryParams.get('payloadMin') ?? '';
    this.selectedPayloadMAX = queryParams.get('payloadMax') ?? '';
    this.selectedWeightMIN = queryParams.get('weightMin') ?? '';
    this.selectedWeightMAX = queryParams.get('weightMax') ?? '';
    this.selectedTruckType = queryParams.get('truckType') ?? '';
    this.selectedVolumeMIN = queryParams.get('volumeMin') ?? '';
    this.selectedVolumeMAX = queryParams.get('volumeMax') ?? '';
    this.selectedYearMIN = queryParams.get('yearMin') ?? '';
    this.selectedYearMAX = queryParams.get('yearMax') ?? '';

    return true;
  }

  private parseCsvFilter(rawValue: string | null): string[] {
    if (!rawValue) {
      return [];
    }

    return rawValue
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  private setSelectedVehicle(vehicle?: string): void {
    this.carSelected = vehicle === 'car';
    this.motorcycleSelected = vehicle === 'motorcycle';
    this.vanSelected = vehicle === 'van';
    this.otherSelected = vehicle === 'other';

    if (this.carSelected) {
      this.selectedVehicle_type = 'car';
    } else if (this.motorcycleSelected) {
      this.selectedVehicle_type = 'motorcycle';
    } else if (this.vanSelected) {
      this.selectedVehicle_type = 'van';
    } else if (this.otherSelected) {
      this.selectedVehicle_type = 'other';
    } else {
      this.carSelected = true;
      this.selectedVehicle_type = 'car';
    }
  }
}
