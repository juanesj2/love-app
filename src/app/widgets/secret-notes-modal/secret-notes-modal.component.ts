import { Component, inject, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, ModalController, IonSpinner, AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, mailOpenOutline, heart, paperPlaneOutline, saveOutline, trashOutline } from 'ionicons/icons';
import { Preferences } from '@capacitor/preferences';
import { LoveApiService, API_BASE_URL } from '../../services/love-api.service';
import { DotLottie } from '@lottiefiles/dotlottie-web';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-secret-notes-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonSpinner],
  template: `
    <ion-content class="secret-content">
      <div class="secret-header">
        <button class="close-btn" (click)="close()">
          <ion-icon name="close-outline"></ion-icon>
        </button>
        <ion-icon name="mail-open-outline" class="header-icon"></ion-icon>
        <h2>El Buzón Secreto</h2>
        <p>Cartitas de amor ocultas donde el tiempo no existe...</p>
      </div>

      <div class="notes-container" *ngIf="!isLoading">
        
        <div class="empty-state" *ngIf="notes.length === 0">
          <canvas #sadHeartLottie width="150" height="150" style="margin: 0 auto; display: block;"></canvas>
          <p>Aún no hay cartitas de amor.</p>
          <span>Sé el primero en dejar un mensaje secreto.</span>
        </div>

        <div class="note-card is-draft" *ngFor="let draft of localDrafts" (click)="editDraft(draft)">
          <div class="note-author">
            <span class="author-name">Borrador (Solo en tu móvil)</span>
            <button class="delete-draft-btn" (click)="confirmDeleteDraft(draft.id, $event)">
              <ion-icon name="trash-outline"></ion-icon>
            </button>
          </div>
          <div class="note-body">
            <p>{{ draft.content }}</p>
          </div>
          <div class="draft-hint">Toca para editar</div>
        </div>

        <div class="note-card" *ngFor="let note of notes" [class.my-note]="note.user_id == myId" (click)="openNote(note)">
          <div class="note-author">
            <img [src]="getAvatar(note)" class="author-avatar" *ngIf="getAvatar(note)" />
            <div class="author-avatar fallback" *ngIf="!getAvatar(note)">{{ getInitial(note) }}</div>
            <span class="author-name">{{ note.user?.name || 'Amor' }}</span>
            <button class="delete-note-btn" *ngIf="note.user_id == myId" (click)="confirmDeleteNote(note.id, $event)">
              <ion-icon name="trash-outline"></ion-icon>
            </button>
          </div>
          <div class="note-body">
            <p>{{ note.content }}</p>
          </div>
        </div>
      </div>

      <div class="loading-state" *ngIf="isLoading">
        <ion-spinner name="crescent"></ion-spinner>
      </div>

      <div class="composer-container">
        <textarea 
          class="secret-textarea" 
          placeholder="Escribe algo bonito para que lo descubra..." 
          [(ngModel)]="newNoteContent" 
          rows="3">
        </textarea>
        
        <div class="action-buttons">
          <button class="save-btn" [disabled]="!newNoteContent.trim() || isSending" (click)="saveDraft()" title="Guardar Borrador">
            <ion-icon name="save-outline" *ngIf="!isSavingDraft"></ion-icon>
            <ion-spinner name="dots" *ngIf="isSavingDraft"></ion-spinner>
          </button>
          <button class="send-btn" [disabled]="!newNoteContent.trim() || isSending" (click)="sendNote()" title="Enviar">
            <ion-icon name="paper-plane-outline" *ngIf="!isSendingNote"></ion-icon>
            <ion-spinner name="dots" *ngIf="isSendingNote"></ion-spinner>
          </button>
        </div>
      </div>
    </ion-content>
    
    <!-- OVERLAY CARTA GRANDE -->
    <div class="letter-overlay" *ngIf="viewingNote" (click)="closeNote()">
      <div class="letter-paper" (click)="$event.stopPropagation()">
        <button class="close-letter-btn" (click)="closeNote()">
          <ion-icon name="close-outline"></ion-icon>
        </button>
        
        <div class="letter-header">
          <img [src]="getAvatar(viewingNote)" class="author-avatar" *ngIf="getAvatar(viewingNote)" />
          <div class="author-avatar fallback" *ngIf="!getAvatar(viewingNote)">{{ getInitial(viewingNote) }}</div>
          <span class="letter-author">De: {{ viewingNote.user?.name || 'Amor' }}</span>
        </div>

        <div class="letter-content">
          <p>{{ viewingNote.content }}</p>
        </div>
        
        <div class="letter-footer">
          <span class="letter-date">{{ viewingNote.created_at | date:'dd/MM/yyyy' }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .secret-content {
      --background: #fdf0f3;
      font-family: 'Inter', sans-serif;
    }
    
    .secret-header {
      padding: 40px 20px 20px;
      text-align: center;
      background: linear-gradient(135deg, rgba(255, 143, 163, 0.2), rgba(255, 77, 109, 0.1));
      border-bottom: 2px dashed rgba(255, 143, 163, 0.5);
      position: relative;
    }

    .close-btn {
      position: absolute;
      top: 15px;
      right: 15px;
      background: rgba(255, 255, 255, 0.5);
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      color: #800f2f;
      cursor: pointer;
    }

    .header-icon {
      font-size: 3rem;
      color: #ff4d6d;
      margin-bottom: 10px;
    }

    .secret-header h2 {
      margin: 0;
      color: #590d22;
      font-weight: 800;
      font-size: 1.8rem;
    }

    .secret-header p {
      margin: 5px 0 0;
      color: #a4133c;
      font-size: 0.95rem;
      font-style: italic;
    }

    .notes-container {
      padding: 20px;
      padding-bottom: calc(120px + var(--safe-bottom));
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #a4133c;
    }

    .empty-heart {
      font-size: 4rem;
      color: #ffb3c1;
      margin-bottom: 15px;
    }

    .note-card {
      background: #ffffff;
      border-radius: 12px;
      padding: 15px;
      margin-bottom: 15px;
      box-shadow: 0 4px 15px rgba(255, 77, 109, 0.1);
      border: 1px solid rgba(255, 143, 163, 0.2);
      position: relative;
      cursor: pointer;
    }
    
    .note-card::before {
      content: '';
      position: absolute;
      top: -10px;
      left: 20px;
      width: 20px;
      height: 20px;
      background: rgba(255, 143, 163, 0.3);
      clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
      transform: rotate(180deg);
    }

    .note-card.is-draft {
      opacity: 0.8;
      border-style: dashed;
      cursor: pointer;
    }

    .note-card.my-note {
      background: #fff0f3;
      border-color: rgba(255, 143, 163, 0.5);
    }
    
    .note-card.my-note::before {
      background: rgba(255, 143, 163, 0.5);
      left: auto;
      right: 20px;
    }

    .note-author {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      padding-bottom: 8px;
    }

    .author-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      object-fit: cover;
    }

    .author-avatar.fallback {
      background: #ff4d6d;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 0.9rem;
    }

    .author-name {
      font-weight: 700;
      color: #800f2f;
      font-size: 0.9rem;
    }

    .delete-draft-btn, .delete-note-btn {
      background: none;
      border: none;
      color: #ff4d6d;
      font-size: 1.2rem;
      cursor: pointer;
      margin-left: auto;
      padding: 0;
      display: flex;
    }

    .draft-hint {
      font-size: 0.75rem;
      color: #ff4d6d;
      text-align: right;
      margin-top: 10px;
      font-style: normal;
      font-weight: 600;
    }

    .note-body p {
      margin: 0;
      color: #444;
      font-size: 1.2rem;
      line-height: 1.5;
      font-family: 'Caveat', 'Segoe Script', cursive;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ESTILOS CARTA GRANDE */
    .letter-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.3s ease;
    }

    .letter-paper {
      background: #fffdf5;
      width: 100%;
      max-width: 400px;
      min-height: 400px;
      max-height: 85vh;
      overflow-y: auto;
      border-radius: 4px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      position: relative;
      padding: 40px 30px;
      
      /* Ruled lines */
      background-image: 
        linear-gradient(transparent 95%, #ffb3c1 95%),
        linear-gradient(90deg, transparent 95%, rgba(0,0,0,0.02) 95%);
      background-size: 100% 30px, 30px 100%;
      background-position: 0 50px, 0 0;
      background-attachment: local;
      
      /* Nice frame border */
      border: 8px solid #ffccd5;
      border-image: repeating-linear-gradient(45deg, #ffccd5, #ffccd5 10px, #ffb3c1 10px, #ffb3c1 20px) 8;
    }

    .close-letter-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(255, 77, 109, 0.1);
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ff4d6d;
      font-size: 1.2rem;
      cursor: pointer;
    }

    .letter-header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 20px;
    }

    .letter-author {
      font-weight: bold;
      color: #800f2f;
      font-family: 'Inter', sans-serif;
      font-size: 1.1rem;
    }

    .letter-content {
      font-family: 'Caveat', 'Segoe Script', cursive; 
      font-size: 1.5rem;
      line-height: 30px; /* matches background size */
      color: #590d22;
      min-height: 200px;
      white-space: pre-wrap;
      margin-top: 15px;
    }
    
    .letter-content p {
      margin: 0;
    }

    .letter-footer {
      margin-top: 30px;
      text-align: right;
      font-size: 0.9rem;
      color: #a4133c;
      font-family: 'Inter', sans-serif;
      font-style: italic;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .composer-container {
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      padding: 15px 15px calc(15px + var(--safe-bottom)) 15px;
      border-top: 1px solid rgba(255, 143, 163, 0.3);
      display: flex;
      gap: 10px;
      align-items: flex-end;
      z-index: 10;
    }

    .secret-textarea {
      flex-grow: 1;
      border: 1px solid rgba(255, 143, 163, 0.5);
      border-radius: 12px;
      padding: 10px;
      font-family: 'Inter', sans-serif;
      font-size: 0.95rem;
      resize: none;
      background: white;
      outline: none;
      color: #333;
    }
    
    .secret-textarea:focus {
      outline: none;
      border-color: #ff4d6d;
    }

    /* TEMA BÚHO NOCTURNO */
    :host-context(.night-owl-mode) .secret-content { --background: #121212 !important; }
    :host-context(.night-owl-mode) .secret-header { background: #121212 !important; border-bottom: 2px dashed rgba(255, 255, 255, 0.1) !important; }
    :host-context(.night-owl-mode) .secret-header h2 { color: #fdfdfd !important; }
    :host-context(.night-owl-mode) .secret-header p { color: #ccc !important; }
    :host-context(.night-owl-mode) .close-btn { background: rgba(255,255,255,0.1) !important; color: #fdfdfd !important; }
    :host-context(.night-owl-mode) .header-icon { color: #a78bfa !important; }
    :host-context(.night-owl-mode) .empty-state, :host-context(.night-owl-mode) .empty-state p { color: #a78bfa !important; }
    :host-context(.night-owl-mode) .empty-state span { color: #ccc !important; }
    :host-context(.night-owl-mode) .note-card { background: rgba(30,30,30,0.85) !important; border: 1px solid rgba(255,255,255,0.05) !important; box-shadow: 0 4px 15px rgba(0,0,0,0.5) !important; }
    :host-context(.night-owl-mode) .note-card::before { background: rgba(255,255,255,0.05) !important; }
    :host-context(.night-owl-mode) .note-card.my-note { background: rgba(167,139,250,0.1) !important; border-color: rgba(167,139,250,0.3) !important; }
    :host-context(.night-owl-mode) .note-card.my-note::before { background: rgba(167,139,250,0.3) !important; }
    :host-context(.night-owl-mode) .author-name { color: #e9d5ff !important; }
    :host-context(.night-owl-mode) .note-body p { color: #fdfdfd !important; }
    :host-context(.night-owl-mode) .note-author { border-bottom: 1px solid rgba(255,255,255,0.05) !important; }
    :host-context(.night-owl-mode) .delete-draft-btn, :host-context(.night-owl-mode) .delete-note-btn { color: #f87171 !important; }
    :host-context(.night-owl-mode) .draft-hint { color: #c4b5fd !important; }
    :host-context(.night-owl-mode) .composer-container { background: rgba(18,18,18,0.9) !important; border-top: 1px solid rgba(255,255,255,0.1) !important; }
    :host-context(.night-owl-mode) .secret-textarea { background: rgba(30,30,30,0.8) !important; color: #fdfdfd !important; border: 1px solid #333 !important; }
    :host-context(.night-owl-mode) .secret-textarea:focus { border-color: #a78bfa !important; }
    :host-context(.night-owl-mode) .save-btn, :host-context(.night-owl-mode) .send-btn { background: linear-gradient(135deg, #a78bfa, #8b5cf6) !important; color: white !important; }
    :host-context(.night-owl-mode) .save-btn:disabled, :host-context(.night-owl-mode) .send-btn:disabled { background: #333 !important; color: #666 !important; }
    
    /* Letter overlay in dark mode */
    :host-context(.night-owl-mode) .letter-paper { 
      background: #1a1a1a !important; 
      border: 8px solid #2a2a2a !important; 
      border-image: none !important;
      background-image: 
        linear-gradient(transparent 95%, #333 95%),
        linear-gradient(90deg, transparent 95%, rgba(255,255,255,0.02) 95%) !important;
      box-shadow: 0 10px 40px rgba(0,0,0,0.8) !important;
    }
    :host-context(.night-owl-mode) .letter-author { color: #c4b5fd !important; }
    :host-context(.night-owl-mode) .letter-content { color: #fdfdfd !important; }
    :host-context(.night-owl-mode) .letter-footer { color: #aaa !important; }
    :host-context(.night-owl-mode) .close-letter-btn { background: rgba(255,255,255,0.1) !important; color: #fdfdfd !important; }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .send-btn, .save-btn {
      color: white;
      border: none;
      border-radius: 50%;
      width: 42px;
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.2s;
    }

    .send-btn { background: #ff4d6d; }
    .save-btn { background: #ffb3c1; color: #800f2f; }
    
    .send-btn:disabled, .save-btn:disabled {
      background: #ffb3c1;
    }
    
    .send-btn:not(:disabled):active {
      transform: scale(0.9);
    }

    .loading-state {
      text-align: center;
      padding: 40px;
      color: #ff4d6d;
    }
  `]
})
export class SecretNotesModalComponent implements OnInit {
  private api = inject(LoveApiService);
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);

  notes: any[] = [];
  localDrafts: any[] = [];
  isLoading = true;
  isSending = false;
  isSendingNote = false;
  isSavingDraft = false;
  newNoteContent = '';
  myId: number | null = null;
  viewingNote: any = null;
  editingDraftId: string | null = null;
  
  @ViewChild('sadHeartLottie') lottieCanvas?: ElementRef<HTMLCanvasElement>;
  private dotLottieInstance: DotLottie | null = null;

  constructor() {
    addIcons({ closeOutline, mailOpenOutline, heart, paperPlaneOutline, saveOutline, trashOutline });
  }

  ngOnInit() {
    this.loadNotes();
  }

  async loadLocalDrafts() {
    try {
      const { value } = await Preferences.get({ key: 'secret_drafts' });
      if (value) {
        this.localDrafts = JSON.parse(value);
      }
    } catch (e) {
      console.error('Error loading drafts', e);
    }
  }

  async saveLocalDrafts() {
    await Preferences.set({ key: 'secret_drafts', value: JSON.stringify(this.localDrafts) });
  }

  async loadNotes() {
    this.isLoading = true;
    try {
      await this.loadLocalDrafts();
      
      try {
        const me = await this.api.getMe();
        if (me) {
          this.myId = me.data ? me.data.id : me.id;
        }
      } catch (err) {
        console.error('Error fetching me for notes', err);
      }
      
      const res = await this.api.getSecretNotes();
      this.notes = res.notes || [];
    } catch (e) {
      console.error('Error loading secret notes', e);
    } finally {
      this.isLoading = false;
      if (this.notes.length === 0 && this.localDrafts.length === 0) {
        setTimeout(() => this.initLottie(), 100);
      }
    }
  }

  private initLottie() {
    if (this.lottieCanvas?.nativeElement) {
      this.dotLottieInstance = new DotLottie({
        canvas: this.lottieCanvas.nativeElement,
        src: 'assets/lottie/Sad Heart.lottie',
        loop: true,
        autoplay: true,
      });
    }
  }

  editDraft(draft: any) {
    this.newNoteContent = draft.content;
    this.editingDraftId = draft.id;
  }

  async confirmDeleteDraft(id: string, event: Event) {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: '¿Borrar borrador?',
      message: 'Este borrador se perderá para siempre.',
      cssClass: 'custom-love-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Borrar',
          role: 'confirm',
          handler: () => {
            this.deleteDraft(id);
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteDraft(id: string, event?: Event) {
    if (event) event.stopPropagation();
    this.localDrafts = this.localDrafts.filter(d => d.id !== id);
    await this.saveLocalDrafts();
    if (this.editingDraftId === id) {
      this.editingDraftId = null;
      this.newNoteContent = '';
    }
  }

  async confirmDeleteNote(id: number, event: Event) {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: '¿Borrar cartita?',
      message: 'Esta cartita de amor desaparecerá para ambos.',
      cssClass: 'custom-love-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Borrar',
          role: 'confirm',
          handler: () => {
            this.deleteNote(id);
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteNote(id: number) {
    try {
      await this.api.deleteSecretNote(id);
      this.notes = this.notes.filter(n => n.id !== id);
      if (this.viewingNote?.id === id) {
        this.closeNote();
      }
    } catch (e) {
      console.error('Error deleting note', e);
    }
  }

  openNote(note: any) {
    this.viewingNote = note;
  }

  closeNote() {
    this.viewingNote = null;
  }

  async sendNote() {
    if (!this.newNoteContent.trim()) return;
    
    this.isSending = true;
    this.isSendingNote = true;
    try {
      const res = await this.api.saveSecretNote(this.newNoteContent);
      if (res.note) {
        this.notes.unshift(res.note);
      }
      
      // Easter egg check
      if (this.newNoteContent.includes('✨')) {
        const { value } = await Preferences.get({ key: 'sparkle_achievement_unlocked' });
        if (value === 'true') {
          this.triggerGoldenConfetti();
        }
      }
      
      // If we were editing a draft, remove it since it's sent
      if (this.editingDraftId) {
        this.localDrafts = this.localDrafts.filter(d => d.id !== this.editingDraftId);
        await this.saveLocalDrafts();
      }
      
      this.newNoteContent = '';
      this.editingDraftId = null;
    } catch (e) {
      console.error('Error sending note', e);
    } finally {
      this.isSending = false;
      this.isSendingNote = false;
    }
  }

  async saveDraft() {
    if (!this.newNoteContent.trim()) return;
    
    this.isSending = true;
    this.isSavingDraft = true;
    try {
      if (this.editingDraftId) {
        const draft = this.localDrafts.find(d => d.id === this.editingDraftId);
        if (draft) {
          draft.content = this.newNoteContent;
        }
      } else {
        const newDraft = {
          id: Date.now().toString(),
          content: this.newNoteContent,
          created_at: new Date().toISOString()
        };
        this.localDrafts.unshift(newDraft);
      }
      
      await this.saveLocalDrafts();
      this.newNoteContent = '';
      this.editingDraftId = null;
    } catch (e) {
      console.error('Error saving draft', e);
    } finally {
      this.isSending = false;
      this.isSavingDraft = false;
    }
  }

  getAvatar(note: any): string | null {
    if (note.user && note.user.avatar_url) {
      if (note.user.avatar_url.startsWith('http')) {
        return note.user.avatar_url;
      }
      const storageUrl = API_BASE_URL.replace('/api', '') + '/storage/';
      return storageUrl + note.user.avatar_url;
    }
    return null;
  }
  
  private triggerGoldenConfetti() {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD700', '#FFA500', '#FFF8DC', '#DAA520']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FFD700', '#FFA500', '#FFF8DC', '#DAA520']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    
    frame();
  }

  getInitial(note: any): string {
    if (note.user && note.user.name) {
      return note.user.name.charAt(0).toUpperCase();
    }
    return 'A';
  }

  close() {
    this.modalCtrl.dismiss();
  }

  ngOnDestroy() {
    if (this.dotLottieInstance) {
      this.dotLottieInstance.destroy();
      this.dotLottieInstance = null;
    }
  }
}
