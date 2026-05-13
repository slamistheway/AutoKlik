import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MySettings } from './my-settings';

describe('MySettings', () => {
  let component: MySettings;
  let fixture: ComponentFixture<MySettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MySettings],
    }).compileComponents();

    fixture = TestBed.createComponent(MySettings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
