import { CommonModule } from '@angular/common';
import {Component, ElementRef, EventEmitter, HostListener, Input, Output} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

interface EnginePower {
  label: string;
  value: number;
}

type FilterMode = 'range' | 'single';



@Component({
  selector: 'app-filter-enginePower',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './filter-enginePower.html',
})

export class FilterEnginePower {

  protected readonly faChevronDown = faChevronDown;


  enginePowers: EnginePower[] = [
    { label: '25 kW', value: 25 },
    { label: '50 kW', value: 50 },
    { label: '75 kW', value: 75 },
    { label: '100 kW', value: 100 },
    { label: '150 kW', value: 150 },
    { label: '200 kW', value: 200 },
    { label: '250 kW', value: 250 },
    { label: '300 kW', value: 300 },
    { label: '400 kW', value: 400 },
  ];


  @Input() selectedEnginePowerMIN = '';
  @Input() selectedEnginePowerMAX = '';
  @Input() selectedEnginePower = '';
  @Input() mode: FilterMode = 'range';

  @Output() enginePowerMINChange = new EventEmitter<string>();
  @Output() enginePowerMAXChange = new EventEmitter<string>();
  @Output() enginePowerChange = new EventEmitter<string>();

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



  selectEnginePowerMIN(option: EnginePower): void {
    this.selectedEnginePowerMIN = option.label;

    if (this.selectedEnginePowerMAX) {
      const minValue = option.value;
      const maxValue = this.parseValueLabel(this.selectedEnginePowerMAX);

      if (minValue > maxValue) {
        this.selectedEnginePowerMAX = '';
        this.enginePowerMAXChange.emit(this.selectedEnginePowerMAX);
      }
    }
    this.enginePowerMINChange.emit(this.selectedEnginePowerMIN);
    this.dropdowns[this.dropdownKeyMin] = false;
  }

  selectEnginePowerMAX(option: EnginePower): void {
    this.selectedEnginePowerMAX = option.label;

    if (this.selectedEnginePowerMIN) {
      const minValue = this.parseValueLabel(this.selectedEnginePowerMIN);
      const maxValue = option.value;

      if (maxValue < minValue) {
        this.selectedEnginePowerMIN = '';
        this.enginePowerMINChange.emit(this.selectedEnginePowerMIN);
      }
    }

    this.enginePowerMAXChange.emit(this.selectedEnginePowerMAX);
    this.dropdowns[this.dropdownKeyMax] = false;
  }

  selectEnginePower(option: EnginePower): void {
    this.selectedEnginePower = option.label;
    this.enginePowerChange.emit(this.selectedEnginePower);
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
