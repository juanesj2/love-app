import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, gift, mail, lockClosed } from 'ionicons/icons';
import { LoveApiService } from '../../../services/love-api.service';

@Component({
  selector: 'app-inventory-modal',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    <div class="overlay" (click)="close.emit()">
      <div class="modal-sheet" (click)="$event.stopPropagation()">
        <button class="close-btn" (click)="close.emit()">
          <ion-icon name="close-outline"></ion-icon>
        </button>
        
        <div class="modal-header">
          <div class="header-icon">🎒</div>
          <h2 class="header-title">Mis Cosas</h2>
          <p class="header-sub">Tu inventario de regalos y cartas.</p>
        </div>

        <div class="inventory-content" *ngIf="api.inventory$ | async as inv">
          <!-- Regalo -->
          <div class="inv-item">
            <div class="inv-icon"><ion-icon name="gift"></ion-icon></div>
            <div class="inv-details">
              <h4>Regalo Virtual</h4>
              <p *ngIf="inv.gifts">Disponible para enviar</p>
              <p *ngIf="!inv.gifts" class="locked">No tienes regalos.</p>
            </div>
          </div>

          <!-- Cartas -->
          <div class="inv-item" (click)="toggleLetters()" style="cursor: pointer; position: relative;">
            <div class="inv-icon"><ion-icon name="mail"></ion-icon></div>
            <div class="inv-details">
              <h4>Cartas de Amor</h4>
              <p *ngIf="!inv.letters || inv.letters.length === 0" class="locked">No tienes cartas guardadas.</p>
              <p *ngIf="inv.letters?.length > 0">{{inv.letters.length}} carta(s) lista(s)</p>
            </div>
            <ion-icon *ngIf="inv.letters?.length > 0" [name]="showLetters ? 'chevron-up' : 'chevron-down'" style="position: absolute; right: 15px; font-size: 1.2rem; color: #888;"></ion-icon>
          </div>
          
          <div class="letters-list" *ngIf="inv.letters && inv.letters.length > 0 && showLetters">
            <div class="letter-card" *ngFor="let letter of inv.letters">
              <div class="l-title">{{letter.title}}</div>
              <div class="l-subj">{{letter.subject}}</div>
              <div class="l-date">{{letter.created_at | date:'shortDate'}}</div>
            </div>
          </div>
          
          <!-- RAW JSON PARA DEPURAR -->
          <div style="margin-top: 30px; background: #eee; padding: 10px; border-radius: 10px; font-size: 10px; overflow-wrap: break-word;">
            <details>
              <summary style="cursor: pointer; color: #888;">Ver datos crudos</summary>
              <pre>{{ inv | json }}</pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); z-index: 10000; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; animation: fadeIn 0.3s; }
    .modal-sheet { background: #fdf2f4; width: 100%; max-width: 400px; border-radius: 30px; padding: 25px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); animation: slideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1); position: relative; max-height: 80vh; overflow-y: auto; }
    .close-btn { position: absolute; top: 15px; right: 15px; width: 36px; height: 36px; border-radius: 50%; background: white; border: none; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: #590D22; box-shadow: 0 4px 15px rgba(0,0,0,0.08); cursor: pointer; z-index: 100; }
    .modal-header { text-align: center; margin-bottom: 20px; }
    .header-icon { font-size: 3.5rem; margin-bottom: 10px; animation: bounce 2s infinite; }
    .header-title { color: #590D22; margin: 0 0 5px; font-size: 1.5rem; font-weight: 800; font-family: 'Outfit', sans-serif; }
    .header-sub { color: #A4133C; margin: 0; font-size: 0.95rem; opacity: 0.8; }
    
    .inv-item { display: flex; align-items: center; gap: 15px; background: white; padding: 15px; border-radius: 15px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .inv-icon { font-size: 2rem; color: #FF4D6D; background: #fff0f3; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 12px; }
    .inv-details h4 { margin: 0 0 5px; color: #590D22; font-family: 'Outfit', sans-serif; font-size: 1.1rem; }
    .inv-details p { margin: 0; color: #A4133C; font-size: 0.85rem; font-weight: 500; }
    .inv-details p.locked { color: #888; font-weight: 400; }
    
    .letters-list { display: flex; flex-direction: column; gap: 10px; padding-left: 10px; border-left: 2px solid #FF4D6D; margin-left: 20px; margin-bottom: 20px; }
    .letter-card { background: white; padding: 10px 15px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
    .l-title { font-weight: bold; color: #590D22; font-size: 0.95rem; }
    .l-subj { color: #FF4D6D; font-size: 0.8rem; margin: 2px 0; }
    .l-date { color: #999; font-size: 0.7rem; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-10px); } 60% { transform: translateY(-5px); } }
  `]
})
export class InventoryModalComponent {
  @Output() close = new EventEmitter<void>();
  public api = inject(LoveApiService);
  public showLetters = false;

  constructor() {
    addIcons({ closeOutline, gift, mail, lockClosed, chevronUp, chevronDown });
  }

  toggleLetters() {
    this.showLetters = !this.showLetters;
  }
}
