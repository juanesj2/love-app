import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, OnDestroy, CUSTOM_ELEMENTS_SCHEMA, Output, EventEmitter, inject, HostListener } from '@angular/core';
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
            <canvas #riveCanvas class="egg-canvas" [style.opacity]="hatchedPet ? 0 : 1" style="transition: opacity 0.5s ease;"></canvas>
            
            <!-- Mascota (Lottie) sobre el cascarón roto -->
            <div class="pet-overlay" *ngIf="hatchedPet">
               <dotlottie-player
                  *ngIf="lottieSrc"
                  [src]="lottieSrc"
                  autoplay
                  [loop]="false"
                  style="width: 350px; height: 350px;">
               </dotlottie-player>
            </div>

            <!-- Capa transparente para interceptar los clicks -->
            <div class="click-overlay" (click)="onCanvasClick()"></div>
          </div>
          
          <div class="tap-hint" *ngIf="!hatchingInProgress || hatchedPet" [innerHTML]="tapHintText"></div>
          
          <div class="duplicate-actions" *ngIf="isDuplicatePet" style="position: absolute; bottom: 15%; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 12px; z-index: 20;">
            <button style="padding: 15px 30px; border-radius: 25px; background: white; color: #590D22; font-weight: bold; font-size: 1.1rem; border: none; box-shadow: 0 4px 15px rgba(0,0,0,0.2);" (click)="resolveDuplicate('sell')">
              💰 Vender por 7 Monedas
            </button>
            <button *ngIf="canEvolvePet" style="padding: 15px 30px; border-radius: 25px; background: linear-gradient(135deg, #ffca3a, #ff9e00); color: white; font-weight: bold; font-size: 1.1rem; border: none; box-shadow: 0 4px 15px rgba(0,0,0,0.2);" (click)="resolveDuplicate('evolve')">
              ✨ Evolucionar Mascota
            </button>
          </div>
          <!-- Botón de cierre sutil en la esquina superior -->
          <div class="close-icon" *ngIf="(!hatchingInProgress && !hatchedPet) || (hatchedPet && !isDuplicatePet)" (click)="closeModal()">✕</div>
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
              <div class="interact-header" style="position: relative; margin-bottom: 30px; display: flex; justify-content: center; align-items: center;">
                <button class="close-btn" style="position: absolute; top: -10px; left: -10px;" (click)="showShop = false">
                  <span style="font-size: 1.2rem;">←</span>
                </button>
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
                  <ng-container *ngFor="let userId of getClothesUserIds()">
                    <div class="clothing-layer" [ngStyle]="getClothesStyle('shop', userId)">{{ getClothesEmoji(userId) }}</div>
                  </ng-container>
                </div>
              </div>

              <div class="shop-section">
                <h4>Fondos</h4>
                <div class="shop-grid">
                  <div class="shop-item" *ngFor="let opt of bgOptions" 
                       [class.active]="activeDeco.bg === opt.id"
                       [class.locked]="!ownedDecorations.includes(opt.id) && opt.coinPrice > 0"
                       (click)="selectDeco('bg', opt.id, opt.coinPrice)">
                    <div class="preview-circle" [style.background]="opt.style || '#f4f5f8'">
                      <span *ngIf="!ownedDecorations.includes(opt.id) && opt.coinPrice > 0" class="lock-icon">🔒</span>
                    </div>
                    <span>{{ opt.name }}<br><small *ngIf="opt.coinPrice">{{opt.coinPrice}} 🪙</small></span>
                  </div>
                </div>
              </div>

              <div class="shop-section">
                <h4>Bordes</h4>
                <div class="shop-grid">
                  <div class="shop-item" *ngFor="let opt of borderOptions" 
                       [class.active]="activeDeco.border === opt.id"
                       [class.locked]="!ownedDecorations.includes(opt.id) && opt.coinPrice > 0"
                       (click)="selectDeco('border', opt.id, opt.coinPrice)">
                    <div class="preview-border-wrapper" [ngStyle]="getPreviewBorderWrapperStyles(opt)">
                      <div class="preview-circle" [style.border]="opt.style" [style.box-shadow]="opt.shadow">
                        <span *ngIf="!ownedDecorations.includes(opt.id) && opt.coinPrice > 0" class="lock-icon">🔒</span>
                      </div>
                    </div>
                    <span>{{ opt.name }}<br><small *ngIf="opt.coinPrice">{{opt.coinPrice}} 🪙</small></span>
                  </div>
                </div>
              </div>

              <div class="shop-section">
                <h4>Accesorios</h4>
                <div class="shop-grid">
                  <div class="shop-item" *ngFor="let opt of propOptions" 
                       [class.active]="activeDeco.prop === opt.id"
                       [class.locked]="!ownedDecorations.includes(opt.id) && opt.coinPrice > 0"
                       (click)="selectDeco('prop', opt.id, opt.coinPrice)">
                    <div class="preview-circle" style="display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background-size: cover; background-position: center; position: relative;"
                         [style.background]="opt.image || 'white'">
                      <span *ngIf="!opt.image">{{ opt.emoji || '?' }}</span>
                      <span *ngIf="!ownedDecorations.includes(opt.id) && opt.coinPrice > 0" class="lock-icon" style="position: absolute; font-size: 1.2rem;">🔒</span>
                    </div>
                    <span>{{ opt.name }}<br><small *ngIf="opt.coinPrice">{{opt.coinPrice}} 🪙</small></span>
                  </div>
                </div>
              </div>

              <div class="shop-section">
                <h4>Ropa / Pegatinas</h4>
                <div class="shop-grid">
                  <div class="shop-item" *ngFor="let opt of clothesOptions" 
                       [class.active]="activeDeco.clothes?.[myUserId]?.id === opt.id || (opt.id === 'none' && !activeDeco.clothes?.[myUserId])"
                       [class.locked]="!ownedDecorations.includes(opt.id) && opt.coinPrice > 0"
                       (click)="selectDeco('clothes', opt.id, opt.coinPrice)">
                    <div class="preview-circle" style="display: flex; align-items: center; justify-content: center; font-size: 1.5rem; position: relative;">
                      {{ opt.emoji || '?' }}
                      <span *ngIf="!ownedDecorations.includes(opt.id) && opt.coinPrice > 0" class="lock-icon" style="position: absolute; font-size: 1.2rem;">🔒</span>
                    </div>
                    <span>{{ opt.name }}<br><small *ngIf="opt.coinPrice">{{opt.coinPrice}} 🪙</small></span>
                  </div>
                </div>
              </div>

              <div class="shop-section" *ngIf="activeDeco.clothes?.[myUserId] && activeDeco.clothes?.[myUserId].id !== 'none'">
                <h4>Tamaño de la Pegatina</h4>
                <div style="display: flex; align-items: center; gap: 15px; padding: 10px 20px; background: rgba(0,0,0,0.03); border-radius: 15px; margin-top: 10px;">
                  <span style="font-size: 1.2rem;">➖</span>
                  <input type="range" min="0.3" max="4" step="0.1" style="flex: 1; accent-color: #ff4d6d;"
                         [value]="activeDeco.clothes[myUserId].scale || 1"
                         (input)="updateLocalScale($event)"
                         (change)="saveScale()">
                  <span style="font-size: 1.5rem;">➕</span>
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
                  <ng-container *ngFor="let userId of getClothesUserIds()">
                    <div class="clothing-layer" 
                         [class.draggable]="userId === myUserId"
                         [class.dragging]="isDraggingClothes && userId === myUserId"
                         [ngStyle]="getClothesStyle('modal', userId)" 
                         (mousedown)="userId === myUserId ? startDragClothes($event) : null"
                         (touchstart)="userId === myUserId ? startDragClothes($event) : null">
                      {{ getClothesEmoji(userId) }}
                    </div>
                  </ng-container>
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
              <div class="stats-panel">
                <div class="stat-row">
                  <span>Estado:</span>
                  <strong>{{ currentEmotion }}</strong>
                </div>
                <div class="stat-row">
                  <span>Nivel de amor:</span>
                  <strong>{{ streakDays * 10 }} XP</strong>
                </div>
                <div class="stat-row" style="cursor: pointer;" (click)="openStore.emit()">
                  <span>Monedas:</span>
                  <strong style="display: flex; align-items: center; gap: 4px; color: #FFCA3A;">
                    💰 {{ coins }}
                    <ion-icon name="add-circle" style="font-size: 1.2rem;"></ion-icon>
                  </strong>
                </div>
              </div>

              <div style="margin-top: 15px;">
                <button class="shop-btn-large" (click)="showShop = true">
                  🎨 Decorar Mascota
                </button>
              </div>

              <div class="shop-section" style="margin-top: 20px;">
                <h4>Huevos Sorpresa (Tienes: {{ eggs }})</h4>
                <div class="shop-grid">
                  <div class="shop-item" (click)="buyEgg()">
                    <div class="preview-circle" style="display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: #fff;">
                      🥚
                    </div>
                    <span>Comprar<br><small>10 Monedas</small></span>
                  </div>
                  <div class="shop-item" (click)="openEggFromShop()" *ngIf="eggs > 0">
                    <div class="preview-circle" style="display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: #fff; border-color: #ffca3a;">
                      ✨
                    </div>
                    <span>Abrir<br><small>Huevo</small></span>
                  </div>
                </div>
              </div>

              <div class="shop-section" *ngIf="pets.length > 0">
                <h4>Mis Mascotas</h4>
                <div class="shop-grid">
                  <div class="shop-item" *ngFor="let p of pets" (click)="changeActivePet(p.id)" [class.active]="p.is_active">
                    <div class="preview-circle" style="display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: #fff;">
                      {{ p.pet_type === 'dragon' ? '🐉' : (p.pet_type === 'cat' ? '🐱' : '🐶') }}
                    </div>
                    <span style="text-transform: capitalize;">{{ p.pet_type }}<br><small>Fase {{ p.evolution_phase }}</small></span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </ng-template>
    </ion-modal>

    <!-- DOOM MODAL -->
    <ion-modal [isOpen]="showDoomMode" (didDismiss)="showDoomMode = false" class="doom-modal">
      <ng-template>
        <div class="doom-easter-egg-full">
          <div class="doom-rotator">
            <div class="doom-header">
              <button class="doom-close-btn" (click)="showDoomMode = false">
                ← SALIR
              </button>
              <h3>DOOM</h3>
            </div>
            <iframe src="https://silentspacemarine.com/" allowfullscreen scrolling="no"></iframe>
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
      background: rgba(0, 0, 0, 0.7); /* Oscurecer el fondo para enfocar en el huevo */
      display: flex;
      flex-direction: column;
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

    .clothing-layer { position: absolute; pointer-events: none; z-index: 15; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2)); transition: all 0.3s ease; transform: translate(-50%, -50%); }
    .clothing-layer.draggable { pointer-events: auto; cursor: grab; touch-action: none; }
    .clothing-layer.dragging { transition: none !important; cursor: grabbing !important; transform: scale(1.1) translate(-50%, -50%); }


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
    .shop-item.locked { opacity: 0.4; cursor: not-allowed; }
    .shop-item.locked:active { transform: none; }
    .lock-icon { position: absolute; z-index: 2; font-size: 1.5rem; text-shadow: 0 0 5px rgba(0,0,0,0.5); }
    .preview-circle { position: relative; }
    
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

    .doom-easter-egg-full {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: black; overflow: hidden; z-index: 9999;
    }
    .doom-rotator {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; background: black;
    }
    .doom-header {
      position: relative; margin-bottom: 0; padding: 15px; background: #222; border-bottom: 2px solid #8b0000; border-radius: 0; display: flex; align-items: center; justify-content: center;
    }
    .doom-close-btn {
      position: absolute; left: 15px; background: #8b0000; color: white; border: none; padding: 8px 15px; border-radius: 5px; font-family: monospace; font-weight: bold; font-size: 1rem; cursor: pointer; z-index: 2000;
    }
    .doom-header h3 {
      margin: 0; color: #ff0000; font-family: monospace; font-size: 1.5rem; letter-spacing: 2px; text-shadow: 2px 2px 0px #550000;
    }
    .doom-rotator iframe {
      flex: 1; width: 100%; height: 100%; border: none; overflow: hidden;
    }
    ion-modal.doom-modal {
      --background: black;
      --width: 100%;
      --height: 100%;
      --border-radius: 0;
      --overflow: hidden;
    }

    @media screen and (orientation: portrait) {
      .doom-rotator {
        top: 50%;
        left: 50%;
        width: 800px;
        height: 600px;
        transform: translate(-50%, -50%) rotate(90deg) scale(0.55);
        transform-origin: center center;
      }
    }
  `]
})
export class StreakPetComponent implements OnChanges, OnDestroy {
  @Input() streakDays: number = 0;
  @Input() coupleId: number = 0;
  @Input() petData: any = null;
  @Input() petName: string | null = null;
  @Input() coins: number = 0;
  @Input() eggs: number = 0;
  @Input() unlockedPets: string[] = [];
  @Input() pets: any[] = [];
  @Input() ownedDecorations: string[] = [];
  @Output() openStore = new EventEmitter<void>();
  @Input() set decorations(val: any) {
    let parsed: any = {};
    if (typeof val === 'string') {
      try { parsed = JSON.parse(val); } catch(e) {}
    } else {
      parsed = val || {};
    }
    
    // Migration: if clothes is a string, migrate it to the current user
    if (parsed && typeof parsed.clothes === 'string') {
       if (parsed.clothes !== 'none') {
         const oldClothes = parsed.clothes;
         const oldTop = parsed.clothes_top;
         const oldLeft = parsed.clothes_left;
         parsed.clothes = {
           [this.myUserId]: { id: oldClothes, top: oldTop, left: oldLeft }
         };
       } else {
         parsed.clothes = {};
       }
       delete parsed.clothes_top;
       delete parsed.clothes_left;
    }
    if (parsed && !parsed.clothes) parsed.clothes = {};
    
    this.activeDeco = parsed;
  }

  @Output() petHatched = new EventEmitter<any>();

  @Output() activePetChanged = new EventEmitter<any>();

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
  public petType: 'Dog' | 'Cat' | 'Dragon' = 'Dog';
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
  public isDuplicatePet = false;
  public canEvolvePet = false;
  public duplicatePetType = '';

  private interactionTimeout: any;

  public showShop = false;
  public showNameEdit = false;
  public tempPetName = '';
  public activeDeco: any = {};

  public bgOptions = [
    { id: 'none', name: 'Original', style: 'none', coinPrice: 0 },
    { id: 'forest', name: 'Bosque', style: 'url("/assets/pets/bg/forest.jpg") center/cover', coinPrice: 50 },
    { id: 'night', name: 'Noche', style: 'url("/assets/pets/bg/night.jpg") center/cover', coinPrice: 50 },
    { id: 'royal', name: 'Real', style: 'url("/assets/pets/bg/room.jpg") center/cover', coinPrice: 50 },
    { id: 'car', name: 'Coche', style: 'url("/assets/pets/bg/car.jpg") center/cover', coinPrice: 50 }
  ];

  public borderOptions = [
    { id: 'none', name: 'Ninguno', style: 'none', coinPrice: 0 },
    { id: 'gold', name: 'Oro', style: '4px solid #ffd700', shadow: '0 0 15px rgba(255,215,0,0.6)', coinPrice: 50 },
    { id: 'neon', name: 'Neón', style: '3px solid #00f3ff', shadow: '0 0 15px #00f3ff, inset 0 0 10px #00f3ff', coinPrice: 50 },
    { id: 'love', name: 'Amor', style: '4px dashed #ff4d6d', coinPrice: 0 },
    { id: 'wood', name: 'Madera', bgImage: 'url("/assets/pets/border/wood.jpg") center/cover', padding: '12px', shadow: '0 4px 15px rgba(0,0,0,0.3)', coinPrice: 50 },
    { id: 'galaxy', name: 'Galaxia', bgImage: 'url("/assets/pets/border/galaxy.jpg") center/cover', padding: '10px', shadow: '0 0 20px #8b5cf6', coinPrice: 50 },
    { id: 'rainbow', name: 'Arcoíris', bgImage: 'url("/assets/pets/border/rainbow.jpg") center/cover', padding: '10px', coinPrice: 50 },
    { id: 'water', name: 'Agua', bgImage: 'url("/assets/pets/border/water.jpg") center/cover', padding: '10px', coinPrice: 50 }
  ];

  public propOptions = [
    { id: 'none', name: 'Nada', emoji: '', coinPrice: 0 },
    { id: 'crown', name: 'Corona', image: 'url("/assets/pets/prop/crown.jpg") center/cover', coinPrice: 50 },
    { id: 'star', name: 'Estrellas', image: 'url("/assets/pets/prop/star.jpg") center/cover', coinPrice: 50 },
    { id: 'bow', name: 'Lazo', image: 'url("/assets/pets/prop/bow.jpg") center/cover', coinPrice: 50 },
    { id: 'heart', name: 'Corazón', image: 'url("/assets/pets/prop/heart.jpg") center/cover', coinPrice: 50 }
  ];

  public clothesOptions = [
    { id: 'none', name: 'Nada', emoji: '', coinPrice: 0 },
    { id: 'glasses', name: 'Gafas', emoji: '🕶️', style: { top: '35%', left: '33%', fontSize: '3rem' }, coinPrice: 50 },
    { id: 'hat', name: 'Sombrero', emoji: '🎩', style: { top: '5%', left: '42%', fontSize: '3.5rem' }, coinPrice: 50 },
    { id: 'scarf', name: 'Bufanda', emoji: '🧣', style: { top: '55%', left: '33%', fontSize: '3.5rem' }, coinPrice: 50 },
    { id: 'bowtie', name: 'Pajarita', emoji: '🎀', style: { top: '65%', left: '38%', fontSize: '2.5rem' }, coinPrice: 50 },
    { id: 'flower', name: 'Flor', emoji: '🌻', style: { top: '25%', left: '60%', fontSize: '2.5rem' }, coinPrice: 50 }
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

  get myUserId(): string {
    return localStorage.getItem('my_user_id') || 'unknown';
  }

  getClothesUserIds(): string[] {
    if (!this.activeDeco.clothes || typeof this.activeDeco.clothes !== 'object') return [];
    return Object.keys(this.activeDeco.clothes);
  }

  getClothesEmoji(userId: string = this.myUserId) {
    const userClothes = this.activeDeco.clothes?.[userId];
    if (!userClothes) return '';
    const item = this.clothesOptions.find(c => c.id === userClothes.id);
    return item ? item.emoji : '';
  }

  getClothesStyle(context: 'shop' | 'modal', userId: string = this.myUserId) {
    const userClothes = this.activeDeco.clothes?.[userId];
    if (!userClothes) return { display: 'none' };

    const item = this.clothesOptions.find(c => c.id === userClothes.id);
    if (!item || !item.emoji || !item.style) return { display: 'none' };
    
    let baseScale = context === 'shop' ? 0.8 : 1;
    let stickerScale = userClothes.scale || 1;
    
    let top = userClothes.top || item.style.top;
    let left = userClothes.left || item.style.left;

    if (context === 'modal' && this.isDraggingClothes && userId === this.myUserId) {
      if (this.currentDragTop !== null && this.currentDragLeft !== null) {
        top = `${this.currentDragTop}%`;
        left = `${this.currentDragLeft}%`;
      }
      if (this.currentScale !== null) {
        stickerScale = this.currentScale;
      }
    }
    
    return {
      top: top,
      left: left,
      fontSize: `calc(${item.style.fontSize} * ${baseScale * stickerScale})`
    };
  }

  isDraggingClothes = false;
  isPinching = false;
  initialPinchDistance = 0;
  startScale = 1;
  dragStartX = 0;
  dragStartY = 0;
  startLeftPercent = 0;
  startTopPercent = 0;
  currentDragLeft: number | null = null;
  currentDragTop: number | null = null;
  currentScale: number | null = null;
  
  showDoomMode: boolean = false;

  startDragClothes(event: MouseEvent | TouchEvent) {
    const myClothes = this.activeDeco.clothes?.[this.myUserId];
    if (!myClothes || myClothes.id === 'none') return;
    
    if (event.cancelable) event.preventDefault();
    this.isDraggingClothes = true;
    
    const item = this.clothesOptions.find(c => c.id === myClothes.id);
    const savedLeft = myClothes.left || item?.style?.left || '50%';
    const savedTop = myClothes.top || item?.style?.top || '50%';
    this.startLeftPercent = parseFloat(savedLeft);
    this.startTopPercent = parseFloat(savedTop);
    
    this.startScale = myClothes.scale || 1;
    this.currentScale = this.startScale;

    if (window.TouchEvent && event instanceof TouchEvent && event.touches.length === 2) {
      this.isPinching = true;
      const t1 = event.touches[0];
      const t2 = event.touches[1];
      this.initialPinchDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    } else {
      this.isPinching = false;
      if (window.TouchEvent && event instanceof TouchEvent) {
        this.dragStartX = event.touches[0].clientX;
        this.dragStartY = event.touches[0].clientY;
      } else {
        this.dragStartX = (event as MouseEvent).clientX;
        this.dragStartY = (event as MouseEvent).clientY;
      }
      this.currentDragLeft = this.startLeftPercent;
      this.currentDragTop = this.startTopPercent;
    }
  }

  @HostListener('document:mousemove', ['$event'])
  @HostListener('document:touchmove', ['$event'])
  onPointerMove(event: MouseEvent | TouchEvent) {
    if (!this.isDraggingClothes) return;
    
    if (window.TouchEvent && event instanceof TouchEvent && event.touches.length === 2) {
      if (!this.isPinching) {
        this.isPinching = true;
        const t1 = event.touches[0];
        const t2 = event.touches[1];
        this.initialPinchDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const myClothes = this.activeDeco.clothes?.[this.myUserId];
        this.startScale = myClothes?.scale || 1;
        this.currentScale = this.startScale;
      } else {
        const t1 = event.touches[0];
        const t2 = event.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const delta = dist / this.initialPinchDistance;
        this.currentScale = Math.max(0.3, Math.min(4, this.startScale * delta));
      }
      return;
    }
    
    this.isPinching = false;
    let clientX, clientY;
    if (window.TouchEvent && event instanceof TouchEvent) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = (event as MouseEvent).clientX;
      clientY = (event as MouseEvent).clientY;
    }
    
    const deltaX = clientX - this.dragStartX;
    const deltaY = clientY - this.dragStartY;
    
    const deltaPercentX = (deltaX / 220) * 100;
    const deltaPercentY = (deltaY / 220) * 100;
    
    this.currentDragLeft = this.startLeftPercent + deltaPercentX;
    this.currentDragTop = this.startTopPercent + deltaPercentY;
  }

  @HostListener('document:wheel', ['$event'])
  onWheel(event: WheelEvent) {
    if (!this.isDraggingClothes) return;
    event.preventDefault();
    const myClothes = this.activeDeco.clothes?.[this.myUserId];
    if (!myClothes) return;
    
    const current = this.currentScale !== null ? this.currentScale : (myClothes.scale || 1);
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    this.currentScale = Math.max(0.3, Math.min(4, current + delta));
  }

  @HostListener('document:mouseup', ['$event'])
  @HostListener('document:touchend', ['$event'])
  async onPointerUpGlobal(event: MouseEvent | TouchEvent) {
    if (!this.isDraggingClothes) return;
    this.isDraggingClothes = false;
    this.isPinching = false;
    
    if (this.currentDragLeft !== null || this.currentDragTop !== null || this.currentScale !== null) {
      if (!this.activeDeco.clothes) this.activeDeco.clothes = {};
      if (!this.activeDeco.clothes[this.myUserId]) {
         this.activeDeco.clothes[this.myUserId] = { id: 'none' };
      }
      
      if (this.currentDragLeft !== null) this.activeDeco.clothes[this.myUserId].left = `${this.currentDragLeft}%`;
      if (this.currentDragTop !== null) this.activeDeco.clothes[this.myUserId].top = `${this.currentDragTop}%`;
      if (this.currentScale !== null) this.activeDeco.clothes[this.myUserId].scale = this.currentScale;
      
      this.currentDragLeft = null;
      this.currentDragTop = null;
      this.currentScale = null;
      
      try {
        await this.api.updateCoupleInfo({ pet_decorations: JSON.stringify(this.activeDeco) });
      } catch (e) {
        console.error('Error saving clothes position/scale', e);
      }
    }
  }

  updateLocalScale(event: any) {
    if (this.activeDeco.clothes && this.activeDeco.clothes[this.myUserId]) {
      this.activeDeco.clothes[this.myUserId].scale = parseFloat(event.target.value);
    }
  }

  async saveScale() {
    try {
      await this.api.updateCoupleInfo({ pet_decorations: JSON.stringify(this.activeDeco) });
    } catch (e) {
      console.error('Error saving scale', e);
    }
  }

  async selectDeco(type: 'bg' | 'border' | 'prop' | 'clothes', id: string, coinPrice?: number) {
    if (coinPrice && coinPrice > 0 && !this.ownedDecorations.includes(id)) {
      if (this.coins < coinPrice) {
        const alert = await this.alertCtrl.create({
          header: '¡Monedas Insuficientes!',
          message: `Necesitas ${coinPrice} monedas para comprar esto.`,
          buttons: ['Vale'],
          cssClass: 'custom-alert'
        });
        await alert.present();
        return;
      }
      
      const confirm = await this.alertCtrl.create({
        header: 'Comprar Accesorio',
        message: `¿Quieres comprar esto por ${coinPrice} monedas?`,
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          { text: 'Comprar', handler: async () => {
              try {
                const res = await this.api.buyPetDecoration(id, coinPrice);
                if (res.coins !== undefined) this.coins = res.coins;
                if (res.owned_decorations) this.ownedDecorations = res.owned_decorations;
                this.applyDeco(type, id);
              } catch (e) {
                console.error(e);
              }
            } 
          }
        ],
        cssClass: 'custom-alert'
      });
      await confirm.present();
      return;
    }

    this.applyDeco(type, id);
  }

  async applyDeco(type: 'bg' | 'border' | 'prop' | 'clothes', id: string) {
    if (type === 'clothes') {
      if (!this.activeDeco.clothes) this.activeDeco.clothes = {};
      
      if (id === 'none') {
        delete this.activeDeco.clothes[this.myUserId];
      } else {
        const item = this.clothesOptions.find(c => c.id === id);
        this.activeDeco.clothes[this.myUserId] = {
          id: id,
          top: item?.style?.top || '50%',
          left: item?.style?.left || '50%'
        };
      }
    } else {
      this.activeDeco[type] = id;
    }

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
      const newName = this.tempPetName.trim();
      
      // EASTER EGG CHECK
      if (newName.toUpperCase() === 'DOOM') {
        this.showDoomMode = true;
        this.showNameEdit = false;
        this.tempPetName = '';
        this.api.unlockAchievement('secret_doom').catch(e => console.error(e));
        return;
      }
      
      this.petName = newName;
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
    if (this.streakDays === 0 || !this.petData) {
      this.isEgg = true;
      this.rarityClass = '';
    } else {
      this.isEgg = false;
      this.cleanupRive();
      
      let pType = this.petData.pet_type || this.petData.type;
      if (pType) {
        pType = pType.toLowerCase();
        this.petType = pType === 'cat' ? 'Cat' : (pType === 'dog' ? 'Dog' : 'Dragon');
      } else {
        this.petType = 'Dog';
      }
      
      this.rarityClass = ''; 

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
    let typeStr = this.petType.toLowerCase();
    
    // Si es un dragón, dependemos de la fase de evolución
    if (typeStr === 'dragon' && this.petData && this.petData.evolution_phase > 1) {
      return `dragon_fase${this.petData.evolution_phase}_${state}`;
    }
    
    // Convertir el estado genérico (neutral, happy, etc.) a los archivos que tenemos
    if (typeStr === 'cat') {
      switch(state) {
        case 'neutral': return 'Cat_sleeping';
        case 'happy': return 'Cat_riendo';
        case 'heart': return 'Cat_heart';
        case 'sleeping': return 'Cat_sleeping';
        default: return 'Cat_sleeping';
      }
    } else if (typeStr === 'dog') {
      switch(state) {
        case 'neutral': return 'Dog_neutral';
        case 'happy': return 'Dog_happy';
        case 'heart': return 'Dog_happy';
        case 'angry': return 'Dog_angry';
        case 'sleeping': return 'Dog_neutral';
        default: return 'Dog_neutral';
      }
    }
    
    // Default fallback (dragon_neutral, dragon_happy, etc.)
    return `${typeStr}_${state}`;
  }

  private setLottieState(state: 'neutral' | 'happy' | 'heart' | 'sleeping') {
    if (this.isEgg) return;

    const filename = this.getLottieFileName(state);
    const newLottieSrc = `/assets/pets/${filename}.lottie`;
    
    if (this.currentLottieSrc !== newLottieSrc) {
      this.currentLottieSrc = newLottieSrc;
      if (this.lottiePlayer && this.lottiePlayer.nativeElement && this.lottiePlayer.nativeElement.load) {
        this.lottiePlayer.nativeElement.load(this.currentLottieSrc);
      }
      if (this.modalLottiePlayer && this.modalLottiePlayer.nativeElement && this.modalLottiePlayer.nativeElement.load) {
        this.modalLottiePlayer.nativeElement.load(this.currentLottieSrc);
      }
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
      if (this.riveInstance) {
        this.riveInstance.pause();
      }

      const res = await this.api.openEgg();
      
      this.eggs = (res as any).eggs_remaining ?? (this.eggs - 1);
      
      if (res.status === 'new') {
        const newPet = res.pet;
        this.hatchedPet = newPet;
        this.isDuplicatePet = false;
        
        const capitalizedType = newPet.pet_type.charAt(0).toUpperCase() + newPet.pet_type.slice(1).toLowerCase();
        let lottieFile = `${capitalizedType}_hello.lottie`;
        if (newPet.pet_type === 'dragon' && newPet.evolution_phase > 1) {
           lottieFile = `Dragon_fase${newPet.evolution_phase}_hello.lottie`;
        }
        this.lottieSrc = `/assets/pets/${lottieFile}`;
        
        // Confeti full
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#ff4d6d', '#ffca3a', '#8b5cf6', '#ffffff']
        });

        const petName = newPet.pet_type === 'dog' ? 'Perrito' : (newPet.pet_type === 'cat' ? 'Gatito' : 'Dragón');
        this.tapHintText = `¡Es un ${petName}!<br><span style="font-size: 0.95rem; font-weight: normal; opacity: 0.85;">👆 Toca para continuar</span>`;
      } else if (res.status === 'duplicate') {
        this.hatchedPet = { pet_type: res.pet_type };
        this.isDuplicatePet = true;
        this.canEvolvePet = res.can_evolve;
        this.duplicatePetType = res.pet_type;
        
        const duplicateCapitalized = res.pet_type.charAt(0).toUpperCase() + res.pet_type.slice(1).toLowerCase();
        this.lottieSrc = `/assets/pets/${duplicateCapitalized}_hello.lottie`;
        
        const petName = res.pet_type === 'dog' ? 'Perrito' : (res.pet_type === 'cat' ? 'Gatito' : 'Dragón');
        this.tapHintText = `¡Vaya! Ya tienes este ${petName}. ¿Qué quieres hacer?`;
      }
      
    } catch (e) {
      console.error("Error al eclosionar mascota", e);
      this.hatchingInProgress = false;
      this.clickCount = 0;
      this.tapHintText = '👆 Toca para romper el cascarón';
      this.showHatchModal = false;
    }
  }

  async resolveDuplicate(action: 'evolve' | 'sell') {
    try {
      const alert = await this.alertCtrl.create({
        header: 'Procesando...',
        backdropDismiss: false
      });
      await alert.present();

      const res: any = await this.api.resolveDuplicatePet(this.duplicatePetType, action);
      await alert.dismiss();
      if (res.inventory) {
        this.coins = res.inventory.coins;
      }
      if (res.pets) {
        this.pets = res.pets;
      }
      
      const success = await this.alertCtrl.create({
        header: action === 'sell' ? 'Vendido' : 'Evolucionado',
        message: action === 'sell' ? 'Has recibido 7 monedas.' : '¡Tu mascota ha evolucionado a la siguiente fase!',
        buttons: ['Genial'],
        cssClass: 'custom-alert'
      });
      await success.present();
      
      this.closeModal();
    } catch (e: any) {
      this.alertCtrl.dismiss().catch(() => {});
      const errorAlert = await this.alertCtrl.create({
        header: 'Error',
        message: e.error?.error || 'Hubo un error al procesar la mascota.',
        buttons: ['Vale'],
        cssClass: 'custom-alert'
      });
      await errorAlert.present();
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
      this.isDuplicatePet = false;
      this.hatchingInProgress = false;
      this.tapHintText = '👆 Toca para romper el cascarón';
      this.cleanupRive();
    }, 400);
  }

  openEggFromShop() {
    this.showHatchModal = true;
    this.showInteractModal = false;
  }
  
  async changeActivePet(petId: number) {
    try {
      const alert = await this.alertCtrl.create({
        header: 'Cambiando...',
        backdropDismiss: false
      });
      await alert.present();

      const res: any = await this.api.setActivePet(petId);
      await alert.dismiss();
      
      this.pets = res.pets;
      this.petData = res.pets.find((p: any) => p.is_active);
      this.activePetChanged.emit({ pets: this.pets, petData: this.petData });
      this.evaluateState();
      
    } catch (e: any) {
      this.alertCtrl.dismiss().catch(() => {});
    }
  }

  async buyEgg() {
    try {
      const alert = await this.alertCtrl.create({
        header: 'Comprando Huevo...',
        message: 'Añadiendo un huevo sorpresa a tu inventario...',
        backdropDismiss: false
      });
      await alert.present();

      const res: any = await this.api.buyEgg();
      await alert.dismiss();

      this.coins = res.inventory.coins;
      this.eggs = res.inventory.eggs;
      
      const successAlert = await this.alertCtrl.create({
        header: '¡Huevo Comprado!',
        message: `Has comprado un huevo sorpresa. ¡Abrelo desde la tienda! (Huevos: ${this.eggs})`,
        buttons: ['Genial'],
        cssClass: 'custom-alert'
      });
      await successAlert.present();

    } catch (e: any) {
      this.alertCtrl.dismiss().catch(() => {});
      const errorAlert = await this.alertCtrl.create({
        header: 'Error',
        message: e.error?.error || 'Hubo un error comprando el huevo.',
        buttons: ['Vale'],
        cssClass: 'custom-alert'
      });
      await errorAlert.present();
    }
  }

  ngOnDestroy() {
    this.cleanupRive();
    if (this.interactionTimeout) {
      clearTimeout(this.interactionTimeout);
    }
  }
}


