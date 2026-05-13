import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterYears } from './filter-years';

describe('FilterYears', () => {
  let component: FilterYears;
  let fixture: ComponentFixture<FilterYears>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterYears],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterYears);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
