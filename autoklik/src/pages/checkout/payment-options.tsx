'use client';
import '../../app/globals.css';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import CheckoutStepper from '@/pages/checkout/functions and components/checkoutStepper';
import CheckoutLeavePrompt from '@/pages/checkout/functions and components/checkoutLeavePrompt';
import { getCategoryLabel, getSubcategoryLabel } from '@/lib/checkout-data';
import * as checkoutState from '@/lib/checkout-state';
import { API_BASE_URL, getResponseMessage, getSessionToken } from '../myProfile/account-api';
import { fetchCurrentUser } from '@/app/auth/auth-guards';

export default function PaymentOptionsPage() {
  const router = useRouter();

  const categoryState = checkoutState.getCategoryState();
  const categoryLabel = getCategoryLabel(categoryState.category);
  const subcategoryLabel = getSubcategoryLabel(categoryState.subcategory);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const currentStep = checkoutState.getCurrentStep();

  const getClickableSteps = (): number[] => {
    const steps = [1];
    if (checkoutState.hasCategoryState()) steps.push(2);
    if (checkoutState.hasCategoryState() && checkoutState.hasDetailsState()) steps.push(3);
    return steps;
  };


  useEffect(() => {
    const initialization = async () => {
      const token = getSessionToken();
      if (!token) {
        await router.push(`/login`);
        return;
      }

      checkoutState.hydrate();
      if (!checkoutState.hasCategoryState()) {
        router.push('/checkout/vehicle-category');
        return;
      }

      checkoutState.setCurrentStep(3);
      // Mark ready only after browser state has been restored to avoid a hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsHydrated(true);
    }


    initialization();
  }, []);



  
  const goToDetails = () => {
    checkoutState.setCurrentStep(2);
    router.push('/checkout/details');
  };

  const onStepSelected = (step: number) => {
    if (!getClickableSteps().includes(step)) return;

    if (step === 1) {
      checkoutState.clearDetailsState();
      checkoutState.setCurrentStep(1);
      router.push('/checkout/vehicle-category');
      return;
    }

    if (step === 2) {
      goToDetails();
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    const token = getSessionToken();
    if (!token) {
      await router.push(`/login?returnUrl=${encodeURIComponent(router.asPath)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const [user, details, category] = await Promise.all([
        fetchCurrentUser(),
        Promise.resolve(checkoutState.getDetailsState()),
        Promise.resolve(checkoutState.getCategoryState()),
      ]);
      if (!user.id) throw new Error('Nije moguće dohvatiti korisnički profil.');

      const body = new FormData();
      body.append('user_id', String(user.id));
      body.append('category', category.category);
      body.append('subcategory', category.subcategory);
      body.append('brand', details.brand.trim());
      body.append('model', details.model.trim());
      body.append('year', String(details.year ?? ''));
      body.append('price', String(details.price ?? 0));
      body.append('mileage', String(details.mileage ?? 0));
      body.append('fuel', details.fuel);
      body.append('enginePower', String(details.enginePower ?? ''));
      body.append('condition', details.condition);
      body.append('county', details.county);
      body.append('sellerType', details.sellerType);
      body.append('buyOrLease', details.buyOrLease);
      body.append('gearType', details.gearType ?? '');
      body.append('color', details.color ?? '');
      body.append('doorNumber', String(details.doorNumber ?? ''));
      body.append('drivingLicence', details.drivingLicence);
      body.append('weight', String(details.weight ?? ''));
      body.append('payload', String(details.payload ?? ''));
      body.append('volume', String(details.volume ?? ''));
      body.append('title', details.title.trim());
      body.append('description', details.description.trim());
      details.images.forEach((file) => body.append('images', file, file.name));

      const response = await fetch(`${API_BASE_URL}/ads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      if (!response.ok) throw new Error(await getResponseMessage(response, 'Objava oglasa nije uspjela.'));
      const result = await response.json() as { ad?: { id?: number } };
      if (!result.ad?.id) throw new Error('Oglas je spremljen, ali poslužitelj nije vratio ID oglasa.');

      checkoutState.reset();
      await router.push(`/checkout/ad-posted-successfully?adId=${result.ad.id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Objava oglasa nije uspjela.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isHydrated || !checkoutState.hasCategoryState()) {
    return null;
  }

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

          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
            Odabrana kategorija: <span className="font-semibold">{categoryLabel}</span> &gt;{' '}
            <span className="font-semibold">{subcategoryLabel}</span>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Objava oglasa</h3>
              <p className="text-sm text-gray-600">Objava oglasa je besplatna.</p>
            </div>

            <div className="flex justify-between items-center pt-4">
              <button
                type="button"
                onClick={goToDetails}
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Nazad na detalje
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-md bg-[var(--color-navbar)] text-white hover:bg-[var(--color-navbar-hover)] disabled:opacity-50"
              >
                {isSubmitting ? 'Objava u tijeku...' : 'Objavi oglas'}
              </button>
            </div>

            {submitError && (
              <div className="rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{submitError}</div>
            )}

          </form>
        </div>
      </div>

      <footer>
        <Footer />
      </footer>
    </>
  );
}
