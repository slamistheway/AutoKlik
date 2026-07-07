import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NavbarComponent } from '../../shared/layout/navbar/navbar';
import { Footer } from '../../shared/layout/footer/footer';
import {faCar, faMotorcycle, faTruck, faChevronDown} from '@fortawesome/free-solid-svg-icons';
import {Router, RouterLink} from '@angular/router';
import { filter, Observable, of, Subject } from 'rxjs';
import { Auth } from '../../core/services/auth';
import {CurrentUser} from '../../models/current-user.model';
import {
  getAdImageUrl as getAdImageUrlFn,
  getCategoryLabel as getCategoryLabelFn,
  getSubcategoryLabel as getSubcategoryLabelFn
} from '../../shared/functions/shared-functions';
import {faGear} from '@fortawesome/free-solid-svg-icons/faGear';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

/*
*
* todo: makni pagination kod ispisvanja oglasa
*
*
* */


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, NavbarComponent, Footer, RouterLink],
  templateUrl: './home.html',
  styleUrls: [],
})

export class HomeComponent implements OnInit {
  /*-----USER/AUTH-----*/
  currentUser$: Observable<CurrentUser | null> = of(null);
  private readonly destroyRef = inject(DestroyRef);


  /*-----SEARCH-----*/
  private searchFilter = "";
  searchText: string = '';

  /*-----LOGING-----*/
  errorMessageSubject = new Subject<string>()
  errorMessage$ = this.errorMessageSubject.asObservable();

  /*-----OTHER-----*/
  protected readonly faGear = faGear;
  protected readonly faCar = faCar;
  protected readonly faMotorcycle = faMotorcycle;
  protected readonly faTruck = faTruck;
  protected readonly faChevronDown = faChevronDown;
  readonly getCategoryLabel = getCategoryLabelFn;
  readonly getSubcategoryLabel = getSubcategoryLabelFn;
  protected readonly getAdImageUrl = getAdImageUrlFn;


  constructor(
    private readonly auth: Auth,
    private readonly router: Router,
  ) {

  }


  ngOnInit(): void {
    this.auth.loadUser();
    this.currentUser$ = this.auth.user$;
    this.currentUser$
      .pipe(
        filter((user): user is CurrentUser => Boolean(user?.id)),
      )
      .subscribe((user) => {
        console.log('current user id:', user.id);
      });
  }




  /*----------------------------------------------------------SEARCH-----------------------------------------------------------------*/
  search_cars(): void {
    this.searchFilter = this.searchText.trim();

    if (this.searchFilter.length === 0) {
      return;
    }

    void this.router.navigate(['/pretrazi'], {
      queryParams: {
        search: this.searchFilter,
      },
    });
  }


}
