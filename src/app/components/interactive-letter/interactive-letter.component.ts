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
    .overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 10000; display: flex; justify-content: center; align-items: center; animation: fadeIn 0.4s; overflow: hidden; }
    
    .letter-container { position: relative; width: 90%; max-width: 400px; display: flex; justify-content: center; align-items: center; perspective: 1000px; }
    
    .lottie-envelope { position: relative; display: flex; justify-content: center; align-items: center; flex-direction: column; cursor: pointer; }
    .lottie-envelope canvas { width: 300px; height: 300px; max-width: 90vw; }
    
    .instruction-text { position: absolute; bottom: -20px; color: white; font-weight: 600; font-size: 1.1rem; letter-spacing: 1px; opacity: 0.8; transition: opacity 0.3s; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
    .instruction-text.fade { opacity: 0; }
    
    /* PAPER STYLES (OPENED) */
    .opened-letter { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 20px; animation: slideUpFade 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    
    .paper { width: 100%; min-height: 400px; max-height: 70vh; background: #fdfaf6; border-radius: 4px; padding: 40px 30px; box-shadow: 0 20px 50px rgba(0,0,0,0.4); overflow-y: auto; position: relative; background-image: repeating-linear-gradient(transparent, transparent 29px, #e1d3c1 30px); background-attachment: local; }
    
    .letter-title { font-family: 'Georgia', serif; color: #590D22; text-align: center; margin-top: 0; margin-bottom: 30px; font-size: 1.8rem; }
    
    .letter-content { font-family: 'Courier New', Courier, monospace; color: #333; font-size: 1.1rem; line-height: 30px; white-space: pre-wrap; margin-bottom: 40px; }
    
    .letter-signature { text-align: right; font-family: 'Georgia', serif; font-style: italic; color: #a4133c; font-size: 1.2rem; }
    
    .close-btn { background: #FF4D6D; color: white; border: none; padding: 15px 30px; border-radius: 30px; font-weight: 800; font-size: 1.1rem; box-shadow: 0 8px 20px rgba(255, 77, 109, 0.4); cursor: pointer; transition: transform 0.2s; }
    .close-btn:active { transform: scale(0.95); }
    
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUpFade { from { opacity: 0; transform: translateY(40px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
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
