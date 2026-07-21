import { Component, Output, EventEmitter, inject, ChangeDetectorRef, ViewChild, ElementRef, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { addIcons } from "ionicons";
import { closeOutline, chevronForward } from "ionicons/icons";
import { LoveApiService } from "../../../services/love-api.service";
import { PremiumService } from "../../../services/premium.service";
import { DotLottie } from '@lottiefiles/dotlottie-web';
import confetti from 'canvas-confetti';

@Component({
  selector: "app-store-modal",
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="overlay" (click)="onOverlayClick($event)">
      <div class="modal-sheet" (click)="$event.stopPropagation()">
        <div class="handle-bar"></div>

        <div class="modal-header">
          <div class="header-icon">🛍️</div>
          <h2 class="header-title">Tienda LoveApp</h2>
          <p class="header-sub">Suscripciones, packs y sorpresas especiales.</p>
          <button class="close-btn" (click)="close.emit()">
            <ion-icon name="close-outline"></ion-icon>
          </button>
        </div>

        <div class="store-content">
          <!-- Premium -->
          <div class="store-card premium-card" (click)="openPaywall.emit(); close.emit()">
            <div class="card-icon">👑</div>
            <div class="card-info">
              <span class="card-title">LoveApp Premium</span>
              <span class="card-desc">{{ (premiumService.isPremium$ | async) ? 'Gestionar tu suscripción actual' : 'Desbloquea todas las funciones sin límites' }}</span>
            </div>
            <div class="card-action">
              {{ (premiumService.isPremium$ | async) ? 'Gestionar' : 'Mejorar' }} <ion-icon name="chevron-forward"></ion-icon>
            </div>
          </div>

          <!-- Revividores -->
          <div class="store-card pack-card" (click)="purchaseRevivalPack()" [class.purchasing]="purchasingRevival">
            <ion-spinner name="crescent" *ngIf="purchasingRevival" class="pack-spinner"></ion-spinner>
            <div class="card-icon" *ngIf="!purchasingRevival">🔥</div>
            <div class="card-info">
              <span class="card-title">3 Revividores de racha</span>
              <span class="card-desc">No caducan · Compartidos con tu pareja</span>
            </div>
            <div class="card-action pack-price">
              1.50 €
            </div>
          </div>

          <!-- Impulso a tu relación -->
          <div class="store-card event-card" (click)="openPremiumEvent.emit(); close.emit()">
            <div class="card-icon">🚀</div>
            <div class="card-info">
              <span class="card-title">Impulsa tu relación</span>
              <span class="card-desc">Notificación sorpresa especial durante 24h</span>
            </div>
            <div class="card-action pack-price">
              0.99 €
            </div>
          </div>

          <ng-container *ngIf="api.inventory$ | async as inv">
            <!-- Regalo Virtual -->
            <div class="store-card" (click)="!inv.gifts && purchaseItem('gifts')" [class.purchasing]="purchasingItem === 'gifts'" [class.purchased]="inv.gifts">
              <ion-spinner name="crescent" *ngIf="purchasingItem === 'gifts'" class="pack-spinner"></ion-spinner>
              <div class="card-icon" *ngIf="purchasingItem !== 'gifts'">🎁</div>
              <div class="card-info">
                <span class="card-title">Regalo Virtual</span>
                <span class="card-desc">Ábrelo para una sorpresa Lottie</span>
              </div>
              <div class="card-action pack-price" *ngIf="!inv.gifts">0.99 €</div>
              <div class="card-action purchased-badge" *ngIf="inv.gifts">Comprado</div>
            </div>

            <!-- Carta de Amor -->
            <div class="store-card" (click)="!inv.letters && purchaseItem('letters')" [class.purchasing]="purchasingItem === 'letters'" [class.purchased]="inv.letters">
              <ion-spinner name="crescent" *ngIf="purchasingItem === 'letters'" class="pack-spinner"></ion-spinner>
              <div class="card-icon" *ngIf="purchasingItem !== 'letters'">💌</div>
              <div class="card-info">
                <span class="card-title">Carta de Amor</span>
                <span class="card-desc">Mensaje romántico a pantalla completa</span>
              </div>
              <div class="card-action pack-price" *ngIf="!inv.letters">0.99 €</div>
              <div class="card-action purchased-badge" *ngIf="inv.letters">Comprado</div>
            </div>

            <!-- Pack Preguntas Picantes -->
            <div class="store-card" (click)="!inv.spicy_pack && purchaseItem('spicy_pack')" [class.purchasing]="purchasingItem === 'spicy_pack'" [class.purchased]="inv.spicy_pack">
              <ion-spinner name="crescent" *ngIf="purchasingItem === 'spicy_pack'" class="pack-spinner"></ion-spinner>
              <div class="card-icon" *ngIf="purchasingItem !== 'spicy_pack'">🌶️</div>
              <div class="card-info">
                <span class="card-title">Pack Preguntas Picantes</span>
                <span class="card-desc">Desbloquea una nueva categoría picante</span>
              </div>
              <div class="card-action pack-price" *ngIf="!inv.spicy_pack">0.99 €</div>
              <div class="card-action purchased-badge" *ngIf="inv.spicy_pack">Comprado</div>
            </div>
          </ng-container>

          <p class="shop-legal">⚠️ Las compras directas no son reembolsables.</p>
        </div>
      </div>

      <!-- Lottie Overlay for Purchases -->
      <div class="lottie-overlay" *ngIf="showLottie">
        <div class="lottie-content" (click)="$event.stopPropagation()">
          <canvas #lottieCanvasStore style="width: 250px; height: 250px;"></canvas>
          <h3 style="color: white; font-weight: 900; font-size: 1.5rem; margin: 10px 0 5px; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">{{lottieTitle}}</h3>
          <button class="lottie-btn" *ngIf="showLottieButton" (click)="closeLottieOverlay()">{{lottieButtonText}}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); z-index: 1000; display: flex; flex-direction: column; justify-content: flex-end; animation: fadeIn 0.3s; }
    .modal-sheet { background: #fdf2f4; width: 100%; border-radius: 30px 30px 0 0; padding: 25px 25px 40px; box-shadow: 0 -10px 40px rgba(0,0,0,0.15); animation: slideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1); position: relative; max-height: 90vh; overflow-y: auto; }
    .handle-bar { width: 50px; height: 6px; background: rgba(0,0,0,0.15); border-radius: 10px; margin: 0 auto 20px; }
    .modal-header { text-align: center; margin-bottom: 25px; position: relative; }
    .header-icon { font-size: 3rem; margin-bottom: 10px; line-height: 1; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.1)); }
    .header-title { margin: 0; font-size: 1.6rem; font-weight: 900; color: #590D22; letter-spacing: -0.5px; }
    .header-sub { margin: 5px 0 0; font-size: 0.95rem; color: #a4133c; font-weight: 500; }
    
    .close-btn { position: absolute; top: -5px; right: -5px; width: 36px; height: 36px; border-radius: 50%; background: white; border: none; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: #590D22; box-shadow: 0 4px 15px rgba(0,0,0,0.08); cursor: pointer; }
    .close-btn:active { transform: scale(0.92); }

    .store-content { display: flex; flex-direction: column; gap: 16px; }

    .store-card { display: flex; align-items: center; gap: 14px; background: white; border-radius: 22px; padding: 18px 20px; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; box-shadow: 0 8px 24px rgba(0,0,0,0.06); position: relative; overflow: hidden; border: 1px solid rgba(0,0,0,0.04); }
    .store-card:active { transform: scale(0.97); box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
    .store-card.purchasing { opacity: 0.7; pointer-events: none; }
    .card-icon { font-size: 2.2rem; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)); }
    .card-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .card-title { font-size: 1.05rem; font-weight: 900; color: #590D22; line-height: 1.1; }
    .card-desc { font-size: 0.8rem; color: #a4133c; font-weight: 600; line-height: 1.2; }
    
    .card-action { display: flex; align-items: center; gap: 4px; font-size: 0.9rem; font-weight: 800; color: #FF4D6D; background: rgba(255, 77, 109, 0.1); padding: 6px 14px; border-radius: 100px; white-space: nowrap; }
    .card-action ion-icon { font-size: 1.1rem; }
    .pack-price { background: #FF4D6D; color: white; border: 1.5px solid rgba(255,255,255,0.4); box-shadow: 0 4px 12px rgba(255, 77, 109, 0.3); }

    .premium-card { background: linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%); border: none; }
    .premium-card .card-title { color: #590D22; }
    .premium-card .card-desc { color: rgba(89, 13, 34, 0.8); }
    .premium-card .card-action { background: white; color: #FF4D6D; box-shadow: 0 4px 12px rgba(255, 77, 109, 0.2); }

    .pack-card { background: linear-gradient(135deg, #590D22, #FF4D6D); border: none; box-shadow: 0 8px 24px rgba(255, 77, 109, 0.35); }
    .pack-card .card-title { color: white; }
    .pack-card .card-desc { color: rgba(255, 255, 255, 0.85); }
    
    .event-card { background: linear-gradient(135deg, #FF4D6D 0%, #c9184a 100%); border: none; box-shadow: 0 8px 24px rgba(255, 77, 109, 0.3); }
    .event-card .card-title { color: white; }
    .event-card .card-desc { color: rgba(255, 255, 255, 0.85); }

    .purchased-badge { background: #4caf50; color: white; border: none; box-shadow: none; opacity: 0.8; }
    .store-card.purchased { opacity: 0.7; pointer-events: none; }

    .pack-spinner { position: absolute; top: 50%; left: 30px; transform: translateY(-50%); width: 28px; height: 28px; color: white; }

    .shop-legal { text-align: center; font-size: 0.75rem; color: #a4133c; margin: 10px 20px 0; font-weight: 600; opacity: 0.8; }

    /* Lottie Overlay */
    .lottie-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 5000; display: flex; flex-direction: column; align-items: center; justify-content: center; animation: fadeIn 0.3s; }
    .lottie-content { text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .lottie-btn { margin-top: 25px; padding: 14px 40px; border-radius: 25px; font-weight: 800; font-size: 1.1rem; color: #590D22; background: white; border: none; cursor: pointer; box-shadow: 0 8px 25px rgba(255,255,255,0.2); transition: transform 0.2s; animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    .lottie-btn:active { transform: scale(0.95); }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
    @keyframes popIn { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
  `]
})
export class StoreModalComponent implements OnDestroy {
  @Output() close = new EventEmitter<void>();
  @Output() openPaywall = new EventEmitter<void>();
  @Output() openPremiumEvent = new EventEmitter<void>();

  public api = inject(LoveApiService);
  public premiumService = inject(PremiumService);
  private cdr = inject(ChangeDetectorRef);

  purchasingRevival = false;
  purchasingItem: string | null = null;

  // Lottie logic
  showLottie = false;
  lottieTitle = '';
  showLottieButton = false;
  lottieButtonText = 'Aceptar';
  private lottieResolve: ((value: void | PromiseLike<void>) => void) | null = null;
  @ViewChild('lottieCanvasStore') lottieCanvasStore?: ElementRef<HTMLCanvasElement>;
  private dotLottieInstance?: DotLottie;

  constructor() {
    addIcons({ closeOutline, chevronForward });
  }

  ngOnDestroy() {
    if (this.dotLottieInstance) {
      this.dotLottieInstance.destroy();
      this.dotLottieInstance = undefined;
    }
  }

  onOverlayClick(e: Event) {
    if ((e.target as HTMLElement).classList.contains('overlay') && !this.showLottie) {
      this.close.emit();
    }
  }

  closeLottieOverlay() {
    this.showLottie = false;
    if (this.dotLottieInstance) {
      this.dotLottieInstance.destroy();
      this.dotLottieInstance = undefined;
    }
    if (this.lottieResolve) {
      this.lottieResolve();
      this.lottieResolve = null;
    }
  }

  playLottieAnimation(src: string, title: string, btnText: string = 'Aceptar'): Promise<void> {
    this.lottieTitle = title;
    this.lottieButtonText = btnText;
    this.showLottieButton = false;
    this.showLottie = true;
    this.cdr.detectChanges();

    return new Promise((resolve) => {
      this.lottieResolve = resolve;
      
      setTimeout(() => {
        if (this.dotLottieInstance) {
          this.dotLottieInstance.destroy();
        }
        
        if (this.lottieCanvasStore?.nativeElement) {
          this.dotLottieInstance = new DotLottie({
            autoplay: true,
            loop: false,
            canvas: this.lottieCanvasStore.nativeElement,
            src: src
          });
          
          this.dotLottieInstance.addEventListener('complete', () => {
            this.showLottieButton = true;
            this.cdr.detectChanges();
          });
        }
      }, 50);
    });
  }

  fireConfetti() {
    const duration = 2500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FF4D6D', '#ffeb3b', '#4cc9f0']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FF4D6D', '#ffeb3b', '#4cc9f0']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }

  async purchaseRevivalPack() {
    if (this.purchasingRevival) return;
    this.purchasingRevival = true;
    try {
      const res = await this.api.purchaseRevivalPack();
      this.fireConfetti();
      await this.playLottieAnimation('assets/lottie/Payment Success.lottie', '¡Pack Comprado!', 'Genial');
      this.cdr.detectChanges();
      this.close.emit();
    } catch (e: any) {
      await this.playLottieAnimation('assets/lottie/Payment Failed.lottie', 'Error en la compra.', 'Volver');
    } finally {
      this.purchasingRevival = false;
    }
  }

  async purchaseItem(item: string) {
    if (this.purchasingItem) return;
    this.purchasingItem = item;
    try {
      const res = await this.api.storePurchase(item);
      this.api.inventory$.next(res.inventory);
      this.fireConfetti();
      await this.playLottieAnimation('assets/lottie/Payment Success.lottie', '¡Desbloqueado!', 'Genial');
      this.cdr.detectChanges();
    } catch (e: any) {
      await this.playLottieAnimation('assets/lottie/Payment Failed.lottie', 'Error en la compra.', 'Volver');
    } finally {
      this.purchasingItem = null;
    }
  }
}
