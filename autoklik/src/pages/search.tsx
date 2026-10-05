'use client';

import {useEffect, useState} from 'react';
import {Navbar} from "@/components/navbar";
import {Footer} from "@/components/footer";
import {ArrowRightIcon} from "lucide-react";
import FilterChoose from "@/components/filters/filter-choose";
import FilterNumeric from "@/components/filters/filter-numeric";
import FilterBrands from "@/components/filters/filter-brands";
import FilterModels from "@/components/filters/filter-models";
import FilterCounty from "@/components/filters/filter-county";
import FilterColor from "@/components/filters/filter-color";
import type { AdCardData } from '@/types/types';
import {AdCard} from "@/components/adCard";
import {resolve_api_ad_img} from "@/shared/functions";
import {toAdCardData} from '@/shared/ad-data';
import {fetchCurrentUser} from '@/app/auth/auth-guards';
import {getSessionToken} from '@/shared/functions';


type RangeValue = { min: string; max: string };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';




export default function Search() {
    const [currentUserId, setCurrentUserId] = useState<number | string | null>();
    useEffect(() => {
        let active = true;
        if (!getSessionToken()) {
            Promise.resolve().then(() => { if (active) setCurrentUserId(null); });
        } else {
            void fetchCurrentUser().then(user => {
                if (active) setCurrentUserId(user.id);
            }).catch(() => undefined);
        }
        return () => { active = false; };
    }, []);
    {/*----FILTERS----*/}
    const [search, setSearch] = useState('');
    const [brands, setBrands] = useState<string[]>([]);
    const [models, setModels] = useState<string[]>([]);
    const [prices, setPrices] = useState<RangeValue>({ min: '', max: '' });
    const [years, setYears] = useState<RangeValue>({ min: '', max: '' });
    const [kilometrage, setKilometrage] = useState<RangeValue>({ min: '', max: '' });
    const [enginePower, setEnginePower] = useState<RangeValue>({ min: '', max: '' });
    const [engineSize, setEngineSize] = useState<RangeValue>({ min: '', max: '' });
    const [condition, setCondition] = useState('');
    const [counties, setCounties] = useState<string[]>([]);
    const [buyOrLease, setBuyOrLease] = useState('');
    const [sellerType, setSellerType] = useState('');
    const [gasType, setGasType] = useState('');
    const [gearType, setGearType] = useState('');
    const [colors, setColors] = useState<string[]>([]);
    const [doorNumber, setDoorNumber] = useState('');

    const [ads, setAds] = useState<AdCardData[]>([]);
    const [errorMessage, setErrorMessage] = useState('');


    useEffect(() => {
        const fetchAll = async () => {
            try {
                const token = typeof window === 'undefined' ? null : window.localStorage.getItem('sessionApiToken');
                const pageFilters = new URLSearchParams(window.location.search);
                const apiFilters = new URLSearchParams();
                ['search', 'brands', 'models', 'yearMin', 'yearMax'].forEach(key => {
                    const value = pageFilters.get(key);
                    if (value) apiFilters.set(key, value);
                });
                const filterQuery = apiFilters.toString();
                setSearch(pageFilters.get('search') ?? '');
                setBrands(pageFilters.get('brands')?.split(',').filter(Boolean) ?? []);
                setModels(pageFilters.get('models')?.split(',').filter(Boolean) ?? []);
                setYears({
                    min: pageFilters.get('yearMin') ?? '',
                    max: pageFilters.get('yearMax') ?? '',
                });

                const allAdsRes = await fetch(`${API_BASE_URL}/ads/all${filterQuery ? `?${filterQuery}` : ''}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });

                if (!allAdsRes.ok) {
                    const errBody = await allAdsRes.json().catch(() => ({}));
                    throw new Error(errBody?.message ?? 'Failed to load saves.');
                }

                const apiAds: unknown[] = await allAdsRes.json();
                setAds(apiAds.map(toAdCardData).map((ad: AdCardData) => ({ ...ad, previewImg: resolve_api_ad_img(ad.previewImg) })));
                setErrorMessage('');

            } catch (err: unknown) {
                setErrorMessage(err instanceof Error ? err.message : 'Failed to load alls.');
            }
        };

        fetchAll();
    }, []);



    return (
        <>
            <header>
                <Navbar />
            </header>

            <main>
                <section className="mx-auto mt-5 w-11/12 max-w-6xl rounded-2xl border border-gray-200 bg-gray-100 p-5 md:p-8">
                    <h1 className="text-2xl font-bold">Pretraživanje</h1>
                    <p className="mt-1 text-gray-600">Pretražite oglase po željenim kriterijima.</p>

                    <hr className="my-6 border-gray-300" />

                    <h2 className="mb-5 text-xl font-semibold">Filteri</h2>
                    <div className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                        <FilterBrands title="Marka" selectedVehicle_type="cars" mode="multi" value={brands} onChange={value => setBrands(Array.isArray(value) ? value : [])} />
                        <FilterModels title="Model" selectedVehicle_type="cars" selectedBrands={brands} mode="multi" value={models} onChange={value => setModels(Array.isArray(value) ? value : [])} />
                        <FilterNumeric filterType="enginePower" mode="range" value={enginePower} onChange={value => setEnginePower(value as RangeValue)} />
                        <FilterNumeric filterType="price" mode="range" value={prices} onChange={value => setPrices(value as RangeValue)} />
                        <FilterNumeric filterType="year" mode="range" value={years} onChange={value => setYears(value as RangeValue)} />
                        <FilterNumeric filterType="kilometrage" mode="range" value={kilometrage} onChange={value => setKilometrage(value as RangeValue)} />
                        <FilterChoose filterType="condition" value={condition} onChange={value => setCondition(String(value))} />
                        <FilterCounty mode="multi" value={counties} onChange={value => setCounties(Array.isArray(value) ? value : [])} />
                        <FilterChoose filterType="buyOrLease" value={buyOrLease} onChange={value => setBuyOrLease(String(value))} />
                        <FilterChoose filterType="sellerType" value={sellerType} onChange={value => setSellerType(String(value))} />
                        <FilterNumeric filterType="engineSize" mode="range" value={engineSize} onChange={value => setEngineSize(value as RangeValue)} />
                        <FilterChoose filterType="fuel" value={gasType} onChange={value => setGasType(String(value))} />
                        <FilterChoose filterType="gear" value={gearType} onChange={value => setGearType(String(value))} />
                        <FilterColor mode="multi" value={colors} onChange={value => setColors(Array.isArray(value) ? value : [])} />
                        <FilterChoose filterType="doorNumber" value={doorNumber} onChange={value => setDoorNumber(String(value))} />
                    </div>
                </section>

                <section className="mx-auto my-10 w-11/12 max-w-6xl">
                    <h2 className="mb-5 text-2xl font-bold">Oglasi</h2>
                    {errorMessage && <p role="alert" className="mb-4 text-sm text-red-700">{errorMessage}</p>}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {ads.map((ad) => (
                            <AdCard
                                currentUserId={currentUserId}
                                key={ad.id}
                                ad={ad}
                                href={`/ad/${ad.id}`}
                            />
                        ))}
                    </div>
                </section>
            </main>



            <Footer />
        </>
    );
}
