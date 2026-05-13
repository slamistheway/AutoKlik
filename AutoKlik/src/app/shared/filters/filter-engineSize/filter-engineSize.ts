import { CommonModule } from '@angular/common';
import {Component, ElementRef, EventEmitter, HostListener, Input, Output} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

interface EngineSize {
  label: string;
  value: number;
}

type FilterMode = 'range' | 'single';



@Component({
  selector: 'app-filter-engineSize',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './filter-engineSize.html',
})

export class FilterEngineSize {

  protected readonly faChevronDown = faChevronDown;


  engineSizes: EngineSize[] = [
    { label: '600 cc', value: 600 },
    { label: '800 cc', value: 800 },
    { label: '1000 cc', value: 1000 },
    { label: '1200 cc', value: 1200 },
    { label: '1400 cc', value: 1400 },
    { label: '1600 cc', value: 1600 },
    { label: '2000 cc', value: 2000 },
    { label: '2500 cc', value: 2500 },
    { label: '3000 cc', value: 3000 },
    { label: '4000 cc', value: 4000 },
    { label: '5000 cc', value: 5000 },
  ];


  @Input() selectedEngineSizeMIN = '';
  @Input() selectedEngineSizeMAX = '';
  @Input() selectedEngineSize = '';
  @Input() mode: FilterMode = 'range';

  @Output() engineSizeMINChange = new EventEmitter<string>();
  @Output() engineSizeMAXChange = new EventEmitter<string>();
  @Output() engineSizeChange = new EventEmitter<string>();

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



  selectEngineSizeMIN(option: EngineSize): void {
    this.selectedEngineSizeMIN = option.label;

    if (this.selectedEngineSizeMAX) {
      const minValue = option.value;
      const maxValue = this.parseValueLabel(this.selectedEngineSizeMAX);

      if (minValue > maxValue) {
        this.selectedEngineSizeMAX = '';
        this.engineSizeMAXChange.emit(this.selectedEngineSizeMAX);
      }
    }
    this.engineSizeMINChange.emit(this.selectedEngineSizeMIN);
    this.dropdowns[this.dropdownKeyMin] = false;
  }

  selectEngineSizeMAX(option: EngineSize): void {
    this.selectedEngineSizeMAX = option.label;

    if (this.selectedEngineSizeMIN) {
      const minValue = this.parseValueLabel(this.selectedEngineSizeMIN);
      const maxValue = option.value;

      if (maxValue < minValue) {
        this.selectedEngineSizeMIN = '';
        this.engineSizeMINChange.emit(this.selectedEngineSizeMIN);
      }
    }

    this.engineSizeMAXChange.emit(this.selectedEngineSizeMAX);
    this.dropdowns[this.dropdownKeyMax] = false;
  }

  selectEngineSize(option: EngineSize): void {
    this.selectedEngineSize = option.label;
    this.engineSizeChange.emit(this.selectedEngineSize);
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
