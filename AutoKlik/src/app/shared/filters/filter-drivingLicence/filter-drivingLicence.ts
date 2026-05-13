import { CommonModule } from '@angular/common';
import {Component, ElementRef, EventEmitter, HostListener, Input, Output} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';



interface DrivingLicence {
  label: string;
  value: string;
}



@Component({
  selector: 'app-filter-drivingLicence',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './filter-drivingLicence.html',
})

export class FilterDrivingLicence {

  protected readonly faChevronDown = faChevronDown;


  drivingLicences: DrivingLicence[] = [
    { label: 'AM', value: 'AM' },
    { label: 'A1', value: 'A1' },
    { label: 'A2', value: 'A2' },
    { label: 'A', value: 'A' }
  ];



  @Input() selectedDrivingLicence = '';
  @Output() drivingLicenceChange = new EventEmitter<string>();

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


  selectDrivingLicence(option: DrivingLicence): void {
    this.selectedDrivingLicence = option.label;
    this.drivingLicenceChange.emit(this.selectedDrivingLicence);
    this.dropdowns[this.dropdownKey] = false;
  }


}
