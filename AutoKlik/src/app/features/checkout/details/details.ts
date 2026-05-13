import { Component } from '@angular/core';
import {AsyncPipe, NgClass} from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule, NgForm } from '@angular/forms';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { Footer } from '../../../shared/layout/footer/footer';
import { NavbarComponent } from '../../../shared/layout/navbar/navbar';
import { CheckoutStepper } from '../checkout-stepper/checkout-stepper';
import { CheckoutStateService } from '../checkout-state.service';
import { FilterBrands } from '../../../shared/filters/filter-brands/filter-brands';
import { FilterModels } from '../../../shared/filters/filter-models/filter-models';
import { FilterYears } from '../../../shared/filters/filter-years/filter-years';
import { FilterPrices } from '../../../shared/filters/filter-prices/filter-prices';
import { getCategoryLabel, getSubcategoryLabel, readFilesAsDataUrls } from '../../../shared/functions/shared-functions';
import {FilterEngineSize} from '../../../shared/filters/filter-engineSize/filter-engineSize';
import {FilterEnginePower} from '../../../shared/filters/filter-enginePower/filter-enginePower';
import {FilterKilometrage} from '../../../shared/filters/filter-kilometrage/filter-kilometrage';
import {FilterGasType} from '../../../shared/filters/filter-gasType/filter-gasType';
import {FilterCondition} from '../../../shared/filters/filter-condition/filter-condition';
import {FilterCounty} from '../../../shared/filters/filter-county/filter-county';
import {FilterSellerType} from '../../../shared/filters/filter-sellerType/filter-sellerType';
import {FilterBuyOrLeaseType} from '../../../shared/filters/filter-buyOrLeaseType/filter-buyOrLeaseType';
import {FilterGearType} from '../../../shared/filters/filter-gearType/filter-gearType';
import {FilterColor} from '../../../shared/filters/filter-color/filter-color';
import {FilterDoorNumber} from '../../../shared/filters/filter-doorNumber/filter-doorNumber';
import {FilterDrivingLicence} from '../../../shared/filters/filter-drivingLicence/filter-drivingLicence';
import {FilterWeight} from '../../../shared/filters/filter-weight/filter-weight';
import {FilterPayload} from '../../../shared/filters/filter-payload/filter-payload';
import {FilterVolume} from '../../../shared/filters/filter-volume/filter-volume';

type DropdownKey =
  | 'brand'
  | 'model'
  | 'year'
  | 'price'
  | 'engineSize'
  | 'enginePower'
  | 'kilometrage'
  | 'fuel'
  | 'condition'
  | 'county'
  | 'sellerType'
  | 'buyOrLease'
  | 'gearType'
  | 'color'
  | 'doorNumber'
  | 'drivingLicence'
  | 'weight'
  | 'payload'
  | 'volume';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [
    AsyncPipe,
    FaIconComponent,
    FormsModule,
    Footer,
    NavbarComponent,
    CheckoutStepper,
    FilterBrands,
    FilterModels,
    FilterYears,
    FilterPrices,
    NgClass,
    FilterEngineSize,
    FilterEnginePower,
    FilterKilometrage,
    FilterGasType,
    FilterCondition,
    FilterCounty,
    FilterSellerType,
    FilterBuyOrLeaseType,
    FilterGearType,
    FilterColor,
    FilterDoorNumber,
    FilterDrivingLicence,
    FilterWeight,
    FilterPayload,
    FilterVolume,
  ],
  templateUrl: './details.html',
})
export class Details {
  adFormModel = {
    title: '',
    description: '',
    brand: '',
    model: '',
    year: null as number | null,
    price: null as number | null,
    mileage: null as number | null,
    fuel: '',
    condition: '',
    county: '',
    sellerType: '',
    buyOrLease: '',
    gearType: null as string | null,
    color: null as string | null,
    doorNumber: null as number | null,
    drivingLicence: '',
    weight: null as number | null,
    payload: null as number | null,
    volume: null as number | null,
  };

  selectedBrands: string[] = [];
  selectedModels: string[] = [];
  selectedYear = '';
  selectedPrice = '';
  selectedEngineSize = '';
  selectedEnginePower = '';
  selectedKilometrage = '';
  selectedGasType = '';
  selectedCondition = '';
  selectedCounty: string[] = [];
  selectedSellerType = '';
  selectedBuyOrLease = '';
  selectedGearType = '';
  selectedColor: string[] = [];
  selectedDoorNumber = '';
  selectedDrivingLicence = '';
  selectedWeight = '';
  selectedPayload = '';
  selectedVolume = '';
  selectedImages: File[] = [];

  dropdowns: Record<DropdownKey, boolean> = {
    brand: false,
    model: false,
    year: false,
    price: false,
    engineSize: false,
    enginePower: false,
    kilometrage: false,
    fuel: false,
    condition: false,
    county: false,
    sellerType: false,
    buyOrLease: false,
    gearType: false,
    color: false,
    doorNumber: false,
    drivingLicence: false,
    weight: false,
    payload: false,
    volume: false,
  };

  previewUrls$ = new BehaviorSubject<string[]>([]);
  categoryLabel = '';
  subcategoryLabel = '';
  selectedVehicle_type = 'car';


  readonly fuelOptions = ['diesel', 'petrol', 'electric', 'hybrid', 'lpg'];
  readonly conditionOptions = ['new', 'used'];
  readonly sellerTypeOptions = ['private', 'dealer'];
  readonly buyOrLeaseOptions = ['buy', 'lease'];
  readonly gearTypeOptions = ['manual', 'automatic'];
  readonly colorOptions = ['black', 'white', 'gray', 'silver', 'blue', 'red', 'green', 'yellow'];


  currentStep = 2;
  submitAttempted = false;

  getClickableSteps(): number[] {
    const steps = [1, 2];

    if (this.hasAllRequiredDetails()) {
      steps.push(3);
    }

    return steps;
  }


  constructor(
    private readonly router: Router,
    private readonly checkoutState: CheckoutStateService,
  ) {
    const categoryState = this.checkoutState.getCategoryState();
    const savedDetails = this.checkoutState.getDetailsState();

    this.checkoutState.setCurrentStep(2);
    this.currentStep = this.checkoutState.getCurrentStep();


    if (!this.checkoutState.hasCategoryState()) {
      console.log('No category state found, redirecting to vehicle category selection.');
      void this.router.navigate(['/checkout/vehicle-category']);
      return;
    }


    this.selectedVehicle_type = categoryState.category || 'car';
    this.categoryLabel = getCategoryLabel(categoryState.category);
    this.subcategoryLabel = categoryState.subcategory;
    this.subcategoryLabel = getSubcategoryLabel(this.subcategoryLabel);

    this.adFormModel.title = savedDetails.title;
    this.adFormModel.description = savedDetails.description;
    this.adFormModel.brand = savedDetails.brand;
    this.adFormModel.model = savedDetails.model;
    this.adFormModel.year = savedDetails.year;
    this.adFormModel.price = savedDetails.price;
    this.adFormModel.mileage = savedDetails.mileage;
    this.adFormModel.fuel = savedDetails.fuel;
    this.adFormModel.condition = savedDetails.condition;
    this.adFormModel.county = savedDetails.county;
    this.adFormModel.sellerType = savedDetails.sellerType;
    this.adFormModel.buyOrLease = savedDetails.buyOrLease;
    this.adFormModel.gearType = savedDetails.gearType;
    this.adFormModel.color = savedDetails.color;
    this.adFormModel.doorNumber = savedDetails.doorNumber;
    this.adFormModel.drivingLicence = savedDetails.drivingLicence;
    this.adFormModel.weight = savedDetails.weight;
    this.adFormModel.payload = savedDetails.payload;
    this.adFormModel.volume = savedDetails.volume;

    this.selectedBrands = savedDetails.brand ? [savedDetails.brand] : [];
    this.selectedModels = savedDetails.model ? [savedDetails.model] : [];
    this.selectedYear = savedDetails.year ? String(savedDetails.year) : '';
    this.selectedPrice = savedDetails.price ? String(savedDetails.price) : '';
    this.selectedKilometrage = savedDetails.mileage ? `${savedDetails.mileage.toLocaleString()} km` : '';
    this.selectedGasType = this.toFuelLabel(savedDetails.fuel);
    this.selectedCondition = this.toConditionLabel(savedDetails.condition);
    this.selectedCounty = savedDetails.county ? [savedDetails.county] : [];
    this.selectedSellerType = this.toSellerTypeLabel(savedDetails.sellerType);
    this.selectedBuyOrLease = this.toBuyOrLeaseLabel(savedDetails.buyOrLease);
    this.selectedGearType = this.toGearTypeLabel(savedDetails.gearType ?? '');
    this.selectedColor = savedDetails.color ? [savedDetails.color] : [];
    this.selectedDoorNumber = savedDetails.doorNumber ? String(savedDetails.doorNumber) : '';
    this.selectedDrivingLicence = savedDetails.drivingLicence;
    this.selectedWeight = savedDetails.weight ? `${savedDetails.weight} kg` : '';
    this.selectedPayload = savedDetails.payload ? `${savedDetails.payload} kg` : '';
    this.selectedVolume = savedDetails.volume ? `${savedDetails.volume} m3` : '';
    this.selectedImages = [...savedDetails.images];
    this.refreshPreviewUrls();
  }

  private syncDetailsDraft(): void {
    this.checkoutState.setDetailsState({
      brand: this.adFormModel.brand,
      model: this.adFormModel.model,
      year: this.adFormModel.year,
      price: this.adFormModel.price,
      mileage: this.adFormModel.mileage,
      fuel: this.adFormModel.fuel,
      condition: this.adFormModel.condition,
      county: this.adFormModel.county,
      sellerType: this.adFormModel.sellerType,
      buyOrLease: this.adFormModel.buyOrLease,
      gearType: this.adFormModel.gearType,
      color: this.adFormModel.color,
      doorNumber: this.adFormModel.doorNumber,
      drivingLicence: this.adFormModel.drivingLicence,
      weight: this.adFormModel.weight,
      payload: this.adFormModel.payload,
      volume: this.adFormModel.volume,
      title: this.adFormModel.title,
      description: this.adFormModel.description,
      images: this.selectedImages,
    });
  }

  private refreshPreviewUrls(): void {
    readFilesAsDataUrls(this.selectedImages)
      .then((urls) => this.previewUrls$.next(urls))
      .catch(() => this.previewUrls$.next([]));
  }




  toggleDropdown(key: DropdownKey): void {
    const isOpen = this.dropdowns[key];
    this.closeDropdowns();
    this.dropdowns[key] = !isOpen;
  }

  closeDropdowns(): void {
    (Object.keys(this.dropdowns) as DropdownKey[]).forEach((dropdownKey) => {
      this.dropdowns[dropdownKey] = false;
    });
  }

  onBrandsChange(brands: string[]): void {
    const previousBrand = this.adFormModel.brand;
    const nextBrand = brands[0] ?? '';

    this.selectedBrands = nextBrand ? [nextBrand] : [];
    this.adFormModel.brand = nextBrand;

    if (nextBrand !== previousBrand) {
      this.selectedModels = [];
      this.adFormModel.model = '';
      this.dropdowns['model'] = false;
    }

    this.syncDetailsDraft();
  }

  onModelsChange(models: string[]): void {
    const nextModel = models[0] ?? '';
    this.selectedModels = nextModel ? [nextModel] : [];
    this.adFormModel.model = nextModel;
    this.syncDetailsDraft();
  }

  onYearChange(year: string): void {
    this.selectedYear = year;
    const parsedYear = Number(year.replace(/,/g, ''));
    this.adFormModel.year = Number.isFinite(parsedYear) && parsedYear > 0 ? parsedYear : null;
    this.syncDetailsDraft();
    console.log(`Year changed to: ${this.adFormModel.year}`);
  }

  onTitleChange(value: string): void {
    this.adFormModel.title = value;
    this.syncDetailsDraft();
  }

  onDescriptionChange(value: string): void {
    this.adFormModel.description = value;
    this.syncDetailsDraft();
    console.log(`Description changed to: ${this.adFormModel.description}`);
  }

  onPriceChange(value: string): void {
    const rawValue = String(value);
    const parsedPrice = Number(rawValue.replace(/,/g, ''));
    this.selectedPrice = rawValue;
    this.adFormModel.price = rawValue === '' || !Number.isFinite(parsedPrice) ? null : parsedPrice;
    this.syncDetailsDraft();
    console.log(`Price changed to: ${this.adFormModel.price}`);
  }



  onEngineSizeChange(value: string): void {
    this.selectedEngineSize = value;
  }

  onEnginePowerChange(value: string): void {
    this.selectedEnginePower = value;
  }

  onKilometrageChange(value: string): void {
    this.selectedKilometrage = value;
    const parsedMileage = Number(value.replace(/[^0-9.]/g, ''));
    this.adFormModel.mileage = Number.isFinite(parsedMileage) && parsedMileage > 0 ? parsedMileage : null;
    this.syncDetailsDraft();
  }

  onFuelChange(value: string): void {
    this.adFormModel.fuel = value;
    this.selectedGasType = this.toFuelLabel(value);
    this.syncDetailsDraft();
  }

  onConditionChange(value: string): void {
    this.adFormModel.condition = value;
    this.selectedCondition = this.toConditionLabel(value);
    this.syncDetailsDraft();
  }

  onCountyChange(values: string[]): void {
    const nextCounty = values[0] ?? '';
    this.selectedCounty = nextCounty ? [nextCounty] : [];
    this.adFormModel.county = nextCounty;
    this.syncDetailsDraft();
  }

  onSellerTypeChange(value: string): void {
    this.selectedSellerType = value;
    this.adFormModel.sellerType = this.toSellerTypeValue(value);
    this.syncDetailsDraft();
  }

  onBuyOrLeaseChange(value: string): void {
    this.selectedBuyOrLease = value;
    this.adFormModel.buyOrLease = this.toBuyOrLeaseValue(value);
    this.syncDetailsDraft();
  }

  onGearTypeChange(value: string): void {
    this.selectedGearType = value;
    this.adFormModel.gearType = this.toGearTypeValue(value);
    this.syncDetailsDraft();
  }

  onColorChange(values: string[]): void {
    const nextColor = values[0] ?? '';
    this.selectedColor = nextColor ? [nextColor] : [];
    this.adFormModel.color = nextColor || null;
    this.syncDetailsDraft();
  }

  onDoorNumberChange(value: string): void {
    this.selectedDoorNumber = value;
    this.adFormModel.doorNumber = this.parsePositiveNumber(value);
    this.syncDetailsDraft();
  }

  onDrivingLicenceChange(value: string): void {
    this.selectedDrivingLicence = value;
    this.adFormModel.drivingLicence = value;
    this.syncDetailsDraft();
  }

  onWeightChange(value: string): void {
    this.selectedWeight = value;
    this.adFormModel.weight = this.parsePositiveNumber(value);
    this.syncDetailsDraft();
  }

  onPayloadChange(value: string): void {
    this.selectedPayload = value;
    this.adFormModel.payload = this.parsePositiveNumber(value);
    this.syncDetailsDraft();
  }

  onVolumeChange(value: string): void {
    this.selectedVolume = value;
    this.adFormModel.volume = this.parsePositiveNumber(value);
    this.syncDetailsDraft();
  }

  onMileageChange(value: string | number): void {
    this.adFormModel.mileage = value === '' ? null : Number(value);
    this.syncDetailsDraft();
  }

  onFieldChange(): void {
    this.syncDetailsDraft();
  }

  onOptionalFieldChange(field: 'gearType' | 'color', value: string): void {
    this.adFormModel[field] = value ? value : null;
    this.syncDetailsDraft();
  }

  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) {
      return;
    }

    this.selectedImages = [...this.selectedImages, ...Array.from(files)];
    this.submitAttempted = false;
    readFilesAsDataUrls(files)
      .then((newUrls) => {
        this.checkoutState.setDetailsState({
          ...this.checkoutState.getDetailsState(),
          images: this.selectedImages,
        });
        this.previewUrls$.next([...this.previewUrls$.value, ...newUrls]);
        this.syncDetailsDraft();
        input.value = '';
      })
      .catch(() => {
        input.value = '';
      });
  }

  moveImageLeft(index: number): void {
    if (index <= 0) {
      return;
    }

    const urls = [...this.previewUrls$.value];
    [urls[index - 1], urls[index]] = [urls[index], urls[index - 1]];
    this.previewUrls$.next(urls);
    [this.selectedImages[index - 1], this.selectedImages[index]] = [this.selectedImages[index], this.selectedImages[index - 1]];
    this.syncDetailsDraft();
  }

  moveImageRight(index: number): void {
    const urls = [...this.previewUrls$.value];
    if (index >= urls.length - 1) {
      return;
    }

    [urls[index], urls[index + 1]] = [urls[index + 1], urls[index]];
    this.previewUrls$.next(urls);
    [this.selectedImages[index], this.selectedImages[index + 1]] = [this.selectedImages[index + 1], this.selectedImages[index]];
    this.syncDetailsDraft();
  }

  deleteImage(index: number): void {
    const urls = this.previewUrls$.value.filter((_, i) => i !== index);
    this.previewUrls$.next(urls);
    this.selectedImages = this.selectedImages.filter((_, i) => i !== index);
    this.syncDetailsDraft();
  }

  goToVehicleCategory(): void {
    this.checkoutState.clearDetailsState();
    this.checkoutState.setCurrentStep(1);
    void this.router.navigate(['/checkout/vehicle-category']);
  }

  onStepSelected(step: number): void {
    if (!this.getClickableSteps().includes(step)) {
      return;
    }

    if (step === 1) {
      this.goToVehicleCategory();
      return;
    }

    if (step === 2) {
      return;
    }

    this.submitAttempted = true;
    if (!this.hasAllRequiredDetails()) {
      return;
    }

    this.checkoutState.setDetailsState({
      brand: this.adFormModel.brand,
      model: this.adFormModel.model,
      year: this.adFormModel.year,
      price: this.adFormModel.price,
      mileage: this.adFormModel.mileage,
      fuel: this.adFormModel.fuel,
      condition: this.adFormModel.condition,
      county: this.adFormModel.county.trim(),
      sellerType: this.adFormModel.sellerType,
      buyOrLease: this.adFormModel.buyOrLease,
      gearType: this.adFormModel.gearType,
      color: this.adFormModel.color,
      doorNumber: this.adFormModel.doorNumber,
      drivingLicence: this.adFormModel.drivingLicence,
      weight: this.adFormModel.weight,
      payload: this.adFormModel.payload,
      volume: this.adFormModel.volume,
      title: this.adFormModel.title.trim(),
      description: this.adFormModel.description.trim(),
      images: this.selectedImages,
    });

    this.checkoutState.setCurrentStep(3);
    void this.router.navigate(['/checkout/payment-options']);
  }

  private hasAllRequiredDetails(): boolean {
    return Boolean(
      this.adFormModel.brand &&
      this.adFormModel.model &&
      this.adFormModel.year &&
      this.adFormModel.price !== null && Number.isFinite(this.adFormModel.price) &&
      this.adFormModel.fuel &&
      this.adFormModel.condition &&
      this.adFormModel.title.trim() &&
      this.adFormModel.description.trim() &&
      this.selectedImages.length > 0,
    );
  }

  isMissingRequired(field: string): boolean {
    if (!this.submitAttempted) {
      return false;
    }

    switch (field) {
      case 'brand':
        return !this.adFormModel.brand;
      case 'model':
        return !this.adFormModel.model;
      case 'year':
        return !this.adFormModel.year;
      case 'price':
        return this.adFormModel.price === null;
      case 'mileage':
        return this.adFormModel.mileage === null;
      case 'fuel':
        return !this.adFormModel.fuel;
      case 'condition':
        return !this.adFormModel.condition;
      case 'county':
        return !this.adFormModel.county.trim();
      case 'sellerType':
        return !this.adFormModel.sellerType;
      case 'buyOrLease':
        return !this.adFormModel.buyOrLease;
      case 'title':
        return !this.adFormModel.title.trim();
      case 'description':
        return !this.adFormModel.description.trim();
      case 'images':
        return this.selectedImages.length === 0;
      default:
        return false;
    }
  }

  onSubmit(form: NgForm): void {
    this.submitAttempted = true;

    if (!this.hasAllRequiredDetails()) {
      form.control.markAllAsTouched();
      console.log('Form is invalid, cannot proceed to payment options.');
      return;
    }

    this.checkoutState.setDetailsState({
      brand: this.adFormModel.brand,
      model: this.adFormModel.model,
      year: this.adFormModel.year,
      price: this.adFormModel.price,
      mileage: this.adFormModel.mileage,
      fuel: this.adFormModel.fuel,
      condition: this.adFormModel.condition,
      county: this.adFormModel.county.trim(),
      sellerType: this.adFormModel.sellerType,
      buyOrLease: this.adFormModel.buyOrLease,
      gearType: this.adFormModel.gearType,
      color: this.adFormModel.color,
      doorNumber: this.adFormModel.doorNumber,
      drivingLicence: this.adFormModel.drivingLicence,
      weight: this.adFormModel.weight,
      payload: this.adFormModel.payload,
      volume: this.adFormModel.volume,
      title: this.adFormModel.title.trim(),
      description: this.adFormModel.description.trim(),
      images: this.selectedImages,
    });

    console.log('Form submitted with details:', this.checkoutState.getDetailsState());
    this.checkoutState.setCurrentStep(3);
    console.log("current step:", this.checkoutState.getCurrentStep())
    console.log(localStorage);
    void this.router.navigate(['/checkout/payment-options']);
  }

  private toFuelLabel(value: string): string {
    switch (value) {
      case 'petrol':
        return 'Petrol';
      case 'diesel':
        return 'Diesel';
      case 'electric':
        return 'Electric';
      case 'hybrid':
        return 'Hybrid';
      default:
        return '';
    }
  }

  private toConditionLabel(value: string): string {
    switch (value) {
      case 'new':
        return 'New';
      case 'used':
        return 'Used';
      case 'certified_pre_owned':
        return 'Certified Pre-Owned';
      default:
        return '';
    }
  }

  private toSellerTypeLabel(value: string): string {
    switch (value) {
      case 'private':
        return 'Privatni';
      case 'dealer':
        return 'Trgovac';
      default:
        return '';
    }
  }

  private toSellerTypeValue(value: string): string {
    switch (value) {
      case 'Privatni':
        return 'private';
      case 'Trgovac':
        return 'dealer';
      default:
        return value.trim().toLowerCase();
    }
  }

  private toBuyOrLeaseLabel(value: string): string {
    switch (value) {
      case 'buy':
        return 'Buy';
      case 'lease':
        return 'Lease';
      default:
        return '';
    }
  }

  private toBuyOrLeaseValue(value: string): string {
    switch (value) {
      case 'Buy':
        return 'buy';
      case 'Lease':
        return 'lease';
      default:
        return value.trim().toLowerCase();
    }
  }

  private toGearTypeLabel(value: string): string {
    switch (value) {
      case 'manual':
        return 'Manual';
      case 'automatic':
        return 'Automatic';
      case 'semi_automatic':
        return 'Semi-Automatic';
      default:
        return '';
    }
  }

  private toGearTypeValue(value: string): string | null {
    switch (value) {
      case 'Manual':
        return 'manual';
      case 'Automatic':
        return 'automatic';
      case 'Semi-Automatic':
        return 'semi_automatic';
      default:
        return value ? value.trim().toLowerCase() : null;
    }
  }

  private parsePositiveNumber(value: string): number | null {
    const parsed = Number(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  protected readonly faChevronDown = faChevronDown;
  protected readonly faArrowLeft = faArrowLeft;
  protected readonly faArrowRight = faArrowRight;
  protected readonly HTMLInputElement = HTMLInputElement;
}
