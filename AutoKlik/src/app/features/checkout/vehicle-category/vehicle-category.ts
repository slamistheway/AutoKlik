import { Component } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { Footer } from '../../../shared/layout/footer/footer';
import { NavbarComponent } from '../../../shared/layout/navbar/navbar';
import { CheckoutStepper } from '../checkout-stepper/checkout-stepper';
import { CheckoutStateService } from '../checkout-state.service';

interface Kategorija {
  label: string;
  value: string;
}

interface Podkategorija {
  id: string;
  label: string;
  value: string;
}

@Component({
  selector: 'app-vehicle-category',
  standalone: true,
  imports: [FormsModule, NgClass, Footer, NavbarComponent, CheckoutStepper],
  templateUrl: './vehicle-category.html',
})
export class VehicleCategory {
  adFormModel = {
    category: '',
    subcategory: '',
  };

  Categories: Kategorija[] = [
    { label: 'Osobni automobil', value: 'car' },
    { label: 'Motocikl', value: 'motorcycle' },
    { label: 'Kombi', value: 'van' },
    { label: 'Ostalo', value: 'other' }
  ];

  SubCategories: Record<string, Podkategorija[]> = {
    car: [{ id: 'personal_car', label: 'Osobni automobili', value: 'personal_car' }],
    motorcycle: [
      { id: 'sports_motorcycle', label: 'Sportski motori', value: 'sports_motorcycle' },
      { id: 'road_motorcycle', label: 'Cestovni motori', value: 'road_motorcycle' },
      { id: 'moped_motorcycle', label: 'Mopedi', value: 'moped_motorcycle' },
      { id: 'chopper_motorcycle', label: 'Chopperi', value: 'chopper_motorcycle' },
      { id: 'scooter_motorcycle', label: 'Skuteri', value: 'scooter_motorcycle' },
      { id: 'quad_motorcycle', label: 'Cetverokotaci', value: 'quad_motorcycle' },
    ],
    van: [
      { id: 'van', label: 'Kombi vozila', value: 'van' },
    ],
    other: [
      { id: 'truck', label: 'Kamioni', value: 'truck' },
      { id: 'tractor_agricultural', label: 'Traktori', value: 'tractor_agricultural' },
      { id: 'combine_agricultural', label: 'Kombajni', value: 'combine_agricultural' },
      { id: 'trailer', label: 'Prikolice', value: 'trailer' },
      { id: 'excavator_construction', label: 'Bageri', value: 'excavator_construction' },
      { id: 'crane_construction', label: 'Dizalice', value: 'crane_construction' },
      { id: 'camper_camp', label: 'Kamperi', value: 'camper_camp' },
      { id: 'trailer_camp', label: 'Prikolice za kampiranje', value: 'trailer_camp' },
    ]
  };


  currentStep: number;

  getClickableSteps(): number[] {
    const steps = [1];

    if (this.checkoutState.hasCategoryState()) {
      steps.push(2);
    }

    if (this.checkoutState.hasCategoryState() && this.checkoutState.hasDetailsState()) {
      steps.push(3);
    }

    return steps;
  }

  constructor(
    private readonly router: Router,
    private readonly checkoutState: CheckoutStateService,

  ) {
    this.checkoutState.setCurrentStep(1);
    this.currentStep = this.checkoutState.getCurrentStep();

    const saved = this.checkoutState.getCategoryState();
    this.adFormModel.category = saved.category;
    this.adFormModel.subcategory = saved.subcategory;

  }

  onSubmit(form: NgForm): void {
    if (!this.adFormModel.category || !this.adFormModel.subcategory) {
      form.control.markAllAsTouched();
      return;
    }

    this.checkoutState.setCategoryState({
      category: this.adFormModel.category,
      subcategory: this.adFormModel.subcategory,
    });


    this.checkoutState.setCurrentStep(2);

    void this.router.navigate(['/checkout/details']);
  }

  onStepSelected(step: number): void {
    if (!this.getClickableSteps().includes(step)) {
      return;
    }

    if (step === 1) {
      return;
    }

    if (step === 2 && this.checkoutState.hasCategoryState()) {
      this.checkoutState.setCurrentStep(2);
      void this.router.navigate(['/checkout/details']);
      return;
    }

    if (step === 3 && this.checkoutState.hasCategoryState() && this.checkoutState.hasDetailsState()) {
      this.checkoutState.setCurrentStep(3);
      void this.router.navigate(['/checkout/payment-options']);
    }
  }
}
