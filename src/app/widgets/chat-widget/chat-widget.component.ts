import { Component, inject, OnInit, ViewChild, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, ActionSheetController, AlertController, IonContent } from '@ionic/angular';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { LoveApiService } from '../../services/love-api.service';
import { environment } from '../../../environments/environment';
import { addIcons } from 'ionicons';
import { paperPlane, hourglassOutline, close, arrowUndoOutline, trashOutline, pencil, image, search, mic, stopCircle, colorPalette, checkmark, add, play, pause, colorWandOutline, eye, eyeOffOutline } from 'ionicons/icons';
@Component({
  selector: 'app-chat-widget',
  template: `
    <div class="chat-wrapper">
      <ion-content class="messages-content" #msgContainer>
        <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
          <ion-refresher-content></ion-refresher-content>
        </ion-refresher>
        
        <div class="messages-inner">
        <div class="message-row" *ngFor="let msg of regularMessages; trackBy: trackByMsgId" [id]="'msg-' + msg.id">
          <!-- Graffitis anclados a este mensaje -->
          <ng-container *ngIf="graffitisByAnchorId[msg.id]">
            <ng-container *ngFor="let graf of graffitisByAnchorId[msg.id]">
              <img *ngIf="!hiddenGraffitis[graf.id]"
                   [src]="environment.storageUrl + graf.photo?.image_path" 
                   class="graffiti-overlay" 
                   (touchstart)="startGraffitiPress(graf, $event)"
                   (mousedown)="startGraffitiPress(graf, $event)"
                   (touchend)="endGraffitiPress()"
                   (mouseup)="endGraffitiPress()"
                   (mouseleave)="endGraffitiPress()"
                   [style.left.px]="graf.offsetX" 
                   [style.top.px]="graf.offsetY" 
                   [style.width.px]="graf.width" 
                   [style.height.px]="graf.height" />
            </ng-container>
          </ng-container>

          <!-- Iconos de swipe -->
          <div class="swipe-icon-left" [id]="'swipe-icon-' + msg.id" *ngIf="isMine(msg)">
            <div class="reply-icon-circle"><ion-icon name="arrow-undo-outline"></ion-icon></div>
          </div>
          <div class="swipe-icon-right" [id]="'swipe-icon-' + msg.id" *ngIf="!isMine(msg)">
            <div class="reply-icon-circle"><ion-icon name="arrow-undo-outline"></ion-icon></div>
          </div>

          <!-- Contenido del mensaje deslizable -->
          <div class="message-content-wrapper" [id]="'slide-el-' + msg.id"
            (contextmenu)="onContextMenu($event, msg)"
            (touchstart)="ts($event, msg)"
            (touchmove)="tm($event, msg)"
            (touchend)="te($event, msg)"
            (mousedown)="startPress($event, msg)"
            (mouseup)="endPress()"
            (mouseleave)="endPress()">
            <div class="message-wrapper" [class.mine]="isMine(msg)">
              <div class="msg-avatar-container" *ngIf="!isMine(msg)">
                <img *ngIf="avatars[msg.user?.name]" [src]="avatars[msg.user.name]" class="msg-avatar" />
                <div *ngIf="!avatars[msg.user?.name]" class="msg-avatar-fallback">{{ msg.user?.name?.charAt(0) || 'U' }}</div>
              </div>
              
              <div class="bubble-wrapper">
                <div class="reply-context" *ngIf="msg.reply_to" (click)="scrollToMessage(msg.reply_to.id)">
                  <span class="reply-context-name">{{msg.reply_to.user}}</span>
                  <span class="reply-context-text">{{msg.reply_to.text}}</span>
                </div>

                <div class="bubble" [class.only-photo]="msg.photo && (!msg.mensaje || msg.mensaje === 'null')"
                                    [class.transparent-bubble]="msg.mensaje && msg.mensaje.startsWith('[DOODLE]')">
                  
                  <div class="restore-graffitis-btn" *ngIf="hasHiddenGraffitis(msg.id)" (click)="showGraffitis(msg.id)">
                    <ion-icon name="eye"></ion-icon> Mostrar grafitis
                  </div>
                  
                  <div class="photo-reply" *ngIf="msg.photo && !msg.mensaje?.startsWith('[DOODLE]') && !msg.mensaje?.startsWith('[AUDIO]')">
                    <img [src]="environment.storageUrl + msg.photo.image_path" loading="lazy" />
                  </div>

                  <p class="text" *ngIf="msg.mensaje && msg.mensaje !== 'null' && !msg.mensaje.startsWith('[GIF]') && !msg.mensaje.startsWith('[DOODLE]') && !msg.mensaje.startsWith('[AUDIO]')">
                    {{msg.mensaje}}
                    <span class="edited-label" *ngIf="msg.is_edited">(editado)</span>
                  </p>
                  <div class="gif-reply" *ngIf="msg.mensaje && msg.mensaje.startsWith('[GIF]')">
                    <img [src]="msg.mensaje.replace('[GIF]', '')" loading="lazy" class="chat-gif" />
                  </div>
                  <div class="doodle-reply" *ngIf="msg.mensaje && msg.mensaje.startsWith('[DOODLE]')">
                    <img [src]="environment.storageUrl + msg.photo?.image_path" loading="lazy" class="chat-doodle" />
                  </div>
                  <div class="audio-reply" *ngIf="msg.mensaje && msg.mensaje.startsWith('[AUDIO]')">
                    <div class="custom-audio-player">
                      <button class="play-btn" (click)="toggleAudio(msg, audioEl)">
                        <ion-icon [name]="msg.playing ? 'pause' : 'play'"></ion-icon>
                      </button>
                      <div class="waveform" [class.animating]="msg.playing">
                        <div class="bar" *ngFor="let h of getWaveform(msg)" [style.height]="h + '%'"></div>
                      </div>
                      <span class="duration" *ngIf="audioEl.duration && audioEl.duration !== Infinity">{{ formatDuration(audioEl.duration) }}</span>
                    </div>
                    <audio [src]="environment.storageUrl + msg.photo?.image_path" 
                           (ended)="msg.playing = false" 
                           (pause)="msg.playing = false" 
                           (play)="msg.playing = true" 
                           (loadedmetadata)="onAudioLoaded(audioEl)"
                           #audioEl></audio>
                  </div>
                  
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
          </div>
        </div>
          <div class="empty-state" *ngIf="regularMessages.length === 0">
            <ion-icon name="chatbubbles-outline" class="empty-icon"></ion-icon>
            <p>No hay mensajes aún.</p>
            <p>¡Dile algo bonito para empezar!</p>
          </div>
        </div>
      </ion-content>

      <!-- Custom emoji overlay (replaces ion-popover for Capacitor compatibility) -->
      <div class="reactions-overlay" *ngIf="showReactionsMsgId !== null" (click)="closePopover()">
        <div class="reactions-bar" (click)="$event.stopPropagation()">
          <div class="reactions-popover-content" *ngIf="!showCustomEmojiInput">
            <span (click)="addReaction(activeMsg, '❤️')">❤️</span>
            <span (click)="addReaction(activeMsg, '😂')">😂</span>
            <span (click)="addReaction(activeMsg, '🥺')">🥺</span>
            <span (click)="addReaction(activeMsg, '🔥')">🔥</span>
            <span (click)="addReaction(activeMsg, '👍')">👍</span>
            <span class="custom-emoji-btn" (click)="openCustomEmoji()">➕</span>
            <span class="custom-emoji-btn edit-btn" *ngIf="canEditMessage(activeMsg)" (click)="startEditingMessage(activeMsg)"><ion-icon name="pencil"></ion-icon></span>
          </div>
          <div class="reactions-popover-content custom-input-mode" *ngIf="showCustomEmojiInput">
            <input type="text" id="customEmojiInput" placeholder="Añade emoji" (keyup.enter)="addCustomReaction(customEmojiInput.value)" #customEmojiInput class="custom-emoji-field">
            <button class="add-btn" (click)="addCustomReaction(customEmojiInput.value)">OK</button>
          </div>
        </div>
      </div>

      <div class="input-area">
        <div class="reply-preview-container" *ngIf="replyingTo || isEditing">
          <div class="reply-preview">
            <div class="reply-header">
              <div class="reply-title">
                <ion-icon [name]="isEditing ? 'pencil' : 'arrow-undo-outline'"></ion-icon>
                <span *ngIf="replyingTo">Respondiendo a <strong>{{replyingTo.user?.name}}</strong></span>
                <span *ngIf="isEditing">Editando mensaje</span>
              </div>
              <ion-icon name="close" class="close-reply" (click)="cancelReplyOrEdit()"></ion-icon>
            </div>
            <div class="reply-text" *ngIf="replyingTo">{{replyingTo.mensaje && replyingTo.mensaje !== 'null' ? replyingTo.mensaje : '📷 Foto'}}</div>
          </div>
        </div>

        <div class="input-container" *ngIf="!isDoodling">
          <button class="attach-btn" (click)="showAttachMenu = !showAttachMenu" *ngIf="!isRecording"><ion-icon [name]="showAttachMenu ? 'close' : 'add'"></ion-icon></button>

          <div class="attach-menu" *ngIf="showAttachMenu">
            <button class="attach-menu-item" (click)="toggleGifModal(); showAttachMenu = false"><ion-icon name="image"></ion-icon></button>
            <button class="attach-menu-item" (click)="startDoodle(); showAttachMenu = false"><ion-icon name="color-palette"></ion-icon></button>
          </div>

          <div class="recording-bar" *ngIf="isRecording">
            <div class="recording-indicator"><div class="pulse-dot"></div> Grabando... {{recordingTime}}s</div>
            <button class="cancel-record-btn" (click)="cancelAudioRecording()"><ion-icon name="trash-outline"></ion-icon></button>
          </div>
          <input *ngIf="!isRecording"
            type="text" 
            [(ngModel)]="newMessage" 
            placeholder="Dile algo bonito..." 
            (keyup.enter)="sendMessage()" 
            class="premium-input"
            [disabled]="sending"
          />
          <button class="send-btn" 
                  [disabled]="sending" 
                  [class.active]="newMessage.trim() || isRecording"
                  (click)="onSendBtnClick($event)">
            <ion-icon name="paper-plane" *ngIf="!sending && (newMessage.trim() || isRecording)"></ion-icon>
            <ion-icon name="mic" *ngIf="!sending && !newMessage.trim() && !isRecording"></ion-icon>
            <ion-icon name="hourglass-outline" *ngIf="sending"></ion-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- GIF Picker Modal -->
    <div class="gif-modal-overlay" *ngIf="showGifModal" (click)="toggleGifModal()">
      <div class="gif-modal" (click)="$event.stopPropagation()">
        <div class="gif-header">
          <input type="text" placeholder="Buscar GIFs..." [(ngModel)]="giphyQuery" (keyup.enter)="searchGiphy()" class="gif-search" />
          <button class="gif-search-btn" (click)="searchGiphy()"><ion-icon name="search"></ion-icon></button>
        </div>
        <div class="gif-results" *ngIf="giphyResults.length > 0">
          <img *ngFor="let gif of giphyResults" [src]="gif.images.fixed_height_small.url" (click)="sendGif(gif)" loading="lazy" />
        </div>
        <div class="gif-loading" *ngIf="searchingGiphy">Buscando...</div>
      </div>
    </div>

    <!-- Doodle Overlay Canvas -->
    <div class="doodle-overlay" *ngIf="isDoodling">
      <div class="doodle-topbar">
        <div style="flex: 1"></div>
        <div class="doodle-tools">
          <button class="doodle-btn tool" [class.active]="doodleType === 'normal'" (click)="doodleType = 'normal'"><ion-icon name="pencil"></ion-icon></button>
          <button class="doodle-btn tool" [class.active]="doodleType === 'neon'" (click)="doodleType = 'neon'"><ion-icon name="color-wand-outline"></ion-icon></button>
        </div>
      </div>
      
      <div class="doodle-slider-container">
        <input type="range" min="2" max="30" [(ngModel)]="doodleThickness" class="doodle-slider" orient="vertical" />
      </div>

      <div class="doodle-toolbar">
        <div class="doodle-left-actions">
          <button class="doodle-btn cancel" (click)="cancelDoodle()"><ion-icon name="close"></ion-icon></button>
          <button class="doodle-btn undo" (click)="undoDoodle()" [disabled]="strokes.length === 0"><ion-icon name="arrow-undo-outline"></ion-icon></button>
        </div>
        
        <div class="doodle-colors-wrapper">
          <button class="doodle-btn eyedropper" (click)="openColorPicker()">
            <ion-icon name="color-palette"></ion-icon>
          </button>
          <div class="doodle-colors">
            <div class="color-dot" *ngFor="let c of doodleColors" [style.background]="c" [class.active]="currentDoodleColor === c" (click)="currentDoodleColor = c"></div>
          </div>
        </div>

        <button class="doodle-btn send" (click)="sendDoodle()"><ion-icon name="paper-plane"></ion-icon></button>
      </div>
      <canvas #doodleCanvas class="doodle-canvas" (touchstart)="onDoodleStart($event)" (touchmove)="onDoodleMove($event)" (touchend)="onDoodleEnd()"></canvas>
    </div>

    <!-- Custom Color Picker Overlay -->
    <div class="color-picker-overlay" *ngIf="showColorPicker">
      <div class="color-picker-modal">
        <h3>Elige un Color</h3>
        <div class="color-grid">
          <div class="color-swatch" *ngFor="let color of extendedColors" 
               [style.background]="color" 
               [class.selected]="tempColor === color"
               (click)="tempColor = color">
          </div>
        </div>
        <div class="color-preview-row">
          <div class="preview-circle" [style.background]="tempColor"></div>
          <input type="text" class="hex-input" [(ngModel)]="tempColor" />
        </div>
        <div class="color-picker-actions">
          <button class="cp-btn cancel" (click)="showColorPicker = false">Cancelar</button>
          <button class="cp-btn accept" (click)="acceptCustomColor()">Aceptar</button>
        </div>
      </div>
    </div>

    <!-- Custom Color Picker Overlay -->
    <div class="color-picker-overlay" *ngIf="showColorPicker">
      <div class="color-picker-modal">
        <h3>Elige un Color</h3>
        <div class="color-grid">
          <div class="color-swatch" *ngFor="let color of extendedColors" 
               [style.background]="color" 
               [class.selected]="tempColor === color"
               (click)="tempColor = color">
          </div>
        </div>
        <div class="color-preview-row">
          <div class="preview-circle" [style.background]="tempColor"></div>
          <input type="text" class="hex-input" [(ngModel)]="tempColor" />
        </div>
        <div class="color-picker-actions">
          <button class="cp-btn cancel" (click)="showColorPicker = false">Cancelar</button>
          <button class="cp-btn accept" (click)="acceptCustomColor()">Aceptar</button>
        </div>
      </div>
    </div>

    <!-- Graffiti Context Menu Overlay -->
    <div class="graffiti-context-overlay" *ngIf="selectedGraffiti" (click)="closeGraffitiOptions()">
      <!-- Resaltar el graffiti seleccionado -->
      <img [src]="environment.storageUrl + selectedGraffiti.photo?.image_path" 
           class="highlighted-graffiti"
           [style.left.px]="graffitiRect.left"
           [style.top.px]="graffitiRect.top"
           [style.width.px]="graffitiRect.width"
           [style.height.px]="graffitiRect.height"
           [style.position]="'absolute'"
           [style.zIndex]="10001" />

      <!-- El menú contextual estilo Instagram -->
      <div class="insta-context-menu" 
           (click)="$event.stopPropagation()"
           [style.left.px]="menuRect.left"
           [style.top.px]="menuRect.top">
        
        <div class="menu-header">
          <img *ngIf="avatars[selectedGraffiti.user?.name]" [src]="avatars[selectedGraffiti.user?.name]" class="menu-avatar" />
          <div *ngIf="!avatars[selectedGraffiti.user?.name]" class="menu-avatar-fallback">{{ selectedGraffiti.user?.name?.charAt(0) || 'U' }}</div>
          <div class="menu-user-info">
            <span class="menu-username">{{ selectedGraffiti.user?.name || 'Usuario' }}</span>
            <span class="menu-time">{{ formatTime(selectedGraffiti.created_at) }}</span>
          </div>
        </div>

        <div class="menu-action" (click)="confirmDeleteGraffiti(selectedGraffiti); closeGraffitiOptions()">
          <ion-icon name="trash-outline" style="color: #FF4D6D;"></ion-icon>
          <span style="color: #FF4D6D;">Eliminar para ti</span>
        </div>
        <div class="menu-action" (click)="hideGraffiti(selectedGraffiti); closeGraffitiOptions()">
          <ion-icon name="eye-off-outline"></ion-icon>
          <span>Ocultar este</span>
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
    
    .chat-gif { max-width: 200px; border-radius: 12px; margin-bottom: 0; display: block; }
    .gif-reply { padding: 4px; }
    
    .chat-doodle { max-width: 250px; display: block; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.2)); }
    .doodle-reply { padding: 0; background: transparent !important; box-shadow: none !important; border: none !important; margin-bottom: 0; }
    .only-photo .doodle-reply { margin: 0; }

    .custom-audio-player { display: flex; align-items: center; gap: 8px; padding: 6px 12px 6px 6px; border-radius: 30px; width: fit-content; min-width: 220px; }
    .mine .custom-audio-player { background: rgba(255,255,255,0.2); }
    .message-wrapper:not(.mine) .custom-audio-player { background: rgba(0,0,0,0.05); }
    
    .play-btn { background: #FF4D6D; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: transform 0.2s; }
    .play-btn ion-icon { font-size: 1.4rem; color: inherit; }
    .play-btn:active { transform: scale(0.9); }
    .mine .play-btn { background: white; color: #FF4D6D; }
    
    .waveform { display: flex; align-items: center; gap: 2px; flex: 1; height: 30px; justify-content: center; }
    .waveform .bar { width: 3px; background: rgba(0,0,0,0.3); border-radius: 2px; transition: height 0.2s; }
    .mine .waveform .bar { background: rgba(255,255,255,0.8); }
    .waveform.animating .bar { animation: wave 0.4s infinite alternate; }
    @keyframes wave { 0% { transform: scaleY(0.4); } 100% { transform: scaleY(1.4); } }
    
    .duration { font-size: 0.75rem; color: rgba(0,0,0,0.6); font-weight: bold; margin-left: 4px; white-space: nowrap; }
    .mine .duration { color: white; }
    
    audio { display: none; }
    
    .messages-content { flex: 1; --background: transparent; }
    .messages-inner { padding: calc(env(safe-area-inset-top) + 85px) 15px 20px; display: flex; flex-direction: column; background: transparent !important; }
    
    .message-row { position: relative; width: 100%; display: flex; align-items: center; margin-bottom: 12px; }
    .message-content-wrapper { width: 100%; position: relative; z-index: 2; transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
    
    .swipe-icon-left, .swipe-icon-right { position: absolute; top: 50%; transform: translateY(-50%) scale(0); z-index: 1; opacity: 0; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
    .swipe-icon-left { right: 10px; }
    .swipe-icon-right { left: 10px; }
    .reactions-container { position: absolute; bottom: -15px; left: 10px; display: flex; gap: 2px; background: rgba(255,255,255,0.9); padding: 3px 6px; border-radius: 12px; font-size: 0.9rem; box-shadow: 0 2px 5px rgba(0,0,0,0.1); z-index: 10; white-space: nowrap; }
    .message-wrapper.mine .reactions-container { left: auto; right: 10px; }
    .reaction { display: inline-block; animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    
    .empty-state { text-align: center; color: #a08c92; padding: 100px 20px 40px; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .empty-icon { font-size: 4rem; margin-bottom: 15px; color: #ffb3c1; opacity: 0.8; }

    /* Custom Input Mode Styling */
    .custom-input-mode { display: flex; width: 100%; gap: 10px; }
    
    .message-wrapper { display: flex; width: 100%; animation: slideUp 0.3s ease-out forwards; opacity: 0; transform: translateY(10px); gap: 8px; align-items: flex-end; }
    @keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
    .message-wrapper.mine { justify-content: flex-end; }
    .message-wrapper:not(.mine) { justify-content: flex-start; }
    
    .bubble { width: fit-content; max-width: 100%; padding: 8px 12px; border-radius: 12px; font-size: 1rem; line-height: 1.4; position: relative; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
    .transparent-bubble { background: transparent !important; box-shadow: none !important; border: none !important; padding: 0 !important; }
    
    .mine .bubble { background: #FF4D6D; color: white; border-bottom-right-radius: 4px; }
    .message-wrapper:not(.mine) .bubble { background: white; color: #333; border-bottom-left-radius: 4px; border: 1px solid rgba(0,0,0,0.05); }
    
    .sender { font-size: 0.75rem; font-weight: 700; color: #FF4D6D; margin-bottom: 4px; display: block; }
    .text { margin: 0; word-break: break-word; white-space: pre-wrap; }
    .edited-label { font-size: 0.7rem; opacity: 0.7; margin-left: 4px; font-style: italic; }
    
    .attach-btn { background: transparent; border: none; font-size: 1.5rem; color: #a4133c; padding: 5px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; flex-shrink: 0; }
    .attach-btn:active { transform: scale(0.9); }

    .attach-menu { position: absolute; bottom: 65px; left: 10px; background: white; border-radius: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); display: flex; flex-direction: column; padding: 5px; animation: scaleIn 0.2s; z-index: 2000; }
    .attach-menu-item { background: transparent; border: none; font-size: 1.5rem; color: #a4133c; padding: 10px; cursor: pointer; transition: background 0.2s; border-radius: 50%; }
    .attach-menu-item:hover { background: #fff0f3; }
    @keyframes scaleIn { from { transform: scale(0.8) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }

    .recording-bar { display: flex; flex: 1; align-items: center; justify-content: space-between; padding: 0 10px; background: #fff0f3; border-radius: 20px; }
    .recording-indicator { display: flex; align-items: center; gap: 8px; color: #FF4D6D; font-weight: bold; font-size: 0.9rem; }
    .pulse-dot { width: 10px; height: 10px; background: #FF4D6D; border-radius: 50%; animation: pulse 1s infinite; }
    @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }
    .stop-record-btn { background: transparent; border: none; font-size: 1.8rem; color: #FF4D6D; display: flex; align-items: center; }
    .cancel-record-btn { background: transparent; border: none; font-size: 1.5rem; color: #666; display: flex; align-items: center; }

    .doodle-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; display: flex; flex-direction: column; }
    .doodle-topbar { position: absolute; top: env(safe-area-inset-top, 20px); left: 20px; right: 20px; display: flex; justify-content: space-between; align-items: center; z-index: 10001; }
    .doodle-tools { display: flex; gap: 15px; background: rgba(0,0,0,0.5); padding: 8px 15px; border-radius: 30px; backdrop-filter: blur(10px); }
    
    .doodle-slider-container { position: absolute; left: 20px; top: 50%; transform: translateY(-50%); z-index: 10001; height: 200px; display: flex; flex-direction: column; align-items: center; background: rgba(0,0,0,0.5); border-radius: 20px; padding: 15px 0; backdrop-filter: blur(10px); }
    .doodle-slider { -webkit-appearance: slider-vertical; width: 8px; height: 100%; outline: none; }
    
    .doodle-toolbar { position: absolute; bottom: calc(env(safe-area-inset-bottom, 20px) + 70px); left: 10px; right: 10px; display: flex; justify-content: space-between; align-items: center; background: rgba(80, 80, 80, 0.95); backdrop-filter: blur(10px); padding: 8px 12px; border-radius: 40px; box-shadow: 0 5px 20px rgba(0,0,0,0.3); z-index: 10001; gap: 8px; }
    .doodle-left-actions { display: flex; gap: 4px; }
    .doodle-colors-wrapper { display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden; }
    .doodle-colors { display: flex; gap: 8px; overflow-x: auto; padding: 5px 0; scrollbar-width: none; }
    .doodle-colors::-webkit-scrollbar { display: none; }
    .color-dot { width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); transition: transform 0.2s; flex-shrink: 0; }
    .color-dot.active { transform: scale(1.2); }
    .doodle-btn { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: white; border: none; background: transparent; flex-shrink: 0; transition: opacity 0.2s; }
    .doodle-btn.cancel, .doodle-btn.undo { background: rgba(255,255,255,0.1); }
    .doodle-btn.eyedropper { background: white; color: black; }
    .doodle-btn.send { background: #FF1493; font-size: 1.8rem; }
    .doodle-btn.undo[disabled] { opacity: 0.5; }
    .doodle-btn.tool.active { background: #FF4D6D; }
    .doodle-canvas { flex: 1; width: 100%; height: 100%; touch-action: none; position: relative; z-index: 10000; }
    .graffiti-overlay { position: absolute; pointer-events: auto; z-index: 5; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.2)); }

    .gif-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 10000; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; }
    .gif-modal { width: 100%; height: 50vh; background: white; border-radius: 20px 20px 0 0; display: flex; flex-direction: column; padding: 15px; animation: slideUpGif 0.3s ease-out; }
    @keyframes slideUpGif { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .gif-header { display: flex; gap: 10px; margin-bottom: 15px; }
    .gif-search { flex: 1; padding: 10px 15px; border-radius: 20px; border: 1px solid #ddd; background: #f5f5f5; color: #333; outline: none; }
    .gif-search-btn { background: #FF4D6D; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
    .gif-results { display: flex; flex-wrap: wrap; gap: 5px; overflow-y: auto; flex: 1; align-content: flex-start; justify-content: center; }
    .gif-results img { height: 100px; border-radius: 8px; cursor: pointer; object-fit: cover; }
    .gif-loading { text-align: center; color: #666; padding: 20px; }

    .msg-avatar-container { width: 35px; height: 35px; border-radius: 50%; overflow: hidden; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1); background: white; }
    .msg-avatar { width: 100%; height: 100%; object-fit: cover; }
    .msg-avatar-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; font-weight: bold; font-size: 0.8rem; }
    
    
    .photo-reply img { width: 100%; max-width: 200px; border-radius: 12px; margin-bottom: 8px; border: 2px solid rgba(255,255,255,0.2); display: block; overflow: hidden; }
    .only-photo { padding: 4px; background: transparent !important; box-shadow: none !important; border: none !important; }
    .only-photo .photo-reply img { margin-bottom: 0; }
    
    .bubble-wrapper { display: flex; flex-direction: column; max-width: 85%; position: relative; margin-bottom: 14px; transition: all 0.3s; }
    .message-wrapper.mine .bubble-wrapper { align-items: flex-end; }
    .message-wrapper:not(.mine) .bubble-wrapper { align-items: flex-start; }
    
    .highlight-msg .bubble { animation: highlight-pulse 1.5s ease; }
    @keyframes highlight-pulse {
      0% { background-color: rgba(255, 77, 109, 0.4); box-shadow: 0 0 15px rgba(255, 77, 109, 0.4); transform: scale(1.02); }
      100% { background-color: var(--background, white); box-shadow: 0 2px 5px rgba(0,0,0,0.05); transform: scale(1); }
    }
    
    .reply-context { background: rgba(0,0,0,0.05); padding: 8px 12px; border-radius: 12px; font-size: 0.8rem; margin-bottom: 6px; z-index: 0; opacity: 0.95; cursor: pointer; border-left: 4px solid #FF4D6D; }
    .mine .reply-context { background: rgba(255, 77, 109, 0.15); border-left: none; border-right: 4px solid #FF4D6D; color: #333; }
    .reply-context-name { font-weight: bold; color: #FF4D6D; display: block; font-size: 0.75rem; margin-bottom: 2px; }
    .mine .reply-context-name { color: #c9184a; }
    .reply-context-text { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; color: #666; }
    
    .reactions-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; background: rgba(0,0,0,0.3); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; animation: fadeIn 0.15s ease; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .reactions-bar { animation: popIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
    @keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .reactions-popover-content { display: flex; gap: 12px; padding: 12px 16px; font-size: 1.8rem; justify-content: center; align-items: center; border: 1px solid rgba(0,0,0,0.08); border-radius: 24px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
    .reactions-popover-content span { cursor: pointer; transition: transform 0.2s; }
    .reactions-popover-content span:active { transform: scale(1.3); }
    .custom-emoji-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: rgba(0,0,0,0.05); color: #FF4D6D; font-size: 1.2rem !important; }
    .custom-emoji-btn.edit-btn { background: rgba(255, 77, 109, 0.1); }
    
    .custom-input-mode { padding: 12px; gap: 12px; }
    .custom-emoji-field { border: none; background: #f0f0f0; color: #333; padding: 10px 16px; border-radius: 24px; font-size: 1.5rem; width: 140px; outline: none; text-align: center; }
    .custom-emoji-field::placeholder { color: #aaa; font-size: 1rem; }
    .add-btn { background: #FF4D6D; color: white; border: none; padding: 10px 20px; border-radius: 24px; font-weight: bold; cursor: pointer; font-size: 1rem; box-shadow: 0 4px 10px rgba(255,77,109,0.3); }
    
    .reactions-container { position: absolute; bottom: -12px; right: 10px; background: white; padding: 2px 6px; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); display: flex; gap: 2px; border: 1px solid rgba(0,0,0,0.05); z-index: 2; }
    .mine .reactions-container { right: auto; left: 10px; }
    
    .reply-icon-circle { width: 40px; height: 40px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .reply-icon-circle ion-icon { font-size: 1.5rem; color: #FF4D6D; }
    .reaction { font-size: 0.9rem; }
    
    .reply-preview-container { padding: 10px 15px 0; width: 100%; }
    .reply-preview { background: white; border-radius: 12px; padding: 10px 15px; border-left: 4px solid #FF4D6D; box-shadow: 0 2px 10px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 4px; }
    .reply-header { display: flex; justify-content: space-between; align-items: center; }
    .reply-title { display: flex; align-items: center; gap: 6px; color: #FF4D6D; font-size: 0.85rem; }
    .close-reply { color: #999; font-size: 1.2rem; cursor: pointer; }
    .reply-text { font-size: 0.9rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .input-area { background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); padding-bottom: calc(env(safe-area-inset-bottom) + 90px); border-top: 1px solid rgba(0,0,0,0.05); display: flex; flex-direction: column; }
    .input-container { padding: 10px 15px; display: flex; align-items: center; gap: 10px; }
    
    .premium-input { flex: 1; background: #f8f9fa; border: 1px solid rgba(0,0,0,0.05); border-radius: 20px; padding: 12px 20px; font-size: 1rem; color: #333; outline: none; transition: all 0.3s ease; }
    .premium-input:focus { background: white; border-color: #FF4D6D; box-shadow: 0 0 0 3px rgba(255,77,109,0.1); }
    
    .send-btn { width: 44px; height: 44px; border-radius: 50%; border: none; background: #e0d4d7; color: white; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s; }
    .send-btn.active { background: linear-gradient(135deg, #FF4D6D 0%, #c9184a 100%); box-shadow: 0 4px 12px rgba(255, 77, 109, 0.4); transform: rotate(-10deg); }
    .send-btn.active:hover { transform: rotate(0deg) scale(1.1); }

    /* Custom Color Picker */
    .color-picker-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); z-index: 20000; display: flex; align-items: center; justify-content: center; }
    .color-picker-modal { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(16px); border-radius: 24px; padding: 25px; width: 90%; max-width: 350px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.8); }
    .color-picker-modal h3 { margin: 0 0 20px 0; font-size: 1.3rem; font-weight: 800; color: #590D22; text-align: center; }
    .color-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 20px; }
    .color-swatch { aspect-ratio: 1; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border: 2px solid transparent; transition: transform 0.2s; }
    .color-swatch.selected { transform: scale(1.2); border-color: #590D22; }
    .color-preview-row { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; }
    .preview-circle { width: 40px; height: 40px; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.15); border: 2px solid white; }
    .hex-input { flex: 1; padding: 10px 15px; border-radius: 12px; border: 1px solid #ddd; outline: none; font-family: monospace; font-size: 1rem; color: #590D22; background: white; text-transform: uppercase; }
    .color-picker-actions { display: flex; gap: 15px; }
    .cp-btn { flex: 1; padding: 14px; border-radius: 14px; font-weight: bold; font-size: 1rem; border: none; cursor: pointer; transition: transform 0.2s; }
    .cp-btn:active { transform: scale(0.95); }
    .cp-btn.cancel { background: #f0f0f0; color: #666; }
    .cp-btn.accept { background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; box-shadow: 0 4px 15px rgba(255, 77, 109, 0.3); }

    /* Graffiti Context Menu */
    .graffiti-context-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 10000; background: rgba(0,0,0,0.4); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); animation: fadeIn 0.2s ease; }
    .highlighted-graffiti { pointer-events: none; filter: drop-shadow(0 4px 15px rgba(0,0,0,0.5)); transform: scale(1.02); transition: transform 0.2s; }
    
    .insta-context-menu { position: absolute; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); border-radius: 20px; width: 240px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); padding: 5px 0; border: 1px solid rgba(255, 77, 109, 0.1); z-index: 10002; animation: popIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
    .menu-header { display: flex; align-items: center; padding: 12px 15px; border-bottom: 1px solid rgba(0,0,0,0.05); gap: 10px; }
    .menu-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
    .menu-avatar-fallback { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; font-weight: bold; font-size: 0.8rem; }
    .menu-user-info { display: flex; flex-direction: column; }
    .menu-username { color: #590D22; font-weight: 700; font-size: 0.95rem; }
    .menu-time { color: #888; font-size: 0.75rem; font-weight: 500; }
    .menu-action { display: flex; align-items: center; gap: 12px; padding: 14px 15px; color: #590D22; font-weight: 600; font-size: 1rem; cursor: pointer; transition: background 0.2s; }
    .menu-action:active { background: rgba(255, 77, 109, 0.1); }
    .menu-action ion-icon { font-size: 1.4rem; color: #590D22; }

    .restore-graffitis-btn { display: inline-flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.9); border: 1px solid rgba(255,77,109,0.3); color: #FF4D6D; padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; margin-bottom: 8px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: transform 0.2s; }
    .restore-graffitis-btn:active { transform: scale(0.95); }
    .restore-graffitis-btn ion-icon { font-size: 1.1rem; }
    .mine .restore-graffitis-btn { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); color: white; }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ChatWidgetComponent implements OnInit, AfterViewInit {
  @ViewChild(IonContent, { static: false }) private msgContainer!: IonContent;
  private api = inject(LoveApiService);
  private toastController = inject(ToastController);
  private firestore = inject(Firestore);
  private cdr = inject(ChangeDetectorRef);
  private actionSheetCtrl = inject(ActionSheetController);
  private alertCtrl = inject(AlertController);
  public environment = environment;
  
  messages: any[] = [];
  regularMessages: any[] = [];
  graffitisByAnchorId: {[key: number]: any[]} = {};
  newMessage = '';
  sending = false;
  avatars: { [key: string]: string } = {};
  
  replyingTo: any = null;
  showReactionsMsgId: number | null = null;
  currentUser: string = '';
  myUserId: number = 0;
  private timeouts: any[] = [];

  @ViewChild('doodleCanvas', { static: false }) doodleCanvas: any;
  
  constructor() {
    addIcons({ paperPlane, hourglassOutline, close, arrowUndoOutline, trashOutline, pencil, image, search, mic, stopCircle, colorPalette, checkmark, add, play, pause, colorWandOutline, eye, eyeOffOutline });
  }

  private viewInitialized = false;

  async ngOnInit() {
    this.currentUser = localStorage.getItem('love_widget_user') === 'juan' ? 'Juan' : 'Roberta';
    await this.loadAvatars();
    await this.loadMessages();
  }

  ngOnDestroy() {
    this.timeouts.forEach(t => clearTimeout(t));
  }

  safeTimeout(fn: Function, ms: number) {
    const id = setTimeout(fn, ms);
    this.timeouts.push(id);
    return id;
  }

  async loadAvatars() {
    try {
      const info = await this.api.getCoupleInfo();
      if (info) {
        this.myUserId = info.my_id;
        if (info.my_name && info.my_avatar) {
          this.avatars[info.my_name] = info.my_avatar;
        }
        if (info.partner_name && info.partner_avatar) {
          this.avatars[info.partner_name] = info.partner_avatar;
        }
      }
    } catch (e) {
      console.error('Error loading avatars', e);
    }
  }

  ngAfterViewInit() {
    this.viewInitialized = true;
    this.safeTimeout(() => this.scrollToBottom(false), 50);
    this.safeTimeout(() => this.scrollToBottom(false), 300);
    this.safeTimeout(() => this.scrollToBottom(false), 600);
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
        this.processMessages();
        this.safeTimeout(() => this.scrollToBottom(false), 50);
        this.safeTimeout(() => this.scrollToBottom(false), 300);
      }

      // 2. Fetch de la red en segundo plano
      const newMessages = await this.api.getChatMessages();
      
      // 3. Actualizar la vista solo si hay cambios (evita parpadeos)
      if (JSON.stringify(this.messages) !== JSON.stringify(newMessages)) {
        this.messages = newMessages;
        this.processMessages();
        this.safeTimeout(() => this.scrollToBottom(false), 100);
        this.safeTimeout(() => this.scrollToBottom(true), 500);
        await Preferences.set({ key: 'chat_cache', value: JSON.stringify(this.messages) });
      }
    } catch (e) {
      console.error(e);
      this.showError('No pudimos cargar los mensajes. ¿Hay conexión?');
    }
  }

  private processMessages() {
    this.regularMessages = [];
    this.graffitisByAnchorId = {};

    this.messages.forEach(msg => {
      if (msg.mensaje && msg.mensaje.startsWith('[GRAFFITI:')) {
        const parts = msg.mensaje.split(':');
        if (parts.length >= 6) {
          msg.isGraffiti = true;
          msg.anchorMsgId = parseInt(parts[1], 10);
          msg.offsetX = parseInt(parts[2], 10);
          msg.offsetY = parseInt(parts[3], 10);
          msg.width = parseInt(parts[4], 10);
          msg.height = parseInt(parts[5].replace(']', ''), 10);
          
          if (!this.graffitisByAnchorId[msg.anchorMsgId]) {
            this.graffitisByAnchorId[msg.anchorMsgId] = [];
          }
          this.graffitisByAnchorId[msg.anchorMsgId].push(msg);
        }
      } else {
        this.regularMessages.push(msg);
      }
    });
  }

  async sendMessage() {
    if (!this.newMessage.trim() || this.sending) return;
    
    this.sending = true;
    const isReplyingTo = this.replyingTo;
    
    try {
      if (this.isEditing && this.editingMsgId) {
        await this.api.editMessage(this.editingMsgId, this.newMessage);
      } else {
        const replyPayload = isReplyingTo ? {
          id: isReplyingTo.id,
          user: isReplyingTo.user?.name,
          text: isReplyingTo.mensaje || '📷 Foto'
        } : undefined;
        await this.api.sendMessage(this.newMessage, undefined, replyPayload);
      }
      
      this.newMessage = '';
      this.replyingTo = null;
      this.isEditing = false;
      this.editingMsgId = null;
      
      await this.loadMessages();
      
      this.safeTimeout(() => this.scrollToBottom(true), 100);
      // Removed success toast so it doesn't interrupt chat flow
    } catch (e) {
      console.error(e);
      this.showError('Ocurrió un error al enviar tu mensaje. Inténtalo de nuevo.');
    } finally {
      this.sending = false;
    }
  }

  // --- GIF Logic ---
  showGifModal = false;
  giphyQuery = '';
  giphyResults: any[] = [];
  searchingGiphy = false;

  toggleGifModal() {
    this.showGifModal = !this.showGifModal;
    if (this.showGifModal && this.giphyResults.length === 0) {
      this.giphyQuery = 'love';
      this.searchGiphy();
    }
  }

  async searchGiphy() {
    if (!this.giphyQuery.trim()) return;
    this.searchingGiphy = true;
    try {
      const url = `https://api.giphy.com/v1/gifs/search?api_key=${environment.giphyApiKey}&q=${encodeURIComponent(this.giphyQuery)}&limit=24`;
      const res = await fetch(url);
      const data = await res.json();
      this.giphyResults = data.data || [];
    } catch (e) {
      console.error('Error fetching GIFs', e);
      this.showError('Error al buscar GIFs');
    } finally {
      this.searchingGiphy = false;
    }
  }

  async sendGif(gif: any) {
    this.showGifModal = false;
    this.newMessage = `[GIF]${gif.images.fixed_height.url}`;
    await this.sendMessage();
  }

  showAttachMenu = false;

  // --- Doodle Logic ---
  isDoodling = false;
  ctx: CanvasRenderingContext2D | null = null;
  doodleColors = ['#FF4D6D', '#ffffff', '#3a86ff', '#ffbe0b', '#8338ec'];
  showColorPicker = false;
  tempColor = '#FF4D6D';
  extendedColors = [
    '#FF4D6D', '#c9184a', '#a4133c', '#590D22',
    '#ff8fa3', '#ffb3c1', '#ffccd5', '#fff0f3',
    '#ff9f1c', '#ffbf69', '#ffffff', '#000000',
    '#3a86ff', '#4361ee', '#4cc9f0', '#48cae4',
    '#2dc653', '#208b3a', '#1a7431', '#10451d',
    '#7209b7', '#b5179e', '#f72585', '#3f37c9'
  ];
  currentDoodleColor = '#FF4D6D';
  drawing = false;
  
  doodleThickness = 10;
  doodleType = 'neon'; // 'normal' | 'neon'
  strokes: { points: {x: number, y: number}[], color: string, thickness: number, type: string }[] = [];
  currentStrokePoints: {x: number, y: number}[] = [];

  startDoodle() {
    this.isDoodling = true;
    this.strokes = [];
    this.safeTimeout(() => {
      if (this.doodleCanvas && this.doodleCanvas.nativeElement) {
        const canvas = this.doodleCanvas.nativeElement;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.ctx = canvas.getContext('2d');
      }
    }, 100);
  }

  cancelDoodle() {
    this.isDoodling = false;
    this.strokes = [];
  }

  openColorPicker() {
    this.tempColor = this.currentDoodleColor;
    this.showColorPicker = true;
  }

  acceptCustomColor() {
    this.currentDoodleColor = this.tempColor;
    if (!this.doodleColors.includes(this.currentDoodleColor)) {
      this.doodleColors.unshift(this.currentDoodleColor);
    }
    this.showColorPicker = false;
  }

  undoDoodle() {
    if (this.strokes.length > 0) {
      this.strokes.pop();
      this.redrawDoodle();
    }
  }

  onDoodleStart(e: any) {
    if (!this.ctx) return;
    this.drawing = true;
    const touch = e.touches[0];
    const rect = e.target.getBoundingClientRect();
    this.currentStrokePoints = [{ x: touch.clientX - rect.left, y: touch.clientY - rect.top }];
  }

  onDoodleMove(e: any) {
    if (!this.drawing || !this.ctx) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = e.target.getBoundingClientRect();
    
    this.currentStrokePoints.push({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
    this.redrawDoodle();
  }

  onDoodleEnd() {
    if (this.drawing && this.currentStrokePoints.length > 0) {
      this.strokes.push({ 
        points: [...this.currentStrokePoints], 
        color: this.currentDoodleColor, 
        thickness: this.doodleThickness, 
        type: this.doodleType 
      });
    }
    this.currentStrokePoints = [];
    this.drawing = false;
  }

  redrawDoodle() {
    if (!this.ctx || !this.doodleCanvas) return;
    const canvas = this.doodleCanvas.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    const allStrokes = [...this.strokes];
    if (this.currentStrokePoints.length > 0) {
       allStrokes.push({ 
         points: this.currentStrokePoints, 
         color: this.currentDoodleColor,
         thickness: this.doodleThickness,
         type: this.doodleType
       });
    }

    for (const stroke of allStrokes) {
      if (stroke.points.length === 0) continue;
      this.ctx.lineWidth = stroke.thickness;
      
      this.ctx.beginPath();
      this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      
      if (stroke.type === 'neon') {
        this.ctx.shadowBlur = stroke.thickness * 2;
        this.ctx.shadowColor = stroke.color;
        this.ctx.strokeStyle = '#ffffff';
      } else {
        this.ctx.shadowBlur = 0;
        this.ctx.strokeStyle = stroke.color;
      }
      
      this.ctx.stroke();
    }
  }
  
  private cropCanvas(originalCanvas: HTMLCanvasElement): Promise<{blob: Blob, x: number, y: number, w: number, h: number} | null> {
    return new Promise((resolve) => {
      const ctx = originalCanvas.getContext('2d');
      if (!ctx) return resolve(null);
      const w = originalCanvas.width;
      const h = originalCanvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      let minX = w, minY = h, maxX = 0, maxY = 0;
      
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const alpha = data[(y * w + x) * 4 + 3];
          if (alpha > 0) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      
      if (minX > maxX) return resolve(null);
      
      minX = Math.max(0, minX - 20);
      minY = Math.max(0, minY - 20);
      maxX = Math.min(w, maxX + 20);
      maxY = Math.min(h, maxY + 20);
      
      const cw = maxX - minX;
      const ch = maxY - minY;
      
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cw;
      cropCanvas.height = ch;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) return resolve(null);
      
      cropCtx.drawImage(originalCanvas, minX, minY, cw, ch, 0, 0, cw, ch);
      cropCanvas.toBlob(blob => {
        if (blob) resolve({ blob, x: minX, y: minY, w: cw, h: ch });
        else resolve(null);
      }, 'image/png');
    });
  }

  async sendDoodle() {
    if (!this.doodleCanvas || !this.doodleCanvas.nativeElement) return;
    const canvas = this.doodleCanvas.nativeElement;
    
    const cropResult = await this.cropCanvas(canvas);
    if (!cropResult || !cropResult.blob) {
        this.isDoodling = false;
        return;
    }
    
    // Find closest message to the doodle's top (cropResult.y)
    let anchorMsgId = this.messages.length > 0 ? this.messages[this.messages.length - 1].id : 0;
    let offsetY = cropResult.y;
    let offsetX = cropResult.x;

    const messageElements = document.querySelectorAll('.message-row');
    let closestDist = Infinity;
    let closestEl: HTMLElement | null = null;

    for (let i = 0; i < messageElements.length; i++) {
      const htmlEl = messageElements[i] as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      const dist = Math.abs(rect.top - cropResult.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestEl = htmlEl;
      }
    }

    if (closestEl) {
      const idMatch = closestEl.id.replace('msg-', '');
      anchorMsgId = parseInt(idMatch, 10);
      const rect = closestEl.getBoundingClientRect();
      offsetY = cropResult.y - rect.top;
      offsetX = cropResult.x - rect.left;
    }
    
    this.isDoodling = false;
    this.sending = true;
    try {
      const file = new File([cropResult.blob], 'doodle.png', { type: 'image/png' });
      // Upload with graffiti tag
      const description = `[GRAFFITI:${anchorMsgId}:${Math.round(offsetX)}:${Math.round(offsetY)}:${cropResult.w}:${cropResult.h}]`;
      const res = await this.api.uploadPhoto(file, description);
      if (res && res.photo && res.photo.id) {
        const replyPayload = this.replyingTo ? { id: this.replyingTo.id, user: this.replyingTo.user?.name, text: '🎨 Graffiti' } : undefined;
        await this.api.sendMessage(description, res.photo.id, replyPayload);
        this.replyingTo = null;
        await this.loadMessages();
        this.safeTimeout(() => this.scrollToBottom(), 100);
      }
    } catch (e) {
      console.error('Error sending doodle', e);
      this.showError('Error al enviar garabato');
    } finally {
    this.sending = false;
  }
}

// --- Graffiti Long Press Menu ---
  selectedGraffiti: any = null;
  graffitiPressTimer: any;
  graffitiRect = { left: 0, top: 0, width: 0, height: 0 };
  menuRect = { left: 0, top: 0 };
  hiddenGraffitis: { [grafId: number]: boolean } = {};

  formatTime(dateString: string) {
    if (!dateString) return '';
    const d = new Date(dateString);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear().toString().slice(-2);
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${day}/${month}/${year} ${time}`;
  }

  startGraffitiPress(graf: any, event: any) {
    this.graffitiPressTimer = setTimeout(async () => {
      try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch (e) {}
      
      this.selectedGraffiti = graf;
      const target = event.target as HTMLElement;
      const rect = target.getBoundingClientRect();
      
      this.graffitiRect = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      };

      // Posicionamiento inteligente asegurando márgenes
      let menuTop = rect.bottom + 10;
      let menuLeft = rect.left + (rect.width / 2) - 120; // 120 is half of 240px width
      
      const margin = 20;
      const menuWidth = 240;
      const menuHeight = 180; // approximate height

      // Clamp X
      if (menuLeft < margin) {
        menuLeft = margin;
      } else if (menuLeft + menuWidth > window.innerWidth - margin) {
        menuLeft = window.innerWidth - menuWidth - margin;
      }
      
      // Clamp Y
      if (menuTop + menuHeight > window.innerHeight - margin) {
        // Not enough space below, place it above
        menuTop = rect.top - menuHeight - 10;
        // If it still goes off screen above, clamp to margin
        if (menuTop < margin) menuTop = margin;
      }
      
      this.menuRect = { left: menuLeft, top: menuTop };
      this.cdr.detectChanges();
    }, 400);
  }

  endGraffitiPress() {
    clearTimeout(this.graffitiPressTimer);
  }

  closeGraffitiOptions() {
    this.selectedGraffiti = null;
  }

  hideGraffiti(graf: any) {
    if (graf && graf.id) {
      this.hiddenGraffitis[graf.id] = true;
    }
  }

  hasHiddenGraffitis(msgId: number): boolean {
    if (!this.graffitisByAnchorId[msgId]) return false;
    return this.graffitisByAnchorId[msgId].some((g: any) => this.hiddenGraffitis[g.id]);
  }

  showGraffitis(msgId: number) {
    if (this.graffitisByAnchorId[msgId]) {
      this.graffitisByAnchorId[msgId].forEach((g: any) => {
        this.hiddenGraffitis[g.id] = false;
      });
    }
  }

  async confirmDeleteGraffiti(graf: any) {
    const alert = await this.alertCtrl.create({
      header: '¿Seguro?',
      message: '¿Estás seguro de que deseas eliminar este garabato de forma permanente?',
      cssClass: 'custom-love-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Borrar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.api.deleteMessage(graf.id);
              if (graf.photo?.id) {
                await this.api.deletePhoto(graf.photo.id);
              }
              this.loadMessages();
            } catch (e) {
              this.showError('Error al borrar garabato');
            }
          }
        }
      ]
    });
    await alert.present();
  }

// --- Audio Recording Logic ---
  isRecording = false;
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: any[] = [];
  recordingTime = 0;
  recordingInterval: any;
  
  onSendBtnClick(e: any) {
    if (this.isRecording) {
      this.stopAudioRecording();
    } else if (this.newMessage.trim()) {
      this.sendMessage();
    } else {
      this.startAudioRecording();
    }
  }

  async startAudioRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };
      
      this.mediaRecorder.onstop = () => this.processAudio();
      
      this.mediaRecorder.start();
      this.isRecording = true;
      this.recordingTime = 0;
      this.recordingInterval = setInterval(() => this.recordingTime++, 1000);
    } catch (e) {
      console.error('Error starting audio recording:', e);
      this.showError('No se pudo acceder al micrófono');
    }
  }

  stopAudioRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  cancelAudioRecording() {
    this.isRecording = false;
    clearInterval(this.recordingInterval);
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.onstop = null; // Prevent processing
      this.mediaRecorder.stop();
    }
  }

  async processAudio() {
    this.isRecording = false;
    clearInterval(this.recordingInterval);
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' }); // Default for MediaRecorder in most browsers
    if (audioBlob.size === 0) return;
    
    this.sending = true;
    try {
      const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
      // We reuse uploadPhoto endpoint which just expects a file. 
      // The backend saves the file and returns a photo object.
      const res = await this.api.uploadPhoto(file, '[AUDIO]');
      if (res && res.photo && res.photo.id) {
        const replyPayload = this.replyingTo ? { id: this.replyingTo.id, user: this.replyingTo.user?.name, text: '🎤 Audio' } : undefined;
        await this.api.sendMessage('[AUDIO]', res.photo.id, replyPayload);
        this.replyingTo = null;
        await this.loadMessages();
        this.safeTimeout(() => this.scrollToBottom(), 100);
      }
    } catch (e) {
      console.error('Error sending audio', e);
      this.showError('Error al enviar audio');
    } finally {
      this.sending = false;
    }
  }

  // --- Audio Player Logic ---
  Infinity = Infinity;

  getWaveform(msg: any): number[] {
    if (msg._waveform) return msg._waveform;
    const length = 30;
    // Generate deterministic beautiful waveform based on message id
    let seed = msg.id || Math.random() * 1000;
    msg._waveform = Array.from({length}, (_, i) => {
      // Bell curve shape
      const normalized = i / (length - 1);
      const bell = Math.sin(normalized * Math.PI);
      
      // Pseudo-random noise
      seed = (seed * 9301 + 49297) % 233280;
      const rnd = seed / 233280;
      
      const noise = rnd * 0.5 + 0.5; // 0.5 to 1.0
      return Math.floor(bell * noise * 80) + 20; // 20 to 100%
    });
    return msg._waveform;
  }

  toggleAudio(msg: any, audioEl: HTMLAudioElement) {
    if (msg.playing) {
      audioEl.pause();
    } else {
      audioEl.play().catch(e => console.error("Play failed", e));
    }
  }

  formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds) || seconds === Infinity) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  onAudioLoaded(audioEl: HTMLAudioElement) {
    // Hack to fetch duration for WebM blobs if it's Infinity
    if (audioEl.duration === Infinity) {
      audioEl.currentTime = 1e101;
      audioEl.ontimeupdate = () => {
        audioEl.ontimeupdate = null;
        audioEl.currentTime = 0;
      };
    }
  }

  // --- Swipes y Reacciones ---

  activeMsg: any = null;
  showCustomEmojiInput = false;

  pressTimer: any;

  startPress(event: any, msg: any) {
    this.pressTimer = setTimeout(async () => {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (e) {}
      
      this.activeMsg = msg;
      this.showReactionsMsgId = msg.id;
      this.showCustomEmojiInput = false;
      this.cdr.detectChanges();
    }, 400);
  }

  endPress() {
    clearTimeout(this.pressTimer);
  }

  onContextMenu(event: any, msg: any) {
    if (event && event.preventDefault) event.preventDefault();
    this.activeMsg = msg;
    this.showReactionsMsgId = msg.id;
    this.showCustomEmojiInput = false;
    this.cdr.detectChanges();
  }

  closePopover() {
    this.showReactionsMsgId = null;
    this.showCustomEmojiInput = false;
  }

  openCustomEmoji() {
    this.showCustomEmojiInput = true;
    this.safeTimeout(() => {
      const input = document.getElementById('customEmojiInput');
      if (input) input.focus();
    }, 100);
  }

  addCustomReaction(emoji: string) {
    if (!emoji || !emoji.trim()) return;
    this.addReaction(this.activeMsg, emoji.trim());
    this.closePopover();
  }

  isEditing = false;
  editingMsgId: number | null = null;

  canEditMessage(msg: any): boolean {
    if (!msg || !msg.created_at) return false;
    if (msg.user?.name !== this.currentUser) return false;
    
    // Check if within 2 minutes
    const msgDate = new Date(msg.created_at);
    const now = new Date();
    const diffMs = now.getTime() - msgDate.getTime();
    return diffMs <= 120000; // 120000 ms = 2 minutes
  }

  startEditingMessage(msg: any) {
    this.closePopover();
    this.isEditing = true;
    this.editingMsgId = msg.id;
    this.newMessage = msg.mensaje;
    this.replyingTo = null;
    this.safeTimeout(() => {
      const input = document.querySelector('.premium-input') as HTMLInputElement;
      if (input) input.focus();
    }, 150);
  }

  cancelReplyOrEdit() {
    this.replyingTo = null;
    this.isEditing = false;
    this.editingMsgId = null;
    this.newMessage = '';
  }

  // --- Custom Swipe Logic ---
  swipeStartX = 0;
  swipeStartY = 0;
  swipingMsgId: number | null = null;

  ts(event: any, msg: any) {
    if (event.touches && event.touches.length > 0) {
      this.swipeStartX = event.touches[0].clientX;
      this.swipeStartY = event.touches[0].clientY;
      this.swipingMsgId = msg.id;
    }
    this.startPress(event, msg);
  }

  tm(event: any, msg: any) {
    if (this.swipingMsgId !== msg.id || !event.touches) return;
    
    const x = event.touches[0].clientX;
    const y = event.touches[0].clientY;
    const deltaX = x - this.swipeStartX;
    const deltaY = y - this.swipeStartY;
    
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      this.endPress();
    }

    const isMine = this.isMine(msg);
    if (isMine && deltaX > 0) return;
    if (!isMine && deltaX < 0) return;

    let move = deltaX;
    if (move > 60) move = 60 + (move - 60) * 0.2;
    if (move < -60) move = -60 + (move + 60) * 0.2;

    const el = document.getElementById('slide-el-' + msg.id);
    const iconEl = document.getElementById('swipe-icon-' + msg.id);

    if (el) {
      el.style.transform = `translateX(${move}px)`;
      el.style.transition = 'none';
    }

    if (iconEl) {
      const progress = Math.min(Math.abs(move) / 60, 1);
      iconEl.style.opacity = progress.toString();
      iconEl.style.transform = `translateY(-50%) scale(${progress})`;
      iconEl.style.transition = 'none';
      if (progress >= 1) {
        iconEl.style.transform = `translateY(-50%) scale(1.1)`;
      }
    }
  }

  te(event: any, msg: any) {
    this.endPress();
    if (this.swipingMsgId !== msg.id) return;
    this.swipingMsgId = null;

    const el = document.getElementById('slide-el-' + msg.id);
    const iconEl = document.getElementById('swipe-icon-' + msg.id);

    let move = 0;
    if (el && el.style.transform.includes('translateX')) {
      const match = el.style.transform.match(/translateX\(([-\d\.]+)px\)/);
      if (match) move = parseFloat(match[1]);
    }

    if (el) {
      el.style.transform = 'translateX(0)';
      el.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
    }

    if (iconEl) {
      iconEl.style.opacity = '0';
      iconEl.style.transform = 'translateY(-50%) scale(0)';
      iconEl.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
    }

    const isMine = this.isMine(msg);
    if (isMine && move <= -50) {
      this.replyToMessage(msg);
      Haptics.impact({ style: ImpactStyle.Light }).catch(()=>{});
    } else if (!isMine && move >= 50) {
      this.replyToMessage(msg);
      Haptics.impact({ style: ImpactStyle.Light }).catch(()=>{});
    }
  }

  replyToMessage(msg: any) {
    this.replyingTo = msg;
    this.safeTimeout(() => {
      const input = document.querySelector('.premium-input') as HTMLInputElement;
      if (input) input.focus();
    }, 150);
  }

  scrollToMessage(id: number) {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Use IntersectionObserver to wait until the message is visible before animating
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          el.classList.add('highlight-msg');
          this.safeTimeout(() => el.classList.remove('highlight-msg'), 1500);
          observer.disconnect();
        }
      }, { threshold: 0.5 });
      
      observer.observe(el);
      
      // Fallback just in case the observer fails to trigger (e.g. if it's a very tall message)
      this.safeTimeout(() => observer.disconnect(), 2000);
    } else {
      console.log('Message not found on current page:', id);
    }
  }

  hasReactions(msg: any): boolean {
    return msg.reactions && msg.reactions.length > 0;
  }

  getReactions(msg: any): string[] {
    if (!this.hasReactions(msg)) return [];
    return msg.reactions.map((r: any) => r.reaction);
  }

  async addReaction(msg: any, emoji: string) {
    this.showReactionsMsgId = null;
    try {
      await this.api.reactToChatMessage(msg.id, emoji);
      await this.loadMessages();
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  }

  isMine(msg: any): boolean {
    if (!msg || !msg.user_id) return false;
    return Number(msg.user_id) === Number(this.myUserId);
  }

  trackByMsgId(index: number, msg: any) {
    return msg.id;
  }
  
  private async showError(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
  }
}
