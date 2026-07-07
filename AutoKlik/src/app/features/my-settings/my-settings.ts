import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, firstValueFrom, map, Observable, Subscription } from 'rxjs';
import { CurrentUser } from '../../models/current-user.model';
import { Auth } from '../../core/services/auth';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPen } from '@fortawesome/free-solid-svg-icons';
import { Footer } from '../../shared/layout/footer/footer';
import { AsyncPipe, NgClass, NgSwitch } from '@angular/common';
import { NavbarComponent } from '../../shared/layout/navbar/navbar';
import { FormsModule } from '@angular/forms';
import { MyProfileAside } from '../../shared/layout/my-profile-aside/my-profile-aside';
import { getProfileImageUrl } from '../../shared/functions/shared-functions';
import { Router } from '@angular/router';


@Component({
  selector: 'app-my-settings',
  imports: [
    Footer,
    AsyncPipe,
    NgSwitch,
    NavbarComponent,
    FaIconComponent,
    NgClass,
    FormsModule,
    MyProfileAside,
  ],
  templateUrl: './my-settings.html',
})


export class MySettings implements OnInit, OnDestroy {
  activeTab = 'postavke';
  current_tab: 'moji_podaci' | 'upravljanje_racunom' = 'moji_podaci';
  currentUser$: Observable<CurrentUser | null>;

  // Form fields
  selectedFile: File | null = null;
  isSaving = false;
  saveMessage = '';
  isDeleting = false;
  deleteMessage = '';
  faPen = faPen;

  private currentUserSnapshot: CurrentUser | null = null;
  private readonly profileImageOverrideSubject = new BehaviorSubject<string | null>(null);
  profileImageUrl$: Observable<string>;
  private userSubscription: Subscription | null = null;

  private readonly editableFields = ['firstName', 'lastName', 'phone', 'city', 'country'] as const;
  editState: Record<(typeof this.editableFields)[number], boolean> = {
    firstName: false,
    lastName: false,
    phone: false,
    city: false,
    country: false,
  };

  constructor(private readonly auth: Auth, private readonly http: HttpClient, private readonly router: Router) {
    this.currentUser$ = this.auth.user$;
    this.profileImageUrl$ = combineLatest([this.currentUser$, this.profileImageOverrideSubject]).pipe(
      map(([user, overrideUrl]) => overrideUrl ?? getProfileImageUrl(user)),
    );
  }

  ngOnInit(): void {
    this.auth.loadUser();

    this.userSubscription = this.currentUser$.subscribe((user) => {
      this.currentUserSnapshot = user;
      if (!user) {
        return;
      }

      this.resetEditState();
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  onSettingsTabClick(tab: 'moji_podaci' | 'upravljanje_racunom'): void {
    this.current_tab = tab;
  }

  openPfpPicker(input: HTMLInputElement): void {
    input.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.profileImageOverrideSubject.next(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.readAsDataURL(file);
  }

  toggleEdit(field: (typeof this.editableFields)[number]): void {
    if (this.isSaving) {
      return;
    }

    this.editState[field] = !this.editState[field];
  }

  isEditing(field: (typeof this.editableFields)[number]): boolean {
    return this.editState[field];
  }

  private resetEditState(): void {
    this.editableFields.forEach((field) => {
      this.editState[field] = false;
    });
  }

  async saveProfile(): Promise<void> {
    this.isSaving = true;
    this.saveMessage = '';

    try {
      const token = localStorage.getItem('sessionApiToken');
      if (!token) {
        this.saveMessage = 'Niste prijavljeni.';
        return;
      }

      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

      const updatedUser = await firstValueFrom(
        this.http.patch<CurrentUser>(
          'http://localhost:3000/users/me',
          {

          },
          { headers },
        ),
      );

      let mergedUser: CurrentUser = updatedUser;

      if (this.selectedFile) {
        const formData = new FormData();
        formData.append('file', this.selectedFile);

        const pfpResponse = await firstValueFrom(
          this.http.post<{ id: number; pfp: string }>('http://localhost:3000/users/me/upload-pfp', formData, { headers }),
        );

        mergedUser = {
          ...updatedUser,
          pfp: pfpResponse.pfp,
        };
      }

      this.auth.setUser(mergedUser);
      this.selectedFile = null;
      this.profileImageOverrideSubject.next(null);
      this.resetEditState();
      this.saveMessage = 'Promjene su uspjesno spremljene.';
    } catch (err) {
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        this.saveMessage = 'Sesija je istekla. Prijavite se ponovo.';
      } else {
        this.saveMessage = 'Greska pri spremanju promjena.';
      }
    } finally {
      this.isSaving = false;
    }
  }

  async deleteAccount(): Promise<void> {
    if (this.isDeleting || this.isSaving) {
      return;
    }

    const shouldDelete = window.confirm('Jeste li sigurni da želite trajno izbrisati račun? Ovu radnju nije moguće poništiti.');
    if (!shouldDelete) {
      return;
    }

    this.isDeleting = true;
    this.deleteMessage = '';

    try {
      const token = localStorage.getItem('sessionApiToken');
      if (!token) {
        this.deleteMessage = 'Niste prijavljeni.';
        return;
      }

      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      await firstValueFrom(this.http.delete<{ message?: string }>('http://localhost:3000/users/me', { headers }));

      this.auth.logout();
      this.deleteMessage = 'Račun je uspješno izbrisan.';
      await this.router.navigate(['/']);
    } catch (err) {
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        this.deleteMessage = 'Sesija je istekla. Prijavite se ponovo.';
      } else {
        this.deleteMessage = 'Greška pri brisanju računa.';
      }
    } finally {
      this.isDeleting = false;
    }
  }
}
