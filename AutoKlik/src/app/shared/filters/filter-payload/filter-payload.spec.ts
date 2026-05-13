import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterPayload } from './filter-payload';

describe('FilterVolume', () => {
  let component: FilterPayload;
  let fixture: ComponentFixture<FilterPayload>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterPayload],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterPayload);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
