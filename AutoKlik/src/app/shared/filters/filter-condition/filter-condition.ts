import { CommonModule } from '@angular/common';
import {Component, ElementRef, EventEmitter, HostListener, Input, Output} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';



interface Condition {
  label: string;
  value: string;
}



@Component({
  selector: 'app-filter-condition',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './filter-condition.html',
})

export class FilterCondition {

  protected readonly faChevronDown = faChevronDown;


  Conditions: Condition[] = [
    { label: 'New', value: 'new' },
    { label: 'Used', value: 'used' },
    { label: 'Certified Pre-Owned', value: 'certified_pre_owned' },
  ];



  @Input() selectedCondition: string = '';
  @Output() conditionChange = new EventEmitter<string>();

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


  selectCondition(option: Condition): void {
    this.selectedCondition = option.label;
    this.conditionChange.emit(option.value);
    this.dropdowns[this.dropdownKey] = false;
  }


}
