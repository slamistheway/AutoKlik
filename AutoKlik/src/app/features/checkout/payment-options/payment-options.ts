import {Component, OnInit} from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Footer } from '../../../shared/layout/footer/footer';
import { NavbarComponent } from '../../../shared/layout/navbar/navbar';
import { CheckoutStepper } from '../checkout-stepper/checkout-stepper';
import { CheckoutStateService } from '../checkout-state.service';
import { Observable, of } from 'rxjs';
import {CurrentUser} from '../../../models/current-user.model';
import { Auth } from '../../../core/services/auth';
import {getCategoryLabel, getSubcategoryLabel} from '../../../shared/functions/shared-functions';


interface CreateAdPayload {
  user_id?: number;
  category: string;
  subcategory: string;
  brand: string;
  model: string;
  price: number;
  mileage: number;
  fuel: string;
  condition: string;
  county: string;
  sellerType: string;
  buyOrLease: string;
  gearType: string | null;
  color: string | null;
  doorNumber: number | null;
  drivingLicence: string;
  weight: number | null;
  payload: number | null;
  volume: number | null;
  title: string;
  description: string;
  year: number;
  images: File[];
}

interface CreateAdResponse {
  message: string;
  ad: {
    id: number;
    images?: string[];
  };
}



@Component({
  selector: 'app-payment-options',
  standalone: true,
  imports: [Footer, FormsModule, NavbarComponent, CheckoutStepper],
  templateUrl: './payment-options.html',
})
export class PaymentOptions implements OnInit {
  adFormModel: CreateAdPayload = {
    category: '',
    subcategory: '',
    brand: '',
    model: '',
    price: 0,
    mileage: 0,
    fuel: '',
    condition: '',
    county: '',
    sellerType: '',
    buyOrLease: '',
    gearType: null,
    color: null,
    doorNumber: null,
    drivingLicence: '',
    weight: null,
    payload: null,
    volume: null,
    title: '',
    description: '',
    year: 0,
    images: [],
  };

  currentUser$: Observable<CurrentUser | null> = of(null);
  currentUser: CurrentUser | null = null;

  currentStep = 3;

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

  categoryLabel = '';
  subcategoryLabel = '';
  submitError = '';
  submitSuccess = '';
  isSubmitting = false;



  constructor(
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly checkoutState: CheckoutStateService,
    private auth: Auth
  ) {
    console.log("Payment options loaded");

    if (!this.checkoutState.hasCategoryState()) {
      console.error('Checkout state is missing');
      void this.router.navigate(['/checkout/payment-options']);
      return;
    }

    const categoryState = this.checkoutState.getCategoryState();
    const detailsState = this.checkoutState.getDetailsState();

    this.categoryLabel = categoryState.category;
    this.categoryLabel = getCategoryLabel(this.categoryLabel);
    this.subcategoryLabel = categoryState.subcategory;
    this.subcategoryLabel = getSubcategoryLabel(this.subcategoryLabel);

    this.adFormModel.category = categoryState.category;
    this.adFormModel.subcategory = categoryState.subcategory;
    this.adFormModel.brand = detailsState.brand;
    this.adFormModel.model = detailsState.model;
    this.adFormModel.price = detailsState.price ?? 0;
    this.adFormModel.mileage = detailsState.mileage ?? 0;
    this.adFormModel.fuel = detailsState.fuel;
    this.adFormModel.condition = detailsState.condition;
    this.adFormModel.county = detailsState.county;
    this.adFormModel.sellerType = detailsState.sellerType;
    this.adFormModel.buyOrLease = detailsState.buyOrLease;
    this.adFormModel.gearType = detailsState.gearType;
    this.adFormModel.color = detailsState.color;
    this.adFormModel.doorNumber = detailsState.doorNumber;
    this.adFormModel.drivingLicence = detailsState.drivingLicence;
    this.adFormModel.weight = detailsState.weight;
    this.adFormModel.payload = detailsState.payload;
    this.adFormModel.volume = detailsState.volume;
    this.adFormModel.title = detailsState.title;
    this.adFormModel.description = detailsState.description;
    this.adFormModel.year = detailsState.year ?? 0;
    this.adFormModel.images = detailsState.images;
  }

  ngOnInit(): void {
    this.checkoutState.setCurrentStep(3);
    this.currentStep = this.checkoutState.getCurrentStep();

    this.auth.loadUser();

    this.currentUser$ = this.auth.user$;
    this.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });
    console.log("Payment options loaded");
  }





  goToDetails(): void {
    this.checkoutState.setCurrentStep(2);
    void this.router.navigate(['/checkout/details']);
  }

  onStepSelected(step: number): void {
    if (!this.getClickableSteps().includes(step)) {
      return;
    }

    if (step === 1) {
      this.checkoutState.clearDetailsState();
      this.checkoutState.setCurrentStep(1);
      void this.router.navigate(['/checkout/vehicle-category']);
      return;
    }

    if (step === 2) {
      this.goToDetails();
    }
  }

  onSubmit(form: NgForm): void {
    this.submitError = '';
    this.submitSuccess = '';
    const token = localStorage.getItem('sessionApiToken');

    if (!token) {
      this.submitError = 'You must be logged in to create an ad.';
      return;
    }
    if (!this.currentUser?.id) {
      this.submitError = 'User data is not loaded yet.';
      return;
    }

    const payload = new FormData();
    payload.append('user_id', String(this.currentUser.id));
    payload.append('category', this.adFormModel.category);
    payload.append('subcategory', this.adFormModel.subcategory);
    payload.append('brand', this.adFormModel.brand);
    payload.append('model', this.adFormModel.model);
    payload.append('price', String(this.adFormModel.price ? Number(this.adFormModel.price) : 0));
    payload.append('mileage', String(this.adFormModel.mileage ? Number(this.adFormModel.mileage) : 0));
    payload.append('fuel', this.adFormModel.fuel);
    payload.append('condition', this.adFormModel.condition);
    payload.append('county', this.adFormModel.county.trim());
    payload.append('sellerType', this.adFormModel.sellerType);
    payload.append('buyOrLease', this.adFormModel.buyOrLease);
    payload.append('gearType', this.adFormModel.gearType || '');
    payload.append('color', this.adFormModel.color || '');
    payload.append('doorNumber', String(this.adFormModel.doorNumber));
    payload.append('drivingLicence', this.adFormModel.drivingLicence);
    payload.append('weight', String(this.adFormModel.weight));
    payload.append('payload', String(this.adFormModel.payload));
    payload.append('volume', String(this.adFormModel.volume));
    payload.append('title', this.adFormModel.title.trim());
    payload.append('description', this.adFormModel.description.trim());
    payload.append('year', String(this.adFormModel.year ? Number(this.adFormModel.year) : 0));
    this.adFormModel.images.forEach((image) => payload.append('images', image, image.name));

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.isSubmitting = true;

    this.http.post<CreateAdResponse>('http://localhost:3000/ad', payload, { headers })
      .pipe(finalize(() => {
        this.isSubmitting = false;
      }))
      .subscribe({
        next: (response) => {
          const createdAdId = Number(response?.ad?.id);
          this.checkoutState.reset();
          form.resetForm();
          void this.router.navigate(['/checkout/ad-posted-successfully'], {
            queryParams: Number.isFinite(createdAdId) ? { adId: createdAdId } : undefined,
          });
        },
        error: (err) => {
          this.submitError = err?.error?.error || 'Failed to create ad. Please try again.';
        },
      });
  }

  protected readonly getCategoryLabel = getCategoryLabel;
  protected readonly getSubcategoryLabel = getSubcategoryLabel;
}
