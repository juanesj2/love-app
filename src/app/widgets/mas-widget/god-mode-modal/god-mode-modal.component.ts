import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GlobalEventService } from '../../../services/global-event.service';
import { ToastController } from '@ionic/angular/standalone';
import { IonIcon, IonToggle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, flashOutline, stopCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-god-mode-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, IonToggle],
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

        <div class="scrollable-form">
          <div class="form-group">
            <label>Título de la Alerta</label>
            <input type="text" [(ngModel)]="eventData.title" placeholder="Ej: ¡España Campeona!">
          </div>

          <div class="form-group">
            <label>Mensaje</label>
            <textarea [(ngModel)]="eventData.message" rows="3" placeholder="Ej: Hoy celebramos la victoria..."></textarea>
          </div>

          <div class="form-row toggle-row">
            <ion-toggle [(ngModel)]="eventData.confetti_enabled" color="danger">Confeti</ion-toggle>
            <div class="form-group flex-1 mb-0" *ngIf="eventData.confetti_enabled">
              <input type="text" [(ngModel)]="confettiColorsStr" placeholder="#ff0000, #ffff00">
            </div>
          </div>

          <div class="form-row toggle-row">
            <ion-toggle [(ngModel)]="eventData.emojis_enabled" color="warning">Emojis Flotantes</ion-toggle>
            <div class="form-group flex-1 mb-0" *ngIf="eventData.emojis_enabled">
              <input type="text" [(ngModel)]="eventData.emojis_list" placeholder="🇪🇸,🏆,🎉">
            </div>
          </div>

          <div class="form-row" style="margin-top: 15px;">
            <div class="form-group flex-1">
              <label>Color Barra (Opcional)</label>
              <div class="color-picker-container">
                <input type="color" [(ngModel)]="eventData.top_bar_color" class="color-input">
                <button class="clear-btn" (click)="eventData.top_bar_color = ''">Quitar</button>
              </div>
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
    </div>
  `,
  styles: [`
    .custom-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); padding: 20px; box-sizing: border-box; }
    .modal-content { background: #fff; width: 100%; max-width: 450px; border-radius: 20px; padding: 25px 20px; position: relative; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 15px 35px rgba(0,0,0,0.3); }
    .scrollable-form { overflow-y: auto; overflow-x: hidden; padding-right: 5px; flex-shrink: 1; }
    .scrollable-form::-webkit-scrollbar { width: 6px; }
    .scrollable-form::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
    
    .close-btn { position: absolute; top: 15px; right: 15px; background: transparent; border: none; font-size: 28px; color: #888; z-index: 10; }
    .god-title { color: #800f2f; font-size: 1.8rem; font-weight: 900; margin: 0 0 5px 0; display: flex; align-items: center; justify-content: center; gap: 10px; }
    .subtitle { text-align: center; color: #666; margin-bottom: 20px; font-size: 0.9rem; }
    
    .form-group { margin-bottom: 15px; text-align: left; }
    .form-group.mb-0 { margin-bottom: 0; }
    .form-group label { display: block; font-weight: 600; margin-bottom: 6px; color: #444; font-size: 0.85rem; }
    
    input[type="text"], input[type="number"], textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 12px; font-family: inherit; font-size: 0.95rem; background: #f9f9f9; box-sizing: border-box; transition: all 0.3s ease; }
    input[type="text"]:focus, input[type="number"]:focus, textarea:focus { border-color: #FF4D6D; outline: none; background: #fff; box-shadow: 0 0 0 3px rgba(255,77,109,0.1); }
    
    .form-row { display: flex; gap: 15px; align-items: flex-start; }
    .toggle-row { align-items: center; justify-content: space-between; margin-bottom: 15px; background: #f5f5f5; padding: 10px 15px; border-radius: 12px; }
    ion-toggle { --track-background-checked: #FF4D6D; font-weight: 600; color: #444; font-size: 0.9rem; }
    
    .flex-1 { flex: 1; }
    .color-picker-container { display: flex; flex-direction: column; align-items: flex-start; }
    .color-input { height: 45px; width: 100%; border: none; border-radius: 8px; cursor: pointer; background: transparent; padding: 0; }
    .color-input::-webkit-color-swatch-wrapper { padding: 0; }
    .color-input::-webkit-color-swatch { border: 1px solid #ddd; border-radius: 8px; }
    
    .clear-btn { background: transparent; border: none; color: #FF4D6D; font-size: 0.8rem; text-decoration: underline; margin-top: 5px; padding: 0; cursor: pointer; }
    
    .action-buttons { display: flex; flex-direction: column; gap: 12px; margin-top: 20px; margin-bottom: 10px; }
    .launch-btn { background: linear-gradient(135deg, #FF4D6D, #ff758f); color: white; border: none; padding: 16px; border-radius: 14px; font-size: 1.1rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; box-shadow: 0 6px 20px rgba(255,77,109,0.4); cursor: pointer; transition: transform 0.2s; }
    .stop-btn { background: #2b2b2b; color: white; border: none; padding: 16px; border-radius: 14px; font-size: 1rem; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; cursor: pointer; transition: transform 0.2s; }
    button:active { transform: scale(0.96); }
    
    /* Night Mode Support */
    :host-context(.night-owl-mode) .modal-content { background: #1a1b1e; box-shadow: 0 15px 40px rgba(0,0,0,0.6); }
    :host-context(.night-owl-mode) .god-title { color: #ff758f; }
    :host-context(.night-owl-mode) .subtitle { color: #aaa; }
    :host-context(.night-owl-mode) .form-group label { color: #ddd; }
    :host-context(.night-owl-mode) input[type="text"], :host-context(.night-owl-mode) input[type="number"], :host-context(.night-owl-mode) textarea { background: #25262b; border-color: #333; color: #fff; }
    :host-context(.night-owl-mode) input[type="text"]:focus, :host-context(.night-owl-mode) input[type="number"]:focus, :host-context(.night-owl-mode) textarea:focus { border-color: #ff758f; background: #2a2b30; }
    :host-context(.night-owl-mode) .toggle-row { background: #25262b; }
    :host-context(.night-owl-mode) ion-toggle { color: #eee; }
    :host-context(.night-owl-mode) .color-input::-webkit-color-swatch { border-color: #444; }
    :host-context(.night-owl-mode) .scrollable-form::-webkit-scrollbar-thumb { background: #444; }
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
