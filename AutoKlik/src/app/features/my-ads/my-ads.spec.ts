import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { of } from 'rxjs';
import { Auth } from '../auth/auth';
import { MyAds } from './my-ads';
import { CurrentUser } from '../../models/current-user.model';

describe('MyAds', () => {
  let component: MyAds;
  let fixture: ComponentFixture<MyAds>;
  let loadUserCalls = 0;
  const httpGetCalls: Array<{ url: string; options: unknown }> = [];

  const currentUser: CurrentUser = {
    id: 7,
    username: 'demo',
    email: 'demo@example.com',
    pfp: '',
  };

  const loadUser = () => {
    loadUserCalls += 1;
  };

  const authMock = {
    loadUser,
    user$: of(currentUser),
  };

  const httpMock = {
    get: (url: string, options: unknown) => {
      httpGetCalls.push({ url, options });
      return of([
        {
          id: 1,
          user_id: 7,
          category: 'car',
          subcategory: 'personal_car',
          brand: 'BMW',
          model: '320d',
          title: 'Test oglas',
          description: 'Opis oglasa',
          year: 2020,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ]);
    },
  };

  beforeEach(async () => {
    localStorage.setItem('sessionApiToken', 'test-token');
    loadUserCalls = 0;
    httpGetCalls.length = 0;

    await TestBed.configureTestingModule({
      imports: [MyAds],
      providers: [
        { provide: Auth, useValue: authMock },
        { provide: HttpClient, useValue: httpMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyAds);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('sessionApiToken');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads ads for the authenticated user', () => {
    expect(loadUserCalls).toBe(1);
    expect(httpGetCalls.length).toBe(1);
    expect(httpGetCalls[0].url).toBe('http://localhost:3000/ad/me');

    const options = httpGetCalls[0].options as { headers?: HttpHeaders };
    expect(options.headers instanceof HttpHeaders).toBe(true);
    expect(component.myAds$.value?.[0]?.id).toBe(1);
  });
});
