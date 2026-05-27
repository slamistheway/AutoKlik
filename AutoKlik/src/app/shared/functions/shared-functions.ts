import {HttpErrorResponse, HttpParams} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export function getProfileImageUrl(user: { pfp?: string } | null): string {
  const pfp = user?.pfp?.trim();

  if (!pfp) {
    console.log("No profile picture found, using default.");
    return 'http://localhost:3000/default-pfp.jpg';
  }

  return `http://localhost:3000/${pfp}`;
}

function extractFirstImagePath(images: unknown): string | null {
  if (Array.isArray(images)) {
    for (const image of images) {
      const resolved = extractFirstImagePath(image);
      if (resolved) {
        return resolved;
      }
    }

    return null;
  }

  if (typeof images !== 'string') {
    return null;
  }

  const trimmed = images.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('[') || trimmed.startsWith('"')) {
    try {
      return extractFirstImagePath(JSON.parse(trimmed));
    } catch {
      // Ignore malformed JSON and fall through to string handling.
    }
  }

  if (trimmed.includes(';')) {
    const firstPath = trimmed
      .split(';')
      .map((image) => image.trim())
      .find((image) => image.length > 0);

    if (firstPath) {
      return firstPath;
    }
  }

  return trimmed;
}



export function getAdImageUrl(images: unknown, fallbackUrl = '/car generic.png'): string {
  const imagePath = extractFirstImagePath(images);
  const url = imagePath ?? fallbackUrl;

  if (/^(https?:\/\/|data:)/i.test(url)) {
    return url;
  }

  return url.startsWith('/') ? url : `http://localhost:3000/${url}`;
}

export function clampPage(page: number, totalPages: number): number {
  if (totalPages <= 0) {
    return 1;
  }

  return Math.min(Math.max(page, 1), totalPages);
}

export function getTotalPages<T>(items: readonly T[] | null | undefined, pageSize: number): number {
  const safePageSize = Math.max(pageSize, 1);
  const totalItems = items?.length ?? 0;
  return totalItems > 0 ? Math.ceil(totalItems / safePageSize) : 0;
}

export function getPageNumbers(totalPages: number): number[] {
  return Array.from({ length: Math.max(totalPages, 0) }, (_, index) => index + 1);
}

export function getPaginatedItems<T>(
  items: readonly T[] | null,
  currentPage: number,
  pageSize: number,
): T[] {
  const safeItems = items ?? [];
  const totalPages = getTotalPages(safeItems, pageSize);

  if (totalPages <= 0) {
    return [];
  }

  const safePage = clampPage(currentPage, totalPages);
  const safePageSize = Math.max(pageSize, 1);
  const startIndex = (safePage - 1) * safePageSize;

  return safeItems.slice(startIndex, startIndex + safePageSize);
}





/*--------------------------- HTTP PARAMS INITIALIZATION ---------------------------*/
export function appendHttpParam(filters: any, params: HttpParams): HttpParams {
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

  return params;

}



/*--------------------------------------JSON-----------------------------------------------*/
type VehicleType = 'cars' | 'motorcycle' | 'van';

interface BrandModelsEntry {
  brand: string;
  models: string[];
}

function normalizeVehicleType(vehicleType: string | null | undefined): VehicleType | null {
  if (vehicleType === 'cars') {
    return 'cars';
  }

  if (vehicleType === 'motorcycle') {
    return 'motorcycle';
  }

  if (vehicleType === 'van' || vehicleType === 'vans') {
    return 'van';
  }

  return null;
}

function getBrandModelsJsonPath(vehicleType: string | null | undefined): string | null {
  const normalizedType = normalizeVehicleType(vehicleType);

  if (!normalizedType) {
    return null;
  }

  const fileNameByType: Record<VehicleType, string> = {
    cars: 'cars_brandsAndModels.json',
    motorcycle: 'motorcycles_brandsAndModels.json',
    van: 'vans_brandsAndModels.json',
  };

  // Root-relative path works from any Angular route depth.
  return `/${fileNameByType[normalizedType]}`;
}

async function getBrandModelsData(vehicleType: string | null | undefined): Promise<BrandModelsEntry[]> {
  const filePath = getBrandModelsJsonPath(vehicleType);

  if (!filePath) {
    return [];
  }

  try {
    const response = await fetch(filePath);

    if (!response.ok) {
      console.error(`Failed to load ${filePath}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      console.error(`Invalid JSON format in ${filePath}. Expected an array.`);
      return [];
    }

    return data.reduce<BrandModelsEntry[]>((acc, item) => {
      if (typeof item?.brand !== 'string' || !Array.isArray(item?.models)) {
        return acc;
      }

      acc.push({
        brand: item.brand,
        models: item.models.filter((model: unknown): model is string => typeof model === 'string'),
      });
      return acc;
    }, []);
  } catch (error) {
    console.error(`Error while loading ${filePath}`, error);
    return [];
  }
}

export async function getBrandsFromJson(vehicle_type = 'car'): Promise<string[]> {
  const data = await getBrandModelsData(vehicle_type);
  return data.map((item) => item.brand);
}

export async function getModelsFromJson(vehicle_type = 'car'): Promise<Record<string, string[]>> {
  const data = await getBrandModelsData(vehicle_type);

  return data.reduce((acc: Record<string, string[]>, item) => {
    acc[item.brand] = [...item.models];
    return acc;
  }, {});
}

export async function readFilesAsDataUrls(files: FileList | File[]): Promise<string[]> {
  const fileArray = Array.from(files);

  if (fileArray.length === 0) {
    return [];
  }

  const readers = fileArray.map(
    (file) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      }),
  );

  return Promise.all(readers);
}



/*----------------------------------CATEGORY/SUBCATEGORY LABEL----------------------------------------*/
export const categoryLabelMap: Record<string, string> = {
  car: 'Automobili',
  motorcycle: 'Motocikli',
  van: 'Kombi vozila',
  truck: 'Kamioni',
  other: 'Ostalo',
  agricultural: 'Poljoprivredna vozila',
  trailer: 'Prikolice',
  construction: 'Građevinska vozila',
  camp: 'Kamperi i kamp prikolice',
};

export const subcategoryLabelMap: Record<string, string> = {
  personal_cars: 'Osobni automobili',
  sports_motorcycle: 'Sportski motori',
  road_motorcycle: 'Cestovni motori',
  moped_motorcycle: 'Mopedi',
  chopper_motorcycle: 'Chopperi',
  scooter_motorcycle: 'Skuteri',
  quad_motorcycle: 'Cetverokotaci',
  van: 'Kombi vozila',
  truck: 'Kamioni',
  crane_other: 'Dizalice',
  tractor_agricultural: 'Traktori',
  combine_agricultural: 'Kombajni',
};

export function getCategoryLabel(category: string): string {
  return categoryLabelMap[category] ?? category;
}

export function getSubcategoryLabel(subcategory: string): string {
  return subcategoryLabelMap[subcategory] ?? subcategory;
}



/*----------------------------------LOGGER, ERROR, DEBUG----------------------------------------*/

export function getLoadErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
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

  return 'Nije moguće učitati oglase. Pokušajte ponovo.';
}


/*---------------------------------- TOAST ----------------------------------------*/
export type ToastType = 'success' | 'error' | 'info';
let toastIdCounter = 0;
const toastTimers = new Map<number, number>();
export const saveAdToasts = new BehaviorSubject<SaveToast[]>([]);

export interface SaveToast {
  id: number;
  message: string;
  type: ToastType;
}

export function getToastCSS(type: ToastType): string {
  if (type === 'success') {
    return 'bg-[var(--color-navbar)] text-white';
  }

  if (type === 'error') {
    return 'bg-red-600 text-white';
  }

  return 'bg-gray-800 text-white';
}

export function enqueueToast(message: string, type: ToastType): void {
  const id = ++toastIdCounter;
  // update shared subject
  saveAdToasts.next([...saveAdToasts.value, { id, message, type }]);

  const timerId = window.setTimeout(() => {
    dismissToast(id);
  }, 3000);

  toastTimers.set(id, timerId);
}

export function dismissToast(id: number): void {
  const timerId = toastTimers.get(id);

  if (timerId) {
    window.clearTimeout(timerId);
    toastTimers.delete(id);
  }

  saveAdToasts.next(saveAdToasts.value.filter((toast) => toast.id !== id));
}


export function getSaveErrorMessage(error: unknown): string {
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


/*---------------------------------- SAVE AD BUTTON ----------------------------------------*/




