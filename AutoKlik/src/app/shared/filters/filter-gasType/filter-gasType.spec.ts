import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterGasType } from './filter-gasType';

describe('FilterGasType', () => {
  let component: FilterGasType;
  let fixture: ComponentFixture<FilterGasType>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterGasType],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterGasType);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
