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
import { MasWidgetComponent } from '../widgets/mas-widget/mas-widget.component';
import { QuestionsWidgetComponent } from '../widgets/questions-widget/questions-widget.component';
import { LoveApiService } from '../services/love-api.service';
import { LocationService } from '../services/location.service';
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';

@Component({
  selector: 'app-home',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <div class="custom-header">
          <div class="avatar-container" (click)="openMoodSelector()">
            <img *ngIf="myAvatarUrl" [src]="myAvatarUrl" class="avatar" />
            <div *ngIf="!myAvatarUrl" class="avatar my-avatar">TÚ</div>
            <div class="mood-badge" *ngIf="myMood">{{ myMood }}</div>
          </div>
          
          <div class="poke-btn" (click)="sendPoke()">
            <ion-icon name="heart" [class.poking]="pokeAnimation"></ion-icon>
          </div>

          <div class="avatar-container"
               (mousedown)="startSurprisePress()" (mouseup)="endSurprisePress()" (mouseleave)="endSurprisePress()"
               (touchstart)="startSurprisePress()" (touchend)="endSurprisePress()">
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
      <app-location-widget *ngIf="selectedWidget === 'location'" #locationWidget></app-location-widget>
      <app-mas-widget *ngIf="selectedWidget === 'mas'" (openGameEvent)="selectedWidget = 'game'" #masWidget></app-mas-widget>
      <app-questions-widget *ngIf="selectedWidget === 'game'" #gameWidget></app-questions-widget>
    </ion-content>

    <ion-footer class="custom-footer">
      <div class="custom-tab-bar">
        <!-- Album -->
        <div class="tab-btn" (click)="selectedWidget = 'photo'" [class.active]="selectedWidget === 'photo'">
          <ion-icon name="images-outline" *ngIf="selectedWidget !== 'photo'"></ion-icon>
          <ion-icon name="images" *ngIf="selectedWidget === 'photo'"></ion-icon>
          <span>Álbum</span>
        </div>
        
        <!-- Chat -->
        <div class="tab-btn" (click)="selectedWidget = 'chat'" [class.active]="selectedWidget === 'chat'">
          <div style="position: relative; display: flex;">
            <ion-icon name="chatbubbles-outline" *ngIf="selectedWidget !== 'chat'"></ion-icon>
            <ion-icon name="chatbubbles" *ngIf="selectedWidget === 'chat'"></ion-icon>
          </div>
          <span>Chat</span>
        </div>
        
        <!-- Center Upload Button -->
        <div class="tab-btn center-btn" (click)="takePicture()">
          <div class="plus-circle" [class.uploading]="uploading">
            <ion-icon name="add" *ngIf="!uploading"></ion-icon>
            <ion-icon name="hourglass-outline" *ngIf="uploading"></ion-icon>
          </div>
        </div>
        
        <!-- Map -->
        <div class="tab-btn" (click)="selectedWidget = 'location'" [class.active]="selectedWidget === 'location'">
          <ion-icon name="map-outline" *ngIf="selectedWidget !== 'location'"></ion-icon>
          <ion-icon name="map" *ngIf="selectedWidget === 'location'"></ion-icon>
          <span>Mapa</span>
        </div>
        
        <!-- Más -->
        <div class="tab-btn" (click)="selectedWidget = 'mas'" [class.active]="selectedWidget === 'mas'">
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
    ion-toolbar { --background: white; }
    .custom-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 25px; background: white; position: relative; }
    .avatar-container { position: relative; cursor: pointer; z-index: 2; }
    .avatar { width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); object-fit: cover; }
    .my-avatar { background: linear-gradient(135deg, #FF4D6D, #c9184a); }
    .partner-avatar { background: linear-gradient(135deg, #ff8fa3, #ffb3c1); }
    .mood-badge { position: absolute; bottom: -5px; right: -5px; background: white; border-radius: 50%; padding: 2px; font-size: 1.2rem; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    
    .poke-btn { position: absolute; left: 50%; transform: translateX(-50%); width: 50px; height: 50px; border-radius: 50%; background: #fff0f3; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: #FF4D6D; cursor: pointer; box-shadow: inset 0 2px 5px rgba(255,77,109,0.1); transition: all 0.2s; z-index: 1; }
    .poke-btn:active { transform: scale(0.9); }
    .poke-btn ion-icon.poking { animation: heartbeat 0.8s infinite; color: #c9184a; }
    @keyframes heartbeat { 0% { transform: scale(1); } 25% { transform: scale(1.3); } 50% { transform: scale(1); } 75% { transform: scale(1.3); } 100% { transform: scale(1); } }

    .custom-footer { background: white; border-top: 1px solid #eee; padding-bottom: env(safe-area-inset-bottom); }
    .custom-tab-bar { display: flex; justify-content: space-between; align-items: center; padding: 5px 15px; height: 65px; position: relative; }
    .tab-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #888; width: 55px; font-size: 0.75rem; gap: 4px; transition: color 0.2s; cursor: pointer; }
    .tab-btn.active { color: #FF4D6D; font-weight: bold; }
    
    .tab-btn ion-icon { font-size: 1.5rem; transition: transform 0.2s; }
    .tab-btn.active ion-icon { transform: scale(1.1); }
    
    .center-btn { position: relative; width: 60px; height: 60px; }
    .plus-circle { position: absolute; top: -14px; width: 55px; height: 55px; border-radius: 50%; background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; display: flex; align-items: center; justify-content: center; font-size: 2rem; box-shadow: 0 4px 15px rgba(255, 77, 109, 0.4); border: 4px solid white; transition: transform 0.2s; z-index: 10; cursor: pointer; }
    .plus-circle:active { transform: scale(0.9); }
    .plus-circle.uploading { animation: pulse 1.5s infinite; }
    
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

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
  `],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonContent, IonFooter, IonIcon, IonSpinner, CommonModule, FormsModule, LocationWidgetComponent, PhotoWidgetComponent, ChatWidgetComponent, MasWidgetComponent, QuestionsWidgetComponent],
})
export class HomePage implements OnInit, OnDestroy {
  selectedWidget: 'location' | 'photo' | 'chat' | 'mas' | 'game' = 'photo';
  uploading = false;
  pokeAnimation = false;
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
  }

  async ngOnInit() {
    await this.loadHeaderData();

    // Widget Intent listener & Background Polling replacement
    this.appStateListener = await App.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        this.checkWidgetIntent();
        this.loadHeaderData(); // Refrescar info al volver a la app
      }
    });
    this.checkWidgetIntent();
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
    this.surpriseTitle = '';
    this.surpriseBody = '';
    this.showSurpriseModal = true;
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

      const myIdStr = data.my_id?.toString();
      const partnerIdStr = data.partner_id?.toString();

      if (myIdStr && partnerIdStr) {
        // Clear previous subscriptions to avoid duplicate listeners
        this.subscriptions.forEach(s => s.unsubscribe());
        this.subscriptions = [];

        this.subscriptions.push(this.locationService.listenToUserLocation(myIdStr as any).subscribe((locData: any) => {
          if (locData && locData.avatar) this.myAvatarUrl = locData.avatar;
        }));
        this.subscriptions.push(this.locationService.listenToUserLocation(partnerIdStr as any).subscribe((locData: any) => {
          if (locData && locData.avatar) this.partnerAvatarUrl = locData.avatar;
        }));
      }
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

  async sendPoke() {
    this.pokeAnimation = true;
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
          role: 'cancel'
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
