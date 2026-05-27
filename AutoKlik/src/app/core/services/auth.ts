import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { CurrentUser } from '../../models/current-user.model';

@Injectable({ providedIn: 'root' })
export class Auth {
  private userSubject = new BehaviorSubject<CurrentUser | null>(null);
  currentUser$: Observable<CurrentUser | null> = this.userSubject.asObservable();

  constructor(
    private http: HttpClient
  ) {

  }

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

    const headers = new HttpHeaders({Authorization: `Bearer ${token}`,});
    if(!headers){
      console.log("No token headers found");
      return;
    }

    this.http.get<CurrentUser>('http://localhost:3000/users/me', { headers }).subscribe({
        next: (currentUser) => this.userSubject.next(currentUser),
        error: () => {
          this.clearSessionStorage();
          this.userSubject.next(null);
        }
      });
  }

  setUser(currentUser: CurrentUser) {
    this.userSubject.next(currentUser);
  }

  logout() {
    this.clearSessionStorage();
    this.userSubject.next(null);
  }

}
