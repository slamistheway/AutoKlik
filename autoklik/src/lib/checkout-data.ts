export const CATEGORIES = [
  { label: 'Osobni automobili', value: 'cars' },
  { label: 'Motocikl', value: 'motorcycle' },
  { label: 'Kombi', value: 'van' },
  { label: 'Ostalo', value: 'other' },
];

export const SUBCATEGORIES: Record<string, { id: string; label: string; value: string }[]> = {
  cars: [{ id: 'personal_cars', label: 'Osobni automobili', value: 'personal_cars' }],
  motorcycle: [
    { id: 'sports_motorcycle', label: 'Sportski motori', value: 'sports_motorcycle' },
    { id: 'road_motorcycle', label: 'Cestovni motori', value: 'road_motorcycle' },
    { id: 'moped_motorcycle', label: 'Mopedi', value: 'moped_motorcycle' },
    { id: 'chopper_motorcycle', label: 'Chopperi', value: 'chopper_motorcycle' },
    { id: 'scooter_motorcycle', label: 'Skuteri', value: 'scooter_motorcycle' },
    { id: 'quad_motorcycle', label: 'Četverokotači', value: 'quad_motorcycle' },
  ],
  van: [{ id: 'van', label: 'Kombi vozila', value: 'van' }],
  other: [
    { id: 'truck', label: 'Kamioni', value: 'truck' },
    { id: 'tractor_agricultural', label: 'Traktori', value: 'tractor_agricultural' },
    { id: 'combine_agricultural', label: 'Kombajni', value: 'combine_agricultural' },
    { id: 'trailer', label: 'Prikolice', value: 'trailer' },
    { id: 'excavator_construction', label: 'Bageri', value: 'excavator_construction' },
    { id: 'crane_construction', label: 'Dizalice', value: 'crane_construction' },
    { id: 'camper_camp', label: 'Kamperi', value: 'camper_camp' },
    { id: 'trailer_camp', label: 'Prikolice za kampiranje', value: 'trailer_camp' },
  ],
};

export const FUEL_OPTIONS = ['diesel', 'petrol', 'electric', 'hybrid', 'lpg'];
export const CONDITION_OPTIONS = ['new', 'used'];
export const SELLER_TYPE_OPTIONS = ['private', 'dealer'];
export const BUY_OR_LEASE_OPTIONS = ['buy', 'lease'];
export const GEAR_TYPE_OPTIONS = ['manual', 'automatic'];
export const COLOR_OPTIONS = ['black', 'white', 'gray', 'silver', 'blue', 'red', 'green', 'yellow'];
export const DOOR_NUMBER_OPTIONS = [2, 3, 4, 5];
export const DRIVING_LICENCE_OPTIONS = ['A1', 'A2', 'A'];
export const COUNTY_OPTIONS = [
  'Zagrebačka', 'Krapinsko-zagorska', 'Sisačko-moslavačka', 'Karlovačka', 'Varaždinska',
  'Koprivničko-križevačka', 'Bjelovarsko-bilogorska', 'Primorsko-goranska', 'Ličko-senjska',
  'Virovitičko-podravska', 'Požeško-slavonska', 'Brodsko-posavska', 'Zadarska', 'Osječko-baranjska',
  'Šibensko-kninska', 'Vukovarsko-srijemska', 'Splitsko-dalmatinska', 'Istarska',
  'Dubrovačko-neretvanska', 'Međimurska', 'Grad Zagreb',
];

const categoryLabels: Record<string, string> = {
  cars: 'Automobili', motorcycle: 'Motocikli', van: 'Kombi vozila', other: 'Ostalo',
};
const subcategoryLabels: Record<string, string> = Object.fromEntries(
  Object.values(SUBCATEGORIES).flat().map(({ value, label }) => [value, label]),
);



export const getCategoryLabel = (value: string) => categoryLabels[value] ?? value;
export const getSubcategoryLabel = (value: string) => subcategoryLabels[value] ?? value;
export const toFuelLabel = (value: string) => ({ petrol: 'Benzin', diesel: 'Dizel', electric: 'Električno', hybrid: 'Hibrid', lpg: 'Plin' }[value] ?? value);
export const toConditionLabel = (value: string) => ({ new: 'Novo', used: 'Rabljeno' }[value] ?? value);
export const toSellerTypeLabel = (value: string) => ({ private: 'Privatni prodavač', dealer: 'Trgovac' }[value] ?? value);
export const toBuyOrLeaseLabel = (value: string) => ({ buy: 'Kupnja', lease: 'Leasing' }[value] ?? value);
export const toGearTypeLabel = (value: string) => ({ manual: 'Ručni', automatic: 'Automatski' }[value] ?? value);
