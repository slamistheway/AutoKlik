import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyMessages } from './my-messages';

describe('MyMessages', () => {
  let component: MyMessages;
  let fixture: ComponentFixture<MyMessages>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyMessages],
    }).compileComponents();

    fixture = TestBed.createComponent(MyMessages);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
