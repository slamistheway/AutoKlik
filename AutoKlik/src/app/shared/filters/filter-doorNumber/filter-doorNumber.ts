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


interface DoorNumber {
  label: string;
  value: number;
}




@Component({
  selector: 'app-filter-doorNumber',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './filter-doorNumber.html',
})

export class FilterDoorNumber {

  protected readonly faChevronDown = faChevronDown;


  DoorNumbers: DoorNumber[] = [
    { label: '2', value: 2 },
    { label: '3', value: 3 },
    { label: '4', value: 4 },
    { label: '5+', value: 5 },
  ];


  @Input() selectedDoorNumber: string = '';
  @Output() doorNumberChange = new EventEmitter<string>();

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

  selectDoorNumber(option: DoorNumber): void {
    this.selectedDoorNumber = option.label;
    this.doorNumberChange.emit(this.selectedDoorNumber);
    this.dropdowns[this.dropdownKey] = false;
  }

}
