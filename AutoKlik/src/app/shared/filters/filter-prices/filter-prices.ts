import { CommonModule } from '@angular/common';
import {Component, ElementRef, EventEmitter, HostListener, Input, Output} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

interface Price {
  label: string;
  value: number;
}

type FilterMode = 'range' | 'single';

@Component({
  selector: 'app-filter-prices',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './filter-prices.html',
})

export class FilterPrices {

  protected readonly faChevronDown = faChevronDown;



  Prices: Price[] = [
    { label: '500', value: 500 },
    { label: '1,000', value: 1000 },
    { label: '5,000', value: 5000 },
    { label: '10,000', value: 10000 },
    { label: '20,000', value: 20000 },
    { label: '50,000', value: 50000 },
    { label: '100,000', value: 100000 },
    { label: '200,000', value: 200000 },
    { label: '500,000', value: 500000 },
    { label: '1,000,000', value: 1000000 },
  ];

  @Input() selectedPriceMIN: string = '';
  @Input() selectedPriceMAX: string = '';
  @Input() selectedPrice: string = '';
  @Input() mode: FilterMode = 'range';
  @Input() dropdownKeyMin!: string;
  @Input() dropdownKeyMax!: string;
  @Input() dropdownKey!: string;
  @Input() dropdowns!: Record<string, boolean>;

  @Output() priceChange = new EventEmitter<string>();
  @Output() priceMINChange = new EventEmitter<string>();
  @Output() priceMAXChange = new EventEmitter<string>();
  @Output() dropdownOpen = new EventEmitter<void>();
  @Output() dropdownClose = new EventEmitter<void>();

  constructor(private eRef: ElementRef) {
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (!this.dropdowns) {
      return;
    }

    if (!this.eRef.nativeElement.contains(event.target)) {
      this.dropdowns[this.dropdownKeyMin] = false;
      this.dropdowns[this.dropdownKeyMax] = false;
    }
  }

  focusOutside(event: Event) {
      this.dropdowns[this.dropdownKeyMin] = false;
      this.dropdowns[this.dropdownKeyMax] = false;
  }

  toggleDropdownMIN(): void {
    this.toggleDropdown(this.dropdownKeyMin);
  }

  toggleDropdownMAX(): void {
    this.toggleDropdown(this.dropdownKeyMax);
  }




  typePriceSingleMode(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.priceChange.emit(value);
  }


  selectPriceMIN(option: Price): void {
    this.selectedPriceMIN = option.label;

    if (this.selectedPriceMAX) {
      const minValue = option.value;
      const maxValue = this.parsePriceLabel(this.selectedPriceMAX);

      if (minValue > maxValue) {
        this.selectedPriceMAX = '';
        this.priceMAXChange.emit(this.selectedPriceMAX);
      }
    }
    this.priceMINChange.emit(this.selectedPriceMIN);
    this.dropdowns[this.dropdownKeyMin] = false;
  }

  selectPriceMAX(option: Price): void {
    this.selectedPriceMAX = option.label;

    if (this.selectedPriceMIN) {
      const minValue = this.parsePriceLabel(this.selectedPriceMIN);
      const maxValue = option.value;

      if (maxValue < minValue) {
        this.selectedPriceMIN = '';
        this.priceMINChange.emit(this.selectedPriceMIN);
      }
    }

    this.priceMAXChange.emit(this.selectedPriceMAX);
    this.dropdowns[this.dropdownKeyMax] = false;
  }

  selectPrice(option: Price): void {
    this.selectedPrice = option.label;
    this.priceChange.emit(this.selectedPrice);
    this.closeDropdown(this.dropdownKey);
  }


  private parsePriceLabel(label: string): number {
    return Number(label.replace(/,/g, '')) || 0;
  }

  private toggleDropdown(key: string): void {
    if (!key) {
      return;
    }

    const isOpen = Boolean(this.dropdowns?.[key]);
    this.closeAllDropdowns();
    this.dropdowns[key] = !isOpen;
  }

  private closeDropdown(key: string): void {
    if (!key || !this.dropdowns) {
      return;
    }
    this.dropdowns[key] = false;
  }

  private closeAllDropdowns(): void {
    if (!this.dropdowns) {
      return;
    }

    Object.keys(this.dropdowns).forEach((key) => {
      this.dropdowns[key] = false;
    });
  }
}
