import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Details } from './details';

describe('Details', () => {
  let component: Details;
  let fixture: ComponentFixture<Details>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Details],
    }).compileComponents();

    fixture = TestBed.createComponent(Details);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close all dropdowns', () => {
    component.dropdowns.brand = true;
    component.dropdowns.model = true;
    component.dropdowns.year = true;

    component.closeDropdowns();

    expect(component.dropdowns.brand).toBe(false);
    expect(component.dropdowns.model).toBe(false);
    expect(component.dropdowns.year).toBe(false);
  });
});
