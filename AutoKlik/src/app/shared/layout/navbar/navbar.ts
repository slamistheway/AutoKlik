import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from '../../../core/services/auth';
import { CurrentUser } from '../../../models/current-user.model';
import { getProfileImageUrl } from '../../functions/shared-functions';



@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './navbar.html',
  styleUrls: []
})
export class NavbarComponent implements OnInit {
  isMenuOpen = false;
  isProfileDropdownOpen = false;

  currentUser$: Observable<CurrentUser | null> = of(null);


  constructor(
    private auth: Auth,
  ) {}

  ngOnInit(): void {
    console.log("local storage (called from navbar):")
    console.log(localStorage);

    this.auth.loadUser();
    this.currentUser$ = this.auth.user$;
  }



  onLogoutClick(): void {
    this.isProfileDropdownOpen = false;
    this.auth.logout();
  }

  clearLocalStorage(): void {
    globalThis?.localStorage?.clear();
    console.log("Storage cleared");
  }



  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleProfileDropdown(): void {
    this.isProfileDropdownOpen = !this.isProfileDropdownOpen;
  }




  onMyProfileClick(): void {
    this.isProfileDropdownOpen = false;
  }

  onSettingsClick(): void {
    this.isProfileDropdownOpen = false;
  }


  protected readonly getProfileImageUrl = getProfileImageUrl;
}
