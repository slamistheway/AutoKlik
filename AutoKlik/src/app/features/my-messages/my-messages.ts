import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { map, Observable, of } from 'rxjs';
import { CurrentUser } from '../../models/current-user.model';

import { NavbarComponent } from '../../shared/layout/navbar/navbar';
import { Footer } from '../../shared/layout/footer/footer';
import {MyProfileAside} from '../../shared/layout/my-profile-aside/my-profile-aside';
import { Auth } from '../../core/services/auth';


@Component({
  selector: 'app-my-messages',
  imports: [CommonModule, NavbarComponent, Footer, MyProfileAside],
  templateUrl: './my-messages.html',
})
export class MyMessages {
  currentUser$: Observable<CurrentUser | null> = of(null);

  constructor(private auth: Auth) {}

  ngOnInit(): void {
    this.auth.loadUser();

    this.currentUser$ = this.auth.user$;
  }
}


