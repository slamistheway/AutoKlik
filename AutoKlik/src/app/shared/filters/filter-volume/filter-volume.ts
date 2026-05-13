import { CommonModule } from '@angular/common';
import {Component, ElementRef, EventEmitter, HostListener, Input, Output} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

interface VolumeOption {
  label: string;
  value: number;
}

type FilterMode = 'range' | 'single';



@Component({
  selector: 'app-filter-volume',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './filter-volume.html',
})

export class FilterVolume {

  protected readonly faChevronDown = faChevronDown;


  volumeOptions: VolumeOption[] = [
    { label: '2 m3', value: 2 },
    { label: '4 m3', value: 4 },
    { label: '6 m3', value: 6 },
    { label: '8 m3', value: 8 },
    { label: '10 m3', value: 10 },
    { label: '12 m3', value: 12 },
    { label: '15 m3', value: 15 },
    { label: '20 m3', value: 20 },
    { label: '25 m3', value: 25 },
    { label: '30 m3', value: 30 },
    { label: '40 m3', value: 40 },
  ];


  @Input() selectedVolumeMIN = '';
  @Input() selectedVolumeMAX = '';
  @Input() selectedVolume = '';
  @Input() mode: FilterMode = 'range';

  @Output() volumeMINChange = new EventEmitter<string>();
  @Output() volumeMAXChange = new EventEmitter<string>();
  @Output() volumeChange = new EventEmitter<string>();

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



  selectVolumeMIN(option: VolumeOption): void {
    this.selectedVolumeMIN = option.label;

    if (this.selectedVolumeMAX) {
      const minValue = option.value;
      const maxValue = this.parseValueLabel(this.selectedVolumeMAX);

      if (minValue > maxValue) {
        this.selectedVolumeMAX = '';
        this.volumeMAXChange.emit(this.selectedVolumeMAX);
      }
    }
    this.volumeMINChange.emit(this.selectedVolumeMIN);
    this.closeDropdown(this.dropdownKeyMin);
  }

  selectVolumeMAX(option: VolumeOption): void {
    this.selectedVolumeMAX = option.label;

    if (this.selectedVolumeMIN) {
      const minValue = this.parseValueLabel(this.selectedVolumeMIN);
      const maxValue = option.value;

      if (maxValue < minValue) {
        this.selectedVolumeMIN = '';
        this.volumeMINChange.emit(this.selectedVolumeMIN);
      }
    }

    this.volumeMAXChange.emit(this.selectedVolumeMAX);
    this.closeDropdown(this.dropdownKeyMax);
  }

  selectVolume(option: VolumeOption): void {
    this.selectedVolume = option.label;
    this.volumeChange.emit(this.selectedVolume);
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
