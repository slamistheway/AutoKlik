import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterDrivingLicence } from './filter-drivingLicence';

describe('FilterDrivingLicence', () => {
  let component: FilterDrivingLicence;
  let fixture: ComponentFixture<FilterDrivingLicence>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterDrivingLicence],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterDrivingLicence);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
