import { Component, inject, ViewChild } from '@angular/core';
import { IonContent, IonFooter } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { imagesOutline, images, chatbubblesOutline, chatbubbles, add, hourglassOutline, mapOutline, map, personOutline } from 'ionicons/icons';

import { LocationWidgetComponent } from '../widgets/location-widget/location-widget.component';
import { PhotoWidgetComponent } from '../widgets/photo-widget/photo-widget.component';
import { ChatWidgetComponent } from '../widgets/chat-widget/chat-widget.component';
import { LoveApiService } from '../services/love-api.service';

@Component({
  selector: 'app-home',
  template: `
    <ion-content>
      <app-photo-widget *ngIf="selectedWidget === 'photo'" #photoWidget></app-photo-widget>
      <app-chat-widget *ngIf="selectedWidget === 'chat'"></app-chat-widget>
      <app-location-widget *ngIf="selectedWidget === 'location'"></app-location-widget>
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
        <div class="tab-btn center-btn" (click)="fileInput.click()">
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
        
        <!-- Profile / Logout -->
        <div class="tab-btn" (click)="logout()">
          <ion-icon name="person-outline"></ion-icon>
          <span>Salir</span>
        </div>
      </div>
      
      <input type="file" #fileInput (change)="onFileSelected($event)" accept="image/*" style="display:none" />
    </ion-footer>
  `,
  styles: [`
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
  imports: [IonContent, IonFooter, IonIcon, CommonModule, FormsModule, LocationWidgetComponent, PhotoWidgetComponent, ChatWidgetComponent],
})
export class HomePage {
  selectedWidget: 'location' | 'photo' | 'chat' = 'location';
  uploading = false;

  private api = inject(LoveApiService);
  private toastController = inject(ToastController);
  private router = inject(Router);

  @ViewChild('photoWidget') photoWidgetComp?: PhotoWidgetComponent;

  constructor() {
    addIcons({ imagesOutline, images, chatbubblesOutline, chatbubbles, add, hourglassOutline, mapOutline, map, personOutline });
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.uploading = true;
      try {
        await this.api.uploadPhoto(file, '');
        this.selectedWidget = 'photo'; // Switch to photo tab
        
        // Wait a tick for angular to render the component if it was hidden
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
        event.target.value = ''; // reset
      }
    }
  }

  logout() {
    this.api.logout();
    this.router.navigate(['/login']);
  }
}
