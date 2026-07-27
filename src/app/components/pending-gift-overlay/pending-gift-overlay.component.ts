import { Component, inject, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DotLottie } from '@lottiefiles/dotlottie-web';
import { PendingLetterService } from '../../services/pending-letter.service';
import { LoveApiService } from '../../services/love-api.service';
import { Subscription } from 'rxjs';
import { GiftViewerComponent } from '../gift-viewer/gift-viewer.component';
import { FillLetterModalComponent } from '../fill-letter-modal/fill-letter-modal.component';

@Component({
  selector: 'app-pending-gift-overlay',
  standalone: true,
  imports: [CommonModule, FillLetterModalComponent, GiftViewerComponent],
  template: `
    <!-- Fill Letter Modal -->
    <app-fill-letter-modal 
      *ngIf="isFillingLetter" 
      [letterId]="adminGiftLetterId" 
      (close)="closeFillLetter()">
    </app-fill-letter-modal>

    <div class="gift-global-overlay" *ngIf="pendingMsg && !isOpened && !isFillingLetter">
      <div class="gift-global-container" (click)="$event.stopPropagation()">

        <!-- Lottie gift box -->
        <div class="lottie-wrapper" (click)="playAndOpen()">
          <canvas #lottieCanvas width="300" height="300"></canvas>
          <div class="tap-hint" [class.fade]="isPlaying">
            {{ isAdminGift ? '🎁 Te has portado muy bien, un admin te ha hecho un regalo' : '🎁 Toca para abrir tu sorpresa' }}
          </div>
        </div>

      </div>
    </div>

    <!-- Regalo abierto -->
    <div class="gift-global-overlay" *ngIf="isOpened && !isFillingLetter">
      <div class="gift-content-container" (click)="$event.stopPropagation()">
        <div class="gift-box-opened">
          <h2 *ngIf="!isAdminGift">¡Has recibido un regalo virtual!</h2>
          <h2 *ngIf="isAdminGift">¡Regalo del Administrador!</h2>
          
          <ng-container *ngIf="!isAdminGift">
            <app-gift-viewer [giftType]="getGiftType(pendingMsg)" height="250px"></app-gift-viewer>
            <div class="gift-message" *ngIf="pendingMsg?.meta?.message">
              <p class="gift-message-text">"{{ pendingMsg.meta.message }}"</p>
            </div>
          </ng-container>

          <ng-container *ngIf="isAdminGift">
            <img [src]="isAdminGiftLetter ? 'assets/gifts/box.png' : 'assets/gifts/box.png'" alt="admin-gift" style="width: 150px; height: 150px; object-fit: contain;" />
            <div class="gift-message">
              <p class="gift-message-text" style="font-weight: 700; color: #d00000;">Has recibido:<br/> {{ adminGiftText }}</p>
            </div>
          </ng-container>
        </div>
        
        <button class="close-btn action-fill" *ngIf="isAdminGiftLetter" (click)="openFillLetter()">Escribir carta ahora ✍️</button>
        <button class="close-btn" *ngIf="!isAdminGiftLetter" (click)="closeOverlay()">Guardar en el inventario 🎁</button>
      </div>
    </div>
  `,
  styles: [`
    .gift-global-overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);
      z-index: 99999; display: flex; justify-content: center; align-items: center;
      animation: fadeIn 0.5s;
    }

    .gift-global-container {
      display: flex; flex-direction: column; align-items: center; gap: 20px;
    }

    .lottie-wrapper {
      position: relative; display: flex; flex-direction: column;
      align-items: center; cursor: pointer;
    }
    .lottie-wrapper canvas { width: 300px; height: 300px; max-width: 90vw; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.3)); }

    .tap-hint {
      color: white; font-size: 1.2rem; font-weight: 700;
      text-shadow: 0 2px 8px rgba(0,0,0,0.5); letter-spacing: 0.5px;
      transition: opacity 0.4s; margin-top: 8px; text-align: center;
      line-height: 1.5; padding: 0 20px; max-width: 90%;
    }
    .tap-hint.fade { opacity: 0; pointer-events: none; }

    .gift-content-container {
      display: flex; flex-direction: column; align-items: center; gap: 30px;
      animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      width: 90%; max-width: 400px;
    }

    .gift-box-opened {
      background: #fdf2f4; width: 100%; border-radius: 20px;
      padding: 30px 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.4);
      display: flex; flex-direction: column; align-items: center; text-align: center;
    }

    .gift-box-opened h2 {
      margin: 0 0 20px; color: #590D22; font-size: 1.6rem; font-weight: 800;
    }

    .gift-placeholder {
      background: rgba(255, 77, 109, 0.1); border: 2px dashed #FF4D6D;
      border-radius: 15px; width: 100%; padding: 40px 20px;
      display: flex; flex-direction: column; align-items: center; gap: 10px;
    }

    .placeholder-icon {
      font-size: 4rem; animation: float 3s ease-in-out infinite;
    }

    .gift-placeholder p {
      color: #a4133c; font-weight: 600; margin: 0; font-size: 1.1rem;
    }

    .gift-message {
      margin-top: 20px;
      padding: 15px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.05);
      width: 100%;
    }

    .gift-message-text {
      color: #590D22;
      font-size: 1.2rem;
      font-weight: 600;
      font-style: italic;
      margin: 0;
      line-height: 1.4;
    }

    .close-btn {
      padding: 16px 30px; background: #FF4D6D; color: white; border: none;
      border-radius: 30px; font-size: 1.1rem; font-weight: 800;
      cursor: pointer; box-shadow: 0 4px 15px rgba(255, 77, 109, 0.4);
      transition: transform 0.2s, background 0.2s; width: 100%;
    }
    .close-btn:active { transform: scale(0.95); background: #c9184a; }
    
    .action-fill { background: linear-gradient(135deg, #FF4D6D, #ff758f); }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes popIn {
      0% { opacity: 0; transform: scale(0.8) translateY(20px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
      100% { transform: translateY(0px); }
    }
  `]
})
export class PendingGiftOverlayComponent implements OnInit, OnDestroy, AfterViewInit {
  private pendingService = inject(PendingLetterService);
  private api = inject(LoveApiService);

  pendingMsg: any = null;
  isOpened = false;
  isPlaying = false;
  private sub?: Subscription;

  get amISender(): boolean {
    return Number(this.pendingMsg?.user_id) === Number(this.pendingService.myId);
  }

  get isAdminGift(): boolean {
    return this.pendingMsg?.mensaje === '[ADMIN_GIFT]';
  }

  get isAdminGiftLetter(): boolean {
    return this.isAdminGift && 
           (this.pendingMsg?.meta?.gifts?.type === 'letters' || this.pendingMsg?.meta?.gifts?.type === 'letter');
  }

  get adminGiftLetterId(): string {
    return this.pendingMsg?.meta?.gifts?.letter_id || '';
  }

  get adminGiftText(): string {
    if (!this.isAdminGift || !this.pendingMsg?.meta?.gifts) return '';
    const gifts = this.pendingMsg.meta.gifts;
    const amount = gifts.amount || 1;
    if (gifts.type === 'all') {
      return `${amount} rosa(s), ${amount} anillo(s) y ${amount} oso(s)`;
    } else {
      const typeName = gifts.type === 'rose' ? 'rosa(s)' : 
                       gifts.type === 'ring' ? 'anillo(s)' : 
                       (gifts.type === 'letters' || gifts.type === 'letter') ? 'carta(s) en blanco' : 'oso(s)';
      return `${amount} ${typeName}`;
    }
  }

  isFillingLetter = false;

  openFillLetter() {
    this.isFillingLetter = true;
  }

  closeFillLetter() {
    this.isFillingLetter = false;
    this.closeOverlay();
  }

  getGiftImageUrl(msg: any): string {
    if (!msg?.meta?.opened) {
      return 'assets/gifts/box.png';
    }
    const type = msg.meta?.giftType || msg.meta?.gift_type;
    if (type === 'teddy') return 'assets/gifts/teddy.png';
    if (type === 'rose') return 'assets/gifts/rose.png';
    if (type === 'ring') return 'assets/gifts/ring.png';
    return 'assets/gifts/box.png';
  }

  getGiftType(msg: any): string {
    return msg?.meta?.giftType || msg?.meta?.gift_type || 'teddy';
  }

  @ViewChild('lottieCanvas') lottieCanvas?: ElementRef<HTMLCanvasElement>;
  private dotLottieInstance?: DotLottie;

  ngOnInit() {
    this.sub = this.pendingService.pendingGift$.subscribe(msg => {
      this.pendingMsg = msg;
      this.isOpened = false;
      this.isPlaying = false;
      
      if (this.pendingMsg && !this.isOpened) {
        setTimeout(() => this.initLottie(), 100);
      }
    });
  }

  ngAfterViewInit() {
    if (this.pendingMsg && !this.isOpened) {
      this.initLottie();
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.cleanupLottie();
  }

  private initLottie() {
    this.cleanupLottie();
    if (this.lottieCanvas?.nativeElement) {
      this.dotLottieInstance = new DotLottie({
        autoplay: true,
        loop: false,
        canvas: this.lottieCanvas.nativeElement,
        src: this.isAdminGift ? 'assets/lottie/Admin_giftt.lottie' : 'assets/lottie/gift-box.lottie'
      });
    }
  }

  private cleanupLottie() {
    if (this.dotLottieInstance) {
      this.dotLottieInstance.destroy();
      this.dotLottieInstance = undefined;
    }
  }

  playAndOpen() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    if (this.dotLottieInstance && !this.isAdminGift) {
       this.dotLottieInstance.play();
    }

    setTimeout(() => {
      this.isOpened = true;
      this.cleanupLottie();
      this.markAsOpened();
    }, 1500);
  }

  private async markAsOpened() {
    if (!this.pendingMsg) return;
    try {
      const msgId = this.pendingMsg.id;
      const meta = this.pendingMsg.meta || {};
      meta.opened = true;
      await this.api.editMessage(msgId, this.pendingMsg.mensaje, meta);
    } catch (error) {
      console.error('[PendingGiftOverlay] Error marcando regalo como abierto', error);
    }
  }

  closeOverlay() {
    this.pendingService.dismiss('gift');
    this.isOpened = false;
    this.pendingMsg = null;
    this.isPlaying = false;
  }
}
