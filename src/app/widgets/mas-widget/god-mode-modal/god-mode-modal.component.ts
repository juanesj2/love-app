import { Component, EventEmitter, Output, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GlobalEventService } from '../../../services/global-event.service';
import { LoveApiService } from '../../../services/love-api.service';
import { ToastController, ModalController } from '@ionic/angular/standalone';
import { IonIcon, IonToggle } from '@ionic/angular/standalone';
import { LetterFormModalComponent } from '../../../components/letter-form-modal/letter-form-modal.component';
import { addIcons } from 'ionicons';
import { closeOutline, flashOutline, stopCircleOutline, colorPaletteOutline, starOutline, eyeOutline, imageOutline, heart, closeCircle, statsChartOutline, diamondOutline, giftOutline, timeOutline } from 'ionicons/icons';

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
        <p class="subtitle">Panel de Control Global</p>

        <div class="god-tabs">
          <button [class.active]="currentTab === 'events'" (click)="currentTab = 'events'">Eventos</button>
          <button [class.active]="currentTab === 'powers'" (click)="currentTab = 'powers'">Poderes</button>
          <button [class.active]="currentTab === 'stats'" (click)="loadGodStats(); currentTab = 'stats'">Stats</button>
        </div>

        <div class="scrollable-form">
          <div class="form-group recipient-box" style="position: relative;" *ngIf="currentTab === 'events' || currentTab === 'powers'">
            <label class="feature-label">Destinatario</label>

            <!-- Show selected user badge if one is selected -->
            <div class="selected-user-badge" *ngIf="eventData.target_user_id" (click)="clearSelection()">
              <span>{{ getSelectedUserName() }}</span>
              <ion-icon name="close-circle"></ion-icon>
            </div>

            <!-- Search input, hidden when a user is selected (unless you want to change it) -->
            <div class="search-container" *ngIf="!eventData.target_user_id">
              <ion-icon name="search-outline" class="search-icon"></ion-icon>
              <input type="text" [(ngModel)]="searchTerm" (input)="filterUsers(); showDropdown = true" (focus)="showDropdown = true" placeholder="Buscar por nombre o correo..." class="search-input">
            </div>
            
            <div class="custom-dropdown" *ngIf="showDropdown && !eventData.target_user_id">
              <div class="dropdown-item" *ngIf="currentTab === 'events'" (click)="selectUser(null)">
                🌍 Todos (Global)
              </div>
              <div class="dropdown-item" *ngFor="let user of filteredUsers" (click)="selectUser(user.id)">
                <div class="user-name">{{ user.name }}</div>
                <div class="user-email">{{ user.email }}</div>
              </div>
              <div class="dropdown-empty" *ngIf="filteredUsers.length === 0">
                No se encontraron usuarios
              </div>
            </div>
          </div>

          <ng-container *ngIf="currentTab === 'events'">
          <div class="presets-section">
            <div class="section-title">
              <ion-icon name="star-outline" style="color: #FF4D6D;"></ion-icon>
              <span>Eventos Globales</span>
            </div>
            <div class="horizontal-scroll-container" style="margin-bottom: 15px;">
              <button class="theme-pill" (click)="loadTheme('navidad')">
                <span class="emoji">🎄</span> Navidad
              </button>
              <button class="theme-pill" (click)="loadTheme('ano_nuevo')">
                <span class="emoji">🎆</span> Año Nuevo
              </button>
              <button class="theme-pill" (click)="loadTheme('san_valentin')">
                <span class="emoji">💘</span> San Valentín
              </button>
              <button class="theme-pill" (click)="loadTheme('halloween')">
                <span class="emoji">🎃</span> Halloween
              </button>
            </div>

            <div class="section-title">
              <ion-icon name="heart" style="color: #FF4D6D;"></ion-icon>
              <span>Para mi chica</span>
            </div>
            <div class="horizontal-scroll-container">
              <button class="theme-pill" (click)="loadTheme('cumple')">
                <span class="emoji">🎂</span> Cumple
              </button>
              <button class="theme-pill" (click)="loadTheme('buenos_dias')">
                <span class="emoji">☀️</span> Buenos Días
              </button>
              <button class="theme-pill" (click)="loadTheme('buenas_noches')">
                <span class="emoji">🌙</span> Buenas Noches
              </button>
              <button class="theme-pill" (click)="loadTheme('amor')">
                <span class="emoji">❤️</span> Te Quiero
              </button>
              <button class="theme-pill" (click)="loadTheme('te_extrano')">
                <span class="emoji">🥺</span> Te Extraño
              </button>
              <button class="theme-pill" (click)="loadTheme('aniversario')">
                <span class="emoji">🥂</span> Aniversario
              </button>
              <button class="theme-pill" (click)="loadTheme('sorpresa')">
                <span class="emoji">🎁</span> Sorpresita
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
          </ng-container>

          <ng-container *ngIf="currentTab === 'powers'">
             <div class="feature-box">
                <div class="section-title"><ion-icon name="diamond-outline"></ion-icon> VIP Gratis</div>
                <p class="subtitle" style="text-align: left; margin: 0 0 10px 0; font-size: 0.8rem;">Requiere seleccionar un destinatario arriba.</p>
                <button class="action-btn btn-vip" (click)="grantPremium()"><ion-icon name="diamond-outline"></ion-icon> Dar Premium Eterno</button>
             </div>
             
             <div class="feature-box">
                <div class="section-title"><ion-icon name="gift-outline"></ion-icon> Lluvia de Regalos</div>
                <select class="custom-select mb-2" [(ngModel)]="powerGiftType" (ngModelChange)="onGiftTypeChange()">
                  <option value="all">Todo</option>
                  <option value="teddy">Solo Ositos</option>
                  <option value="rose">Solo Rosas</option>
                  <option value="ring">Solo Anillos</option>
                  <option value="letters">Solo Cartas</option>
                </select>
                <input type="number" [(ngModel)]="powerGiftAmount" placeholder="Cantidad (ej: 5)" class="small-input mb-2" [disabled]="powerGiftType === 'letters'">
                <button class="action-btn btn-gifts" (click)="grantGifts()"><ion-icon name="gift-outline"></ion-icon> Dar Regalos</button>
             </div>
             
             <div class="feature-box">
                <div class="section-title"><ion-icon name="time-outline"></ion-icon> Dios del Tiempo</div>
                <input type="number" [(ngModel)]="powerStreak" placeholder="Días de racha (ej: 365)" class="small-input mb-2">
                <button class="action-btn btn-time" (click)="setStreak()"><ion-icon name="time-outline"></ion-icon> Modificar Racha</button>
             </div>
             
             <div class="feature-box">
                <div class="section-title"><ion-icon name="color-palette-outline"></ion-icon> Forzar Tema</div>
                <input type="text" [(ngModel)]="powerGlobalTheme" placeholder="ej: navidad, default..." class="small-input mb-2">
                <button class="action-btn btn-theme" (click)="setGlobalTheme()"><ion-icon name="color-palette-outline"></ion-icon> Aplicar Tema Global</button>
             </div>
          </ng-container>

          <ng-container *ngIf="currentTab === 'stats'">
             <div class="stats-grid" *ngIf="godStats">
               <div class="stat-card">
                 <div class="stat-value">{{godStats.total_users}}</div>
                 <div class="stat-label">Usuarios</div>
               </div>
               <div class="stat-card">
                 <div class="stat-value">{{godStats.total_couples}}</div>
                 <div class="stat-label">Parejas</div>
               </div>
               <div class="stat-card">
                 <div class="stat-value">{{godStats.active_couples_today}}</div>
                 <div class="stat-label">Activos Hoy</div>
               </div>
               <div class="stat-card">
                 <div class="stat-value">{{godStats.total_messages}}</div>
                 <div class="stat-label">Mensajes</div>
               </div>
               <div class="stat-card">
                 <div class="stat-value">{{godStats.total_gifts}}</div>
                 <div class="stat-label">Regalos dados</div>
               </div>
               <div class="stat-card" style="grid-column: span 2;">
                 <div class="stat-label">Tema Global Actual: {{godStats.global_theme}}</div>
               </div>
             </div>
             <div *ngIf="!godStats" style="text-align:center; padding: 20px;">Cargando estadísticas...</div>
          </ng-container>
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
    
    .recipient-box { background: #f8f9fa; padding: 15px; border-radius: 16px; border: 1px solid #eee; }
    .search-container { position: relative; margin-top: 8px; }
    .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #888; font-size: 1.1rem; }
    .search-input { width: 100%; padding: 10px 12px 10px 35px !important; border: 2px solid #eee !important; border-radius: 12px !important; font-size: 0.9rem !important; background: #fff !important; margin: 0; }
    .search-input:focus { border-color: #FF4D6D !important; }
    
    .custom-dropdown { position: absolute; top: calc(100% + 5px); left: 0; right: 0; background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); max-height: 220px; overflow-y: auto; z-index: 1000; border: 1px solid #eee; }
    .dropdown-item { padding: 12px 15px; border-bottom: 1px solid #f5f5f5; cursor: pointer; transition: 0.2s; }
    .dropdown-item:active, .dropdown-item:hover { background: #fdf0f2; }
    .dropdown-item:last-child { border-bottom: none; }
    .user-name { font-weight: 700; color: #333; font-size: 0.95rem; }
    .user-email { font-size: 0.8rem; color: #888; }
    .dropdown-empty { padding: 15px; text-align: center; color: #888; font-size: 0.9rem; }
    .selected-user-badge { display: inline-flex; align-items: center; gap: 8px; background: #FF4D6D; color: white; padding: 8px 14px; border-radius: 100px; font-size: 0.9rem; font-weight: 700; margin-top: 8px; cursor: pointer; transition: 0.2s; }
    .selected-user-badge:active { transform: scale(0.95); }

    .god-tabs { display: flex; gap: 5px; margin-bottom: 15px; background: rgba(0,0,0,0.05); padding: 5px; border-radius: 12px; }
    .god-tabs button { flex: 1; padding: 8px; border-radius: 8px; background: transparent; border: none; font-weight: bold; color: #666; transition: 0.2s; cursor: pointer; }
    .god-tabs button.active { background: white; color: #FF4D6D; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    :host-context(.night-owl-mode) .god-tabs { background: rgba(255,255,255,0.05); }
    :host-context(.night-owl-mode) .god-tabs button { color: #aaa; }
    :host-context(.night-owl-mode) .god-tabs button.active { background: #333; color: #ff758f; }

    .action-btn { color: white; border: none; padding: 12px; border-radius: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
    .action-btn:active { transform: scale(0.95); }
    .btn-vip { background: linear-gradient(135deg, #FFD700, #DAA520); text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
    .btn-gifts { background: linear-gradient(135deg, #FF4D6D, #c9184a); }
    .btn-time { background: linear-gradient(135deg, #4da6ff, #1a75ff); }
    .btn-theme { background: linear-gradient(135deg, #84fab0, #8fd3f4); color: #111; }
    .mb-2 { margin-bottom: 10px; }
    .custom-select { width: 100%; padding: 10px 12px; border: 2px solid #eee; border-radius: 12px; font-family: inherit; font-size: 0.95rem; background: #fdfdfd; box-sizing: border-box; color: #333; }

    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .stat-card { background: #f8f9fa; border-radius: 16px; padding: 15px; text-align: center; border: 1px solid #eee; }
    .stat-value { font-size: 1.8rem; font-weight: 900; color: #FF4D6D; margin-bottom: 5px; }
    .stat-label { font-size: 0.8rem; color: #666; font-weight: 700; text-transform: uppercase; }
    :host-context(.night-owl-mode) .stat-card { background: #25262b; border-color: #333; }
    :host-context(.night-owl-mode) .custom-select { background: #25262b; border-color: #333; color: #fff; }
    
    
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
    :host-context(.night-owl-mode) .recipient-box { background: #25262b; border-color: #333; }
    :host-context(.night-owl-mode) .custom-dropdown { background: #1a1b1e; border-color: #444; }
    :host-context(.night-owl-mode) .dropdown-item { border-color: #333; }
    :host-context(.night-owl-mode) .dropdown-item:active, :host-context(.night-owl-mode) .dropdown-item:hover { background: #2c2d33; }
    :host-context(.night-owl-mode) .user-name { color: #eee; }
    :host-context(.night-owl-mode) .user-email { color: #aaa; }
    :host-context(.night-owl-mode) .dropdown-empty { color: #aaa; }
  `]
})
export class GodModeModalComponent implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();
  private globalEventService = inject(GlobalEventService);
  private loveApi = inject(LoveApiService);
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController);

  public isLoading = false;
  public users: any[] = [];
  public filteredUsers: any[] = [];
  public searchTerm: string = '';
  public showDropdown = false;
  
  public eventData = {
    title: '',
    message: '',
    confetti_enabled: false,
    emojis_enabled: false,
    emojis_list: '',
    top_bar_color: '',
    duration_minutes: 0,
    target_user_id: null as number | null
  };
  
  public currentTab: 'events' | 'powers' | 'stats' = 'events';
  public godStats: any = null;
  public powerTargetEmail = '';
  public powerGiftType = 'all';
  public powerGiftAmount = 999;
  public powerStreak = 365;
  public powerGlobalTheme = 'default';
  public confettiColorsStr = '';

  constructor() {
    addIcons({ closeOutline, flashOutline, stopCircleOutline, colorPaletteOutline, starOutline, eyeOutline, imageOutline, heart, closeCircle, statsChartOutline, diamondOutline, giftOutline, timeOutline });
  }

  async ngOnInit() {
    document.body.classList.add('hide-tabs');
    try {
      this.users = await this.loveApi.getAllUsers();
      this.filteredUsers = [...this.users];
      
      // Set default to myself
      const info = await this.loveApi.getCoupleInfo();
      if (info && info.my_id) {
        this.eventData.target_user_id = Number(info.my_id);
      }
    } catch (e) {
      console.error('Error loading users', e);
    }
  }

  filterUsers() {
    this.showDropdown = true;
    if (!this.searchTerm) {
      this.filteredUsers = [...this.users];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredUsers = this.users.filter(u => 
        u.name.toLowerCase().includes(term) || 
        u.email.toLowerCase().includes(term)
      );
    }
  }

  selectUser(id: number | null) {
    this.eventData.target_user_id = id as any;
    this.showDropdown = false;
    this.searchTerm = '';
  }

  getSelectedUserName() {
    if (!this.eventData.target_user_id) return '🌍 Todos (Global)';
    const targetId = Number(this.eventData.target_user_id);
    const u = this.users.find(u => Number(u.id) === targetId);
    return u ? u.name : 'Desconocido';
  }

  getSelectedUserEmail() {
    if (!this.eventData.target_user_id) return undefined;
    const targetId = Number(this.eventData.target_user_id);
    const u = this.users.find(u => Number(u.id) === targetId);
    return u ? u.email : undefined;
  }

  clearSelection() {
    this.eventData.target_user_id = null as any;
    this.showDropdown = false;
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
    // === EVENTOS GLOBALES ===
    if (theme === 'halloween') {
      this.eventData.title = '¡Feliz Halloween!';
      this.eventData.message = 'Truco o trato...';
      this.eventData.confetti_enabled = true;
      this.confettiColorsStr = '#ff6600,#000000,#800080';
      this.eventData.emojis_enabled = true;
      this.eventData.emojis_list = '🎃,👻,🦇,🕷️';
      this.eventData.top_bar_color = 'linear-gradient(135deg, #1a0033, #ff6600)';
    } else if (theme === 'navidad') {
      this.eventData.title = '¡Feliz Navidad!';
      this.eventData.message = 'Os deseamos unas fiestas mágicas 🎄';
      this.eventData.confetti_enabled = true;
      this.confettiColorsStr = '#ffffff,#ff0000,#008000';
      this.eventData.emojis_enabled = true;
      this.eventData.emojis_list = '🎄,🎅,❄️,⛄';
      this.eventData.top_bar_color = 'linear-gradient(135deg, #0f9b0f, #d60000)';
    } else if (theme === 'ano_nuevo') {
      this.eventData.title = '¡Feliz Año Nuevo!';
      this.eventData.message = 'Por un año lleno de cosas buenas ✨';
      this.eventData.confetti_enabled = true;
      this.confettiColorsStr = '#ffd700,#c0c0c0,#ffffff';
      this.eventData.emojis_enabled = true;
      this.eventData.emojis_list = '🎆,🥂,✨,🎉';
      this.eventData.top_bar_color = 'linear-gradient(135deg, #111111, #d4af37)';
    } else if (theme === 'san_valentin') {
      this.eventData.title = '¡Feliz San Valentín!';
      this.eventData.message = 'Día para celebrar el amor 💕';
      this.eventData.confetti_enabled = true;
      this.confettiColorsStr = '#ff0000,#ff69b4,#ff1493';
      this.eventData.emojis_enabled = true;
      this.eventData.emojis_list = '💘,🌹,💝,🥰';
      this.eventData.top_bar_color = 'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)';
    } 
    // === EVENTOS PARA PAREJA ===
    else if (theme === 'cumple') {
      this.eventData.title = '¡Feliz Cumpleaños!';
      this.eventData.message = '¡Que lo pases genial hoy en tu día!';
      this.eventData.confetti_enabled = true;
      this.confettiColorsStr = '#ff0000,#00ff00,#0000ff,#ffff00,#ff00ff';
      this.eventData.emojis_enabled = true;
      this.eventData.emojis_list = '🎂,🎉,🥳,🎁';
      this.eventData.top_bar_color = 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)';
    } else if (theme === 'buenos_dias') {
      this.eventData.title = '¡Buenos días mi vida!';
      this.eventData.message = 'Espero que tengas un día maravilloso ☀️';
      this.eventData.confetti_enabled = false;
      this.confettiColorsStr = '';
      this.eventData.emojis_enabled = true;
      this.eventData.emojis_list = '☀️,☕,🌻,🥰';
      this.eventData.top_bar_color = 'linear-gradient(120deg, #f6d365 0%, #fda085 100%)';
    } else if (theme === 'buenas_noches') {
      this.eventData.title = '¡Buenas noches mi amor!';
      this.eventData.message = 'Que sueñes con los angelitos ✨';
      this.eventData.confetti_enabled = false;
      this.confettiColorsStr = '';
      this.eventData.emojis_enabled = true;
      this.eventData.emojis_list = '🌙,✨,💫,😴';
      this.eventData.top_bar_color = 'linear-gradient(135deg, #1e3c72, #2a5298)';
    } else if (theme === 'amor') {
      this.eventData.title = 'Pensando en ti...';
      this.eventData.message = 'Solo quería recordarte que te amo ❤️';
      this.eventData.confetti_enabled = true;
      this.confettiColorsStr = '#ff4d6d,#c9184a';
      this.eventData.emojis_enabled = true;
      this.eventData.emojis_list = '❤️,💖,💘,🥰';
      this.eventData.top_bar_color = 'linear-gradient(135deg, #FF4D6D, #c9184a)';
    } else if (theme === 'te_extrano') {
      this.eventData.title = '¡Te echo mucho de menos!';
      this.eventData.message = 'Tengo muchas ganas de verte 🥺';
      this.eventData.confetti_enabled = false;
      this.confettiColorsStr = '';
      this.eventData.emojis_enabled = true;
      this.eventData.emojis_list = '🥺,🫂,💔,😢';
      this.eventData.top_bar_color = 'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)';
    } else if (theme === 'aniversario') {
      this.eventData.title = '¡Feliz Aniversario mi amor!';
      this.eventData.message = 'Gracias por hacerme tan feliz 🥂';
      this.eventData.confetti_enabled = true;
      this.confettiColorsStr = '#ff0000,#ff4d6d,#ffd700';
      this.eventData.emojis_enabled = true;
      this.eventData.emojis_list = '🥂,🎉,💍,❤️';
      this.eventData.top_bar_color = 'linear-gradient(to top, #ff0844 0%, #ffb199 100%)';
    } else if (theme === 'sorpresa') {
      this.eventData.title = '¡Tengo una sorpresa para ti!';
      this.eventData.message = 'Abre el chat cuando puedas 👀';
      this.eventData.confetti_enabled = true;
      this.confettiColorsStr = '#ffd700,#fb8500';
      this.eventData.emojis_enabled = true;
      this.eventData.emojis_list = '🎁,🤫,👀,✨';
      this.eventData.top_bar_color = 'linear-gradient(120deg, #f093fb 0%, #f5576c 100%)';
    }
  }

  testEvent() {
    if (!this.eventData.title || !this.eventData.message) {
      this.toastCtrl.create({ message: 'Título y Mensaje requeridos.', duration: 2000, color: 'danger' }).then(t => t.present());
      return;
    }
    const payload: any = { ...this.eventData, id: Math.floor(Math.random() * 1000000) };
    if (this.eventData.confetti_enabled && this.confettiColorsStr) {
      payload.confetti_colors = this.confettiColorsStr.split(',').map((c: string) => c.trim()).filter((c: string) => c);
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
        payload.confetti_colors = this.confettiColorsStr.split(',').map((c: string) => c.trim()).filter((c: string) => c);
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
      const t = await this.toastCtrl.create({ message: 'Evento Global Detenido.', duration: 3000, color: 'medium' });
      t.present();
      this.close.emit();
    } catch (e: any) {
      const msg = e?.error?.error || 'Error al detener';
      const t = await this.toastCtrl.create({ message: msg, duration: 3000, color: 'danger' });
      t.present();
    } finally {
      this.isLoading = false;
    }
  }

  // --- GOD MODE POWERS ---
  async loadGodStats() {
    try {
      this.godStats = await this.loveApi.getGodStats();
    } catch(e) { console.error(e); }
  }

  async grantPremium() {
    try {
      this.isLoading = true;
      const targetEmail = this.getSelectedUserEmail();
      if (!targetEmail) {
        this.toastCtrl.create({ message: 'Por favor, selecciona un destinatario arriba.', duration: 3000, color: 'warning' }).then(t => t.present());
        return;
      }
      const res = await this.loveApi.grantGodPremium(targetEmail);
      this.toastCtrl.create({ message: res.message, duration: 3000, color: 'success' }).then(t => t.present());
    } catch(e: any) {
      this.toastCtrl.create({ message: 'Error: ' + (e.error?.error || e.message), duration: 3000, color: 'danger' }).then(t => t.present());
    } finally { this.isLoading = false; }
  }
  
  onGiftTypeChange() {
    if (this.powerGiftType === 'letters') {
      this.powerGiftAmount = 1;
    }
  }

  async grantGifts() {
    try {
      this.isLoading = true;
      const emailParam = this.getSelectedUserEmail();
      const amount = this.powerGiftType === 'letters' ? 1 : this.powerGiftAmount;
      const res = await this.loveApi.grantGodGifts(this.powerGiftType, amount, emailParam);
      this.toastCtrl.create({ message: res.message, duration: 3000, color: 'success' }).then(t => t.present());
      
      if (this.powerGiftType === 'letters') {
        const modal = await this.modalCtrl.create({
          component: LetterFormModalComponent,
          cssClass: 'glass-modal'
        });
        await modal.present();
      }
    } catch(e: any) {
      this.toastCtrl.create({ message: 'Error: ' + (e.error?.error || e.message), duration: 3000, color: 'danger' }).then(t => t.present());
    } finally { this.isLoading = false; }
  }

  async setStreak() {
    try {
      this.isLoading = true;
      const res = await this.loveApi.setGodStreak(this.powerStreak);
      this.toastCtrl.create({ message: res.message, duration: 3000, color: 'success' }).then(t => t.present());
    } catch(e: any) {
      this.toastCtrl.create({ message: 'Error: ' + (e.error?.error || e.message), duration: 3000, color: 'danger' }).then(t => t.present());
    } finally { this.isLoading = false; }
  }

  async setGlobalTheme() {
    try {
      this.isLoading = true;
      const res = await this.loveApi.setGodTheme(this.powerGlobalTheme);
      this.toastCtrl.create({ message: res.message, duration: 3000, color: 'success' }).then(t => t.present());
    } catch(e: any) {
      this.toastCtrl.create({ message: 'Error: ' + (e.error?.error || e.message), duration: 3000, color: 'danger' }).then(t => t.present());
    } finally { this.isLoading = false; }
  }
}
