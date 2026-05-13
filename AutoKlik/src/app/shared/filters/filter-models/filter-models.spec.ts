import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterModels } from './filter-models';

describe('FilterModels', () => {
  let component: FilterModels;
  let fixture: ComponentFixture<FilterModels>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterModels],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterModels);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
