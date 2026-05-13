import { CommonModule } from '@angular/common';
import {Component, ElementRef, EventEmitter, HostListener, Input, Output} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

interface PayloadOption {
  label: string;
  value: number;
}

type FilterMode = 'range' | 'single';



@Component({
  selector: 'app-filter-payload',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './filter-payload.html',
})

export class FilterPayload {

  protected readonly faChevronDown = faChevronDown;


  payloadOptions: PayloadOption[] = [
    { label: '500 kg', value: 500 },
    { label: '1000 kg', value: 1000 },
    { label: '1500 kg', value: 1500 },
    { label: '2000 kg', value: 2000 },
    { label: '3000 kg', value: 3000 },
    { label: '5000 kg', value: 5000 },
    { label: '7500 kg', value: 7500 },
    { label: '10000 kg', value: 10000 },
    { label: '15000 kg', value: 15000 },
    { label: '20000 kg', value: 20000 },
  ];


  @Input() selectedPayloadMIN = '';
  @Input() selectedPayloadMAX = '';
  @Input() selectedPayload = '';
  @Input() mode: FilterMode = 'range';

  @Output() payloadMINChange = new EventEmitter<string>();
  @Output() payloadMAXChange = new EventEmitter<string>();
  @Output() payloadChange = new EventEmitter<string>();

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



  selectPayloadMIN(option: PayloadOption): void {
    this.selectedPayloadMIN = option.label;

    if (this.selectedPayloadMAX) {
      const minValue = option.value;
      const maxValue = this.parseValueLabel(this.selectedPayloadMAX);

      if (minValue > maxValue) {
        this.selectedPayloadMAX = '';
        this.payloadMAXChange.emit(this.selectedPayloadMAX);
      }
    }
    this.payloadMINChange.emit(this.selectedPayloadMIN);
    this.closeDropdown(this.dropdownKeyMin);
  }

  selectPayloadMAX(option: PayloadOption): void {
    this.selectedPayloadMAX = option.label;

    if (this.selectedPayloadMIN) {
      const minValue = this.parseValueLabel(this.selectedPayloadMIN);
      const maxValue = option.value;

      if (maxValue < minValue) {
        this.selectedPayloadMIN = '';
        this.payloadMINChange.emit(this.selectedPayloadMIN);
      }
    }

    this.payloadMAXChange.emit(this.selectedPayloadMAX);
    this.closeDropdown(this.dropdownKeyMax);
  }

  selectPayload(option: PayloadOption): void {
    this.selectedPayload = option.label;
    this.payloadChange.emit(this.selectedPayload);
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
