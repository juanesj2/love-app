import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import confetti from 'canvas-confetti';
import { LoveApiService } from '../../services/love-api.service';
import { addIcons } from 'ionicons';
import { closeOutline, fingerPrintOutline } from 'ionicons/icons';

@Component({
  selector: 'app-fingerprint-game-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="fingerprint-container night-owl-mode">
      <div class="close-btn" (click)="close()">
        <ion-icon name="close-outline"></ion-icon>
      </div>

      <div class="scanner-wrapper" (click)="startSequence()">
        <div class="fingerprint-icon" [class.scanning]="isScanning" [class.success]="isSuccess">
          <ion-icon name="finger-print-outline"></ion-icon>
          <div class="scan-line" *ngIf="isScanning"></div>
        </div>
      </div>

      <div class="status-text">
        <h2 [class.glow]="isSuccess">{{ statusMessage }}</h2>
        <p class="sub-text" *ngIf="isSuccess">Pareja encontrada exitosamente.</p>
      </div>
    </div>
  `,
  styles: [`
    .fingerprint-container {
      width: 100vw;
      height: 100vh;
      background-color: #0a0a1a;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      color: white;
      font-family: 'Inter', sans-serif;
    }

    .close-btn {
      position: absolute;
      top: var(--safe-top);
      right: 20px;
      font-size: 32px;
      color: rgba(255,255,255,0.7);
      z-index: 10;
      cursor: pointer;
      background: rgba(255,255,255,0.1);
      border-radius: 50%;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .scanner-wrapper {
      position: relative;
      width: 200px;
      height: 200px;
      margin-bottom: 40px;
    }

    .fingerprint-icon {
      font-size: 200px;
      color: rgba(255,255,255,0.1);
      position: relative;
      transition: color 0.5s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .fingerprint-icon.scanning {
      color: rgba(255, 77, 109, 0.4);
      filter: drop-shadow(0 0 15px rgba(255, 77, 109, 0.5));
    }

    .fingerprint-icon.success {
      color: #00ff88;
      filter: drop-shadow(0 0 30px #00ff88);
      animation: pulse 1.5s infinite;
    }

    .scan-line {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 5px;
      background: #ff4d6d;
      box-shadow: 0 0 20px #ff4d6d, 0 0 40px #ff4d6d;
      animation: scan 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      z-index: 2;
    }

    .status-text {
      text-align: center;
      height: 80px;
    }

    h2 {
      font-size: 1.8rem;
      font-weight: 700;
      letter-spacing: 2px;
      margin: 0 0 10px 0;
      text-transform: uppercase;
      color: rgba(255,255,255,0.8);
      transition: color 0.3s;
    }

    h2.glow {
      color: #00ff88;
      text-shadow: 0 0 10px #00ff88;
    }

    .sub-text {
      font-size: 1.1rem;
      color: rgba(255,255,255,0.6);
      margin: 0;
    }

    @keyframes scan {
      0% { top: 0; opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { top: 100%; opacity: 0; }
    }

    @keyframes pulse {
      0% { transform: scale(1); filter: drop-shadow(0 0 20px #00ff88); }
      50% { transform: scale(1.05); filter: drop-shadow(0 0 40px #00ff88); }
      100% { transform: scale(1); filter: drop-shadow(0 0 20px #00ff88); }
    }
  `]
})
export class FingerprintGameModalComponent implements OnInit, OnDestroy {
  @Input() partnerName: string = 'Tu amor';
  
  statusMessage: string = 'Toca la huella para empezar';
  isScanning: boolean = false;
  isSuccess: boolean = false;
  private scanInterval: any;
  private sequenceTimeouts: any[] = [];

  constructor(
    private modalCtrl: ModalController,
    private api: LoveApiService
  ) {
    addIcons({ closeOutline, fingerPrintOutline });
  }

  ngOnInit() {
    document.body.classList.add('hide-tabs');
  }

  ngOnDestroy() {
    document.body.classList.remove('hide-tabs');
    clearInterval(this.scanInterval);
    this.sequenceTimeouts.forEach(t => clearTimeout(t));
  }

  async close() {
    await this.modalCtrl.dismiss();
  }

  startSequence() {
    if (this.isScanning || this.isSuccess) return;
    
    this.statusMessage = 'Escaneando huella...';
    this.isScanning = true;
    this.startVibration();

    // Stage 1
    this.sequenceTimeouts.push(setTimeout(() => {
      const funnyPhases = ['Analizando nivel de toxicidad...', 'Leyendo la mente...', 'Calculando compatibilidad...', 'Descifrando código genético...'];
      this.statusMessage = funnyPhases[Math.floor(Math.random() * funnyPhases.length)];
    }, 2000));

    // Stage 2
    this.sequenceTimeouts.push(setTimeout(() => {
      const funnyPhases2 = ['Revisando historial de chats...', 'Buscando excusas baratas...', 'Midiendo pulsaciones de amor...', 'Verificando latidos...'];
      this.statusMessage = funnyPhases2[Math.floor(Math.random() * funnyPhases2.length)];
    }, 4000));

    // Stage 3
    this.sequenceTimeouts.push(setTimeout(() => {
      this.statusMessage = 'Buscando coincidencias en la base de datos...';
    }, 6000));

    // Stage 4: Success
    this.sequenceTimeouts.push(setTimeout(() => {
      this.isScanning = false;
      this.isSuccess = true;
      clearInterval(this.scanInterval);
      Haptics.impact({ style: ImpactStyle.Heavy });
      
      const finalPhrases = [
        `¡100% ${this.partnerName.toUpperCase()}!`,
        '¡PELIGRO: EXCESO DE AMOR!',
        '¡COMPATIBILIDAD 99.9%!',
        '¡NIVEL DE SIMP: EXPERTO!',
        `¡PROPIEDAD DE ${this.partnerName.toUpperCase()}!`,
        '¡MATCH PERFECTO ENCONTRADO!'
      ];
      this.statusMessage = finalPhrases[Math.floor(Math.random() * finalPhrases.length)];
      
      this.triggerConfetti();
      this.api.unlockAchievement('secret_fingerprint').catch(() => {});
    }, 8500));
  }

  private startVibration() {
    // Vibrate gently every 800ms while scanning
    Haptics.impact({ style: ImpactStyle.Light });
    this.scanInterval = setInterval(() => {
      Haptics.impact({ style: ImpactStyle.Medium });
    }, 800);
  }

  private triggerConfetti() {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#00ff88', '#ff4d6d', '#ffffff']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#00ff88', '#ff4d6d', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }
}

