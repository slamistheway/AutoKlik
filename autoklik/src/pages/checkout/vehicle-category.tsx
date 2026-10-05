'use client';


import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import CheckoutStepper from '@/pages/checkout/components/checkoutStepper';
import CheckoutLeavePrompt from '@/pages/checkout/components/checkoutLeavePrompt';
import * as checkoutState from './lib/checkout-state';
import { CATEGORIES, SUBCATEGORIES } from './lib/checkout-data';
import {getSessionToken} from "@/pages/myProfile/account-api";

export default function VehicleCategoryPage() {
  const router = useRouter();

  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const initialization = async () => {
      const token = getSessionToken();
      if (!token) {
        await router.push(`/login`);
        return;
      }

      checkoutState.hydrate();
      const savedCategory = checkoutState.getCategoryState();
      // Restore local storage after hydration to keep the server and first client render identical.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategory(savedCategory.category);
      setSubcategory(savedCategory.subcategory);
      checkoutState.setCurrentStep(1);
      setIsHydrated(true);
      console.log(localStorage)
    }

/*
    // Ovo je funkcija koja se izvršava kada korisnik napusti komponentu/stranicu
    return () => {
      console.log("Korisnik je napustio komponentu/stranicu (unmount)");
      localStorage.clear();
    };
*/

    initialization();
  }, []);

  const currentStep = 1;

  if (!isHydrated) return null;

  const getClickableSteps = (): number[] => {
    const steps = [1];
    if (category && subcategory) steps.push(2);
    if (category && subcategory && checkoutState.hasDetailsState()) steps.push(3);
    return steps;
  };

  const selectCategory = (value: string) => {
    setCategory(value);
    setSubcategory('');
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    if (!category || !subcategory) {
      return;
    }

    checkoutState.setCategoryState({ category, subcategory });
    checkoutState.setCurrentStep(2);
    router.push('/checkout/details');
  };

  const onStepSelected = (step: number) => {
    if (!getClickableSteps().includes(step)) return;

    if (step === 1) return;

    if (step === 2 && checkoutState.hasCategoryState()) {
      checkoutState.setCurrentStep(2);
      router.push('/checkout/details');
      return;
    }

    if (step === 3 && checkoutState.hasCategoryState() && checkoutState.hasDetailsState()) {
      checkoutState.setCurrentStep(3);
      router.push('/checkout/payment-options');
    }
  };

  return (
    <>
      <CheckoutLeavePrompt />
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

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Step 1: Kategorija */}
            <label className="block text-sm font-medium text-gray-700 mb-2">Kategorija vozila</label>
            <div className="flex flex-wrap gap-3">
            {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => selectCategory(cat.value)}
                  className={`px-4 py-2 rounded-md font-medium border border-gray-300 focus:outline-none ${
                    category === cat.value ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            {!category && submitted && (
              <div className="text-red-600 text-xs mt-2">Odaberite kategoriju.</div>
            )}

            {category && (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-2">Podkategorija vozila</label>
                <div className="flex flex-wrap gap-3">
                  {(SUBCATEGORIES[category] ?? []).map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSubcategory(sub.value)}
                      className={`px-4 py-2 rounded-md font-medium border border-gray-300 focus:outline-none ${
                        subcategory === sub.value ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
                {!subcategory && submitted && (
                  <div className="text-red-600 text-xs mt-2">Odaberite podkategoriju.</div>
                )}
              </>
            )}

            <div className="flex justify-end items-center pt-4">
              <button
                type="submit"
                disabled={!subcategory}
                className="px-4 py-2 rounded-md bg-[var(--color-navbar)] text-white hover:bg-[var(--color-navbar-hover)] disabled:opacity-50"
              >
                Dalje na detalje
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
