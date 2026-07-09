import { Component, inject, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';
import { PremiumService } from '../../services/premium.service';
import { addIcons } from 'ionicons';
import { closeOutline, heart, mic, map, images, star } from 'ionicons/icons';
import { DotLottie } from '@lottiefiles/dotlottie-web';
import confetti from 'canvas-confetti';

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
          <img src="assets/icons/icon-512.webp" alt="Love App" />
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
        <p class="trial-text" *ngIf="!(premiumService.isPremium$ | async)">¡Pruébalo gratis durante 7 días!</p>

        <ion-button expand="block" class="subscribe-btn" (click)="subscribe()" [disabled]="isLoading">
          <ng-container *ngIf="!isLoading">
            {{ (premiumService.isPremium$ | async) ? 'Suscripción Activa' : 'Comenzar Prueba Gratis' }}
          </ng-container>
          <ng-container *ngIf="isLoading">
            Procesando...
          </ng-container>
        </ion-button>

        <div class="footer-links">
          <a (click)="restorePurchases()">Restaurar Compras</a>
        </div>
      </div>

      <!-- Lottie Overlay -->
      <div class="lottie-overlay" *ngIf="showLottie">
        <div class="lottie-content">
          <canvas #lottieCanvas width="300" height="300"></canvas>
          <h2 class="lottie-message">{{ lottieMessage }}</h2>
          <ion-button *ngIf="showLottieButton" expand="block" class="lottie-btn" (click)="closeLottieOverlay()">{{ lottieButtonText }}</ion-button>
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
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }

    .hero-icon img {
      width: 100%;
      height: 100%;
      object-fit: contain;
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

    .lottie-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); z-index: 5000; display: flex; flex-direction: column; align-items: center; justify-content: center; animation: fadeIn 0.3s; }
    .lottie-content { text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .lottie-content canvas { width: 300px; height: 300px; max-width: 90vw; margin-bottom: 20px; }
    .lottie-message { color: white; font-size: 1.5rem; font-weight: 800; text-shadow: 0 4px 10px rgba(0,0,0,0.5); max-width: 80%; line-height: 1.3; animation: slideUpPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); margin-bottom: 20px; }
    .lottie-btn { --background: linear-gradient(135deg, #FF4D6D, #c9184a); --border-radius: 14px; font-weight: 700; width: 200px; animation: slideUpPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUpPop { 0% { transform: translateY(30px) scale(0.9); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
  `]
})
export class PaywallComponent {
  public premiumService = inject(PremiumService);
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);
  private cdr = inject(ChangeDetectorRef);
  
  public selectedPackageIndex = 0;
  public isLoading = false;

  public showLottie = false;
  public lottieMessage = '';
  public showLottieButton = false;
  public lottieButtonText = 'Aceptar';
  private lottieResolve: ((value: void | PromiseLike<void>) => void) | null = null;
  
  @ViewChild('lottieCanvas') lottieCanvas?: ElementRef<HTMLCanvasElement>;
  private dotLottieInstance: DotLottie | null = null;

  constructor() {
    addIcons({ closeOutline, heart, mic, map, images, star });
  }

  close() {
    this.modalCtrl.dismiss();
  }

  async subscribe() {
    if (this.isLoading) return;
    const isAlreadyPremium = this.premiumService.isPremium$.value;
    if (isAlreadyPremium) {
      this.close();
      return;
    }

    const packages = this.premiumService.packages$.value;
    const pkg = packages && packages.length > 0 ? packages[this.selectedPackageIndex] : null;
    
    this.isLoading = true;
    try {
      const result = await this.premiumService.purchasePremium(pkg);
      if (result.success) {
        this.fireConfetti();
        await this.playLottieAnimation('assets/lottie/Payment Success.lottie', '¡Bienvenido a Premium!', '¡A disfrutar!');
        this.modalCtrl.dismiss({ success: true });
      } else {
        // Ignoramos si el usuario simplemente canceló la ventana de Google Play (código 1)
        if (result.error && result.error.code !== 1 && !result.error.userCancelled) {
           await this.playLottieAnimation('assets/lottie/Payment Failed.lottie', 'Error en la compra. Revisa tu conexión.', 'Volver');
        }
      }
    } finally {
      this.isLoading = false;
    }
  }

  async restorePurchases() {
    this.isLoading = true;
    try {
      const success = await this.premiumService.restorePurchases();
      if (success) {
        this.fireConfetti();
        await this.playLottieAnimation('assets/lottie/Payment Success.lottie', '¡Compras Restauradas!', '¡Genial!');
        this.modalCtrl.dismiss({ success: true });
      } else {
        await this.playLottieAnimation('assets/lottie/Payment Failed.lottie', 'No hemos encontrado compras previas.', 'Volver');
      }
    } finally {
      this.isLoading = false;
    }
  }

  private fireConfetti() {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#FF4D6D', '#ffb703', '#2ecc71', '#ffffff'],
      zIndex: 5001 // Ensure it's above the lottie overlay (5000)
    });
  }

  private async playLottieAnimation(src: string, message: string, buttonText: string): Promise<void> {
    this.lottieMessage = message;
    this.lottieButtonText = buttonText;
    this.showLottie = true;
    this.showLottieButton = false;
    this.cdr.detectChanges(); // Force redraw

    return new Promise((resolve) => {
      this.lottieResolve = resolve;
      
      setTimeout(() => {
        if (this.dotLottieInstance) {
          this.dotLottieInstance.destroy();
        }
        
        if (this.lottieCanvas?.nativeElement) {
          this.dotLottieInstance = new DotLottie({
            canvas: this.lottieCanvas.nativeElement,
            src: src,
            loop: false,
            autoplay: true
          });

          // Show button after 2 seconds
          setTimeout(() => {
            this.showLottieButton = true;
            this.cdr.detectChanges();
          }, 2000);
        }
      }, 50);
    });
  }

  closeLottieOverlay() {
    this.showLottie = false;
    if (this.dotLottieInstance) {
      this.dotLottieInstance.destroy();
      this.dotLottieInstance = null;
    }
    if (this.lottieResolve) {
      this.lottieResolve();
      this.lottieResolve = null;
    }
  }
}

