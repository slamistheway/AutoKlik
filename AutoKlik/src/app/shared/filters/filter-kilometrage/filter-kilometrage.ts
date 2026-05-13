import { CommonModule } from '@angular/common';
import {Component, ElementRef, EventEmitter, HostListener, Input, Output} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

interface Kilometrage {
  label: string;
  value: number;
}

type FilterMode = 'range' | 'single';



@Component({
  selector: 'app-filter-kilometrage',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './filter-kilometrage.html',
})

export class FilterKilometrage {

  protected readonly faChevronDown = faChevronDown;


  Kilometrages: Kilometrage[] = [
    { label: '10,000 km', value: 10000 },
    { label: '50,000 km', value: 50000 },
    { label: '100,000 km', value: 100000 },
    { label: '200,000 km', value: 200000 },
    { label: '500,000 km', value: 500000 },
    { label: '1,000,000 km', value: 1000000 },
  ];


  @Input() selectedKilometrageMIN: string = '';
  @Input() selectedKilometrageMAX: string = '';
  @Input() selectedKilometrage: string = '';
  @Input() mode: FilterMode = 'range';

  @Output() kilometrageChange = new EventEmitter<string>();
  @Output() kilometrageMINChange = new EventEmitter<string>();
  @Output() kilometrageMAXChange = new EventEmitter<string>();

  @Input() dropdownKeyMin!: string;
  @Input() dropdownKeyMax!: string;
  @Input() dropdownKey!: string;
  @Input() dropdowns!: Record<string, boolean>;

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

  toggleDropdownSingle(): void {
    this.toggleDropdown(this.dropdownKey);
  }



  selectKilometrageMIN(option: Kilometrage): void {
    this.selectedKilometrageMIN = option.label;

    if (this.selectedKilometrageMAX) {
      const minValue = option.value;
      const maxValue = this.parseKilometrageLabel(this.selectedKilometrageMAX);

      if (minValue > maxValue) {
        this.selectedKilometrageMAX = '';
        this.kilometrageMAXChange.emit(this.selectedKilometrageMAX);
      }
    }
    this.kilometrageMINChange.emit(this.selectedKilometrageMIN);
    this.dropdowns[this.dropdownKeyMin] = false;
  }

  selectKilometrageMAX(option: Kilometrage): void {
    this.selectedKilometrageMAX = option.label;

    if (this.selectedKilometrageMIN) {
      const minValue = this.parseKilometrageLabel(this.selectedKilometrageMIN);
      const maxValue = option.value;

      if (maxValue < minValue) {
        this.selectedKilometrageMIN = '';
        this.kilometrageMINChange.emit(this.selectedKilometrageMIN);
      }
    }

    this.kilometrageMAXChange.emit(this.selectedKilometrageMAX);
    this.dropdowns[this.dropdownKeyMax] = false;
  }

  selectKilometrage(option: Kilometrage): void {
    this.selectedKilometrage = option.label;
    this.kilometrageChange.emit(this.selectedKilometrage);
    this.closeDropdown(this.dropdownKey);
  }



  private parseKilometrageLabel(label: string): number {
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
