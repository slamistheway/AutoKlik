import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterGearType } from './filter-gearType';

describe('FilterGearType', () => {
  let component: FilterGearType;
  let fixture: ComponentFixture<FilterGearType>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterGearType],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterGearType);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
