import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-interactive-letter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overlay">
      <!-- Overlay blur para el fondo -->
      
      <div class="letter-container" (click)="$event.stopPropagation()">
        
        <!-- Estado 1: Cerrada (Sobre con sello de cera) -->
        <div class="envelope" *ngIf="!isOpened">
             
          <div class="envelope-flap" [class.opening]="isOpening"></div>
          <div class="envelope-body">
            <h3 class="subject-text">{{ letterData?.subject || 'Para ti' }}</h3>
          </div>
          
          <div class="wax-seal" [class.breaking]="isOpening">
            <span>❤️</span>
          </div>
          
        </div>

        <!-- Estado 2: Abierta (Contenido de la carta) -->
        <div class="opened-letter" *ngIf="isOpened">
          <div class="paper">
            <h2 class="letter-title">{{ letterData?.title || 'Carta de Amor' }}</h2>
            <div class="letter-content">
              {{ letterData?.content }}
            </div>
            <div class="letter-signature">
              Con mucho amor ❤️
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
    
    /* ENVELOPE STYLES */
    .envelope { width: 300px; height: 200px; background: #e0d0c1; position: relative; border-radius: 8px; box-shadow: 0 15px 40px rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; cursor: pointer; transition: transform 0.3s; transform-style: preserve-3d; }
    .envelope:active { transform: scale(0.98); }
    
    .envelope-flap { position: absolute; top: 0; left: 0; border-left: 150px solid transparent; border-right: 150px solid transparent; border-top: 100px solid #d4c1af; z-index: 3; transform-origin: top; transition: transform 0.6s ease-in-out; }
    .envelope-flap.opening { transform: rotateX(180deg); }
    
    .envelope-body { position: absolute; inset: 0; background: linear-gradient(135deg, #f3e5d8, #e0d0c1); border-radius: 8px; z-index: 1; display: flex; justify-content: center; align-items: center; border: 2px solid rgba(255,255,255,0.2); }
    
    .subject-text { font-family: 'Georgia', serif; font-style: italic; color: #5a4b3f; font-size: 1.4rem; z-index: 2; margin-top: 50px; text-align: center; padding: 0 20px; }
    
    /* WAX SEAL */
    .wax-seal { position: absolute; top: 100px; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; background: #9e1b1b; border-radius: 50%; z-index: 4; display: flex; justify-content: center; align-items: center; box-shadow: inset 0 0 10px rgba(0,0,0,0.4), 0 4px 10px rgba(0,0,0,0.3); border: 2px solid #7a1212; transition: all 0.4s; }
    .wax-seal span { font-size: 1.8rem; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5)); }
    .wax-seal.breaking { transform: translate(-50%, -50%) scale(1.2); opacity: 0; filter: blur(4px); }
    
    /* PROGRESS RING */
    .progress-ring { position: absolute; top: 100px; left: 50%; transform: translate(-50%, -50%) rotate(-90deg); z-index: 5; pointer-events: none; }
    .progress-ring-circle { transition: stroke-dashoffset 0.1s; stroke-dasharray: 213.6; stroke-dashoffset: 213.6; stroke: #FF4D6D; }
    
    .instruction-text { position: absolute; bottom: -40px; color: white; font-weight: 600; font-size: 0.9rem; letter-spacing: 1px; opacity: 0.8; transition: opacity 0.3s; }
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
export class InteractiveLetterComponent implements OnInit, OnDestroy {
  @Input() letterData: any;
  @Input() forceOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() opened = new EventEmitter<void>();

  isOpened = false;
  isOpening = false;
  
  private animationTimeout1: any;
  private animationTimeout2: any;

  ngOnInit() {
    if (this.forceOpen) {
      this.isOpened = true;
    } else {
      this.animationTimeout1 = setTimeout(() => {
        this.playOpeningAnimation();
      }, 500);
    }
  }

  ngOnDestroy() {
    if (this.animationTimeout1) clearTimeout(this.animationTimeout1);
    if (this.animationTimeout2) clearTimeout(this.animationTimeout2);
  }

  private playOpeningAnimation() {
    this.isOpening = true;
    
    // Disparar la animación de abrir el sobre
    this.animationTimeout2 = setTimeout(() => {
      this.isOpened = true;
      this.opened.emit();
    }, 1200);
  }
}
