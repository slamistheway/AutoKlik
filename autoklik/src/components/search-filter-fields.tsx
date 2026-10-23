'use client';

import type {Dispatch, SetStateAction} from 'react';
import {CATEGORIES, SUBCATEGORIES} from '@/lib/checkout-data';
import FilterChoose from '@/components/filters/filter-choose';
import FilterNumeric from '@/components/filters/filter-numeric';
import FilterBrands from '@/components/filters/filter-brands';
import FilterModels from '@/components/filters/filter-models';
import FilterCounty from '@/components/filters/filter-county';
import FilterColor from '@/components/filters/filter-color';
import {searchRanges} from '@/shared/search-state';

export function SearchFilterFields({draft, setDraft}: {draft: Record<string, string>; setDraft: Dispatch<SetStateAction<Record<string, string>>>}) {
    const category = draft.category ?? '';
    const vehicleType = category === 'motorcycle' || category === 'van' ? category : 'cars';
    const values = (key: string) => draft[key]?.split(',').filter(Boolean) ?? [];
    const change = (key: string, value: string) => setDraft(current => ({...current, [key]: value}));

    return (
        <>
            <label className="mb-5 block text-sm font-medium">Pojam pretrage<input value={draft.search ?? ''} onChange={event => change('search', event.target.value)} maxLength={200} placeholder="Marka, model ili opis" className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2" /></label>
            <div className="mb-5 grid gap-5
              sm:grid-cols-2">
                <label className="text-sm font-medium">Kategorija
                    <select value={category} onChange={event => setDraft(current => ({...current, category: event.target.value, subcategory: '', brands: '', models: ''}))} className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2">
                        <option value="">Sve kategorije</option>
                        {CATEGORIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                </label>
                <label className="text-sm font-medium">Podkategorija
                    <select value={draft.subcategory ?? ''} disabled={!category} onChange={event => change('subcategory', event.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 disabled:opacity-50">
                        <option value="">Sve podkategorije</option>
                        {(SUBCATEGORIES[category] ?? []).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                </label>
            </div>
            <div className="grid grid-cols-1 gap-x-5 gap-y-6
              sm:grid-cols-2
              lg:grid-cols-4">
                <FilterBrands title="Marka" selectedVehicle_type={vehicleType} mode="multi" value={values('brands')} onChange={value => setDraft(current => ({...current, brands: value.join(','), models: ''}))} />
                <FilterModels title="Model" selectedVehicle_type={vehicleType} selectedBrands={values('brands')} mode="multi" value={values('models')} onChange={value => change('models', value.join(','))} />
                {searchRanges.map(key => <FilterNumeric key={key} filterType={key} mode="range" value={{min: draft[key + 'Min'] ?? '', max: draft[key + 'Max'] ?? ''}} onChange={value => setDraft(current => ({...current, [key + 'Min']: value.min, [key + 'Max']: value.max}))} />)}
                <FilterChoose filterType="condition" value={draft.condition ?? ''} onChange={value => change('condition', value)} />
                <FilterCounty mode="multi" value={values('counties')} onChange={value => change('counties', value.join(','))} />
                <FilterChoose filterType="buyOrLease" value={draft.buyOrLease ?? ''} onChange={value => change('buyOrLease', value)} />
                <FilterChoose filterType="sellerType" value={draft.sellerType ?? ''} onChange={value => change('sellerType', value)} />
                <FilterChoose filterType="fuel" value={draft.fuel ?? ''} onChange={value => change('fuel', value)} />
                <FilterChoose filterType="gear" value={draft.gearType ?? ''} onChange={value => change('gearType', value)} />
                <FilterColor mode="multi" value={values('colors')} onChange={value => change('colors', value.join(','))} />
                <FilterChoose filterType="doorNumber" value={draft.doorNumber ?? ''} onChange={value => change('doorNumber', value)} />
            </div>
        </>
    );
}
