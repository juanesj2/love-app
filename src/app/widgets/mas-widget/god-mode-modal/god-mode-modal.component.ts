import { Component, EventEmitter, Output, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GlobalEventService } from '../../../services/global-event.service';
import { ToastController } from '@ionic/angular/standalone';
import { IonIcon, IonToggle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, flashOutline, stopCircleOutline, colorPaletteOutline, starOutline, eyeOutline, imageOutline } from 'ionicons/icons';

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
        <p class="subtitle">Diseña y lanza un evento global</p>

        <div class="scrollable-form">
          <div class="presets-section">
            <div class="section-title">
              <ion-icon name="star-outline" style="color: #FF4D6D;"></ion-icon>
              <span>Eventos Rápidos</span>
            </div>
            <div class="horizontal-scroll-container">
              <button class="theme-pill" (click)="loadTheme('cumple')">
                <span class="emoji">🎂</span> Cumple
              </button>
              <button class="theme-pill" (click)="loadTheme('amor')">
                <span class="emoji">❤️</span> Amor
              </button>
              <button class="theme-pill" (click)="loadTheme('espana')">
                <span class="emoji">🇪🇸</span> España
              </button>
              <button class="theme-pill" (click)="loadTheme('halloween')">
                <span class="emoji">🎃</span> Halloween
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>Título de la Alerta</label>
            <input type="text" [(ngModel)]="eventData.title" placeholder="Ej: ¡España Campeona!">
          </div>

          <div class="form-group">
            <label>Mensaje</label>
            <textarea [(ngModel)]="eventData.message" rows="2" placeholder="Ej: Hoy celebramos la victoria..."></textarea>
          </div>

          <div class="feature-box">
            <div class="toggle-row">
              <span class="feature-label">🎉 Confeti Mágico</span>
              <ion-toggle [(ngModel)]="eventData.confetti_enabled" color="danger"></ion-toggle>
            </div>
            
            <div class="presets-container" *ngIf="eventData.confetti_enabled">
              <label>Paleta de colores:</label>
              <div class="preset-row">
                <div class="color-preset multicolor" (click)="setConfetti('#ff0000,#00ff00,#0000ff,#ffff00,#ff00ff')" [class.active]="confettiColorsStr === '#ff0000,#00ff00,#0000ff,#ffff00,#ff00ff'"></div>
                <div class="color-preset" [style.background]="'linear-gradient(135deg, #ff4d6d, #c9184a)'" (click)="setConfetti('#ff4d6d,#c9184a')" [class.active]="confettiColorsStr === '#ff4d6d,#c9184a'"></div>
                <div class="color-preset" [style.background]="'linear-gradient(90deg, #aa151b 33%, #f1bf00 33%, #f1bf00 66%, #aa151b 66%)'" (click)="setConfetti('#aa151b,#f1bf00')" [class.active]="confettiColorsStr === '#aa151b,#f1bf00'"></div>
                <div class="color-preset" [style.background]="'linear-gradient(135deg, #ffd700, #fb8500)'" (click)="setConfetti('#ffd700,#fb8500')" [class.active]="confettiColorsStr === '#ffd700,#fb8500'"></div>
              </div>
              <input type="text" class="small-input" [(ngModel)]="confettiColorsStr" placeholder="O personaliza: #HEX, #HEX">
            </div>
          </div>

          <div class="feature-box">
            <div class="toggle-row">
              <span class="feature-label">😎 Emojis Flotantes</span>
              <ion-toggle [(ngModel)]="eventData.emojis_enabled" color="warning"></ion-toggle>
            </div>
            
            <div class="presets-container" *ngIf="eventData.emojis_enabled">
              <label>Packs rápidos:</label>
              <div class="preset-row">
                <button class="emoji-preset" (click)="setEmojis('🥳,🎉,🎈')" [class.active]="eventData.emojis_list === '🥳,🎉,🎈'">🎉</button>
                <button class="emoji-preset" (click)="setEmojis('🇪🇸,🏆,🥇')" [class.active]="eventData.emojis_list === '🇪🇸,🏆,🥇'">🏆</button>
                <button class="emoji-preset" (click)="setEmojis('❤️,💖,💘')" [class.active]="eventData.emojis_list === '❤️,💖,💘'">❤️</button>
                <button class="emoji-preset" (click)="setEmojis('👻,🎃,🦇')" [class.active]="eventData.emojis_list === '👻,🎃,🦇'">👻</button>
              </div>
              <input type="text" class="small-input" [(ngModel)]="eventData.emojis_list" placeholder="O escribe los tuyos: 🐶,🐱">
            </div>
          </div>

          <div class="feature-box">
            <label class="feature-label">Color Barra Superior</label>
            <div class="presets-container" style="margin-top: 8px; border-top: none; padding-top: 0;">
              <div class="preset-row">
                <div class="color-preset" [style.background]="'linear-gradient(135deg, #FF4D6D, #c9184a)'" (click)="eventData.top_bar_color = 'linear-gradient(135deg, #FF4D6D, #c9184a)'" [class.active]="eventData.top_bar_color === 'linear-gradient(135deg, #FF4D6D, #c9184a)'"></div>
                
                <div class="color-preset" [style.background]="'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'" (click)="eventData.top_bar_color = 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'" [class.active]="eventData.top_bar_color === 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'"></div>
                
                <div class="color-preset" [style.background]="'linear-gradient(120deg, #f093fb 0%, #f5576c 100%)'" (click)="eventData.top_bar_color = 'linear-gradient(120deg, #f093fb 0%, #f5576c 100%)'" [class.active]="eventData.top_bar_color === 'linear-gradient(120deg, #f093fb 0%, #f5576c 100%)'"></div>

                <div class="color-preset" [style.background]="'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)'" (click)="eventData.top_bar_color = 'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)'" [class.active]="eventData.top_bar_color === 'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)'"></div>
              </div>
              <input type="text" class="small-input" [(ngModel)]="eventData.top_bar_color" placeholder="Color o linear-gradient (ej: #FF0000)">
            </div>
          </div>

          <div class="form-row" style="margin-top: 10px;">
            <div class="form-group flex-1 mb-0">
              <label>Minutos (0=inf)</label>
              <input type="number" [(ngModel)]="eventData.duration_minutes">
            </div>
          </div>

          <div class="action-buttons">
            <button class="test-btn" (click)="testEvent()" [disabled]="isLoading">
              <ion-icon name="eye-outline"></ion-icon>
              PROBAR LOCALMENTE
            </button>
            <button class="launch-btn" (click)="launchEvent()" [disabled]="isLoading">
              <ion-icon name="flash-outline"></ion-icon>
              {{ isLoading ? 'Lanzando...' : 'LANZAR EVENTO' }}
            </button>
            <button class="stop-btn" (click)="stopEvent()" [disabled]="isLoading">
              <ion-icon name="stop-circle-outline"></ion-icon>
              DETENER ACTUAL
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); padding: 90px 20px; box-sizing: border-box; }
    .modal-content { background: #fff; width: 100%; max-width: 380px; border-radius: 24px; padding: 20px; position: relative; max-height: 100%; display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0,0,0,0.2); box-sizing: border-box; }
    .scrollable-form { overflow-y: auto; overflow-x: hidden; padding-right: 5px; flex-shrink: 1; }
    .scrollable-form::-webkit-scrollbar { width: 5px; }
    .scrollable-form::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
    
    .close-btn { position: absolute; top: 15px; right: 15px; background: rgba(0,0,0,0.05); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: none; font-size: 20px; color: #666; z-index: 10; cursor: pointer; transition: 0.2s; }
    .close-btn:active { transform: scale(0.9); }
    
    .god-title { color: #800f2f; font-size: 1.6rem; font-weight: 900; margin: 0 0 5px 0; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .subtitle { text-align: center; color: #888; margin-bottom: 15px; font-size: 0.85rem; }
    
    .form-group { margin-bottom: 12px; text-align: left; }
    .form-group.mb-0 { margin-bottom: 0; }
    label { display: block; font-weight: 700; margin-bottom: 6px; color: #444; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
    
    input[type="text"], input[type="number"], textarea { width: 100%; padding: 10px 12px; border: 2px solid #eee; border-radius: 12px; font-family: inherit; font-size: 0.95rem; background: #fdfdfd; box-sizing: border-box; transition: all 0.2s ease; color: #333; }
    input[type="text"]:focus, input[type="number"]:focus, textarea:focus { border-color: #FF4D6D; outline: none; background: #fff; box-shadow: 0 4px 10px rgba(255,77,109,0.1); }
    .small-input { padding: 8px 12px !important; font-size: 0.85rem !important; margin-top: 10px; }
    
    .feature-box { background: #f8f9fa; border-radius: 16px; padding: 12px 15px; margin-bottom: 12px; border: 1px solid #eee; transition: 0.3s; }
    .toggle-row { display: flex; align-items: center; justify-content: space-between; }
    .feature-label { font-weight: 800; color: #333; font-size: 0.95rem; }
    ion-toggle { --track-background-checked: #FF4D6D; }
    
    .presets-container { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ddd; }
    .presets-container label { font-size: 0.75rem; color: #666; margin-bottom: 8px; }
    .preset-row { display: flex; gap: 10px; }
    
    .color-preset { width: 40px; height: 40px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: 0.2s; }
    .color-preset.multicolor { background: conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000); }
    .color-preset.active { border-color: #333; transform: scale(1.1); box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
    
    .emoji-preset { flex: 1; background: white; border: 2px solid #eee; border-radius: 10px; padding: 6px 0; font-size: 1.2rem; cursor: pointer; transition: 0.2s; display: flex; justify-content: center; }
    .emoji-preset.active { border-color: #FF4D6D; background: rgba(255,77,109,0.05); transform: scale(1.05); }
    
    .form-row { display: flex; gap: 12px; align-items: flex-start; }
    .flex-1 { flex: 1; }
    .color-picker-container { display: flex; align-items: center; gap: 10px; }
    .color-input { height: 40px; width: 100%; border: none; border-radius: 10px; cursor: pointer; background: transparent; padding: 0; }
    .color-input::-webkit-color-swatch-wrapper { padding: 0; }
    .color-input::-webkit-color-swatch { border: 2px solid #eee; border-radius: 10px; }
    
    .action-buttons { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
    .test-btn { background: linear-gradient(135deg, #4da6ff, #1a75ff); color: white; border: none; padding: 14px; border-radius: 16px; font-size: 1.05rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; box-shadow: 0 6px 20px rgba(77,166,255,0.3); cursor: pointer; transition: 0.2s; }
    .launch-btn { background: linear-gradient(135deg, #FF4D6D, #ff758f); color: white; border: none; padding: 14px; border-radius: 16px; font-size: 1.05rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; box-shadow: 0 6px 20px rgba(255,77,109,0.3); cursor: pointer; transition: 0.2s; }
    .stop-btn { background: #f1f3f5; color: #555; border: none; padding: 14px; border-radius: 16px; font-size: 0.95rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; cursor: pointer; transition: 0.2s; }
    button:active { transform: scale(0.96); }

    .presets-section { margin-bottom: 20px; }
    .section-title { display: flex; align-items: center; gap: 6px; font-weight: 800; color: #444; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
    .horizontal-scroll-container { display: flex; gap: 12px; overflow-x: auto; padding: 4px 4px 10px 4px; margin: 0 -4px; scroll-behavior: smooth; -webkit-overflow-scrolling: touch; }
    .horizontal-scroll-container::-webkit-scrollbar { display: none; }
    .theme-pill { flex: 0 0 auto; display: flex; align-items: center; gap: 6px; background: white; border: none; padding: 10px 16px; border-radius: 100px; font-weight: 700; color: #555; font-size: 0.9rem; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .theme-pill:active { transform: scale(0.95); box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
    .theme-pill .emoji { font-size: 1.1rem; }
    
    /* Night Mode Support */
    :host-context(.night-owl-mode) .modal-content { background: #1a1b1e; box-shadow: 0 20px 50px rgba(0,0,0,0.6); }
    :host-context(.night-owl-mode) .god-title { color: #ff758f; }
    :host-context(.night-owl-mode) .subtitle { color: #888; }
    :host-context(.night-owl-mode) label { color: #aaa; }
    :host-context(.night-owl-mode) .close-btn { background: rgba(255,255,255,0.1); color: #ccc; }
    
    :host-context(.night-owl-mode) input[type="text"], :host-context(.night-owl-mode) input[type="number"], :host-context(.night-owl-mode) textarea { background: #25262b; border-color: #333; color: #fff; }
    :host-context(.night-owl-mode) input[type="text"]:focus, :host-context(.night-owl-mode) input[type="number"]:focus, :host-context(.night-owl-mode) textarea:focus { border-color: #ff758f; background: #2a2b30; }
    
    :host-context(.night-owl-mode) .feature-box { background: #25262b; border-color: #333; }
    :host-context(.night-owl-mode) .feature-label { color: #eee; }
    :host-context(.night-owl-mode) .presets-container { border-color: #444; }
    :host-context(.night-owl-mode) .emoji-preset { background: #1a1b1e; border-color: #333; }
    :host-context(.night-owl-mode) .emoji-preset.active { border-color: #ff758f; background: rgba(255,117,143,0.1); }
    :host-context(.night-owl-mode) .color-input::-webkit-color-swatch { border-color: #444; }
    :host-context(.night-owl-mode) .stop-btn { background: #2c2d33; color: #ccc; }
    :host-context(.night-owl-mode) .section-title { color: #aaa; }
    :host-context(.night-owl-mode) .theme-pill { background: #25262b; color: #ddd; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
  `]
})
export class GodModeModalComponent implements OnInit, OnDestroy {
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
    addIcons({ closeOutline, flashOutline, stopCircleOutline, colorPaletteOutline, starOutline, eyeOutline, imageOutline });
  }

  ngOnInit() {
    document.body.classList.add('hide-tabs');
  }

  ngOnDestroy() {
    document.body.classList.remove('hide-tabs');
  }

  setConfetti(colors: string) {
    this.confettiColorsStr = colors;
  }

  setEmojis(emojis: string) {
    this.eventData.emojis_list = emojis;
  }

  loadTheme(theme: string) {
    if (theme === 'halloween') {
      this.eventData.title = '¡Feliz Halloween!';
      this.eventData.message = 'Truco o trato...';
      this.eventData.confetti_enabled = true;
      this.confettiColorsStr = '#ff6600,#000000,#800080';
      this.eventData.emojis_enabled = true;
      this.eventData.emojis_list = '🎃,👻,🦇,🕷️';
      this.eventData.top_bar_color = 'linear-gradient(135deg, #1a0033, #ff6600)';
    } else if (theme === 'cumple') {
      this.eventData.title = '¡Feliz Cumpleaños!';
      this.eventData.message = '¡Que lo pases genial!';
      this.eventData.confetti_enabled = true;
      this.confettiColorsStr = '#ff0000,#00ff00,#0000ff,#ffff00,#ff00ff';
      this.eventData.emojis_enabled = true;
      this.eventData.emojis_list = '🎂,🎉,🥳,🎁';
      this.eventData.top_bar_color = 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)';
    } else if (theme === 'amor') {
      this.eventData.title = '¡Sorpresa de Amor!';
      this.eventData.message = 'Te quiero muchísimo ❤️';
      this.eventData.confetti_enabled = true;
      this.confettiColorsStr = '#ff4d6d,#c9184a';
      this.eventData.emojis_enabled = true;
      this.eventData.emojis_list = '❤️,💖,💘,🥰';
      this.eventData.top_bar_color = 'linear-gradient(135deg, #FF4D6D, #c9184a)';
    } else if (theme === 'espana') {
      this.eventData.title = '¡Viva España!';
      this.eventData.message = '¡A por todas!';
      this.eventData.confetti_enabled = true;
      this.confettiColorsStr = '#aa151b,#f1bf00';
      this.eventData.emojis_enabled = true;
      this.eventData.emojis_list = '🇪🇸,🏆,🥇,⚽';
      this.eventData.top_bar_color = 'linear-gradient(to bottom, #c60b1e 25%, #ffc400 25%, #ffc400 75%, #c60b1e 75%)';
    }
  }

  testEvent() {
    if (!this.eventData.title || !this.eventData.message) {
      this.toastCtrl.create({ message: 'Título y Mensaje requeridos.', duration: 2000, color: 'danger' }).then(t => t.present());
      return;
    }
    const payload: any = { ...this.eventData, id: Math.floor(Math.random() * 1000000) };
    if (this.eventData.confetti_enabled && this.confettiColorsStr) {
      payload.confetti_colors = this.confettiColorsStr.split(',').map(c => c.trim()).filter(c => c);
    }
    
    localStorage.removeItem('dismissed_global_event_' + payload.id);
    this.globalEventService.activeEvent$.next(payload);
    
    this.toastCtrl.create({ message: 'Modo Prueba: Solo lo ves tú', duration: 2500, color: 'tertiary' }).then(t => t.present());
    this.close.emit();
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
