import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, paperPlaneOutline } from 'ionicons/icons';

@Component({
  selector: 'app-letter-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  template: `
    <div class="overlay" (click)="close.emit()">
      <div class="modal-sheet" (click)="$event.stopPropagation()">
        <button class="close-btn" (click)="close.emit()">
          <ion-icon name="close-outline"></ion-icon>
        </button>
        
        <div class="modal-header">
          <div class="header-icon">💌</div>
          <h2 class="header-title">Nueva Carta de Amor</h2>
          <p class="header-sub">Redacta una carta que guardarás para tu pareja.</p>
        </div>

        <div class="form-content">
          <div class="form-group">
            <label>Título (para ti)</label>
            <input type="text" [(ngModel)]="title" placeholder="Ej: Aniversario">
          </div>
          <div class="form-group">
            <label>Asunto (para el sobre)</label>
            <input type="text" [(ngModel)]="subject" placeholder="Ej: Para el amor de mi vida">
          </div>
          <div class="form-group">
            <label>Mensaje</label>
            <textarea [(ngModel)]="content" rows="6" placeholder="Escribe aquí tu carta..."></textarea>
          </div>
          
          <button class="submit-btn" [disabled]="!title || !subject || !content" (click)="onSubmit()">
            Guardar Carta <ion-icon name="paper-plane-outline"></ion-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); z-index: 10000; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; animation: fadeIn 0.3s; }
    .modal-sheet { background: #fdf2f4; width: 100%; max-width: 400px; border-radius: 30px; padding: 25px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); animation: slideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1); position: relative; }
    
    .close-btn { position: absolute; top: 15px; right: 15px; width: 36px; height: 36px; border-radius: 50%; background: white; border: none; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: #590D22; box-shadow: 0 4px 15px rgba(0,0,0,0.08); cursor: pointer; }
    
    .modal-header { text-align: center; margin-bottom: 25px; }
    .header-icon { font-size: 3rem; margin-bottom: 10px; line-height: 1; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.1)); }
    .header-title { margin: 0; font-size: 1.6rem; font-weight: 900; color: #590D22; letter-spacing: -0.5px; }
    .header-sub { margin: 5px 0 0; font-size: 0.95rem; color: #a4133c; font-weight: 500; }
    
    .form-content { display: flex; flex-direction: column; gap: 15px; }
    .form-group { display: flex; flex-direction: column; gap: 5px; }
    .form-group label { font-size: 0.9rem; font-weight: 700; color: #590D22; }
    .form-group input, .form-group textarea { width: 100%; border-radius: 15px; border: 1px solid rgba(0,0,0,0.1); padding: 12px 15px; font-size: 1rem; color: #590D22; outline: none; background: white; font-family: inherit; }
    .form-group input:focus, .form-group textarea:focus { border-color: #FF4D6D; box-shadow: 0 0 0 3px rgba(255, 77, 109, 0.1); }
    
    .submit-btn { margin-top: 10px; width: 100%; padding: 16px; border-radius: 20px; border: none; background: #FF4D6D; color: white; font-size: 1.1rem; font-weight: 800; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(255, 77, 109, 0.3); transition: transform 0.2s; }
    .submit-btn:disabled { background: #ccc; box-shadow: none; cursor: not-allowed; }
    .submit-btn:not(:disabled):active { transform: scale(0.97); }
    
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(50px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
  `]
})
export class LetterFormModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{title: string, subject: string, content: string}>();

  title = '';
  subject = '';
  content = '';

  constructor() {
    addIcons({ closeOutline, paperPlaneOutline });
  }

  onSubmit() {
    if (this.title && this.subject && this.content) {
      this.save.emit({ title: this.title, subject: this.subject, content: this.content });
    }
  }
}
