import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterKilometrage } from './filter-kilometrage';

describe('FilterEnginePower', () => {
  let component: FilterKilometrage;
  let fixture: ComponentFixture<FilterKilometrage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterKilometrage],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterKilometrage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
