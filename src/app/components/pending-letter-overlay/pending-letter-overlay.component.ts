import { Component, inject, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DotLottie } from '@lottiefiles/dotlottie-web';
import { PendingLetterService } from '../../services/pending-letter.service';
import { LoveApiService } from '../../services/love-api.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-pending-letter-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="letter-global-overlay" *ngIf="pendingMsg && !isOpened">
      <div class="letter-global-container" (click)="$event.stopPropagation()">

        <!-- Lottie envelope -->
        <div class="lottie-wrapper" (click)="playAndOpen()">
          <canvas #lottieCanvas width="300" height="300"></canvas>
          <div class="tap-hint" [class.fade]="isPlaying">💌 Toca para abrir tu carta</div>
        </div>

      </div>
    </div>

    <!-- Carta abierta -->
    <div class="letter-global-overlay" *ngIf="isOpened">
      <div class="letter-paper-container" (click)="$event.stopPropagation()">
        <div class="paper">
          <h2 class="letter-title">{{ letterData?.title || 'Carta de Amor' }}</h2>
          <p class="letter-subject" *ngIf="letterData?.subject">{{ letterData.subject }}</p>
          <div class="letter-content">{{ letterData?.content }}</div>
        </div>
        <button class="close-btn" (click)="closeOverlay()">Guardar en el corazón ❤️</button>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400..700&display=swap');
    
    .letter-global-overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);
      z-index: 99999; display: flex; justify-content: center; align-items: center;
      animation: fadeIn 0.5s;
    }

    .letter-global-container {
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
      transition: opacity 0.4s; margin-top: 8px;
    }
    .tap-hint.fade { opacity: 0; }

    /* Paper */
    .letter-paper-container {
      width: 92%; max-width: 420px; display: flex; flex-direction: column;
      align-items: center; gap: 24px; animation: slideUp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .paper {
      width: 100%; min-height: 400px; max-height: 70vh; background: #fdfaf6;
      border-radius: 6px; padding: 45px 35px; box-shadow: 0 25px 60px rgba(0,0,0,0.6);
      overflow-y: auto; background-image: repeating-linear-gradient(transparent, transparent 29px, #e1d3c1 30px);
      background-attachment: local;
    }
    .letter-title { font-family: 'Dancing Script', cursive; color: #590D22; text-align: center; margin-top: 0; margin-bottom: 8px; font-size: 2.8rem; font-weight: 700; line-height: 1.1; }
    .letter-subject { font-family: 'Dancing Script', cursive; color: #a4133c; text-align: center; margin: 0 0 24px; font-size: 1.8rem; opacity: 0.9; }
    .letter-content { font-family: 'Dancing Script', cursive; color: #2a0800; font-size: 1.6rem; line-height: 30px; white-space: pre-wrap; font-weight: 500; }

    .close-btn {
      background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; border: none;
      padding: 16px 35px; border-radius: 30px; font-weight: 800; font-size: 1.1rem;
      box-shadow: 0 8px 25px rgba(255,77,109,0.4); cursor: pointer; transition: transform 0.2s; letter-spacing: 0.5px;
    }
    .close-btn:active { transform: scale(0.95); }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(50px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
  `]
})
export class PendingLetterOverlayComponent implements OnInit, OnDestroy, AfterViewInit {
  private pendingLetterService = inject(PendingLetterService);
  private api = inject(LoveApiService);

  @ViewChild('lottieCanvas') lottieCanvas?: ElementRef<HTMLCanvasElement>;

  pendingMsg: any = null;
  isOpened = false;
  isPlaying = false;
  letterData: any = null;

  private lottieInstance?: any;
  private sub?: Subscription;
  private fallback?: any;

  ngOnInit() {
    this.sub = this.pendingLetterService.pendingLetter$.subscribe(msg => {
      this.pendingMsg = msg;
      if (msg) {
        this.letterData = {
          title: msg.meta?.title || 'Carta de Amor',
          subject: msg.meta?.subject || '',
          content: msg.meta?.content || ''
        };
        this.isOpened = false;
        this.isPlaying = false;
        // Init lottie after view updates
        setTimeout(() => this.initLottie(), 100);
      }
    });
  }

  ngAfterViewInit() {
    if (this.pendingMsg) this.initLottie();
  }

  private initLottie() {
    if (!this.lottieCanvas?.nativeElement) return;
    if (this.lottieInstance) { this.lottieInstance.destroy(); }

    this.lottieInstance = new DotLottie({
      canvas: this.lottieCanvas.nativeElement,
      src: 'assets/lottie/Love-letter.lottie',
      loop: false,
      autoplay: false
    });

    this.lottieInstance.addEventListener('complete', () => {
      this.showLetter();
    });
  }

  playAndOpen() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    if (this.lottieInstance) {
      this.lottieInstance.play();
      this.fallback = setTimeout(() => this.showLetter(), 4000);
    } else {
      this.showLetter();
    }
  }

  private showLetter() {
    if (this.fallback) clearTimeout(this.fallback);
    this.isOpened = true;
    // Marcar como abierta en el servidor
    if (this.pendingMsg?.id) {
      const updatedMeta = { ...(this.pendingMsg.meta || {}), opened: true };
      this.api.editMessage(this.pendingMsg.id, this.pendingMsg.mensaje, updatedMeta)
        .catch((e: any) => console.error('Error marking letter as opened:', e));
    }
  }

  closeOverlay() {
    this.pendingLetterService.dismiss();
    this.isOpened = false;
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    if (this.lottieInstance) this.lottieInstance.destroy();
    if (this.fallback) clearTimeout(this.fallback);
  }
}
