import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterSellerType } from './filter-sellerType';

describe('FilterSellerType', () => {
  let component: FilterSellerType;
  let fixture: ComponentFixture<FilterSellerType>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterSellerType],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterSellerType);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
