import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { PremiumService } from '../../services/premium.service';
import { addIcons } from 'ionicons';
import { closeOutline, heart, mic, map, images, star } from 'ionicons/icons';

@Component({
  selector: 'app-paywall',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-content class="paywall-content" [fullscreen]="true">
      <ion-button (click)="close()" class="absolute-close" fill="clear">
        <ion-icon name="close-outline"></ion-icon>
      </ion-button>

      <div class="paywall-container">
        <div class="hero-icon">
          <ion-icon name="heart"></ion-icon>
        </div>
        
        <h1 class="title">Love App Premium</h1>
        <p class="subtitle">Desbloquea todo el potencial de vuestra relación.</p>

        <div class="features-list">
          <div class="feature-item">
            <div class="icon-box"><ion-icon name="mic"></ion-icon></div>
            <div class="feature-text">
              <h3>Notas de voz y Fotos</h3>
              <p>Comunícate sin límites en el chat.</p>
            </div>
          </div>
          
          <div class="feature-item">
            <div class="icon-box"><ion-icon name="map"></ion-icon></div>
            <div class="feature-text">
              <h3>Mapa Interactivo Completo</h3>
              <p>Ve la ubicación de tu pareja en tiempo real en un mapa detallado.</p>
            </div>
          </div>
          
          <div class="feature-item">
            <div class="icon-box"><ion-icon name="images"></ion-icon></div>
            <div class="feature-text">
              <h3>Álbum Ilimitado</h3>
              <p>Sube tantas fotos como quieras y usa el marco dorado.</p>
            </div>
          </div>

          <div class="feature-item">
            <div class="icon-box"><ion-icon name="star"></ion-icon></div>
            <div class="feature-text">
              <h3>Premium Compartido</h3>
              <p>¡Paga uno, lo disfrutan los dos!</p>
            </div>
          </div>
        </div>

        <div class="packages-container" *ngIf="premiumService.packages$ | async as packages">
          <div *ngFor="let pkg of packages; let i = index" 
               class="package-card" 
               [class.selected]="selectedPackageIndex === i"
               (click)="selectedPackageIndex = i">
            <div class="package-info">
              <span class="package-title">{{ pkg.product?.title || (pkg.packageType === 'ANNUAL' ? 'Anual' : 'Mensual') }}</span>
              <span class="package-savings" *ngIf="pkg.packageType === 'ANNUAL'">¡Ahorra!</span>
            </div>
            <div class="package-price">{{ pkg.product?.priceString || pkg.product?.price }}</div>
          </div>
        </div>
        <p class="trial-text">¡Pruébalo gratis durante 7 días!</p>

        <ion-button expand="block" class="subscribe-btn" (click)="subscribe()">
          Comenzar Prueba Gratis
        </ion-button>

        <div class="footer-links">
          <a (click)="restorePurchases()">Restaurar Compras</a>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .paywall-content {
      --background: linear-gradient(180deg, #fce4ec 0%, #ffffff 100%);
    }

    :host-context(.night-owl-mode) .paywall-content {
      --background: linear-gradient(180deg, #2d1b2e 0%, #121212 100%);
    }

    .absolute-close {
      position: absolute;
      top: env(safe-area-inset-top, 15px);
      right: 15px;
      z-index: 100;
      color: #333;
      --color: #333;
    }
    :host-context(.night-owl-mode) .absolute-close {
      color: #fff;
      --color: #fff;
    }

    .paywall-container {
      padding: 40px 30px 20px 30px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .hero-icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #FF4D6D, #c9184a);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      box-shadow: 0 10px 20px rgba(255, 77, 109, 0.4);
    }

    .hero-icon ion-icon {
      font-size: 40px;
      color: white;
    }

    .title {
      font-size: 28px;
      font-weight: 800;
      color: #1f2937;
      margin: 0 0 10px 0;
      letter-spacing: -0.5px;
    }
    
    :host-context(.night-owl-mode) .title {
      color: #f3f4f6;
    }

    .subtitle {
      font-size: 16px;
      color: #6b7280;
      margin-bottom: 30px;
    }

    .features-list {
      width: 100%;
      text-align: left;
      margin-bottom: 30px;
    }

    .feature-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    .icon-box {
      width: 40px;
      height: 40px;
      background: rgba(255, 77, 109, 0.1);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 15px;
      flex-shrink: 0;
    }

    .icon-box ion-icon {
      color: #FF4D6D;
      font-size: 20px;
    }

    .feature-text h3 {
      font-size: 16px;
      font-weight: 700;
      color: #374151;
      margin: 0 0 4px 0;
    }

    :host-context(.night-owl-mode) .feature-text h3 {
      color: #f3f4f6;
    }

    .feature-text p {
      font-size: 14px;
      color: #6b7280;
      margin: 0;
      line-height: 1.4;
    }

    .packages-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
    }

    .package-card {
      border: 2px solid rgba(255, 77, 109, 0.2);
      border-radius: 16px;
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      background: white;
      transition: all 0.2s ease;
    }

    :host-context(.night-owl-mode) .package-card {
      background: rgba(30,30,30,0.8);
      border-color: #333;
    }

    .package-card.selected {
      border-color: #FF4D6D;
      background: rgba(255, 77, 109, 0.05);
      box-shadow: 0 4px 15px rgba(255, 77, 109, 0.2);
    }

    .package-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .package-title {
      font-weight: 700;
      color: #1f2937;
      font-size: 16px;
    }

    :host-context(.night-owl-mode) .package-title {
      color: #f3f4f6;
    }

    .package-savings {
      font-size: 12px;
      color: #2ecc71;
      font-weight: 700;
      background: rgba(46,204,113,0.1);
      padding: 2px 6px;
      border-radius: 6px;
      margin-top: 4px;
    }

    .package-price {
      font-size: 20px;
      font-weight: 800;
      color: #1f2937;
    }

    :host-context(.night-owl-mode) .package-price {
      color: #f3f4f6;
    }

    .trial-text {
      color: #FF4D6D;
      font-weight: 700;
      margin-bottom: 25px;
      font-size: 15px;
    }

    .subscribe-btn {
      --background: linear-gradient(135deg, #FF4D6D, #c9184a);
      --border-radius: 16px;
      --box-shadow: 0 8px 20px rgba(255, 77, 109, 0.4);
      margin-bottom: 20px;
      height: 56px;
      font-weight: 700;
      font-size: 16px;
      width: 100%;
    }

    .footer-links {
      margin-top: 10px;
    }

    .footer-links a {
      color: #6b7280;
      text-decoration: underline;
      font-size: 14px;
    }
  `]
})
export class PaywallComponent {
  public premiumService = inject(PremiumService);
  private modalCtrl = inject(ModalController);
  
  public selectedPackageIndex = 0;

  constructor() {
    addIcons({ closeOutline, heart, mic, map, images, star });
  }

  close() {
    this.modalCtrl.dismiss();
  }

  async subscribe() {
    const packages = this.premiumService.packages$.value;
    const pkg = packages[this.selectedPackageIndex];
    const success = await this.premiumService.purchasePremium(pkg);
    if (success) {
      this.modalCtrl.dismiss({ success: true });
    }
  }

  async restorePurchases() {
    const success = await this.premiumService.restorePurchases();
    if (success) {
      this.modalCtrl.dismiss({ success: true });
    } else {
      // Mostrar toast de que no se encontraron compras
      alert('No se encontraron compras anteriores para restaurar.');
    }
  }
}
