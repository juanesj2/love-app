import { Component, inject, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, IonContent } from '@ionic/angular';
import { Firestore, doc, getDoc, onSnapshot, setDoc } from '@angular/fire/firestore';
import { LoveApiService } from '../../services/love-api.service';
import { environment } from '../../../environments/environment';
import { addIcons } from 'ionicons';
import { paperPlane, hourglassOutline, close, arrowUndoOutline, heart, happy, sad, flame, thumbsUp } from 'ionicons/icons';
@Component({
  selector: 'app-chat-widget',
  template: `
    <div class="chat-wrapper">
      <ion-content class="messages-content" #msgContainer>
        <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
          <ion-refresher-content></ion-refresher-content>
        </ion-refresher>
        
        <ion-list class="messages-inner">
        <ion-item-sliding *ngFor="let msg of messages" #slidingItem>
          <ion-item class="transparent-item" lines="none" (contextmenu)="onContextMenu($event, msg)">
            <div class="message-wrapper" [class.mine]="isMine(msg)">
              <div class="msg-avatar-container" *ngIf="!isMine(msg)">
                <img *ngIf="avatars[msg.user?.name]" [src]="avatars[msg.user.name]" class="msg-avatar" />
                <div *ngIf="!avatars[msg.user?.name]" class="msg-avatar-fallback">{{ msg.user?.name?.charAt(0) || 'U' }}</div>
              </div>
              
              <div class="bubble-wrapper">
                <div class="reply-context" *ngIf="chatMeta[msg.id]?.replyTo" (click)="scrollToMessage(chatMeta[msg.id].replyTo.id)">
                  <span class="reply-context-name">{{chatMeta[msg.id].replyTo.user}}</span>
                  <span class="reply-context-text">{{chatMeta[msg.id].replyTo.text}}</span>
                </div>

                <div class="bubble" [class.only-photo]="msg.photo && (!msg.mensaje || msg.mensaje === 'null')">
                  <span class="sender" *ngIf="!isMine(msg)">{{msg.user?.name}}</span>
                  
                  <div class="photo-reply" *ngIf="msg.photo">
                    <ion-img [src]="environment.storageUrl + msg.photo.image_path"></ion-img>
                  </div>

                  <p class="text" *ngIf="msg.mensaje && msg.mensaje !== 'null'">{{msg.mensaje}}</p>
                  
                  <div class="reactions-container" *ngIf="hasReactions(msg)">
                    <span class="reaction" *ngFor="let r of getReactions(msg)">{{r}}</span>
                  </div>
                </div>
              </div>

              <div class="msg-avatar-container" *ngIf="isMine(msg)">
                <img *ngIf="avatars[msg.user?.name]" [src]="avatars[msg.user.name]" class="msg-avatar" />
                <div *ngIf="!avatars[msg.user?.name]" class="msg-avatar-fallback">{{ msg.user?.name?.charAt(0) || 'U' }}</div>
              </div>
            </div>
          </ion-item>
          
          <ion-item-options [side]="isMine(msg) ? 'end' : 'start'" (ionSwipe)="onSwipeReply(msg, slidingItem)" class="custom-options">
            <ion-item-option color="light" class="reply-option" expandable (click)="onSwipeReply(msg, slidingItem)">
              <div class="reply-icon-circle">
                <ion-icon name="arrow-undo-outline"></ion-icon>
              </div>
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
        </ion-list>
      </ion-content>

      <ion-popover [isOpen]="showReactionsMsgId !== null" [event]="popoverEvent" (didDismiss)="closePopover()" class="reactions-popover-host" [showBackdrop]="false">
        <ng-template>
          <div class="reactions-popover-content" *ngIf="!showCustomEmojiInput">
            <span (click)="addReaction(activeMsg, '❤️')">❤️</span>
            <span (click)="addReaction(activeMsg, '😂')">😂</span>
            <span (click)="addReaction(activeMsg, '🥺')">🥺</span>
            <span (click)="addReaction(activeMsg, '🔥')">🔥</span>
            <span (click)="addReaction(activeMsg, '👍')">👍</span>
            <span class="custom-emoji-btn" (click)="openCustomEmoji()">➕</span>
          </div>
          <div class="reactions-popover-content custom-input-mode" *ngIf="showCustomEmojiInput">
            <input type="text" id="customEmojiInput" placeholder="Añade emoji" (keyup.enter)="addCustomReaction(customEmojiInput.value)" #customEmojiInput class="custom-emoji-field">
            <button class="add-btn" (click)="addCustomReaction(customEmojiInput.value)">OK</button>
          </div>
        </ng-template>
      </ion-popover>

      <div class="input-area">
        <div class="reply-preview-container" *ngIf="replyingTo">
          <div class="reply-preview">
            <div class="reply-header">
              <div class="reply-title">
                <ion-icon name="arrow-undo-outline"></ion-icon>
                <span>Respondiendo a <strong>{{replyingTo.user?.name}}</strong></span>
              </div>
              <ion-icon name="close" class="close-reply" (click)="replyingTo = null"></ion-icon>
            </div>
            <div class="reply-text">{{replyingTo.mensaje && replyingTo.mensaje !== 'null' ? replyingTo.mensaje : '📷 Foto'}}</div>
          </div>
        </div>

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
    
    .messages-content { flex: 1; --background: transparent; }
    .messages-inner { padding: 20px 15px; display: flex; flex-direction: column; gap: 12px; background: transparent !important; }
    
    ion-item-sliding { background: transparent !important; }
    .transparent-item { --background: transparent !important; background: transparent !important; --inner-padding-end: 0; --padding-start: 0; }
    
    .message-wrapper { display: flex; width: 100%; animation: slideUp 0.3s ease-out forwards; opacity: 0; transform: translateY(10px); gap: 8px; align-items: flex-end; }
    @keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
    .message-wrapper.mine { justify-content: flex-end; }
    .message-wrapper:not(.mine) { justify-content: flex-start; }
    
    .bubble { width: fit-content; max-width: 80%; padding: 8px 12px; border-radius: 12px; font-size: 1rem; line-height: 1.4; position: relative; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
    
    .mine .bubble { background: #FF4D6D; color: white; border-bottom-right-radius: 4px; }
    .message-wrapper:not(.mine) .bubble { background: white; color: #333; border-bottom-left-radius: 4px; border: 1px solid rgba(0,0,0,0.05); }
    
    .sender { font-size: 0.75rem; font-weight: 700; color: #FF4D6D; margin-bottom: 4px; display: block; }
    .text { margin: 0; word-wrap: break-word; }
    
    .msg-avatar-container { width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.1); background: white; }
    .msg-avatar { width: 100%; height: 100%; object-fit: cover; }
    .msg-avatar-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; font-weight: bold; font-size: 0.8rem; }
    
    
    .photo-reply ion-img { width: 100%; max-width: 200px; border-radius: 12px; margin-bottom: 8px; border: 2px solid rgba(255,255,255,0.2); display: block; overflow: hidden; }
    .only-photo { padding: 4px; background: transparent !important; box-shadow: none !important; border: none !important; }
    .only-photo .photo-reply ion-img { margin-bottom: 0; }
    
    .bubble-wrapper { display: flex; flex-direction: column; max-width: 80%; position: relative; margin-bottom: 14px; }
    .message-wrapper.mine .bubble-wrapper { align-items: flex-end; }
    .message-wrapper:not(.mine) .bubble-wrapper { align-items: flex-start; }
    
    .reply-context { background: rgba(0,0,0,0.05); padding: 8px 12px; border-radius: 12px; font-size: 0.8rem; margin-bottom: 6px; z-index: 0; opacity: 0.95; cursor: pointer; border-left: 4px solid #FF4D6D; }
    .mine .reply-context { background: rgba(255, 77, 109, 0.15); border-left: none; border-right: 4px solid #FF4D6D; color: #333; }
    .reply-context-name { font-weight: bold; color: #FF4D6D; display: block; font-size: 0.75rem; margin-bottom: 2px; }
    .mine .reply-context-name { color: #c9184a; }
    .reply-context-text { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; color: #666; }
    
    .reactions-popover-host { --width: auto; --box-shadow: none; --background: transparent; }
    .reactions-popover-host::part(content) { overflow: visible; border-radius: 24px; }
    .reactions-popover-content { display: flex; gap: 12px; padding: 12px 16px; font-size: 1.8rem; justify-content: center; align-items: center; border: 1px solid rgba(0,0,0,0.08); border-radius: 24px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
    .reactions-popover-content span { cursor: pointer; transition: transform 0.2s; }
    .reactions-popover-content span:active { transform: scale(1.3); }
    .custom-emoji-btn { background: rgba(0,0,0,0.05); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem !important; color: #666; }
    
    .custom-input-mode { padding: 12px; gap: 12px; }
    .custom-emoji-field { border: none; background: #f0f0f0; color: #333; padding: 10px 16px; border-radius: 24px; font-size: 1.5rem; width: 140px; outline: none; text-align: center; }
    .custom-emoji-field::placeholder { color: #aaa; font-size: 1rem; }
    .add-btn { background: #FF4D6D; color: white; border: none; padding: 10px 20px; border-radius: 24px; font-weight: bold; cursor: pointer; font-size: 1rem; box-shadow: 0 4px 10px rgba(255,77,109,0.3); }
    
    .reactions-container { position: absolute; bottom: -12px; right: 10px; background: white; padding: 2px 6px; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); display: flex; gap: 2px; border: 1px solid rgba(0,0,0,0.05); z-index: 2; }
    .mine .reactions-container { right: auto; left: 10px; }
    
    .custom-options { background: transparent !important; border: none; }
    .reply-option { --background: transparent !important; --color: transparent !important; background: transparent !important; }
    .reply-option::part(native) { background: transparent !important; padding: 0 20px; }
    .reply-icon-circle { width: 40px; height: 40px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .reply-icon-circle ion-icon { font-size: 1.5rem; color: #FF4D6D; }
    .reaction { font-size: 0.9rem; }
    
    .reply-preview-container { padding: 10px 15px 0; width: 100%; }
    .reply-preview { background: white; border-radius: 12px; padding: 10px 15px; border-left: 4px solid #FF4D6D; box-shadow: 0 2px 10px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 4px; }
    .reply-header { display: flex; justify-content: space-between; align-items: center; }
    .reply-title { display: flex; align-items: center; gap: 6px; color: #FF4D6D; font-size: 0.85rem; }
    .close-reply { color: #999; font-size: 1.2rem; cursor: pointer; }
    .reply-text { font-size: 0.9rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .input-area { background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); padding-bottom: env(safe-area-inset-bottom); border-top: 1px solid rgba(0,0,0,0.05); display: flex; flex-direction: column; }
    .input-container { padding: 10px 15px; display: flex; align-items: center; gap: 10px; }
    
    .premium-input { flex: 1; background: #f8f9fa; border: 1px solid rgba(0,0,0,0.05); border-radius: 20px; padding: 12px 20px; font-size: 1rem; color: #333; outline: none; transition: all 0.3s ease; }
    .premium-input:focus { background: white; border-color: #FF4D6D; box-shadow: 0 0 0 3px rgba(255,77,109,0.1); }
    
    .send-btn { width: 44px; height: 44px; border-radius: 50%; border: none; background: #e0d4d7; color: white; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s; }
    .send-btn.active { background: linear-gradient(135deg, #FF4D6D 0%, #c9184a 100%); box-shadow: 0 4px 12px rgba(255, 77, 109, 0.4); transform: rotate(-10deg); }
    .send-btn.active:hover { transform: rotate(0deg) scale(1.1); }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ChatWidgetComponent implements OnInit, AfterViewInit {
  @ViewChild(IonContent, { static: false }) private msgContainer!: IonContent;
  private api = inject(LoveApiService);
  private toastController = inject(ToastController);
  private firestore = inject(Firestore);
  public environment = environment;
  
  messages: any[] = [];
  newMessage: string = '';
  sending = false;
  avatars: { [key: string]: string } = {};
  
  replyingTo: any = null;
  chatMeta: any = {};
  showReactionsMsgId: number | null = null;
  
  private touchTimer: any;

  constructor() {
    addIcons({ paperPlane, hourglassOutline, close, arrowUndoOutline, heart, happy, sad, flame, thumbsUp });
  }

  private viewInitialized = false;

  ngOnInit() {
    this.loadAvatars();
    this.loadMessages();
    this.listenToChatMeta();
  }

  listenToChatMeta() {
    const metaDoc = doc(this.firestore, 'locations', 'chat_meta');
    onSnapshot(metaDoc, (snap) => {
      if (snap.exists()) {
        this.chatMeta = snap.data();
      }
    });
  }

  async loadAvatars() {
    try {
      const juanDoc = await getDoc(doc(this.firestore, 'locations', 'juan'));
      if (juanDoc.exists() && juanDoc.data()?.['avatar']) {
        this.avatars['Juan'] = juanDoc.data()['avatar'];
      }
      const robertaDoc = await getDoc(doc(this.firestore, 'locations', 'roberta'));
      if (robertaDoc.exists() && robertaDoc.data()?.['avatar']) {
        this.avatars['Roberta'] = robertaDoc.data()['avatar'];
      }
    } catch (e) {
      console.error('Error loading avatars', e);
    }
  }

  ngAfterViewInit() {
    this.viewInitialized = true;
    setTimeout(() => this.scrollToBottom(false), 50);
    setTimeout(() => this.scrollToBottom(false), 300);
    setTimeout(() => this.scrollToBottom(false), 600);
  }

  scrollToBottom(animated: boolean = true): void {
    if (!this.viewInitialized || !this.msgContainer) return;
    try {
      this.msgContainer.scrollToBottom(animated ? 300 : 0).catch(() => {});
    } catch(err) { }
  }

  async handleRefresh(event: any) {
    await this.loadMessages();
    event.target.complete();
  }

  async loadMessages() {
    try {
      // 1. Mostrar caché primero para experiencia instantánea
      const cache = await Preferences.get({ key: 'chat_cache' });
      if (cache.value) {
        this.messages = JSON.parse(cache.value);
        setTimeout(() => this.scrollToBottom(false), 50);
        setTimeout(() => this.scrollToBottom(false), 300);
      }

      // 2. Fetch de la red en segundo plano
      const newMessages = await this.api.getChatMessages();
      
      // 3. Actualizar la vista solo si hay cambios (evita parpadeos)
      if (JSON.stringify(this.messages) !== JSON.stringify(newMessages)) {
        this.messages = newMessages;
        setTimeout(() => this.scrollToBottom(false), 100);
        setTimeout(() => this.scrollToBottom(true), 500);
        await Preferences.set({ key: 'chat_cache', value: JSON.stringify(this.messages) });
      }
    } catch (e) {
      console.error(e);
      this.showError('No pudimos cargar los mensajes. ¿Hay conexión?');
    }
  }

  async sendMessage() {
    if (!this.newMessage.trim() || this.sending) return;
    
    this.sending = true;
    const isReplyingTo = this.replyingTo;
    
    try {
      await this.api.sendMessage(this.newMessage);
      this.newMessage = '';
      this.replyingTo = null;
      await this.loadMessages();
      
      if (isReplyingTo) {
         const myName = localStorage.getItem('love_widget_user') === 'juan' ? 'Juan' : 'Roberta';
         const myLastMsg = this.messages.slice().reverse().find(m => m.user?.name === myName);
         if (myLastMsg) {
           const metaDoc = doc(this.firestore, 'locations', 'chat_meta');
           await setDoc(metaDoc, {
             [myLastMsg.id]: {
                replyTo: {
                   id: isReplyingTo.id,
                   user: isReplyingTo.user?.name,
                   text: isReplyingTo.mensaje || '📷 Foto'
                }
             }
           }, { merge: true });
         }
      }
      
      setTimeout(() => this.scrollToBottom(true), 100);
      // Removed success toast so it doesn't interrupt chat flow
    } catch (e) {
      console.error(e);
      this.showError('Ocurrió un error al enviar tu mensaje. Inténtalo de nuevo.');
    } finally {
      this.sending = false;
    }
  }

  // --- Swipes y Reacciones ---

  activeMsg: any = null;
  popoverEvent: Event | null = null;
  showCustomEmojiInput = false;

  onContextMenu(event: any, msg: any) {
    event.preventDefault();
    this.popoverEvent = event;
    this.activeMsg = msg;
    this.showReactionsMsgId = msg.id;
    this.showCustomEmojiInput = false;
  }

  closePopover() {
    this.showReactionsMsgId = null;
    this.showCustomEmojiInput = false;
  }

  openCustomEmoji() {
    this.showCustomEmojiInput = true;
    setTimeout(() => {
      const input = document.getElementById('customEmojiInput');
      if (input) input.focus();
    }, 100);
  }

  addCustomReaction(emoji: string) {
    if (!emoji || !emoji.trim()) return;
    this.addReaction(this.activeMsg, emoji.trim());
    this.closePopover();
  }

  onSwipeReply(msg: any, slidingItem: any) {
    this.replyToMessage(msg);
    setTimeout(() => {
      slidingItem.close();
    }, 100);
  }

  replyToMessage(msg: any) {
    this.replyingTo = msg;
    setTimeout(() => {
      const input = document.querySelector('.premium-input') as HTMLInputElement;
      if (input) input.focus();
    }, 150);
  }

  scrollToMessage(id: number) {
    // In a real app we'd scroll to the DOM element with this ID
    // For now we'll just log or implement a simple scroll
    console.log('Scroll to', id);
  }

  hasReactions(msg: any): boolean {
    return this.chatMeta[msg.id]?.reactions && Object.keys(this.chatMeta[msg.id].reactions).length > 0;
  }

  getReactions(msg: any): string[] {
    if (!this.hasReactions(msg)) return [];
    return Object.values(this.chatMeta[msg.id].reactions);
  }

  async addReaction(msg: any, emoji: string) {
    this.showReactionsMsgId = null;
    const myName = localStorage.getItem('love_widget_user') === 'juan' ? 'Juan' : 'Roberta';
    const metaDoc = doc(this.firestore, 'locations', 'chat_meta');
    
    // We use setDoc with merge: true to avoid overwriting other messages
    await setDoc(metaDoc, {
      [msg.id]: {
        reactions: {
          [myName]: emoji
        }
      }
    }, { merge: true });
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
