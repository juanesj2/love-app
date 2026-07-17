import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, chatbubblesOutline, heartOutline, trophyOutline } from 'ionicons/icons';
import { LoveApiService } from '../../services/love-api.service';

@Component({
  selector: 'app-secret-stats-modal',
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="dark">
        <ion-title style="color: #fff; font-family: monospace;">Estadísticas Secretas 👻</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()" style="color: #fff;">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="spy-content">
      <div class="loader" *ngIf="loading">
        <div class="radar-scan"></div>
        <p>Hackeando el sistema...</p>
      </div>

      <div class="stats-container" *ngIf="!loading && stats">
        <div class="stat-card">
          <div class="stat-header">
            <ion-icon name="chatbubbles-outline"></ion-icon>
            <h3>Mensajes Enviados</h3>
          </div>
          <div class="progress-wrapper">
            <div class="label-row">
              <span>Tú ({{ getMyMessages() }})</span>
              <span>Pareja ({{ getPartnerMessages() }})</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill me" [style.width.%]="getMessagePercentage('me')"></div>
              <div class="progress-bar-fill partner" [style.width.%]="getMessagePercentage('partner')"></div>
            </div>
          </div>
          <p class="winner-text" *ngIf="getMyMessages() > getPartnerMessages()">
            👑 Eres el/la charlatán/a oficial.
          </p>
          <p class="winner-text" *ngIf="getMyMessages() < getPartnerMessages()">
            👑 Tu pareja no para de hablar.
          </p>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <ion-icon name="heart-outline"></ion-icon>
            <h3>Zumbidos (Pokes)</h3>
          </div>
          <div class="progress-wrapper">
            <div class="label-row">
              <span>Tú ({{ getMyPokes() }})</span>
              <span>Pareja ({{ getPartnerPokes() }})</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill me" [style.width.%]="getPokePercentage('me')"></div>
              <div class="progress-bar-fill partner" [style.width.%]="getPokePercentage('partner')"></div>
            </div>
          </div>
          <p class="winner-text" *ngIf="getMyPokes() > getPartnerPokes()">
            📳 Spammer detectado. Eres intenso/a.
          </p>
          <p class="winner-text" *ngIf="getMyPokes() < getPartnerPokes()">
            📳 Tu pareja quiere tu atención a gritos.
          </p>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .spy-content {
      --background: #121212;
      color: #00ffcc;
      font-family: monospace;
    }
    .loader {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #00ffcc;
    }
    .radar-scan {
      width: 100px;
      height: 100px;
      border: 2px solid #00ffcc;
      border-radius: 50%;
      position: relative;
      overflow: hidden;
      margin-bottom: 20px;
      background: radial-gradient(circle, rgba(0,255,204,0.1) 0%, rgba(0,0,0,0) 70%);
    }
    .radar-scan::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 50%;
      height: 50%;
      background: linear-gradient(45deg, rgba(0,255,204,0) 0%, rgba(0,255,204,0.8) 100%);
      transform-origin: bottom right;
      animation: scan 2s linear infinite;
    }
    @keyframes scan {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .stats-container {
      padding: 20px;
    }
    .stat-card {
      background: rgba(0, 255, 204, 0.05);
      border: 1px solid rgba(0, 255, 204, 0.3);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .stat-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 15px;
      color: #fff;
    }
    .stat-header h3 {
      margin: 0;
      font-size: 1.2rem;
    }
    .stat-header ion-icon {
      font-size: 1.5rem;
      color: #00ffcc;
    }
    .progress-wrapper {
      margin-bottom: 15px;
    }
    .label-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 0.9rem;
      color: #aaa;
    }
    .progress-bar-bg {
      width: 100%;
      height: 12px;
      background: rgba(255,255,255,0.1);
      border-radius: 6px;
      display: flex;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      transition: width 1s ease-in-out;
    }
    .progress-bar-fill.me {
      background: #00ffcc;
    }
    .progress-bar-fill.partner {
      background: #ff4d6d;
    }
    .winner-text {
      text-align: center;
      margin: 0;
      font-size: 0.9rem;
      color: #ffcc00;
      font-weight: bold;
    }
  `]
})
export class SecretStatsModalComponent implements OnInit {
  @Input() myUserId!: number;
  
  loading = true;
  stats: any = null;
  private api = inject(LoveApiService);
  private modalCtrl = inject(ModalController);

  constructor() {
    addIcons({ close, chatbubblesOutline, heartOutline, trophyOutline });
  }

  async ngOnInit() {
    try {
      this.stats = await this.api.getSecretStats();
    } catch(e) {
      console.error(e);
    } finally {
      setTimeout(() => {
        this.loading = false;
      }, 1500); // 1.5s delay for cool radar effect
    }
  }

  close() {
    this.modalCtrl.dismiss();
  }

  getMyMessages() {
    if (!this.stats) return 0;
    return this.stats.user1_id === this.myUserId ? this.stats.user1_message_count : this.stats.user2_message_count;
  }

  getPartnerMessages() {
    if (!this.stats) return 0;
    return this.stats.user1_id === this.myUserId ? this.stats.user2_message_count : this.stats.user1_message_count;
  }

  getMessagePercentage(who: 'me'|'partner') {
    const me = this.getMyMessages();
    const partner = this.getPartnerMessages();
    const total = me + partner;
    if (total === 0) return 50;
    return who === 'me' ? (me / total) * 100 : (partner / total) * 100;
  }

  getMyPokes() {
    if (!this.stats) return 0;
    return this.stats.user1_id === this.myUserId ? this.stats.user1_poke_count : this.stats.user2_poke_count;
  }

  getPartnerPokes() {
    if (!this.stats) return 0;
    return this.stats.user1_id === this.myUserId ? this.stats.user2_poke_count : this.stats.user1_poke_count;
  }

  getPokePercentage(who: 'me'|'partner') {
    const me = this.getMyPokes();
    const partner = this.getPartnerPokes();
    const total = me + partner;
    if (total === 0) return 50;
    return who === 'me' ? (me / total) * 100 : (partner / total) * 100;
  }
}
