import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonModal } from '@ionic/angular/standalone';
import { Rive } from '@rive-app/canvas';
import '@dotlottie/player-component';
import confetti from 'canvas-confetti';
import { LoveApiService } from '../../services/love-api.service';
import { AlertController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-streak-pet',
  standalone: true,
  imports: [CommonModule, IonModal],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- We show egg emoji if streak == 0 OR if not hatched yet -->
    <div class="pet-container" (click)="onPetTap()" [class.is-egg]="isEgg" [ngClass]="rarityClass">
      
      <div class="egg-emoji" *ngIf="isEgg">🥚</div>
      
      <!-- Indicator when ready to hatch -->
      <div class="hatch-indicator" *ngIf="isEgg && streakDays > 0">¡Tócame!</div>

      <!-- DotLottie Player for Pets -->
      <dotlottie-player 
        *ngIf="!isEgg"
        #lottiePlayer
        src="{{currentLottieSrc}}" 
        background="transparent" 
        speed="1" 
        style="width: 100%; height: 100%; transform: scale(1.4);" 
        direction="1" 
        playMode="normal" 
        loop 
        autoplay>
      </dotlottie-player>
    </div>

    <!-- Modal para Eclosionar -->
    <ion-modal [isOpen]="showHatchModal" (didDismiss)="closeModal()" class="hatch-modal">
      <ng-template>
        <div class="hatch-modal-content">
          <h2 *ngIf="!hatchingInProgress">¡Tu mascota quiere nacer!</h2>
          <h2 *ngIf="hatchingInProgress">¡Naciendo!</h2>
          
          <div class="big-egg-container" (click)="hatchEgg()">
            <!-- Rive Canvas for Egg -->
            <canvas #riveCanvas class="egg-canvas"></canvas>
            <div class="tap-hint" *ngIf="!hatchingInProgress">👆 Toca para romper el cascarón</div>
          </div>
          
          <button class="close-btn" (click)="closeModal()" *ngIf="!hatchingInProgress">Quizás más tarde</button>
        </div>
      </ng-template>
    </ion-modal>
  `,
  styles: [`
    .pet-container {
      width: 50px;
      height: 50px;
      position: relative;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: transform 0.1s ease;
    }
    .pet-container:active {
      transform: scale(0.9);
    }
    .egg-emoji {
      font-size: 2.5rem;
      line-height: 1;
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
    }
    .hatch-indicator {
      position: absolute;
      bottom: -15px;
      background: #ff4d6d;
      color: white;
      font-size: 0.7rem;
      font-weight: bold;
      padding: 3px 8px;
      border-radius: 12px;
      animation: bounce 1s infinite;
      pointer-events: none;
      white-space: nowrap;
      box-shadow: 0 4px 10px rgba(255, 77, 109, 0.4);
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
    
    /* Rarity Glow Effects */
    .rarity-raro {
      filter: drop-shadow(0 0 8px rgba(108, 99, 255, 0.7));
    }
    .rarity-legendario {
      filter: drop-shadow(0 0 12px rgba(255, 215, 0, 0.9));
      transform: scale(1.1); /* Slightly larger */
    }

    /* Modal Styles */
    .hatch-modal-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      color: white;
      text-align: center;
      padding: 20px;
    }
    .hatch-modal-content h2 {
      font-size: 1.8rem;
      font-weight: 800;
      margin-bottom: 30px;
      background: -webkit-linear-gradient(45deg, #FFCA3A, #FF9F1C);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .big-egg-container {
      width: 100vw;
      height: 60vh;
      position: relative;
      cursor: pointer;
    }
    .egg-canvas {
      width: 100%;
      height: 100%;
    }
    .tap-hint {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 1.2rem;
      font-weight: bold;
      color: white;
      background: rgba(255, 77, 109, 0.8);
      padding: 10px 20px;
      border-radius: 20px;
      pointer-events: none;
      animation: pulseHint 1.5s infinite;
    }
    @keyframes pulseHint {
      0% { transform: translateX(-50%) scale(1); }
      50% { transform: translateX(-50%) scale(1.1); }
      100% { transform: translateX(-50%) scale(1); }
    }
    .close-btn {
      margin-top: 30px;
      padding: 12px 25px;
      border-radius: 25px;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      font-weight: bold;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
  `]
})
export class StreakPetComponent implements OnChanges, OnDestroy {
  @Input() streakDays: number = 0;
  @Input() coupleId: number = 0;
  @Input() petData: any = null;

  @Output() petHatched = new EventEmitter<any>();

  @ViewChild('lottiePlayer') lottiePlayer!: ElementRef<any>;

  // Use setter to detect when canvas becomes available in modal
  @ViewChild('riveCanvas') set riveCanvas(element: ElementRef<HTMLCanvasElement>) {
    if (element && element.nativeElement) {
      setTimeout(() => this.initRive(element.nativeElement), 100);
    }
  }

  private riveInstance: Rive | null = null;
  public currentLottieSrc: string = '';
  public petType: 'Dog' | 'Cat' = 'Dog';
  public isEgg: boolean = true;
  
  public showHatchModal = false;
  public hatchingInProgress = false;

  public rarityClass = '';
  private interactionTimeout: any;

  private api = inject(LoveApiService);
  private alertCtrl = inject(AlertController);

  ngOnChanges(changes: SimpleChanges) {
    this.evaluateState();
  }

  private evaluateState() {
    if (this.streakDays === 0 || !this.petData || !this.petData.hatched) {
      this.isEgg = true;
      this.rarityClass = '';
    } else {
      this.isEgg = false;
      this.cleanupRive();
      this.petType = this.petData.type === 'Cat' ? 'Cat' : 'Dog';
      
      // Set Rarity Class
      if (this.petData.rarity === 'raro') this.rarityClass = 'rarity-raro';
      else if (this.petData.rarity === 'legendario') this.rarityClass = 'rarity-legendario';
      else this.rarityClass = '';

      this.setLottieState('neutral');
    }
  }

  private initRive(canvasEl: HTMLCanvasElement) {
    if (this.riveInstance) {
      this.riveInstance.cleanup();
    }
    
    this.riveInstance = new Rive({
      src: '/assets/pets/egg.riv',
      canvas: canvasEl,
      autoplay: true,
      onLoad: () => {
        this.riveInstance?.resizeDrawingSurfaceToCanvas();
      }
    });
  }

  private cleanupRive() {
    if (this.riveInstance) {
      this.riveInstance.cleanup();
      this.riveInstance = null;
    }
  }

  private getLottieFileName(state: string): string {
    if (this.petType === 'Dog') {
      switch(state) {
        case 'neutral': return 'Dog_neutral';
        case 'happy': return 'Dog_happy';
        case 'heart': return 'Dog_happy';
        case 'angry': return 'Dog_angry';
        case 'sleeping': return 'Dog_neutral';
        default: return 'Dog_neutral';
      }
    } else {
      switch(state) {
        case 'neutral': return 'Cat_sleeping';
        case 'happy': return 'Cat_riendo';
        case 'heart': return 'Cat_heart';
        case 'sleeping': return 'Cat_sleeping';
        default: return 'Cat_sleeping';
      }
    }
  }

  private setLottieState(state: 'neutral' | 'happy' | 'heart' | 'sleeping') {
    if (this.isEgg) return;

    const filename = this.getLottieFileName(state);
    this.currentLottieSrc = `/assets/pets/${filename}.lottie`;
    if (this.lottiePlayer && this.lottiePlayer.nativeElement && this.lottiePlayer.nativeElement.load) {
       this.lottiePlayer.nativeElement.load(this.currentLottieSrc);
    }
  }

  onPetTap() {
    if (this.isEgg && this.streakDays === 0) {
      // Falta racha
      return;
    }

    if (this.isEgg && this.streakDays > 0) {
      // Abrir modal de eclosión
      this.showHatchModal = true;
      return;
    }

    // Ya eclosionado: Interacción con la mascota
    if (!this.isEgg) {
      const happyState = Math.random() > 0.5 ? 'happy' : 'heart';
      this.setLottieState(happyState);

      if (this.interactionTimeout) {
        clearTimeout(this.interactionTimeout);
      }

      this.interactionTimeout = setTimeout(() => {
        this.setLottieState('neutral');
      }, 2500);
    }
  }

  async hatchEgg() {
    if (this.hatchingInProgress) return;
    this.hatchingInProgress = true;

    // Rive se está rompiendo al hacer click, esperamos 1.5s
    setTimeout(async () => {
      try {
        const res = await this.api.hatchPet();
        const newPet = res.pet;

        this.showHatchModal = false;
        
        // Confeti full
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#ff4d6d', '#ffca3a', '#8b5cf6', '#ffffff']
        });

        const rarityText = newPet.rarity === 'legendario' ? '⭐ LEGENDARIO ⭐' : (newPet.rarity === 'raro' ? '✨ RARO ✨' : 'Común');
        const alert = await this.alertCtrl.create({
          header: '¡Ha nacido tu mascota!',
          subHeader: `¡Es un ${newPet.type === 'Dog' ? 'Perrito' : 'Gatito'} ${rarityText}!`,
          message: 'Mantenla feliz cuidando vuestra racha de amor. Si perdéis la racha, volverá a su cascarón.',
          buttons: ['¡Me encanta!']
        });
        await alert.present();

        this.hatchingInProgress = false;
        this.petHatched.emit(newPet);
        
      } catch (e) {
        console.error("Error al eclosionar mascota", e);
        this.hatchingInProgress = false;
        this.showHatchModal = false;
      }
    }, 1500);
  }

  closeModal() {
    this.showHatchModal = false;
    this.cleanupRive();
  }

  ngOnDestroy() {
    this.cleanupRive();
    if (this.interactionTimeout) {
      clearTimeout(this.interactionTimeout);
    }
  }
}
