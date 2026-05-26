import { Component, inject, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, ToastController, ActionSheetController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { LoveApiService } from '../../services/love-api.service';
import { Preferences } from '@capacitor/preferences';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { LocationService } from '../../services/location.service';
import { addIcons } from 'ionicons';
import { logOutOutline, timeOutline, settingsOutline, heart, flagOutline, addCircleOutline, gameControllerOutline, starOutline, checkmarkCircle, ellipseOutline, personCircleOutline, moonOutline, closeCircle } from 'ionicons/icons';

@Component({
  selector: 'app-mas-widget',
  template: `
    <div class="mas-container">
      <div class="header">
        <h2 class="title">Más opciones</h2>
      </div>

      <!-- Sección 1: Contador de Tiempo -->
      <div class="section-card counter-card">
        <div class="section-title">
          <ion-icon name="time-outline"></ion-icon>
          <h3>Nuestro Tiempo Juntos</h3>
        </div>
        
        <div class="date-picker-container">
          <label>¿Cuándo empezó nuestra historia?</label>
          <input type="datetime-local" class="custom-datetime" [(ngModel)]="startDate" (change)="saveStartDate()" />
        </div>

        <div class="live-counter" *ngIf="startDate">
          <div class="heart-pulse">
            <ion-icon name="heart"></ion-icon>
          </div>
          <div class="time-blocks">
            <div class="time-block" *ngIf="timeTogether.years > 0">
              <span class="value">{{ timeTogether.years }}</span>
              <span class="label">Años</span>
            </div>
            <div class="time-block" *ngIf="timeTogether.months > 0 || timeTogether.years > 0">
              <span class="value">{{ timeTogether.months }}</span>
              <span class="label">Meses</span>
            </div>
            <div class="time-block">
              <span class="value">{{ timeTogether.days }}</span>
              <span class="label">Días</span>
            </div>
            <div class="time-block">
              <span class="value">{{ timeTogether.hours }}</span>
              <span class="label">Horas</span>
            </div>
            <div class="time-block">
              <span class="value">{{ timeTogether.minutes }}</span>
              <span class="label">Min</span>
            </div>
            <div class="time-block highlight">
              <span class="value">{{ timeTogether.seconds }}</span>
              <span class="label">Seg</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Sección 2: Hitos y Fechas Importantes -->
      <div class="section-card milestones-card">
        <div class="section-title">
          <ion-icon name="flag-outline"></ion-icon>
          <h3>Hitos Importantes</h3>
        </div>
        
        <div class="milestone-list">
          <div class="milestone-item" *ngFor="let m of milestones">
            <div class="milestone-info">
              <span class="m-title">{{ m.title }}</span>
              <span class="m-date">{{ m.date | date:'longDate' }}</span>
            </div>
            <div class="m-days">{{ calculateDays(m.date) }} días</div>
            <ion-icon name="close-circle" class="delete-m" (click)="deleteMilestone(m.id)"></ion-icon>
          </div>
        </div>

        <div class="add-milestone">
          <input type="text" placeholder="Ej: Viaje a París" [(ngModel)]="newMilestoneTitle" />
          <input type="date" [(ngModel)]="newMilestoneDate" />
          <button (click)="addMilestone()"><ion-icon name="add-circle-outline"></ion-icon> Añadir</button>
        </div>
      </div> <!-- Close milestones-card properly -->

      <!-- Sección 2.5: Cubo de Deseos (Bucket List) -->
      <div class="section-card bucket-card">
        <div class="section-title">
          <ion-icon name="star-outline"></ion-icon>
          <h3>Cubo de Deseos</h3>
        </div>
        <p class="desc">Planes de futuro y cosas que queréis hacer juntos.</p>
        
        <div class="bucket-list">
          <div class="bucket-item" *ngFor="let item of bucketList; let i = index" (click)="toggleBucketItem(i)">
            <ion-icon [name]="item.completed ? 'checkmark-circle' : 'ellipseOutline'" [class.completed]="item.completed"></ion-icon>
            <span [class.strike]="item.completed">{{ item.title }}</span>
            <ion-icon name="close-circle" class="delete-b" (click)="deleteBucketItem(i, $event)"></ion-icon>
          </div>
        </div>

        <div class="add-milestone">
          <input type="text" placeholder="Ej: Viajar a Japón..." [(ngModel)]="newBucketTitle" (keyup.enter)="addBucketItem()" />
          <button (click)="addBucketItem()"><ion-icon name="add-circle-outline"></ion-icon> Añadir Deseo</button>
        </div>
      </div>

      <!-- Sección 3: Configuración de Widgets -->
      <div class="section-card config-card">
        <div class="section-title">
          <ion-icon name="settings-outline"></ion-icon>
          <h3>Configuración de Widgets</h3>
        </div>
        <p class="desc">Elige qué colección de fotos quieres que aparezca en el widget de Android de gran tamaño.</p>
        
        <div class="select-container">
          <select [(ngModel)]="selectedAlbumId" (change)="saveSelectedAlbum()" class="custom-select">
            <option value="feed">Feed General (Todas las fotos)</option>
            <option *ngFor="let album of albums" [value]="album.id">{{ album.name }}</option>
          </select>
        </div>
      </div>

      <!-- Sección 4: Minijuego -->
      <div class="section-card game-card" (click)="openGame()">
        <ion-icon name="game-controller-outline" class="game-icon"></ion-icon>
        <div class="game-texts">
          <h3>Test de Pareja</h3>
          <p>Descubre cuánto os conocéis respondiendo a ciegas.</p>
        </div>
      </div>

      <!-- Sección 5: Perfil -->
      <div class="section-card profile-card" (click)="changeProfilePicture()">
        <ion-icon name="person-circle-outline" class="profile-icon"></ion-icon>
        <div class="profile-texts">
          <span>Cambiar foto de perfil</span>
          <div class="spinner" *ngIf="uploadingAvatar">⏳</div>
        </div>
      </div>

      <!-- Sección 6: Cuenta -->
      <div class="section-card logout-card" (click)="logout()">
        <ion-icon name="log-out-outline" class="logout-icon"></ion-icon>
        <span>Cerrar sesión</span>
      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
    .mas-container { padding: 15px; height: 100%; display: flex; flex-direction: column; background: linear-gradient(135deg, #fff5f8 0%, #ffe3e9 100%); font-family: 'Inter', sans-serif; overflow-y: auto; }
    .header { margin-bottom: 20px; }
    .title { margin: 0; font-size: 1.6rem; font-weight: 800; color: #590D22; letter-spacing: -0.5px; }

    .section-card { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); border-radius: 20px; padding: 20px; margin-bottom: 20px; box-shadow: 0 8px 25px rgba(0,0,0,0.04); border: 1px solid rgba(255,255,255,0.9); }
    .section-title { display: flex; align-items: center; gap: 8px; margin-bottom: 15px; }
    .section-title ion-icon { font-size: 1.4rem; color: #FF4D6D; }
    .section-title h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #590D22; }

    .date-picker-container label { display: block; font-size: 0.9rem; color: #666; margin-bottom: 8px; font-weight: 500; }
    .custom-datetime { width: 100%; padding: 12px 15px; border-radius: 12px; border: 1px solid rgba(255, 77, 109, 0.2); background: rgba(255,255,255,0.9); font-family: 'Inter', sans-serif; font-size: 1rem; color: #590D22; outline: none; }
    .custom-datetime:focus { border-color: #FF4D6D; box-shadow: 0 0 0 3px rgba(255, 77, 109, 0.1); }

    .live-counter { margin-top: 25px; text-align: center; }
    .heart-pulse ion-icon { font-size: 3rem; color: #FF4D6D; filter: drop-shadow(0 0 10px rgba(255, 77, 109, 0.5)); animation: pulse 1s infinite alternate; margin-bottom: 15px; }
    @keyframes pulse { 0% { transform: scale(1); } 100% { transform: scale(1.15); } }

    .time-blocks { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
    .time-block { background: #fff5f8; padding: 10px; border-radius: 12px; min-width: 55px; box-shadow: 0 2px 10px rgba(0,0,0,0.03); border: 1px solid rgba(255, 77, 109, 0.1); }
    .time-block.highlight { background: linear-gradient(135deg, #FF4D6D, #ff758c); color: white; border: none; }
    .time-block.highlight .value, .time-block.highlight .label { color: white; }
    
    .value { display: block; font-size: 1.4rem; font-weight: 800; color: #590D22; }
    .label { display: block; font-size: 0.7rem; font-weight: 600; color: #a4133c; text-transform: uppercase; margin-top: 2px; }

    .milestone-item { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,240,243,0.7)); border-radius: 14px; margin-bottom: 10px; border: 1px solid rgba(255,77,109,0.15); box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .milestone-info { flex: 1; overflow: hidden; }
    .m-title { display: block; font-weight: 700; color: #590D22; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .m-date { font-size: 0.75rem; color: #a4133c; font-weight: 500; margin-top: 2px; display: block; }
    .m-days { font-weight: 900; color: white; background: linear-gradient(135deg, #FF4D6D, #c9184a); padding: 5px 10px; border-radius: 10px; font-size: 0.8rem; white-space: nowrap; box-shadow: 0 2px 6px rgba(255,77,109,0.3); }
    .delete-m { color: #ffb3c1; font-size: 1.3rem; cursor: pointer; flex-shrink: 0; transition: color 0.2s; }
    .delete-m:active { color: #FF4D6D; }
    .add-milestone { display: flex; flex-direction: column; gap: 8px; margin-top: 15px; }
    .add-milestone input { padding: 10px; border-radius: 8px; border: 1px solid rgba(255, 77, 109, 0.2); background: rgba(255,255,255,0.9); color: #590D22; font-family: 'Inter', sans-serif; outline: none; }
    .add-milestone input::placeholder { color: #aaa; }
    .add-milestone input:focus { border-color: #FF4D6D; box-shadow: 0 0 0 3px rgba(255, 77, 109, 0.1); }
    .add-milestone button { background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 5px; cursor: pointer; }

    .game-card { display: flex; align-items: center; gap: 15px; cursor: pointer; background: linear-gradient(135deg, #a4133c, #590D22); color: white; }
    .game-icon { font-size: 2.5rem; color: #ffb3c1; }
    .game-texts h3 { margin: 0; font-size: 1.1rem; color: white; }
    .game-texts p { margin: 4px 0 0; font-size: 0.85rem; color: rgba(255,255,255,0.8); }

    .desc { font-size: 0.9rem; color: #666; margin-bottom: 12px; line-height: 1.4; }
    .custom-select { width: 100%; padding: 12px 15px; border-radius: 12px; border: 1px solid rgba(255, 77, 109, 0.2); background: rgba(255,255,255,0.9); font-family: 'Inter', sans-serif; font-size: 1rem; color: #590D22; outline: none; appearance: none; }

    .bucket-item { display: flex; align-items: center; gap: 10px; padding: 12px; background: rgba(255,255,255,0.6); border-radius: 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid rgba(255,77,109,0.1); }
    .bucket-item:active { transform: scale(0.98); }
    .bucket-item ion-icon { font-size: 1.5rem; color: #ccc; transition: color 0.3s; }
    .bucket-item ion-icon.completed { color: #FF4D6D; }
    .bucket-item span { flex: 1; font-weight: 600; color: #590D22; font-size: 0.95rem; transition: color 0.3s; }
    .bucket-item span.strike { text-decoration: line-through; color: #888; }
    .delete-b { color: #ccc; font-size: 1.3rem; margin-left: auto; padding: 5px; }

    .profile-card { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 15px; background: rgba(255, 255, 255, 0.6); border: 1px solid rgba(255,255,255,0.8); cursor: pointer; transition: all 0.2s; margin-bottom: 15px; }
    .profile-card:active { transform: scale(0.98); background: rgba(255, 77, 109, 0.1); }
    .profile-card span { font-weight: 700; color: #590D22; font-size: 1rem; }
    .profile-icon { font-size: 1.4rem; color: #FF4D6D; }
    .profile-texts { display: flex; align-items: center; gap: 10px; }

    .logout-card { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 15px; background: rgba(255, 255, 255, 0.6); border: 1px solid rgba(255,255,255,0.8); cursor: pointer; transition: all 0.2s; }
    .logout-card:active { transform: scale(0.98); background: rgba(255, 77, 109, 0.1); }
    .logout-card span { font-weight: 700; color: #a4133c; font-size: 1rem; }
    .logout-icon { font-size: 1.4rem; color: #a4133c; }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon]
})
export class MasWidgetComponent implements OnInit, OnDestroy {
  @Output() openGameEvent = new EventEmitter<void>();

  private api = inject(LoveApiService);
  private toastCtrl = inject(ToastController);
  private actionSheetCtrl = inject(ActionSheetController);
  private router = inject(Router);
  private locationService = inject(LocationService);

  startDate: string = '';
  selectedAlbumId: string = 'feed';
  albums: any[] = [];
  milestones: any[] = [];
  bucketList: { title: string, completed: boolean }[] = [];

  newMilestoneTitle = '';
  newMilestoneDate = '';
  newBucketTitle = '';

  timeTogether = { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  private timer: any;
  uploadingAvatar = false;
  myUserId: 'juan' | 'roberta' = 'juan';

  constructor() {
    addIcons({ logOutOutline, timeOutline, settingsOutline, heart, flagOutline, addCircleOutline, gameControllerOutline, starOutline, checkmarkCircle, ellipseOutline, personCircleOutline, moonOutline, closeCircle });
  }

  async ngOnInit() {
    // 1. Sync Date from API
    try {
      const info = await this.api.getCoupleInfo();
      
      // Determinar quién soy para el avatar
      if (info.my_mood !== undefined) { // Asumiendo que getCoupleInfo devuelve info del usuario actual
        // Necesitamos saber mi nombre. getCoupleInfo nos da partner_name.
        // Si el partner_name es "Roberta" o "roberta", yo soy juan.
        if (info.partner_name && info.partner_name.toLowerCase() === 'roberta') {
          this.myUserId = 'juan';
        } else if (info.partner_name && info.partner_name.toLowerCase() === 'juan') {
          this.myUserId = 'roberta';
        } else {
          // Fallback, tratar de deducir desde un perfil de usuario si existiera
          this.myUserId = 'juan';
        }
      }

      if (info.couple && info.couple.relationship_start_date) {
        // Format to datetime-local
        const d = new Date(info.couple.relationship_start_date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        this.startDate = d.toISOString().slice(0, 16);
        await Preferences.set({ key: 'relationshipStartDate', value: this.startDate });
      } else {
        const dateRes = await Preferences.get({ key: 'relationshipStartDate' });
        if (dateRes.value) this.startDate = dateRes.value;
      }
    } catch (e) {
      const dateRes = await Preferences.get({ key: 'relationshipStartDate' });
      if (dateRes.value) this.startDate = dateRes.value;
    }

    const albumRes = await Preferences.get({ key: 'widgetAlbumId' });
    if (albumRes.value) {
      this.selectedAlbumId = albumRes.value;
    }

    // Load API data
    try {
      this.albums = await this.api.getAlbums().catch(() => []);
      this.loadMilestones();
    } catch (e) {}
    
    // Load local bucket list
    const bucketRes = await Preferences.get({ key: 'localBucketList' });
    if (bucketRes.value) {
      this.bucketList = JSON.parse(bucketRes.value);
    }

    this.startTimer();
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'medium') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'top'
    });
    toast.present();
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async saveStartDate() {
    await Preferences.set({ key: 'relationshipStartDate', value: this.startDate });
    this.calculateTime();
    
    // Sync with backend
    try {
      // Date to SQL format roughly
      const d = new Date(this.startDate);
      const iso = d.toISOString().replace('T', ' ').substring(0, 19);
      await this.api.updateCoupleInfo({ relationship_start_date: iso });
      this.showToast('Fecha guardada correctamente', 'success');
    } catch (e) {
      console.error(e);
      this.showToast('Error al guardar la fecha', 'danger');
    }
  }

  async loadMilestones() {
    this.milestones = await this.api.getMilestones();
  }

  async addMilestone() {
    if (!this.newMilestoneTitle || !this.newMilestoneDate) return;
    try {
      await this.api.addMilestone(this.newMilestoneTitle, this.newMilestoneDate);
      this.newMilestoneTitle = '';
      this.newMilestoneDate = '';
      this.loadMilestones();
      this.showToast('Hito añadido con éxito', 'success');
    } catch (e) {
      console.error(e);
      this.showToast('Error al añadir hito', 'danger');
    }
  }

  async deleteMilestone(id: number) {
    try {
      await this.api.deleteMilestone(id);
      this.loadMilestones();
      this.showToast('Hito eliminado', 'medium');
    } catch (e) {
      console.error(e);
      this.showToast('Error al eliminar hito', 'danger');
    }
  }

  async addBucketItem() {
    if (!this.newBucketTitle.trim()) return;
    this.bucketList.push({ title: this.newBucketTitle.trim(), completed: false });
    this.newBucketTitle = '';
    await this.saveBucketList();
  }

  async toggleBucketItem(index: number) {
    this.bucketList[index].completed = !this.bucketList[index].completed;
    await this.saveBucketList();
  }

  async deleteBucketItem(index: number, event: Event) {
    event.stopPropagation();
    this.bucketList.splice(index, 1);
    await this.saveBucketList();
  }

  async saveBucketList() {
    await Preferences.set({ key: 'localBucketList', value: JSON.stringify(this.bucketList) });
  }

  calculateDays(dateStr: string) {
    const d = new Date(dateStr).getTime();
    const now = new Date().getTime();
    return Math.floor(Math.abs(now - d) / (1000 * 60 * 60 * 24));
  }

  openGame() {
    this.router.navigate(['/games']);
  }

  async saveSelectedAlbum() {
    await Preferences.set({ key: 'widgetAlbumId', value: this.selectedAlbumId });
    this.showToast('Configuración guardada. El widget tardará unos minutos en actualizarse.', 'success');
  }

  startTimer() {
    this.calculateTime();
    this.timer = setInterval(() => {
      this.calculateTime();
    }, 1000);
  }

  calculateTime() {
    if (!this.startDate) return;
    
    const start = new Date(this.startDate).getTime();
    const now = new Date().getTime();
    
    if (start > now) return; // Future date

    let diff = Math.floor((now - start) / 1000);

    const years = Math.floor(diff / (365 * 24 * 60 * 60));
    diff -= years * 365 * 24 * 60 * 60;

    const months = Math.floor(diff / (30 * 24 * 60 * 60));
    diff -= months * 30 * 24 * 60 * 60;

    const days = Math.floor(diff / (24 * 60 * 60));
    diff -= days * 24 * 60 * 60;

    const hours = Math.floor(diff / (60 * 60));
    diff -= hours * 60 * 60;

    const minutes = Math.floor(diff / 60);
    diff -= minutes * 60;

    const seconds = diff;

    this.timeTogether = { years, months, days, hours, minutes, seconds };
  }

  async presentPhotoOptions(callback: (source: CameraSource) => void) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Seleccionar Imagen',
      buttons: [
        {
          text: 'Tomar Foto',
          icon: 'camera',
          handler: () => {
            callback(CameraSource.Camera);
          }
        },
        {
          text: 'Elegir de la Galería',
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

  async changeProfilePicture() {
    this.presentPhotoOptions(async (source) => {
      try {
        const image = await Camera.getPhoto({
          quality: 60, width: 300, height: 300, allowEditing: true, resultType: CameraResultType.DataUrl, source: source
        });
        
        if (image.dataUrl) {
          this.uploadingAvatar = true;
          try {
            await this.locationService.uploadAvatar(this.myUserId, image.dataUrl);
            this.showToast('Foto de perfil actualizada con éxito', 'success');
          } catch(e) {
            console.error('Error updating avatar:', e);
            this.showToast('Error al actualizar avatar', 'danger');
          } finally {
            this.uploadingAvatar = false;
          }
        }
      } catch (e) {
        console.log('User cancelled camera or error', e);
      }
    });
  }

  logout() {
    this.api.logout();
    this.router.navigate(['/login']);
  }
}
