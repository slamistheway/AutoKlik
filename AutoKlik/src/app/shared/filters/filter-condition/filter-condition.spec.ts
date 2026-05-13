import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterCondition } from './filter-condition';

describe('FilterDrivingLicence', () => {
  let component: FilterCondition;
  let fixture: ComponentFixture<FilterCondition>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterCondition],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterCondition);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
