import { CommonModule } from '@angular/common';
import {Component, ElementRef, EventEmitter, HostListener, Input, Output} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

interface WeightOption {
  label: string;
  value: number;
}

type FilterMode = 'range' | 'single';



@Component({
  selector: 'app-filter-weight',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './filter-weight.html',
})

export class FilterWeight {

  protected readonly faChevronDown = faChevronDown;


  weightOptions: WeightOption[] = [
    { label: '1000 kg', value: 1000 },
    { label: '1500 kg', value: 1500 },
    { label: '2000 kg', value: 2000 },
    { label: '2500 kg', value: 2500 },
    { label: '3000 kg', value: 3000 },
    { label: '3500 kg', value: 3500 },
    { label: '5000 kg', value: 5000 },
    { label: '7500 kg', value: 7500 },
    { label: '10000 kg', value: 10000 },
    { label: '15000 kg', value: 15000 },
    { label: '20000 kg', value: 20000 },
    { label: '30000 kg', value: 30000 },
  ];


  @Input() selectedWeightMIN = '';
  @Input() selectedWeightMAX = '';
  @Input() selectedWeight = '';
  @Input() mode: FilterMode = 'range';

  @Output() weightMINChange = new EventEmitter<string>();
  @Output() weightMAXChange = new EventEmitter<string>();
  @Output() weightChange = new EventEmitter<string>();

  @Input() dropdownKeyMin!: string;
  @Input() dropdownKeyMax!: string;
  @Input() dropdownKey!: string;
  @Input() dropdowns!: Record<string, boolean>;


  constructor(private eRef: ElementRef) {
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.dropdowns[this.dropdownKeyMin] = false;
      this.dropdowns[this.dropdownKeyMax] = false;
    }
  }



  toggleDropdownMIN(): void {
    this.toggleDropdown(this.dropdownKeyMin);
  }

  toggleDropdownMAX(): void {
    this.toggleDropdown(this.dropdownKeyMax);
  }

  toggleDropdownSingle(): void {
    this.toggleDropdown(this.dropdownKey);
  }



  selectWeightMIN(option: WeightOption): void {
    this.selectedWeightMIN = option.label;

    if (this.selectedWeightMAX) {
      const minValue = option.value;
      const maxValue = this.parseValueLabel(this.selectedWeightMAX);

      if (minValue > maxValue) {
        this.selectedWeightMAX = '';
        this.weightMAXChange.emit(this.selectedWeightMAX);
      }
    }
    this.weightMINChange.emit(this.selectedWeightMIN);
    this.closeDropdown(this.dropdownKeyMin);
  }

  selectWeightMAX(option: WeightOption): void {
    this.selectedWeightMAX = option.label;

    if (this.selectedWeightMIN) {
      const minValue = this.parseValueLabel(this.selectedWeightMIN);
      const maxValue = option.value;

      if (maxValue < minValue) {
        this.selectedWeightMIN = '';
        this.weightMINChange.emit(this.selectedWeightMIN);
      }
    }

    this.weightMAXChange.emit(this.selectedWeightMAX);
    this.closeDropdown(this.dropdownKeyMax);
  }

  selectWeight(option: WeightOption): void {
    this.selectedWeight = option.label;
    this.weightChange.emit(this.selectedWeight);
    this.closeDropdown(this.dropdownKey);
  }



  private parseValueLabel(label: string): number {
    return Number(label.replace(/[^0-9.]/g, '')) || 0;
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
