import { Component, inject, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { LoveApiService } from '../../services/love-api.service';
import { environment } from '../../../environments/environment';
import { addIcons } from 'ionicons';
import { paperPlane, hourglassOutline } from 'ionicons/icons';

@Component({
  selector: 'app-chat-widget',
  template: `
    <div class="chat-wrapper">
      <div class="chat-header">
        <div class="status-dot"></div>
      </div>

      <ion-content class="messages-content" #msgContainer>
        <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
          <ion-refresher-content></ion-refresher-content>
        </ion-refresher>
        <div class="messages-inner">
        <div class="message-wrapper" *ngFor="let msg of messages" [class.mine]="isMine(msg)">
          <div class="bubble" [class.only-photo]="msg.photo && (!msg.mensaje || msg.mensaje === 'null')">
            <span class="sender" *ngIf="!isMine(msg)">{{msg.user?.name}}</span>
            
            <div class="photo-reply" *ngIf="msg.photo">
              <img [src]="environment.storageUrl + msg.photo.image_path" />
            </div>

            <p class="text" *ngIf="msg.mensaje && msg.mensaje !== 'null'">{{msg.mensaje}}</p>
          </div>
        </div>
        </div>
      </ion-content>

      <div class="input-area">
        <div class="input-container">
          <input 
            type="text" 
            [(ngModel)]="newMessage" 
            placeholder="Dile algo bonito..." 
            (keyup.enter)="sendMessage()" 
            class="premium-input"
            [disabled]="sending"
          />
          <button class="send-btn" (click)="sendMessage()" [disabled]="!newMessage.trim() || sending" [class.active]="newMessage.trim()">
            <ion-icon name="paper-plane" *ngIf="!sending"></ion-icon>
            <ion-icon name="hourglass-outline" *ngIf="sending"></ion-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
    .chat-wrapper { display: flex; flex-direction: column; height: 100%; background: #fdf5f7; font-family: 'Inter', sans-serif; position: relative; }
    
    .chat-header { padding: 15px 20px; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255, 77, 109, 0.1); z-index: 10; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
    .chat-header h2 { margin: 0; font-size: 1.3rem; font-weight: 800; color: #590D22; }
    .status-dot { width: 10px; height: 10px; background: #00d26a; border-radius: 50%; box-shadow: 0 0 8px rgba(0, 210, 106, 0.6); }

    .messages-content { flex: 1; --background: transparent; }
    .messages-inner { padding: 20px 15px; display: flex; flex-direction: column; gap: 12px; }
    
    .message-wrapper { display: flex; width: 100%; }
    .message-wrapper.mine { justify-content: flex-end; }
    .message-wrapper:not(.mine) { justify-content: flex-start; }
    
    .bubble { width: fit-content; max-width: 80%; padding: 8px 12px; border-radius: 12px; font-size: 1rem; line-height: 1.4; position: relative; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
    
    .mine .bubble { background: #FF4D6D; color: white; border-bottom-right-radius: 4px; }
    .message-wrapper:not(.mine) .bubble { background: white; color: #333; border-bottom-left-radius: 4px; border: 1px solid rgba(0,0,0,0.05); }
    
    .sender { font-size: 0.75rem; font-weight: 700; color: #FF4D6D; margin-bottom: 4px; display: block; }
    .text { margin: 0; word-wrap: break-word; }
    
    .photo-reply img { width: 100%; max-width: 200px; border-radius: 12px; margin-bottom: 8px; border: 2px solid rgba(255,255,255,0.2); display: block; }
    .only-photo { padding: 4px; background: transparent !important; box-shadow: none !important; border: none !important; }
    .only-photo .photo-reply img { margin-bottom: 0; }
    
    .input-area { padding: 15px; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); border-top: 1px solid rgba(255, 77, 109, 0.1); }
    .input-container { display: flex; align-items: center; gap: 10px; background: #f5ecee; border-radius: 30px; padding: 6px 6px 6px 20px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.02); border: 1px solid rgba(255, 77, 109, 0.15); transition: all 0.3s; }
    .input-container:focus-within { background: white; border-color: #FF4D6D; box-shadow: 0 4px 15px rgba(255, 77, 109, 0.1); }
    
    .premium-input { flex: 1; border: none; background: transparent; font-size: 1.05rem; color: #333; outline: none; }
    .premium-input::placeholder { color: #a08c92; }
    
    .send-btn { width: 42px; height: 42px; border-radius: 50%; border: none; background: #e0d4d7; color: white; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s; }
    .send-btn.active { background: linear-gradient(135deg, #FF4D6D 0%, #c9184a 100%); box-shadow: 0 4px 12px rgba(255, 77, 109, 0.4); transform: rotate(-10deg); }
    .send-btn.active:hover { transform: rotate(0deg) scale(1.1); }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ChatWidgetComponent implements OnInit, AfterViewChecked {
  @ViewChild('msgContainer') private msgContainer!: ElementRef;
  private api = inject(LoveApiService);
  private toastController = inject(ToastController);
  public environment = environment;
  
  messages: any[] = [];
  newMessage: string = '';
  sending = false;

  constructor() {
    addIcons({ paperPlane, hourglassOutline });
  }

  ngOnInit() {
    this.loadMessages();
  }
  
  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if (this.msgContainer && this.msgContainer.nativeElement) {
        // Ionic's ion-content scrollToBottom method
        this.msgContainer.nativeElement.scrollToBottom(300).catch(() => {});
      }
    } catch(err) { }
  }

  async handleRefresh(event: any) {
    await this.loadMessages();
    event.target.complete();
  }

  async loadMessages() {
    try {
      this.messages = await this.api.getChatMessages();
    } catch (e) {
      console.error(e);
      this.showError('No pudimos cargar los mensajes. ¿Hay conexión?');
    }
  }

  async sendMessage() {
    if (!this.newMessage.trim() || this.sending) return;
    
    this.sending = true;
    try {
      await this.api.sendMessage(this.newMessage);
      this.newMessage = '';
      await this.loadMessages();
      this.showSuccess('Mensaje enviado con éxito');
    } catch (e) {
      console.error(e);
      this.showError('Ocurrió un error al enviar tu mensaje. Inténtalo de nuevo.');
    } finally {
      this.sending = false;
    }
  }

  isMine(msg: any): boolean {
    const stored = localStorage.getItem('love_widget_user'); // 'juan' or 'roberta'
    if (!stored || !msg || !msg.user) return false;
    
    // Comparar por nombre ya que sabemos cómo se llaman los usuarios en la BD
    const myName = stored === 'juan' ? 'Juan' : 'Roberta';
    return msg.user.name === myName;
  }
  
  private async showError(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'top',
      icon: 'alert-circle-outline'
    });
    await toast.present();
  }

  private async showSuccess(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'success',
      position: 'top',
      icon: 'checkmark-circle-outline'
    });
    await toast.present();
  }
}
