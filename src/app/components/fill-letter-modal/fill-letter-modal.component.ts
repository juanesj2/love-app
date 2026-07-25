import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, saveOutline } from 'ionicons/icons';
import { LoveApiService } from '../../services/love-api.service';
import { PendingLetterService } from '../../services/pending-letter.service';

@Component({
  selector: 'app-fill-letter-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  template: `
    <div class="overlay">
      <div class="modal-sheet">
        <button class="close-btn" (click)="closeOverlay()">
          <ion-icon name="close-outline"></ion-icon>
        </button>
        
        <div class="modal-header">
          <div class="header-icon">✍️</div>
          <h3 class="header-title">Personaliza tu Carta</h3>
          <p class="header-sub">Guarda este recuerdo en tu inventario</p>
        </div>

        <div class="form-group">
          <label>Título</label>
          <input type="text" [(ngModel)]="title" placeholder="Ej. Nuestro primer mes" />
        </div>

        <div class="form-group">
          <label>Asunto</label>
          <input type="text" [(ngModel)]="subject" placeholder="Ej. Para el amor de mi vida" />
        </div>

        <div class="form-group">
          <label>Contenido</label>
          <textarea [(ngModel)]="content" rows="6" placeholder="Escribe aquí tu mensaje especial..."></textarea>
        </div>

        <button class="save-btn" (click)="saveLetter()" [disabled]="isSaving || !title || !content">
          <ion-icon name="save-outline"></ion-icon>
          {{ isSaving ? 'Guardando...' : 'Guardar en Inventario' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); z-index: 10005; display: flex; justify-content: center; align-items: center; padding: 20px; animation: fadeIn 0.3s; }
    .modal-sheet { background: #fdf2f4; width: 100%; max-width: 400px; border-radius: 24px; padding: 25px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); animation: slideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1); position: relative; display: flex; flex-direction: column; gap: 15px; }
    .close-btn { position: absolute; top: 15px; right: 15px; width: 32px; height: 32px; border-radius: 50%; background: white; border: none; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; color: #590D22; box-shadow: 0 2px 10px rgba(0,0,0,0.1); cursor: pointer; z-index: 10; }
    .modal-header { text-align: center; margin-bottom: 10px; }
    .header-icon { font-size: 3rem; margin-bottom: 5px; }
    .header-title { color: #590D22; margin: 0 0 5px; font-size: 1.4rem; font-weight: 800; font-family: 'Outfit', sans-serif; }
    .header-sub { color: #A4133C; margin: 0; font-size: 0.9rem; opacity: 0.8; }
    
    .form-group { display: flex; flex-direction: column; gap: 5px; }
    .form-group label { font-size: 0.85rem; color: #590D22; font-weight: 600; margin-left: 5px; }
    .form-group input, .form-group textarea { width: 100%; border: 2px solid transparent; border-radius: 12px; padding: 12px 15px; font-size: 0.95rem; background: white; color: #590D22; font-family: 'Outfit', sans-serif; transition: all 0.3s; outline: none; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
    .form-group input:focus, .form-group textarea:focus { border-color: #FF4D6D; box-shadow: 0 4px 12px rgba(255, 77, 109, 0.15); }
    .form-group textarea { resize: none; line-height: 1.4; }
    
    .save-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; background: linear-gradient(135deg, #FF4D6D, #ff758f); color: white; border: none; padding: 14px; border-radius: 12px; font-size: 1.1rem; font-weight: bold; margin-top: 10px; cursor: pointer; box-shadow: 0 4px 15px rgba(255, 77, 109, 0.3); transition: transform 0.2s, box-shadow 0.2s; }
    .save-btn:active { transform: scale(0.97); }
    .save-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
    
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class FillLetterModalComponent implements OnInit {
  @Input() letterId!: string;
  @Output() close = new EventEmitter<void>();
  
  title = '';
  subject = '';
  content = '';
  isSaving = false;

  constructor(
    private api: LoveApiService,
    private pendingService: PendingLetterService
  ) {
    addIcons({ closeOutline, saveOutline });
  }

  ngOnInit() {
    // defaults
  }

  async saveLetter() {
    if (!this.title || !this.content) return;
    this.isSaving = true;
    try {
      await this.api.updateInventoryLetter(this.letterId, {
        title: this.title,
        subject: this.subject,
        content: this.content
      });
      // Also close the gift overlay so we are totally done
      this.pendingService.dismiss('gift');
      this.close.emit();
    } catch (e) {
      console.error('Error saving letter:', e);
    } finally {
      this.isSaving = false;
    }
  }

  closeOverlay() {
    this.close.emit();
  }
}
