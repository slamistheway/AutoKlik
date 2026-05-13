import { CommonModule } from '@angular/common';
import {Component, ElementRef, EventEmitter, HostListener, Input, Output} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

interface Year {
  label: string;
  value: number;
}

type FilterMode = 'range' | 'single';


@Component({
  selector: 'app-filter-years',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './filter-years.html',
})

export class FilterYears {

  protected readonly faChevronDown = faChevronDown;


  Years: Year[] = [
    { label: '2026', value: 2026 },
    { label: '2025', value: 2025 },
    { label: '2024', value: 2024 },
    { label: '2023', value: 2023 },
    { label: '2022', value: 2022 },
    { label: '2021', value: 2021 },
    { label: '2020', value: 2020 },
    { label: '2019', value: 2019 },
    { label: '2018', value: 2018 },
    { label: '2017', value: 2017 },
    { label: '2016', value: 2016 },
    { label: '2015', value: 2015 },
    { label: '2014', value: 2014 },
    { label: '2013', value: 2013 },
    { label: '2012', value: 2012 },
    { label: '2011', value: 2011 },
    { label: '2010', value: 2010 },
  ];



  @Input() selectedYearMIN: string = '';
  @Input() selectedYearMAX: string = '';
  @Input() selectedYear: string = '';
  @Input() mode: FilterMode = 'range';

  @Input() dropdownKeyMin!: string;
  @Input() dropdownKeyMax!: string;
  @Input() dropdownKey!: string;
  @Input() dropdowns!: Record<string, boolean>;

  @Output() yearChange = new EventEmitter<string>();


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




  toggleDropdownMIN(): void {
    this.toggleDropdown(this.dropdownKeyMin);
  }

  toggleDropdownMAX(): void {
    this.toggleDropdown(this.dropdownKeyMax);
  }

  toggleDropdownSingle(): void {
    this.toggleDropdown(this.dropdownKey);
  }


  @Output() yearMINChange = new EventEmitter<string>();
  @Output() yearMAXChange = new EventEmitter<string>();



  selectYearMIN(option: Year): void {
    this.selectedYearMIN = option.label;

    if (this.selectedYearMAX) {
      const minValue = option.value;
      const maxValue = this.parseYearLabel(this.selectedYearMAX);

      if (minValue > maxValue) {
        this.selectedYearMAX = '';
        this.yearMAXChange.emit(this.selectedYearMAX);
      }
    }
    this.yearMINChange.emit(this.selectedYearMIN);
    this.dropdowns[this.dropdownKeyMin] = false;
  }

  selectYearMAX(option: Year): void {
    this.selectedYearMAX = option.label;

    if (this.selectedYearMIN) {
      const minValue = this.parseYearLabel(this.selectedYearMIN);
      const maxValue = option.value;

      if (maxValue < minValue) {
        this.selectedYearMIN = '';
        this.yearMINChange.emit(this.selectedYearMIN);
      }
    }

    this.yearMAXChange.emit(this.selectedYearMAX);
    this.dropdowns[this.dropdownKeyMax] = false;
  }

  selectYear(option: Year): void {
    this.selectedYear = option.label;
    this.yearChange.emit(this.selectedYear);
    this.closeDropdown(this.dropdownKey);
  }



  private parseYearLabel(label: string): number {
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
