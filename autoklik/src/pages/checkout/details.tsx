'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import CheckoutStepper from '@/pages/checkout/components/checkoutStepper';

import {getCategoryLabel, getSubcategoryLabel,} from './lib/checkout-data';
import * as checkoutState from './lib/checkout-state';
import FilterChoose from "@/components/filters/filter-choose";
import FilterNumeric from "@/components/filters/filter-numeric";
import FilterBrands from "@/components/filters/filter-brands";
import FilterModels from "@/components/filters/filter-models";
import FilterCounty from "@/components/filters/filter-county";
import FilterColor from "@/components/filters/filter-color";

import {sessionCookie} from '@/components/cookies/cookies';
import {images} from "next/dist/build/webpack/config/blocks/images";


function readFilesAsDataUrls(files: File[] | FileList): Promise<string[]> {
  const fileArray = Array.from(files);
  return Promise.all(
    fileArray.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }),
    ),
  );
}

function parsePositiveNumber(value: string): number | null {
  const parsed = Number(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}


interface AdFormData {
  brand: string;
  model: string;
  price: string;
  year: string;
  kilometrage: string;
  county: string;
  fuel: string;
  enginePower: string;
  condition: string;
  sellerType: string;
  buyOrLease: string;
  gearType: string;
  color: string;
  doorNumber: string;
  drivingLicence: string;
  weight: string;
  payload: string;
  volume: string;

  images: File[];
  title: string;
  description: string;
}

function inputValue(value: number | null) {
  return value === null ? '' : String(value);
}


export default function DetailsPage() {
  const router = useRouter();



  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedDetails = checkoutState.getDetailsState();
  const categoryStateVal = checkoutState.getCategoryState();

  const [adFormModel, setAdFormModel] = useState<AdFormData>({
    brand: savedDetails.brand,
    model: savedDetails.model,
    price: inputValue(savedDetails.price),
    year: inputValue(savedDetails.year),
    kilometrage: inputValue(savedDetails.kilometrage),
    county: savedDetails.county,
    fuel: savedDetails.fuel,
    enginePower: savedDetails.enginePower,
    condition: savedDetails.condition,
    sellerType: savedDetails.sellerType,
    buyOrLease: savedDetails.buyOrLease,
    gearType: savedDetails.gearType ?? '',
    color: savedDetails.color ?? '',
    doorNumber: inputValue(savedDetails.doorNumber),
    drivingLicence: savedDetails.drivingLicence,
    weight: inputValue(savedDetails.weight),
    payload: inputValue(savedDetails.payload),
    volume: inputValue(savedDetails.volume),

    images: savedDetails.images,
    title: savedDetails.title,
    description: savedDetails.description,
  });

  const [selectedImages, setSelectedImages] = useState<File[]>(savedDetails.images);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const categoryLabel = getCategoryLabel(categoryStateVal.category);
  const subcategoryLabel = getSubcategoryLabel(categoryStateVal.subcategory);


  const selectedVehicleType = categoryStateVal.category;


  useEffect(() => {
    const initialization = async () => {
      const token = sessionCookie.getSessionToken();
      if (!token) {
        await router.push(`/login`);
        return;
      }

      checkoutState.hydrate();
      const restoredDetails = checkoutState.getDetailsState();
      setAdFormModel({
        brand: restoredDetails.brand,
        model: restoredDetails.model,
        price: inputValue(restoredDetails.price),
        year: inputValue(restoredDetails.year),
        kilometrage: inputValue(restoredDetails.kilometrage),
        county: restoredDetails.county,
        fuel: restoredDetails.fuel,
        enginePower: restoredDetails.enginePower,
        condition: restoredDetails.condition,
        sellerType: restoredDetails.sellerType,
        buyOrLease: restoredDetails.buyOrLease,
        gearType: restoredDetails.gearType ?? '',
        color: restoredDetails.color ?? '',
        doorNumber: inputValue(restoredDetails.doorNumber),
        drivingLicence: restoredDetails.drivingLicence,
        weight: inputValue(restoredDetails.weight),
        payload: inputValue(restoredDetails.payload),
        volume: inputValue(restoredDetails.volume),
        images: restoredDetails.images,
        title: restoredDetails.title,
        description: restoredDetails.description,
      });
      setSelectedImages(restoredDetails.images);
      setCurrentStep(checkoutState.getCurrentStep());

      if (!checkoutState.hasCategoryState()) {
        router.push('/checkout/vehicle-category');
        return;
      }

      if (restoredDetails.images.length > 0) {
        readFilesAsDataUrls(restoredDetails.images).then((urls) => setPreviewUrls(urls)).catch(() => setPreviewUrls([]));
      }

      setIsHydrated(true);
    }

    console.log(localStorage.getItem('checkout.categoryState'));
    console.log(localStorage.getItem('checkout.subcategory'));

    initialization();
  }, []);


  useEffect(() => {
    const hasEnoughInputs = () => checkoutState.hasAtLeastFourStoredInputs();
    if (!isHydrated) return;

    const warning = 'Zelite li napustiti unos oglasa? Unijeli ste podatke u najmanje cetiri polja.';

    const isLeavingCheckout = (url: string) => {
      const destination = new URL(url, window.location.origin);
      return destination.origin !== window.location.origin ||
        (destination.pathname !== '/checkout' && !destination.pathname.startsWith('/checkout/'));
    };

    let confirmedPopState = false;
    let confirmedLinkUrl: string | null = null;
    const currentHistoryState = window.history.state;
    const currentUrl = router.asPath;

    const clearCheckout = () => {
      checkoutState.reset();
    };

    const warnBeforeLinkNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;

      const destination = new URL(link.href, window.location.origin);
      if (!['http:', 'https:'].includes(destination.protocol)) return;
      if (destination.origin === window.location.origin && !isLeavingCheckout(destination.href)) return;

      if (hasEnoughInputs() && !window.confirm(warning)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      confirmedLinkUrl = destination.href;
      clearCheckout();
    };

    const warnBeforeLeaving = (url: string, options: { shallow: boolean }) => {
      if (confirmedLinkUrl === new URL(url, window.location.origin).href) {
        confirmedLinkUrl = null;
        return;
      }
      if (confirmedPopState) {
        confirmedPopState = false;
        return;
      }

      if (!isLeavingCheckout(url)) return;
      if (!hasEnoughInputs() || window.confirm(warning)) {
        clearCheckout();
        return;
      }

      const error = Object.assign(new Error('Checkout navigation cancelled'), { cancelled: true });
      router.events.emit('routeChangeError', error, url, options);
      throw error;
    };

    router.beforePopState(({ as }) => {
      if (!isLeavingCheckout(as)) return true;
      if (!hasEnoughInputs() || window.confirm(warning)) {
        clearCheckout();
        confirmedPopState = true;
        return true;
      }
      window.history.pushState(currentHistoryState, '', currentUrl);
      return false;
    });

    const warnBeforeFullNavigation = (event: Event) => {
      const url = (event as CustomEvent<string>).detail;
      if (!isLeavingCheckout(url)) return;
      if (hasEnoughInputs() && !window.confirm(warning)) {
        event.preventDefault();
        return;
      }
      clearCheckout();
    };
    router.events.on('routeChangeStart', warnBeforeLeaving);
    window.addEventListener('checkout:before-leave', warnBeforeFullNavigation);
    document.addEventListener('click', warnBeforeLinkNavigation, true);
    return () => {
      router.events.off('routeChangeStart', warnBeforeLeaving);
      window.removeEventListener('checkout:before-leave', warnBeforeFullNavigation);
      document.removeEventListener('click', warnBeforeLinkNavigation, true);
      router.beforePopState(() => true);
    };
  }, [isHydrated, router]);

  if (!isHydrated) return null;

  const syncDetailsDraft = (model: AdFormData, images: File[]) => {
    checkoutState.setDetailsState({
      brand: model.brand,
      model: model.model,
      enginePower: model.enginePower,
      year: parsePositiveNumber(model.year),
      price: parsePositiveNumber(model.price),
      kilometrage: parsePositiveNumber(model.kilometrage),
      fuel: model.fuel,
      condition: model.condition,
      county: model.county,
      sellerType: model.sellerType,
      buyOrLease: model.buyOrLease,
      gearType: model.gearType || null,
      color: model.color || null,
      doorNumber: parsePositiveNumber(model.doorNumber),
      drivingLicence: model.drivingLicence,
      weight: parsePositiveNumber(model.weight),
      payload: parsePositiveNumber(model.payload),
      volume: parsePositiveNumber(model.volume),
      title: model.title,
      description: model.description,
      images,
    });
  };

  const updateField = <K extends keyof AdFormData>(field: K, value: AdFormData[K]) => {
    setAdFormModel((prev) => {
      const next = { ...prev, [field]: value };
      syncDetailsDraft(next, selectedImages);
      return next;
    });
  };

  const getClickableSteps = (): number[] => {
    const steps = [1, 2];
    if (hasAllRequiredDetails()) steps.push(3);
    return steps;
  };

  const isMissingRequired = (field: string): boolean => {
    if (!submitAttempted) return false;

    switch (field) {
      case 'brand':
        return !adFormModel.brand;
      case 'model':
        return !adFormModel.model;
      case 'enginePower':
        return !adFormModel.enginePower;
      case 'year':
        return !adFormModel.year;
      case 'price':
        return parsePositiveNumber(adFormModel.price) === null;
      case 'kilometrage':
        return parsePositiveNumber(adFormModel.kilometrage) === null;
      case 'county':
        return !adFormModel.county;
      case 'condition':
        return !adFormModel.condition;
      case 'title':
        return !adFormModel.title.trim();
      case 'description':
        return !adFormModel.description.trim();
      case 'images':
        return selectedImages.length === 0;

      default:
        return false;
    }
  };

  function hasAllRequiredDetails(): boolean {
    return Boolean(
      adFormModel.brand &&
        adFormModel.model &&
        adFormModel.enginePower &&
        parsePositiveNumber(adFormModel.price) !== null &&
        adFormModel.year &&
        parsePositiveNumber(adFormModel.kilometrage) !== null &&
        adFormModel.condition &&
        adFormModel.title.trim() &&
        adFormModel.description.trim() &&
        selectedImages.length > 0,
    );
  }

  const onImagesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const nextImages = [...selectedImages, ...Array.from(files)];
    setSelectedImages(nextImages);
    syncDetailsDraft(adFormModel, nextImages);
    setSubmitAttempted(false);

    readFilesAsDataUrls(files)
      .then((newUrls) => {
        setPreviewUrls((prev) => [...prev, ...newUrls]);
      })
      .finally(() => {
        event.target.value = '';
      });

    console.log('Selected images:', nextImages);
  };

  const moveImageLeft = (index: number) => {
    if (index <= 0) return;
    setPreviewUrls((prev) => {
      const urls = [...prev];
      [urls[index - 1], urls[index]] = [urls[index], urls[index - 1]];
      return urls;
    });
    setSelectedImages((prev) => {
      const images = [...prev];
      [images[index - 1], images[index]] = [images[index], images[index - 1]];
      syncDetailsDraft(adFormModel, images);
      return images;
    });
  };

  const moveImageRight = (index: number) => {
    setPreviewUrls((prev) => {
      if (index >= prev.length - 1) return prev;
      const urls = [...prev];
      [urls[index], urls[index + 1]] = [urls[index + 1], urls[index]];
      return urls;
    });
    setSelectedImages((prev) => {
      if (index >= prev.length - 1) return prev;
      const images = [...prev];
      [images[index], images[index + 1]] = [images[index + 1], images[index]];
      syncDetailsDraft(adFormModel, images);
      return images;
    });
  };

  const deleteImage = (index: number) => {
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    setSelectedImages((prev) => {
      const images = prev.filter((_, i) => i !== index);
      syncDetailsDraft(adFormModel, images);
      return images;
    });
  };

  const goToVehicleCategory = () => {
    checkoutState.setCurrentStep(1);
    void router.push('/checkout/vehicle-category');
  };

  const onStepSelected = (step: number) => {
    if (!getClickableSteps().includes(step)) return;

    if (step === 1) {
      goToVehicleCategory();
      return;
    }

    if (step === 2) return;

    setSubmitAttempted(true);
    if (!hasAllRequiredDetails()) return;

    syncDetailsDraft(adFormModel, selectedImages);
    checkoutState.setCurrentStep(3);
    router.push('/checkout/payment-options');
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!hasAllRequiredDetails()) {
      console.log('Missing required details:', {
        adFormModel,
        selectedImages
      });
      return;
    }

    syncDetailsDraft(adFormModel, selectedImages);
    checkoutState.setCurrentStep(3);
    router.push('/checkout/payment-options');
  };



  async function dummydatainsert() {
    const nextModel: AdFormData = {
      ...adFormModel,
      brand: 'Toyota',
      model: 'Corolla',
      enginePower: '150',
      price: '10000',
      year: '2020',
      kilometrage: '20000',
      condition: 'Rabljeno',
      county: 'Zagreb',
      sellerType: 'Privatni',
      title: 'Dummy title',
      description: 'Lorem ipsum dolor sit amet, nostrud cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    };
    setAdFormModel(nextModel);
    syncDetailsDraft(nextModel, selectedImages);

    const previewUrl = 'data:image/jpeg;base64,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';
    const imageBlob = await fetch(previewUrl).then(response => response.blob());
    const imageFile = new File([imageBlob], 'll26y096lcmf1.jpg', { type: 'image/jpeg' });
    setSelectedImages([imageFile]);
    syncDetailsDraft(nextModel, [imageFile]);

    

    setPreviewUrls([previewUrl]);
    setSubmitAttempted(false);
    readFilesAsDataUrls([imageFile]).then(dataUrls => {
      setPreviewUrls(dataUrls);
    });


  }
  





  return (
    <>

      <header>
        <Navbar />
      </header>

      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <h2 className="text-center text-3xl font-extrabold text-gray-900">Create Ad</h2>

          <CheckoutStepper
            currentStep={currentStep}
            clickableSteps={getClickableSteps()}
            onStepSelected={onStepSelected}
          />

          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
            Odabrana kategorija: <span className="font-semibold">{categoryLabel}</span> &gt;{' '}
            <span className="font-semibold">{subcategoryLabel}</span>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <h1 className="block text-sm font-medium text-gray-700">Opci podaci</h1>
              <div className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                <FilterBrands title="Marka" selectedVehicle_type="cars" mode="single" value={adFormModel.brand ? [adFormModel.brand] : []} onChange={value => updateField('brand', value[0] ?? '')} />
                <FilterModels title="Model" selectedVehicle_type="cars" selectedBrands={adFormModel.brand ? [adFormModel.brand] : []} mode="single" value={adFormModel.model ? [adFormModel.model] : []} onChange={value => updateField('model', value[0] ?? '')} />
                <FilterNumeric filterType="enginePower" mode="single" value={adFormModel.enginePower} onChange={value => updateField('enginePower', value)} />
                <FilterNumeric filterType="price" mode="single" value={adFormModel.price} onChange={value => updateField('price', value)} />
                <FilterNumeric filterType="year" mode="single" value={adFormModel.year} onChange={value => updateField('year', value)} />
                <FilterNumeric filterType="kilometrage" mode="single" value={adFormModel.kilometrage} onChange={value => updateField('kilometrage', value)} />
                <FilterChoose filterType="condition" value={adFormModel.condition} onChange={value => updateField('condition', String(value))} />
                <FilterCounty mode="single" value={adFormModel.county ? [adFormModel.county] : []} onChange={value => updateField('county', value[0] ?? '')} />
                <FilterChoose filterType="gear" value={adFormModel.gearType} onChange={value => updateField('gearType', String(value))} />
                <FilterChoose filterType="sellerType" value={adFormModel.sellerType} onChange={value => updateField('sellerType', String(value))} />

                
                {/*     <FilterChoose filterType="buyOrLease" value={buyOrLease} onChange={value => setBuyOrLease(String(value))} />
                <FilterChoose filterType="sellerType" value={sellerType} onChange={value => setSellerType(String(value))} />
                <FilterNumeric filterType="engineSize" mode="range" value={engineSize} onChange={value => setEngineSize(value as RangeValue)} />
                <FilterChoose filterType="fuel" value={gasType} onChange={value => setGasType(String(value))} />
                <FilterChoose filterType="gear" value={gearType} onChange={value => setGearType(String(value))} />
                <FilterColor mode="multi" value={colors} onChange={value => setColors(Array.isArray(value) ? value : [])} />
                <FilterChoose filterType="doorNumber" value={doorNumber} onChange={value => setDoorNumber(String(value))} />*/}
              </div>
            </div>
            
            {/* IMG */}
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => dummydatainsert() }
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition w-fit"
              >
                Dummy data insert
              </button>

              <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition w-fit"
              >
                Odaberite slike
              </button>


              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onImagesSelected}
                multiple
              />

              <div
                className={`rounded-lg border-2 border-dashed p-4 min-h-[220px] bg-gray-50 ${
                  isMissingRequired('images') ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {previewUrls.length > 0 ? (
                  <>
                    <h1 className="mb-3 font-medium">Fotografije pridruzene uz oglas</h1>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {previewUrls.map((previewUrl, i) => (
                        <div key={i} className="border rounded-lg overflow-hidden p-2 bg-white shadow-sm">
                          <div className="w-full aspect-[4/3] border rounded-lg overflow-hidden bg-black flex items-center justify-center">
                            <img src={previewUrl} alt="Preview image" className="w-full h-full object-contain" />
                          </div>

                          <div className="mt-2 flex w-full flex-wrap items-center gap-2 overflow-hidden">
                            <span className={`px-4 py-1 border rounded ${i === 0 ? 'bg-amber-300' : ''}`}>
                              {i + 1}
                            </span>

                            <button
                              type="button"
                              onClick={() => moveImageLeft(i)}
                              disabled={i === 0}
                              className="px-4 py-1 border rounded disabled:opacity-50"
                            >
                              &larr;
                            </button>

                            <button
                              type="button"
                              onClick={() => moveImageRight(i)}
                              disabled={i === previewUrls.length - 1}
                              className="px-4 py-1 border rounded disabled:opacity-50"
                            >
                              &rarr;
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteImage(i)}
                              className="px-4 py-1 border rounded text-red-600 max-w-full"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-full min-h-[180px] flex items-center justify-center text-sm text-gray-600 text-center px-4">
                    Priložite fotografije.
                  </div>
                )}
              </div>

              {isMissingRequired('images') && (
                <div className="text-red-600 text-sm">Dodajte barem jednu sliku prije nastavka na placanje.</div>
              )}
            </div>

            {/* Naslov */}
            <div>
              <label
                htmlFor="title"
                className={`block text-sm font-medium ${isMissingRequired('title') ? 'text-red-600' : 'text-gray-700'}`}
              >
                Naslov
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                minLength={5}
                maxLength={200}
                value={adFormModel.title}
                onChange={(e) => updateField('title', e.target.value)}
                className={`mt-1 block w-full rounded-md border px-3 py-2 focus:border-red-600 focus:outline-none ${
                  isMissingRequired('title') ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>

            {/* Opis */}
            <div>
              <label
                htmlFor="description"
                className={`block text-sm font-medium ${
                  isMissingRequired('description') ? 'text-red-600' : 'text-gray-700'
                }`}
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                required
                minLength={10}
                maxLength={10000}
                rows={5}
                value={adFormModel.description}
                onChange={(e) => updateField('description', e.target.value)}
                className={`mt-1 block w-full rounded-md border px-3 py-2 focus:border-red-600 focus:outline-none ${
                  isMissingRequired('description') ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>

            <div className="flex justify-between items-center pt-4">
              <button
                type="button"
                onClick={goToVehicleCategory}
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Nazad na kategorije
              </button>

              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-[var(--color-navbar)] text-white hover:bg-[var(--color-navbar-hover)]"
              >
                Dalje na placanje
              </button>
            </div>
          </form>
        </div>
      </div>

      <footer>
        <Footer />
      </footer>
    </>
  );
}
