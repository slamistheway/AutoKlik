import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Footer } from '../../shared/layout/footer/footer';
import { NavbarComponent } from '../../shared/layout/navbar/navbar';
import { CommonModule } from '@angular/common';
import {BehaviorSubject, filter, Observable, of, Subject, take} from 'rxjs';
import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  enqueueToast,
  getAdImageUrl,
  getCategoryLabel, getSaveErrorMessage as getSaveErrorMessageFn,
  getSubcategoryLabel, saveAdToasts
} from '../../shared/functions/shared-functions';
import { CurrentUser } from '../../models/current-user.model';
import {Auth} from '../auth/auth';


interface PublicAd {
  id: number;
  user_id: number;
  seller_username?: string;
  category: string;
  subcategory: string;
  brand: string;
  model: string;
  title: string;
  description: string;
  year: number;
  created_at?: string;
  updated_at?: string;
  images?: string[];
}

interface AdSaveResponse {
  message: string;
  saved?: boolean;
  deleted?: boolean;
}

interface AdSavedStatusResponse {
  isSaved: boolean;
}

type ToastType = 'success' | 'error' | 'info';

interface SaveToast {
  id: number;
  message: string;
  type: ToastType;
}

@Component({
  selector: 'app-ad',
  standalone: true,
  imports: [Footer, NavbarComponent, CommonModule],
  templateUrl: './ad.html',
})
export class Ad implements OnInit, OnDestroy {
  currentUser$: Observable<CurrentUser | null> = of(null);
  publicAd$ = new BehaviorSubject<PublicAd | null>(null);
  currentImageIndex = 0;
  saveAdButton$ = new BehaviorSubject<boolean>(true);
  errorMessage$ = new Subject<string>();
  isSaved$ = new BehaviorSubject<boolean>(false);
  isSaving$ = new BehaviorSubject<boolean>(false);
  saveMessage$ = new BehaviorSubject<string>('');
  readonly saveToasts$ = new BehaviorSubject<SaveToast[]>([]);

  private saveMessageTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private toastIdCounter = 0;
  private readonly toastTimers = new Map<number, number>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly auth: Auth,
  ) {}

  ngOnInit(): void {
    this.auth.loadUser();
    this.currentUser$ = this.auth.user$;
    this.currentUser$
      .pipe(
        filter((user): user is CurrentUser => Boolean(user?.id)),
        take(1),
      )

    const adId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(adId) || adId <= 0) {
      this.errorMessage$.next('Neispravan ID oglasa.');
      return;
    }
    this.http.get<PublicAd>(`http://localhost:3000/ad/${adId}`).subscribe({
      next: (ad) => {
        this.publicAd$.next(ad);
        this.currentImageIndex = 0;
        this.checkIfSaved(ad.id);
      },
      error: () => {
        this.errorMessage$.next('Oglas nije pronađen.');
      },
    });
  }

  ngOnDestroy(): void {
    if (this.saveMessageTimeoutId) {
      clearTimeout(this.saveMessageTimeoutId);
    }
    // Clean up any remaining toast timers
    this.toastTimers.forEach((timerId) => clearTimeout(timerId));
    this.toastTimers.clear();
  }




  private checkIfSaved(adId: number): void {
    this.http.get<AdSavedStatusResponse>(`http://localhost:3000/ad/saved/${adId}`).subscribe({
      next: (response) => {
        this.isSaved$.next(response.isSaved);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.isSaved$.next(false);
          return;
        }

        this.isSaved$.next(false);
      },
    });
  }


  async deleteAd(adId: number, userId: number) {
    const request$ = this.http.delete<void>(
      `http://localhost:3000/ad/delete/${adId}`
    );

    request$.subscribe({
      next: () => {
        enqueueToast('Oglas je izbrisan.', 'info');
        this.router.navigate(['/']);
      },
      error: (error: HttpErrorResponse) => {
        enqueueToast(getSaveErrorMessageFn(error), 'error');
      },
    });
  }

  confirmDelete(adId: number): void {
    if (confirm('Jeste li sigurni da želite izbrisati ovaj oglas? Ova radnja se ne može poništiti.')) {
      this.deleteAd(adId, 0); // userId not needed for individual ad deletion
    }
  }



  toggleSaveAd(): void {
    const currentAd = this.publicAd$.value;

    if (!currentAd || this.isSaving$.value || !this.saveAdButton$.value) {
      return;
    }

    this.isSaving$.next(true);
    this.saveMessage$.next('');

    const wasSaved = this.isSaved$.value;

    const request$ = wasSaved
      ? this.http.delete<AdSaveResponse>(`http://localhost:3000/ad/save/${currentAd.id}`)
      : this.http.post<AdSaveResponse>(`http://localhost:3000/ad/save/${currentAd.id}`, {});



    request$.subscribe({
      next: () => {
        this.isSaved$.next(!wasSaved);
        if(!wasSaved){
          this.enqueueToast('Oglas je spremljen.', 'success');
        }
        else {
          this.enqueueToast('Oglas je uklonjen iz spremljenih.', 'info');
        }

        this.isSaving$.next(false);
        this.clearSaveMessageAfterDelay();
      },
      error: (error: HttpErrorResponse) => {
        this.enqueueToast(this.getSaveErrorMessage(error), 'error');
        this.isSaving$.next(false);
        this.clearSaveMessageAfterDelay();
      },
    });
  }



  private enqueueToast(message: string, type: ToastType): void {
    const id = ++this.toastIdCounter;
    this.saveToasts$.next([...this.saveToasts$.value, { id, message, type }]);

    const timerId = window.setTimeout(() => {
      this.dismissToast(id);
    }, 3000);

    this.toastTimers.set(id, timerId);
  }

  private dismissToast(id: number): void {
    const timerId = this.toastTimers.get(id);

    if (timerId) {
      window.clearTimeout(timerId);
      this.toastTimers.delete(id);
    }

    this.saveToasts$.next(this.saveToasts$.value.filter((toast) => toast.id !== id));
  }

  getToastCSS(type: ToastType): string {
    if (type === 'success') {
      return 'bg-[var(--color-navbar)] text-white';
    }

    if (type === 'error') {
      return 'bg-red-600 text-white';
    }

    return 'bg-gray-800 text-white';
  }







  get currentAdImage(): string {
    const images = this.publicAd$.value?.images ?? [];
    return images.length > 0 ? this.getAdImageUrl(images[this.currentImageIndex] ?? images[0]) : this.getAdImageUrl(null);
  }

  hasMultipleImages(): boolean {
    return (this.publicAd$.value?.images?.length ?? 0) > 1;
  }

  previousImage(): void {
    const images = this.publicAd$.value?.images ?? [];

    if (images.length <= 1) {
      return;
    }

    this.currentImageIndex = (this.currentImageIndex - 1 + images.length) % images.length;
  }

  nextImage(): void {
    const images = this.publicAd$.value?.images ?? [];

    if (images.length <= 1) {
      return;
    }

    this.currentImageIndex = (this.currentImageIndex + 1) % images.length;
  }

  getPublisherLabel(ad: PublicAd): string {
    return ad.seller_username?.trim() || 'Nepoznati korisnik';
  }

  sendMessageToSeller(): void {
    const ad = this.publicAd$.value;
    if (!ad) {
      return;
    }

    this.router.navigate(['/my-messages'], {
      queryParams: { adId: ad.id, sellerId: ad.user_id },
    });
  }

  private clearSaveMessageAfterDelay(): void {
    if (this.saveMessageTimeoutId) {
      clearTimeout(this.saveMessageTimeoutId);
    }

    this.saveMessageTimeoutId = setTimeout(() => {
      this.saveMessage$.next('');
    }, 3000);
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (error.status === 401) {
      return 'Morate biti prijavljeni da zapamtite oglas.';
    }

    if (error.status === 400) {
      return 'Neispravan zahtjev. Pokušajte ponovo.';
    }

    return fallback;
  }

  private getSaveErrorMessage(error: HttpErrorResponse): string {
    return this.getErrorMessage(error, 'Greška pri spremanju oglasa. Pokušajte ponovo.');
  }

  protected readonly getAdImageUrl = getAdImageUrl;
  protected readonly getCategoryLabel = getCategoryLabel;
  protected readonly getSubcategoryLabel = getSubcategoryLabel;
  protected readonly saveAdToasts = saveAdToasts;
}
