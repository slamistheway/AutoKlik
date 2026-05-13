export type AppLanguage = 'hr' | 'en';

export type HomeTranslationKey =
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


export type HomeTranslationsByLanguage = Record<AppLanguage, Record<HomeTranslationKey, string>>;

export interface HomeTranslationEntry {
  language: AppLanguage;
  searchPlaceholder: string;
  filtersTitle: string;
  showMoreFilters: string;
  clearFilters: string;
  searchButton: string;
  featuredTitle: string;
  adsTitle: string;
  loadingAds: string;
  noAdsFound: string;
  publishedOn: string;
  saveAd: string;
  savedAd: string;
  savingAd: string;
}

