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


interface GearShift {
  label: string;
  value: string;
}


@Component({
  selector: 'app-filter-gearType',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './filter-gearType.html',
})

export class FilterGearType {

  protected readonly faChevronDown = faChevronDown;


  GearShifts: GearShift[] = [
    { label: 'Manual', value: 'manual' },
    { label: 'Automatic', value: 'automatic' },
    { label: 'Semi-Automatic', value: 'semi_automatic' },
  ];


  @Input() selectedGearType: string = '';
  @Output() gearTypeChange = new EventEmitter<string>();


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



  selectGearType(option: GearShift): void {
    this.selectedGearType = option.label;
    this.gearTypeChange.emit(this.selectedGearType);
    this.dropdowns[this.dropdownKey] = false;
  }

}
