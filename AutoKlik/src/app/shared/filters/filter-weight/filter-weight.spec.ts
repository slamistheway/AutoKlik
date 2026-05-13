import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterWeight } from './filter-weight';

describe('FilterWeight', () => {
  let component: FilterWeight;
  let fixture: ComponentFixture<FilterWeight>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterWeight],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterWeight);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
