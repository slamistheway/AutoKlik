import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import type { AppLanguage } from '../../types/translations';
import { LanguagePreferenceService } from '../../functions/shared-functions';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './footer.html',
  styleUrls: []
})


export class Footer implements OnInit {
  currentLanguage$: Observable<AppLanguage> = of('hr');

  constructor(private readonly languagePreference: LanguagePreferenceService) {}

  ngOnInit(): void {
    this.currentLanguage$ = this.languagePreference.language$;
  }

  toggleLanguage(): void {
    this.languagePreference.toggleLanguage();
  }

  getLanguageFlagUrl(language: AppLanguage): string {
    if (language === 'hr') {
      return '/img/croatia_flag.png';
    }

    if (language === 'en') {
      return '/img/united_crakkkerdom_flag.png';
    }

    return '';
  }
}

