import { Injectable } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface CheckoutCategoryState {
  category: string;
  subcategory: string;
}

export interface CheckoutDetailsState {
  brand: string;
  model: string;
  year: number | null;
  price: number | null;
  mileage: number | null;
  fuel: string;
  condition: string;
  county: string;
  sellerType: string;
  buyOrLease: string;
  gearType: string | null;
  color: string | null;
  doorNumber: number | null;
  drivingLicence: string;
  weight: number | null;
  payload: number | null;
  volume: number | null;
  title: string;
  description: string;
  images: File[];
}

const EMPTY_DETAILS_STATE: CheckoutDetailsState = {
  brand: '',
  model: '',
  year: null,
  price: null,
  mileage: null,
  fuel: '',
  condition: '',
  county: '',
  sellerType: '',
  buyOrLease: '',
  gearType: null,
  color: null,
  doorNumber: null,
  drivingLicence: '',
  weight: null,
  payload: null,
  volume: null,
  title: '',
  description: '',
  images: [],
};

@Injectable({ providedIn: 'root' })
export class CheckoutStateService {
  private readonly currentStepStorageKey = 'checkout.currentStep';
  private readonly categoryStateStorageKey = 'checkout.categoryState';
  private readonly detailsStateStorageKey = 'checkout.detailsState';

  constructor(private readonly router: Router) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationStart))
      .subscribe((event: NavigationStart) => {
        const currentUrl = this.router.url;
        const nextUrl = event.url;

        if (this.isCheckoutUrl(currentUrl) && !this.isCheckoutUrl(nextUrl)) {
          this.clearCheckoutStorage();
        }
      });
  }

  private isCheckoutUrl(url: string): boolean {
    return url === '/checkout' || url.startsWith('/checkout/');
  }

  private categoryState = this.readStoredCategoryState();

  private readStoredCategoryState(): CheckoutCategoryState {
    try {
      const raw = globalThis?.localStorage?.getItem(this.categoryStateStorageKey);
      if (!raw) {
        return { category: '', subcategory: '' };
      }

      const parsed = JSON.parse(raw) as Partial<CheckoutCategoryState>;
      if (typeof parsed.category !== 'string' || typeof parsed.subcategory !== 'string') {
        return { category: '', subcategory: '' };
      }

      return {
        category: parsed.category,
        subcategory: parsed.subcategory,
      };
    } catch {
      return { category: '', subcategory: '' };
    }
  }

  private currentStep = this.readStoredStep();

  private readStoredStep(): number {
    const parsed = Number(globalThis?.localStorage?.getItem(this.currentStepStorageKey));
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3) {
      return 1;
    }

    return parsed;
  }

  setCurrentStep(step: number): void {
    if (!Number.isInteger(step) || step < 1 || step > 3) {
      return;
    }

    this.currentStep = step;
    globalThis?.localStorage?.setItem(this.currentStepStorageKey, String(step));
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  clearCurrentStep(): void {
    this.currentStep = 1;
    globalThis?.localStorage?.removeItem(this.currentStepStorageKey);
  }

  private detailsState = this.readStoredDetailsState();

  private readStoredDetailsState(): CheckoutDetailsState {
    try {
      const raw = globalThis?.localStorage?.getItem(this.detailsStateStorageKey);
      if (!raw) {
        return { ...EMPTY_DETAILS_STATE };
      }

      const parsed = JSON.parse(raw) as Partial<CheckoutDetailsState>;
      const year = typeof parsed.year === 'number' && Number.isFinite(parsed.year) ? parsed.year : null;
      const price = typeof parsed.price === 'number' && Number.isFinite(parsed.price) ? parsed.price : null;
      const mileage = typeof parsed.mileage === 'number' && Number.isFinite(parsed.mileage) ? parsed.mileage : null;
      const doorNumber =
        typeof parsed.doorNumber === 'number' && Number.isFinite(parsed.doorNumber) ? parsed.doorNumber : null;
      const weight = typeof parsed.weight === 'number' && Number.isFinite(parsed.weight) ? parsed.weight : null;
      const payload = typeof parsed.payload === 'number' && Number.isFinite(parsed.payload) ? parsed.payload : null;
      const volume = typeof parsed.volume === 'number' && Number.isFinite(parsed.volume) ? parsed.volume : null;

      return {
        brand: typeof parsed.brand === 'string' ? parsed.brand : '',
        model: typeof parsed.model === 'string' ? parsed.model : '',
        year,
        price,
        mileage,
        fuel: typeof parsed.fuel === 'string' ? parsed.fuel : '',
        condition: typeof parsed.condition === 'string' ? parsed.condition : '',
        county: typeof parsed.county === 'string' ? parsed.county : '',
        sellerType: typeof parsed.sellerType === 'string' ? parsed.sellerType : '',
        buyOrLease: typeof parsed.buyOrLease === 'string' ? parsed.buyOrLease : '',
        gearType: typeof parsed.gearType === 'string' ? parsed.gearType : null,
        color: typeof parsed.color === 'string' ? parsed.color : null,
        doorNumber,
        drivingLicence: typeof parsed.drivingLicence === 'string' ? parsed.drivingLicence : '',
        weight,
        payload,
        volume,
        title: typeof parsed.title === 'string' ? parsed.title : '',
        description: typeof parsed.description === 'string' ? parsed.description : '',
        images: [],
      };
    } catch {
      return { ...EMPTY_DETAILS_STATE };
    }
  }

  setCategoryState(state: CheckoutCategoryState): void {
    this.categoryState = { ...state };
    globalThis?.localStorage?.setItem(this.categoryStateStorageKey, JSON.stringify(this.categoryState));
  }

  getCategoryState(): CheckoutCategoryState {
    return { ...this.categoryState };
  }

  hasCategoryState(): boolean {
    return Boolean(this.categoryState.category && this.categoryState.subcategory);
  }

  setDetailsState(state: CheckoutDetailsState): void {
    this.detailsState = { ...state };
    globalThis?.localStorage?.setItem(
      this.detailsStateStorageKey,
      JSON.stringify({
        brand: this.detailsState.brand,
        model: this.detailsState.model,
        year: this.detailsState.year,
        price: this.detailsState.price,
        mileage: this.detailsState.mileage,
        fuel: this.detailsState.fuel,
        condition: this.detailsState.condition,
        county: this.detailsState.county,
        sellerType: this.detailsState.sellerType,
        buyOrLease: this.detailsState.buyOrLease,
        gearType: this.detailsState.gearType,
        color: this.detailsState.color,
        doorNumber: this.detailsState.doorNumber,
        drivingLicence: this.detailsState.drivingLicence,
        weight: this.detailsState.weight,
        payload: this.detailsState.payload,
        volume: this.detailsState.volume,
        title: this.detailsState.title,
        description: this.detailsState.description,
      }),
    );
  }

  getDetailsState(): CheckoutDetailsState {
    return { ...this.detailsState };
  }

  hasDetailsState(): boolean {
    return Boolean(
      this.detailsState.brand &&
      this.detailsState.model &&
      this.detailsState.year &&
      this.detailsState.price !== null &&
      this.detailsState.fuel &&
      this.detailsState.condition &&
      this.detailsState.title.trim() &&
      this.detailsState.description.trim() &&
      this.detailsState.images.length > 0,
    );
  }

  clearDetailsState(): void {
    this.detailsState = { ...EMPTY_DETAILS_STATE };

    globalThis?.localStorage?.removeItem(this.detailsStateStorageKey);
  }

  reset(): void {
    this.categoryState = {
      category: '',
      subcategory: '',
    };

    this.clearDetailsState();

    globalThis?.localStorage?.removeItem(this.categoryStateStorageKey);
    globalThis?.localStorage?.removeItem(this.detailsStateStorageKey);
    this.clearCurrentStep();
  }

  clearCheckoutStorage(): void {
    globalThis?.localStorage?.removeItem(this.currentStepStorageKey);
    globalThis?.localStorage?.removeItem(this.categoryStateStorageKey);
    globalThis?.localStorage?.removeItem(this.detailsStateStorageKey);
    this.reset();
  }
}
