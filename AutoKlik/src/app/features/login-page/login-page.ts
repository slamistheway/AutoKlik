import { Component } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Router, RouterLink} from '@angular/router';
import {FormsModule, NgForm} from '@angular/forms';
import {finalize} from 'rxjs/operators';
import {CommonModule} from '@angular/common';
import {NavbarComponent} from '../../shared/layout/navbar/navbar';
import {Footer} from '../../shared/layout/footer/footer';
import {Subject} from 'rxjs';


@Component({
  selector: 'app-login-page-page',
  imports: [CommonModule, FormsModule, NavbarComponent, RouterLink, Footer],
  templateUrl: './login-page.html',
})
export class LoginPage {
  identifier = '';
  password = '';
  isSubmitting = false;
  errorMessageSubject = new Subject<string>()
  errorMessage$ = this.errorMessageSubject.asObservable();
  successMessage$ = new Subject<string>();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(form: NgForm) {
    if (form.invalid || this.isSubmitting) {
      this.errorMessageSubject.next('Forma nije validna.');
      return;
    }

    const identifier = this.identifier.trim();
    if (!identifier) {
      this.errorMessageSubject.next('Unesite email ili korisničko ime.');
      return;
    }

    this.isSubmitting = true;
    this.errorMessageSubject.next('');
    this.successMessage$.next('');

    this.http.post<{ message?: string; token?: string;}>('http://localhost:3000/login', {
        identifier: identifier,
        password: this.password,
      })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (res) => {
          this.errorMessageSubject.next('');
          this.successMessage$.next(res.message ?? '');
          form.resetForm();
          this.identifier = '';
          this.password = '';

          if (res.token) {
            console.log('Received token:', res.token);
            localStorage.setItem('sessionApiToken', res.token);
            console.log('Token stored in localStorage. Current localStorage:', localStorage);
            this.router.navigate(['/']);
          }
        },
        error: (err) => {
          this.errorMessageSubject.next(err.error.message ?? 'Prijava nije uspjela.');
          this.successMessage$.next("");
        },
      });
  }
}
