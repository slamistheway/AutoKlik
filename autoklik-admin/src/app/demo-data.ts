export type AdStatus = 'active' | 'sold' | 'hidden' | 'expired';
export type DemoAd = { id: number; title: string; brand: string; seller: string; location: string; price: number; year: number; mileage: string; status: AdStatus; featured: boolean };
export const statusLabels: Record<AdStatus, string> = { active: 'Aktivan', sold: 'Prodano', hidden: 'Skriven', expired: 'Istekao' };

export const initialAds: DemoAd[] = [
  { id: 1048, title: 'BMW Serija 3 320d', brand: 'BMW', seller: 'Marko Horvat', location: 'Zagreb', price: 27500, year: 2020, mileage: '92.000', status: 'active', featured: true },
  { id: 1047, title: 'Volkswagen Golf 8 2.0 TDI', brand: 'VW', seller: 'Auto Centar Novak', location: 'Varaždin', price: 21900, year: 2021, mileage: '78.500', status: 'active', featured: false },
  { id: 1046, title: 'Audi A4 Avant 35 TDI', brand: 'AUDI', seller: 'Ivan Kovač', location: 'Split', price: 25900, year: 2019, mileage: '110.000', status: 'hidden', featured: false },
  { id: 1045, title: 'Škoda Octavia 1.5 TSI', brand: 'ŠKODA', seller: 'Ana Babić', location: 'Rijeka', price: 18200, year: 2020, mileage: '64.000', status: 'sold', featured: false },
  { id: 1044, title: 'Mercedes-Benz C 220 d', brand: 'MB', seller: 'Auto Centar Novak', location: 'Varaždin', price: 32500, year: 2022, mileage: '48.000', status: 'active', featured: true },
  { id: 1043, title: 'Renault Clio 1.0 TCe', brand: 'RENAULT', seller: 'Petra Marić', location: 'Osijek', price: 11900, year: 2019, mileage: '86.000', status: 'active', featured: false },
  { id: 1042, title: 'Toyota Corolla Hybrid', brand: 'TOYOTA', seller: 'Luka Jurić', location: 'Zadar', price: 20700, year: 2020, mileage: '97.000', status: 'expired', featured: false },
  { id: 1041, title: 'Peugeot 3008 1.5 BlueHDi', brand: 'PEUGEOT', seller: 'Marko Horvat', location: 'Zagreb', price: 23900, year: 2021, mileage: '73.000', status: 'expired', featured: false },
];

export const initialUsers = [
  { id: 201, name: 'Marko Horvat', email: 'marko@example.test', initials: 'MH', type: 'Privatni prodavatelj', joined: '02. 10. 2026.', suspended: false },
  { id: 202, name: 'Auto Centar Novak', email: 'novak@example.test', initials: 'AN', type: 'Trgovac', joined: '24. 09. 2026.', suspended: false },
  { id: 203, name: 'Ivan Kovač', email: 'ivan@example.test', initials: 'IK', type: 'Privatni prodavatelj', joined: '07. 10. 2026.', suspended: false },
  { id: 204, name: 'Ana Babić', email: 'ana@example.test', initials: 'AB', type: 'Privatni prodavatelj', joined: '08. 10. 2026.', suspended: false },
  { id: 205, name: 'Petra Marić', email: 'petra@example.test', initials: 'PM', type: 'Privatni prodavatelj', joined: '11. 10. 2026.', suspended: false },
  { id: 206, name: 'Luka Jurić', email: 'luka@example.test', initials: 'LJ', type: 'Privatni prodavatelj', joined: '01. 10. 2026.', suspended: true },
];

export const initialReports = [
  { id: 301, adId: 1046, reason: 'Netočni podaci o vozilu', description: 'Podaci o kilometraži u opisu ne odgovaraju podacima u oglasu.', reporter: 'Korisnik #218', date: 'Danas, 09:42', priority: 'high', resolved: false },
  { id: 302, adId: 1047, reason: 'Mogući duplikat oglasa', description: 'Jednako vozilo objavljeno je više puta s različitim naslovom.', reporter: 'Korisnik #224', date: 'Danas, 08:16', priority: 'normal', resolved: false },
  { id: 303, adId: 1043, reason: 'Neprimjeren sadržaj', description: 'Prijavljen je neprimjeren tekst u opisu oglasa.', reporter: 'Korisnik #207', date: 'Jučer, 17:30', priority: 'normal', resolved: false },
];

export const initialActivity = [
  { id: 1, title: 'Oglas #1042 automatski je istekao', description: 'Sustav · rok objave od 3 dana', time: '09:18' },
  { id: 2, title: 'Objavljen je novi oglas #1048', description: 'Marko Horvat · BMW Serija 3 320d', time: '08:56' },
  { id: 3, title: 'Korisnik #206 je suspendiran', description: 'Demo administrator · moderacija računa', time: 'Jučer' },
];
