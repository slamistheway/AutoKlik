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


const STEP_KEY = 'checkout.currentStep';
const CATEGORY_KEY = 'checkout.categoryState';
const SUBCATEGORIES_KEY = 'checkout.subcategory';
const BRANDS_KEY = 'checkout.brand';
const MODEL_KEY = 'checkout.model';
const ENGINEPOWER_KEY = 'checkout.enginepower';
const YEAR_KEY = 'checkout.year';
const PRICE_KEY = 'checkout.price';
const KILOMETRAGE_KEY = 'checkout.kilometrage';
const FUEL_KEY = 'checkout.fuel';
const CONDITION_KEY = 'checkout.condition';
const COUNTY_KEY = 'checkout.county';
const SELLERTYPE_KEY = 'checkout.sellerType';
const BUYORLEASE_KEY = 'checkout.buyOrLease';
const GEARTYPE_KEY = 'checkout.gearType';
const COLOR_KEY = 'checkout.color';
const DOORNUMBER_KEY = 'checkout.doorNumber';
const DRIVINGLICENCE_KEY = 'checkout.drivingLicence';
const WEIGHT_KEY = 'checkout.weight';
const PAYLOAD_KEY = 'checkout.payload';
const VOLUME_KEY = 'checkout.volume';
const TITLE_KEY = 'checkout.title';
const DESCRIPTION_KEY = 'checkout.description';
const IMAGES_KEY = 'checkout.images';

const detailKeys = {
  brand: BRANDS_KEY, model: MODEL_KEY, enginePower: ENGINEPOWER_KEY, year: YEAR_KEY, price: PRICE_KEY,
  kilometrage: KILOMETRAGE_KEY, fuel: FUEL_KEY, condition: CONDITION_KEY, county: COUNTY_KEY,
  sellerType: SELLERTYPE_KEY, buyOrLease: BUYORLEASE_KEY, gearType: GEARTYPE_KEY, color: COLOR_KEY,
  doorNumber: DOORNUMBER_KEY, drivingLicence: DRIVINGLICENCE_KEY, weight: WEIGHT_KEY,
  payload: PAYLOAD_KEY, volume: VOLUME_KEY, title: TITLE_KEY, description: DESCRIPTION_KEY,
} as const;

interface StoredImage { name: string; type: string; lastModified: number; dataUrl: string }
let imageSaveVersion = 0;

function readStoredValue(key: string): unknown {
  try { return JSON.parse(window.localStorage.getItem(key) ?? 'null'); } catch { return null; }
}

function readCategory(): CheckoutCategoryState {
  const category = readStoredValue(CATEGORY_KEY);
  const subcategory = readStoredValue(SUBCATEGORIES_KEY);
  return { category: typeof category === 'string' ? category : '', subcategory: typeof subcategory === 'string' ? subcategory : '' };
}

function readDetails(): CheckoutDetailsState {
  const details = emptyDetails();
  for (const field of Object.keys(detailKeys) as (keyof typeof detailKeys)[]) {
    const value = readStoredValue(detailKeys[field]);
    const numeric = ['year', 'price', 'kilometrage', 'doorNumber', 'weight', 'payload', 'volume'].includes(field);
    if (numeric ? typeof value === 'number' && Number.isFinite(value) : typeof value === 'string') {
      Object.assign(details, { [field]: value });
    }
  }

  const images = readStoredValue(IMAGES_KEY);
  if (Array.isArray(images)) {
    details.images = images.flatMap((image: StoredImage) => {
      try {
        const binary = atob(image.dataUrl.slice(image.dataUrl.indexOf(',') + 1));
        const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
        return [new File([bytes], image.name, { type: image.type, lastModified: image.lastModified })];
      } catch { return []; }
    });
  }
  return details;
}

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
    categoryState = readCategory();
    detailsState = readDetails();
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

export function hasAtLeastFourStoredInputs() {
  if (typeof window === 'undefined') return false;
  return [...Object.values(detailKeys), IMAGES_KEY].filter(key => {
    const value = readStoredValue(key);
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return Number.isFinite(value);
    return Array.isArray(value) && value.length > 0;
  }).length >= 4;
}

function persistDetails() {
  if (typeof window === 'undefined') return;
  for (const field of Object.keys(detailKeys) as (keyof typeof detailKeys)[]) {
    window.localStorage.setItem(detailKeys[field], JSON.stringify(detailsState[field]));
  }
  const version = ++imageSaveVersion;
  if (!detailsState.images.length) {
    window.localStorage.setItem(IMAGES_KEY, '[]');
    return;
  }
  void Promise.all(detailsState.images.map(file => new Promise<StoredImage>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, lastModified: file.lastModified, dataUrl: String(reader.result) });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  }))).then(images => {
    if (version === imageSaveVersion) window.localStorage.setItem(IMAGES_KEY, JSON.stringify(images));
  }).catch(error => console.error('Could not save checkout images:', error));
}

export function setCategoryState(state: CheckoutCategoryState) {
  initialize();
  categoryState = { ...state };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CATEGORY_KEY, JSON.stringify(categoryState.category));
    window.localStorage.setItem(SUBCATEGORIES_KEY, JSON.stringify(categoryState.subcategory));
  }
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

export function hasStoredDraftState() {
  if (typeof window === 'undefined') return false;

  try {
    const category = readCategory();
    const details = readDetails();

    return Boolean(
      category?.category?.trim() &&
      category.subcategory?.trim() &&
      details?.brand?.trim() &&
      details.model?.trim() &&
      details.year !== null && details.year !== undefined &&
      details.price !== null && details.price !== undefined &&
      details.fuel?.trim() &&
      details.condition?.trim() &&
      details.sellerType?.trim() &&
      details.title?.trim() &&
      details.description?.trim()
    );
  } catch {
    return false;
  }
}

export function clearDetailsState() {
  detailsState = emptyDetails();
  imageSaveVersion++;
  if (typeof window !== 'undefined') {
    for (const key of [...Object.values(detailKeys), IMAGES_KEY]) window.localStorage.removeItem(key);
  }
}
export function setCurrentStep(step: number) {
  initialize();
  if (!Number.isInteger(step) || step < 1 || step > 3) return;
  currentStep = step;
  if (typeof window !== 'undefined') window.localStorage.setItem(STEP_KEY, String(step));
}
export function getCurrentStep() { return currentStep; }


export function reset() {
  localStorage.removeItem(CATEGORY_KEY);
  localStorage.removeItem(SUBCATEGORIES_KEY);
  localStorage.removeItem(STEP_KEY);
  
  categoryState = emptyCategory();
  clearDetailsState();
  currentStep = 1;
}


