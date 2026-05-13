// Auth service stub for authentication logic
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {BehaviorSubject, Observable, of, tap} from 'rxjs';
import { CurrentUser } from '../../models/current-user.model';

@Injectable({ providedIn: 'root' })
export class Auth {
  private userSubject = new BehaviorSubject<CurrentUser | null>(null);
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  private clearSessionStorage(): void {
    globalThis?.localStorage?.removeItem('sessionApiToken');
  }


  loadUser() {
    const token = localStorage.getItem('sessionApiToken');
    if (!token) {
      console.log('No session token. User not logged in');
      this.userSubject.next(null);
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.get<CurrentUser>('http://localhost:3000/users/me', { headers })
      .subscribe({
        next: (user) => this.userSubject.next(user),
        error: () => {
          this.clearSessionStorage();
          this.userSubject.next(null);
        }
      });
  }


  setUser(user: CurrentUser) {
    this.userSubject.next(user);
  }


  logout() {
    this.clearSessionStorage();
    this.userSubject.next(null);
  }


  login(email: string, password: string) {
    return this.http.post<{ user: CurrentUser; token: string }>(
      'http://localhost:3000/login',
      { email, password }
    ).pipe(
      tap(response => {
        localStorage.setItem('sessionApiToken', response.token);
        this.userSubject.next(response.user);
      })
    );
  }
}




