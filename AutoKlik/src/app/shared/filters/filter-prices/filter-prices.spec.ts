import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterPrices } from './filter-prices';

describe('FilterPrices', () => {
  let component: FilterPrices;
  let fixture: ComponentFixture<FilterPrices>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterPrices],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterPrices);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
