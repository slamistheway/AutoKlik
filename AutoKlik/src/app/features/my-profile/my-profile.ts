import {Component, OnInit} from '@angular/core';
import { NavbarComponent } from '../../shared/layout/navbar/navbar';
import { Footer } from '../../shared/layout/footer/footer';
import {MyProfileAside} from '../../shared/layout/my-profile-aside/my-profile-aside';
import {CommonModule} from '@angular/common';
import {Observable, of} from 'rxjs';
import {CurrentUser} from '../../models/current-user.model';
import {Auth} from '../auth/auth';
import {getProfileImageUrl} from '../../shared/functions/shared-functions';


@Component({
  selector: 'app-my-profile',
  imports: [CommonModule, NavbarComponent, Footer, MyProfileAside],
  templateUrl: './my-profile.html',
})


export class MyProfile implements OnInit {
  currentUser$: Observable<CurrentUser | null> = of(null);

  constructor(private auth: Auth) {}

  ngOnInit(): void {
    this.auth.loadUser();

    this.currentUser$ = this.auth.user$;
  }


  protected readonly getProfileImageUrl = getProfileImageUrl;
}
