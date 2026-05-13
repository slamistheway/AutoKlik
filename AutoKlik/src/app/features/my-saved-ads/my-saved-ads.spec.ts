import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MySavedAds } from './my-saved-ads';

describe('MySavedAds', () => {
  let component: MySavedAds;
  let fixture: ComponentFixture<MySavedAds>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MySavedAds],
    }).compileComponents();

    fixture = TestBed.createComponent(MySavedAds);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
