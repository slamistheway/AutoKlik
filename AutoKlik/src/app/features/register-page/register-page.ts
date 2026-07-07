import { Component } from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, NgForm} from '@angular/forms';
import {NavbarComponent} from '../../shared/layout/navbar/navbar';
import {RouterLink} from '@angular/router';
import {HttpClient} from '@angular/common/http';
import {Subject} from 'rxjs';



@Component({
  selector: 'app-register-page',
  imports: [CommonModule, FormsModule, NavbarComponent, RouterLink],
  templateUrl: './register-page.html',
})
export class RegisterPage {
  username = '';
  email = '';
  password = '';
  firstName = '';
  lastName = '';
  phone = '';
  city = '';
  country = '';
  isSubmitting = false;
  errorMessageSubject = new Subject<string>()
  errorMessage$ = this.errorMessageSubject.asObservable();
  successMessage$ = new Subject<string>();

  private readonly usernameRegex = /^(?!.*@)[A-Za-z0-9]+$/;
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private readonly passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

  constructor(private http: HttpClient) {}


  register(form: NgForm) {
    if (form.invalid || this.isSubmitting) {
      form.control.markAllAsTouched();
      return;
    }

    const username = this.username.trim();
    const email = this.email.trim();
    const firstName = this.firstName.trim() || null;
    const lastName = this.lastName.trim() || null;
    const phone = this.phone.trim() || null;
    const city = this.city.trim() || null;
    const country = this.country.trim() || null;


    if (!username) {
      this.errorMessageSubject.next('Unesite korisničko ime.');
      return;
    }

    if (!this.usernameRegex.test(username)) {
      this.errorMessageSubject.next('Korisničko ime može sadržavati samo slova i brojeve i ne smije sadržavati @.');
      return;
    }

    if (!this.emailRegex.test(email)) {
      this.errorMessageSubject.next('Unesite ispravnu email adresu.');
      return;
    }

    if (!this.passwordRegex.test(this.password)) {
      this.errorMessageSubject.next('Lozinka mora sadržavati najmanje 8 znakova, jedno veliko slovo i jedan poseban znak (!@#$%^&*).');
      return;
    }


    this.isSubmitting = true;
    this.errorMessageSubject.next('');
    this.successMessage$.next('');

    this.http.post<{ message?: string }>('http://localhost:3000/register', {
      username: username,
      email: email,
      password: this.password,
      firstName,
      lastName,
      phone,
      city,
      country,
    }).subscribe({
      next: (res) => {
        this.successMessage$.next(res.message ?? "");
        this.username = '';
        this.email = '';
        this.password = '';
        this.firstName = '';
        this.lastName = '';
        this.phone = '';
        this.city = '';
        this.country = '';
        form.resetForm();
        this.isSubmitting = false;
      },
      error: (err) => {
        const err_msg = err.error.message;
        this.errorMessageSubject.next(err_msg);
        console.error("Error poruka: " + err_msg);
        this.isSubmitting = false;
      }
    });
  }
}
