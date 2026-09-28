'use client';

import '../app/globals.css';
import {useEffect, useState} from 'react';
import {Navbar} from "@/components/navbar";
import {Footer} from "@/components/footer";
import {ArrowRightIcon} from "lucide-react";
import FilterBrands from "@/components/filters/filter-brands";
import FilterModels from "@/components/filters/filter-models";
import FilterPrices from "@/components/filters/filter-prices";
import FilterYears from "@/components/filters/filter-years";
import FilterKilometrage from "@/components/filters/filter-kilometrage";
import FilterCondition from "@/components/filters/filter-condition";
import FilterCounty from "@/components/filters/filter-county";
import FilterEnginePower from "@/components/filters/filter-enginePower";
import FilterSellerType from "@/components/filters/filter-sellerType";
import FilterColor from "@/components/filters/filter-color";
import FilterEngineSize from "@/components/filters/filter-engineSize";
import FilterGasType from "@/components/filters/filter-gasType";
import FilterGearType from "@/components/filters/filter-gearType";
import FilterDoorNumber from "@/components/filters/filter-doorNumber";
import FilterBuyOrLeaseType from "@/components/filters/filter-buyOrLeaseType";
import {AdCardData, AdFullData} from "@/types/types";
import {AdCard} from "@/components/adCard";
import {resolve_api_ad_img} from "@/shared/functions";


type RangeValue = { min: string; max: string };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';




export default function Cars() {
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
                const [allAdsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/ads/all`)
                ]);

                const failed = [allAdsRes].find((r) => !r.ok);
                if (failed) {
                    const errBody = await failed.json().catch(() => ({}));
                    throw new Error(errBody?.message ?? 'Failed to load saves.');
                }

                const apiAds: AdFullData[] = await allAdsRes.json();
                setAds(apiAds.map(ad => {
                    return {
                        id: ad.id,
                        title: ad.title ?? 'Oglas bez naslova',
                        price: String(ad.price ?? ''),
                        year: String(ad.year ?? ''),
                        mileage: String(ad.mileage ?? ''),
                        location: ad.county ?? '',
                        image: resolve_api_ad_img(ad.preview_img),
                        fuel: ad.fuel ?? undefined,
                        condition: ad.condition ?? undefined,
                        sellerType: ad.seller_type ?? undefined,
                        sellerName: ad.seller_username ?? undefined,
                    };
                }));
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
                    <form className="mt-5 flex" onSubmit={event => event.preventDefault()}>
                        <input
                            type="text"
                            placeholder="Pretraži oglase..."
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            className="w-full rounded-l-md border border-gray-300 bg-white p-3"
                        />
                        <button type="submit" aria-label="Pretraži" className="rounded-r-md bg-white px-4">
                            <ArrowRightIcon className="w-5 h-5 text-gray-500" />
                        </button>
                    </form>

                    <hr className="my-6 border-gray-300" />

                    <h2 className="mb-5 text-xl font-semibold">Filteri</h2>
                    <div className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                        <FilterBrands title="Marka" selectedVehicle_type="cars" mode="multi" value={brands} onChange={value => setBrands(Array.isArray(value) ? value : [])} />
                        <FilterModels title="Model" selectedVehicle_type="cars" selectedBrands={brands} mode="multi" value={models} onChange={value => setModels(Array.isArray(value) ? value : [])} />
                        <FilterEnginePower mode="range" value={enginePower} onChange={value => setEnginePower(value as RangeValue)} />
                        <FilterPrices mode="range" value={prices} onChange={value => setPrices(value as RangeValue)} />
                        <FilterYears mode="range" value={years} onChange={value => setYears(value as RangeValue)} />
                        <FilterKilometrage mode="range" value={kilometrage} onChange={value => setKilometrage(value as RangeValue)} />
                        <FilterCondition mode="single" value={condition} onChange={value => setCondition(String(value))} />
                        <FilterCounty mode="multi" value={counties} onChange={value => setCounties(Array.isArray(value) ? value : [])} />
                        <FilterBuyOrLeaseType value={buyOrLease} onChange={value => setBuyOrLease(String(value))} />
                        <FilterSellerType value={sellerType} onChange={value => setSellerType(String(value))} />
                        <FilterEngineSize mode="range" value={engineSize} onChange={value => setEngineSize(value as RangeValue)} />
                        <FilterGasType value={gasType} onChange={value => setGasType(String(value))} />
                        <FilterGearType value={gearType} onChange={value => setGearType(String(value))} />
                        <FilterColor mode="multi" value={colors} onChange={value => setColors(Array.isArray(value) ? value : [])} />
                        <FilterDoorNumber value={doorNumber} onChange={value => setDoorNumber(String(value))} />
                    </div>
                </section>

                <section className="mx-auto my-10 w-11/12 max-w-6xl">
                    <h2 className="mb-5 text-2xl font-bold">Oglasi</h2>
                    {errorMessage && <p role="alert" className="mb-4 text-sm text-red-700">{errorMessage}</p>}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {ads.map((ad) => (
                            <AdCard
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
