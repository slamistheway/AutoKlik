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


interface BuyOrLease {
  label: string;
  value: string;
}



@Component({
  selector: 'app-filter-buyorleasetype',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './filter-buyOrLeaseType.html',
})

export class FilterBuyOrLeaseType {
  protected readonly faChevronDown = faChevronDown;

  BuyOrLeaseOptions: BuyOrLease[] = [
    { label: 'Buy', value: 'buy' },
    { label: 'Lease', value: 'lease' },
  ];


  @Input() selectedBuyOrLease: string = '';
  @Output() buyOrLeaseChange = new EventEmitter<string>();

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


  selectBuyOrLease(option: BuyOrLease): void {
    this.selectedBuyOrLease = option.label;
    this.buyOrLeaseChange.emit(this.selectedBuyOrLease);
    this.dropdowns[this.dropdownKey] = false;
  }


}
