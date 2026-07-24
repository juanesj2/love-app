import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, gift, mail, lockClosed, chevronUp, chevronDown } from 'ionicons/icons';
import { LoveApiService } from '../../../services/love-api.service';
import { GiftViewerComponent } from '../../../components/gift-viewer/gift-viewer.component';
import { InteractiveLetterComponent } from '../../../components/interactive-letter/interactive-letter.component';

@Component({
  selector: 'app-inventory-modal',
  standalone: true,
  imports: [CommonModule, IonIcon, GiftViewerComponent, InteractiveLetterComponent],
  template: `
    <div class="overlay" (click)="close.emit()">
      <div class="modal-sheet" (click)="$event.stopPropagation()">
        <button class="close-btn" (click)="close.emit()">
          <ion-icon name="close-outline"></ion-icon>
        </button>
        
        <div class="modal-header">
          <div class="header-icon">🎒</div>
          <h2 class="header-title">Mis Cosas</h2>
          <p class="header-sub">Tu inventario de regalos y cartas.</p>
        </div>

        <div class="inventory-content" *ngIf="api.inventory$ | async as inv">
          <!-- Regalo para enviar -->
          <div class="inv-item" style="align-items: flex-start;">
            <div class="inv-icon"><ion-icon name="gift"></ion-icon></div>
            <div class="inv-details" style="flex: 1;">
              <h4>Regalo Virtual 3D</h4>
              <div *ngIf="getTotalGifts(inv) > 0" class="gift-counters" style="margin-top: 5px;">
                <p *ngIf="(inv.gift_teddy || 0) + (inv.gifts || 0) > 0">🧸 Oso de Peluche: <strong>{{ (inv.gift_teddy || 0) + (inv.gifts || 0) }}</strong></p>
                <p *ngIf="inv.gift_rose > 0">🌹 Rosa 3D: <strong>{{ inv.gift_rose }}</strong></p>
                <p *ngIf="inv.gift_ring > 0">💍 Anillo Doji: <strong>{{ inv.gift_ring }}</strong></p>
                <p style="margin-top: 5px; font-size: 0.8rem;"><i>Disponibles para enviar desde el chat</i></p>
              </div>
              <p *ngIf="getTotalGifts(inv) === 0" class="locked">No tienes regalos.</p>
            </div>
          </div>

          <!-- Regalos Recibidos -->
          <div class="inv-item" (click)="toggleReceivedGifts()" style="cursor: pointer; position: relative;">
            <div class="inv-icon"><ion-icon name="gift" style="color: #FFB703;"></ion-icon></div>
            <div class="inv-details">
              <h4>Mis Regalos Recibidos</h4>
              <p *ngIf="!inv.received_gifts || inv.received_gifts.length === 0" class="locked">Aún no has recibido regalos.</p>
              <p *ngIf="inv.received_gifts?.length > 0">{{inv.received_gifts.length}} regalo(s) en tu estantería</p>
            </div>
            <ion-icon *ngIf="inv.received_gifts?.length > 0" [name]="showReceivedGifts ? 'chevron-up' : 'chevron-down'" style="position: absolute; right: 15px; font-size: 1.2rem; color: #888;"></ion-icon>
          </div>

          <!-- Estantería de Regalos Recibidos -->
          <div class="gifts-grid" *ngIf="inv.received_gifts && inv.received_gifts.length > 0 && showReceivedGifts">
            <div class="gift-card" *ngFor="let gift of inv.received_gifts" (click)="openGift(gift, true)">
              <div class="g-icon">
                <img class="inv-gift-img" [src]="getGiftImageUrl(gift)" alt="gift" />
              </div>
              <div class="g-msg" *ngIf="gift.meta?.message">"{{ gift.meta.message }}"</div>
              <div class="g-msg" *ngIf="!gift.meta?.message">Un regalo especial</div>
              <div class="g-date" style="margin-top: 5px;">
                {{ gift.created_at | date:'shortDate' }}
                <br>
                <span [style.color]="gift.meta?.opened ? '#4CAF50' : '#FF9800'" style="font-weight: bold; font-size: 0.6rem;">
                  {{ gift.meta?.opened ? 'Abierto ✓' : '¡Nuevo! 🎁' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Regalos Enviados -->
          <div class="inv-item" (click)="toggleSentGifts()" style="cursor: pointer; position: relative;">
            <div class="inv-icon"><ion-icon name="gift" style="color: #4CC9F0; background: rgba(76, 201, 240, 0.1); border-radius: 12px; padding: 10px;"></ion-icon></div>
            <div class="inv-details">
              <h4>Mis Regalos Enviados</h4>
              <p *ngIf="!inv.sent_gifts || inv.sent_gifts.length === 0" class="locked">Aún no has enviado regalos.</p>
              <p *ngIf="inv.sent_gifts?.length > 0">{{inv.sent_gifts.length}} regalo(s) enviados</p>
            </div>
            <ion-icon *ngIf="inv.sent_gifts?.length > 0" [name]="showSentGifts ? 'chevron-up' : 'chevron-down'" style="position: absolute; right: 15px; font-size: 1.2rem; color: #888;"></ion-icon>
          </div>

          <!-- Lista de Regalos Enviados -->
          <div class="gifts-grid" *ngIf="inv.sent_gifts && inv.sent_gifts.length > 0 && showSentGifts">
            <div class="gift-card" *ngFor="let gift of inv.sent_gifts" (click)="openGift(gift, false)">
              <div class="g-icon" [style.opacity]="gift.meta?.opened ? '1' : '0.5'">
                <img class="inv-gift-img" [src]="getGiftImageUrl(gift)" alt="gift" />
              </div>
              <div class="g-msg" *ngIf="gift.meta?.message">"{{ gift.meta.message }}"</div>
              <div class="g-msg" *ngIf="!gift.meta?.message">Un regalo especial</div>
              <div class="g-date" style="margin-top: 5px;">
                {{ gift.created_at | date:'shortDate' }}
                <br>
                <span [style.color]="gift.meta?.opened ? '#4CAF50' : '#FF9800'" style="font-weight: bold; font-size: 0.6rem;">
                  {{ gift.meta?.opened ? 'Abierto ✓' : 'Aún cerrado 🔒' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Cartas -->
          <div class="inv-item" (click)="toggleLetters()" style="cursor: pointer; position: relative;">
            <div class="inv-icon"><ion-icon name="mail"></ion-icon></div>
            <div class="inv-details">
              <h4>Cartas de Amor</h4>
              <p *ngIf="!inv.letters || inv.letters.length === 0" class="locked">No tienes cartas guardadas.</p>
              <p *ngIf="inv.letters?.length > 0">{{inv.letters.length}} carta(s) lista(s)</p>
            </div>
            <ion-icon *ngIf="inv.letters?.length > 0" [name]="showLetters ? 'chevron-up' : 'chevron-down'" style="position: absolute; right: 15px; font-size: 1.2rem; color: #888;"></ion-icon>
          </div>
          
          <div class="letters-list" *ngIf="inv.letters && inv.letters.length > 0 && showLetters">
            <div class="letter-card" *ngFor="let letter of inv.letters" (click)="openLetter(letter)" style="cursor: pointer;">
              <div class="l-title">{{letter.title}}</div>
              <div class="l-subj">{{letter.subject}}</div>
              <div class="l-date">{{letter.created_at | date:'shortDate'}}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para ver el Regalo -->
    <div class="overlay" *ngIf="viewingGift" (click)="closeGiftView()" style="z-index: 10001; background: rgba(0,0,0,0.8);">
      <div class="modal-sheet" style="background: transparent; box-shadow: none; padding: 0; text-align: center;" (click)="$event.stopPropagation()">
        <button class="close-btn" style="top: -40px; right: 0;" (click)="closeGiftView()">
          <ion-icon name="close-outline"></ion-icon>
        </button>
        
        <h2 style="color: white; font-family: 'Outfit', sans-serif; margin-bottom: 5px; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">
          {{ selectedGift?.isReceived ? 'Te han regalado' : 'Enviaste' }} un {{ getGiftName(selectedGift?.meta?.giftType || selectedGift?.meta?.gift_type) }}
        </h2>
        <p style="color: #FFb3c6; margin: 0 0 15px; font-style: italic;">
          {{ selectedGift?.created_at | date:'mediumDate' }}
        </p>

        <div style="background: rgba(255,255,255,0.1); border-radius: 20px; padding: 20px; backdrop-filter: blur(10px);">
          <h3 style="color: #590D22; margin-top: 0;">{{ getGiftName(selectedGift.meta?.giftType || selectedGift.meta?.gift_type) }}</h3>
          
          <app-gift-viewer [giftType]="selectedGift.meta?.giftType || selectedGift.meta?.gift_type" [height]="'300px'"></app-gift-viewer>

          <div *ngIf="selectedGift?.meta?.message" style="background: rgba(255,255,255,0.9); padding: 15px; border-radius: 12px; color: #590D22; font-style: italic; font-weight: 500;">
            "{{ selectedGift.meta.message }}"
          </div>
        </div>
      </div>
    </div>
    
    <!-- Componente para visualizar la carta de manera independiente -->
    <app-interactive-letter
      *ngIf="showInteractiveLetter"
      [letterData]="interactiveLetterData"
      [forceOpen]="true"
      (close)="showInteractiveLetter = false"
      style="z-index: 10005; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;">
    </app-interactive-letter>
  `,
  styles: [`
    .overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); z-index: 10000; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; animation: fadeIn 0.3s; }
    .modal-sheet { background: #fdf2f4; width: 100%; max-width: 400px; border-radius: 30px; padding: 25px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); animation: slideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1); position: relative; max-height: 80vh; overflow-y: auto; }
    .close-btn { position: absolute; top: 15px; right: 15px; width: 36px; height: 36px; border-radius: 50%; background: white; border: none; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: #590D22; box-shadow: 0 4px 15px rgba(0,0,0,0.08); cursor: pointer; z-index: 100; }
    .modal-header { text-align: center; margin-bottom: 20px; }
    .header-icon { font-size: 3.5rem; margin-bottom: 10px; animation: bounce 2s infinite; }
    .header-title { color: #590D22; margin: 0 0 5px; font-size: 1.5rem; font-weight: 800; font-family: 'Outfit', sans-serif; }
    .header-sub { color: #A4133C; margin: 0; font-size: 0.95rem; opacity: 0.8; }
    
    .inv-item { display: flex; align-items: center; gap: 15px; background: white; padding: 15px; border-radius: 15px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .inv-icon { font-size: 2rem; color: #FF4D6D; background: #fff0f3; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 12px; }
    .inv-details h4 { margin: 0 0 5px; color: #590D22; font-family: 'Outfit', sans-serif; font-size: 1.1rem; }
    .inv-details p { margin: 0; color: #A4133C; font-size: 0.85rem; font-weight: 500; }
    .inv-details p.locked { color: #888; font-weight: 400; }
    
    .gifts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; }
    .gift-card { background: white; padding: 15px 10px; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .g-icon { margin-bottom: 5px; }
    .inv-gift-img { width: 50px; height: 50px; object-fit: contain; }
    .g-msg { font-size: 0.8rem; color: #590D22; font-style: italic; margin-bottom: 5px; font-weight: 500; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .g-date { font-size: 0.65rem; color: #999; }

    .letters-list { display: flex; flex-direction: column; gap: 10px; padding-left: 10px; border-left: 2px solid #FF4D6D; margin-left: 20px; margin-bottom: 20px; }
    .letter-card { background: white; padding: 10px 15px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
    .l-title { font-weight: bold; color: #590D22; font-size: 0.95rem; }
    .l-subj { color: #FF4D6D; font-size: 0.8rem; margin: 2px 0; }
    .l-date { color: #999; font-size: 0.7rem; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-10px); } 60% { transform: translateY(-5px); } }
  `]
})
export class InventoryModalComponent {
  @Output() close = new EventEmitter<void>();
  public api = inject(LoveApiService);
  public showLetters = false;
  public showReceivedGifts = true;
  public showSentGifts = false;

  public viewingGift: any = null;
  public selectedGift: any = null;

  showInteractiveLetter = false;
  interactiveLetterData: any = null;

  constructor() {
    addIcons({ closeOutline, gift, mail, lockClosed, chevronUp, chevronDown });
  }

  toggleLetters() {
    this.showLetters = !this.showLetters;
  }

  toggleReceivedGifts() {
    this.showReceivedGifts = !this.showReceivedGifts;
  }

  toggleSentGifts() {
    this.showSentGifts = !this.showSentGifts;
  }

  getTotalGifts(inv: any): number {
    return (inv?.gift_teddy || 0) + (inv?.gift_rose || 0) + (inv?.gift_ring || 0) + (inv?.gifts || 0);
  }

  getGiftImageUrl(msg: any): string {
    if (!msg.meta?.opened) {
      return 'assets/gifts/box.png';
    }
    const type = msg.meta?.giftType || msg.meta?.gift_type;
    if (type === 'teddy') return 'assets/gifts/teddy.png';
    if (type === 'rose') return 'assets/gifts/rose.png';
    if (type === 'ring') return 'assets/gifts/ring.png';
    return 'assets/gifts/box.png';
  }

  getGiftName(type: string): string {
    switch (type) {
      case 'teddy': return 'Oso de Peluche';
      case 'rose': return 'Rosa 3D';
      case 'ring': return 'Anillo Doji';
      default: return 'Regalo Sorpresa';
    }
  }

  openLetter(letter: any) {
    this.interactiveLetterData = {
      title: letter.title || 'Carta de Amor',
      subject: letter.subject || 'Para ti',
      content: letter.content || 'Un mensaje especial'
    };
    this.showInteractiveLetter = true;
  }

  openGift(giftItem: any, isReceived: boolean) {
    this.selectedGift = { ...giftItem, isReceived };
    this.viewingGift = true;
    
    if (isReceived && (!giftItem.meta || !giftItem.meta.opened)) {
      giftItem.meta = giftItem.meta || {};
      giftItem.meta.opened = true;
      const updatedMeta = { ...giftItem.meta, opened: true };
      
      this.api.editMessage(giftItem.id, giftItem.mensaje, updatedMeta).then(() => {
        // Silent update
      }).catch(e => console.error('Error abriendo regalo:', e));
    }
  }

  closeGiftView() {
    this.viewingGift = false;
    setTimeout(() => {
      this.selectedGift = null;
    }, 300);
  }
}
