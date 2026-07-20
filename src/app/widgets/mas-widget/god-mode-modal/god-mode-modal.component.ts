import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GlobalEventService } from '../../../services/global-event.service';
import { ToastController } from '@ionic/angular/standalone';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, flashOutline, stopCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-god-mode-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  template: `
    <div class="custom-overlay" (click)="close.emit()">
      <div class="modal-content glass-card" (click)="$event.stopPropagation()">
        <button class="close-btn" (click)="close.emit()">
          <ion-icon name="close-outline"></ion-icon>
        </button>

        <h2 class="god-title">
          <ion-icon name="flash-outline"></ion-icon>
          God Mode
        </h2>
        <p class="subtitle">Lanza un evento global a todos los usuarios</p>

        <div class="form-group">
          <label>Título de la Alerta</label>
          <input type="text" [(ngModel)]="eventData.title" placeholder="Ej: ¡España Campeona!">
        </div>

        <div class="form-group">
          <label>Mensaje</label>
          <textarea [(ngModel)]="eventData.message" rows="3" placeholder="Ej: Hoy celebramos la victoria..."></textarea>
        </div>

        <div class="form-row">
          <div class="toggle-group">
            <label>Confeti</label>
            <input type="checkbox" [(ngModel)]="eventData.confetti_enabled">
          </div>
          <div class="form-group flex-1" *ngIf="eventData.confetti_enabled">
            <label>Colores (Hex, CSV)</label>
            <input type="text" [(ngModel)]="confettiColorsStr" placeholder="#ff0000, #ffff00">
          </div>
        </div>

        <div class="form-row">
          <div class="toggle-group">
            <label>Emojis Flotantes</label>
            <input type="checkbox" [(ngModel)]="eventData.emojis_enabled">
          </div>
          <div class="form-group flex-1" *ngIf="eventData.emojis_enabled">
            <label>Emojis</label>
            <input type="text" [(ngModel)]="eventData.emojis_list" placeholder="🇪🇸,🏆,🎉">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>Color Barra (Opcional)</label>
            <input type="color" [(ngModel)]="eventData.top_bar_color" style="height:40px;width:100%">
            <button class="clear-btn" (click)="eventData.top_bar_color = ''">Quitar</button>
          </div>
          <div class="form-group flex-1">
            <label>Minutos (0=inf)</label>
            <input type="number" [(ngModel)]="eventData.duration_minutes">
          </div>
        </div>

        <div class="action-buttons">
          <button class="launch-btn" (click)="launchEvent()" [disabled]="isLoading">
            <ion-icon name="flash-outline"></ion-icon>
            {{ isLoading ? 'Lanzando...' : 'LANZAR EVENTO' }}
          </button>
          <button class="stop-btn" (click)="stopEvent()" [disabled]="isLoading">
            <ion-icon name="stop-circle-outline"></ion-icon>
            DETENER
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
    .modal-content { background: #fff; width: 90%; max-width: 450px; border-radius: 20px; padding: 30px 20px; position: relative; max-height: 90vh; overflow-y: auto; }
    .close-btn { position: absolute; top: 15px; right: 15px; background: transparent; border: none; font-size: 28px; color: #888; }
    .god-title { color: #800f2f; font-size: 1.8rem; font-weight: 900; margin: 0; display: flex; align-items: center; justify-content: center; gap: 10px; }
    .subtitle { text-align: center; color: #666; margin-bottom: 25px; font-size: 0.9rem; }
    .form-group { margin-bottom: 15px; text-align: left; }
    .form-group label { display: block; font-weight: 600; margin-bottom: 5px; color: #444; font-size: 0.85rem; }
    input[type="text"], input[type="number"], textarea { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-family: inherit; font-size: 0.9rem; }
    .form-row { display: flex; gap: 15px; margin-bottom: 15px; align-items: center; }
    .toggle-group { display: flex; align-items: center; gap: 10px; font-weight: bold; }
    .flex-1 { flex: 1; }
    .clear-btn { background: transparent; border: none; color: #FF4D6D; font-size: 0.8rem; text-decoration: underline; margin-top: 5px; padding: 0; }
    .action-buttons { display: flex; flex-direction: column; gap: 10px; margin-top: 30px; }
    .launch-btn { background: linear-gradient(45deg, #FF4D6D, #ff758f); color: white; border: none; padding: 15px; border-radius: 12px; font-size: 1.1rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; box-shadow: 0 4px 15px rgba(255,77,109,0.4); }
    .stop-btn { background: #333; color: white; border: none; padding: 15px; border-radius: 12px; font-size: 1rem; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; }
    button:active { transform: scale(0.98); }
    
    :host-context(.night-owl-mode) .modal-content { background: #1e1e1e; color: white; }
    :host-context(.night-owl-mode) .form-group label { color: #ccc; }
    :host-context(.night-owl-mode) input, :host-context(.night-owl-mode) textarea { background: #2c2c2c; border-color: #444; color: white; }
  `]
})
export class GodModeModalComponent {
  @Output() close = new EventEmitter<void>();
  private globalEventService = inject(GlobalEventService);
  private toastCtrl = inject(ToastController);

  public isLoading = false;
  
  public eventData = {
    title: '',
    message: '',
    confetti_enabled: false,
    emojis_enabled: false,
    emojis_list: '',
    top_bar_color: '',
    duration_minutes: 0
  };
  
  public confettiColorsStr = '';

  constructor() {
    addIcons({ closeOutline, flashOutline, stopCircleOutline });
  }

  async launchEvent() {
    if (!this.eventData.title || !this.eventData.message) {
      const t = await this.toastCtrl.create({ message: 'Título y Mensaje requeridos.', duration: 2000, color: 'danger' });
      t.present();
      return;
    }

    this.isLoading = true;
    try {
      const payload: any = { ...this.eventData };
      if (this.eventData.confetti_enabled && this.confettiColorsStr) {
        payload.confetti_colors = this.confettiColorsStr.split(',').map(c => c.trim()).filter(c => c);
      }
      
      await this.globalEventService.triggerEvent(payload);
      
      const t = await this.toastCtrl.create({ message: '¡Evento Global Lanzado!', duration: 3000, color: 'success' });
      t.present();
      this.close.emit();
    } catch (e: any) {
      const msg = e?.error?.error || 'Error al lanzar el evento';
      const t = await this.toastCtrl.create({ message: msg, duration: 3000, color: 'danger' });
      t.present();
    } finally {
      this.isLoading = false;
    }
  }

  async stopEvent() {
    this.isLoading = true;
    try {
      await this.globalEventService.stopEvent();
      const t = await this.toastCtrl.create({ message: 'Evento Detenido', duration: 3000, color: 'medium' });
      t.present();
      this.close.emit();
    } catch (e) {
      const t = await this.toastCtrl.create({ message: 'Error al detener', duration: 3000, color: 'danger' });
      t.present();
    } finally {
      this.isLoading = false;
    }
  }
}
