import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  ElementRef,
  HostListener
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';


interface Seller {
  label: string;
  value: string;
}


@Component({
  selector: 'app-filter-sellerType',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './filter-sellerType.html',
})

export class FilterSellerType {

  protected readonly faChevronDown = faChevronDown;

  SellerTypes: Seller[] = [
    { label: 'Privatni', value: 'privatni' },
    { label: 'Trgovac', value: 'trgovac' }
  ];


  @Input() selectedSellerType: string = '';

  @Output() sellerTypeChange = new EventEmitter<string>();

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

  selectSellerType(option: Seller): void {
    this.selectedSellerType = option.label;
    this.sellerTypeChange.emit(this.selectedSellerType);
    this.dropdowns[this.dropdownKey] = false;
  }


}
