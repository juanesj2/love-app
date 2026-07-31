import { Component, inject, ViewChild, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { PluginListenerHandle } from '@capacitor/core';
import { IonContent, IonFooter, IonHeader, AlertController, ActionSheetController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ToastController, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { imagesOutline, images, chatbubblesOutline, chatbubbles, add, hourglassOutline, mapOutline, map, ellipsisHorizontalOutline, ellipsisHorizontal, heart, happyOutline, sadOutline, flameOutline, bedOutline, camera, image, close, eyeOutline, eyeOffOutline, eye, colorPalette, person } from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

import { LocationWidgetComponent } from '../widgets/location-widget/location-widget.component';
import { PhotoWidgetComponent } from '../widgets/photo-widget/photo-widget.component';
import { ChatWidgetComponent } from '../widgets/chat-widget/chat-widget.component';
import { ThemeService } from '../services/theme.service';
import { MasWidgetComponent } from '../widgets/mas-widget/mas-widget.component';
import { QuestionsWidgetComponent } from '../widgets/questions-widget/questions-widget.component';
import { LoveApiService } from '../services/love-api.service';
import { LocationService } from '../services/location.service';
import { TutorialService } from '../services/tutorial.service';
import { GlobalEventService } from '../services/global-event.service';
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import { PremiumService } from '../services/premium.service';
import { PaywallComponent } from '../components/paywall/paywall.component';
import { ModalController, Platform } from '@ionic/angular';
import { SecretStatsModalComponent } from '../widgets/mas-widget/secret-stats-modal.component';
import { StreakPetComponent } from '../components/streak-pet/streak-pet.component';

import { NotificationService } from '../services/notification.service';
import { PushNotifications } from '@capacitor/push-notifications';

@Component({
  selector: 'app-home',
  template: `
    <!-- ... html was here ... -->
    <ion-header class="ion-no-border" style="position: absolute; top: 0; width: 100%; background: transparent; z-index: 20; pointer-events: none;">
      <div class="custom-header" [class.hide-header]="selectedWidget === 'location'" style="pointer-events: auto;">
          <div class="bg-emojis-container" *ngIf="emojisToAnimate.length > 0">
            <div *ngFor="let anim of emojisToAnimate" 
                 class="bg-floating-emoji" 
                 [style.left.%]="anim.left" 
                 [style.animation-duration.s]="anim.duration" 
                 [style.animation-delay.s]="anim.delay">
              {{ anim.emoji }}
            </div>
          </div>
          
          <div class="avatar-container"
               (click)="onAvatarClick()"
               (pointerdown)="startGoldenPress()" (pointerup)="endGoldenPress()" (pointercancel)="endGoldenPress()" (pointerleave)="endGoldenPress()">
            <img *ngIf="myAvatarUrl" [src]="myAvatarUrl" class="avatar" [ngClass]="'frame-' + myAvatarFrame" [class.golden-frame]="hasGoldenFrame && myAvatarFrame === 'default'" />
            <div *ngIf="!myAvatarUrl" class="avatar my-avatar" [ngClass]="'frame-' + myAvatarFrame" [class.golden-frame]="hasGoldenFrame && myAvatarFrame === 'default'">Tú</div>
            <div class="mood-badge" *ngIf="myMood">{{ myMood }}</div>
          </div>

          <div class="header-center-actions">
            <!-- Streak Pet -->
            <app-streak-pet 
              [streakDays]="couple?.current_streak || 0" 
              [coupleId]="couple?.id"
              [petData]="couple?.inventory?.pet"
              (openStore)="openStoreModal()"
              [decorations]="couple?.pet_decorations"
              [petName]="couple?.pet_name"
              [coins]="couple?.inventory?.coins || 0"
              [unlockedPets]="couple?.inventory?.unlocked_pets || []"
              [ownedDecorations]="couple?.inventory?.owned_decorations || []"
              (petHatched)="onPetHatched($event)">
            </app-streak-pet>
            
            <div class="poke-btn"
              (click)="onPokeClick()"
              (pointerdown)="startPokeHold()" (pointerup)="endPokeHold()" (pointercancel)="endPokeHold()" (pointerleave)="endPokeHold()">
              <ion-icon name="heart" [class.poking]="pokeAnimation" [class.super-poking]="superPokeAnimation"></ion-icon>
            </div>

            <!-- Photo Widget Toggle Button -->
            <div class="menu-toggle-btn" 
                 [class.show]="selectedWidget === 'photo' && photoWidgetComp?.viewMode === 'feed' && !photoWidgetComp?.currentAlbum" 
                 (click)="photoWidgetComp?.toggleMenu()">
              <ion-icon *ngIf="selectedWidget === 'photo'" [name]="photoWidgetComp?.isTopBarHidden ? 'eye-outline' : 'eye-off-outline'"></ion-icon>
            </div>

            <!-- Chat Widget Settings Button -->
            <div class="menu-toggle-btn" 
                 [class.show]="selectedWidget === 'chat' && chatWidgetComp && chatWidgetComp.regularMessages.length > 0" 
                 (click)="chatWidgetComp?.openChatSettings()">
              <ion-icon name="color-palette"></ion-icon>
            </div>

            <!-- Spy Stats Button -->
            <div class="menu-toggle-btn" 
                 [class.show]="selectedWidget === 'mas' && hasSpyStatsUnlocked" 
                 (click)="openSpyStats()"
                 style="font-size: 1.5rem;">
              👻
            </div>

          </div>

          
          <div class="avatar-container partner-container"
               (pointerdown)="startSurprisePress()" (pointerup)="endSurprisePress()" (pointercancel)="endSurprisePress()" (pointerleave)="endSurprisePress()">
            <img *ngIf="partnerAvatarUrl" [src]="partnerAvatarUrl" class="avatar" [ngClass]="'frame-' + partnerAvatarFrame" />
            <div *ngIf="!partnerAvatarUrl" class="avatar partner-avatar" [ngClass]="'frame-' + partnerAvatarFrame">{{ partnerInitial }}</div>
            <div class="mood-badge" *ngIf="partnerMood">{{ partnerMood }}</div>
          </div>

        </div>
    </ion-header>

    <ion-content [scrollY]="false">

      <app-photo-widget *ngIf="selectedWidget === 'photo'" #photoWidget></app-photo-widget>
      <app-chat-widget *ngIf="selectedWidget === 'chat'" #chatWidget></app-chat-widget>
      <app-location-widget *ngIf="selectedWidget === 'location'" (poke)="sendPoke()" #locationWidget></app-location-widget>
      <app-mas-widget *ngIf="selectedWidget === 'mas'" (openGameEvent)="selectedWidget = 'game'" #masWidget></app-mas-widget>
      <app-questions-widget *ngIf="selectedWidget === 'game'" #gameWidget></app-questions-widget>
    </ion-content>

    <ion-footer class="custom-footer">
      <!-- Center Upload Button (moved outside tab bar to avoid WebKit backdrop-filter clip bug) -->
      <div class="floating-center-wrapper" (click)="takePicture()">
        <div class="plus-circle" [class.uploading]="uploading">
          <ion-icon name="add" *ngIf="!uploading"></ion-icon>
          <ion-icon name="hourglass-outline" *ngIf="uploading"></ion-icon>
        </div>
      </div>

      <div class="custom-tab-bar">
        <!-- Album -->
        <div id="tab-photo" class="tab-btn" (click)="selectTab('photo')" [class.active]="activeTab === 'photo'">
          <div style="position: relative; display: flex;">
            <ion-icon name="images-outline" *ngIf="activeTab !== 'photo'"></ion-icon>
            <ion-icon name="images" *ngIf="activeTab === 'photo'"></ion-icon>
            <div class="notification-badge" *ngIf="unreadPhoto"></div>
          </div>
          <span>Álbum</span>
        </div>
        
        <!-- Chat -->
        <div id="tab-chat" class="tab-btn" (click)="selectTab('chat')" [class.active]="activeTab === 'chat'">
          <div style="position: relative; display: flex;">
            <ion-icon name="chatbubbles-outline" *ngIf="activeTab !== 'chat'"></ion-icon>
            <ion-icon name="chatbubbles" *ngIf="activeTab === 'chat'"></ion-icon>
            <div class="notification-badge" *ngIf="unreadChat"></div>
          </div>
          <span>Chat</span>
        </div>
        
        <!-- Center Placeholder to keep flex space -->
        <div class="tab-btn center-btn" style="pointer-events: none;"></div>
        
        <!-- Map -->
        <div id="tab-map" class="tab-btn" (click)="selectTab('location')" [class.active]="activeTab === 'location'">
          <div style="position: relative; display: flex;">
            <ion-icon name="map-outline" *ngIf="activeTab !== 'location'"></ion-icon>
            <ion-icon name="map" *ngIf="activeTab === 'location'"></ion-icon>
            <div class="notification-badge" *ngIf="unreadMap"></div>
          </div>
          <span>Mapa</span>
        </div>
        
        <!-- Más -->
        <div id="tab-mas" class="tab-btn" (click)="selectTab('mas')" [class.active]="activeTab === 'mas'">
          <ion-icon name="ellipsis-horizontal-outline" *ngIf="activeTab !== 'mas'"></ion-icon>
          <ion-icon name="ellipsis-horizontal" *ngIf="activeTab === 'mas'"></ion-icon>
          <span>Más</span>
        </div>
      </div>
    </ion-footer>

    <!-- Upload Photo Modal -->
    <div class="home-overlay" *ngIf="pendingPhotoFile" (click)="cancelUpload()">
      <div class="prompt-sheet" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Nueva Foto ❤️</h2>
        </div>
        
        <div class="prompt-body">
          <div class="prompt-preview-container">
            <img [src]="pendingPhotoPreview" class="prompt-preview" />
          </div>
          <textarea class="premium-textarea" placeholder="Escribe algo bonito... (opcional)" [(ngModel)]="pendingPhotoText"></textarea>
        </div>
        
        <div class="prompt-actions">
          <button class="prompt-btn cancel" (click)="cancelUpload()" [disabled]="uploading">Cancelar</button>
          <button class="prompt-btn confirm" (click)="confirmUpload()" [disabled]="uploading">
            <span *ngIf="!uploading">Subir</span>
            <ion-spinner name="crescent" *ngIf="uploading"></ion-spinner>
          </button>
        </div>
      </div>
    </div>

    <!-- Surprise Modal -->
    <div class="home-overlay" *ngIf="showSurpriseModal" (click)="closeSurpriseModal()">
      <div class="prompt-sheet surprise-sheet" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>¡Notificación Sorpresa! 🎁</h2>
          <p style="color: #a08c92; font-size: 0.9rem; margin-top: 5px;">Mándale un aviso push al instante.</p>
        </div>
        
        <div class="prompt-body">
          <input type="text" class="premium-input" placeholder="Título (ej. Ábreme)" [(ngModel)]="surpriseTitle" />
          <textarea class="premium-textarea" placeholder="Mensaje..." [(ngModel)]="surpriseBody"></textarea>
        </div>
        
        <div class="prompt-actions">
          <button class="prompt-btn cancel" (click)="closeSurpriseModal()" [disabled]="sendingSurprise">Cancelar</button>
          <button class="prompt-btn confirm" (click)="sendSurprise()" [disabled]="sendingSurprise || !surpriseTitle || !surpriseBody">
            <span *ngIf="!sendingSurprise">Enviar 🔥</span>
            <ion-spinner name="crescent" *ngIf="sendingSurprise"></ion-spinner>
          </button>
        </div>
      </div>
    </div>

    <!-- Premium Countdown Modal -->
    <div class="home-overlay" *ngIf="showPremiumCountdownModal" (click)="closePremiumCountdown()">
      <div class="prompt-sheet surprise-sheet" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Amor Ilimitado ❤️</h2>
          <p style="color: #a08c92; font-size: 0.9rem; margin-top: 5px;">Tiempo restante de tu suscripción</p>
        </div>
        
        <div class="prompt-body" style="text-align: center;">
          <div *ngIf="premiumCountdown.expired" style="font-size: 1.1rem; color: #590D22; padding: 20px;">Tu suscripción ha caducado.</div>
          <div class="countdown-boxes" *ngIf="!premiumCountdown.expired">
            <div class="c-box"><span>{{ premiumCountdown.d }}</span><small>Días</small></div>
            <div class="c-box"><span>{{ premiumCountdown.h }}</span><small>Hrs</small></div>
            <div class="c-box"><span>{{ premiumCountdown.m }}</span><small>Min</small></div>
            <div class="c-box"><span>{{ premiumCountdown.s }}</span><small>Seg</small></div>
          </div>
        </div>
        
        <div class="prompt-actions">
          <button class="prompt-btn cancel" (click)="closePremiumCountdown()">Cerrar</button>
          <button class="prompt-btn confirm premium-gold-btn" (click)="managePremium()">
            <ion-icon name="star"></ion-icon> Gestionar
          </button>
        </div>
      </div>
    <!-- Modal de Tienda de Monedas y Premium -->
    <div class="modal-backdrop" *ngIf="showStoreModal" (click)="closeStoreModal()"></div>
    <div class="prompt-sheet store-sheet" [class.show]="showStoreModal">
      <div class="modal-header">
        <h2>Tienda y VIP 💎</h2>
      </div>
      
      <div class="prompt-body store-body">
        <div class="store-premium-banner" *ngIf="!isPremium">
          <div class="premium-icon-glow">
            <ion-icon name="star"></ion-icon>
          </div>
          <h3>Love App VIP</h3>
          <p>Desbloquea el Modo Noche, el Marco Dorado y consigue +10 Monedas mensuales.</p>
          <button class="store-btn premium-btn" (click)="subscribeToPremium()" [disabled]="buyingStore">
            Suscribirse - 2,99€/mes
          </button>
        </div>

        <div class="store-premium-banner active" *ngIf="isPremium">
          <div class="premium-icon-glow">
            <ion-icon name="star"></ion-icon>
          </div>
          <h3>Eres VIP ✨</h3>
          <p>Disfrutas del Modo Noche y Marco Dorado.</p>
        </div>
        
        <h3 class="store-section-title">Comprar Monedas</h3>
        
        <div class="coin-packs">
          <div class="coin-pack" (click)="buyCoinPack('small')">
            <div class="pack-icon">🪙</div>
            <div class="pack-amount">10</div>
            <div class="pack-price">1,00€</div>
          </div>
          
          <div class="coin-pack popular" (click)="buyCoinPack('medium')">
            <div class="popular-badge">Popular</div>
            <div class="pack-icon">💰</div>
            <div class="pack-amount">50</div>
            <div class="pack-price">5,00€</div>
          </div>
          
          <div class="coin-pack" (click)="buyCoinPack('large')">
            <div class="pack-icon">💎</div>
            <div class="pack-amount">100</div>
            <div class="pack-price">10,00€</div>
          </div>
        </div>
      </div>
      
      <div class="prompt-actions">
        <button class="prompt-btn cancel" (click)="closeStoreModal()">Cerrar</button>
      </div>
    </div>
  `,
  styles: [`
      .countdown-boxes { display: flex; gap: 10px; justify-content: center; margin: 15px 0; }
      .c-box { background: linear-gradient(135deg, #FFCA3A, #FF9F1C); color: white; padding: 10px; border-radius: 12px; min-width: 65px; display: flex; flex-direction: column; align-items: center; box-shadow: 0 4px 15px rgba(255, 159, 28, 0.3); }
      .c-box span { font-size: 1.5rem; font-weight: 800; line-height: 1.2; }
      .c-box small { font-size: 0.75rem; font-weight: bold; opacity: 0.9; text-transform: uppercase; }
      .premium-gold-btn { background: linear-gradient(135deg, #FFCA3A, #FF9F1C) !important; box-shadow: 0 4px 15px rgba(255, 159, 28, 0.4) !important; color: white !important; }
      
      :host-context(.night-owl-mode) .c-box { background: linear-gradient(135deg, #FF9F1C, #E85D04); }

      :host-context(body.hide-footer) .custom-footer { transform: translateY(150%); opacity: 0; pointer-events: none !important; }
      :host-context(body.hide-footer) .custom-tab-bar,
      :host-context(body.hide-footer) .floating-center-wrapper { pointer-events: none !important; }
      .custom-footer { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); background: transparent; border: none; padding: 0 15px calc(var(--safe-bottom) + 15px) 15px; position: absolute; bottom: 0; width: 100%; pointer-events: none; z-index: 1000; }
      
      .custom-header { display: flex; justify-content: space-between; align-items: center; padding: calc(var(--ion-safe-area-top, 0px) + 15px) 25px 15px 25px; background: var(--custom-header-bg, rgba(255, 255, 255, 0.65)); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255, 255, 255, 0.4); box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05); border-radius: 0 0 25px 25px; margin-bottom: 10px; position: relative; z-index: 20; transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
      .custom-header.hide-header { transform: translateY(-120px) scale(0.9); opacity: 0; pointer-events: none !important; }
      
      .bg-emojis-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; pointer-events: none; z-index: 1; border-radius: 0 0 25px 25px; }
      .bg-floating-emoji { position: absolute; top: -30px; font-size: 1.4rem; animation-name: fallDownHeader; animation-timing-function: linear; animation-iteration-count: infinite; opacity: 0; text-shadow: 0 2px 5px rgba(0,0,0,0.1); }
      @keyframes fallDownHeader { 0% { transform: translateY(0) scale(0.8) rotate(-15deg); opacity: 0; } 15% { opacity: 0.7; } 85% { opacity: 0.7; } 100% { transform: translateY(140px) scale(1.1) rotate(15deg); opacity: 0; } }

      .avatar-container { position: relative; cursor: pointer; z-index: 2; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
      .avatar { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem; color: white; box-shadow: 0 4px 15px rgba(0,0,0,0.15); object-fit: cover; border: 2px solid white; transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); pointer-events: none; }
      .avatar-container:active .avatar { transform: scale(0.9); }
      .my-avatar { background: linear-gradient(135deg, #FF4D6D, #c9184a); }
      .partner-avatar { background: linear-gradient(135deg, #ff8fa3, #ffb3c1); }
      .partner-container .avatar { animation: avatarHeartbeat 2.5s infinite ease-in-out; }
      
      @keyframes avatarHeartbeat { 0% { transform: scale(1); box-shadow: 0 4px 15px rgba(255,77,109,0.15); } 15% { transform: scale(1.05); box-shadow: 0 4px 20px rgba(255,77,109,0.4); } 30% { transform: scale(1); box-shadow: 0 4px 15px rgba(255,77,109,0.15); } 100% { transform: scale(1); } }
      
      .mood-badge { position: absolute; bottom: -5px; right: -5px; background: white; border-radius: 50%; padding: 2px; font-size: 1.2rem; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: transform 0.3s; pointer-events: none; }
      
      .header-center-actions { display: flex; align-items: center; gap: 15px; position: absolute; left: 50%; transform: translateX(-50%); }
      
      .premium-btn { padding: 8px 12px; border-radius: 20px; background: linear-gradient(135deg, #FFCA3A, #FF9F1C); display: flex; align-items: center; gap: 5px; color: white; font-weight: 800; font-size: 0.85rem; box-shadow: 0 4px 15px rgba(255,159,28,0.4); cursor: pointer; border: 2px solid white; transition: transform 0.3s; }
      .premium-btn:active { transform: scale(0.95); }
      .premium-btn ion-icon { font-size: 1.1rem; }
      .premium-btn span { white-space: nowrap; }

      .poke-btn { z-index: 2; position: relative; width: 55px; height: 55px; border-radius: 50%; background: linear-gradient(135deg, #fff0f3, #ffe5ec); display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #FF4D6D; cursor: pointer; box-shadow: 0 8px 20px rgba(255,77,109,0.2), inset 0 2px 5px rgba(255,255,255,0.8); transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); border: 2px solid white; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
      .poke-btn:active { transform: scale(0.85); box-shadow: 0 4px 10px rgba(255,77,109,0.2); }
      .poke-btn ion-icon { filter: drop-shadow(0 2px 4px rgba(255,77,109,0.3)); transition: transform 0.3s; }
      .poke-btn ion-icon.poking { animation: heartbeat 0.8s ease-in-out 2; color: #c9184a; filter: drop-shadow(0 4px 8px rgba(201,24,74,0.5)); }
      .poke-btn ion-icon.super-poking { animation: superheartbeat 0.3s ease-in-out infinite; color: #c9184a; filter: drop-shadow(0 6px 14px rgba(201,24,74,0.7)); }
      @keyframes heartbeat { 0% { transform: scale(1); } 25% { transform: scale(1.4); } 50% { transform: scale(1); } 75% { transform: scale(1.4); } 100% { transform: scale(1); } }
      @keyframes superheartbeat { 0% { transform: scale(1); } 30% { transform: scale(1.5) rotate(-5deg); } 60% { transform: scale(0.9) rotate(5deg); } 100% { transform: scale(1); } }
  
      .menu-toggle-btn { z-index: 1; position: relative; width: 42px; height: 42px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 2px solid white; font-size: 1.3rem; color: #555; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); opacity: 0; transform: translateX(-40px) scale(0.5); margin-left: -57px; pointer-events: none; }
      .menu-toggle-btn.show { opacity: 1; transform: translateX(0) scale(1); margin-left: 0; pointer-events: auto; }
      .menu-toggle-btn:active { transform: scale(0.88); }
      :host-context(.night-owl-mode) .menu-toggle-btn { background: #2a2a2a; border-color: #444; color: #ccc; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }

      .custom-footer { background: transparent; border: none; padding: 0 15px calc(var(--safe-bottom) + 15px) 15px; position: absolute; bottom: 0; width: 100%; pointer-events: none; z-index: 1000; }
      .custom-tab-bar { pointer-events: auto; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); display: flex; justify-content: space-between; align-items: center; padding: 5px 15px; height: 70px; border-radius: 35px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.5); position: relative; margin-bottom: 5px; }
      .tab-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #a08c92; width: 55px; font-size: 0.75rem; gap: 4px; transition: color 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer; position: relative; }
      .tab-btn.active { color: #FF4D6D; font-weight: 800; transform: translateY(-3px); }
      
      .tab-btn ion-icon { font-size: 1.6rem; transition: transform 0.3s; }
      .tab-btn.active ion-icon { transform: scale(1.15); filter: drop-shadow(0 4px 8px rgba(255,77,109,0.3)); }
      .tab-btn.active::after { content: ''; position: absolute; bottom: -8px; width: 6px; height: 6px; background: #FF4D6D; border-radius: 50%; box-shadow: 0 2px 5px rgba(255,77,109,0.4); }
      .notification-badge { position: absolute; top: -2px; right: -4px; width: 10px; height: 10px; background-color: #ff3b30; border-radius: 50%; box-shadow: 0 0 5px rgba(255, 59, 48, 0.5); }
      
      .center-btn { position: relative; width: 60px; height: 60px; }
      .floating-center-wrapper { position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(var(--safe-bottom) + 20px); width: 60px; height: 70px; z-index: 1010; display: flex; justify-content: center; pointer-events: auto; }
      .plus-circle { position: absolute; top: -15px; left: 50%; transform: translateX(-50%); width: 58px; height: 58px; border-radius: 50%; background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; box-shadow: 0 10px 25px rgba(255, 77, 109, 0.5); border: 4px solid #ffffff; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); z-index: 10; cursor: pointer; }
      .plus-circle::before { content: ''; position: absolute; top: -2px; left: -2px; right: -2px; bottom: -2px; border-radius: 50%; background: linear-gradient(135deg, #ff8fa3, #ffb3c1); z-index: -1; opacity: 0; transition: opacity 0.3s; }
      .plus-circle:active { transform: translateX(-50%) scale(0.9); box-shadow: 0 5px 15px rgba(255, 77, 109, 0.4); }
      .plus-circle.uploading { animation: pulse 1.5s infinite; }
      
      @keyframes pulse { 0% { opacity: 1; transform: translateX(-50%) scale(1); box-shadow: 0 0 0 0 rgba(255, 77, 109, 0.7); } 50% { opacity: 0.8; transform: translateX(-50%) scale(0.95); box-shadow: 0 0 0 15px rgba(255, 77, 109, 0); } 100% { opacity: 1; transform: translateX(-50%) scale(1); box-shadow: 0 0 0 0 rgba(255, 77, 109, 0); } }

    /* Custom Upload Prompt */
    .home-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); backdrop-filter: blur(5px); z-index: 1000; display: flex; align-items: flex-end; }
    .prompt-sheet { background: #fff; width: 100%; border-radius: 25px 25px 0 0; padding: 20px; padding-bottom: 40px; box-shadow: 0 -10px 20px rgba(0,0,0,0.1); }
    .modal-header { margin-bottom: 20px; text-align: center; }
    .modal-header h2 { margin: 0; font-size: 1.3rem; font-weight: 800; color: #590D22; }
    .prompt-body { display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; }
    .prompt-preview-container { width: 100%; display: flex; justify-content: center; background: #fff5f8; border-radius: 15px; overflow: hidden; max-height: 250px; }
    .prompt-preview { max-width: 100%; max-height: 250px; object-fit: contain; }
    .premium-textarea { width: 100%; min-height: 100px; border: 2px solid rgba(255, 77, 109, 0.2); border-radius: 15px; padding: 15px; font-size: 1rem; color: #590D22; background: rgba(255, 255, 255, 0.8); resize: none; outline: none; transition: border-color 0.3s; }
    .premium-textarea:focus { border-color: #FF4D6D; }
    .premium-textarea::placeholder { color: #a08c92; }
    .premium-input { width: 100%; border: 2px solid rgba(255, 77, 109, 0.2); border-radius: 15px; padding: 15px; font-size: 1.1rem; color: #590D22; background: rgba(255, 255, 255, 0.8); outline: none; transition: border-color 0.3s; font-weight: bold; }
    .premium-input:focus { border-color: #FF4D6D; }
    .premium-input::placeholder { color: #a08c92; font-weight: normal; }
    @keyframes slideUpModal {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .surprise-sheet { background: linear-gradient(to bottom, #ffffff, #fff5f8); animation: slideUpModal 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    
    .prompt-actions { display: flex; gap: 10px; }
    .prompt-btn { flex: 1; padding: 14px; border-radius: 20px; font-weight: bold; font-size: 1.1rem; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; }
    .prompt-btn.cancel { background: #f1f3f5; color: #888; }
    .prompt-btn.confirm { background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; box-shadow: 0 4px 15px rgba(255, 77, 109, 0.3); }
    .prompt-btn:disabled { opacity: 0.7; pointer-events: none; }

    /* Night Owl Global Fixes for App Shell */
    :host-context(.night-owl-mode) .custom-header { background: var(--custom-header-bg, rgba(30, 30, 30, 0.85)); border-bottom-color: rgba(255, 255, 255, 0.05); }
    :host-context(.night-owl-mode) .custom-tab-bar { background: rgba(30, 30, 30, 0.85); border-color: rgba(255, 255, 255, 0.05); box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
    :host-context(.night-owl-mode) .tab-btn { color: #888; }
    :host-context(.night-owl-mode) .tab-btn.active { color: #a78bfa; }
    :host-context(.night-owl-mode) .tab-btn.active::after { background: #a78bfa; box-shadow: 0 2px 5px rgba(167,139,250,0.4); }
    :host-context(.night-owl-mode) .tab-btn.active ion-icon { filter: drop-shadow(0 4px 8px rgba(167,139,250,0.3)); }
    :host-context(.night-owl-mode) .plus-circle { background: linear-gradient(135deg, #a78bfa, #8b5cf6); border-color: #222; box-shadow: 0 10px 25px rgba(167, 139, 250, 0.5); }
    :host-context(.night-owl-mode) .plus-circle::before { background: linear-gradient(135deg, #c4b5fd, #a78bfa); }
    
    :host-context(.night-owl-mode) .prompt-sheet,
    :host-context(.night-owl-mode) .surprise-sheet { background: rgba(30, 30, 30, 0.95); }
    :host-context(.night-owl-mode) .modal-header h2 { color: #fdfdfd; }
    :host-context(.night-owl-mode) .premium-input,
    :host-context(.night-owl-mode) .premium-textarea { background: rgba(0,0,0,0.4); border-color: #333; color: #fdfdfd; color-scheme: dark; }
    :host-context(.night-owl-mode) .premium-input:focus,
    :host-context(.night-owl-mode) .premium-textarea:focus { border-color: #a78bfa; }
    :host-context(.night-owl-mode) .prompt-btn.cancel { background: rgba(255,255,255,0.1); color: #ccc; }
    :host-context(.night-owl-mode) .prompt-btn.confirm { background: linear-gradient(135deg, #a78bfa, #8b5cf6); box-shadow: 0 4px 15px rgba(167, 139, 250, 0.3); }
    :host-context(.night-owl-mode) .prompt-preview-container { background: rgba(0,0,0,0.3); }
  `],
  standalone: true,
  imports: [IonHeader, IonContent, IonFooter, IonIcon, IonSpinner, CommonModule, FormsModule, LocationWidgetComponent, PhotoWidgetComponent, ChatWidgetComponent, MasWidgetComponent, QuestionsWidgetComponent, StreakPetComponent],
})
export class HomePage implements OnInit, OnDestroy {
  activeTab: string = 'photo';
  selectedWidget: 'location' | 'photo' | 'chat' | 'mas' | 'game' = 'photo';
  uploading = false;
  couple: any = null;
  pokeAnimation = false;
  superPokeAnimation = false;

  spySequenceStep = 0;
  spySequenceTimeout: any = null;
  hasSpyStatsUnlocked = false;

  pokeCount = 0;
  private pokeHoldTimer: any = null;
  private pokeHoldFired = false;
  
  myUserId: number = 0;
  isPremium: boolean = false;
  showStoreModal: boolean = false;
  buyingStore: boolean = false;
  hasNightOwlSecret = false;
  isDarkMode = false;
  hasGoldenFrame = false;
  goldenTimeout: any;
  private appStateListener?: PluginListenerHandle;
  private subscriptions: Subscription[] = [];

  myMood = '';
  myAvatarFrame = 'default';
  partnerAvatarFrame = 'default';
  partnerMood = '';
  partnerInitial = 'P';
  
  unreadChat = false;
  unreadPhoto = false;
  unreadMap = false;
  
  myAvatarUrl = '';
  partnerAvatarUrl = '';

  pendingPhotoFile: any = null;
  pendingPhotoPreview: string = '';
  pendingPhotoText: string = '';
  
  surpriseTimeout: any;
  showSurpriseModal = false;
  surpriseTitle = '';
  surpriseBody = '';
  sendingSurprise = false;
  hasSurpriseUnlocked = false;
  
  emojisToAnimate: any[] = [];
  private globalEventSub?: Subscription;

  public premiumService = inject(PremiumService);
  private globalEventService = inject(GlobalEventService);
  private api = inject(LoveApiService);
  private router = inject(Router);
  private modalController = inject(ModalController);
  private toastController = inject(ToastController);
  private locationService = inject(LocationService);
  private alertController = inject(AlertController);
  private actionSheetCtrl = inject(ActionSheetController);
  private tutorialService = inject(TutorialService);
  private themeService = inject(ThemeService);
  private modalCtrl = inject(ModalController);
  private cdr = inject(ChangeDetectorRef);
  private notificationService = inject(NotificationService);
  private platform = inject(Platform);

  @ViewChild('photoWidget') photoWidgetComp?: PhotoWidgetComponent;
  @ViewChild('chatWidget') chatWidgetComp?: ChatWidgetComponent;
  @ViewChild('locationWidget') locationWidgetComp?: LocationWidgetComponent;
  @ViewChild('masWidget') masWidgetComp?: MasWidgetComponent;
  @ViewChild('gameWidget') gameWidgetComp?: QuestionsWidgetComponent;

  constructor() {
    addIcons({ imagesOutline, images, chatbubblesOutline, chatbubbles, add, hourglassOutline, mapOutline, map, ellipsisHorizontalOutline, ellipsisHorizontal, heart, happyOutline, sadOutline, flameOutline, bedOutline, camera, image, close, eyeOutline, eyeOffOutline, eye, colorPalette, person });
  }

  async checkWidgetIntent() {
    const res = await Preferences.get({ key: 'widget_open_tab' });
    if (res.value) {
      const tab = res.value as 'location' | 'photo' | 'chat' | 'mas' | 'game';
      if (['location', 'photo', 'chat', 'mas', 'game'].includes(tab)) {
        this.selectedWidget = tab;
        this.activeTab = tab;
      }
      await Preferences.remove({ key: 'widget_open_tab' });
    }
    
    const albumRes = await Preferences.get({ key: 'widget_open_album_id' });
    if (albumRes.value && albumRes.value !== 'feed') {
      await Preferences.set({ key: 'open_album_id_intent', value: albumRes.value });
      await Preferences.remove({ key: 'widget_open_album_id' });
    }
    
    const actionRes = await Preferences.get({ key: 'widget_action' });
    if (actionRes.value) {
      await Preferences.set({ key: 'action_intent', value: actionRes.value });
      await Preferences.remove({ key: 'widget_action' });

      if (actionRes.value === 'open_camera') {
        setTimeout(() => {
          if (this.selectedWidget === 'photo' && this.photoWidgetComp) {
            this.photoWidgetComp.uploadNewPhoto();
            Preferences.remove({ key: 'action_intent' });
          }
        }, 1000);
      }
    }
  }

  showPremiumCountdownModal = false;
  premiumCountdown = { d: 0, h: 0, m: 0, s: 0, expired: false };
  premiumCountdownInterval: any;

  async showPremiumDetails() {
    const expiresAt = this.premiumService.premiumExpiresAt$.value;
    if (!expiresAt) {
      this.openPaywall();
      return;
    }
    
    this.showPremiumCountdownModal = true;
    document.body.classList.add('hide-tabs');
    this.cdr.detectChanges();
    
    const updateCountdown = () => {
      const diff = expiresAt.getTime() - new Date().getTime();
      if (diff <= 0) {
         this.premiumCountdown.expired = true;
         return;
      }
      
      this.premiumCountdown.expired = false;
      this.premiumCountdown.d = Math.floor(diff / (1000 * 60 * 60 * 24));
      this.premiumCountdown.h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      this.premiumCountdown.m = Math.floor((diff / 1000 / 60) % 60);
      this.premiumCountdown.s = Math.floor((diff / 1000) % 60);
    };

    updateCountdown();
    this.premiumCountdownInterval = setInterval(updateCountdown, 1000);
  }

  closePremiumCountdown() {
    this.showPremiumCountdownModal = false;
    document.body.classList.remove('hide-tabs');
    this.cdr.detectChanges();
    if (this.premiumCountdownInterval) {
      clearInterval(this.premiumCountdownInterval);
    }
  }

  managePremium() {
    this.closePremiumCountdown();
    // Use setTimeout to allow the current modal to close smoothly before opening the paywall
    setTimeout(() => {
      this.openPaywall();
    }, 100);
  }

  async checkDeliveredNotifications() {
    if (!this.platform.is('capacitor')) return;
    try {
      const delivered = await PushNotifications.getDeliveredNotifications();
      let changed = false;
      for (const notif of delivered.notifications) {
        const title = notif.title ? notif.title.toLowerCase() : '';
        const body = notif.body ? notif.body.toLowerCase() : '';
        const text = title + ' ' + body;
        
        if (text.includes('mensaje')) {
          if (this.selectedWidget !== 'chat') { this.unreadChat = true; changed = true; }
        } else if (text.includes('foto') || text.includes('álbum') || text.includes('reaccion') || text.includes('garabato')) {
          if (this.selectedWidget !== 'photo') { this.unreadPhoto = true; changed = true; }
        } else if (text.includes('zumbido')) {
          if (this.selectedWidget !== 'location') { this.unreadMap = true; changed = true; }
        }
      }
      if (changed) this.cdr.detectChanges();
    } catch (e) {
      console.log('Error checking delivered notifications', e);
    }
  }

  async ngOnInit() {
    this.subscriptions.push(
      this.notificationService.newNotification$.subscribe((notif: any) => {
        const title = notif.title ? notif.title.toLowerCase() : '';
        const body = notif.body ? notif.body.toLowerCase() : '';
        const text = title + ' ' + body;
        
        if (text.includes('mensaje')) {
          if (this.selectedWidget !== 'chat') this.unreadChat = true;
        } else if (text.includes('foto') || text.includes('álbum') || text.includes('reaccion') || text.includes('garabato')) {
          if (this.selectedWidget !== 'photo') this.unreadPhoto = true;
        } else if (text.includes('zumbido')) {
          if (this.selectedWidget !== 'location') this.unreadMap = true;
        }
        this.cdr.detectChanges();
      })
    );

    this.subscriptions.push(
      this.notificationService.tappedNotification$.subscribe((action: any) => {
        const notif = action.notification;
        const payload = {
          title: notif.title || '',
          body: notif.body || '',
          data: notif.data
        };
        const text = (payload.title + ' ' + payload.body).toLowerCase();
        let targetWidget = 'photo';

        if (text.includes('mensaje') || text.includes('carta') || text.includes('regalo') || text.includes('sorpresa')) {
          targetWidget = 'chat';
        } else if (text.includes('foto') || text.includes('álbum') || text.includes('reaccion') || text.includes('garabato')) {
          targetWidget = 'photo';
        } else if (text.includes('zumbido') || text.includes('ubicación') || text.includes('llegado') || text.includes('mapa')) {
          targetWidget = 'location';
        } else if (text.includes('juego') || text.includes('pregunta') || text.includes('verdad') || text.includes('reto') || text.includes('quiz')) {
          targetWidget = 'game';
        } else if (text.includes('inventario') || text.includes('premium')) {
          targetWidget = 'mas';
        }

        this.activeTab = targetWidget;
        this.selectedWidget = targetWidget as 'location' | 'photo' | 'chat' | 'mas' | 'game';
        this.cdr.detectChanges();
      })
    );
    
    this.checkDeliveredNotifications();

    this.globalEventSub = this.globalEventService.activeEvent$.subscribe(evt => {
      if (evt && evt.emojis_enabled && evt.emojis_list) {
        const emojis = evt.emojis_list.split(',').map((e: string) => e.trim()).filter((e: string) => e);
        if (!emojis.length) return;
        this.emojisToAnimate = [];
        const numEmojis = 12; // increased slightly to fill the space nicely
        for (let i = 0; i < numEmojis; i++) {
          const segmentWidth = 100 / numEmojis;
          const leftPos = (i * segmentWidth) + (Math.random() * segmentWidth * 0.8); // distributed with slight randomness
          this.emojisToAnimate.push({
            emoji: emojis[Math.floor(Math.random() * emojis.length)],
            left: leftPos,
            duration: 3 + Math.random() * 4,
            delay: Math.random() * 5
          });
        }
      } else {
        this.emojisToAnimate = [];
      }
    });

    const nightPref = await Preferences.get({ key: 'night_owl_enabled' });
    if (nightPref.value === 'true') {
      this.isDarkMode = true;
    } else if (nightPref.value === 'false') {
      this.isDarkMode = false;
    } else {
      // Default to system preference if not set
      this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    if (this.isDarkMode) {
      document.body.classList.add('night-owl-mode');
      document.documentElement.classList.add('night-owl-mode');
    } else {
      document.body.classList.remove('night-owl-mode');
      document.documentElement.classList.remove('night-owl-mode');
    }

    const [goldenRes, surpriseRes, nightOwlRes, spyRes] = await Promise.all([
      Preferences.get({ key: 'golden_frame_unlocked' }),
      Preferences.get({ key: 'surprise_notification_unlocked' }),
      Preferences.get({ key: 'night_owl_unlocked' }),
      Preferences.get({ key: 'spy_stats_unlocked' })
    ]);
    this.hasGoldenFrame = goldenRes.value === 'true';
    this.hasSurpriseUnlocked = surpriseRes.value === 'true';
    this.hasNightOwlSecret = nightOwlRes.value === 'true';
    this.hasSpyStatsUnlocked = spyRes.value === 'true';

    await this.loadHeaderData();

    // Suscribirse a los logros (ya no se usan para Night Owl / Golden)
    this.subscriptions.push(this.api.unlockedAchievements$.subscribe(achievements => {
      // Other achievements logic could go here
      this.cdr.detectChanges();
    }));

    this.subscriptions.push(this.api.avatarUpdated$.subscribe(() => {
      this.loadHeaderData();
    }));

    // Widget Intent listener & Background Polling replacement
    this.appStateListener = await App.addListener('appStateChange', async ({ isActive }: { isActive: boolean }) => {
      if (isActive) {
        this.checkWidgetIntent();
        this.loadHeaderData(); // Refrescar info al volver a la app
      }
    });
    this.checkWidgetIntent();
    
    // Mostrar tour inicial si no lo ha visto
    this.tutorialService.showWelcomeTour();
  }

  public async selectTab(tab: string) {
    if (this.activeTab === tab) return;
    
    // Update visual tab instantly for ultra-fast INP (< 16ms response)
    this.activeTab = tab;
    this.cdr.detectChanges();

    // Defer the heavy DOM manipulation (destroying and creating widget components)
    // to the next frame so the browser can paint the UI update first.
    setTimeout(async () => {
      this.selectedWidget = tab as 'location' | 'photo' | 'chat' | 'mas' | 'game';
      
      if (tab === 'chat') this.unreadChat = false;
      if (tab === 'photo') this.unreadPhoto = false;
      if (tab === 'location') this.unreadMap = false;

      // Remove OS notifications associated with the selected tab
      if (this.platform.is('capacitor')) {
        try {
          const delivered = await PushNotifications.getDeliveredNotifications();
          const toRemove = delivered.notifications.filter(notif => {
            const text = ((notif.title || '') + ' ' + (notif.body || '')).toLowerCase();
            if (tab === 'chat' && text.includes('mensaje')) return true;
            if (tab === 'photo' && (text.includes('foto') || text.includes('álbum') || text.includes('reaccion') || text.includes('garabato'))) return true;
            if (tab === 'location' && text.includes('zumbido')) return true;
            return false;
          });
          if (toRemove.length > 0) {
            await PushNotifications.removeDeliveredNotifications({ notifications: toRemove });
          }
        } catch (e) {
          console.log('Error removing notifications', e);
        }
      }

      this.cdr.detectChanges();

      // Damos un pequeño respiro de 300ms para que el DOM renderice el componente antes de mostrar el tutorial
      setTimeout(() => {
        switch (tab) {
          case 'photo': this.tutorialService.showPhotosTour(); break;
          case 'chat': this.tutorialService.showChatTour(); break;
          case 'location': 
            if (!this.premiumService.isFree$.value) {
              this.tutorialService.showMapTour(); 
            }
            break;
          case 'mas': this.tutorialService.showMasTour(); break;
        }
      }, 300);
    }, 10);
  }

  async openPaywall() {
    const modal = await this.modalCtrl.create({
      component: PaywallComponent,
      cssClass: 'paywall-modal'
    });
    await modal.present();
  }

  ngOnDestroy() {
    if (this.appStateListener) {
      this.appStateListener.remove();
    }
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  startSurprisePress() {
    if (this.selectedWidget === 'mas' && this.spySequenceStep === 1) {
      this.spySequenceStep = 2;
      clearTimeout(this.spySequenceTimeout);
      this.spySequenceTimeout = setTimeout(() => { this.spySequenceStep = 0; }, 4000);
    }
    this.surpriseTimeout = setTimeout(() => {
      this.openSurpriseModal();
    }, 800); // 800ms para considerarlo long press
  }

  endSurprisePress() {
    clearTimeout(this.surpriseTimeout);
  }

  async openSurpriseModal() {
    try { navigator.vibrate?.(50); } catch(e){}
    this.api.unlockAchievement('secret_notification');
    this.surpriseTitle = '';
    this.surpriseBody = '';
    this.showSurpriseModal = true;
    document.body.classList.add('hide-tabs');
    this.cdr.detectChanges();
  }


  closeSurpriseModal() {
    this.showSurpriseModal = false;
    document.body.classList.remove('hide-tabs');
    this.cdr.detectChanges();
  }

  isGoldenLongPress = false;

  startGoldenPress() {
    this.isGoldenLongPress = false;
    if (this.selectedWidget === 'mas') {
      this.spySequenceStep = 1;
      clearTimeout(this.spySequenceTimeout);
      this.spySequenceTimeout = setTimeout(() => { this.spySequenceStep = 0; }, 4000);
    }
    this.goldenTimeout = setTimeout(() => {
      this.isGoldenLongPress = true;
      this.goldenTimeout = null;
      try { navigator.vibrate?.([50, 50, 50]); } catch(e){}
      this.api.unlockAchievement('secret_golden_frame');
      this.openAvatarSettings(); // Abre el selector de mood de todas formas
    }, 1000); // 1s
  }

  endGoldenPress() {
    if (this.goldenTimeout) {
      clearTimeout(this.goldenTimeout);
      this.goldenTimeout = null;
    }
  }

  onAvatarClick() {
    if (!this.isGoldenLongPress) {
      this.openAvatarSettings();
    }
    this.isGoldenLongPress = false;
  }

  async sendSurprise() {
    if (!this.surpriseTitle || !this.surpriseBody) return;
    this.sendingSurprise = true;
    this.cdr.detectChanges();
    try {
      await this.api.sendCustomNotification(this.surpriseTitle, this.surpriseBody);
      const toast = await this.toastController.create({
        message: '¡Sorpresa enviada!',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      toast.present();
      this.closeSurpriseModal();
    } catch (e) {
      const toast = await this.toastController.create({
        message: 'Error al enviar notificación',
        duration: 2000,
        color: 'danger',
        position: 'top'
      });
      toast.present();
    } finally {
      this.sendingSurprise = false;
      this.cdr.detectChanges();
    }
  }

  async loadHeaderData() {
    try {
      this.api.markMessagesDelivered().catch(e => console.log('Error marking messages delivered', e));
      
      const cached = await Preferences.get({ key: 'chat_couple_info_cache' });
      if (cached.value) {
        const data = JSON.parse(cached.value);
        if (data.global_theme && data.global_theme !== 'default') {
          document.body.setAttribute('data-global-theme', data.global_theme);
        }
        if (data.my_mood) this.myMood = data.my_mood;
        if (data.partner_mood) this.partnerMood = data.partner_mood;
        if (data.my_avatar_frame || data.avatar_frame) this.myAvatarFrame = data.my_avatar_frame || data.avatar_frame || 'default';
        if (data.partner_avatar_frame) this.partnerAvatarFrame = data.partner_avatar_frame || 'default';
        if (data.partner_name) this.partnerInitial = data.partner_name.charAt(0).toUpperCase();
        if (data.my_avatar) this.myAvatarUrl = data.my_avatar;
        if (data.partner_avatar) this.partnerAvatarUrl = data.partner_avatar;
        if (data.couple) this.couple = data.couple;
        this.cdr.detectChanges();
      }
      
      const data = await this.api.getCoupleInfo();
      
      if (data) {
        await Preferences.set({ key: 'chat_couple_info_cache', value: JSON.stringify(data) });
      }

      if (data.global_theme && data.global_theme !== 'default') {
        document.body.setAttribute('data-global-theme', data.global_theme);
      } else {
        document.body.removeAttribute('data-global-theme');
      }
      
      if (data.my_mood) this.myMood = data.my_mood;
      if (data.partner_mood) this.partnerMood = data.partner_mood;
      if (data.my_avatar_frame || data.avatar_frame) this.myAvatarFrame = data.my_avatar_frame || data.avatar_frame || 'default';
      if (data.partner_avatar_frame) this.partnerAvatarFrame = data.partner_avatar_frame || 'default';

      if (data.partner_name) this.partnerInitial = data.partner_name.charAt(0).toUpperCase();
      if (data.my_avatar) this.myAvatarUrl = data.my_avatar;
      if (data.partner_avatar) this.partnerAvatarUrl = data.partner_avatar;
      
      if (data.couple) {
        this.couple = data.couple;
      } else if (data.current_streak !== undefined) {
        // Fallback in case couple is not in the top level object
        this.couple = { current_streak: data.current_streak, id: data.my_id || 0 };
      }

      const myIdStr = data.my_id?.toString();
      const partnerIdStr = data.partner_id?.toString();

      if (data.my_id) {
        this.myUserId = data.my_id;
      }

      if (myIdStr && partnerIdStr) {
        // Clear previous subscriptions to avoid duplicate listeners
        this.subscriptions.forEach(s => s.unsubscribe());
        this.subscriptions = [];
      }

      if (data.is_premium !== undefined) {
        this.isPremium = data.is_premium;
      }

      // Desbloquear Night Owl y Golden Frame si es Premium
      this.hasNightOwlSecret = this.isPremium;
      this.hasGoldenFrame = this.isPremium;

      this.cdr.detectChanges();
    } catch (e: any) {
      console.log('No se pudo cargar la info de la cabecera', e);
      if (e.status === 403 || e.error?.message?.includes('No estás vinculado')) {
        this.router.navigate(['/pairing'], { replaceUrl: true });
      } else if (e.status === 401) {
        // Token is invalid/expired
        await this.api.logout();
        this.router.navigate(['/login'], { replaceUrl: true });
      }
    }
  }

  
  
  async openAvatarSettings() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: '¿Qué quieres personalizar?',
      cssClass: 'premium-action-sheet',
      buttons: [
        { text: 'Estado de Ánimo 💭', icon: 'happy-outline', handler: () => { setTimeout(() => this.openMoodSettings(), 300); } },
        { text: 'Marco del Avatar 🖼️', icon: 'image-outline', handler: () => { setTimeout(() => this.openFrameSettings(), 300); } },
        { text: 'Cancelar', icon: 'close', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  async openMoodSettings() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Tu Estado de Ánimo',
      cssClass: 'premium-action-sheet',
      buttons: [
        { text: 'Feliz 😊', handler: () => this.setAvatarSetting('current_mood', '😊') },
        { text: 'Mimoso/a 🥰', handler: () => this.setAvatarSetting('current_mood', '🥰') },
        { text: 'Jugando 🎮', handler: () => this.setAvatarSetting('current_mood', '🎮') },
        { text: 'Cansado/a 😴', handler: () => this.setAvatarSetting('current_mood', '😴') },
        { text: 'Durmiendo 💤', handler: () => this.setAvatarSetting('current_mood', '💤') },
        { text: 'Estresado/a 🤯', handler: () => this.setAvatarSetting('current_mood', '🤯') },
        { text: 'Triste 🥺', handler: () => this.setAvatarSetting('current_mood', '🥺') },
        { text: 'Quitar Estado', icon: 'trash-outline', handler: () => this.setAvatarSetting('current_mood', '') },
        { text: 'Cancelar', icon: 'close', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  async openFrameSettings() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Marco de tu Avatar',
      cssClass: 'premium-action-sheet',
      buttons: [
        { text: 'Normal', handler: () => this.setAvatarSetting('avatar_frame', 'default') },
        { text: 'Dorado 🏆', handler: () => this.setAvatarSetting('avatar_frame', 'golden') },
        { text: 'Neón 🔵', handler: () => this.setAvatarSetting('avatar_frame', 'neon') },
        { text: 'Pastel 🌸', handler: () => this.setAvatarSetting('avatar_frame', 'pastel') },
        { text: 'Fuego 🔥', handler: () => this.setAvatarSetting('avatar_frame', 'fire') },
        { text: 'Cancelar', icon: 'close', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  async setAvatarSetting(field: string, value: string) {

    if (field === 'current_mood') this.myMood = value;
    if (field === 'avatar_frame') this.myAvatarFrame = value;
    
    try {
      await this.api.updateCoupleInfo({ [field]: value });
      const toast = await this.toastController.create({
        message: '¡Ajuste actualizado!',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      toast.present();
    } catch(e) {
      console.error(e);
    }
  }

  onPetHatched(petData: any) {
    if (this.couple) {
      if (!this.couple.inventory) {
        this.couple.inventory = {};
      }
      this.couple.inventory.pet = petData;
      // Update cache
      Preferences.get({ key: 'chat_couple_info_cache' }).then(cached => {
        if (cached.value) {
          const data = JSON.parse(cached.value);
          if (data.couple) {
            data.couple = this.couple;
            Preferences.set({ key: 'chat_couple_info_cache', value: JSON.stringify(data) });
          }
        }
      });
      this.cdr.detectChanges();
    }
  }

  onPokeClick() {
    // Cancelamos el timer por si el evento de soltar no se registró bien en el móvil
    this.endPokeHold();

    // Si el long press ya disparó el super poke, ignorar el click
    if (this.pokeHoldFired) {
      this.pokeHoldFired = false;
      return;
    }
    this.sendPoke();
  }

  startPokeHold() {
    if (this.selectedWidget === 'mas' && this.spySequenceStep === 2) {
      this.spySequenceStep = 3;
      clearTimeout(this.spySequenceTimeout);
      this.spySequenceTimeout = setTimeout(() => {
        if (this.spySequenceStep === 3) {
          this.unlockSpyStats();
        }
      }, 2000);
    }
    this.pokeHoldFired = false;
    this.pokeHoldTimer = setTimeout(() => {
      this.pokeHoldFired = true;
      this.sendSuperPoke();
    }, 1000);
  }

  endPokeHold() {
    if (this.spySequenceStep === 3) {
      this.spySequenceStep = 0;
      clearTimeout(this.spySequenceTimeout);
    }
    if (this.pokeHoldTimer) {
      clearTimeout(this.pokeHoldTimer);
      this.pokeHoldTimer = null;
    }
  }

  async sendSuperPoke() {
    this.superPokeAnimation = true;
    this.cdr.detectChanges();
    this.api.unlockAchievement('secret_spammer');
    try {
      // Vibrar de forma larga y continua
      await Haptics.vibrate({ duration: 800 });
      await this.api.sendPoke(true);
      const toast = await this.toastController.create({
        message: '¡SUPER ZUMBIDO enviado! 💚💥',
        duration: 2000,
        color: 'danger',
        position: 'top'
      });
      toast.present();
    } catch (e: any) {
      console.error(e);
      let errorMsg = 'Error al enviar el súper zumbido';
      if (e.status === 429 && e.error && e.error.message) {
        errorMsg = e.error.message;
      }
      const toast = await this.toastController.create({
        message: errorMsg,
        duration: 3000,
        color: 'warning',
        position: 'top'
      });
      toast.present();
    }
    setTimeout(() => { 
      this.superPokeAnimation = false; 
      this.cdr.detectChanges();
    }, 1500);
  }

  async sendPoke() {
    this.pokeAnimation = true;
    this.cdr.detectChanges();
    this.pokeCount++;
    if (this.pokeCount === 10) {
      this.api.unlockAchievement('explorer_poke');
    }
    
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
      await this.api.sendPoke(false);
      const toast = await this.toastController.create({
        message: '¡Zumbido enviado! 🐝',
        duration: 2000,
        color: 'danger',
        position: 'top'
      });
      toast.present();
    } catch (e) {
      console.error(e);
      const toast = await this.toastController.create({
        message: 'Error al enviar el zumbido',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      toast.present();
    }
    setTimeout(() => { 
      this.pokeAnimation = false; 
      this.cdr.detectChanges();
    }, 1500);
  }

  async toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    
    // Toggle the custom Night Owl CSS
    document.body.classList.toggle('night-owl-mode', this.isDarkMode);
    document.documentElement.classList.toggle('night-owl-mode', this.isDarkMode);
    
    // Save to preferences so it persists
    await Preferences.set({ key: 'night_owl_enabled', value: this.isDarkMode ? 'true' : 'false' });

    // Also toggle the standard Ionic dark mode so generic components adapt correctly
    const newTheme = this.isDarkMode ? 'dark' : 'light';
    this.themeService.setTheme(newTheme);
  }


  async presentPhotoOptions(callback: (source: CameraSource) => void) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Añadir Foto',
      cssClass: 'premium-action-sheet',
      buttons: [
        {
          text: 'Tomar Foto',
          icon: 'camera',
          handler: () => {
            callback(CameraSource.Camera);
          }
        },
        {
          text: 'De la Galería',
          icon: 'image',
          handler: () => {
            callback(CameraSource.Photos);
          }
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel',
          cssClass: 'premium-cancel-btn'
        }
      ]
    });
    await actionSheet.present();
  }

  async takePicture() {
    if (this.activeTab === 'mas') {
      this.masWidgetComp?.openAddFoodPlaceModal();
      return;
    }
    this.presentPhotoOptions(async (source) => {
      try {
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: source,
          direction: CameraDirection.Front // Usar la cámara delantera por defecto
        });

        if (image.webPath) {
          // Convert webPath to File object
          const response = await fetch(image.webPath);
          const blob = await response.blob();
          this.pendingPhotoFile = blob;
          this.pendingPhotoPreview = URL.createObjectURL(blob);
          this.pendingPhotoText = '';
          document.body.classList.add('hide-tabs');
          this.cdr.detectChanges();
        }
      } catch (e: any) {
        if (e.message && e.message.includes('User cancelled')) {
          console.log('User cancelled camera');
        } else {
          console.error(e);
        }
      }
    });
  }

  cancelUpload() {
    this.pendingPhotoFile = null;
    this.pendingPhotoPreview = '';
    this.pendingPhotoText = '';
    document.body.classList.remove('hide-tabs');
    this.cdr.detectChanges();
  }

  async confirmUpload() {
    if (!this.pendingPhotoFile) return;

    this.uploading = true;
    this.cdr.detectChanges();
    try {
      await this.api.uploadPhoto(this.pendingPhotoFile, this.pendingPhotoText);
      this.cancelUpload();

      this.activeTab = 'photo';
      this.selectedWidget = 'photo';
      
      setTimeout(async () => {
        if (this.photoWidgetComp) {
          await this.photoWidgetComp.loadData();
        }
      }, 100);

      const toast = await this.toastController.create({
        message: '¡Recuerdo subido con éxito!',
        duration: 2500,
        color: 'success',
        position: 'top',
      });
      await toast.present();
    } catch (e: any) {
      console.error(e);
      const errMsg = e.message ? e.message : JSON.stringify(e);
      const toast = await this.toastController.create({
        message: 'Error al subir la foto: ' + errMsg,
        duration: 5000,
        color: 'danger',
        position: 'top',
      });
      await toast.present();
    } finally {
      this.uploading = false;
      this.cdr.detectChanges();
    }
  }

  async unlockSpyStats() {
    this.spySequenceStep = 0;
    clearTimeout(this.spySequenceTimeout);
    if (!this.hasSpyStatsUnlocked) {
      this.hasSpyStatsUnlocked = true;
      await Preferences.set({ key: 'spy_stats_unlocked', value: 'true' });
      this.api.unlockAchievement('secret_stats_unlocked').catch(e => console.error(e));
      try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch (e) {}
    }
    this.openSpyStats();
  }

  async openSpyStats() {
    document.body.classList.add('hide-tabs');
    const modal = await this.modalController.create({
      component: SecretStatsModalComponent,
      componentProps: { myUserId: this.myUserId }
    });
    await modal.present();
    await modal.onDidDismiss();
    document.body.classList.remove('hide-tabs');
  }
  async openStoreModal() {
    this.showStoreModal = true;
  }

  closeStoreModal() {
    this.showStoreModal = false;
  }

  async buyCoinPack(packId: string) {
    if (this.buyingStore) return;
    this.buyingStore = true;
    try {
      const res = await this.api.buyCoins(packId);
      if (this.couple && this.couple.inventory) {
        this.couple.inventory.coins = res.coins;
      }
      const toast = await this.toastController.create({
        message: res.message,
        duration: 3000,
        color: 'success',
        position: 'top',
        icon: 'cash-outline'
      });
      await toast.present();
    } catch (e) {
      console.error(e);
      const toast = await this.toastController.create({
        message: 'No se pudo completar la compra.',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.buyingStore = false;
      this.cdr.detectChanges();
    }
  }

  async subscribeToPremium() {
    if (this.buyingStore) return;
    this.buyingStore = true;
    try {
      const res = await this.api.subscribePremium();
      if (this.couple && this.couple.inventory) {
        this.couple.inventory.coins = res.coins;
      }
      this.isPremium = true;
      this.hasNightOwlSecret = true;
      this.hasGoldenFrame = true;

      const toast = await this.toastController.create({
        message: res.message,
        duration: 4000,
        color: 'success',
        position: 'top',
        icon: 'star'
      });
      await toast.present();
      
      this.closeStoreModal();
    } catch (e) {
      console.error(e);
      const toast = await this.toastController.create({
        message: 'No se pudo completar la suscripción.',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.buyingStore = false;
      this.cdr.detectChanges();
    }
  }
}

