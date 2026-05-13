import { CommonModule } from '@angular/common';
import {Component, ElementRef, EventEmitter, HostListener, Input, Output} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';



interface Gas {
  label: string;
  value: string;
}



@Component({
  selector: 'app-filter-gasType',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './filter-gasType.html',
})

export class FilterGasType {

  protected readonly faChevronDown = faChevronDown;

  GasTypes: Gas[] = [
    { label: 'Petrol', value: 'petrol' },
    { label: 'Diesel', value: 'diesel' },
    { label: 'Electric', value: 'electric' },
    { label: 'Hybrid', value: 'hybrid' },
  ];



  @Input() selectedGasType: string = '';
  @Output() gasTypeChange = new EventEmitter<string>();


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


  selectGasType(option: Gas): void {
    this.selectedGasType = option.label;
    this.gasTypeChange.emit(option.value);
    this.dropdowns[this.dropdownKey] = false;
  }


}
