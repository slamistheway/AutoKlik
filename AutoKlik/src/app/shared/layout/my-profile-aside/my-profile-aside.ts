import { Component } from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterLink, RouterLinkActive} from '@angular/router';

@Component({
  selector: 'app-my-profile-aside',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './my-profile-aside.html',
})
export class MyProfileAside {}
