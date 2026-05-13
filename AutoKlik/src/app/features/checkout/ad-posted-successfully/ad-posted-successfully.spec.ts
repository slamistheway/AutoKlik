import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdPostedSuccessfully } from './ad-posted-successfully';

describe('AdPostedSuccessfully', () => {
  let component: AdPostedSuccessfully;
  let fixture: ComponentFixture<AdPostedSuccessfully>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdPostedSuccessfully],
    }).compileComponents();

    fixture = TestBed.createComponent(AdPostedSuccessfully);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
