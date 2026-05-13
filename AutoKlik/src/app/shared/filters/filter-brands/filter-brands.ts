import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import {faChevronDown, faSearch} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {getBrandsFromJson} from '../../functions/shared-functions';


interface Brand {
  label: string;
  value: string;
}

type BrandSelectionMode = 'single' | 'multi';


@Component({
  selector: 'app-filter-brands',
  standalone: true,
  imports: [
    FaIconComponent
  ],
  templateUrl: './filter-brands.html',
})

export class FilterBrands implements OnInit, OnChanges {
  protected readonly faChevronDown = faChevronDown;

  constructor(private eRef: ElementRef) {
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (!this.dropdowns) {
      return;
    }

    if (!this.eRef.nativeElement.contains(event.target)) {
      this.dropdowns[this.dropdownKey] = false;
    }
  }


  get usesJsonBrandModelFilters(): boolean {
    return (
      this.selectedVehicle_type === 'cars' ||
      this.selectedVehicle_type === 'motorcycle' ||
      this.selectedVehicle_type === 'van'
    );
  }

  async ngOnInit(): Promise<void> {
    await this.loadBrands();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['selectedVehicle_type']) {
      if (!this.usesJsonBrandModelFilters && this.dropdowns?.[this.dropdownKey]) {
        this.dropdowns[this.dropdownKey] = false;
      }
      await this.loadBrands();
    }
  }

  private async loadBrands(): Promise<void> {
    if (!this.usesJsonBrandModelFilters) {
      this.Brands = [];
      return;
    }

    const brands = await getBrandsFromJson(this.selectedVehicle_type);
    this.Brands = brands.map((brand) => ({
      label: brand,
      value: brand,
    }));

    const allowedBrands = new Set(this.Brands.map((brand) => brand.value));
    const nextSelectedBrands = this.selectedBrands.filter((brand) => allowedBrands.has(brand));
    if (nextSelectedBrands.length !== this.selectedBrands.length) {
      this.selectedBrands = nextSelectedBrands;
      this.brandsChange.emit([...this.selectedBrands]);
    }
  }


  // Filter Values
  Brands: Brand[] = [];
  brandSearchTerm = '';
  @Input() selectedBrands: string[] = [];
  @Input() selectedVehicle_type = '';
  @Input() dropdownKey!: string;
  @Input() dropdowns!: Record<string, boolean>;
  @Input() mode: BrandSelectionMode = 'multi';
  @Input() showSearch = true;
  @Input() title = 'Marka';
  @Input() placeholder = 'Marka';

  @Output() brandsChange = new EventEmitter<string[]>();
  @Output() dropdownOpen = new EventEmitter<void>();
  @Output() dropdownClose = new EventEmitter<void>();

  get isSingleMode(): boolean {
    return this.mode === 'single';
  }

  // BRAND
  toggleDropdown(): void {
    const isOpen = this.dropdowns[this.dropdownKey];
    Object.keys(this.dropdowns).forEach((key) => {
      this.dropdowns[key] = false;
    });
    this.dropdowns[this.dropdownKey] = !isOpen;
  }





  /*-----------------FUNCTIONS--------------------*/
  selectBrand(option: Brand): void {
    if (this.isSingleMode) {
      const current = this.selectedBrands[0] ?? '';
      const next = current === option.label ? '' : option.label;
      this.selectedBrands = next ? [next] : [];
      this.dropdowns[this.dropdownKey] = false;
      this.brandsChange.emit([...this.selectedBrands]);
      return;
    }

    if (!this.selectedBrands.includes(option.label)) {
      this.selectedBrands = [...this.selectedBrands, option.label];
    } else {
      this.selectedBrands = this.selectedBrands.filter((brand) => brand !== option.label);
    }

    this.brandsChange.emit([...this.selectedBrands]);
  }

  removeSelectedBrand(brand: string, event: Event): void {
    event.stopPropagation();
    this.selectedBrands = this.selectedBrands.filter((selectedBrand) => selectedBrand !== brand);
    this.brandsChange.emit([...this.selectedBrands]);
  }

  get filteredBrands(): Brand[] {
    const search = this.brandSearchTerm.trim().toLowerCase();
    if (!search) {
      return this.Brands;
    }

    return this.Brands.filter((brand) =>
      brand.label.toLowerCase().includes(search)
    );
  }

  onBrandSearchInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.brandSearchTerm = inputElement.value;
  }

  onManualBrandInputChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const value = inputElement.value;
    const trimmed = value.trim();
    this.brandsChange.emit(trimmed ? [trimmed] : []);
  }


  /*-----------------TOGGLE FRAMES--------------------*/


  protected readonly faSearch = faSearch;
}
