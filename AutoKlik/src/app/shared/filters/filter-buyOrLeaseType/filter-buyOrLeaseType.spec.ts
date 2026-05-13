import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterBuyOrLeaseType } from './filter-buyOrLeaseType';

describe('FilterBuyOrLeaseType', () => {
  let component: FilterBuyOrLeaseType;
  let fixture: ComponentFixture<FilterBuyOrLeaseType>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterBuyOrLeaseType],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterBuyOrLeaseType);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
