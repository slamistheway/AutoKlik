import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterBrands } from './filter-brands';

describe('FilterBrands', () => {
  let component: FilterBrands;
  let fixture: ComponentFixture<FilterBrands>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterBrands],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterBrands);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
