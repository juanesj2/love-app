import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonModal, AlertController } from '@ionic/angular/standalone';
import { Rive, Layout, Fit, Alignment } from '@rive-app/canvas';
import '@dotlottie/player-component';
import confetti from 'canvas-confetti';
import { LoveApiService } from '../../services/love-api.service';

@Component({
  selector: 'app-streak-pet',
  standalone: true,
  imports: [CommonModule, FormsModule, IonModal],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- We show egg emoji if streak == 0 OR if not hatched yet -->
    <div class="pet-container" 
         (pointerdown)="onPointerDown($event)" 
         (pointerup)="onPointerUp($event)" 
         (pointercancel)="onPointerCancel($event)"
         (pointerleave)="onPointerCancel($event)"
         [class.is-egg]="isEgg" [ngClass]="rarityClass">
      
      <div class="egg-emoji" *ngIf="isEgg">🥚</div>
      
      <!-- Indicator when ready to hatch -->
      <div class="hatch-indicator" *ngIf="isEgg && streakDays > 0">¡Tócame!</div>

      <!-- DotLottie Player for Pets -->
      <dotlottie-player 
        [hidden]="isEgg"
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
          <div class="big-egg-container">
            <!-- Rive Canvas for Egg -->
            <canvas #riveCanvas class="egg-canvas"></canvas>
            
            <!-- Mascota (Lottie) sobre el cascarón roto -->
            <div class="pet-overlay" [hidden]="!hatchedPet">
               <dotlottie-player
                  [src]="lottieSrc"
                  autoplay
                  [loop]="false"
                  style="width: 350px; height: 350px;">
               </dotlottie-player>
            </div>

            <!-- Capa transparente para interceptar los clicks -->
            <div class="click-overlay" (click)="onCanvasClick()"></div>
            
            <div class="tap-hint" *ngIf="!hatchingInProgress || hatchedPet" [innerHTML]="tapHintText"></div>
          </div>
          <!-- Botón de cierre sutil en la esquina superior -->
          <div class="close-icon" *ngIf="!hatchingInProgress && !hatchedPet" (click)="closeModal()">✕</div>
        </div>
      </ng-template>
    </ion-modal>

    <!-- Modal de Interacción con la Mascota -->
    <ion-modal [isOpen]="showInteractModal" (didDismiss)="closeInteractModal()" class="pet-interact-modal" style="--background: transparent; --box-shadow: none; --backdrop-opacity: 0;">
      <ng-template>
        <div class="overlay" (click)="closeInteractModal()">
          <div class="modal-sheet" (click)="$event.stopPropagation()">
            <button class="close-btn" (click)="closeInteractModal()">
              ✕
            </button>
            <!-- DECORATION SHOP VIEW -->
            <div [hidden]="!showShop">
              <div class="interact-header" style="position: relative; margin-bottom: 30px;">
                <button class="close-btn" style="position: absolute; top: -10px; left: -10px;" (click)="showShop = false">
                  <span style="font-size: 1.2rem;">←</span>
                </button>
                <h3 style="margin-top: 5px;">Tienda 🎨</h3>
              </div>
              
              <div class="pet-border-wrapper" [ngStyle]="getBorderWrapperStyles()">
                <div class="pet-stage" [ngStyle]="getStageStyles()">
                  <div class="floating-prop" *ngIf="getActiveProp() as prop">
                    <div *ngIf="prop.emoji" class="prop-emoji">{{ prop.emoji }}</div>
                    <div *ngIf="prop.image" class="prop-image" [style.background]="prop.image"></div>
                  </div>
                  <dotlottie-player 
                    [src]="currentLottieSrc" 
                    background="transparent" 
                    speed="1" 
                    style="width: 150px; height: 150px;" 
                    loop 
                    autoplay>
                  </dotlottie-player>
                  <div class="clothing-layer" [ngStyle]="getClothesStyle('shop')">{{ getClothesEmoji() }}</div>
                </div>
              </div>

              <div class="shop-section">
                <h4>Fondos</h4>
                <div class="shop-grid">
                  <div class="shop-item" *ngFor="let opt of bgOptions" 
                       [class.active]="activeDeco.bg === opt.id"
                       (click)="selectDeco('bg', opt.id)">
                    <div class="preview-circle" [style.background]="opt.style || '#f4f5f8'"></div>
                    <span>{{ opt.name }}</span>
                  </div>
                </div>
              </div>

              <div class="shop-section">
                <h4>Bordes</h4>
                <div class="shop-grid">
                  <div class="shop-item" *ngFor="let opt of borderOptions" 
                       [class.active]="activeDeco.border === opt.id"
                       (click)="selectDeco('border', opt.id)">
                    <div class="preview-border-wrapper" [ngStyle]="getPreviewBorderWrapperStyles(opt)">
                      <div class="preview-circle" [style.border]="opt.style" [style.box-shadow]="opt.shadow"></div>
                    </div>
                    <span>{{ opt.name }}</span>
                  </div>
                </div>
              </div>

              <div class="shop-section">
                <h4>Accesorios</h4>
                <div class="shop-grid">
                  <div class="shop-item" *ngFor="let opt of propOptions" 
                       [class.active]="activeDeco.prop === opt.id"
                       (click)="selectDeco('prop', opt.id)">
                    <div class="preview-circle" style="display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background-size: cover; background-position: center;"
                         [style.background]="opt.image || 'white'">
                      <span *ngIf="!opt.image">{{ opt.emoji || '❌' }}</span>
                    </div>
                    <span>{{ opt.name }}</span>
                  </div>
                </div>
              </div>

              <div class="shop-section">
                <h4>Ropa / Pegatinas</h4>
                <div class="shop-grid">
                  <div class="shop-item" *ngFor="let opt of clothesOptions" 
                       [class.active]="activeDeco.clothes === opt.id"
                       (click)="selectDeco('clothes', opt.id)">
                    <div class="preview-circle" style="display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                      {{ opt.emoji || '❌' }}
                    </div>
                    <span>{{ opt.name }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- EDIT NAME VIEW -->
            <div [hidden]="!showNameEdit">
              <div class="interact-header" style="position: relative; margin-bottom: 20px;">
                <button class="close-btn" style="position: absolute; top: -10px; left: -10px;" (click)="showNameEdit = false">
                  <span style="font-size: 1.2rem;">←</span>
                </button>
                <h3 style="margin-top: 5px;">Nombre ✏️</h3>
              </div>
              
              <div style="padding: 10px; display: flex; flex-direction: column; gap: 15px;">
                <p style="text-align: center; color: #590D22; opacity: 0.8; font-family: 'Outfit', sans-serif;">¿Cómo quieres llamar a vuestra mascota?</p>
                <input type="text" [(ngModel)]="tempPetName" placeholder="Ej: Firulais" class="name-input" />
                <button class="shop-btn-large" (click)="savePetName()">
                  Guardar
                </button>
              </div>
            </div>

            <!-- NORMAL INTERACT VIEW -->
            <div [hidden]="showShop || showNameEdit">
              <div class="interact-header">
                <h3 (click)="openNameEdit()" style="cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                  {{ petName || 'Tu ' + (petType === 'Dog' ? 'Perrito' : 'Gatito') }} {{ petData?.rarity === 'legendario' ? '⭐' : (petData?.rarity === 'raro' ? '✨' : '') }}
                  <span style="font-size: 0.9rem; opacity: 0.6;">✏️</span>
                </h3>
                <p class="streak-badge">Racha: {{ streakDays }} días 🔥</p>
              </div>
              
              <div class="pet-border-wrapper" [ngStyle]="getBorderWrapperStyles()">
                <div class="pet-stage" [ngStyle]="getStageStyles()">

                  <div class="floating-prop" *ngIf="getActiveProp() as prop">
                    <div *ngIf="prop.emoji" class="prop-emoji">{{ prop.emoji }}</div>
                    <div *ngIf="prop.image" class="prop-image" [style.background]="prop.image"></div>
                  </div>
                  <dotlottie-player 
                    #modalLottiePlayer
                    [src]="currentLottieSrc" 
                    background="transparent" 
                    speed="1" 
                    style="width: 200px; height: 200px;" 
                    loop 
                    autoplay>
                  </dotlottie-player>
                  <div class="clothing-layer" [ngStyle]="getClothesStyle('modal')">{{ getClothesEmoji() }}</div>
                </div>
              </div>

              <div class="action-grid">
                <button class="action-btn feed" (click)="doAction('feed')">
                  <span class="emoji">🍖</span>
                  <span>Alimentar</span>
                </button>
                <button class="action-btn play" (click)="doAction('play')">
                  <span class="emoji">🎾</span>
                  <span>Jugar</span>
                </button>
                <button class="action-btn pet" (click)="doAction('pet')">
                  <span class="emoji">✋</span>
                  <span>Acariciar</span>
                </button>
                <button class="action-btn sleep" (click)="doAction('sleep')">
                  <span class="emoji">💤</span>
                  <span>Dormir</span>
                </button>
              </div>
              
              <div style="margin-top: 15px;">
                <button class="shop-btn-large" (click)="showShop = true">
                  🎨 Decorar Mascota
                </button>
              </div>
              </div>
            <div class="stats-panel">
              <div class="stat-row">
                <span>Estado:</span>
                <strong>{{ currentEmotion }}</strong>
              </div>
              <div class="stat-row">
                <span>Nivel de amor:</span>
                <strong>{{ streakDays * 10 }} XP</strong>
              </div>
            </div>
          </div>
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
    .hatch-modal {
      --background: transparent;
    }
    .hatch-modal-content {
      width: 100vw;
      height: 100vh;
      position: relative;
      background: black; /* Just in case there's letterboxing */
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .big-egg-container {
      width: 100%;
      height: 100%;
      position: relative;
      cursor: pointer;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .egg-canvas {
      width: 100%;
      height: 100%;
    }
    .click-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10;
      /* CRÍTICO: iOS Safari ignora clicks en divs transparentes sin fondo */
      background: rgba(0, 0, 0, 0.01);
      cursor: pointer;
    }
    .pet-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 5;
      animation: spawnPet 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    @keyframes spawnPet {
      0% { opacity: 0; transform: scale(0.2) translateY(50px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }

    /* Interact Modal Styles */
    ::ng-deep .pet-interact-modal { --background: transparent; --box-shadow: none; --backdrop-opacity: 0; }
    .overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); z-index: 10000; display: flex; flex-direction: column; padding: calc(env(safe-area-inset-top, 20px) + 20px) 20px 20px; align-items: center; overflow-y: auto; animation: fadeIn 0.3s; }
    .modal-sheet { margin: auto 0; background: #fdf2f4; width: 100%; max-width: 400px; border-radius: 30px; padding: 25px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); animation: slideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1); position: relative; max-height: 85vh; overflow-y: auto; }
    :host-context(.night-owl-mode) .modal-sheet { background: #1a1a2e; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
    
    .close-btn { position: absolute; top: 15px; right: 15px; width: 36px; height: 36px; border-radius: 50%; background: white; border: none; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: #590D22; box-shadow: 0 4px 15px rgba(0,0,0,0.08); cursor: pointer; z-index: 100; }
    :host-context(.night-owl-mode) .close-btn { background: #2b2b36; color: white; border: 1px solid rgba(255,255,255,0.1); }

    .interact-header { text-align: center; margin-bottom: 20px; margin-top: 10px; }
    .interact-header h3 { font-weight: 800; font-size: 1.6rem; margin: 0 0 10px 0; color: #590D22; font-family: 'Outfit', sans-serif; }
    :host-context(.night-owl-mode) .interact-header h3 { color: #fdfdfd; }
    
    .streak-badge { display: inline-block; background: rgba(255, 77, 109, 0.15); color: #ff4d6d; padding: 6px 16px; border-radius: 20px; font-weight: bold; margin: 0; border: 1px solid rgba(255, 77, 109, 0.3); }
    
    .pet-border-wrapper { margin: 20px auto; border-radius: 50%; display: flex; align-items: center; justify-content: center; width: fit-content; transition: all 0.3s ease; }
    .pet-stage { position: relative; display: flex; justify-content: center; align-items: center; background: white; border-radius: 50%; width: 220px; height: 220px; box-shadow: inset 0 0 40px rgba(0,0,0,0.03); transition: all 0.3s ease; }
    :host-context(.night-owl-mode) .pet-stage { background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%); box-shadow: inset 0 0 40px rgba(0,0,0,0.5); }
    
    .floating-prop { position: absolute; top: -15px; right: 20px; z-index: 10; animation: float 3s ease-in-out infinite; }
    .prop-emoji { font-size: 3.5rem; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.2)); }
    .prop-image { width: 60px; height: 60px; border-radius: 50%; box-shadow: 0 4px 15px rgba(0,0,0,0.2); border: 3px solid white; }
    :host-context(.night-owl-mode) .prop-image { border-color: rgba(255,255,255,0.1); }
    @keyframes float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(5deg); } }

    .clothing-layer { position: absolute; pointer-events: none; z-index: 15; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2)); transition: all 0.3s ease; }


    .shop-btn-large { width: 100%; background: linear-gradient(135deg, #ff4d6d, #ff758f); color: white; border: none; border-radius: 20px; padding: 15px; font-family: 'Outfit', sans-serif; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 15px rgba(255,77,109,0.3); transition: all 0.2s; cursor: pointer; }
    .shop-btn-large:active { transform: scale(0.98); }
    :host-context(.night-owl-mode) .shop-btn-large { background: linear-gradient(135deg, #a78bfa, #8b5cf6); box-shadow: 0 4px 15px rgba(167, 139, 250, 0.3); }

    .shop-section { margin-bottom: 20px; }
    .shop-section h4 { color: #A4133C; font-family: 'Outfit', sans-serif; margin: 0 0 10px 0; font-size: 1.1rem; }
    :host-context(.night-owl-mode) .shop-section h4 { color: #fdfdfd; }
    
    .shop-grid { display: flex; overflow-x: auto; gap: 10px; padding-bottom: 10px; }
    .shop-item { display: flex; flex-direction: column; align-items: center; gap: 5px; cursor: pointer; min-width: 60px; opacity: 0.6; transition: all 0.2s; }
    .shop-item.active { opacity: 1; transform: scale(1.05); }
    .shop-item.active span { font-weight: bold; color: #590D22; }
    :host-context(.night-owl-mode) .shop-item.active span { color: #a78bfa; }
    
    .preview-border-wrapper { border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .preview-circle { width: 50px; height: 50px; border-radius: 50%; background: white; border: 2px solid transparent; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .shop-item.active .preview-border-wrapper .preview-circle, .shop-item.active .preview-circle { border-color: #ff4d6d; }
    :host-context(.night-owl-mode) .shop-item.active .preview-border-wrapper .preview-circle, :host-context(.night-owl-mode) .shop-item.active .preview-circle { border-color: #a78bfa; }
    .shop-item span { font-size: 0.75rem; color: #888; text-align: center; font-family: 'Outfit', sans-serif; }
    
    .action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 30px; }
    .action-btn { background: white; border: 1px solid rgba(0,0,0,0.05); border-radius: 20px; padding: 15px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #590D22; font-weight: 600; transition: all 0.2s; font-family: 'Outfit', sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
    :host-context(.night-owl-mode) .action-btn { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: white; }
    .action-btn:active { transform: scale(0.95); opacity: 0.8; }
    .action-btn .emoji { font-size: 2rem; margin-bottom: 8px; }
    .action-btn.feed { border-color: rgba(255, 159, 28, 0.3); }
    .action-btn.play { border-color: rgba(46, 204, 113, 0.3); }
    .action-btn.pet { border-color: rgba(167, 139, 250, 0.3); }
    .action-btn.sleep { border-color: rgba(52, 152, 219, 0.3); }

    .stats-panel { margin-top: 30px; background: white; border-radius: 15px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
    :host-context(.night-owl-mode) .stats-panel { background: rgba(0, 0, 0, 0.3); }
    
    .stat-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 1.1rem; }
    .stat-row:last-child { margin-bottom: 0; }
    .stat-row span { color: #A4133C; font-weight: 500; font-family: 'Outfit', sans-serif; }
    :host-context(.night-owl-mode) .stat-row span { color: #aaa; }
    .stat-row strong { color: #590D22; font-weight: bold; }
    :host-context(.night-owl-mode) .stat-row strong { color: #fdfdfd; }
    
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .name-input { width: 100%; padding: 15px; border-radius: 20px; border: 2px solid rgba(255, 77, 109, 0.3); font-size: 1.1rem; font-family: 'Outfit', sans-serif; outline: none; transition: border-color 0.2s; background: white; color: #590D22; text-align: center; }
    .name-input:focus { border-color: #ff4d6d; }
    :host-context(.night-owl-mode) .name-input { background: rgba(0,0,0,0.2); border-color: rgba(167, 139, 250, 0.3); color: white; }
    :host-context(.night-owl-mode) .name-input:focus { border-color: #a78bfa; }

    .tap-hint {
      position: absolute;
      bottom: 12%;
      left: 50%;
      transform: translateX(-50%);
      font-size: 1.2rem;
      font-weight: bold;
      color: white;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(8px);
      padding: 15px 25px;
      border-radius: 25px;
      pointer-events: none;
      animation: pulseHint 1.5s infinite;
      text-align: center;
      line-height: 1.5;
      width: max-content;
      max-width: 90%;
    }
    @keyframes pulseHint {
      0% { transform: translateX(-50%) scale(1); }
      50% { transform: translateX(-50%) scale(1.05); }
      100% { transform: translateX(-50%) scale(1); }
    }
    .close-icon {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      background: rgba(0,0,0,0.3);
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 50%;
      font-size: 1.2rem;
      font-weight: bold;
      z-index: 100;
      cursor: pointer;
    }
  `]
})
export class StreakPetComponent implements OnChanges, OnDestroy {
  @Input() streakDays: number = 0;
  @Input() coupleId: number = 0;
  @Input() petData: any = null;
  @Input() petName: string | null = null;
  @Input() set decorations(val: any) {
    if (typeof val === 'string') {
      try { this.activeDeco = JSON.parse(val); } catch(e) { this.activeDeco = {}; }
    } else if (val) {
      this.activeDeco = val;
    } else {
      this.activeDeco = {};
    }
  }

  @Output() petHatched = new EventEmitter<any>();

  @ViewChild('lottiePlayer') lottiePlayer!: ElementRef;
  @ViewChild('modalLottiePlayer') modalLottiePlayer!: ElementRef;
  @ViewChild(IonModal) modal!: IonModal;

  // Use setter to detect when canvas becomes available in modal
  @ViewChild('riveCanvas') set riveCanvas(element: ElementRef<HTMLCanvasElement>) {
    if (element && element.nativeElement) {
      setTimeout(() => this.initRive(element.nativeElement), 100);
    }
  }

  private api = inject(LoveApiService);
  private alertCtrl = inject(AlertController);

  private riveInstance: Rive | null = null;
  public currentLottieSrc: string = '';
  public petType: 'Dog' | 'Cat' = 'Dog';
  public isEgg: boolean = true;
  
  public showHatchModal = false;
  public hatchingInProgress = false;

  public showInteractModal = false;
  public currentEmotion: string = 'Tranquilo';
  private isLongPress = false;
  private pressTimeout: any;

  public rarityClass = '';
  public tapHintText = '👆 Toca para romper el cascarón';
  private clickCount = 0;

  public hatchedPet: any = null;
  public lottieSrc = '';

  private interactionTimeout: any;

  public showShop = false;
  public showNameEdit = false;
  public tempPetName = '';
  public activeDeco: any = {};

  public bgOptions = [
    { id: 'none', name: 'Original', style: 'none' },
    { id: 'forest', name: 'Bosque', style: 'url("/assets/pets/bg/forest.jpg") center/cover' },
    { id: 'night', name: 'Noche', style: 'url("/assets/pets/bg/night.jpg") center/cover' },
    { id: 'royal', name: 'Real', style: 'url("/assets/pets/bg/room.jpg") center/cover' },
    { id: 'car', name: 'Coche', style: 'url("/assets/pets/bg/car.jpg") center/cover' }
  ];

  public borderOptions = [
    { id: 'none', name: 'Ninguno', style: 'none' },
    { id: 'gold', name: 'Oro', style: '4px solid #ffd700', shadow: '0 0 15px rgba(255,215,0,0.6)' },
    { id: 'neon', name: 'Neón', style: '3px solid #00f3ff', shadow: '0 0 15px #00f3ff, inset 0 0 10px #00f3ff' },
    { id: 'love', name: 'Amor', style: '4px dashed #ff4d6d' },
    { id: 'wood', name: 'Madera', bgImage: 'url("/assets/pets/border/wood.jpg") center/cover', padding: '12px', shadow: '0 4px 15px rgba(0,0,0,0.3)' },
    { id: 'galaxy', name: 'Galaxia', bgImage: 'url("/assets/pets/border/galaxy.jpg") center/cover', padding: '10px', shadow: '0 0 20px #8b5cf6' },
    { id: 'rainbow', name: 'Arcoíris', bgImage: 'url("/assets/pets/border/rainbow.jpg") center/cover', padding: '10px' },
    { id: 'water', name: 'Agua', bgImage: 'url("/assets/pets/border/water.jpg") center/cover', padding: '10px' }
  ];

  public propOptions = [
    { id: 'none', name: 'Nada', emoji: '' },
    { id: 'crown', name: 'Corona', image: 'url("/assets/pets/prop/crown.jpg") center/cover' },
    { id: 'star', name: 'Estrellas', image: 'url("/assets/pets/prop/star.jpg") center/cover' },
    { id: 'bow', name: 'Lazo', image: 'url("/assets/pets/prop/bow.jpg") center/cover' },
    { id: 'heart', name: 'Corazón', image: 'url("/assets/pets/prop/heart.jpg") center/cover' }
  ];

  public clothesOptions = [
    { id: 'none', name: 'Nada', emoji: '' },
    { id: 'glasses', name: 'Gafas', emoji: '🕶️', style: { top: '35%', left: '33%', fontSize: '3rem' } },
    { id: 'hat', name: 'Sombrero', emoji: '🎩', style: { top: '5%', left: '42%', fontSize: '3.5rem' } },
    { id: 'scarf', name: 'Bufanda', emoji: '🧣', style: { top: '55%', left: '33%', fontSize: '3.5rem' } },
    { id: 'bowtie', name: 'Pajarita', emoji: '🎀', style: { top: '65%', left: '38%', fontSize: '2.5rem' } },
    { id: 'flower', name: 'Flor', emoji: '🌻', style: { top: '25%', left: '60%', fontSize: '2.5rem' } }
  ];

  getStageStyles() {
    let styles: any = {};
    const bg = this.bgOptions.find(b => b.id === this.activeDeco.bg);
    if (bg && bg.style) styles['background'] = bg.style;

    const border = this.borderOptions.find(b => b.id === this.activeDeco.border);
    if (border && !border.bgImage && border.style !== 'none') {
      styles['border'] = border.style;
      if (border.shadow) styles['box-shadow'] = border.shadow;
    }
    return styles;
  }

  getBorderWrapperStyles() {
    let styles: any = {};
    const border = this.borderOptions.find(b => b.id === this.activeDeco.border);
    if (border && border.bgImage) {
      styles['background'] = border.bgImage;
      styles['padding'] = border.padding || '10px';
      if (border.shadow) styles['box-shadow'] = border.shadow;
    } else {
      styles['padding'] = '0px';
    }
    return styles;
  }

  getPreviewBorderWrapperStyles(opt: any) {
    let styles: any = {};
    if (opt.bgImage) {
      styles['background'] = opt.bgImage;
      styles['padding'] = '5px';
    } else {
      styles['padding'] = '0px';
    }
    return styles;
  }

  getActiveProp() {
    return this.propOptions.find(p => p.id === this.activeDeco.prop);
  }

  getClothesEmoji() {
    const item = this.clothesOptions.find(c => c.id === this.activeDeco.clothes);
    return item ? item.emoji : '';
  }

  getClothesStyle(context: 'shop' | 'modal') {
    const item = this.clothesOptions.find(c => c.id === this.activeDeco.clothes);
    if (!item || !item.emoji || !item.style) return { display: 'none' };
    
    const scale = context === 'shop' ? 0.8 : 1;
    
    return {
      top: item.style.top,
      left: item.style.left,
      fontSize: `calc(${item.style.fontSize} * ${scale})`
    };
  }

  async selectDeco(type: 'bg' | 'border' | 'prop' | 'clothes', id: string) {
    this.activeDeco[type] = id;
    try {
      await this.api.updateCoupleInfo({ pet_decorations: JSON.stringify(this.activeDeco) });
    } catch (e) {
      console.error('Error saving decoration', e);
    }
  }

  openNameEdit() {
    this.tempPetName = this.petName || '';
    this.showNameEdit = true;
  }

  async savePetName() {
    if (this.tempPetName && this.tempPetName.trim() !== '') {
      this.petName = this.tempPetName.trim();
      this.showNameEdit = false;
      try {
        await this.api.updateCoupleInfo({ pet_name: this.petName });
      } catch (e) {
        console.error('Error saving pet name', e);
      }
    }
  }

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

  private clickInput: any = null;

  private initRive(canvasEl: HTMLCanvasElement) {
    if (this.riveInstance) {
      this.riveInstance.cleanup();
    }
    
    this.riveInstance = new Rive({
      src: '/assets/pets/egg.riv',
      canvas: canvasEl,
      autoplay: true,
      stateMachines: 'State Machine 1',
      layout: new Layout({
        fit: Fit.Cover,
        alignment: Alignment.Center
      }),
      onLoad: () => {
        this.riveInstance?.resizeDrawingSurfaceToCanvas();
        
        const stateMachineNames = this.riveInstance?.stateMachineNames;
        if (stateMachineNames && stateMachineNames.length > 0) {
          this.riveInstance?.play(stateMachineNames);
          
          const smName = stateMachineNames[0];
          const inputs = this.riveInstance?.stateMachineInputs(smName);
          if (inputs) {
            this.clickInput = inputs.find(i => i.name === 'Butten click');
          }
        }
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
    if (this.modalLottiePlayer && this.modalLottiePlayer.nativeElement && this.modalLottiePlayer.nativeElement.load) {
       this.modalLottiePlayer.nativeElement.load(this.currentLottieSrc);
    }
  }

  onPointerDown(event: Event) {
    if (this.isEgg && this.streakDays === 0) return; // Nada si falta racha
    this.isLongPress = false;
    this.pressTimeout = setTimeout(() => {
      this.isLongPress = true;
      if (!this.isEgg) {
        this.openInteractModal();
      }
    }, 500); // 500ms para mantener pulsado
  }

  onPointerUp(event: Event) {
    clearTimeout(this.pressTimeout);
    if (!this.isLongPress) {
      this.onPetTap();
    }
  }

  onPointerCancel(event: Event) {
    clearTimeout(this.pressTimeout);
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

    // Ya eclosionado: Interacción rápida
    if (!this.isEgg) {
      const happyState = Math.random() > 0.5 ? 'happy' : 'heart';
      this.setLottieState(happyState);
      this.currentEmotion = happyState === 'happy' ? 'Feliz' : 'Amoroso';

      if (this.interactionTimeout) {
        clearTimeout(this.interactionTimeout);
      }

      this.interactionTimeout = setTimeout(() => {
        this.setLottieState('neutral');
        this.currentEmotion = 'Tranquilo';
      }, 2500);
    }
  }

  openInteractModal() {
    this.showInteractModal = true;
  }

  closeInteractModal() {
    this.showInteractModal = false;
  }

  doAction(action: string) {
    if (this.interactionTimeout) {
      clearTimeout(this.interactionTimeout);
    }

    if (action === 'feed') {
      this.setLottieState('happy');
      this.currentEmotion = '¡Lleno y Feliz! 🍖';
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#ff9f1c', '#ffffff'] });
    } else if (action === 'play') {
      this.setLottieState('happy');
      this.currentEmotion = '¡Divertido! 🎾';
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#2ecc71', '#ffffff'] });
    } else if (action === 'pet') {
      this.setLottieState('heart');
      this.currentEmotion = 'Mimoso ❤️';
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#ff4d6d', '#ffffff'] });
    } else if (action === 'sleep') {
      this.setLottieState('sleeping');
      this.currentEmotion = 'Zzz... 💤';
    }

    this.interactionTimeout = setTimeout(() => {
      this.setLottieState('neutral');
      this.currentEmotion = 'Tranquilo';
    }, 4000);
  }

  onCanvasClick() {
    // Si la mascota ya nació, cualquier tap en la pantalla cierra el modal y emite el evento
    if (this.hatchedPet) {
      this.closeModal();
      this.petHatched.emit(this.hatchedPet);
      return;
    }

    // NUNCA bloqueamos los clicks hacia Rive, para que el usuario pueda hacer click rápido
    // y Rive reciba todos los eventos necesarios para explotar.
    if (this.clickInput) {
      this.clickInput.fire();
    }

    this.clickCount++;
    
    // Mensajes para guiar al usuario
    if (this.clickCount === 1) this.tapHintText = '¡Sigue tocando!';
    if (this.clickCount === 2) this.tapHintText = '¡Un poco más!';
    if (this.clickCount === 3) this.tapHintText = '¡Va a explotar!';

    // Asumimos que al 4º o 5º toque explota. 
    // Disparamos la aparición de la mascota SOLO la primera vez que pasamos por 4
    if (this.clickCount === 4) {
      this.hatchingInProgress = true;
      this.tapHintText = ''; // Ocultamos el texto para que se vea bien la explosión
      
      // Le damos 2 segundos enteros para que termine la explosión de Rive antes de soltar al gato
      setTimeout(() => {
        this.executeHatch();
      }, 2000);
    }
  }

  async executeHatch() {
    try {
      const res = await this.api.hatchPet();
      const newPet = res.pet;

      this.hatchedPet = newPet;
      this.lottieSrc = `/assets/pets/${newPet.type}_hello.lottie`;
      
      // Confeti full
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#ff4d6d', '#ffca3a', '#8b5cf6', '#ffffff']
      });

      const rarityText = newPet.rarity === 'legendario' ? '⭐ LEGENDARIO ⭐' : (newPet.rarity === 'raro' ? '✨ RARO ✨' : 'Común');
      const petName = newPet.type === 'Dog' ? 'Perrito' : 'Gatito';
      this.tapHintText = `¡Es un ${petName} ${rarityText}!<br><span style="font-size: 0.95rem; font-weight: normal; opacity: 0.85;">👆 Toca para continuar</span>`;
      
      // Ya no mostramos un Alert, la mascota está ahí en la pantalla :)
      
    } catch (e) {
      console.error("Error al eclosionar mascota", e);
      this.hatchingInProgress = false;
      this.clickCount = 0;
      this.tapHintText = '👆 Toca para romper el cascarón';
      this.showHatchModal = false;
    }
  }

  closeModal() {
    this.showHatchModal = false;
    
    // Forzar el cierre nativo del modal por si el binding de Angular falla
    if (this.modal) {
      this.modal.dismiss();
    }
    
    // Retrasar la limpieza para que el modal tenga tiempo de hacer la animación de salida
    // sin que desaparezca la mascota bruscamente
    setTimeout(() => {
      this.clickCount = 0;
      this.hatchedPet = null;
      this.hatchingInProgress = false;
      this.tapHintText = '👆 Toca para romper el cascarón';
      this.cleanupRive();
    }, 400);
  }

  ngOnDestroy() {
    this.cleanupRive();
    if (this.interactionTimeout) {
      clearTimeout(this.interactionTimeout);
    }
  }
}
