export interface CheckoutCategoryState { category: string; subcategory: string }

export interface CheckoutDetailsState {
  brand: string;
  model: string;
  enginePower: string;
  year: number | null;
  price: number | null;
  kilometrage: number | null;
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

const CATEGORY_KEY = 'checkout.categoryState';
const DETAILS_KEY = 'checkout.detailsState';
const STEP_KEY = 'checkout.currentStep';
const emptyCategory = (): CheckoutCategoryState => ({ category: '', subcategory: '' });
const emptyDetails = (): CheckoutDetailsState => ({
  brand: '', model: '', enginePower: '', year: null, price: null, kilometrage: null, fuel: '', condition: '', county: '',
  sellerType: '', buyOrLease: '', gearType: null, color: null, doorNumber: null, drivingLicence: '',
  weight: null, payload: null, volume: null, title: '', description: '', images: [],
});

let categoryState = emptyCategory();
let detailsState = emptyDetails();
let currentStep = 1;
let initialized = false;

function initialize() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  try {
    const category = JSON.parse(window.localStorage.getItem(CATEGORY_KEY) ?? 'null') as Partial<CheckoutCategoryState> | null;
    if (category && typeof category.category === 'string' && typeof category.subcategory === 'string') {
      categoryState = { category: category.category, subcategory: category.subcategory };
    }
    const details = JSON.parse(window.localStorage.getItem(DETAILS_KEY) ?? 'null') as Partial<CheckoutDetailsState> | null;
    if (details) detailsState = { ...emptyDetails(), ...details, images: [] };
    const step = Number(window.localStorage.getItem(STEP_KEY));
    if (Number.isInteger(step) && step >= 1 && step <= 3) currentStep = step;
  } catch {
    categoryState = emptyCategory();
    detailsState = emptyDetails();
    currentStep = 1;
  }
}

export function hydrate() {
  initialize();
}

function persistDetails() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DETAILS_KEY, JSON.stringify(detailsState, (key, value) => key === 'images' ? undefined : value));
}

export function setCategoryState(state: CheckoutCategoryState) {
  initialize();
  categoryState = { ...state };
}
export function getCategoryState() { return { ...categoryState }; }
export function hasCategoryState() { return Boolean(categoryState.category && categoryState.subcategory); }
export function setDetailsState(state: CheckoutDetailsState) {
  initialize(); detailsState = { ...state, images: [...state.images] }; persistDetails();
}
export function getDetailsState() { return { ...detailsState, images: [...detailsState.images] }; }
export function hasDetailsState() {
  return Boolean(
      detailsState.brand &&
      detailsState.model &&
      detailsState.year &&
      detailsState.price !== null &&
      detailsState.fuel &&
      detailsState.condition &&
      detailsState.sellerType &&
      detailsState.title.trim() &&
      detailsState.description.trim() &&
      detailsState.images.length);
}

export function hasDraftContent() {
  initialize();
  return Boolean(
    detailsState.brand || detailsState.model || detailsState.enginePower || detailsState.year !== null || detailsState.price !== null ||
    detailsState.kilometrage !== null || detailsState.fuel || detailsState.condition || detailsState.county ||
    detailsState.sellerType || detailsState.buyOrLease || detailsState.gearType || detailsState.color ||
    detailsState.doorNumber !== null || detailsState.drivingLicence || detailsState.weight !== null ||
    detailsState.payload !== null || detailsState.volume !== null || detailsState.title.trim() ||
    detailsState.description.trim() || detailsState.images.length > 0
  );
}
export function clearDetailsState() { detailsState = emptyDetails(); if (typeof window !== 'undefined') window.localStorage.removeItem(DETAILS_KEY); }
export function setCurrentStep(step: number) {
  initialize();
  if (!Number.isInteger(step) || step < 1 || step > 3) return;
  currentStep = step;
  window.localStorage.setItem(STEP_KEY, String(step));
}
export function getCurrentStep() { return currentStep; }
export function reset() {
  categoryState = emptyCategory(); detailsState = emptyDetails(); currentStep = 1;
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(CATEGORY_KEY);
    window.localStorage.removeItem(DETAILS_KEY);
    window.localStorage.removeItem(STEP_KEY);
  }
}
