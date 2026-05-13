import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehicleCategory } from './vehicle-category';

describe('VehicleCategory', () => {
  let component: VehicleCategory;
  let fixture: ComponentFixture<VehicleCategory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleCategory],
    }).compileComponents();

    fixture = TestBed.createComponent(VehicleCategory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
