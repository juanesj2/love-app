import { DotLottie } from '@lottiefiles/dotlottie-web';
import { Component, EventEmitter, Output, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-interactive-letter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overlay">
      <!-- Overlay blur para el fondo -->
      
      <div class="letter-container" (click)="$event.stopPropagation()">
        
        <!-- Estado 1: Cerrada (Lottie) -->
        <div class="lottie-envelope" *ngIf="!isOpened" (click)="playLottie()">
          <canvas #lottieCanvas width="300" height="300"></canvas>
          <div class="instruction-text" [class.fade]="isOpening">Toca para abrir</div>
        </div>

        <!-- Estado 2: Abierta (Contenido de la carta) -->
        <div class="opened-letter" *ngIf="isOpened">
          <div class="paper">
            <h2 class="letter-title">{{ letterData?.title || 'Carta de Amor' }}</h2>
            <p class="letter-subject" *ngIf="letterData?.subject">{{ letterData.subject }}</p>
            <div class="letter-content">
              {{ letterData?.content }}
            </div>
          </div>
          <button class="close-btn" (click)="close.emit()">Guardar en el corazón</button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400..700&display=swap');
    
    .overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); z-index: 10000; display: flex; justify-content: center; align-items: center; animation: fadeIn 0.4s; overflow: hidden; }
    
    .letter-container { position: relative; width: 92%; max-width: 420px; display: flex; justify-content: center; align-items: center; perspective: 1000px; }
    
    .lottie-envelope { position: relative; display: flex; justify-content: center; align-items: center; flex-direction: column; cursor: pointer; }
    .lottie-envelope canvas { width: 300px; height: 300px; max-width: 90vw; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.3)); }
    
    .instruction-text { position: absolute; bottom: -20px; color: white; font-weight: 700; font-size: 1.2rem; letter-spacing: 0.5px; opacity: 0.9; transition: opacity 0.3s; text-shadow: 0 2px 8px rgba(0,0,0,0.5); }
    .instruction-text.fade { opacity: 0; }
    
    /* PAPER STYLES (OPENED) */
    .opened-letter { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 24px; animation: slideUpFade 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    
    .paper { width: 100%; min-height: 400px; max-height: 70vh; background: #fdfaf6; border-radius: 6px; padding: 45px 35px; box-shadow: 0 25px 60px rgba(0,0,0,0.6); overflow-y: auto; position: relative; background-image: repeating-linear-gradient(transparent, transparent 29px, #e1d3c1 30px); background-attachment: local; }
    
    .letter-title { font-family: 'Dancing Script', cursive; color: #590D22; text-align: center; margin-top: 0; margin-bottom: 8px; font-size: 2.8rem; font-weight: 700; line-height: 1.1; }
    .letter-subject { font-family: 'Dancing Script', cursive; color: #a4133c; text-align: center; margin: 0 0 24px; font-size: 1.8rem; opacity: 0.9; }
    
    .letter-content { font-family: 'Dancing Script', cursive; color: #2a0800; font-size: 1.6rem; line-height: 30px; white-space: pre-wrap; margin-bottom: 40px; font-weight: 500; }
    
    .close-btn { background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; border: none; padding: 16px 35px; border-radius: 30px; font-weight: 800; font-size: 1.1rem; box-shadow: 0 8px 25px rgba(255, 77, 109, 0.4); cursor: pointer; transition: transform 0.2s; letter-spacing: 0.5px; }
    .close-btn:active { transform: scale(0.95); }
    
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUpFade { from { opacity: 0; transform: translateY(50px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
  `]
})
export class InteractiveLetterComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() letterData: any;
  @Input() forceOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() opened = new EventEmitter<void>();

  @ViewChild('lottieCanvas') lottieCanvas!: ElementRef<HTMLCanvasElement>;

  isOpened = false;
  isOpening = false;
  
  private lottieInstance: any;
  private fallbackTimeout: any;

  ngOnInit() {
    if (this.forceOpen) {
      this.isOpened = true;
    }
  }

  ngAfterViewInit() {
    if (!this.forceOpen && this.lottieCanvas) {
      this.lottieInstance = new DotLottie({
        canvas: this.lottieCanvas.nativeElement,
        src: 'assets/lottie/Love-letter.lottie',
        loop: false,
        autoplay: false
      });
      
      this.lottieInstance.addEventListener('complete', () => {
        this.openLetter();
      });
    }
  }

  ngOnDestroy() {
    if (this.fallbackTimeout) clearTimeout(this.fallbackTimeout);
    if (this.lottieInstance) {
      this.lottieInstance.destroy();
    }
  }

  playLottie() {
    if (this.isOpening) return;
    this.isOpening = true;
    
    if (this.lottieInstance) {
      this.lottieInstance.play();
      // Fallback timeout in case the animation doesn't emit complete
      this.fallbackTimeout = setTimeout(() => {
        this.openLetter();
      }, 3500);
    } else {
      // Si fallara Lottie, abrimos directo
      this.openLetter();
    }
  }
  
  private openLetter() {
    if (this.fallbackTimeout) clearTimeout(this.fallbackTimeout);
    this.isOpened = true;
    this.opened.emit();
  }
}
