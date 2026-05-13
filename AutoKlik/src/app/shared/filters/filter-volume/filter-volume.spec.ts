import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterVolume } from './filter-volume';

describe('FilterVolume', () => {
  let component: FilterVolume;
  let fixture: ComponentFixture<FilterVolume>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterVolume],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterVolume);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
