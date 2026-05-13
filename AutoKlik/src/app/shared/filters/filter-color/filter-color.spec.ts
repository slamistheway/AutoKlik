import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterColor } from './filter-color';

describe('FilterColor', () => {
  let component: FilterColor;
  let fixture: ComponentFixture<FilterColor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterColor],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterColor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
