import { CommonModule } from '@angular/common';
import {Component, ElementRef, EventEmitter, HostListener, Input, Output} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';


interface Color {
  label: string;
  value: string;
}

type ColorSelectionMode = 'single' | 'multi';



@Component({
  selector: 'app-filter-color',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './filter-color.html',
})

export class FilterColor {

  protected readonly faChevronDown = faChevronDown;


  Colors: Color[] = [
    { label: 'White', value: 'var(--color-surface)' },
    { label: 'Silver', value: '#9ca3af' },
    { label: 'Gray', value: '#6b7280' },
    { label: 'Black', value: '#111827' },
    { label: 'Blue', value: '#2563eb' },
    { label: 'Red', value: '#dc2626' },
    { label: 'Green', value: '#16a34a' },
    { label: 'Yellow', value: '#facc15' },
    { label: 'Orange', value: '#f97316' },
    { label: 'Brown', value: '#92400e' },
    { label: 'Purple', value: '#7c3aed' },
    { label: 'Pink', value: '#ec4899' },
  ];


  @Input() selectedColors: string[] = [];
  @Input() mode: ColorSelectionMode = 'multi';
  @Output() colorChange = new EventEmitter<string[]>();


  @Input() dropdownKey!: string;
  @Input() dropdowns!: Record<string, boolean>;

  get isSingleMode(): boolean {
    return this.mode === 'single';
  }

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


  toggleDropdown(): void {
    const isOpen = this.dropdowns[this.dropdownKey];
    Object.keys(this.dropdowns).forEach((key) => {
      this.dropdowns[key] = false;
    });
    this.dropdowns[this.dropdownKey] = !isOpen;
  }


  selectColor(option: Color): void {
    if (this.isSingleMode) {
      const current = this.selectedColors[0] ?? '';
      const next = current === option.label ? '' : option.label;
      this.selectedColors = next ? [next] : [];
      this.colorChange.emit([...this.selectedColors]);
      this.dropdowns[this.dropdownKey] = false;
      return;
    }

    if (!this.selectedColors.includes(option.label)) {
      this.selectedColors = [...this.selectedColors, option.label];
    } else {
      this.selectedColors = this.selectedColors.filter((color) => color !== option.label);
    }
    this.colorChange.emit([...this.selectedColors]);
  }

}
