import { Component } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Router, RouterLink} from '@angular/router';
import {FormsModule, NgForm} from '@angular/forms';
import {finalize} from 'rxjs/operators';
import {CommonModule} from '@angular/common';
import {NavbarComponent} from '../../../../shared/layout/navbar/navbar';
import {Footer} from '../../../../shared/layout/footer/footer';
import {Subject} from 'rxjs';


@Component({
  selector: 'app-login-page',
  imports: [CommonModule, FormsModule, NavbarComponent, RouterLink, Footer],
  templateUrl: './login-page.html',
})
export class LoginPage {
  identifier = '';
  password = '';
  isSubmitting = false;
  errorMessage$ = new Subject<string>();
  successMessage$ = new Subject<string>();


  constructor(private http: HttpClient, private router: Router) {}

  login(form: NgForm) {
    if (form.invalid || this.isSubmitting) {
      form.control.markAllAsTouched();
      return;
    }

    const identifier = this.identifier.trim();

    if (!identifier) {
      this.errorMessage$.next('Unesite email ili korisničko ime.');
      return;
    }

    this.isSubmitting = true;
    this.errorMessage$.next('');
    this.successMessage$.next('');

    this.http
      .post<{ message?: string; token?: string }>('http://localhost:3000/auth/login', {
        identifier: identifier,
        password: this.password,
      })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (res) => {
          this.errorMessage$.next('');
          this.successMessage$.next(res.message ?? 'Prijava uspješna.');
          form.resetForm();
          this.identifier = '';
          this.password = '';


          if (res.token) {
            localStorage.setItem('sessionApiToken', res.token);
          }

          this.router.navigate(['/home']);
        },
        error: (err) => {
          this.errorMessage$.next(err.error.message ?? 'Prijava nije uspjela.');
          this.successMessage$.next("");
        },
      });
  }
}
