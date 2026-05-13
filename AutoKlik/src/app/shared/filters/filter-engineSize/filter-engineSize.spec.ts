import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterEngineSize } from './filter-engineSize';

describe('FilterEnginePower', () => {
  let component: FilterEngineSize;
  let fixture: ComponentFixture<FilterEngineSize>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterEngineSize],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterEngineSize);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
