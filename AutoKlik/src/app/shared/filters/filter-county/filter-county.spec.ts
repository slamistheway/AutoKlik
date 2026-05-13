import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterCounty } from './filter-county';

describe('FilterCounty', () => {
  let component: FilterCounty;
  let fixture: ComponentFixture<FilterCounty>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterCounty],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterCounty);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
