import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Footer } from '../../../shared/layout/footer/footer';
import { NavbarComponent } from '../../../shared/layout/navbar/navbar';

@Component({
  selector: 'app-ad-posted-successfully',
  standalone: true,
  imports: [Footer, NavbarComponent],
  templateUrl: './ad-posted-successfully.html',
})
export class AdPostedSuccessfully {
  adId: number | null = null;

  constructor(private readonly route: ActivatedRoute) {
    const adId = Number(this.route.snapshot.queryParamMap.get('adId'));
    this.adId = Number.isFinite(adId) && adId > 0 ? adId : null;
  }

  openBuyerView(): void {
    window.open(`/ad/${this.adId}`, '_self', 'noopener,noreferrer');
  }
}
