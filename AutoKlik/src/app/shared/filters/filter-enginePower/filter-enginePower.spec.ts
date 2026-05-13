import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterEnginePower } from './filter-enginePower';

describe('FilterPayload', () => {
  let component: FilterEnginePower;
  let fixture: ComponentFixture<FilterEnginePower>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterEnginePower],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterEnginePower);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
