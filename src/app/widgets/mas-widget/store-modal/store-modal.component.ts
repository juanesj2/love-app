import { Component, Output, EventEmitter, inject, ChangeDetectorRef, ViewChild, ElementRef, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { addIcons } from "ionicons";
import { closeOutline, chevronForward, giftOutline } from "ionicons/icons";
import { LoveApiService } from "../../../services/love-api.service";
import { PremiumService } from "../../../services/premium.service";
import { DotLottie } from '@lottiefiles/dotlottie-web';
import confetti from 'canvas-confetti';
import { LetterFormModalComponent } from '../../../components/letter-form-modal/letter-form-modal.component';
import { GiftViewerComponent } from '../../../components/gift-viewer/gift-viewer.component';

@Component({
  selector: "app-store-modal",
  standalone: true,
  imports: [CommonModule, IonicModule, LetterFormModalComponent, GiftViewerComponent],
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
          <!-- Carrusel de Ofertas Especiales -->
          <div class="offers-carousel" #carousel (touchstart)="stopAutoScroll()" (touchend)="startAutoScroll()" (mouseenter)="stopAutoScroll()" (mouseleave)="startAutoScroll()">
            
            <div class="offer-card" style="background-image: url('assets/images/offers/gifts.png'); background-size: cover; background-position: center;" (click)="openGiftSelectorForBundle()">
              <div class="offer-overlay"></div>
              <div class="offer-content">
                <div class="offer-badge">PACK DESCUENTO</div>
                <h3 class="offer-title">El Trío Perfecto</h3>
                <p class="offer-desc">Llévate el oso, la rosa y el anillo con un precio especial</p>
                <button class="offer-btn">Ver Oferta 2.00€</button>
              </div>
            </div>

            <div class="offer-card" style="background-image: url('assets/images/offers/streak.png'); background-size: cover; background-position: center;" (click)="purchaseRevivalPack()" [class.purchasing]="purchasingRevival">
              <div class="offer-overlay"></div>
              <div class="offer-content">
                <div class="offer-badge">SUPERVIVENCIA</div>
                <h3 class="offer-title">Pack Salva-Rachas</h3>
                <p class="offer-desc">3 Revividores mágicos para que el fuego nunca se apague</p>
                <button class="offer-btn">{{ purchasingRevival ? 'Comprando...' : 'Comprar 1.50€' }}</button>
              </div>
            </div>

            <div class="offer-card" style="background-image: url('assets/images/offers/spicy.png'); background-size: cover; background-position: center;" (click)="openSpicyModal()">
              <div class="offer-overlay"></div>
              <div class="offer-content">
                <div class="offer-badge" style="background: #240046; color: #ff0054;">18+ HOT</div>
                <h3 class="offer-title">Pack Picante</h3>
                <p class="offer-desc">Desbloquea todos los retos y juegos íntimos para subir la temperatura</p>
                <button class="offer-btn" style="color: #ff0054;">Desbloquear 1.99€</button>
              </div>
            </div>

            <div class="offer-card" style="background-image: url('assets/images/offers/premium.png'); background-size: cover; background-position: center;" (click)="openPaywall.emit(); close.emit()">
              <div class="offer-overlay"></div>
              <div class="offer-content">
                <div class="offer-badge" style="background: #ffaa00; color: #590D22;">VIP</div>
                <h3 class="offer-title">Amor Ilimitado</h3>
                <p class="offer-desc">Desbloquea regalos, cartas y revividores ilimitados. Sin barreras.</p>
                <button class="offer-btn" style="background: #ffaa00; color: #590D22;">Mejorar a Premium</button>
              </div>
            </div>

          </div>

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

          <!-- Regalos 3D -->
          <div class="store-card pack-card" style="background: white; border: 1px solid #ffe4eb;" (click)="openGiftSelector()">
            <div class="card-icon">🎁</div>
            <div class="card-info">
              <span class="card-title" style="color: #590D22;">Regalo 3D / Pack</span>
              <span class="card-desc" style="color: #FF4D6D; font-weight: 800; font-size: 0.75rem;">(Tienes: {{ getTotalGifts((api.inventory$ | async) || {}) }})</span>
              <span class="card-desc" style="color: #a4133c;">Elige y envía un modelo 3D sorpresa o un pack con descuento.</span>
            </div>
            <div class="card-action pack-price">
              Desde 0.99 €
            </div>
          </div>

          <!-- Cartas -->
          <div class="store-card pack-card" style="background: white; border: 1px solid #ffe4eb;" (click)="purchaseItem('letters')">
            <div class="card-icon">💌</div>
            <div class="card-info">
              <span class="card-title" style="color: #590D22;">Carta de Amor</span>
              <span class="card-desc" style="color: #a4133c;">Redacta una carta y guárdala para tu pareja</span>
            </div>
            <div class="card-action pack-price">
              0.99 €
            </div>
          </div>
          
          <p class="shop-legal">Las compras en la tienda no son reembolsables. Asegúrate de tener el consentimiento de tu pareja para enviar regalos.</p>
        </div>

        <div class="shop-legal" style="color: white; margin-bottom: 20px;">
          <span style="display: block; font-weight: 800; margin-bottom: 5px;">LoveApp Store Secure Checkout</span>
          Pagos seguros. Cancela cuando quieras.
        </div>
      </div>

      <!-- Gift Selector Modal -->
      <div class="gift-selector-overlay" *ngIf="showGiftSelector" (click)="showGiftSelector = false">
        <div class="gift-selector-sheet" (click)="$event.stopPropagation()">
          <div class="handle-bar"></div>
          <h2 class="header-title" style="text-align: center; margin-bottom: 20px;">Elige un Regalo 3D</h2>
          
          <div class="gift-preview-container" style="background: #fff0f3; border-radius: 20px; margin-bottom: 15px; padding: 10px; box-shadow: inset 0 4px 10px rgba(255,77,109,0.05); min-height: 220px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
            <app-gift-viewer *ngIf="selectedGiftType !== 'bundle'" [giftType]="selectedGiftType" [height]="'220px'" style="width: 100%;"></app-gift-viewer>
            <div *ngIf="selectedGiftType === 'bundle'" style="text-align: center;">
              <div style="font-size: 5rem; line-height: 1.2;">🎁</div>
              <div style="font-size: 1.8rem; margin-top: 10px; font-weight: 900; color: #FF4D6D; text-shadow: 0 2px 10px rgba(255, 77, 109, 0.2);">🧸 + 🌹 + 💍</div>
            </div>
          </div>
          
          <div style="text-align: center; font-size: 1.1rem; color: #590D22; margin-bottom: 15px; font-weight: 800;">
            {{ selectedGiftType === 'teddy' ? 'Oso de Peluche' : selectedGiftType === 'rose' ? 'Rosa 3D' : selectedGiftType === 'ring' ? 'Anillo Doji' : 'Pack x3 (Los Tres Regalos)' }}
          </div>

          <div style="display: flex; gap: 10px; justify-content: center; padding-bottom: 15px;">
            <div (click)="selectedGiftType = 'teddy'" 
                 style="font-size: 2rem; cursor: pointer; padding: 10px 12px; border-radius: 18px; border: 2px solid transparent; transition: 0.2s;" 
                 [style.background]="selectedGiftType === 'teddy' ? '#ffe4eb' : '#f8f9fa'" 
                 [style.borderColor]="selectedGiftType === 'teddy' ? '#ffb3c6' : 'transparent'">
              🧸
            </div>
            <div (click)="selectedGiftType = 'rose'" 
                 style="font-size: 2rem; cursor: pointer; padding: 10px 12px; border-radius: 18px; border: 2px solid transparent; transition: 0.2s;" 
                 [style.background]="selectedGiftType === 'rose' ? '#ffe4eb' : '#f8f9fa'" 
                 [style.borderColor]="selectedGiftType === 'rose' ? '#ffb3c6' : 'transparent'">
              🌹
            </div>
            <div (click)="selectedGiftType = 'ring'" 
                 style="font-size: 2rem; cursor: pointer; padding: 10px 12px; border-radius: 18px; border: 2px solid transparent; transition: 0.2s;" 
                 [style.background]="selectedGiftType === 'ring' ? '#ffe4eb' : '#f8f9fa'" 
                 [style.borderColor]="selectedGiftType === 'ring' ? '#ffb3c6' : 'transparent'">
              💍
            </div>
            <div (click)="selectedGiftType = 'bundle'" 
                 style="font-size: 2rem; cursor: pointer; padding: 10px 12px; border-radius: 18px; border: 2px solid transparent; transition: 0.2s;" 
                 [style.background]="selectedGiftType === 'bundle' ? '#ffe4eb' : '#f8f9fa'" 
                 [style.borderColor]="selectedGiftType === 'bundle' ? '#ffb3c6' : 'transparent'">
              🎁
            </div>
          </div>
          
          <button class="confirm-gift-btn" (click)="purchaseItem('gift_' + selectedGiftType)" [disabled]="purchasingItem === 'gift_' + selectedGiftType">
            <span *ngIf="purchasingItem !== 'gift_' + selectedGiftType">Comprar {{ selectedGiftType === 'bundle' ? 'Pack x3' : 'Regalo' }} por {{ selectedGiftType === 'bundle' ? '2.00' : '0.99' }} €</span>
            <ion-spinner name="crescent" *ngIf="purchasingItem === 'gift_' + selectedGiftType"></ion-spinner>
          </button>
        </div>
      </div>

      <!-- Letter Form Modal -->
      <app-letter-form-modal 
        *ngIf="showLetterForm" 
        (close)="showLetterForm = false" 
        (save)="onLetterSave($event)">
      </app-letter-form-modal>

      <!-- Spicy Modal Overlay -->
      <div class="gift-selector-overlay" *ngIf="showSpicyModal" (click)="showSpicyModal = false">
        <div class="gift-selector-sheet" (click)="$event.stopPropagation()">
          <div class="handle-bar"></div>
          <h2 class="header-title" style="text-align: center; margin-bottom: 20px; color: #ff0054;">Pack Picante 🌶️</h2>
          
          <div style="text-align: center; font-size: 1.1rem; color: #590D22; margin-bottom: 20px; font-weight: 700; line-height: 1.5;">
            Más de 150 preguntas picantes para ti y para tu pareja, para que os conozcáis más a fondo 😏
          </div>
          
          <div style="background: rgba(255, 0, 85, 0.1); border-radius: 15px; padding: 15px; margin-bottom: 25px; text-align: left; display: flex; flex-direction: column; gap: 8px;">
            <span style="color: #590D22; font-weight: bold; font-size: 0.95rem;">🔥 60 Preguntas de Tinder</span>
            <span style="color: #590D22; font-weight: bold; font-size: 0.95rem;">🔥 50 Preguntas Íntimas</span>
            <span style="color: #590D22; font-weight: bold; font-size: 0.95rem;">🔥 50 Retos de Dibujo</span>
          </div>

          <button class="confirm-gift-btn" style="background: #ff0054; margin-top: 0;" (click)="purchaseSpicyPack()" [disabled]="purchasingItem === 'spicy_pack'">
            <span *ngIf="purchasingItem !== 'spicy_pack'">Comprar por 1.99€</span>
            <ion-spinner name="crescent" *ngIf="purchasingItem === 'spicy_pack'"></ion-spinner>
          </button>
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
    .qty-badge { color: #FF4D6D; font-size: 0.85rem; font-weight: 800; margin-left: 5px; }

    .pack-spinner { position: absolute; top: 50%; left: 30px; transform: translateY(-50%); width: 28px; height: 28px; color: white; }

    .shop-legal { text-align: center; font-size: 0.75rem; color: #a4133c; margin: 10px 20px 0; font-weight: 600; opacity: 0.8; }

    /* Offers Carousel */
    .offers-carousel { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 15px; padding-bottom: 5px; margin-bottom: 5px; -webkit-overflow-scrolling: touch; scrollbar-width: none; scroll-behavior: smooth; }
    .offers-carousel::-webkit-scrollbar { display: none; }
    .offer-card { flex: 0 0 85%; scroll-snap-align: center; border-radius: 24px; padding: 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 8px 24px rgba(0,0,0,0.12); position: relative; overflow: hidden; cursor: pointer; transition: transform 0.2s; min-height: 180px; }
    .offer-card:active { transform: scale(0.97); }
    .offer-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%); z-index: 1; }
    .offer-content { flex: 1; display: flex; flex-direction: column; align-items: flex-start; z-index: 2; position: relative; }
    .offer-badge { font-size: 0.65rem; font-weight: 900; background: white; color: #FF4D6D; padding: 4px 8px; border-radius: 8px; letter-spacing: 0.5px; margin-bottom: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .offer-title { font-size: 1.3rem; font-weight: 900; color: white; margin: 0 0 4px; line-height: 1.1; text-shadow: 0 2px 5px rgba(0,0,0,0.8); }
    .offer-desc { font-size: 0.85rem; color: rgba(255,255,255,0.9); margin: 0 0 12px; font-weight: 500; line-height: 1.2; text-shadow: 0 1px 3px rgba(0,0,0,0.8); max-width: 85%; }
    .offer-btn { background: white; color: #FF4D6D; border: none; padding: 8px 16px; border-radius: 12px; font-size: 0.85rem; font-weight: 800; box-shadow: 0 4px 12px rgba(0,0,0,0.1); cursor: pointer; }
    .offer-icon { font-size: 4.5rem; position: absolute; right: -5px; bottom: -10px; line-height: 1; opacity: 0.9; filter: drop-shadow(0 4px 15px rgba(0,0,0,0.2)); transform: rotate(-5deg); z-index: 1; }

    /* Gift Selector */
    .gift-selector-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); z-index: 2000; display: flex; flex-direction: column; justify-content: flex-end; animation: fadeIn 0.2s; }
    .gift-selector-sheet { background: white; width: 100%; border-radius: 30px 30px 0 0; padding: 25px 25px 40px; box-shadow: 0 -10px 40px rgba(0,0,0,0.2); animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1); }
    .gift-options { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 15px; }
    .gift-option { flex: 0 0 120px; background: #fff5f7; border: 2px solid transparent; border-radius: 18px; padding: 10px; text-align: center; cursor: pointer; transition: all 0.2s; }
    .gift-option.selected { border-color: #FF4D6D; background: #ffe3e8; transform: scale(1.05); }
    .gift-name { display: block; font-size: 0.85rem; font-weight: 700; color: #590D22; margin-top: 5px; }
    .confirm-gift-btn { width: 100%; padding: 16px; background: #FF4D6D; color: white; border: none; border-radius: 20px; font-size: 1.1rem; font-weight: 800; margin-top: 10px; box-shadow: 0 8px 20px rgba(255,77,109,0.3); }

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
export class StoreModalComponent implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();
  @Output() openPaywall = new EventEmitter<void>();
  @Output() openPremiumEvent = new EventEmitter<void>();

  public api = inject(LoveApiService);
  public premiumService = inject(PremiumService);
  private cdr = inject(ChangeDetectorRef);

  purchasingRevival = false;
  purchasingItem: string | null = null;

  // Gift selection logic
  showGiftSelector = false;
  selectedGiftType = 'teddy';
  cart: { [key: string]: number } = {
    teddy: 0,
    rose: 0,
    ring: 0,
    bundle: 0
  };

  // Carousel logic
  @ViewChild('carousel') carouselRef?: ElementRef<HTMLDivElement>;
  autoScrollInterval: any;

  // Lottie logic
  showLottie = false;
  lottieTitle = '';
  showLottieButton = false;
  lottieButtonText = 'Aceptar';
  private lottieResolve: ((value: void | PromiseLike<void>) => void) | null = null;
  @ViewChild('lottieCanvasStore') lottieCanvasStore?: ElementRef<HTMLCanvasElement>;
  private dotLottieInstance?: DotLottie;

  showLetterForm = false;
  showSpicyModal = false;

  constructor() {
    addIcons({ closeOutline, chevronForward, giftOutline });
  }

  ngOnInit() {
    document.body.classList.add('hide-footer');
    this.startAutoScroll();
  }

  ngOnDestroy() {
    document.body.classList.remove('hide-footer');
    this.stopAutoScroll();
    if (this.dotLottieInstance) {
      this.dotLottieInstance.destroy();
      this.dotLottieInstance = undefined;
    }
  }

  startAutoScroll() {
    this.autoScrollInterval = setInterval(() => {
      if (!this.carouselRef?.nativeElement) return;
      const el = this.carouselRef.nativeElement;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: el.clientWidth * 0.85 + 15, behavior: 'smooth' });
      }
    }, 4000);
  }

  stopAutoScroll() {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
    }
  }

  onOverlayClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('overlay') && !this.showLottie) {
      this.close.emit();
    }
  }

  getTotalGifts(inv: any): number {
    return (inv.gift_teddy || 0) + (inv.gift_rose || 0) + (inv.gift_ring || 0) + (inv.gifts || 0);
  }

  openGiftSelector() {
    this.selectedGiftType = 'teddy';
    this.cart = { teddy: 0, rose: 0, ring: 0, bundle: 0 };
    this.showGiftSelector = true;
  }

  openGiftSelectorForBundle() {
    this.selectedGiftType = 'bundle';
    this.cart = { teddy: 0, rose: 0, ring: 0, bundle: 1 };
    this.showGiftSelector = true;
  }

  incrementCart() {
    this.cart[this.selectedGiftType]++;
  }

  decrementCart() {
    if (this.cart[this.selectedGiftType] > 0) {
      this.cart[this.selectedGiftType]--;
    }
  }

  getCartTotal() {
    return (this.cart['teddy'] * 0.99) + (this.cart['rose'] * 0.99) + (this.cart['ring'] * 0.99) + (this.cart['bundle'] * 2.00);
  }

  purchaseGift() {
    this.showGiftSelector = false;
    
    // Construct cart payload for the backend
    const cartItems = [];
    if (this.cart['bundle'] > 0) {
      cartItems.push({ item: 'bundle', quantity: this.cart['bundle'] });
    }
    ['teddy', 'rose', 'ring'].forEach(type => {
      if (this.cart[type] > 0) {
        cartItems.push({ item: 'gifts', gift_type: type, quantity: this.cart[type] });
      }
    });

    if (cartItems.length > 0) {
      this.purchaseItem('cart', { cart: cartItems });
    }
  }

  openSpicyModal() {
    this.showSpicyModal = true;
  }

  purchaseSpicyPack() {
    this.showSpicyModal = false;
    this.purchaseItem('spicy_pack');
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

  async purchaseItem(item: string, data?: any) {
    if (this.purchasingItem) return;
    
    if (item === 'letters') {
      this.showLetterForm = true;
      return;
    }

    await this.processPurchase(item, data);
  }

  async onLetterSave(data: {title: string, subject: string, content: string}) {
    this.showLetterForm = false;
    await this.processPurchase('letters', data);
  }

  private async processPurchase(item: string, data?: any) {
    this.purchasingItem = item;
    try {
      // 1. Cobrar usando RevenueCat
      const purchaseRes = await this.premiumService.purchaseConsumable(item);
      
      if (!purchaseRes.success) {
        if (!purchaseRes.error?.userCancelled) {
           await this.playLottieAnimation('assets/lottie/Payment Failed.lottie', 'Error en la compra.', 'Volver');
        }
        return;
      }

      // 2. Registrar en backend y actualizar inventario local
      let body: any = { item };
      if (data) {
        body = { ...body, ...data };
      }
      const res = await this.api.storePurchase(body);
      this.api.inventory$.next(res.inventory);
      
      // 3. Celebrar
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
