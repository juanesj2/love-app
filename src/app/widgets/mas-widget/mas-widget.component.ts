import { Component, inject, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { App } from '@capacitor/app';
import { PluginListenerHandle } from '@capacitor/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonRefresher, IonRefresherContent, IonIcon, ToastController, ActionSheetController, AlertController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { LoveApiService } from '../../services/love-api.service';
import { Preferences } from '@capacitor/preferences';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { LocationService } from '../../services/location.service';
import { addIcons } from 'ionicons';
import { logOutOutline, timeOutline, settingsOutline, heart, flagOutline, addCircleOutline, gameControllerOutline, starOutline, checkmarkCircle, ellipseOutline, personCircleOutline, moonOutline, closeCircle, calendar } from 'ionicons/icons';

@Component({
  selector: 'app-mas-widget',
  template: `
    <ion-content class="scroll-content">
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <div class="mas-container">
        <div class="header">
          <h2 class="title">Panel de Control ✨</h2>
          <p class="subtitle">Gestiona tu experiencia</p>
        </div>

        <!-- Nuestro Tiempo -->
        <div class="glass-card" id="nuestro-tiempo">
          <div class="section-title">
            <ion-icon name="time-outline"></ion-icon>
            <h3>Nuestro Tiempo Juntos</h3>
          </div>
          
          <div class="date-picker-glass">
            <label>¿Cuándo empezó nuestra historia?</label>
            <div class="date-input-wrapper">
              <input type="datetime-local" class="glass-input" [(ngModel)]="startDate" (change)="saveStartDate()" />
            </div>
          </div>

          <div class="live-counter" *ngIf="startDate">
            <div class="heart-pulse">
              <ion-icon name="heart"></ion-icon>
            </div>
            <div class="time-grid">
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

        <!-- Próximos Eventos -->
        <div class="glass-card">
          <div class="section-title">
            <ion-icon name="calendar"></ion-icon>
            <h3>Próximos Eventos Especiales</h3>
          </div>
          
          <div class="milestone-list">
            <div class="milestone-item" *ngFor="let ev of annualEvents">
              <ion-icon [name]="ev.icon" class="event-icon text-pink"></ion-icon>
              <div class="milestone-info" style="margin-left: 10px;">
                <span class="m-title">{{ ev.name }}</span>
                <span class="m-date">{{ ev.dateStr }}</span>
              </div>
              <div class="m-days" *ngIf="ev.daysLeft > 0">Faltan {{ ev.daysLeft }} d</div>
              <div class="m-days" *ngIf="ev.daysLeft === 0">¡Hoy!</div>
            </div>
          </div>

          <div class="date-picker-glass" style="margin-top: 15px;">
            <label>Mi cumpleaños</label>
            <div class="date-input-wrapper">
              <input type="date" class="glass-input" [(ngModel)]="myBirthday" (change)="saveBirthdays()" />
            </div>
            <label style="margin-top: 10px;">Cumple de mi pareja</label>
            <div class="date-input-wrapper">
              <input type="date" class="glass-input" [(ngModel)]="partnerBirthday" (change)="saveBirthdays()" />
            </div>
          </div>
        </div>

        <!-- Hitos -->
        <div class="glass-card">
          <div class="section-title">
            <ion-icon name="flag-outline"></ion-icon>
            <h3>Hitos Importantes</h3>
          </div>
          
          <div class="milestone-list">
            <div class="milestone-item" *ngFor="let m of milestones">
              <div class="milestone-indicator"></div>
              <div class="milestone-info">
                <span class="m-title">{{ m.title }}</span>
                <span class="m-date">{{ m.date | date:'longDate' }}</span>
              </div>
              <div class="m-days">{{ calculateDays(m.date) }} d</div>
              <ion-icon name="close-circle" class="delete-icon" (click)="deleteMilestone(m.id)"></ion-icon>
            </div>
          </div>

          <div class="add-glass">
            <input type="text" placeholder="Ej: Viaje a París" [(ngModel)]="newMilestoneTitle" class="glass-input" />
            <input type="date" [(ngModel)]="newMilestoneDate" class="glass-input" />
            <button class="glass-btn" (click)="addMilestone()"><ion-icon name="add-circle-outline"></ion-icon> Añadir Hito</button>
          </div>
        </div>

        <!-- Cubo de Deseos -->
        <div class="glass-card">
          <div class="section-title">
            <ion-icon name="star-outline"></ion-icon>
            <h3>Cubo de Deseos</h3>
          </div>
          <p class="desc">Planes de futuro y cosas que queréis hacer juntos.</p>
          
          <div class="bucket-list">
            <div class="bucket-item" *ngFor="let item of bucketList; let i = index" (click)="toggleBucketItem(i)" [class.is-done]="item.completed">
              <ion-icon [name]="item.completed ? 'checkmark-circle' : 'ellipse-outline'" class="check-icon"></ion-icon>
              <span class="b-text">{{ item.title }}</span>
              <ion-icon name="close-circle" class="delete-icon" (click)="deleteBucketItem(i, $event)"></ion-icon>
            </div>
          </div>

          <div class="add-glass">
            <input type="text" placeholder="Ej: Viajar a Japón..." [(ngModel)]="newBucketTitle" (keyup.enter)="addBucketItem()" class="glass-input" />
            <button class="glass-btn" (click)="addBucketItem()"><ion-icon name="add-circle-outline"></ion-icon> Añadir Deseo</button>
          </div>
        </div>

        <!-- Quick Actions Grid -->
        <div class="quick-actions-grid">
          <!-- Widget Config (Spans full width) -->
          <div class="grid-card full-width">
            <h4><ion-icon name="settings-outline" class="text-pink"></ion-icon> Colección del Widget</h4>
            <select [(ngModel)]="selectedAlbumId" (change)="saveSelectedAlbum()" class="glass-select">
              <option value="feed">Todas las fotos</option>
              <option *ngFor="let album of albums" [value]="album.id">{{ album.name }}</option>
            </select>
          </div>

          <!-- Minijuego -->
          <div class="grid-card interactive" (click)="openGame()">
            <div class="icon-circle bg-purple">
              <ion-icon name="game-controller-outline"></ion-icon>
            </div>
            <h4>Test Pareja</h4>
            <span class="sub">Jugar a ciegas</span>
          </div>

          <!-- Perfil -->
          <div class="grid-card interactive" (click)="changeProfilePicture()">
            <div class="icon-circle bg-blue">
              <ion-icon name="person-circle-outline"></ion-icon>
            </div>
            <h4>Mi Avatar</h4>
            <span class="sub" *ngIf="!uploadingAvatar">Cambiar foto</span>
            <span class="sub" *ngIf="uploadingAvatar">Actualizando...</span>
          </div>
        </div>

        <!-- Logout -->
        <button class="logout-btn" (click)="confirmLogout()">
          <ion-icon name="log-out-outline"></ion-icon> Cerrar sesión
        </button>
      </div>
    </ion-content>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .scroll-content { --background: transparent; }
    .mas-container { padding: calc(env(safe-area-inset-top) + 85px) 20px 20px; font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #fff0f3 0%, #ffccd5 100%); min-height: 100%; padding-bottom: 100px; }
    
    .header { margin-bottom: 25px; text-align: center; }
    .title { margin: 0; font-size: 1.8rem; font-weight: 900; color: #590D22; letter-spacing: -0.5px; text-shadow: 0 2px 10px rgba(255,255,255,0.8); }
    .subtitle { margin: 5px 0 0; color: #a4133c; font-weight: 500; font-size: 0.95rem; }

    /* Glassmorphism Cards */
    .glass-card { background: rgba(255, 255, 255, 0.5); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-radius: 24px; padding: 22px; margin-bottom: 20px; box-shadow: 0 8px 32px rgba(255, 77, 109, 0.08); border: 1px solid rgba(255, 255, 255, 0.6); }
    
    .section-title { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
    .section-title ion-icon { font-size: 1.6rem; color: #FF4D6D; background: rgba(255,77,109,0.1); padding: 8px; border-radius: 12px; flex-shrink: 0; }
    .section-title h3 { margin: 0; font-size: 1.2rem; font-weight: 800; color: #590D22; }
    .desc { font-size: 0.9rem; color: #800f2f; margin-bottom: 15px; line-height: 1.4; font-weight: 500; }

    /* Inputs */
    .glass-input { width: 100%; padding: 14px 16px; border-radius: 14px; border: 2px solid rgba(255,255,255,0.8); background: rgba(255,255,255,0.6); font-family: 'Inter', sans-serif; font-size: 0.95rem; color: #590D22; outline: none; transition: all 0.3s; font-weight: 600; box-shadow: inset 0 2px 5px rgba(0,0,0,0.02); color-scheme: light; }
    .glass-input:focus { border-color: #FF4D6D; background: #fff; box-shadow: 0 4px 15px rgba(255,77,109,0.1); }
    .glass-input::placeholder { color: #b08a96; font-weight: normal; }
    .glass-input::-webkit-calendar-picker-indicator { cursor: pointer; filter: invert(20%) sepia(80%) saturate(300%) hue-rotate(310deg) brightness(60%) contrast(100%); opacity: 0.8; }
    .glass-input::-webkit-calendar-picker-indicator:hover { opacity: 1; }
    
    .glass-select { width: 100%; padding: 14px 16px; border-radius: 14px; border: 2px solid rgba(255,255,255,0.8); background: rgba(255,255,255,0.6); font-family: 'Inter', sans-serif; font-size: 1rem; color: #590D22; font-weight: 700; outline: none; appearance: none; cursor: pointer; }
    .glass-select:focus { border-color: #FF4D6D; background: #fff; }

    .glass-btn { width: 100%; background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; border: none; padding: 14px; border-radius: 14px; font-weight: 700; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 15px rgba(255, 77, 109, 0.3); }
    .glass-btn:active { transform: scale(0.98); box-shadow: 0 2px 8px rgba(255, 77, 109, 0.2); }

    .date-picker-glass label { display: block; font-size: 0.9rem; color: #800f2f; margin-bottom: 8px; font-weight: 600; }
    
    /* Time Grid */
    .live-counter { margin-top: 20px; text-align: center; }
    .heart-pulse ion-icon { font-size: 3.5rem; color: #FF4D6D; filter: drop-shadow(0 0 15px rgba(255, 77, 109, 0.6)); animation: pulse 1s infinite alternate cubic-bezier(0.4, 0, 0.2, 1); margin-bottom: 20px; }
    @keyframes pulse { 0% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(255,77,109,0.4)); } 100% { transform: scale(1.2); filter: drop-shadow(0 0 25px rgba(255,77,109,0.8)); } }
    
    .time-grid { display: flex; flex-wrap: nowrap; justify-content: space-between; gap: 6px; overflow: hidden; }
    .time-block { flex: 1; min-width: 0; background: rgba(255,255,255,0.7); padding: 12px 2px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid rgba(255,255,255,0.9); transition: transform 0.3s; }
    .time-block:hover { transform: translateY(-3px); }
    .time-block.highlight { background: linear-gradient(135deg, #FF4D6D, #ff758c); border: none; box-shadow: 0 6px 20px rgba(255,77,109,0.3); }
    .time-block.highlight .value, .time-block.highlight .label { color: white; }
    .value { display: block; font-size: 1.15rem; font-weight: 900; color: #590D22; white-space: nowrap; }
    .label { display: block; font-size: 0.65rem; font-weight: 700; color: #a4133c; text-transform: uppercase; margin-top: 2px; letter-spacing: -0.2px; white-space: nowrap; overflow: hidden; text-overflow: clip; }

    /* Lists (Milestones & Bucket) */
    .milestone-item, .bucket-item { display: flex; align-items: center; gap: 12px; padding: 14px; background: rgba(255,255,255,0.8); border-radius: 16px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,1); box-shadow: 0 4px 10px rgba(0,0,0,0.02); transition: all 0.3s; }
    
    .milestone-indicator { width: 8px; height: 35px; background: #FF4D6D; border-radius: 4px; }
    .milestone-info { flex: 1; overflow: hidden; }
    .m-title { display: block; font-weight: 800; color: #590D22; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .m-date { font-size: 0.8rem; color: #a4133c; font-weight: 600; margin-top: 2px; display: block; }
    .m-days { font-weight: 900; color: #FF4D6D; background: rgba(255,77,109,0.1); padding: 6px 12px; border-radius: 12px; font-size: 0.85rem; }
    
    .bucket-item.is-done { opacity: 0.6; background: rgba(255,255,255,0.4); }
    .bucket-item.is-done .b-text { text-decoration: line-through; color: #a4133c; }
    .check-icon { font-size: 1.8rem; color: #d3d3d3; transition: color 0.3s; }
    .bucket-item.is-done .check-icon { color: #FF4D6D; }
    .b-text { flex: 1; font-weight: 700; color: #590D22; font-size: 1rem; transition: color 0.3s; }
    
    .delete-icon { color: #ffccd5; font-size: 1.5rem; cursor: pointer; transition: color 0.2s; padding: 4px; }
    .delete-icon:active { color: #FF4D6D; }
    
    .add-glass { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }

    /* Quick Actions Grid */
    .quick-actions-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
    .grid-card { background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(16px); border-radius: 24px; padding: 20px 15px; box-shadow: 0 6px 20px rgba(0,0,0,0.04); border: 1px solid rgba(255,255,255,0.7); display: flex; flex-direction: column; align-items: center; text-align: center; justify-content: center; transition: transform 0.2s, background 0.2s; }
    .grid-card.full-width { grid-column: span 2; align-items: flex-start; text-align: left; padding: 20px; }
    .grid-card.full-width h4 { margin: 0 0 10px 0; font-size: 1.1rem; color: #590D22; font-weight: 800; display: flex; align-items: center; gap: 8px; }
    .grid-card.interactive:active { transform: scale(0.95); background: rgba(255,255,255,0.8); }
    
    .icon-circle { width: 55px; height: 55px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 1.8rem; color: white; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
    .bg-purple { background: linear-gradient(135deg, #7209b7, #b5179e); box-shadow: 0 4px 15px rgba(114, 9, 183, 0.3); }
    .bg-blue { background: linear-gradient(135deg, #4361ee, #4cc9f0); box-shadow: 0 4px 15px rgba(67, 97, 238, 0.3); }
    .text-pink { color: #FF4D6D; font-size: 1.4rem; }
    
    .grid-card h4 { margin: 0; font-size: 1rem; font-weight: 800; color: #590D22; }
    .grid-card .sub { font-size: 0.8rem; color: #a4133c; font-weight: 600; margin-top: 4px; }

    /* Logout */
    .logout-btn { width: 100%; background: rgba(208, 0, 0, 0.1); color: #d00000; border: 2px solid rgba(208, 0, 0, 0.2); padding: 16px; border-radius: 20px; font-weight: 800; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; transition: all 0.2s; backdrop-filter: blur(10px); }
    .logout-btn:active { background: rgba(208, 0, 0, 0.2); transform: scale(0.98); }
    .logout-btn ion-icon { font-size: 1.4rem; }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, IonContent, IonRefresher, IonRefresherContent]
})
export class MasWidgetComponent implements OnInit, OnDestroy {
  @Output() openGameEvent = new EventEmitter<void>();

  private api = inject(LoveApiService);
  private toastCtrl = inject(ToastController);
  private actionSheetCtrl = inject(ActionSheetController);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
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
  
  annualEvents: { name: string, daysLeft: number, dateStr: string, icon: string }[] = [];
  myBirthday: string = '';
  partnerBirthday: string = '';

  private timer: any;
  private appStateListener?: PluginListenerHandle;
  uploadingAvatar = false;
  myUserId: 'juan' | 'roberta' = 'juan';

  constructor() {
    addIcons({ logOutOutline, timeOutline, settingsOutline, heart, flagOutline, addCircleOutline, gameControllerOutline, starOutline, checkmarkCircle, ellipseOutline, personCircleOutline, moonOutline, closeCircle, calendar });
  }

  async ngOnInit() {
    // 1. Sync Date from API
    try {
      const info = await this.api.getCoupleInfo();
      
      // Usar IDs reales
      this.myUserId = info.my_id as any;

      if (info.couple) {
        if (info.couple.relationship_start_date) {
          const d = new Date(info.couple.relationship_start_date);
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          this.startDate = d.toISOString().slice(0, 16);
          await Preferences.set({ key: 'relationshipStartDate', value: this.startDate });
        } else {
          this.startDate = '';
          await Preferences.remove({ key: 'relationshipStartDate' });
        }
      }
    } catch (e) {
      const dateRes = await Preferences.get({ key: 'relationshipStartDate' });
      if (dateRes.value) {
        this.startDate = dateRes.value;
      }
    }
    
    // Load birthdays
    const myB = await Preferences.get({ key: 'myBirthday' });
    if (myB.value) this.myBirthday = myB.value;
    const pB = await Preferences.get({ key: 'partnerBirthday' });
    if (pB.value) this.partnerBirthday = pB.value;

    this.updateAnnualEvents();

    // Check intent
    const actionIntent = await Preferences.get({ key: 'action_intent' });
    if (actionIntent.value === 'scroll_to_counter') {
      setTimeout(() => {
        const el = document.getElementById('nuestro-tiempo');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          // Optional: Add a brief highlight class
          el.classList.add('highlight-pulse');
          setTimeout(() => el.classList.remove('highlight-pulse'), 2000);
        }
      }, 500); // Give DOM time to render
      await Preferences.remove({ key: 'action_intent' });
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

    this.appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        this.startTimer();
      } else {
        this.stopTimer();
      }
    });
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
    this.stopTimer();
    if (this.appStateListener) {
      this.appStateListener.remove();
    }
  }

  async saveStartDate() {
    await Preferences.set({ key: 'relationshipStartDate', value: this.startDate });
    this.calculateTime();
    
    // Sync with backend
    try {
      const d = new Date(this.startDate);
      const iso = d.toISOString().replace('T', ' ').substring(0, 19);
      await this.api.updateCoupleInfo({ relationship_start_date: iso });
      this.showToast('Fecha guardada correctamente', 'success');
    } catch (e) {
      console.error(e);
      this.showToast('Error al guardar la fecha', 'danger');
    }
  }

  async saveBirthdays() {
    await Preferences.set({ key: 'myBirthday', value: this.myBirthday });
    await Preferences.set({ key: 'partnerBirthday', value: this.partnerBirthday });
    this.updateAnnualEvents();
    this.showToast('Cumpleaños guardados', 'success');
  }

  async loadMilestones() {
    this.milestones = await this.api.getMilestones();
  }

  async handleRefresh(event: any) {
    await this.loadMilestones();
    event.target.complete();
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

  calculateDays(dateStr: string): number {
    const d = new Date(dateStr).getTime();
    const now = new Date().getTime();
    return Math.floor(Math.abs(now - d) / (1000 * 60 * 60 * 24));
  }

  openGame() {
    this.router.navigate(['/games']);
  }

  async saveSelectedAlbum() {
    await Preferences.set({ key: 'widgetAlbumId', value: this.selectedAlbumId });
    
    let albumName = "Feed General";
    if (this.selectedAlbumId !== 'feed') {
      const album = this.albums.find(a => a.id == this.selectedAlbumId);
      if (album) {
        albumName = album.name;
      }
    }
    await Preferences.set({ key: 'widgetAlbumName', value: albumName });
    
    this.showToast('Configuración guardada. El widget tardará unos minutos en actualizarse.', 'success');
  }

  startTimer() {
    this.stopTimer();
    this.calculateTime();
    this.timer = setInterval(() => {
      this.calculateTime();
    }, 1000);
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
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

  updateAnnualEvents() {
    this.annualEvents = [];
    const now = new Date();
    const currentYear = now.getFullYear();

    const addEvent = (name: string, month: number, day: number, icon: string, birthYear?: number) => {
      let d = new Date(currentYear, month, day);
      let eventYear = currentYear;
      if (d.getTime() < now.getTime() && !(d.getDate() === now.getDate() && d.getMonth() === now.getMonth())) {
        d.setFullYear(currentYear + 1);
        eventYear = currentYear + 1;
      }
      const daysLeft = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      // Formato DD/MM
      const dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      
      let displayName = name;
      if (birthYear) {
        const age = eventYear - birthYear;
        displayName = `${name} (${age} años)`;
      }

      this.annualEvents.push({ name: displayName, daysLeft, dateStr, icon });
    };

    addEvent('San Valentín', 1, 14, 'heart'); // 1 is February (0-indexed)
    addEvent('Halloween', 9, 31, 'moon-outline'); // 9 is October
    addEvent('Navidad', 11, 25, 'star-outline'); // 11 is December

    if (this.startDate) {
      const start = new Date(this.startDate);
      // Optional: calculate anniversary years!
      let eventYear = currentYear;
      let d = new Date(currentYear, start.getMonth(), start.getDate());
      if (d.getTime() < now.getTime() && !(d.getDate() === now.getDate() && d.getMonth() === now.getMonth())) {
        eventYear = currentYear + 1;
      }
      const years = eventYear - start.getFullYear();
      addEvent(`Aniversario (${years} años)`, start.getMonth(), start.getDate(), 'time-outline');
    }

    if (this.myBirthday) {
      const parts = this.myBirthday.split('-');
      if (parts.length === 3) {
        addEvent('Mi Cumpleaños', parseInt(parts[1]) - 1, parseInt(parts[2]), 'person-circle-outline', parseInt(parts[0]));
      }
    }

    if (this.partnerBirthday) {
      const parts = this.partnerBirthday.split('-');
      if (parts.length === 3) {
        addEvent('Cumple de Pareja', parseInt(parts[1]) - 1, parseInt(parts[2]), 'person-circle-outline', parseInt(parts[0]));
      }
    }

    this.annualEvents.sort((a, b) => a.daysLeft - b.daysLeft);
  }

  async presentPhotoOptions(callback: (source: CameraSource) => void) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Seleccionar Imagen',
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
            await this.api.uploadAvatar(image.dataUrl);
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


  async confirmLogout() {
    const alert = await this.alertCtrl.create({
      header: '¿Cerrar Sesión?',
      message: '¿Seguro que quieres cerrar sesión? Acuérdate de tu contraseña.',
      cssClass: 'premium-login-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Cerrar Sesión', handler: () => this.logout(), cssClass: 'alert-button-danger' }
      ]
    });
    await alert.present();
  }

  logout() {
    this.api.logout();
    this.router.navigate(['/login']);
  }
}
