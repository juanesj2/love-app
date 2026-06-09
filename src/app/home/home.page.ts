import { Component, inject, ViewChild, OnInit } from '@angular/core';
import { IonContent, IonFooter, IonHeader, IonToolbar, ActionSheetController, AlertController, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { imagesOutline, images, chatbubblesOutline, chatbubbles, add, hourglassOutline, mapOutline, map, ellipsisHorizontalOutline, ellipsisHorizontal, heart, happyOutline, sadOutline, flameOutline, bedOutline } from 'ionicons/icons';
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

          <div class="avatar-container">
            <img *ngIf="partnerAvatarUrl" [src]="partnerAvatarUrl" class="avatar" />
            <div *ngIf="!partnerAvatarUrl" class="avatar partner-avatar">{{ partnerInitial }}</div>
            <div class="mood-badge" *ngIf="partnerMood">{{ partnerMood }}</div>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

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
  `,
  styles: [`
    ion-toolbar { --background: white; }
    .custom-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 25px; background: white; }
    .avatar-container { position: relative; cursor: pointer; }
    .avatar { width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); object-fit: cover; }
    .my-avatar { background: linear-gradient(135deg, #FF4D6D, #c9184a); }
    .partner-avatar { background: linear-gradient(135deg, #ff8fa3, #ffb3c1); }
    .mood-badge { position: absolute; bottom: -5px; right: -5px; background: white; border-radius: 50%; padding: 2px; font-size: 1.2rem; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    
    .poke-btn { width: 50px; height: 50px; border-radius: 50%; background: #fff0f3; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: #FF4D6D; cursor: pointer; box-shadow: inset 0 2px 5px rgba(255,77,109,0.1); transition: all 0.2s; }
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
  `],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonContent, IonFooter, IonIcon, CommonModule, FormsModule, LocationWidgetComponent, PhotoWidgetComponent, ChatWidgetComponent, MasWidgetComponent, QuestionsWidgetComponent, IonRefresher, IonRefresherContent],
})
export class HomePage implements OnInit {
  selectedWidget: 'location' | 'photo' | 'chat' | 'mas' | 'game' = 'photo';
  uploading = false;
  pokeAnimation = false;

  myMood = '';
  partnerMood = '';
  partnerInitial = 'P';
  
  myAvatarUrl = '';
  partnerAvatarUrl = '';

  private api = inject(LoveApiService);
  private locationService = inject(LocationService);
  private toastController = inject(ToastController);
  private actionSheetCtrl = inject(ActionSheetController);
  private alertController = inject(AlertController);

  @ViewChild('photoWidget') photoWidgetComp?: PhotoWidgetComponent;
  @ViewChild('chatWidget') chatWidgetComp?: ChatWidgetComponent;
  @ViewChild('locationWidget') locationWidgetComp?: LocationWidgetComponent;
  @ViewChild('masWidget') masWidgetComp?: MasWidgetComponent;
  @ViewChild('gameWidget') gameWidgetComp?: QuestionsWidgetComponent;

  constructor() {
    addIcons({ imagesOutline, images, chatbubblesOutline, chatbubbles, add, hourglassOutline, mapOutline, map, ellipsisHorizontalOutline, ellipsisHorizontal, heart, happyOutline, sadOutline, flameOutline, bedOutline });
  }

  async ngOnInit() {
    this.loadHeaderData();
    // Poll header data every 30 seconds
    setInterval(() => this.loadHeaderData(), 30000);

    // Load avatars from Firebase
    const { value } = await Preferences.get({ key: 'firebase_user_id' });
    const myId = value || 'juan';
    const partnerId = myId === 'juan' ? 'roberta' : 'juan';

    this.locationService.listenToUserLocation(myId as 'juan'|'roberta').subscribe((data: any) => {
      if (data && data.avatar) this.myAvatarUrl = data.avatar;
    });
    this.locationService.listenToUserLocation(partnerId as 'juan'|'roberta').subscribe((data: any) => {
      if (data && data.avatar) this.partnerAvatarUrl = data.avatar;
    });
  }

  async loadHeaderData() {
    try {
      const data = await this.api.getCoupleInfo();
      if (data.my_mood) this.myMood = data.my_mood;
      if (data.partner_mood) this.partnerMood = data.partner_mood;
      if (data.partner_name) this.partnerInitial = data.partner_name.charAt(0).toUpperCase();
    } catch (e) {
      console.log('No se pudo cargar la info de la cabecera');
    }
  }

  async handleRefresh(event: any) {
    await this.loadHeaderData();
    if (this.selectedWidget === 'photo' && this.photoWidgetComp) {
      await this.photoWidgetComp.loadData();
    } else if (this.selectedWidget === 'chat' && this.chatWidgetComp) {
      await this.chatWidgetComp.loadMessages();
    } else if (this.selectedWidget === 'game' && this.gameWidgetComp) {
      await this.gameWidgetComp.loadQuestions();
    } else if (this.selectedWidget === 'mas' && this.masWidgetComp) {
      await this.masWidgetComp.loadMilestones();
    }
    // Location widget no tiene carga propia explícita, los flujos son con RxJS observables
    event.target.complete();
  }

  async openMoodSelector() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: '¿Cómo te sientes hoy?',
      buttons: [
        { text: 'Feliz 😊', handler: () => this.setMood('😊') },
        { text: 'Cansado/a 😴', handler: () => this.setMood('😴') },
        { text: 'Estresado/a 🤯', handler: () => this.setMood('🤯') },
        { text: 'Mimoso/a 🥰', handler: () => this.setMood('🥰') },
        { text: 'Triste 🥺', handler: () => this.setMood('🥺') },
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
    await actionSheet.present();
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

  async takePicture() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
        direction: CameraDirection.Front // Usar la cámara delantera por defecto
      });

      if (image.webPath) {
        // Convert webPath to File object
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const file = new File([blob], "camera_photo.jpg", { type: blob.type });

        const alert = await this.alertController.create({
          header: 'Añadir descripción',
          inputs: [
            {
              name: 'description',
              type: 'textarea',
              placeholder: 'Escribe algo bonito (opcional)...'
            }
          ],
          buttons: [
            {
              text: 'Cancelar',
              role: 'cancel'
            },
            {
              text: 'Subir',
              role: 'confirm'
            }
          ]
        });

        await alert.present();
        const { data, role } = await alert.onDidDismiss();

        if (role === 'cancel') {
          return;
        }

        this.uploading = true;
        const text = data?.values?.description || '';

        await this.api.uploadPhoto(file, text);
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
      }
    } catch (e: any) {
      if (e.message && e.message.includes('User cancelled')) {
        // User closed the camera, do nothing
        return;
      }
      console.error('Error al subir', e);
      const toast = await this.toastController.create({
        message: 'Error al subir la foto.',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    } finally {
      this.uploading = false;
    }
  }
}
