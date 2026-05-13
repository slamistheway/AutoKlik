import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pretrazi } from './pretrazi';

describe('Pretrazi', () => {
  let component: Pretrazi;
  let fixture: ComponentFixture<Pretrazi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pretrazi],
    }).compileComponents();

    fixture = TestBed.createComponent(Pretrazi);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
