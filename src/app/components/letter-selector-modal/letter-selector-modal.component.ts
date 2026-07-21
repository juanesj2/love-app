import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, paperPlaneOutline } from 'ionicons/icons';

@Component({
  selector: 'app-letter-selector-modal',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    <div class="overlay" (click)="close.emit()">
      <div class="modal-sheet" (click)="$event.stopPropagation()">
        <button class="close-btn" (click)="close.emit()">
          <ion-icon name="close-outline"></ion-icon>
        </button>
        
        <div class="modal-header">
          <div class="header-icon">💌</div>
          <h2 class="header-title">Tus Cartas</h2>
          <p class="header-sub">Selecciona una carta para enviarla.</p>
        </div>

        <div class="letters-list">
          <div *ngIf="letters.length === 0" class="empty-state">
            <p>Aún no has creado ninguna carta.</p>
            <p>Ve a la tienda para crear tu primera carta.</p>
          </div>
          
          <div class="letter-card" *ngFor="let letter of letters" (click)="select.emit(letter)">
            <div class="letter-icon">📜</div>
            <div class="letter-info">
              <h3>{{ letter.title }}</h3>
              <p>{{ letter.subject }}</p>
            </div>
            <ion-icon name="paper-plane-outline" class="send-icon"></ion-icon>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); z-index: 10000; display: flex; flex-direction: column; justify-content: flex-end; animation: fadeIn 0.3s; }
    .modal-sheet { background: #fdf2f4; width: 100%; border-radius: 30px 30px 0 0; padding: 25px 25px 40px; box-shadow: 0 -10px 40px rgba(0,0,0,0.15); animation: slideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1); position: relative; max-height: 80vh; overflow-y: auto; }
    
    .close-btn { position: absolute; top: -10px; right: 10px; width: 36px; height: 36px; border-radius: 50%; background: white; border: none; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: #590D22; box-shadow: 0 4px 15px rgba(0,0,0,0.08); cursor: pointer; }
    
    .modal-header { text-align: center; margin-bottom: 25px; }
    .header-icon { font-size: 3rem; margin-bottom: 10px; line-height: 1; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.1)); }
    .header-title { margin: 0; font-size: 1.6rem; font-weight: 900; color: #590D22; letter-spacing: -0.5px; }
    .header-sub { margin: 5px 0 0; font-size: 0.95rem; color: #a4133c; font-weight: 500; }
    
    .letters-list { display: flex; flex-direction: column; gap: 12px; }
    
    .letter-card { background: white; border-radius: 20px; padding: 15px; display: flex; align-items: center; gap: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); cursor: pointer; transition: transform 0.2s; border: 1px solid rgba(0,0,0,0.02); }
    .letter-card:active { transform: scale(0.97); }
    
    .letter-icon { font-size: 2rem; }
    .letter-info { flex: 1; }
    .letter-info h3 { margin: 0; font-size: 1.1rem; color: #590D22; font-weight: 800; }
    .letter-info p { margin: 2px 0 0; font-size: 0.85rem; color: #a4133c; font-weight: 500; }
    
    .send-icon { font-size: 1.5rem; color: #FF4D6D; background: rgba(255, 77, 109, 0.1); padding: 8px; border-radius: 50%; }
    
    .empty-state { text-align: center; padding: 20px; color: #a4133c; font-weight: 600; opacity: 0.8; }
    
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class LetterSelectorModalComponent {
  @Input() letters: any[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() select = new EventEmitter<any>();

  constructor() {
    addIcons({ closeOutline, paperPlaneOutline });
  }
}
