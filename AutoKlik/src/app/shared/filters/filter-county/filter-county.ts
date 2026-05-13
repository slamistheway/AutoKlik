import { CommonModule } from '@angular/common';
import {Component, ElementRef, EventEmitter, HostListener, Input, Output} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown, faSearch } from '@fortawesome/free-solid-svg-icons';

interface County {
  label: string;
  value: string;
}

type CountySelectionMode = 'single' | 'multi';

@Component({
  selector: 'app-filter-county',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './filter-county.html',
})
export class FilterCounty {
  protected readonly faChevronDown = faChevronDown;
  protected readonly faSearch = faSearch;

  Counties: County[] = [
    { label: 'Bjelovarsko-bilogorska', value: 'bjelovarsko_bilogorska' },
    { label: 'Brodsko-posavska', value: 'brodsko_posavska' },
    { label: 'Dubrovačko-neretvanska', value: 'dubrovačko_neretvanska' },
    { label: 'Istarska', value: 'istarska' },
    { label: 'Karlovačka', value: 'karlovačka' },
    { label: 'Koprivničko-križevačka', value: 'koprivničko_križevačka' },
    { label: 'Krapinsko-zagorska', value: 'krapinsko_zagorska' },
    { label: 'Ličko-senjska', value: 'ličko_senjska' },
    { label: 'Međimurska', value: 'međimurska' },
    { label: 'Osječko-baranjska', value: 'osječko_baranjska' },
    { label: 'Požeško-slavonska', value: 'požeško_slavonska' },
    { label: 'Primorsko-goranska', value: 'primorsko_goranska' },
    { label: 'Sisačko-moslavačka', value: 'sisačko_moslavačka' },
    { label: 'Splitsko-dalmatinska', value: 'splitsko_dalmatinska' },
    { label: 'Varaždinska', value: 'varaždinska' },
    { label: 'Virovitičko-podravska', value: 'virovitičko_podravska' },
    { label: 'Vukovarsko-srijemska', value: 'vukovarsko_srijemska' },
    { label: 'Zadarska', value: 'zadarska' },
    { label: 'Zagrebačka', value: 'zagrebačka' },
    { label: 'Grad Zagreb', value: 'grad_zagreb' },
  ];

  countySearchTerm = '';

  @Input() selectedCounties: string[] = [];
  @Input() mode: CountySelectionMode = 'multi';
  @Output() countyChange = new EventEmitter<string[]>();


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


  get isSingleMode(): boolean {
    return this.mode === 'single';
  }

  toggleDropdown(): void {
    const isOpen = this.dropdowns[this.dropdownKey];
    Object.keys(this.dropdowns).forEach((key) => {
      this.dropdowns[key] = false;
    });
    this.dropdowns[this.dropdownKey] = !isOpen;
  }


  selectCounty(option: County): void {
    if (this.isSingleMode) {
      const current = this.selectedCounties[0] ?? '';
      const next = current === option.label ? '' : option.label;
      this.selectedCounties = next ? [next] : [];
      this.countyChange.emit([...this.selectedCounties]);
      this.dropdowns[this.dropdownKey] = false;
      return;
    }

    if (!this.selectedCounties.includes(option.label)) {
      this.selectedCounties = [...this.selectedCounties, option.label];
    } else {
      this.selectedCounties = this.selectedCounties.filter((county) => county !== option.label);
    }
    this.countyChange.emit([...this.selectedCounties]);
  }


  get filteredCounties(): County[] {
    const search = this.countySearchTerm.trim().toLowerCase();

    if (!search) {
      return this.Counties;
    }

    return this.Counties.filter((county) =>
      county.label.toLowerCase().includes(search)
    );
  }

  onCountySearchInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.countySearchTerm = inputElement.value;
  }



}
