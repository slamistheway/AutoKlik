import { BadRequestException } from '@nestjs/common';
import { asc, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import { ads } from '../db/schema';

export const rangeFields = ['year', 'price', 'kilometrage', 'enginePower', 'engineSize'] as const;
const singles = ['search', 'category', 'subcategory', 'fuel', 'condition', 'buyOrLease', 'sellerType', 'gearType', 'doorNumber'] as const;
const lists = ['brands', 'models', 'counties', 'colors'] as const;
export const sorts = ['newest', 'oldest', 'priceAsc', 'priceDesc', 'yearDesc', 'kilometrageAsc'] as const;
export type SearchFilters = Record<string, string>;

export function parseSearch(value: unknown, pagination = true): SearchFilters {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Neispravna pretraga.');
  const output: SearchFilters = {};
  const allowed = [...singles, ...lists, ...rangeFields.flatMap(key => [key + 'Min', key + 'Max']), ...(pagination ? ['page', 'pageSize', 'sort'] : [])];
  for (const [key, raw] of Object.entries(value)) {
    if (!allowed.includes(key) || typeof raw !== 'string' || raw.length > 2000) throw new BadRequestException('Neispravan filter: ' + key);
    const val = raw.trim();
    if (!val) continue;
    if (lists.includes(key as typeof lists[number])) {
      const entries = [...new Set(val.split(',').map(item => item.trim()).filter(Boolean))].sort();
      if (entries.length > 50 || entries.some(item => item.length > 100)) throw new BadRequestException('Previše vrijednosti filtera.');
      if (entries.length) output[key] = entries.join(',');
    } else output[key] = val;
  }
  for (const key of rangeFields) {
    for (const suffix of ['Min', 'Max']) {
      const field = key + suffix;
      if (output[field] !== undefined) {
        const number = Number(output[field]);
        if (!/^\d+(\.\d+)?$/.test(output[field]) || !Number.isFinite(number) || number < 0 || number > (key === 'price' ? 1e12 : 2147483647) || key !== 'price' && !Number.isInteger(number) || key === 'year' && (number < 1886 || number > 2100)) throw new BadRequestException('Neispravan raspon: ' + key);
        output[field] = String(number);
      }
    }
    if (output[key + 'Min'] !== undefined && output[key + 'Max'] !== undefined && Number(output[key + 'Min']) > Number(output[key + 'Max'])) throw new BadRequestException('Minimum ne može biti veći od maksimuma.');
  }
  if (output.doorNumber && !['2', '3', '4', '5+'].includes(output.doorNumber)) throw new BadRequestException('Neispravan broj vrata.');
  if (output.search && output.search.length > 200) throw new BadRequestException('Predugačak pojam pretrage.');
  for (const key of ['page', 'pageSize']) {
    if (output[key] && (!/^[1-9]\d*$/.test(output[key]) || Number(output[key]) > (key === 'pageSize' ? 60 : 100000))) throw new BadRequestException('Neispravna stranica.');
  }
  if (output.sort && !sorts.includes(output.sort as typeof sorts[number])) throw new BadRequestException('Neispravno sortiranje.');
  return output;
}

export function searchConditions(filters: SearchFilters): SQL[] {
  const conditions: SQL[] = [];
  for (const key of ['category', 'subcategory', 'fuel', 'condition', 'buyOrLease', 'sellerType', 'gearType'] as const) {
    if (filters[key]) conditions.push(eq(ads[key], filters[key]));
  }
  for (const [key, column] of [['brands', ads.brand], ['models', ads.model], ['counties', ads.county], ['colors', ads.color]] as const) {
    if (filters[key]) conditions.push(inArray(column, filters[key].split(',')));
  }
  for (const key of rangeFields) {
    const min = filters[key + 'Min'];
    const max = filters[key + 'Max'];
    if (min !== undefined) conditions.push(key === 'price' ? gte(ads.price, min) : gte(ads[key], Number(min)));
    if (max !== undefined) conditions.push(key === 'price' ? lte(ads.price, max) : lte(ads[key], Number(max)));
  }
  if (filters.doorNumber) conditions.push(filters.doorNumber === '5+' ? gte(ads.doorNumber, 5) : eq(ads.doorNumber, Number(filters.doorNumber)));
  if (filters.search) {
    const term = '%' + filters.search.replace(/[\\%_]/g, '\\$&') + '%';
    conditions.push(or(ilike(ads.title, term), ilike(ads.description, term), ilike(ads.brand, term), ilike(ads.model, term))!);
  }
  return conditions;
}

export function searchOrder(sort = 'newest') {
  const primary = sort === 'priceAsc' ? asc(ads.price) : sort === 'priceDesc' ? desc(ads.price) : sort === 'yearDesc' ? desc(ads.year) : sort === 'kilometrageAsc' ? asc(ads.kilometrage) : sort === 'oldest' ? asc(ads.dateCreated) : desc(ads.dateCreated);
  return [sql`${primary} nulls last`, desc(ads.id)];
}
