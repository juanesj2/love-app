import { Component, inject, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { PluginListenerHandle } from '@capacitor/core';
import { IonContent, IonFooter, IonHeader, IonToolbar, AlertController, ActionSheetController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ToastController, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { imagesOutline, images, chatbubblesOutline, chatbubbles, add, hourglassOutline, mapOutline, map, ellipsisHorizontalOutline, ellipsisHorizontal, heart, happyOutline, sadOutline, flameOutline, bedOutline, camera, image, close } from 'ionicons/icons';
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
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';

@Component({
  selector: 'app-home',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <div class="custom-header" *ngIf="selectedWidget !== 'location'">
          <div class="avatar-container"
               (pointerdown)="startGoldenPress()" (pointerup)="endGoldenPress()" (pointercancel)="endGoldenPress()" (pointerleave)="endGoldenPress()">
            <img *ngIf="myAvatarUrl" [src]="myAvatarUrl" class="avatar" [class.golden-frame]="hasGoldenFrame" />
            <div *ngIf="!myAvatarUrl" class="avatar my-avatar" [class.golden-frame]="hasGoldenFrame">Tú</div>
            <div class="mood-badge" *ngIf="myMood">{{ myMood }}</div>
          </div>
          
          <div class="header-center-actions">
            <!-- Moon icon for Night Mode if unlocked -->
            <div class="moon-btn" [class.dark-active]="isDarkMode" *ngIf="hasNightOwlSecret" (click)="toggleDarkMode()">
              <span style="font-size: 1.3rem; line-height: 1;">{{ isDarkMode ? '🌕' : '🌙' }}</span>
            </div>
            
            <div class="poke-btn"
              (click)="onPokeClick()"
              (pointerdown)="startPokeHold()" (pointerup)="endPokeHold()" (pointercancel)="endPokeHold()" (pointerleave)="endPokeHold()">
              <ion-icon name="heart" [class.poking]="pokeAnimation" [class.super-poking]="superPokeAnimation"></ion-icon>
            </div>
          </div>

          <div class="avatar-container partner-container"
               (pointerdown)="startSurprisePress()" (pointerup)="endSurprisePress()" (pointercancel)="endSurprisePress()" (pointerleave)="endSurprisePress()">
            <img *ngIf="partnerAvatarUrl" [src]="partnerAvatarUrl" class="avatar" />
            <div *ngIf="!partnerAvatarUrl" class="avatar partner-avatar">{{ partnerInitial }}</div>
            <div class="mood-badge" *ngIf="partnerMood">{{ partnerMood }}</div>
          </div>
        </div>
      </ion-toolbar>
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
        <div id="tab-photo" class="tab-btn" (click)="selectTab('photo')" [class.active]="selectedWidget === 'photo'">
          <ion-icon name="images-outline" *ngIf="selectedWidget !== 'photo'"></ion-icon>
          <ion-icon name="images" *ngIf="selectedWidget === 'photo'"></ion-icon>
          <span>Álbum</span>
        </div>
        
        <!-- Chat -->
        <div id="tab-chat" class="tab-btn" (click)="selectTab('chat')" [class.active]="selectedWidget === 'chat'">
          <div style="position: relative; display: flex;">
            <ion-icon name="chatbubbles-outline" *ngIf="selectedWidget !== 'chat'"></ion-icon>
            <ion-icon name="chatbubbles" *ngIf="selectedWidget === 'chat'"></ion-icon>
          </div>
          <span>Chat</span>
        </div>
        
        <!-- Center Placeholder to keep flex space -->
        <div class="tab-btn center-btn" style="pointer-events: none;"></div>
        
        <!-- Map -->
        <div id="tab-map" class="tab-btn" (click)="selectTab('location')" [class.active]="selectedWidget === 'location'">
          <ion-icon name="map-outline" *ngIf="selectedWidget !== 'location'"></ion-icon>
          <ion-icon name="map" *ngIf="selectedWidget === 'location'"></ion-icon>
          <span>Mapa</span>
        </div>
        
        <!-- Más -->
        <div id="tab-mas" class="tab-btn" (click)="selectTab('mas')" [class.active]="selectedWidget === 'mas'">
          <ion-icon name="ellipsis-horizontal-outline" *ngIf="selectedWidget !== 'mas'"></ion-icon>
          <ion-icon name="ellipsis-horizontal" *ngIf="selectedWidget === 'mas'"></ion-icon>
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
    <div class="home-overlay" *ngIf="showSurpriseModal" (click)="showSurpriseModal = false">
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
          <button class="prompt-btn cancel" (click)="showSurpriseModal = false" [disabled]="sendingSurprise">Cancelar</button>
          <button class="prompt-btn confirm" (click)="sendSurprise()" [disabled]="sendingSurprise || !surpriseTitle || !surpriseBody">
            <span *ngIf="!sendingSurprise">Enviar 🔥</span>
            <ion-spinner name="crescent" *ngIf="sendingSurprise"></ion-spinner>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
      ion-toolbar { --background: transparent; position: absolute; top: 0; width: 100%; }
      .custom-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 25px; background: rgba(255, 255, 255, 0.65); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255, 255, 255, 0.4); box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05); border-radius: 0 0 25px 25px; margin-bottom: 10px; position: relative; z-index: 20; }
      .avatar-container { position: relative; cursor: pointer; z-index: 2; }
      .avatar { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem; color: white; box-shadow: 0 4px 15px rgba(0,0,0,0.15); object-fit: cover; border: 2px solid white; transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
      .avatar-container:active .avatar { transform: scale(0.9); }
      .my-avatar { background: linear-gradient(135deg, #FF4D6D, #c9184a); }
      .partner-avatar { background: linear-gradient(135deg, #ff8fa3, #ffb3c1); }
      .partner-container .avatar { animation: avatarHeartbeat 2.5s infinite ease-in-out; }
      
      @keyframes avatarHeartbeat { 0% { transform: scale(1); box-shadow: 0 4px 15px rgba(255,77,109,0.15); } 15% { transform: scale(1.05); box-shadow: 0 4px 20px rgba(255,77,109,0.4); } 30% { transform: scale(1); box-shadow: 0 4px 15px rgba(255,77,109,0.15); } 100% { transform: scale(1); } }
      
      .mood-badge { position: absolute; bottom: -5px; right: -5px; background: white; border-radius: 50%; padding: 2px; font-size: 1.2rem; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: transform 0.3s; }
      
      .header-center-actions { display: flex; align-items: center; gap: 15px; position: absolute; left: 50%; transform: translateX(-50%); }
      .moon-btn { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, rgba(108,99,255,0.15), rgba(162,155,254,0.2)); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 2px solid rgba(108,99,255,0.3); display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 15px rgba(108,99,255,0.2); transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
      .moon-btn:active { transform: scale(0.88); }
      .moon-btn.dark-active { background: linear-gradient(135deg, rgba(108,99,255,0.4), rgba(76,70,201,0.5)); border-color: rgba(108,99,255,0.6); box-shadow: 0 4px 20px rgba(108,99,255,0.4); }
      .moon-btn.dark-active ion-icon { color: #fff !important; }
      
      .poke-btn { width: 55px; height: 55px; border-radius: 50%; background: linear-gradient(135deg, #fff0f3, #ffe5ec); display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #FF4D6D; cursor: pointer; box-shadow: 0 8px 20px rgba(255,77,109,0.2), inset 0 2px 5px rgba(255,255,255,0.8); transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); border: 2px solid white; }
      .poke-btn:active { transform: scale(0.85); box-shadow: 0 4px 10px rgba(255,77,109,0.2); }
      .poke-btn ion-icon { filter: drop-shadow(0 2px 4px rgba(255,77,109,0.3)); transition: transform 0.3s; }
      .poke-btn ion-icon.poking { animation: heartbeat 0.8s ease-in-out 2; color: #c9184a; filter: drop-shadow(0 4px 8px rgba(201,24,74,0.5)); }
      .poke-btn ion-icon.super-poking { animation: superheartbeat 0.3s ease-in-out infinite; color: #c9184a; filter: drop-shadow(0 6px 14px rgba(201,24,74,0.7)); }
      @keyframes heartbeat { 0% { transform: scale(1); } 25% { transform: scale(1.4); } 50% { transform: scale(1); } 75% { transform: scale(1.4); } 100% { transform: scale(1); } }
      @keyframes superheartbeat { 0% { transform: scale(1); } 30% { transform: scale(1.5) rotate(-5deg); } 60% { transform: scale(0.9) rotate(5deg); } 100% { transform: scale(1); } }
  
      .custom-footer { background: transparent; border: none; padding: 0 15px calc(env(safe-area-inset-bottom) + 15px) 15px; position: absolute; bottom: 0; width: 100%; pointer-events: none; z-index: 1000; }
      .custom-tab-bar { pointer-events: auto; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); display: flex; justify-content: space-between; align-items: center; padding: 5px 15px; height: 70px; border-radius: 35px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.5); position: relative; margin-bottom: 5px; }
      .tab-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #a08c92; width: 55px; font-size: 0.75rem; gap: 4px; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer; position: relative; }
      .tab-btn.active { color: #FF4D6D; font-weight: 800; transform: translateY(-3px); }
      
      .tab-btn ion-icon { font-size: 1.6rem; transition: transform 0.3s; }
      .tab-btn.active ion-icon { transform: scale(1.15); filter: drop-shadow(0 4px 8px rgba(255,77,109,0.3)); }
      .tab-btn.active::after { content: ''; position: absolute; bottom: -8px; width: 6px; height: 6px; background: #FF4D6D; border-radius: 50%; box-shadow: 0 2px 5px rgba(255,77,109,0.4); }
      
      .center-btn { position: relative; width: 60px; height: 60px; }
      .floating-center-wrapper { position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(env(safe-area-inset-bottom) + 20px); width: 60px; height: 70px; z-index: 1010; display: flex; justify-content: center; pointer-events: auto; }
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
    .surprise-sheet { background: linear-gradient(to bottom, #ffffff, #fff5f8); }
    
    .prompt-actions { display: flex; gap: 10px; }
    .prompt-btn { flex: 1; padding: 14px; border-radius: 20px; font-weight: bold; font-size: 1.1rem; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; }
    .prompt-btn.cancel { background: #f1f3f5; color: #888; }
    .prompt-btn.confirm { background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; box-shadow: 0 4px 15px rgba(255, 77, 109, 0.3); }
    .prompt-btn:disabled { opacity: 0.7; pointer-events: none; }

    /* Night Owl Global Fixes for App Shell */
    :host-context(.night-owl-mode) .custom-header { background: rgba(30, 30, 30, 0.85); border-bottom-color: rgba(255, 255, 255, 0.05); }
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
  imports: [IonHeader, IonToolbar, IonContent, IonFooter, IonIcon, IonSpinner, CommonModule, FormsModule, LocationWidgetComponent, PhotoWidgetComponent, ChatWidgetComponent, MasWidgetComponent, QuestionsWidgetComponent],
})
export class HomePage implements OnInit, OnDestroy {
  selectedWidget: 'location' | 'photo' | 'chat' | 'mas' | 'game' = 'photo';
  uploading = false;
  pokeAnimation = false;
  superPokeAnimation = false;
  pokeCount = 0;
  private pokeHoldTimer: any = null;
  private pokeHoldFired = false;
  hasNightOwlSecret = false;
  isDarkMode = false;
  hasGoldenFrame = false;
  goldenTimeout: any;
  private appStateListener?: PluginListenerHandle;
  private subscriptions: Subscription[] = [];

  myMood = '';
  partnerMood = '';
  partnerInitial = 'P';
  
  myAvatarUrl = '';
  partnerAvatarUrl = '';

  pendingPhotoFile: File | null = null;
  pendingPhotoPreview: string = '';
  pendingPhotoText: string = '';
  
  surpriseTimeout: any;
  showSurpriseModal = false;
  surpriseTitle = '';
  surpriseBody = '';
  sendingSurprise = false;

  private api = inject(LoveApiService);
  private locationService = inject(LocationService);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);
  private actionSheetCtrl = inject(ActionSheetController);
  private router = inject(Router);
  private tutorialService = inject(TutorialService);
  private themeService = inject(ThemeService);

  @ViewChild('photoWidget') photoWidgetComp?: PhotoWidgetComponent;
  @ViewChild('chatWidget') chatWidgetComp?: ChatWidgetComponent;
  @ViewChild('locationWidget') locationWidgetComp?: LocationWidgetComponent;
  @ViewChild('masWidget') masWidgetComp?: MasWidgetComponent;
  @ViewChild('gameWidget') gameWidgetComp?: QuestionsWidgetComponent;

  constructor() {
    addIcons({ imagesOutline, images, chatbubblesOutline, chatbubbles, add, hourglassOutline, mapOutline, map, ellipsisHorizontalOutline, ellipsisHorizontal, heart, happyOutline, sadOutline, flameOutline, bedOutline, camera, image, close });
  }

  async checkWidgetIntent() {
    const res = await Preferences.get({ key: 'widget_open_tab' });
    if (res.value) {
      const tab = res.value as 'location' | 'photo' | 'chat' | 'mas' | 'game';
      if (['location', 'photo', 'chat', 'mas', 'game'].includes(tab)) {
        this.selectedWidget = tab;
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
    }
  }

  async ngOnInit() {
    const nightPref = await Preferences.get({ key: 'night_owl_enabled' });
    if (nightPref.value === 'true') {
      this.isDarkMode = true;
      document.body.classList.add('night-owl-mode');
      document.documentElement.classList.add('night-owl-mode');
    } else {
      this.isDarkMode = false;
      document.body.classList.remove('night-owl-mode');
      document.documentElement.classList.remove('night-owl-mode');
    }

    // Still sync with ThemeService for the standard generic dark theme base if needed
    if (!nightPref.value && this.themeService.currentTheme === 'dark') {
      this.isDarkMode = true;
      document.body.classList.add('night-owl-mode');
      document.documentElement.classList.add('night-owl-mode');
    }

    await this.loadHeaderData();

    // Suscribirse a los logros para el búho nocturno y marco dorado
    // Usar una suscripción separada que NO se cancela en loadHeaderData
    this.api.unlockedAchievements$.subscribe(achievements => {
      this.hasNightOwlSecret = achievements.includes('secret_owl');
      this.hasGoldenFrame = achievements.includes('secret_golden_frame');
    });

    // Widget Intent listener & Background Polling replacement
    this.appStateListener = await App.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        this.checkWidgetIntent();
        this.loadHeaderData(); // Refrescar info al volver a la app
      }
    });
    this.checkWidgetIntent();
    
    // Mostrar tour inicial si no lo ha visto
    this.tutorialService.showWelcomeTour();
  }

  public selectTab(tab: string) {
    this.selectedWidget = tab as 'location' | 'photo' | 'chat' | 'mas' | 'game';
    // Damos un pequeño respiro de 300ms para que el DOM renderice el componente antes de mostrar el tutorial
    setTimeout(() => {
      switch (tab) {
        case 'photo': this.tutorialService.showPhotosTour(); break;
        case 'chat': this.tutorialService.showChatTour(); break;
        case 'location': this.tutorialService.showMapTour(); break;
        case 'mas': this.tutorialService.showMasTour(); break;
      }
    }, 300);
  }

  ngOnDestroy() {
    if (this.appStateListener) {
      this.appStateListener.remove();
    }
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  startSurprisePress() {
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
  }

  startGoldenPress() {
    this.goldenTimeout = setTimeout(() => {
      this.goldenTimeout = null;
      try { navigator.vibrate?.([50, 50, 50]); } catch(e){}
      this.api.unlockAchievement('secret_golden_frame');
      this.openMoodSelector(); // Abre el selector de mood de todas formas
    }, 1000); // 1s
  }

  endGoldenPress() {
    if (this.goldenTimeout) {
      clearTimeout(this.goldenTimeout);
      this.goldenTimeout = null;
      // Si se suelta antes, es un click normal
      this.openMoodSelector();
    }
  }

  async sendSurprise() {
    if (!this.surpriseTitle || !this.surpriseBody) return;
    this.sendingSurprise = true;
    try {
      await this.api.sendCustomNotification(this.surpriseTitle, this.surpriseBody);
      const toast = await this.toastController.create({
        message: '¡Sorpresa enviada!',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      toast.present();
      this.showSurpriseModal = false;
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
    }
  }

  async loadHeaderData() {
    try {
      const data = await this.api.getCoupleInfo();
      if (data.my_mood) this.myMood = data.my_mood;
      if (data.partner_mood) this.partnerMood = data.partner_mood;
      if (data.partner_name) this.partnerInitial = data.partner_name.charAt(0).toUpperCase();
      if (data.my_avatar) this.myAvatarUrl = data.my_avatar;
      if (data.partner_avatar) this.partnerAvatarUrl = data.partner_avatar;

      const myIdStr = data.my_id?.toString();
      const partnerIdStr = data.partner_id?.toString();

      if (myIdStr && partnerIdStr) {
        // Clear previous subscriptions to avoid duplicate listeners
        this.subscriptions.forEach(s => s.unsubscribe());
        this.subscriptions = [];

        // No need to listen to locations here just for the avatars anymore
      }

      // Leer logros siempre despues de getCoupleInfo (por si la suscripcion fue antes)
      const achievements = this.api.unlockedAchievements$.getValue();
      this.hasNightOwlSecret = achievements.includes('secret_owl');
      this.hasGoldenFrame = achievements.includes('secret_golden_frame');
    } catch (e: any) {
      console.log('No se pudo cargar la info de la cabecera', e);
      if (e.status === 403 || e.error?.message?.includes('No estás vinculado')) {
        this.router.navigate(['/pairing'], { replaceUrl: true });
      }
    }
  }

  async openMoodSelector() {
    const alert = await this.alertController.create({
      header: '¿Cómo te sientes?',
      cssClass: 'premium-mood-alert',
      buttons: [
        { text: 'Feliz 😊', handler: () => this.setMood('😊') },
        { text: 'Cansado/a 😴', handler: () => this.setMood('😴') },
        { text: 'Estresado/a 🤯', handler: () => this.setMood('🤯') },
        { text: 'Mimoso/a 🥰', handler: () => this.setMood('🥰') },
        { text: 'Triste 🥺', handler: () => this.setMood('🥺') },
        { text: 'Cancelar', role: 'cancel', cssClass: 'mood-cancel-btn' }
      ]
    });
    await alert.present();
  }

  async setMood(mood: string) {
    this.myMood = mood;
    try {
      await this.api.updateCoupleInfo({ current_mood: mood });
      const toast = await this.toastController.create({
        message: 'Estado de ánimo actualizado',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      toast.present();
    } catch (e) {
      console.error(e);
      const toast = await this.toastController.create({
        message: 'Error al actualizar el estado',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      toast.present();
    }
  }

  onPokeClick() {
    // Si el long press ya disparó el super poke, ignorar el click
    if (this.pokeHoldFired) {
      this.pokeHoldFired = false;
      return;
    }
    this.sendPoke();
  }

  startPokeHold() {
    this.pokeHoldFired = false;
    this.pokeHoldTimer = setTimeout(() => {
      this.pokeHoldFired = true;
      this.sendSuperPoke();
    }, 700);
  }

  endPokeHold() {
    if (this.pokeHoldTimer) {
      clearTimeout(this.pokeHoldTimer);
      this.pokeHoldTimer = null;
    }
  }

  async sendSuperPoke() {
    this.superPokeAnimation = true;
    this.api.unlockAchievement('secret_spammer');
    try {
      // Vibrar de forma larga y continua
      await Haptics.vibrate({ duration: 800 });
      await this.api.sendPoke();
      const toast = await this.toastController.create({
        message: '¡SUPER ZUMBIDO enviado! 💚💥',
        duration: 2000,
        color: 'danger',
        position: 'top'
      });
      toast.present();
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => { this.superPokeAnimation = false; }, 1500);
  }

  async sendPoke() {
    this.pokeAnimation = true;
    this.pokeCount++;
    if (this.pokeCount === 10) {
      this.api.unlockAchievement('explorer_poke');
    }
    
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
      await this.api.sendPoke();
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
    setTimeout(() => { this.pokeAnimation = false; }, 1500);
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
          this.pendingPhotoFile = new File([blob], "camera_photo.jpg", { type: blob.type });
          this.pendingPhotoPreview = URL.createObjectURL(this.pendingPhotoFile);
          this.pendingPhotoText = '';
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
  }

  async confirmUpload() {
    if (!this.pendingPhotoFile) return;

    this.uploading = true;
    try {
      await this.api.uploadPhoto(this.pendingPhotoFile, this.pendingPhotoText);
      this.cancelUpload();

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
    } catch (e) {
      console.error(e);
      const toast = await this.toastController.create({
        message: 'Error al subir la foto',
        duration: 2500,
        color: 'danger',
        position: 'top',
      });
      await toast.present();
    } finally {
      this.uploading = false;
    }
  }
}
