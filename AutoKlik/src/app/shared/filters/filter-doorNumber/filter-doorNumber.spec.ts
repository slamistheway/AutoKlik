import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterDoorNumber } from './filter-doorNumber';

describe('FilterDoorNumber', () => {
  let component: FilterDoorNumber;
  let fixture: ComponentFixture<FilterDoorNumber>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterDoorNumber],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterDoorNumber);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
