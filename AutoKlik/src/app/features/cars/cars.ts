import { CommonModule } from '@angular/common';
import {HttpClient, HttpErrorResponse, HttpParams} from '@angular/common/http';
import {Component, ElementRef, OnInit} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faChevronDown,
  faEllipsis,
 faFilter, faArrowRight, faTrashCan, faSliders,
} from '@fortawesome/free-solid-svg-icons';
import {BehaviorSubject, filter, Observable, of, take, timeout} from 'rxjs';
import { FilterBrands } from '../../shared/filters/filter-brands/filter-brands';
import { FilterBuyOrLeaseType } from '../../shared/filters/filter-buyOrLeaseType/filter-buyOrLeaseType';
import { FilterColor } from '../../shared/filters/filter-color/filter-color';
import { FilterCondition } from '../../shared/filters/filter-condition/filter-condition';
import { FilterCounty } from '../../shared/filters/filter-county/filter-county';
import { FilterDoorNumber } from '../../shared/filters/filter-doorNumber/filter-doorNumber';
import { FilterEnginePower } from '../../shared/filters/filter-enginePower/filter-enginePower';
import { FilterEngineSize } from '../../shared/filters/filter-engineSize/filter-engineSize';
import { FilterGasType } from '../../shared/filters/filter-gasType/filter-gasType';
import { FilterGearType } from '../../shared/filters/filter-gearType/filter-gearType';
import { FilterKilometrage } from '../../shared/filters/filter-kilometrage/filter-kilometrage';
import { FilterModels } from '../../shared/filters/filter-models/filter-models';
import { FilterPayload } from '../../shared/filters/filter-payload/filter-payload';
import { FilterPrices } from '../../shared/filters/filter-prices/filter-prices';
import { FilterSellerType } from '../../shared/filters/filter-sellerType/filter-sellerType';
import { FilterVolume } from '../../shared/filters/filter-volume/filter-volume';
import { FilterWeight } from '../../shared/filters/filter-weight/filter-weight';
import { FilterYears } from '../../shared/filters/filter-years/filter-years';
import {
  clampPage, enqueueToast,
  getAdImageUrl as getAdImageUrlFn,
  getCategoryLabel as getCategoryLabelFn, getLoadErrorMessage,
  getPageNumbers, getSaveErrorMessage,
  getSubcategoryLabel as getSubcategoryLabelFn,
  getToastCSS,
  saveAdToasts,
} from '../../shared/functions/shared-functions';
import {Footer} from '../../shared/layout/footer/footer';
import {NavbarComponent} from '../../shared/layout/navbar/navbar';
import { Auth } from '../../core/services/auth';
import {CurrentUser} from '../../models/current-user.model';


interface AdSaveResponse {
  message: string;
  saved?: boolean;
  deleted?: boolean;
}

interface PublicAdCar {
  id: number;
  category: string;
  subcategory: string;
  brand: string;
  model: string;
  title: string;
  description: string;
  year: number;
  price: number;
  mileage: number;
  enginePower: number;
  engineSize: number;
  payload: number;
  weight: number;
  volume: number;
  gasType: string;
  condition: string;
  county: string;
  gearType: string;
  buyOrLease: string;
  color: string;
  doorNumber: string;
  sellerType: string;
  drivingLicence: string;
  truckType: string;
  created_at: string;
  images?: string[];
  is_saved?: boolean;
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
  priceMin?: string;
  priceMax?: string;
  yearMin?: string;
  yearMax?: string;
  kilometrageMin?: string;
  kilometrageMax?: string;
  gasType?: string;
  condition?: string;
  county?: string;
  gearType?: string;
  buyOrLease?: string;
  color?: string;
  doorNumber?: string;
  sellerType?: string;
  search?: string;
}

interface AppliedFilterChip {
  key: string;
  label: string;
  value: string;
}

interface PagedAdsResponse {
  items?: PublicAdCar[];
  totalCount?: number;
  limit?: number;
  offset?: number;
}

type CarsTranslationKey =
  | 'searchPlaceholder'
  | 'filtersTitle'
  | 'showMoreFilters'
  | 'clearFilters'
  | 'searchButton'
  | 'featuredTitle'
  | 'adsTitle'
  | 'loadingAds'
  | 'noAdsFound'
  | 'publishedOn'
  | 'saveAd'
  | 'savedAd'
  | 'savingAd';


@Component({
  selector: 'app-cars',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    NavbarComponent,
    Footer,
    FilterBrands,
    FilterModels,
    FilterPrices,
    FilterYears,
    FilterKilometrage,
    FilterGasType,
    FilterCondition,
    FilterCounty,
    FilterGearType,
    FilterBuyOrLeaseType,
    FilterColor,
    FilterDoorNumber,
    FilterSellerType,
    RouterLink,
    FilterEnginePower,
    FilterEngineSize
  ],
  templateUrl: './cars.html',
  styleUrls: [],
})
export class CarsComponent implements OnInit {
  private readonly adsApiUrl = 'http://localhost:3000/ad/all';


  currentUser$: Observable<CurrentUser | null> = of(null);
  currentUser: CurrentUser = {
    id: 0,
    username: 'guest',
    email: '',
    pfp: 'default-pfp.jpg',
  };



  protected readonly faChevronDown = faChevronDown;

  readonly getCategoryLabel = getCategoryLabelFn;
  readonly getSubcategoryLabel = getSubcategoryLabelFn;
  protected readonly getAdImageUrl = getAdImageUrlFn;
  protected readonly getToastCSS = getToastCSS;
  protected readonly saveAdToasts = saveAdToasts;



  /*----------------------------------------------AD SAVE BUTTON AND SAVING ADS------------------------------------------------*/
  saveAdButton$ = new BehaviorSubject<boolean>(true);
  private readonly savingAdIds = new Set<number>();
  private readonly savedAdIds = new Set<number>();

  isAdSaved(adId: number): boolean {
    return this.savedAdIds.has(adId);
  }

  toggleSaveAd(adId: number): void {
    if (this.currentUser.id == 0) {
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
    const ads = this.PublicAdCars$.value;

    if (!ads) {
      return;
    }

    this.PublicAdCars$.next(
      ads.map((ad) => (ad.id === adId ? {...ad, is_saved: isSaved} : ad)),
    );
  }

  private markSavedAds(ads: PublicAdCar[]): void {
    console.log("marking saved ads based on API response")

    if (ads.length === 0) {
      this.PublicAdCars$.next([]);
      console.log("no found ads in database")
      return;
    }

    if (this.currentUser.id <= 0) {
      console.log("no user logged in, marking all ads as not saved")
      this.PublicAdCars$.next(ads.map((ad) => ({...ad, is_saved: false})));
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

    this.PublicAdCars$.next(
      ads.map((ad) => ({...ad, is_saved: this.savedAdIds.has(ad.id)})),
    );
  }




  readonly isLoading$ = new BehaviorSubject<boolean>(false);
  private isRequestInFlight = false;
  readonly errorMessage$ = new BehaviorSubject<string>('');
  readonly PublicAdCars$ = new BehaviorSubject<PublicAdCar[] | null>(null);

  readonly selectedVehicle_type = 'cars';
  showMoreFilters = false;

  currentPage = 1;
  totalAdsCount = 0;
  readonly adsPerPage = 5;

  searchText = '';
  private allAds: PublicAdCar[] = [];
  private activeFilters: HomeAdFilters = {};
  appliedFilterChips: AppliedFilterChip[] = [];

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
    sellerType: false,
  };

  manualBrandInput = '';
  manualModelInput = '';
  selectedBrands: string[] = [];
  selectedModels: string[] = [];
  selectedEnginePowerMIN = '';
  selectedEnginePowerMAX = '';
  selectedEngineSizeMIN = '';
  selectedEngineSizeMAX = '';
  selectedDrivingLicence = '';
  selectedPayloadMIN = '';
  selectedPayloadMAX = '';
  selectedWeightMIN = '';
  selectedWeightMAX = '';
  selectedTruckType = '';
  selectedVolumeMIN = '';
  selectedVolumeMAX = '';
  selectedPriceMIN = '';
  selectedPriceMAX = '';
  selectedYearMIN = '';
  selectedYearMAX = '';
  selectedKilometrageMIN = '';
  selectedKilometrageMAX = '';
  selectedGasType = '';
  selectedCondition = '';
  selectedCounties: string[] = [];
  selectedGearType = '';
  selectedBuyOrLease = '';
  selectedDoorNumber = '';
  selectedColors: string[] = [];
  selectedSellerType = '';

  constructor(
    private readonly http: HttpClient,
    private readonly auth: Auth
  ) {}

  private readonly translations: Record<CarsTranslationKey, string> = {
    searchPlaceholder: 'Pretrazi oglase',
    filtersTitle: 'Filteri vozila',
    showMoreFilters: 'Prikazi vise filtera',
    clearFilters: 'Ocisti filtere',
    searchButton: 'Trazi',
    featuredTitle: 'Istaknuti oglasi',
    adsTitle: 'Aktualni oglasi',
    loadingAds: 'Ucitavanje oglasa...',
    noAdsFound: 'Nema oglasa za zadane kriterije.',
    publishedOn: 'Objavljeno',
    saveAd: 'Spremi oglas',
    savedAd: 'Spremljeno',
    savingAd: 'Spremanje...',
  };

  ngOnInit(): void {
    this.loadAdsFromDatabase(this.selectedVehicle_type);

    this.auth.loadUser();
    this.currentUser$ = this.auth.currentUser$;
    this.currentUser$
      .pipe(
        filter((user): user is CurrentUser => Boolean(user?.id)),
        take(1),
      )
      .subscribe((user) => {
        this.currentUser = user;
        this.saveAdButton$.next(user.id > 0);
        console.log('current user id:', user.id);
      });

  }

  t(key: CarsTranslationKey): string {
    return this.translations[key] ?? key;
  }

  hideAllDropdowns(): void {
    Object.keys(this.dropdowns).forEach((key) => {
      this.dropdowns[key] = false;
    });
  }

  onBrandsChange(brands: string[]): void {
    this.selectedBrands = brands;
    this.selectedModels = [];
    this.manualBrandInput = this.selectedBrands[0] ?? '';
    this.manualModelInput = '';
  }

  onModelsChange(models: string[]): void {
    this.selectedModels = models;
    this.manualModelInput = this.selectedModels[0] ?? '';
  }

  onEnginePowerMINChange(value: string): void { this.selectedEnginePowerMIN = value; }
  onEnginePowerMAXChange(value: string): void { this.selectedEnginePowerMAX = value; }
  onEngineSizeMINChange(value: string): void { this.selectedEngineSizeMIN = value; }
  onEngineSizeMAXChange(value: string): void { this.selectedEngineSizeMAX = value; }
  onDrivingLicenceChange(value: string): void { this.selectedDrivingLicence = value; }
  onPayloadMINChange(value: string): void { this.selectedPayloadMIN = value; }
  onPayloadMAXChange(value: string): void { this.selectedPayloadMAX = value; }
  onWeightMINChange(value: string): void { this.selectedWeightMIN = value; }
  onWeightMAXChange(value: string): void { this.selectedWeightMAX = value; }
  onVolumeMINChange(value: string): void { this.selectedVolumeMIN = value; }
  onVolumeMAXChange(value: string): void { this.selectedVolumeMAX = value; }
  onPriceMINChange(value: string): void { this.selectedPriceMIN = value; }
  onPriceMAXChange(value: string): void { this.selectedPriceMAX = value; }
  onYearMINChange(value: string): void { this.selectedYearMIN = value; }
  onYearMAXChange(value: string): void { this.selectedYearMAX = value; }
  onKilometrageMINChange(value: string): void { this.selectedKilometrageMIN = value; }
  onKilometrageMAXChange(value: string): void { this.selectedKilometrageMAX = value; }
  onGasTypeChange(value: string): void { this.selectedGasType = value; }
  onConditionChange(value: string): void { this.selectedCondition = value; }
  onCountyChange(values: string[]): void { this.selectedCounties = values; }
  onGearShiftChange(value: string): void { this.selectedGearType = value; }
  onBuyOrLeaseChange(value: string): void { this.selectedBuyOrLease = value; }
  onDoorNumberChange(value: string): void { this.selectedDoorNumber = value; }
  onColorChange(values: string[]): void { this.selectedColors = values; }
  onSellerTypeChange(value: string): void { this.selectedSellerType = value; }



  toggleMoreFilters(): void {
    this.showMoreFilters = !this.showMoreFilters;
  }

  private loadAdsFromDatabase(category: string = this.selectedVehicle_type, page = 1): void {
    if (this.isRequestInFlight) {
      return;
    }

    const safeTotalPages = this.totalPages > 0 ? this.totalPages : 1;
    const safePage = clampPage(page, safeTotalPages);
    const normalizedCategory = category?.trim() || this.selectedVehicle_type;
    const pageSize = 50;

    this.isRequestInFlight = true;
    this.isLoading$.next(true);
    this.errorMessage$.next('');

    const loadedAds: PublicAdCar[] = [];

    const loadNextPage = (offset: number, totalCount: number): void => {
      const params = new HttpParams()
        .set('category', normalizedCategory)
        .set('limit', String(pageSize))
        .set('offset', String(offset));

      this.http
        .get<PagedAdsResponse>(this.adsApiUrl, { params })
        .pipe(timeout(10000))
        .subscribe({
          next: (response) => {
            const items = Array.isArray(response?.items) ? response.items : [];
            const nextTotalCount = Number(response?.totalCount ?? totalCount ?? 0);

            loadedAds.push(...items);

            if (items.length === 0 || loadedAds.length >= nextTotalCount) {
              this.allAds = loadedAds;
              this.totalAdsCount = loadedAds.length;
              this.markSavedAds(loadedAds);
              this.refreshResults(safePage);
              this.isRequestInFlight = false;
              this.isLoading$.next(false);
              return;
            }

            loadNextPage(offset + items.length, nextTotalCount);
          },
          error: (error: unknown) => {
            console.error('Failed to load cars from database', error);
            this.errorMessage$.next(getLoadErrorMessage(error));
            this.allAds = [];
            this.PublicAdCars$.next([]);
            this.totalAdsCount = 0;
            this.currentPage = 1;
            this.isRequestInFlight = false;
            this.isLoading$.next(false);
          },
        });
    };

    loadNextPage(0, 0);
  }

  applyFilters(): void {
    this.searchText = this.searchText.trim();
    this.activeFilters = this.buildFiltersFromSelectedValues();

    if (this.searchText) {
      this.activeFilters.search = this.searchText;
    } else {
      delete this.activeFilters.search;
    }

    this.syncAppliedFilterChips();
    this.refreshResults(1);
  }






  removeAppliedFilterChip(chip: AppliedFilterChip, event: Event): void {
    event.stopPropagation();

    switch (chip.key) {
      case 'search':
        this.searchText = '';
        break;
      case 'brands':
        this.selectedBrands = [];
        this.selectedModels = [];
        this.manualBrandInput = '';
        this.manualModelInput = '';
        break;
      case 'models':
        this.selectedModels = [];
        this.manualModelInput = '';
        break;
      case 'enginePowerRange':
        this.selectedEnginePowerMIN = '';
        this.selectedEnginePowerMAX = '';
        break;
      case 'engineSizeRange':
        this.selectedEngineSizeMIN = '';
        this.selectedEngineSizeMAX = '';
        break;
      case 'priceRange':
        this.selectedPriceMIN = '';
        this.selectedPriceMAX = '';
        break;
      case 'yearRange':
        this.selectedYearMIN = '';
        this.selectedYearMAX = '';
        break;
      case 'kilometrageRange':
        this.selectedKilometrageMIN = '';
        this.selectedKilometrageMAX = '';
        break;
      case 'drivingLicence':
        this.selectedDrivingLicence = '';
        break;
      case 'payloadRange':
        this.selectedPayloadMIN = '';
        this.selectedPayloadMAX = '';
        break;
      case 'weightRange':
        this.selectedWeightMIN = '';
        this.selectedWeightMAX = '';
        break;
      case 'truckType':
        this.selectedTruckType = '';
        break;
      case 'volumeRange':
        this.selectedVolumeMIN = '';
        this.selectedVolumeMAX = '';
        break;
      case 'gasType':
        this.selectedGasType = '';
        break;
      case 'condition':
        this.selectedCondition = '';
        break;
      case 'county':
        this.selectedCounties = [];
        break;
      case 'gearType':
        this.selectedGearType = '';
        break;
      case 'buyOrLease':
        this.selectedBuyOrLease = '';
        break;
      case 'color':
        this.selectedColors = [];
        break;
      case 'doorNumber':
        this.selectedDoorNumber = '';
        break;
      case 'sellerType':
        this.selectedSellerType = '';
        break;
      default:
        break;
    }

    this.activeFilters = this.buildFiltersFromSelectedValues();
    this.syncAppliedFilterChips();
    this.refreshResults(1);
  }

  clearFilters(): void {
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
    this.activeFilters = {};
    this.appliedFilterChips = [];
    this.refreshResults(1);
  }

  get hasAppliedFilterChips(): boolean {
    return this.appliedFilterChips.length > 0;
  }

  getAppliedFilterChipRemoveButtonId(chip: AppliedFilterChip, index: number): string {
    const safeKey = chip.key.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const safeValue = chip.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `applied-filter-chip-remove-${safeKey}-${safeValue}-${index}`.replace(/-+/g, '-');
  }

  get totalPages(): number {
    return this.totalAdsCount > 0 ? Math.ceil(this.totalAdsCount / this.adsPerPage) : 0;
  }

  get pageNumbers(): number[] {
    return getPageNumbers(this.totalPages);
  }

  get pagedAds(): PublicAdCar[] {
    return this.PublicAdCars$.value ?? [];
  }

  goToPage(page: number): void {
    if (this.totalPages <= 0) return;
    const targetPage = clampPage(page, this.totalPages);
    if (targetPage === this.currentPage) return;
    this.refreshResults(targetPage);
  }

  goToPreviousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  goToNextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  private refreshResults(page = 1): void {
    const filtered = this.filterAds();
    this.totalAdsCount = filtered.length;
    const safePage = clampPage(page, this.totalPages > 0 ? this.totalPages : 1);
    this.currentPage = safePage;
    const start = (safePage - 1) * this.adsPerPage;
    this.PublicAdCars$.next(filtered.slice(start, start + this.adsPerPage));
  }

  private filterAds(): PublicAdCar[] {
    const filters = this.getRequestFilters();
    return this.allAds.filter((ad) => this.matchesFilters(ad, filters));
  }

  private getRequestFilters(): HomeAdFilters {
    const filters = { ...this.activeFilters };
    const search = this.searchText.trim();

    if (search) {
      filters.search = search;
    } else {
      delete filters.search;
    }

    return filters;
  }

  private buildFiltersFromSelectedValues(): HomeAdFilters {
    const filters: HomeAdFilters = {};

    if (this.selectedBrands.length > 0) filters.brands = this.selectedBrands.join(',');
    if (this.selectedModels.length > 0) filters.models = this.selectedModels.join(',');
    if (this.selectedEnginePowerMIN.trim()) filters.enginePowerMin = this.selectedEnginePowerMIN.trim();
    if (this.selectedEnginePowerMAX.trim()) filters.enginePowerMax = this.selectedEnginePowerMAX.trim();
    if (this.selectedEngineSizeMIN.trim()) filters.engineSizeMin = this.selectedEngineSizeMIN.trim();
    if (this.selectedEngineSizeMAX.trim()) filters.engineSizeMax = this.selectedEngineSizeMAX.trim();
    if (this.selectedDrivingLicence.trim()) filters.drivingLicence = this.selectedDrivingLicence.trim();
    if (this.selectedPayloadMIN.trim()) filters.payloadMin = this.selectedPayloadMIN.trim();
    if (this.selectedPayloadMAX.trim()) filters.payloadMax = this.selectedPayloadMAX.trim();
    if (this.selectedWeightMIN.trim()) filters.weightMin = this.selectedWeightMIN.trim();
    if (this.selectedWeightMAX.trim()) filters.weightMax = this.selectedWeightMAX.trim();
    if (this.selectedTruckType.trim()) filters.truckType = this.selectedTruckType.trim();
    if (this.selectedVolumeMIN.trim()) filters.volumeMin = this.selectedVolumeMIN.trim();
    if (this.selectedVolumeMAX.trim()) filters.volumeMax = this.selectedVolumeMAX.trim();
    if (this.selectedPriceMIN.trim()) filters.priceMin = this.selectedPriceMIN.trim();
    if (this.selectedPriceMAX.trim()) filters.priceMax = this.selectedPriceMAX.trim();
    if (this.selectedYearMIN.trim()) filters.yearMin = this.selectedYearMIN.trim();
    if (this.selectedYearMAX.trim()) filters.yearMax = this.selectedYearMAX.trim();
    if (this.selectedKilometrageMIN.trim()) filters.kilometrageMin = this.selectedKilometrageMIN.trim();
    if (this.selectedKilometrageMAX.trim()) filters.kilometrageMax = this.selectedKilometrageMAX.trim();
    if (this.selectedGasType.trim()) filters.gasType = this.selectedGasType.trim();
    if (this.selectedCondition.trim()) filters.condition = this.selectedCondition.trim();
    if (this.selectedCounties.length > 0) filters.county = this.selectedCounties.join(',');
    if (this.selectedGearType.trim()) filters.gearType = this.selectedGearType.trim();
    if (this.selectedBuyOrLease.trim()) filters.buyOrLease = this.selectedBuyOrLease.trim();
    if (this.selectedColors.length > 0) filters.color = this.selectedColors.join(',');
    if (this.selectedDoorNumber.trim()) filters.doorNumber = this.selectedDoorNumber.trim();
    if (this.selectedSellerType.trim()) filters.sellerType = this.selectedSellerType.trim();

    return filters;
  }

  private matchesFilters(ad: PublicAdCar, filters: HomeAdFilters): boolean {
    if (filters.brands && !this.matchesCsvValue(ad.brand, filters.brands)) return false;
    if (filters.models && !this.matchesCsvValue(ad.model, filters.models)) return false;
    if (filters.search && !this.matchesSearch(ad, filters.search)) return false;
    if (filters.enginePowerMin && ad.enginePower < Number(filters.enginePowerMin)) return false;
    if (filters.enginePowerMax && ad.enginePower > Number(filters.enginePowerMax)) return false;
    if (filters.engineSizeMin && ad.engineSize < Number(filters.engineSizeMin)) return false;
    if (filters.engineSizeMax && ad.engineSize > Number(filters.engineSizeMax)) return false;
    if (filters.payloadMin && ad.payload < Number(filters.payloadMin)) return false;
    if (filters.payloadMax && ad.payload > Number(filters.payloadMax)) return false;
    if (filters.weightMin && ad.weight < Number(filters.weightMin)) return false;
    if (filters.weightMax && ad.weight > Number(filters.weightMax)) return false;
    if (filters.volumeMin && ad.volume < Number(filters.volumeMin)) return false;
    if (filters.volumeMax && ad.volume > Number(filters.volumeMax)) return false;
    if (filters.priceMin && ad.price < Number(filters.priceMin)) return false;
    if (filters.priceMax && ad.price > Number(filters.priceMax)) return false;
    if (filters.yearMin && ad.year < Number(filters.yearMin)) return false;
    if (filters.yearMax && ad.year > Number(filters.yearMax)) return false;
    if (filters.kilometrageMin && ad.mileage < Number(filters.kilometrageMin)) return false;
    if (filters.kilometrageMax && ad.mileage > Number(filters.kilometrageMax)) return false;
    if (filters.drivingLicence && !this.matchesCsvValue(ad.drivingLicence, filters.drivingLicence)) return false;
    if (filters.truckType && !this.matchesCsvValue(ad.truckType, filters.truckType)) return false;
    if (filters.gasType && !this.matchesCsvValue(ad.gasType, filters.gasType)) return false;
    if (filters.condition && !this.matchesCsvValue(ad.condition, filters.condition)) return false;
    if (filters.county && !this.matchesCsvValue(ad.county, filters.county)) return false;
    if (filters.gearType && !this.matchesCsvValue(ad.gearType, filters.gearType)) return false;
    if (filters.buyOrLease && !this.matchesCsvValue(ad.buyOrLease, filters.buyOrLease)) return false;
    if (filters.color && !this.matchesCsvValue(ad.color, filters.color)) return false;
    if (filters.doorNumber && !this.matchesCsvValue(ad.doorNumber, filters.doorNumber)) return false;
    if (filters.sellerType && !this.matchesCsvValue(ad.sellerType, filters.sellerType)) return false;

    return true;
  }

  private matchesCsvValue(fieldValue: string, csvValue: string): boolean {
    const expectedValues = csvValue
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0);

    if (expectedValues.length === 0) {
      return true;
    }

    const normalizedField = fieldValue.toLowerCase();
    return expectedValues.some((value) => normalizedField.includes(value));
  }

  private matchesSearch(ad: PublicAdCar, search: string): boolean {
    const normalizedSearch = search.toLowerCase();
    const haystack = [
      ad.title,
      ad.description,
      ad.brand,
      ad.model,
      ad.category,
      ad.subcategory,
      ad.county,
      ad.gasType,
      ad.condition,
      ad.gearType,
      ad.color,
      ad.sellerType,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  }

  private syncAppliedFilterChips(): void {
    const chips: AppliedFilterChip[] = [];
    const search = this.searchText.trim();

    if (search) {
      chips.push({ key: 'search', label: 'Pretraga', value: search });
    }

    this.pushCsvFilterChips(chips, 'brands', 'Marka', this.activeFilters.brands);
    this.pushCsvFilterChips(chips, 'models', 'Model', this.activeFilters.models);
    this.pushRangeChip(chips, 'enginePowerRange', 'Snaga (kW)', this.activeFilters.enginePowerMin, this.activeFilters.enginePowerMax);
    this.pushRangeChip(chips, 'engineSizeRange', 'Obujam (cm3)', this.activeFilters.engineSizeMin, this.activeFilters.engineSizeMax);
    this.pushRangeChip(chips, 'priceRange', 'Cijena (EUR)', this.activeFilters.priceMin, this.activeFilters.priceMax);
    this.pushRangeChip(chips, 'yearRange', 'Godiste', this.activeFilters.yearMin, this.activeFilters.yearMax);
    this.pushRangeChip(chips, 'kilometrageRange', 'Kilometraza', this.activeFilters.kilometrageMin, this.activeFilters.kilometrageMax);
    this.pushRangeChip(chips, 'payloadRange', 'Teret', this.activeFilters.payloadMin, this.activeFilters.payloadMax);
    this.pushRangeChip(chips, 'weightRange', 'Masa', this.activeFilters.weightMin, this.activeFilters.weightMax);
    this.pushRangeChip(chips, 'volumeRange', 'Obujam tereta', this.activeFilters.volumeMin, this.activeFilters.volumeMax);

    this.pushSingleValueChip(chips, 'drivingLicence', 'Vozacka', this.activeFilters.drivingLicence);
    this.pushSingleValueChip(chips, 'truckType', 'Tip vozila', this.activeFilters.truckType);
    this.pushSingleValueChip(chips, 'gasType', 'Gorivo', this.activeFilters.gasType);
    this.pushSingleValueChip(chips, 'condition', 'Stanje', this.activeFilters.condition);
    this.pushCsvFilterChips(chips, 'county', 'Zupanija', this.activeFilters.county);
    this.pushSingleValueChip(chips, 'gearType', 'Mjenjac', this.activeFilters.gearType);
    this.pushSingleValueChip(chips, 'buyOrLease', 'Kupnja/Leasing', this.activeFilters.buyOrLease);
    this.pushCsvFilterChips(chips, 'color', 'Boja', this.activeFilters.color);
    this.pushSingleValueChip(chips, 'doorNumber', 'Broj vrata', this.activeFilters.doorNumber);
    this.pushSingleValueChip(chips, 'sellerType', 'Prodavatelj', this.activeFilters.sellerType);

    this.appliedFilterChips = chips;
  }

  private pushSingleValueChip(chips: AppliedFilterChip[], key: string, label: string, value?: string): void {
    if (!value || !value.trim()) {
      return;
    }

    chips.push({ key, label, value: value.trim() });
  }

  private pushCsvFilterChips(chips: AppliedFilterChip[], key: string, label: string, csvValue?: string): void {
    if (!csvValue || !csvValue.trim()) {
      return;
    }

    csvValue
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .forEach((value) => chips.push({ key, label, value }));
  }

  private pushRangeChip(
    chips: AppliedFilterChip[],
    key: string,
    label: string,
    min?: string,
    max?: string,
  ): void {
    const hasMin = !!min?.trim();
    const hasMax = !!max?.trim();

    if (!hasMin && !hasMax) {
      return;
    }

    const minLabel = hasMin ? min!.trim() : 'od 0';
    const maxLabel = hasMax ? max!.trim() : 'max';
    chips.push({ key, label, value: `${minLabel} - ${maxLabel}` });
  }

  protected readonly faFilter = faFilter;
  protected readonly faArrowRight = faArrowRight;
  protected readonly faEllipsis = faEllipsis;
  protected readonly faTrashCan = faTrashCan;
  protected readonly faSliders = faSliders;
}
