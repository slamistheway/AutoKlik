import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyProfileAside } from './my-profile-aside';

describe('MyProfileAside', () => {
  let component: MyProfileAside;
  let fixture: ComponentFixture<MyProfileAside>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyProfileAside],
    }).compileComponents();

    fixture = TestBed.createComponent(MyProfileAside);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
