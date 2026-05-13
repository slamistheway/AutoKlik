import {
  Component,
  EventEmitter,
  Input, OnInit,
  OnChanges,
  Output,
  SimpleChanges, ElementRef, HostListener,
} from '@angular/core';
import {faChevronDown, faSearch} from '@fortawesome/free-solid-svg-icons';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {getModelsFromJson} from '../../functions/shared-functions';

interface Model {
  label: string;
  value: string;
}

type ModelSelectionMode = 'single' | 'multi';

@Component({
  selector: 'app-filter-models',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './filter-models.html',
})
export class FilterModels implements OnInit, OnChanges {
  protected readonly faChevronDown = faChevronDown;

  get usesJsonBrandModelFilters(): boolean {
    return (
      this.selectedVehicle_type === 'cars' ||
      this.selectedVehicle_type === 'motorcycle' ||
      this.selectedVehicle_type === 'van'
    );
  }

  async ngOnInit(): Promise<void> {
    await this.loadModels();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['selectedVehicle_type']) {
      if (!this.usesJsonBrandModelFilters && this.dropdowns?.[this.dropdownKey]) {
        this.dropdowns[this.dropdownKey] = false;
      }
      await this.loadModels();
    }
  }

  private async loadModels(): Promise<void> {
    if (!this.usesJsonBrandModelFilters) {
      this.Models = {};
      return;
    }

    this.Models = await getModelsFromJson(this.selectedVehicle_type);

    const nextSelectedModels = this.selectedModels.filter((model) =>
      this.selectedBrands.some((brand) => (this.Models[brand] ?? []).includes(model)),
    );

    if (nextSelectedModels.length !== this.selectedModels.length) {
      this.selectedModels = nextSelectedModels;
      this.modelsChange.emit([...this.selectedModels]);
    }
  }

  modelSearchTerm = '';
  Models: Record<string, string[]> = {};
  @Input() selectedBrands: string[] = [];
  @Input() selectedVehicle_type = '';
  @Input() selectedModels: string[] = [];
  @Input() dropdownKey!: string;
  @Input() dropdowns!: Record<string, boolean>;
  @Input() mode: ModelSelectionMode = 'multi';
  @Input() showSearch = true;
  @Input() title = 'Model';
  @Input() placeholder = 'Model';
  @Input() showSelectedBrandLabel = true;

  @Output() modelsChange = new EventEmitter<string[]>();
  @Output() dropdownOpen = new EventEmitter<void>();
  @Output() dropdownClose = new EventEmitter<void>();

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


  selectModel(option: Model): void {
    if (this.isSingleMode) {
      const current = this.selectedModels[0] ?? '';
      const next = current === option.label ? '' : option.label;
      this.selectedModels = next ? [next] : [];
      this.dropdowns[this.dropdownKey] = false;
      this.modelsChange.emit([...this.selectedModels]);
      return;
    }

    if (!this.selectedModels.includes(option.label)) {
      this.selectedModels = [...this.selectedModels, option.label];
    } else {
      this.selectedModels = this.selectedModels.filter((model) => model !== option.label);
    }

    this.modelsChange.emit([...this.selectedModels]);
  }

  getFilteredModelsForBrand(brand: string): Model[] {
    const models = this.Models[brand] ?? [];
    const search = this.modelSearchTerm.trim().toLowerCase();
    const filtered = search
      ? models.filter((model) => model.toLowerCase().includes(search))
      : models;

    return filtered.map((model) => ({ label: model, value: model }));
  }

  get hasFilteredModels(): boolean {
    return this.selectedBrands.some(
      (brand) => this.getFilteredModelsForBrand(brand).length > 0
    );
  }

  onModelSearchInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.modelSearchTerm = inputElement.value;
  }

  onManualModelInputChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const value = inputElement.value;
    const trimmed = value.trim();
    this.modelsChange.emit(trimmed ? [trimmed] : []);
  }

  protected readonly faSearch = faSearch;
}
