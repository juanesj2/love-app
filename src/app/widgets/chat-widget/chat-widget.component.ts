import { Component, inject, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, ActionSheetController, AlertController, IonContent, ModalController } from '@ionic/angular';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { LoveApiService } from '../../services/love-api.service';
import { TutorialService } from '../../services/tutorial.service';
import { PremiumService } from '../../services/premium.service';
import { PaywallComponent } from '../../components/paywall/paywall.component';
import { environment } from '../../../environments/environment';
import confetti from 'canvas-confetti';
import { FingerprintGameModalComponent } from '../fingerprint-game-modal/fingerprint-game-modal.component';
import { addIcons } from 'ionicons';
import { paperPlane, hourglassOutline, close, arrowUndoOutline, trashOutline, pencil, image, search, mic, stopCircle, colorPalette, checkmark, add, play, pause, colorWandOutline, eye, eyeOffOutline, banOutline, lockClosed, settingsOutline, imageOutline, partlySunnyOutline, waterOutline, moonOutline, planetOutline, heartOutline, colorPaletteOutline, chatbubbleEllipsesOutline, textOutline, musicalNotesOutline, personCircleOutline, timeOutline, checkmarkOutline, checkmarkDoneOutline } from 'ionicons/icons';
import { DotLottie } from '@lottiefiles/dotlottie-web';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Keyboard } from '@capacitor/keyboard';
@Component({
  selector: 'app-chat-widget',
  template: `
    <div class="chat-wrapper" [style.background]="chatBackground || null" [ngClass]="'font-' + chatFont">
      <button class="chat-bg-settings-btn" (click)="openChatSettings()" *ngIf="regularMessages.length > 0">
        <ion-icon name="color-palette"></ion-icon>
      </button>
      <ion-content class="messages-content" [style.--background]="chatBackground ? 'transparent' : null" #msgContainer>
        <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)" [disabled]="isDoodling">
          <ion-refresher-content></ion-refresher-content>
        </ion-refresher>
        
        <div class="messages-inner">
        <div class="message-row" *ngFor="let msg of regularMessages; trackBy: trackByMsgId" [id]="'msg-' + msg.id">
          <!-- Graffitis anclados a este mensaje -->
          <ng-container *ngIf="graffitisByAnchorId[msg.id]">
            <ng-container *ngFor="let graf of graffitisByAnchorId[msg.id]">
              <img *ngIf="!hiddenGraffitis[graf.id]"
                   [src]="environment.storageUrl + (graf.custom_image_path || graf.photo?.image_path)" 
                   class="graffiti-overlay" 
                   (touchstart)="startGraffitiPress(graf, $event)"
                   (touchmove)="moveGraffitiPress($event)"
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
            (contextmenu)="msg.isDeletedLocally || msg.mensaje === '[DELETED]' ? null : onContextMenu($event, msg)"
            (touchstart)="msg.isDeletedLocally || msg.mensaje === '[DELETED]' ? null : ts($event, msg)"
            (touchmove)="msg.isDeletedLocally || msg.mensaje === '[DELETED]' ? null : tm($event, msg)"
            (touchend)="msg.isDeletedLocally || msg.mensaje === '[DELETED]' ? null : te($event, msg)"
            (mousedown)="msg.isDeletedLocally || msg.mensaje === '[DELETED]' ? null : startPress($event, msg)"
            (mouseup)="msg.isDeletedLocally || msg.mensaje === '[DELETED]' ? null : endPress()"
            (mouseleave)="msg.isDeletedLocally || msg.mensaje === '[DELETED]' ? null : endPress()">
            <div class="message-wrapper" [class.mine]="isMine(msg)">
              <div class="msg-avatar-container" *ngIf="!isMine(msg)">
                <img *ngIf="avatars[msg.user?.name]" [src]="avatars[msg.user.name]" class="msg-avatar" [ngClass]="'frame-' + partnerAvatarFrame" />
                <div class="msg-avatar-mood" *ngIf="partnerAvatarMood">{{ partnerAvatarMood }}</div>
                <div *ngIf="!avatars[msg.user?.name]" class="msg-avatar-fallback">{{ msg.user?.name?.charAt(0) || 'U' }}</div>
              </div>
              
              <div class="bubble-wrapper">
                <div class="reply-context" *ngIf="msg.reply_to" (click)="scrollToMessage(msg.reply_to.id)">
                  <span class="reply-context-name">{{msg.reply_to.user}}</span>
                  <span class="reply-context-text">{{msg.reply_to.text}}</span>
                </div>

                <div class="bubble" [ngClass]="isMine(msg) ? 'bubble-' + myBubbleStyle : 'bubble-' + partnerBubbleStyle" [class.only-photo]="msg.photo && (!msg.mensaje || msg.mensaje === 'null')"
                                    [class.transparent-bubble]="msg.mensaje && msg.mensaje.startsWith('[DOODLE]')">
                  
                  <div class="deleted-tombstone" *ngIf="msg.isDeletedLocally || msg.mensaje === '[DELETED]'">
                    <ion-icon name="ban-outline"></ion-icon> Se eliminó este mensaje
                  </div>

                  <ng-container *ngIf="!msg.isDeletedLocally && msg.mensaje !== '[DELETED]'">
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
                      <audio [src]="getAudioSrc(msg)" 
                             (ended)="msg.playing = false" 
                             (pause)="msg.playing = false" 
                             (play)="msg.playing = true" 
                             (loadedmetadata)="onAudioLoaded(audioEl)"
                             #audioEl></audio>
                    </div>
                  </ng-container>
                  
                  <div class="reactions-container" *ngIf="hasReactions(msg) && !msg.isDeletedLocally && msg.mensaje !== '[DELETED]'">
                    <span class="reaction" *ngFor="let r of getReactions(msg)">{{r}}</span>
                  </div>
                  
                  <div class="msg-status" *ngIf="isMine(msg) && !msg.isDeletedLocally && msg.mensaje !== '[DELETED]'">
                    <ion-icon name="time-outline" *ngIf="msg.status === 'pending'"></ion-icon>
                    <ion-icon name="checkmark-outline" *ngIf="msg.status === 'sent' || !msg.status"></ion-icon>
                    <ion-icon name="checkmark-done-outline" *ngIf="msg.status === 'delivered'"></ion-icon>
                    <ion-icon name="checkmark-done-outline" class="read-check" *ngIf="msg.status === 'read'"></ion-icon>
                  </div>
                </div>
              </div>

              <div class="msg-avatar-container" *ngIf="isMine(msg)">
                <img *ngIf="avatars[msg.user?.name]" [src]="avatars[msg.user.name]" class="msg-avatar" [ngClass]="'frame-' + myAvatarFrame" />
                <div class="msg-avatar-mood" *ngIf="myAvatarMood">{{ myAvatarMood }}</div>
                <div *ngIf="!avatars[msg.user?.name]" class="msg-avatar-fallback">{{ msg.user?.name?.charAt(0) || 'U' }}</div>
              </div>
            </div>
          </div>
        </div>
          <div class="empty-state" *ngIf="regularMessages.length === 0">
            <canvas #sadLottie width="200" height="200" style="margin: 0 auto 15px auto;"></canvas>
            <p>No hay mensajes aún.</p>
            <p>¡Dile algo bonito para empezar!</p>
          </div>
        </div>
      </ion-content>

      <!-- Emoji Overlay para animaciones a pantalla completa -->
      <div class="floating-emoji-container" *ngIf="floatingEmojis.length > 0">
        <div *ngFor="let fe of floatingEmojis" class="floating-emoji" 
             [style.left.%]="fe.left" 
             [style.animation-duration.s]="fe.duration"
             [style.font-size.rem]="fe.size"
             [style.animation-delay.s]="fe.delay">
          {{ fe.emoji }}
        </div>
      </div>

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
            <span class="custom-emoji-btn delete-btn" (click)="confirmDeleteMessage(activeMsg)"><ion-icon name="trash-outline" style="color: #FF4D6D;"></ion-icon></span>
          </div>
          <div class="reactions-popover-content custom-input-mode" *ngIf="showCustomEmojiInput">
            <input type="text" id="customEmojiInput" placeholder="Añade emoji" (keyup.enter)="addCustomReaction(customEmojiInput.value)" #customEmojiInput class="custom-emoji-field">
            <button class="add-btn" (click)="addCustomReaction(customEmojiInput.value)">OK</button>
          </div>
        </div>
      </div>

      <div class="input-area">
        <!-- Sending Graffiti Indicator -->
        <div class="sending-graffiti-badge" *ngIf="sendingGraffiti">
          <ion-spinner name="crescent"></ion-spinner> <span>Enviando garabato...</span>
        </div>

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
            <button class="attach-menu-item" (click)="startDoodle(); showAttachMenu = false">
              <ion-icon name="color-palette"></ion-icon>
              <ion-icon name="lock-closed" class="premium-lock" *ngIf="premiumService.isFree$ | async"></ion-icon>
            </button>
          </div>

          <div class="recording-bar" *ngIf="isRecording">
            <div class="recording-indicator"><div class="pulse-dot"></div> Grabando... {{recordingTime}}s</div>
            <button class="cancel-record-btn" (click)="cancelAudioRecording()"><ion-icon name="trash-outline"></ion-icon></button>
          </div>
          <textarea *ngIf="!isRecording"
            [(ngModel)]="newMessage" 
            placeholder="Dile algo bonito..." 
            (focus)="onInputFocus()"
            (blur)="onInputBlur()"
            (input)="autoResize()"
            class="premium-input textarea-input"
            rows="1"
            #chatInput
          ></textarea>
          <button class="send-btn" 
                  [disabled]="sending" 
                  [class.active]="newMessage.trim() || isRecording"
                  (pointerdown)="onSendBtnClick($event)">
            <ion-icon name="paper-plane" *ngIf="!sending && (newMessage.trim() || isRecording)"></ion-icon>
            <div class="mic-container" *ngIf="!sending && !newMessage.trim() && !isRecording">
              <ion-icon name="mic"></ion-icon>
              <ion-icon name="lock-closed" class="premium-lock mic-lock" *ngIf="premiumService.isFree$ | async"></ion-icon>
            </div>
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
      <img [src]="environment.storageUrl + (selectedGraffiti.custom_image_path || selectedGraffiti.photo?.image_path)" 
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
    .chat-wrapper { display: flex; flex-direction: column; height: 100%; background: #fdf5f7; font-family: 'Inter', sans-serif; position: relative; background-size: cover !important; background-position: center !important; }

    /* --- TYPOGRAPHY SETTINGS --- */
    

    .font-typewriter, .font-typewriter .text, .font-typewriter .timestamp, .font-typewriter .chat-date-header, .font-typewriter .deleted-text { font-family: 'Special Elite', 'Courier New', Courier, monospace !important; }
    .font-handwriting, .font-handwriting .text, .font-handwriting .timestamp, .font-handwriting .chat-date-header, .font-handwriting .deleted-text { font-family: 'Caveat', cursive !important; }
    .font-handwriting .text { font-size: 1.2em; }
    .font-kawaii, .font-kawaii .text, .font-kawaii .timestamp, .font-kawaii .chat-date-header, .font-kawaii .deleted-text { font-family: 'Nunito', sans-serif !important; font-weight: 700; }

    .chat-bg-settings-btn { position: absolute; top: 100px; right: 16px; z-index: 100; background: rgba(255, 255, 255, 0.95); border: 1px solid rgba(0,0,0,0.05); border-radius: 50%; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: transform 0.2s ease; }
    .chat-bg-settings-btn:active { transform: scale(0.95); }
    .chat-bg-settings-btn ion-icon { font-size: 24px; color: #FF4D6D; }
    
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
    .messages-inner { padding: calc(var(--safe-top) + 85px) 15px 20px; display: flex; flex-direction: column; min-height: 100%; background: transparent !important; }
    
    .message-row { position: relative; width: 100%; display: flex; align-items: center; margin-bottom: 12px; }
    .message-content-wrapper { width: 100%; position: relative; z-index: 2; transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
    
    .swipe-icon-left, .swipe-icon-right { position: absolute; top: 50%; transform: translateY(-50%) scale(0); z-index: 1; opacity: 0; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
    .swipe-icon-left { right: 10px; }
    .swipe-icon-right { left: 10px; }
    .reactions-container { position: absolute; bottom: -15px; left: 10px; display: flex; gap: 2px; background: rgba(255,255,255,0.9); padding: 3px 6px; border-radius: 12px; font-size: 0.9rem; box-shadow: 0 2px 5px rgba(0,0,0,0.1); z-index: 10; white-space: nowrap; }
    .message-wrapper.mine .reactions-container { left: auto; right: 10px; }
    .reaction { display: inline-block; animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    
    .empty-state { text-align: center; color: #a08c92; padding: 20px; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .empty-state canvas { width: 160px !important; height: 160px !important; margin: 0 auto 15px auto; display: block; flex-shrink: 0; }
    .empty-icon { font-size: 4rem; margin-bottom: 15px; color: #ffb3c1; opacity: 0.8; }
    
    .floating-emoji-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999; overflow: hidden; }
    .floating-emoji { position: absolute; bottom: -10%; animation-name: floatUp; animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94); animation-fill-mode: forwards; will-change: transform, opacity; opacity: 0; text-shadow: 0 5px 15px rgba(0,0,0,0.2); }
    @keyframes floatUp {
      0% { transform: translateY(0) scale(1) rotate(-10deg); opacity: 0; }
      10% { opacity: 1; }
      80% { opacity: 1; }
      100% { transform: translateY(-110vh) scale(1.5) rotate(20deg); opacity: 0; }
    }

    /* Custom Input Mode Styling */
    .custom-input-mode { display: flex; width: 100%; gap: 10px; }
    
    .message-wrapper { display: flex; width: 100%; animation: slideUp 0.3s ease-out forwards; opacity: 0; transform: translateY(10px); gap: 8px; align-items: flex-end; }
    @keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
    .message-wrapper.mine { justify-content: flex-end; }
    .message-wrapper:not(.mine) { justify-content: flex-start; }
    
    .bubble { padding: 10px 16px; border-radius: 18px; max-width: 100%; word-break: break-word; font-size: 0.95rem; line-height: 1.4; position: relative; border-bottom-left-radius: 6px; box-shadow: 0 4px 15px rgba(0,0,0,0.04), inset 0 2px 0 rgba(255,255,255,0.5); transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); color: #2c3e50; border: 1px solid rgba(255,255,255,0.4); }
    .transparent-bubble { background: transparent !important; box-shadow: none !important; border: none !important; padding: 0 !important; }
    
    .mine .bubble { background: linear-gradient(135deg, #FF758C 0%, #FF7EB3 100%); color: white; border-bottom-right-radius: 6px; border-bottom-left-radius: 18px; box-shadow: 0 4px 15px rgba(255, 117, 140, 0.35), inset 0 2px 0 rgba(255,255,255,0.25); border: none; }
    .message-wrapper:not(.mine) .bubble { background: white; color: #333; border-bottom-left-radius: 4px; border: 1px solid rgba(0,0,0,0.05); }
    
    .msg-status { display: flex; align-items: center; justify-content: flex-end; gap: 2px; margin-top: 4px; opacity: 0.9; height: 16px; margin-right: -4px; margin-bottom: -4px; }
    .msg-status ion-icon { font-size: 1.15rem; }
    .msg-status .read-check { color: #4db8ff; opacity: 1; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2)); }
    .transparent-bubble .msg-status { position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.5); padding: 2px 4px; border-radius: 12px; color: white; margin: 0; }
    .only-photo .msg-status { position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.5); padding: 2px 4px; border-radius: 12px; color: white; margin: 0; }

    
    .sender { font-size: 0.75rem; font-weight: 700; color: #FF4D6D; margin-bottom: 4px; display: block; }
    .text { margin: 0; word-break: break-word; white-space: pre-wrap; }
    .edited-label { font-size: 0.7rem; opacity: 0.7; margin-left: 4px; font-style: italic; }
    
    .attach-btn { background: transparent; border: none; font-size: 1.5rem; color: #a4133c; padding: 5px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; flex-shrink: 0; }
    .attach-btn:active { transform: scale(0.9); }

    .attach-menu { position: absolute; bottom: 65px; left: 10px; background: white; border-radius: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); display: flex; flex-direction: column; padding: 5px; animation: scaleIn 0.2s; z-index: 2000; }
    .attach-menu-item { position: relative; background: transparent; border: none; font-size: 1.5rem; color: #a4133c; padding: 10px; cursor: pointer; transition: background 0.2s; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .attach-menu-item:hover { background: #fff0f3; }
    @keyframes scaleIn { from { transform: scale(0.8) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }

    .recording-bar { display: flex; flex: 1; align-items: center; justify-content: space-between; padding: 0 10px; background: #fff0f3; border-radius: 20px; }
    .recording-indicator { display: flex; align-items: center; gap: 8px; color: #FF4D6D; font-weight: bold; font-size: 0.9rem; }
    .pulse-dot { width: 10px; height: 10px; background: #FF4D6D; border-radius: 50%; animation: pulse 1s infinite; }
    @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }
    .stop-record-btn { background: transparent; border: none; font-size: 1.8rem; color: #FF4D6D; display: flex; align-items: center; }
    .cancel-record-btn { background: transparent; border: none; font-size: 1.5rem; color: #666; display: flex; align-items: center; }

    .doodle-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; display: flex; flex-direction: column; }
    .doodle-topbar { position: absolute; top: var(--safe-top); left: 20px; right: 20px; display: flex; justify-content: space-between; align-items: center; z-index: 10001; }
    .doodle-tools { display: flex; gap: 15px; background: rgba(0,0,0,0.5); padding: 8px 15px; border-radius: 30px; backdrop-filter: blur(10px); }
    
    .doodle-slider-container { position: absolute; left: 20px; top: 50%; transform: translateY(-50%); z-index: 10001; height: 200px; display: flex; flex-direction: column; align-items: center; background: rgba(0,0,0,0.5); border-radius: 20px; padding: 15px 0; backdrop-filter: blur(10px); }
    .doodle-slider { -webkit-appearance: slider-vertical; width: 8px; height: 100%; outline: none; }
    
    .doodle-toolbar { position: absolute; bottom: calc(var(--safe-bottom) + 70px); left: 10px; right: 10px; display: flex; justify-content: space-between; align-items: center; background: rgba(80, 80, 80, 0.95); backdrop-filter: blur(10px); padding: 8px 12px; border-radius: 40px; box-shadow: 0 5px 20px rgba(0,0,0,0.3); z-index: 10001; gap: 8px; }
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

    .msg-avatar-container { position: relative; width: 35px; height: 35px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1); background: transparent; }
    .msg-avatar { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; box-sizing: border-box; }
    .msg-avatar-fallback { border-radius: 50%; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; font-weight: bold; font-size: 0.8rem; }
    
    
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

    .input-area { background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); padding-bottom: calc(var(--safe-bottom) + 102px); border-top: 1px solid rgba(0,0,0,0.05); display: flex; flex-direction: column; transition: padding-bottom 0.2s ease-out; }
    :host-context(body.hide-tabs) .input-area { padding-bottom: calc(var(--safe-bottom) + 5px); }
    .input-container { padding: 10px 15px; display: flex; align-items: center; gap: 10px; position: relative; }
    
    .premium-input { flex: 1; background: #f8f9fa; border: 1px solid rgba(0,0,0,0.05); border-radius: 20px; padding: 12px 20px; font-size: 1rem; color: #333; outline: none; transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease; }
    .premium-input:focus { background: white; border-color: #FF4D6D; box-shadow: 0 0 0 3px rgba(255,77,109,0.1); }
    .textarea-input { resize: none; min-height: 44px; max-height: 120px; overflow-y: auto; line-height: 1.4; font-family: inherit; box-sizing: border-box; }
    
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

    /* Night Owl Mode Overrides */
    :host-context(.night-owl-mode) .chat-wrapper { background: linear-gradient(135deg, #121212 0%, #1a1a1a 100%); }
    :host-context(.night-owl-mode) .chat-container { background: linear-gradient(135deg, #121212 0%, #1a1a1a 100%); }
    :host-context(.night-owl-mode) .input-area { background: rgba(30,30,30,0.85); border-top-color: rgba(255,255,255,0.05); }
    :host-context(.night-owl-mode) .premium-input { background: rgba(0,0,0,0.4); border-color: #333; color: #fdfdfd; }
    :host-context(.night-owl-mode) .premium-input:focus { background: rgba(0,0,0,0.6); border-color: #a78bfa; }
    :host-context(.night-owl-mode) .message-wrapper:not(.mine) .bubble-dog::before, :host-context(.night-owl-mode) .message-wrapper:not(.mine) .bubble-dog::after {
        background: rgba(40,40,40,0.9); border-color: #333;
    }
    :host-context(.night-owl-mode) .message-wrapper:not(.mine) .bubble { background: rgba(40,40,40,0.9); color: #fdfdfd; border-color: #333; }
    :host-context(.night-owl-mode) .sender { color: #a78bfa; }
    :host-context(.night-owl-mode) .attach-btn { color: #a78bfa; }
    :host-context(.night-owl-mode) .empty-state { color: #ccc; }
    :host-context(.night-owl-mode) .empty-icon { color: #8b5cf6; }
    :host-context(.night-owl-mode) .reactions-container,
    :host-context(.night-owl-mode) .attach-menu,
    :host-context(.night-owl-mode) .reactions-popover-content,
    :host-context(.night-owl-mode) .insta-context-menu { background: rgba(40,40,40,0.95); border-color: #333; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
    :host-context(.night-owl-mode) .attach-menu-item { color: #a78bfa; }
    :host-context(.night-owl-mode) .attach-menu-item:hover { background: rgba(255,255,255,0.1); }
    :host-context(.night-owl-mode) .reply-preview { background: rgba(40,40,40,0.95); border-left-color: #a78bfa; }
    :host-context(.night-owl-mode) .reply-title { color: #a78bfa; }
    :host-context(.night-owl-mode) .reply-text { color: #ccc; }
    :host-context(.night-owl-mode) .gif-modal { background: rgba(30,30,30,0.98); border-top: 1px solid #333; }
    :host-context(.night-owl-mode) .gif-search { background: rgba(0,0,0,0.4); border-color: #333; color: #fdfdfd; }
    :host-context(.night-owl-mode) .gif-search-btn { background: linear-gradient(135deg, #a78bfa, #8b5cf6); }
    :host-context(.night-owl-mode) .color-picker-modal { background: rgba(30,30,30,0.95); border-color: #333; }
    :host-context(.night-owl-mode) .color-picker-modal h3 { color: #fdfdfd; }
    :host-context(.night-owl-mode) .cp-btn.cancel { background: rgba(255,255,255,0.1); color: #ccc; }
    :host-context(.night-owl-mode) .cp-btn.accept { background: linear-gradient(135deg, #a78bfa, #8b5cf6); }
    :host-context(.night-owl-mode) .menu-username { color: #fdfdfd; }
    :host-context(.night-owl-mode) .menu-action { color: #ccc; }
    :host-context(.night-owl-mode) .menu-action ion-icon { color: #a78bfa; }
    :host-context(.night-owl-mode) .menu-action:active { background: rgba(255,255,255,0.1); }
    :host-context(.night-owl-mode) .recording-bar { background: rgba(167,139,250,0.15); }
    :host-context(.night-owl-mode) .recording-indicator { color: #a78bfa; }
    :host-context(.night-owl-mode) .pulse-dot { background: #a78bfa; }
    :host-context(.night-owl-mode) .mine .bubble { background: linear-gradient(135deg, #8b5cf6, #6d28d9); }
    :host-context(.night-owl-mode) .send-btn { background: rgba(255,255,255,0.1); color: #ccc; }
    :host-context(.night-owl-mode) .send-btn.active { background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; }
    :host-context(.night-owl-mode) .mine .reply-context { background: rgba(139, 92, 246, 0.15); border-right-color: #8b5cf6; color: #fdfdfd; }
    :host-context(.night-owl-mode) .mine .reply-context-name { color: #a78bfa; }
    :host-context(.night-owl-mode) .reply-icon-circle ion-icon { color: #8b5cf6; }
    :host-context(.night-owl-mode) .mine .play-btn { color: #8b5cf6; }
    :host-context(.night-owl-mode) .add-btn { background: #8b5cf6; }

    /* Premium Locks */
    .premium-lock {
      position: absolute;
      top: -5px;
      right: -5px;
      font-size: 12px;
      color: #FFD700;
      background: #000;
      border-radius: 50%;
      padding: 2px;
    }
    
    .mic-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .mic-lock {
      top: -2px;
      right: -8px;
    }

    
        /* Burbuja Gatito - Premium */
    .bubble-cat { border-top-left-radius: 20px; border-top-right-radius: 20px; isolation: isolate; }
    .mine .bubble-cat::before, .mine .bubble-cat::after {
      content: ''; position: absolute; top: -6px; width: 16px; height: 16px; background: linear-gradient(135deg, #FF758C, #ff799b); border-radius: 4px; transform: rotate(45deg); z-index: -1; box-shadow: inset 2px 2px 0 rgba(255,255,255,0.2);
    }
    .message-wrapper:not(.mine) .bubble-cat::before, .message-wrapper:not(.mine) .bubble-cat::after {
      content: ''; position: absolute; top: -6px; width: 16px; height: 16px; background: rgba(255,255,255,0.95); border-radius: 4px; transform: rotate(45deg); z-index: -1; box-shadow: inset 1px 1px 0 rgba(255,255,255,0.8), 0 -2px 5px rgba(0,0,0,0.02);
    }
    .bubble-cat::before { left: 14px; }
    .bubble-cat::after { right: 14px; }

    /* Burbuja Perrito - Premium */
    .bubble-dog { border-top-left-radius: 20px; border-top-right-radius: 20px; isolation: isolate; }
    .mine .bubble-dog::before, .mine .bubble-dog::after {
      content: ''; position: absolute; top: 2px; width: 18px; height: 28px; background: linear-gradient(135deg, #FF758C, #ff799b); border-radius: 10px; z-index: -1; box-shadow: inset 1px 2px 0 rgba(255,255,255,0.15), -2px 4px 8px rgba(255, 117, 140, 0.4);
    }
    .message-wrapper:not(.mine) .bubble-dog::before, .message-wrapper:not(.mine) .bubble-dog::after {
      content: ''; position: absolute; top: 2px; width: 18px; height: 28px; background: rgba(255,255,255,0.95); border-radius: 10px; z-index: -1; box-shadow: inset 1px 1px 0 rgba(255,255,255,0.8), -2px 4px 8px rgba(0,0,0,0.04);
    }
    .bubble-dog::before { left: -6px; transform: rotate(20deg); }
    .bubble-dog::after { right: -6px; transform: rotate(-20deg); }
    
        /* Burbuja Nube - Estilo Pensamiento (Elegante y escalable) */
    .bubble-cloud { border-radius: 32px !important; margin-bottom: 24px; isolation: isolate; }
    .bubble-cloud::before {
      content: ''; position: absolute; bottom: -12px; width: 16px; height: 16px; border-radius: 50%; z-index: -1;
    }
    
    /* TEST BUBBLES WITH 9-SLICE BORDER-IMAGE */
    .bubble-capybara {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8IS0tIEJvZHkgLS0+DQogIDxyZWN0IHg9IjIwIiB5PSIxMCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjYwIiByeD0iMTUiIGZpbGw9IiNEMkI0OEMiIC8+DQogIA0KICA8IS0tIENhcHliYXJhIFNub3V0L0hlYWQgKExlZnQgc2lkZSkgLS0+DQogIDxwYXRoIGQ9Ik0gMzAgMTAgTCAxMCAyMCBRIDAgNDAgMTAgNzAgTCAzMCA3MCBaIiBmaWxsPSIjRDJCNDhDIiAvPg0KICA8IS0tIEVhciAtLT4NCiAgPGNpcmNsZSBjeD0iMjAiIGN5PSIxNSIgcj0iNiIgZmlsbD0iI0IwOEQ2QSIgLz4NCiAgPCEtLSBFeWUgLS0+DQogIDxsaW5lIHgxPSIxNSIgeTE9IjM1IiB4Mj0iMjIiIHkyPSIzNSIgc3Ryb2tlPSIjNEEzQjMyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8IS0tIE5vc2UvTW91dGggLS0+DQogIDxwYXRoIGQ9Ik0gNSA1MCBRIDggNTAgMTAgNTUgUSAxMiA1MCAxNSA1MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNEEzQjMyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8IS0tIEJsdXNoIC0tPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjQ1IiByPSI0IiBmaWxsPSIjRkY5OTk5IiBvcGFjaXR5PSIwLjYiIC8+DQoNCiAgPCEtLSBDYXB5YmFyYSBMaXR0bGUgRmVldCAoQm90dG9tKSAtLT4NCiAgPHJlY3QgeD0iMjUiIHk9IjY1IiB3aWR0aD0iMTAiIGhlaWdodD0iMTUiIHJ4PSI1IiBmaWxsPSIjQjA4RDZBIiAvPg0KICA8cmVjdCB4PSI4NSIgeT0iNjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxNSIgcng9IjUiIGZpbGw9IiNCMDhENkEiIC8+DQoNCiAgPCEtLSBDYXB5YmFyYSBUYWlsIChSaWdodCBzaWRlKSAtLT4NCiAgPHBhdGggZD0iTSAxMDAgNTAgUSAxMTUgNTAgMTEwIDY1IiBmaWxsPSJub25lIiBzdHJva2U9IiNEMkI0OEMiIHN0cm9rZS13aWR0aD0iMTIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgLz4NCjwvc3ZnPg==');
      border-image-slice: 20 30 20 40 fill;
      border-image-width: 20px 30px 20px 40px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #4A3B32 !important;
      padding: 5px 20px 5px 30px !important;
    }
    
    .bubble-cat-img {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8IS0tIEJvZHkgLS0+DQogIDxyZWN0IHg9IjE1IiB5PSIyMCIgd2lkdGg9IjkwIiBoZWlnaHQ9IjUwIiByeD0iMTUiIGZpbGw9IiNGRkI2QzEiIC8+DQogIA0KICA8IS0tIExlZnQgRWFyIC0tPg0KICA8cG9seWdvbiBwb2ludHM9IjE1LDMwIDI1LDUgMzUsMjAiIGZpbGw9IiNGRkI2QzEiIC8+DQogIDwhLS0gSW5uZXIgTGVmdCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iMjAsMjUgMjUsMTIgMzAsMjAiIGZpbGw9IiNGRjk5QTgiIC8+DQogIA0KICA8IS0tIFJpZ2h0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSI4NSwyMCA5NSw1IDEwNSwzMCIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPCEtLSBJbm5lciBSaWdodCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iOTAsMjAgOTUsMTIgMTAwLDI1IiBmaWxsPSIjRkY5OUE4IiAvPg0KDQogIDwhLS0gQ2F0IFRhaWwgKFJpZ2h0IHNpZGUpIC0tPg0KICA8cGF0aCBkPSJNIDEwMCA2MCBRIDExNSA2MCAxMTUgNDAgUSAxMTUgMzAgMTEwIDI1IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkI2QzEiIHN0cm9rZS13aWR0aD0iOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPg0KDQogIDwhLS0gQ3V0ZSBDYXQgRmFjZSAoTGVmdCBTaWRlKSAtLT4NCiAgPGNpcmNsZSBjeD0iMjUiIGN5PSI0NSIgcj0iMi41IiBmaWxsPSIjNDQ0IiAvPg0KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjQ1IiByPSIyLjUiIGZpbGw9IiM0NDQiIC8+DQogIDxwYXRoIGQ9Ik0gMzAgNDggUSAzMi41IDUyIDM1IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiM0NDQiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4NCiAgPGNpcmNsZSBjeD0iMjAiIGN5PSI1MCIgcj0iMyIgZmlsbD0iI0ZGNkI4MSIgb3BhY2l0eT0iMC42IiAvPg0KICA8Y2lyY2xlIGN4PSI0NSIgY3k9IjUwIiByPSIzIiBmaWxsPSIjRkY2QjgxIiBvcGFjaXR5PSIwLjYiIC8+DQogIA0KICA8IS0tIFBhd3MgKEJvdHRvbSBsZWZ0KSAtLT4NCiAgPGNpcmNsZSBjeD0iMjUiIGN5PSI3MCIgcj0iNiIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPGNpcmNsZSBjeD0iNDAiIGN5PSI3MCIgcj0iNiIgZmlsbD0iI0ZGQjZDMSIgLz4NCjwvc3ZnPg==');
      border-image-slice: 25 25 20 50 fill;
      border-image-width: 25px 25px 20px 50px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #333 !important;
      padding: 0px 10px 5px 40px !important;
    }

    
    /* Mine variants for directional bubbles */
    .mine .bubble-capybara {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMjAiIHk9IjEwIiB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHJ4PSIxNSIgZmlsbD0iI0QyQjQ4QyIgLz4NCiAgDQogIDwhLS0gQ2FweWJhcmEgU25vdXQvSGVhZCAoTGVmdCBzaWRlKSAtLT4NCiAgPHBhdGggZD0iTSAzMCAxMCBMIDEwIDIwIFEgMCA0MCAxMCA3MCBMIDMwIDcwIFoiIGZpbGw9IiNEMkI0OEMiIC8+DQogIDwhLS0gRWFyIC0tPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjE1IiByPSI2IiBmaWxsPSIjQjA4RDZBIiAvPg0KICA8IS0tIEV5ZSAtLT4NCiAgPGxpbmUgeDE9IjE1IiB5MT0iMzUiIHgyPSIyMiIgeTI9IjM1IiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gTm9zZS9Nb3V0aCAtLT4NCiAgPHBhdGggZD0iTSA1IDUwIFEgOCA1MCAxMCA1NSBRIDEyIDUwIDE1IDUwIiBmaWxsPSJub25lIiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gQmx1c2ggLS0+DQogIDxjaXJjbGUgY3g9IjIwIiBjeT0iNDUiIHI9IjQiIGZpbGw9IiNGRjk5OTkiIG9wYWNpdHk9IjAuNiIgLz4NCg0KICA8IS0tIENhcHliYXJhIExpdHRsZSBGZWV0IChCb3R0b20pIC0tPg0KICA8cmVjdCB4PSIyNSIgeT0iNjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxNSIgcng9IjUiIGZpbGw9IiNCMDhENkEiIC8+DQogIDxyZWN0IHg9Ijg1IiB5PSI2NSIgd2lkdGg9IjEwIiBoZWlnaHQ9IjE1IiByeD0iNSIgZmlsbD0iI0IwOEQ2QSIgLz4NCg0KICA8IS0tIENhcHliYXJhIFRhaWwgKFJpZ2h0IHNpZGUpIC0tPg0KICA8cGF0aCBkPSJNIDEwMCA1MCBRIDExNSA1MCAxMTAgNjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0QyQjQ4QyIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 20 40 20 30 fill !important;
      border-image-width: 20px 40px 20px 30px !important;
      padding: 5px 30px 5px 20px !important;
    }
    
    .mine .bubble-cat-img {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMTUiIHk9IjIwIiB3aWR0aD0iOTAiIGhlaWdodD0iNTAiIHJ4PSIxNSIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgDQogIDwhLS0gTGVmdCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iMTUsMzAgMjUsNSAzNSwyMCIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPCEtLSBJbm5lciBMZWZ0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSIyMCwyNSAyNSwxMiAzMCwyMCIgZmlsbD0iI0ZGOTlBOCIgLz4NCiAgDQogIDwhLS0gUmlnaHQgRWFyIC0tPg0KICA8cG9seWdvbiBwb2ludHM9Ijg1LDIwIDk1LDUgMTA1LDMwIiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8IS0tIElubmVyIFJpZ2h0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSI5MCwyMCA5NSwxMiAxMDAsMjUiIGZpbGw9IiNGRjk5QTgiIC8+DQoNCiAgPCEtLSBDYXQgVGFpbCAoUmlnaHQgc2lkZSkgLS0+DQogIDxwYXRoIGQ9Ik0gMTAwIDYwIFEgMTE1IDYwIDExNSA0MCBRIDExNSAzMCAxMTAgMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGQjZDMSIgc3Ryb2tlLXdpZHRoPSI4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+DQoNCiAgPCEtLSBDdXRlIENhdCBGYWNlIChMZWZ0IFNpZGUpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjQ1IiByPSIyLjUiIGZpbGw9IiM0NDQiIC8+DQogIDxjaXJjbGUgY3g9IjQwIiBjeT0iNDUiIHI9IjIuNSIgZmlsbD0iIzQ0NCIgLz4NCiAgPHBhdGggZD0iTSAzMCA0OCBRIDMyLjUgNTIgMzUgNDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQ0NCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjUwIiByPSIzIiBmaWxsPSIjRkY2QjgxIiBvcGFjaXR5PSIwLjYiIC8+DQogIDxjaXJjbGUgY3g9IjQ1IiBjeT0iNTAiIHI9IjMiIGZpbGw9IiNGRjZCODEiIG9wYWNpdHk9IjAuNiIgLz4NCiAgDQogIDwhLS0gUGF3cyAoQm90dG9tIGxlZnQpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 25 50 20 25 fill !important;
      border-image-width: 25px 50px 20px 25px !important;
      padding: 0px 40px 5px 10px !important;
    }

    .bubble-neon {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiAgPGRlZnM+DQogICAgPGZpbHRlciBpZD0iZ2xvdyIgeD0iLTIwJSIgeT0iLTIwJSIgd2lkdGg9IjE0MCUiIGhlaWdodD0iMTQwJSI+DQogICAgICA8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIzIiByZXN1bHQ9ImJsdXIiIC8+DQogICAgICA8ZmVNZXJnZT4NCiAgICAgICAgPGZlTWVyZ2VOb2RlIGluPSJibHVyIiAvPg0KICAgICAgICA8ZmVNZXJnZU5vZGUgaW49ImJsdXIiIC8+DQogICAgICAgIDxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIgLz4NCiAgICAgIDwvZmVNZXJnZT4NCiAgICA8L2ZpbHRlcj4NCiAgPC9kZWZzPg0KICA8cmVjdCB4PSI1IiB5PSI1IiB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHJ4PSIxMCIgZmlsbD0iIzExMSIgc3Ryb2tlPSIjMDBGRkZGIiBzdHJva2Utd2lkdGg9IjIiIGZpbHRlcj0idXJsKCNnbG93KSIgLz4NCiAgPHJlY3QgeD0iNSIgeT0iNSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMTAiIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2U9IiNGRjAwRkYiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWRhc2hhcnJheT0iMTAgNSIgLz4NCjwvc3ZnPg==');
      border-image-slice: 20 fill;
      border-image-width: 20px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #00FFFF !important;
      padding: 10px 15px !important;
    }
    
    .mine .bubble-capybara, .mine .bubble-cat-img, .mine 
    /* Mine variants for directional bubbles */
    .mine .bubble-capybara {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMjAiIHk9IjEwIiB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHJ4PSIxNSIgZmlsbD0iI0QyQjQ4QyIgLz4NCiAgDQogIDwhLS0gQ2FweWJhcmEgU25vdXQvSGVhZCAoTGVmdCBzaWRlKSAtLT4NCiAgPHBhdGggZD0iTSAzMCAxMCBMIDEwIDIwIFEgMCA0MCAxMCA3MCBMIDMwIDcwIFoiIGZpbGw9IiNEMkI0OEMiIC8+DQogIDwhLS0gRWFyIC0tPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjE1IiByPSI2IiBmaWxsPSIjQjA4RDZBIiAvPg0KICA8IS0tIEV5ZSAtLT4NCiAgPGxpbmUgeDE9IjE1IiB5MT0iMzUiIHgyPSIyMiIgeTI9IjM1IiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gTm9zZS9Nb3V0aCAtLT4NCiAgPHBhdGggZD0iTSA1IDUwIFEgOCA1MCAxMCA1NSBRIDEyIDUwIDE1IDUwIiBmaWxsPSJub25lIiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gQmx1c2ggLS0+DQogIDxjaXJjbGUgY3g9IjIwIiBjeT0iNDUiIHI9IjQiIGZpbGw9IiNGRjk5OTkiIG9wYWNpdHk9IjAuNiIgLz4NCg0KICA8IS0tIENhcHliYXJhIExpdHRsZSBGZWV0IChCb3R0b20pIC0tPg0KICA8cmVjdCB4PSIyNSIgeT0iNjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxNSIgcng9IjUiIGZpbGw9IiNCMDhENkEiIC8+DQogIDxyZWN0IHg9Ijg1IiB5PSI2NSIgd2lkdGg9IjEwIiBoZWlnaHQ9IjE1IiByeD0iNSIgZmlsbD0iI0IwOEQ2QSIgLz4NCg0KICA8IS0tIENhcHliYXJhIFRhaWwgKFJpZ2h0IHNpZGUpIC0tPg0KICA8cGF0aCBkPSJNIDEwMCA1MCBRIDExNSA1MCAxMTAgNjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0QyQjQ4QyIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 20 40 20 30 fill !important;
      border-image-width: 20px 40px 20px 30px !important;
      padding: 5px 30px 5px 20px !important;
    }
    
    .mine .bubble-cat-img {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMTUiIHk9IjIwIiB3aWR0aD0iOTAiIGhlaWdodD0iNTAiIHJ4PSIxNSIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgDQogIDwhLS0gTGVmdCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iMTUsMzAgMjUsNSAzNSwyMCIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPCEtLSBJbm5lciBMZWZ0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSIyMCwyNSAyNSwxMiAzMCwyMCIgZmlsbD0iI0ZGOTlBOCIgLz4NCiAgDQogIDwhLS0gUmlnaHQgRWFyIC0tPg0KICA8cG9seWdvbiBwb2ludHM9Ijg1LDIwIDk1LDUgMTA1LDMwIiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8IS0tIElubmVyIFJpZ2h0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSI5MCwyMCA5NSwxMiAxMDAsMjUiIGZpbGw9IiNGRjk5QTgiIC8+DQoNCiAgPCEtLSBDYXQgVGFpbCAoUmlnaHQgc2lkZSkgLS0+DQogIDxwYXRoIGQ9Ik0gMTAwIDYwIFEgMTE1IDYwIDExNSA0MCBRIDExNSAzMCAxMTAgMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGQjZDMSIgc3Ryb2tlLXdpZHRoPSI4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+DQoNCiAgPCEtLSBDdXRlIENhdCBGYWNlIChMZWZ0IFNpZGUpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjQ1IiByPSIyLjUiIGZpbGw9IiM0NDQiIC8+DQogIDxjaXJjbGUgY3g9IjQwIiBjeT0iNDUiIHI9IjIuNSIgZmlsbD0iIzQ0NCIgLz4NCiAgPHBhdGggZD0iTSAzMCA0OCBRIDMyLjUgNTIgMzUgNDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQ0NCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjUwIiByPSIzIiBmaWxsPSIjRkY2QjgxIiBvcGFjaXR5PSIwLjYiIC8+DQogIDxjaXJjbGUgY3g9IjQ1IiBjeT0iNTAiIHI9IjMiIGZpbGw9IiNGRjZCODEiIG9wYWNpdHk9IjAuNiIgLz4NCiAgDQogIDwhLS0gUGF3cyAoQm90dG9tIGxlZnQpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 25 50 20 25 fill !important;
      border-image-width: 25px 50px 20px 25px !important;
      padding: 0px 40px 5px 10px !important;
    }

    .bubble-neon {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiAgPGRlZnM+DQogICAgPGZpbHRlciBpZD0iZ2xvdyIgeD0iLTIwJSIgeT0iLTIwJSIgd2lkdGg9IjE0MCUiIGhlaWdodD0iMTQwJSI+DQogICAgICA8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIzIiByZXN1bHQ9ImJsdXIiIC8+DQogICAgICA8ZmVNZXJnZT4NCiAgICAgICAgPGZlTWVyZ2VOb2RlIGluPSJibHVyIiAvPg0KICAgICAgICA8ZmVNZXJnZU5vZGUgaW49ImJsdXIiIC8+DQogICAgICAgIDxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIgLz4NCiAgICAgIDwvZmVNZXJnZT4NCiAgICA8L2ZpbHRlcj4NCiAgPC9kZWZzPg0KICA8cmVjdCB4PSI1IiB5PSI1IiB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHJ4PSIxMCIgZmlsbD0iIzExMSIgc3Ryb2tlPSIjMDBGRkZGIiBzdHJva2Utd2lkdGg9IjIiIGZpbHRlcj0idXJsKCNnbG93KSIgLz4NCiAgPHJlY3QgeD0iNSIgeT0iNSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMTAiIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2U9IiNGRjAwRkYiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWRhc2hhcnJheT0iMTAgNSIgLz4NCjwvc3ZnPg==');
      border-image-slice: 20 fill;
      border-image-width: 20px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #00FFFF !important;
      padding: 10px 15px !important;
    }
    

    .bubble-cloud::after {
      content: ''; position: absolute; bottom: -24px; width: 8px; height: 8px; border-radius: 50%; z-index: -1;
    }
    
    .mine .bubble-cloud::before { background: #FF758C; right: 24px; box-shadow: inset 1px 2px 0 rgba(255,255,255,0.15); }
    .mine 
    /* TEST BUBBLES WITH 9-SLICE BORDER-IMAGE */
    .bubble-capybara {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8IS0tIEJvZHkgLS0+DQogIDxyZWN0IHg9IjIwIiB5PSIxMCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjYwIiByeD0iMTUiIGZpbGw9IiNEMkI0OEMiIC8+DQogIA0KICA8IS0tIENhcHliYXJhIFNub3V0L0hlYWQgKExlZnQgc2lkZSkgLS0+DQogIDxwYXRoIGQ9Ik0gMzAgMTAgTCAxMCAyMCBRIDAgNDAgMTAgNzAgTCAzMCA3MCBaIiBmaWxsPSIjRDJCNDhDIiAvPg0KICA8IS0tIEVhciAtLT4NCiAgPGNpcmNsZSBjeD0iMjAiIGN5PSIxNSIgcj0iNiIgZmlsbD0iI0IwOEQ2QSIgLz4NCiAgPCEtLSBFeWUgLS0+DQogIDxsaW5lIHgxPSIxNSIgeTE9IjM1IiB4Mj0iMjIiIHkyPSIzNSIgc3Ryb2tlPSIjNEEzQjMyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8IS0tIE5vc2UvTW91dGggLS0+DQogIDxwYXRoIGQ9Ik0gNSA1MCBRIDggNTAgMTAgNTUgUSAxMiA1MCAxNSA1MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNEEzQjMyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8IS0tIEJsdXNoIC0tPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjQ1IiByPSI0IiBmaWxsPSIjRkY5OTk5IiBvcGFjaXR5PSIwLjYiIC8+DQoNCiAgPCEtLSBDYXB5YmFyYSBMaXR0bGUgRmVldCAoQm90dG9tKSAtLT4NCiAgPHJlY3QgeD0iMjUiIHk9IjY1IiB3aWR0aD0iMTAiIGhlaWdodD0iMTUiIHJ4PSI1IiBmaWxsPSIjQjA4RDZBIiAvPg0KICA8cmVjdCB4PSI4NSIgeT0iNjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxNSIgcng9IjUiIGZpbGw9IiNCMDhENkEiIC8+DQoNCiAgPCEtLSBDYXB5YmFyYSBUYWlsIChSaWdodCBzaWRlKSAtLT4NCiAgPHBhdGggZD0iTSAxMDAgNTAgUSAxMTUgNTAgMTEwIDY1IiBmaWxsPSJub25lIiBzdHJva2U9IiNEMkI0OEMiIHN0cm9rZS13aWR0aD0iMTIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgLz4NCjwvc3ZnPg==');
      border-image-slice: 20 30 20 40 fill;
      border-image-width: 20px 30px 20px 40px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #4A3B32 !important;
      padding: 5px 20px 5px 30px !important;
    }
    
    .bubble-cat-img {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8IS0tIEJvZHkgLS0+DQogIDxyZWN0IHg9IjE1IiB5PSIyMCIgd2lkdGg9IjkwIiBoZWlnaHQ9IjUwIiByeD0iMTUiIGZpbGw9IiNGRkI2QzEiIC8+DQogIA0KICA8IS0tIExlZnQgRWFyIC0tPg0KICA8cG9seWdvbiBwb2ludHM9IjE1LDMwIDI1LDUgMzUsMjAiIGZpbGw9IiNGRkI2QzEiIC8+DQogIDwhLS0gSW5uZXIgTGVmdCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iMjAsMjUgMjUsMTIgMzAsMjAiIGZpbGw9IiNGRjk5QTgiIC8+DQogIA0KICA8IS0tIFJpZ2h0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSI4NSwyMCA5NSw1IDEwNSwzMCIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPCEtLSBJbm5lciBSaWdodCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iOTAsMjAgOTUsMTIgMTAwLDI1IiBmaWxsPSIjRkY5OUE4IiAvPg0KDQogIDwhLS0gQ2F0IFRhaWwgKFJpZ2h0IHNpZGUpIC0tPg0KICA8cGF0aCBkPSJNIDEwMCA2MCBRIDExNSA2MCAxMTUgNDAgUSAxMTUgMzAgMTEwIDI1IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkI2QzEiIHN0cm9rZS13aWR0aD0iOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPg0KDQogIDwhLS0gQ3V0ZSBDYXQgRmFjZSAoTGVmdCBTaWRlKSAtLT4NCiAgPGNpcmNsZSBjeD0iMjUiIGN5PSI0NSIgcj0iMi41IiBmaWxsPSIjNDQ0IiAvPg0KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjQ1IiByPSIyLjUiIGZpbGw9IiM0NDQiIC8+DQogIDxwYXRoIGQ9Ik0gMzAgNDggUSAzMi41IDUyIDM1IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiM0NDQiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4NCiAgPGNpcmNsZSBjeD0iMjAiIGN5PSI1MCIgcj0iMyIgZmlsbD0iI0ZGNkI4MSIgb3BhY2l0eT0iMC42IiAvPg0KICA8Y2lyY2xlIGN4PSI0NSIgY3k9IjUwIiByPSIzIiBmaWxsPSIjRkY2QjgxIiBvcGFjaXR5PSIwLjYiIC8+DQogIA0KICA8IS0tIFBhd3MgKEJvdHRvbSBsZWZ0KSAtLT4NCiAgPGNpcmNsZSBjeD0iMjUiIGN5PSI3MCIgcj0iNiIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPGNpcmNsZSBjeD0iNDAiIGN5PSI3MCIgcj0iNiIgZmlsbD0iI0ZGQjZDMSIgLz4NCjwvc3ZnPg==');
      border-image-slice: 25 25 20 50 fill;
      border-image-width: 25px 25px 20px 50px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #333 !important;
      padding: 0px 10px 5px 40px !important;
    }

    
    /* Mine variants for directional bubbles */
    .mine .bubble-capybara {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMjAiIHk9IjEwIiB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHJ4PSIxNSIgZmlsbD0iI0QyQjQ4QyIgLz4NCiAgDQogIDwhLS0gQ2FweWJhcmEgU25vdXQvSGVhZCAoTGVmdCBzaWRlKSAtLT4NCiAgPHBhdGggZD0iTSAzMCAxMCBMIDEwIDIwIFEgMCA0MCAxMCA3MCBMIDMwIDcwIFoiIGZpbGw9IiNEMkI0OEMiIC8+DQogIDwhLS0gRWFyIC0tPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjE1IiByPSI2IiBmaWxsPSIjQjA4RDZBIiAvPg0KICA8IS0tIEV5ZSAtLT4NCiAgPGxpbmUgeDE9IjE1IiB5MT0iMzUiIHgyPSIyMiIgeTI9IjM1IiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gTm9zZS9Nb3V0aCAtLT4NCiAgPHBhdGggZD0iTSA1IDUwIFEgOCA1MCAxMCA1NSBRIDEyIDUwIDE1IDUwIiBmaWxsPSJub25lIiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gQmx1c2ggLS0+DQogIDxjaXJjbGUgY3g9IjIwIiBjeT0iNDUiIHI9IjQiIGZpbGw9IiNGRjk5OTkiIG9wYWNpdHk9IjAuNiIgLz4NCg0KICA8IS0tIENhcHliYXJhIExpdHRsZSBGZWV0IChCb3R0b20pIC0tPg0KICA8cmVjdCB4PSIyNSIgeT0iNjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxNSIgcng9IjUiIGZpbGw9IiNCMDhENkEiIC8+DQogIDxyZWN0IHg9Ijg1IiB5PSI2NSIgd2lkdGg9IjEwIiBoZWlnaHQ9IjE1IiByeD0iNSIgZmlsbD0iI0IwOEQ2QSIgLz4NCg0KICA8IS0tIENhcHliYXJhIFRhaWwgKFJpZ2h0IHNpZGUpIC0tPg0KICA8cGF0aCBkPSJNIDEwMCA1MCBRIDExNSA1MCAxMTAgNjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0QyQjQ4QyIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 20 40 20 30 fill !important;
      border-image-width: 20px 40px 20px 30px !important;
      padding: 5px 30px 5px 20px !important;
    }
    
    .mine .bubble-cat-img {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMTUiIHk9IjIwIiB3aWR0aD0iOTAiIGhlaWdodD0iNTAiIHJ4PSIxNSIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgDQogIDwhLS0gTGVmdCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iMTUsMzAgMjUsNSAzNSwyMCIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPCEtLSBJbm5lciBMZWZ0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSIyMCwyNSAyNSwxMiAzMCwyMCIgZmlsbD0iI0ZGOTlBOCIgLz4NCiAgDQogIDwhLS0gUmlnaHQgRWFyIC0tPg0KICA8cG9seWdvbiBwb2ludHM9Ijg1LDIwIDk1LDUgMTA1LDMwIiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8IS0tIElubmVyIFJpZ2h0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSI5MCwyMCA5NSwxMiAxMDAsMjUiIGZpbGw9IiNGRjk5QTgiIC8+DQoNCiAgPCEtLSBDYXQgVGFpbCAoUmlnaHQgc2lkZSkgLS0+DQogIDxwYXRoIGQ9Ik0gMTAwIDYwIFEgMTE1IDYwIDExNSA0MCBRIDExNSAzMCAxMTAgMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGQjZDMSIgc3Ryb2tlLXdpZHRoPSI4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+DQoNCiAgPCEtLSBDdXRlIENhdCBGYWNlIChMZWZ0IFNpZGUpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjQ1IiByPSIyLjUiIGZpbGw9IiM0NDQiIC8+DQogIDxjaXJjbGUgY3g9IjQwIiBjeT0iNDUiIHI9IjIuNSIgZmlsbD0iIzQ0NCIgLz4NCiAgPHBhdGggZD0iTSAzMCA0OCBRIDMyLjUgNTIgMzUgNDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQ0NCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjUwIiByPSIzIiBmaWxsPSIjRkY2QjgxIiBvcGFjaXR5PSIwLjYiIC8+DQogIDxjaXJjbGUgY3g9IjQ1IiBjeT0iNTAiIHI9IjMiIGZpbGw9IiNGRjZCODEiIG9wYWNpdHk9IjAuNiIgLz4NCiAgDQogIDwhLS0gUGF3cyAoQm90dG9tIGxlZnQpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 25 50 20 25 fill !important;
      border-image-width: 25px 50px 20px 25px !important;
      padding: 0px 40px 5px 10px !important;
    }

    .bubble-neon {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiAgPGRlZnM+DQogICAgPGZpbHRlciBpZD0iZ2xvdyIgeD0iLTIwJSIgeT0iLTIwJSIgd2lkdGg9IjE0MCUiIGhlaWdodD0iMTQwJSI+DQogICAgICA8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIzIiByZXN1bHQ9ImJsdXIiIC8+DQogICAgICA8ZmVNZXJnZT4NCiAgICAgICAgPGZlTWVyZ2VOb2RlIGluPSJibHVyIiAvPg0KICAgICAgICA8ZmVNZXJnZU5vZGUgaW49ImJsdXIiIC8+DQogICAgICAgIDxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIgLz4NCiAgICAgIDwvZmVNZXJnZT4NCiAgICA8L2ZpbHRlcj4NCiAgPC9kZWZzPg0KICA8cmVjdCB4PSI1IiB5PSI1IiB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHJ4PSIxMCIgZmlsbD0iIzExMSIgc3Ryb2tlPSIjMDBGRkZGIiBzdHJva2Utd2lkdGg9IjIiIGZpbHRlcj0idXJsKCNnbG93KSIgLz4NCiAgPHJlY3QgeD0iNSIgeT0iNSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMTAiIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2U9IiNGRjAwRkYiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWRhc2hhcnJheT0iMTAgNSIgLz4NCjwvc3ZnPg==');
      border-image-slice: 20 fill;
      border-image-width: 20px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #00FFFF !important;
      padding: 10px 15px !important;
    }
    
    .mine .bubble-capybara, .mine .bubble-cat-img, .mine 
    /* Mine variants for directional bubbles */
    .mine .bubble-capybara {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMjAiIHk9IjEwIiB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHJ4PSIxNSIgZmlsbD0iI0QyQjQ4QyIgLz4NCiAgDQogIDwhLS0gQ2FweWJhcmEgU25vdXQvSGVhZCAoTGVmdCBzaWRlKSAtLT4NCiAgPHBhdGggZD0iTSAzMCAxMCBMIDEwIDIwIFEgMCA0MCAxMCA3MCBMIDMwIDcwIFoiIGZpbGw9IiNEMkI0OEMiIC8+DQogIDwhLS0gRWFyIC0tPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjE1IiByPSI2IiBmaWxsPSIjQjA4RDZBIiAvPg0KICA8IS0tIEV5ZSAtLT4NCiAgPGxpbmUgeDE9IjE1IiB5MT0iMzUiIHgyPSIyMiIgeTI9IjM1IiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gTm9zZS9Nb3V0aCAtLT4NCiAgPHBhdGggZD0iTSA1IDUwIFEgOCA1MCAxMCA1NSBRIDEyIDUwIDE1IDUwIiBmaWxsPSJub25lIiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gQmx1c2ggLS0+DQogIDxjaXJjbGUgY3g9IjIwIiBjeT0iNDUiIHI9IjQiIGZpbGw9IiNGRjk5OTkiIG9wYWNpdHk9IjAuNiIgLz4NCg0KICA8IS0tIENhcHliYXJhIExpdHRsZSBGZWV0IChCb3R0b20pIC0tPg0KICA8cmVjdCB4PSIyNSIgeT0iNjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxNSIgcng9IjUiIGZpbGw9IiNCMDhENkEiIC8+DQogIDxyZWN0IHg9Ijg1IiB5PSI2NSIgd2lkdGg9IjEwIiBoZWlnaHQ9IjE1IiByeD0iNSIgZmlsbD0iI0IwOEQ2QSIgLz4NCg0KICA8IS0tIENhcHliYXJhIFRhaWwgKFJpZ2h0IHNpZGUpIC0tPg0KICA8cGF0aCBkPSJNIDEwMCA1MCBRIDExNSA1MCAxMTAgNjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0QyQjQ4QyIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 20 40 20 30 fill !important;
      border-image-width: 20px 40px 20px 30px !important;
      padding: 5px 30px 5px 20px !important;
    }
    
    .mine .bubble-cat-img {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMTUiIHk9IjIwIiB3aWR0aD0iOTAiIGhlaWdodD0iNTAiIHJ4PSIxNSIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgDQogIDwhLS0gTGVmdCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iMTUsMzAgMjUsNSAzNSwyMCIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPCEtLSBJbm5lciBMZWZ0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSIyMCwyNSAyNSwxMiAzMCwyMCIgZmlsbD0iI0ZGOTlBOCIgLz4NCiAgDQogIDwhLS0gUmlnaHQgRWFyIC0tPg0KICA8cG9seWdvbiBwb2ludHM9Ijg1LDIwIDk1LDUgMTA1LDMwIiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8IS0tIElubmVyIFJpZ2h0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSI5MCwyMCA5NSwxMiAxMDAsMjUiIGZpbGw9IiNGRjk5QTgiIC8+DQoNCiAgPCEtLSBDYXQgVGFpbCAoUmlnaHQgc2lkZSkgLS0+DQogIDxwYXRoIGQ9Ik0gMTAwIDYwIFEgMTE1IDYwIDExNSA0MCBRIDExNSAzMCAxMTAgMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGQjZDMSIgc3Ryb2tlLXdpZHRoPSI4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+DQoNCiAgPCEtLSBDdXRlIENhdCBGYWNlIChMZWZ0IFNpZGUpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjQ1IiByPSIyLjUiIGZpbGw9IiM0NDQiIC8+DQogIDxjaXJjbGUgY3g9IjQwIiBjeT0iNDUiIHI9IjIuNSIgZmlsbD0iIzQ0NCIgLz4NCiAgPHBhdGggZD0iTSAzMCA0OCBRIDMyLjUgNTIgMzUgNDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQ0NCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjUwIiByPSIzIiBmaWxsPSIjRkY2QjgxIiBvcGFjaXR5PSIwLjYiIC8+DQogIDxjaXJjbGUgY3g9IjQ1IiBjeT0iNTAiIHI9IjMiIGZpbGw9IiNGRjZCODEiIG9wYWNpdHk9IjAuNiIgLz4NCiAgDQogIDwhLS0gUGF3cyAoQm90dG9tIGxlZnQpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 25 50 20 25 fill !important;
      border-image-width: 25px 50px 20px 25px !important;
      padding: 0px 40px 5px 10px !important;
    }

    .bubble-neon {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiAgPGRlZnM+DQogICAgPGZpbHRlciBpZD0iZ2xvdyIgeD0iLTIwJSIgeT0iLTIwJSIgd2lkdGg9IjE0MCUiIGhlaWdodD0iMTQwJSI+DQogICAgICA8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIzIiByZXN1bHQ9ImJsdXIiIC8+DQogICAgICA8ZmVNZXJnZT4NCiAgICAgICAgPGZlTWVyZ2VOb2RlIGluPSJibHVyIiAvPg0KICAgICAgICA8ZmVNZXJnZU5vZGUgaW49ImJsdXIiIC8+DQogICAgICAgIDxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIgLz4NCiAgICAgIDwvZmVNZXJnZT4NCiAgICA8L2ZpbHRlcj4NCiAgPC9kZWZzPg0KICA8cmVjdCB4PSI1IiB5PSI1IiB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHJ4PSIxMCIgZmlsbD0iIzExMSIgc3Ryb2tlPSIjMDBGRkZGIiBzdHJva2Utd2lkdGg9IjIiIGZpbHRlcj0idXJsKCNnbG93KSIgLz4NCiAgPHJlY3QgeD0iNSIgeT0iNSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMTAiIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2U9IiNGRjAwRkYiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWRhc2hhcnJheT0iMTAgNSIgLz4NCjwvc3ZnPg==');
      border-image-slice: 20 fill;
      border-image-width: 20px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #00FFFF !important;
      padding: 10px 15px !important;
    }
    

    .bubble-cloud::after { background: #FF7794; right: 12px; box-shadow: inset 1px 1px 0 rgba(255,255,255,0.15); }
    
    .message-wrapper:not(.mine) .bubble-cloud::before { background: rgba(255,255,255,0.95); left: 24px; box-shadow: inset 1px 1px 0 rgba(255,255,255,0.8), -1px 2px 4px rgba(0,0,0,0.02); }
    .message-wrapper:not(.mine) 
    /* TEST BUBBLES WITH 9-SLICE BORDER-IMAGE */
    .bubble-capybara {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8IS0tIEJvZHkgLS0+DQogIDxyZWN0IHg9IjIwIiB5PSIxMCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjYwIiByeD0iMTUiIGZpbGw9IiNEMkI0OEMiIC8+DQogIA0KICA8IS0tIENhcHliYXJhIFNub3V0L0hlYWQgKExlZnQgc2lkZSkgLS0+DQogIDxwYXRoIGQ9Ik0gMzAgMTAgTCAxMCAyMCBRIDAgNDAgMTAgNzAgTCAzMCA3MCBaIiBmaWxsPSIjRDJCNDhDIiAvPg0KICA8IS0tIEVhciAtLT4NCiAgPGNpcmNsZSBjeD0iMjAiIGN5PSIxNSIgcj0iNiIgZmlsbD0iI0IwOEQ2QSIgLz4NCiAgPCEtLSBFeWUgLS0+DQogIDxsaW5lIHgxPSIxNSIgeTE9IjM1IiB4Mj0iMjIiIHkyPSIzNSIgc3Ryb2tlPSIjNEEzQjMyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8IS0tIE5vc2UvTW91dGggLS0+DQogIDxwYXRoIGQ9Ik0gNSA1MCBRIDggNTAgMTAgNTUgUSAxMiA1MCAxNSA1MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNEEzQjMyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8IS0tIEJsdXNoIC0tPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjQ1IiByPSI0IiBmaWxsPSIjRkY5OTk5IiBvcGFjaXR5PSIwLjYiIC8+DQoNCiAgPCEtLSBDYXB5YmFyYSBMaXR0bGUgRmVldCAoQm90dG9tKSAtLT4NCiAgPHJlY3QgeD0iMjUiIHk9IjY1IiB3aWR0aD0iMTAiIGhlaWdodD0iMTUiIHJ4PSI1IiBmaWxsPSIjQjA4RDZBIiAvPg0KICA8cmVjdCB4PSI4NSIgeT0iNjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxNSIgcng9IjUiIGZpbGw9IiNCMDhENkEiIC8+DQoNCiAgPCEtLSBDYXB5YmFyYSBUYWlsIChSaWdodCBzaWRlKSAtLT4NCiAgPHBhdGggZD0iTSAxMDAgNTAgUSAxMTUgNTAgMTEwIDY1IiBmaWxsPSJub25lIiBzdHJva2U9IiNEMkI0OEMiIHN0cm9rZS13aWR0aD0iMTIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgLz4NCjwvc3ZnPg==');
      border-image-slice: 20 30 20 40 fill;
      border-image-width: 20px 30px 20px 40px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #4A3B32 !important;
      padding: 5px 20px 5px 30px !important;
    }
    
    .bubble-cat-img {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8IS0tIEJvZHkgLS0+DQogIDxyZWN0IHg9IjE1IiB5PSIyMCIgd2lkdGg9IjkwIiBoZWlnaHQ9IjUwIiByeD0iMTUiIGZpbGw9IiNGRkI2QzEiIC8+DQogIA0KICA8IS0tIExlZnQgRWFyIC0tPg0KICA8cG9seWdvbiBwb2ludHM9IjE1LDMwIDI1LDUgMzUsMjAiIGZpbGw9IiNGRkI2QzEiIC8+DQogIDwhLS0gSW5uZXIgTGVmdCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iMjAsMjUgMjUsMTIgMzAsMjAiIGZpbGw9IiNGRjk5QTgiIC8+DQogIA0KICA8IS0tIFJpZ2h0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSI4NSwyMCA5NSw1IDEwNSwzMCIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPCEtLSBJbm5lciBSaWdodCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iOTAsMjAgOTUsMTIgMTAwLDI1IiBmaWxsPSIjRkY5OUE4IiAvPg0KDQogIDwhLS0gQ2F0IFRhaWwgKFJpZ2h0IHNpZGUpIC0tPg0KICA8cGF0aCBkPSJNIDEwMCA2MCBRIDExNSA2MCAxMTUgNDAgUSAxMTUgMzAgMTEwIDI1IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkI2QzEiIHN0cm9rZS13aWR0aD0iOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPg0KDQogIDwhLS0gQ3V0ZSBDYXQgRmFjZSAoTGVmdCBTaWRlKSAtLT4NCiAgPGNpcmNsZSBjeD0iMjUiIGN5PSI0NSIgcj0iMi41IiBmaWxsPSIjNDQ0IiAvPg0KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjQ1IiByPSIyLjUiIGZpbGw9IiM0NDQiIC8+DQogIDxwYXRoIGQ9Ik0gMzAgNDggUSAzMi41IDUyIDM1IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiM0NDQiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4NCiAgPGNpcmNsZSBjeD0iMjAiIGN5PSI1MCIgcj0iMyIgZmlsbD0iI0ZGNkI4MSIgb3BhY2l0eT0iMC42IiAvPg0KICA8Y2lyY2xlIGN4PSI0NSIgY3k9IjUwIiByPSIzIiBmaWxsPSIjRkY2QjgxIiBvcGFjaXR5PSIwLjYiIC8+DQogIA0KICA8IS0tIFBhd3MgKEJvdHRvbSBsZWZ0KSAtLT4NCiAgPGNpcmNsZSBjeD0iMjUiIGN5PSI3MCIgcj0iNiIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPGNpcmNsZSBjeD0iNDAiIGN5PSI3MCIgcj0iNiIgZmlsbD0iI0ZGQjZDMSIgLz4NCjwvc3ZnPg==');
      border-image-slice: 25 25 20 50 fill;
      border-image-width: 25px 25px 20px 50px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #333 !important;
      padding: 0px 10px 5px 40px !important;
    }

    
    /* Mine variants for directional bubbles */
    .mine .bubble-capybara {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMjAiIHk9IjEwIiB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHJ4PSIxNSIgZmlsbD0iI0QyQjQ4QyIgLz4NCiAgDQogIDwhLS0gQ2FweWJhcmEgU25vdXQvSGVhZCAoTGVmdCBzaWRlKSAtLT4NCiAgPHBhdGggZD0iTSAzMCAxMCBMIDEwIDIwIFEgMCA0MCAxMCA3MCBMIDMwIDcwIFoiIGZpbGw9IiNEMkI0OEMiIC8+DQogIDwhLS0gRWFyIC0tPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjE1IiByPSI2IiBmaWxsPSIjQjA4RDZBIiAvPg0KICA8IS0tIEV5ZSAtLT4NCiAgPGxpbmUgeDE9IjE1IiB5MT0iMzUiIHgyPSIyMiIgeTI9IjM1IiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gTm9zZS9Nb3V0aCAtLT4NCiAgPHBhdGggZD0iTSA1IDUwIFEgOCA1MCAxMCA1NSBRIDEyIDUwIDE1IDUwIiBmaWxsPSJub25lIiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gQmx1c2ggLS0+DQogIDxjaXJjbGUgY3g9IjIwIiBjeT0iNDUiIHI9IjQiIGZpbGw9IiNGRjk5OTkiIG9wYWNpdHk9IjAuNiIgLz4NCg0KICA8IS0tIENhcHliYXJhIExpdHRsZSBGZWV0IChCb3R0b20pIC0tPg0KICA8cmVjdCB4PSIyNSIgeT0iNjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxNSIgcng9IjUiIGZpbGw9IiNCMDhENkEiIC8+DQogIDxyZWN0IHg9Ijg1IiB5PSI2NSIgd2lkdGg9IjEwIiBoZWlnaHQ9IjE1IiByeD0iNSIgZmlsbD0iI0IwOEQ2QSIgLz4NCg0KICA8IS0tIENhcHliYXJhIFRhaWwgKFJpZ2h0IHNpZGUpIC0tPg0KICA8cGF0aCBkPSJNIDEwMCA1MCBRIDExNSA1MCAxMTAgNjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0QyQjQ4QyIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 20 40 20 30 fill !important;
      border-image-width: 20px 40px 20px 30px !important;
      padding: 5px 30px 5px 20px !important;
    }
    
    .mine .bubble-cat-img {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMTUiIHk9IjIwIiB3aWR0aD0iOTAiIGhlaWdodD0iNTAiIHJ4PSIxNSIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgDQogIDwhLS0gTGVmdCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iMTUsMzAgMjUsNSAzNSwyMCIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPCEtLSBJbm5lciBMZWZ0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSIyMCwyNSAyNSwxMiAzMCwyMCIgZmlsbD0iI0ZGOTlBOCIgLz4NCiAgDQogIDwhLS0gUmlnaHQgRWFyIC0tPg0KICA8cG9seWdvbiBwb2ludHM9Ijg1LDIwIDk1LDUgMTA1LDMwIiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8IS0tIElubmVyIFJpZ2h0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSI5MCwyMCA5NSwxMiAxMDAsMjUiIGZpbGw9IiNGRjk5QTgiIC8+DQoNCiAgPCEtLSBDYXQgVGFpbCAoUmlnaHQgc2lkZSkgLS0+DQogIDxwYXRoIGQ9Ik0gMTAwIDYwIFEgMTE1IDYwIDExNSA0MCBRIDExNSAzMCAxMTAgMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGQjZDMSIgc3Ryb2tlLXdpZHRoPSI4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+DQoNCiAgPCEtLSBDdXRlIENhdCBGYWNlIChMZWZ0IFNpZGUpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjQ1IiByPSIyLjUiIGZpbGw9IiM0NDQiIC8+DQogIDxjaXJjbGUgY3g9IjQwIiBjeT0iNDUiIHI9IjIuNSIgZmlsbD0iIzQ0NCIgLz4NCiAgPHBhdGggZD0iTSAzMCA0OCBRIDMyLjUgNTIgMzUgNDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQ0NCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjUwIiByPSIzIiBmaWxsPSIjRkY2QjgxIiBvcGFjaXR5PSIwLjYiIC8+DQogIDxjaXJjbGUgY3g9IjQ1IiBjeT0iNTAiIHI9IjMiIGZpbGw9IiNGRjZCODEiIG9wYWNpdHk9IjAuNiIgLz4NCiAgDQogIDwhLS0gUGF3cyAoQm90dG9tIGxlZnQpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 25 50 20 25 fill !important;
      border-image-width: 25px 50px 20px 25px !important;
      padding: 0px 40px 5px 10px !important;
    }

    .bubble-neon {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiAgPGRlZnM+DQogICAgPGZpbHRlciBpZD0iZ2xvdyIgeD0iLTIwJSIgeT0iLTIwJSIgd2lkdGg9IjE0MCUiIGhlaWdodD0iMTQwJSI+DQogICAgICA8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIzIiByZXN1bHQ9ImJsdXIiIC8+DQogICAgICA8ZmVNZXJnZT4NCiAgICAgICAgPGZlTWVyZ2VOb2RlIGluPSJibHVyIiAvPg0KICAgICAgICA8ZmVNZXJnZU5vZGUgaW49ImJsdXIiIC8+DQogICAgICAgIDxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIgLz4NCiAgICAgIDwvZmVNZXJnZT4NCiAgICA8L2ZpbHRlcj4NCiAgPC9kZWZzPg0KICA8cmVjdCB4PSI1IiB5PSI1IiB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHJ4PSIxMCIgZmlsbD0iIzExMSIgc3Ryb2tlPSIjMDBGRkZGIiBzdHJva2Utd2lkdGg9IjIiIGZpbHRlcj0idXJsKCNnbG93KSIgLz4NCiAgPHJlY3QgeD0iNSIgeT0iNSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMTAiIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2U9IiNGRjAwRkYiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWRhc2hhcnJheT0iMTAgNSIgLz4NCjwvc3ZnPg==');
      border-image-slice: 20 fill;
      border-image-width: 20px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #00FFFF !important;
      padding: 10px 15px !important;
    }
    
    .mine .bubble-capybara, .mine .bubble-cat-img, .mine 
    /* Mine variants for directional bubbles */
    .mine .bubble-capybara {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMjAiIHk9IjEwIiB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHJ4PSIxNSIgZmlsbD0iI0QyQjQ4QyIgLz4NCiAgDQogIDwhLS0gQ2FweWJhcmEgU25vdXQvSGVhZCAoTGVmdCBzaWRlKSAtLT4NCiAgPHBhdGggZD0iTSAzMCAxMCBMIDEwIDIwIFEgMCA0MCAxMCA3MCBMIDMwIDcwIFoiIGZpbGw9IiNEMkI0OEMiIC8+DQogIDwhLS0gRWFyIC0tPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjE1IiByPSI2IiBmaWxsPSIjQjA4RDZBIiAvPg0KICA8IS0tIEV5ZSAtLT4NCiAgPGxpbmUgeDE9IjE1IiB5MT0iMzUiIHgyPSIyMiIgeTI9IjM1IiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gTm9zZS9Nb3V0aCAtLT4NCiAgPHBhdGggZD0iTSA1IDUwIFEgOCA1MCAxMCA1NSBRIDEyIDUwIDE1IDUwIiBmaWxsPSJub25lIiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gQmx1c2ggLS0+DQogIDxjaXJjbGUgY3g9IjIwIiBjeT0iNDUiIHI9IjQiIGZpbGw9IiNGRjk5OTkiIG9wYWNpdHk9IjAuNiIgLz4NCg0KICA8IS0tIENhcHliYXJhIExpdHRsZSBGZWV0IChCb3R0b20pIC0tPg0KICA8cmVjdCB4PSIyNSIgeT0iNjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxNSIgcng9IjUiIGZpbGw9IiNCMDhENkEiIC8+DQogIDxyZWN0IHg9Ijg1IiB5PSI2NSIgd2lkdGg9IjEwIiBoZWlnaHQ9IjE1IiByeD0iNSIgZmlsbD0iI0IwOEQ2QSIgLz4NCg0KICA8IS0tIENhcHliYXJhIFRhaWwgKFJpZ2h0IHNpZGUpIC0tPg0KICA8cGF0aCBkPSJNIDEwMCA1MCBRIDExNSA1MCAxMTAgNjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0QyQjQ4QyIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 20 40 20 30 fill !important;
      border-image-width: 20px 40px 20px 30px !important;
      padding: 5px 30px 5px 20px !important;
    }
    
    .mine .bubble-cat-img {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMTUiIHk9IjIwIiB3aWR0aD0iOTAiIGhlaWdodD0iNTAiIHJ4PSIxNSIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgDQogIDwhLS0gTGVmdCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iMTUsMzAgMjUsNSAzNSwyMCIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPCEtLSBJbm5lciBMZWZ0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSIyMCwyNSAyNSwxMiAzMCwyMCIgZmlsbD0iI0ZGOTlBOCIgLz4NCiAgDQogIDwhLS0gUmlnaHQgRWFyIC0tPg0KICA8cG9seWdvbiBwb2ludHM9Ijg1LDIwIDk1LDUgMTA1LDMwIiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8IS0tIElubmVyIFJpZ2h0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSI5MCwyMCA5NSwxMiAxMDAsMjUiIGZpbGw9IiNGRjk5QTgiIC8+DQoNCiAgPCEtLSBDYXQgVGFpbCAoUmlnaHQgc2lkZSkgLS0+DQogIDxwYXRoIGQ9Ik0gMTAwIDYwIFEgMTE1IDYwIDExNSA0MCBRIDExNSAzMCAxMTAgMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGQjZDMSIgc3Ryb2tlLXdpZHRoPSI4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+DQoNCiAgPCEtLSBDdXRlIENhdCBGYWNlIChMZWZ0IFNpZGUpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjQ1IiByPSIyLjUiIGZpbGw9IiM0NDQiIC8+DQogIDxjaXJjbGUgY3g9IjQwIiBjeT0iNDUiIHI9IjIuNSIgZmlsbD0iIzQ0NCIgLz4NCiAgPHBhdGggZD0iTSAzMCA0OCBRIDMyLjUgNTIgMzUgNDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQ0NCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjUwIiByPSIzIiBmaWxsPSIjRkY2QjgxIiBvcGFjaXR5PSIwLjYiIC8+DQogIDxjaXJjbGUgY3g9IjQ1IiBjeT0iNTAiIHI9IjMiIGZpbGw9IiNGRjZCODEiIG9wYWNpdHk9IjAuNiIgLz4NCiAgDQogIDwhLS0gUGF3cyAoQm90dG9tIGxlZnQpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 25 50 20 25 fill !important;
      border-image-width: 25px 50px 20px 25px !important;
      padding: 0px 40px 5px 10px !important;
    }

    .bubble-neon {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiAgPGRlZnM+DQogICAgPGZpbHRlciBpZD0iZ2xvdyIgeD0iLTIwJSIgeT0iLTIwJSIgd2lkdGg9IjE0MCUiIGhlaWdodD0iMTQwJSI+DQogICAgICA8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIzIiByZXN1bHQ9ImJsdXIiIC8+DQogICAgICA8ZmVNZXJnZT4NCiAgICAgICAgPGZlTWVyZ2VOb2RlIGluPSJibHVyIiAvPg0KICAgICAgICA8ZmVNZXJnZU5vZGUgaW49ImJsdXIiIC8+DQogICAgICAgIDxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIgLz4NCiAgICAgIDwvZmVNZXJnZT4NCiAgICA8L2ZpbHRlcj4NCiAgPC9kZWZzPg0KICA8cmVjdCB4PSI1IiB5PSI1IiB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHJ4PSIxMCIgZmlsbD0iIzExMSIgc3Ryb2tlPSIjMDBGRkZGIiBzdHJva2Utd2lkdGg9IjIiIGZpbHRlcj0idXJsKCNnbG93KSIgLz4NCiAgPHJlY3QgeD0iNSIgeT0iNSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMTAiIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2U9IiNGRjAwRkYiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWRhc2hhcnJheT0iMTAgNSIgLz4NCjwvc3ZnPg==');
      border-image-slice: 20 fill;
      border-image-width: 20px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #00FFFF !important;
      padding: 10px 15px !important;
    }
    

    .bubble-cloud::after { background: rgba(255,255,255,0.95); left: 12px; box-shadow: inset 1px 1px 0 rgba(255,255,255,0.8), -1px 1px 3px rgba(0,0,0,0.02); }
    
    /* Disable shapes for pure photo bubbles to avoid stretching weirdly */
    .only-photo::before, .only-photo::after { display: none !important; }
    
    /* Ensure only-photo is perfectly transparent and no borders */
    .mine .bubble.only-photo { background: transparent !important; box-shadow: none !important; border: none !important; padding: 4px; }
    .message-wrapper:not(.mine) .bubble.only-photo { background: transparent !important; box-shadow: none !important; border: none !important; padding: 4px; }

/* Fix borders for pseudo-elements */
    .message-wrapper:not(.mine) .bubble-cat::before, .message-wrapper:not(.mine) .bubble-cat::after,
    .message-wrapper:not(.mine) .bubble-dog::before, .message-wrapper:not(.mine) .bubble-dog::after,
    .message-wrapper:not(.mine) .bubble-cloud::before, .message-wrapper:not(.mine) 
    /* TEST BUBBLES WITH 9-SLICE BORDER-IMAGE */
    .bubble-capybara {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8IS0tIEJvZHkgLS0+DQogIDxyZWN0IHg9IjIwIiB5PSIxMCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjYwIiByeD0iMTUiIGZpbGw9IiNEMkI0OEMiIC8+DQogIA0KICA8IS0tIENhcHliYXJhIFNub3V0L0hlYWQgKExlZnQgc2lkZSkgLS0+DQogIDxwYXRoIGQ9Ik0gMzAgMTAgTCAxMCAyMCBRIDAgNDAgMTAgNzAgTCAzMCA3MCBaIiBmaWxsPSIjRDJCNDhDIiAvPg0KICA8IS0tIEVhciAtLT4NCiAgPGNpcmNsZSBjeD0iMjAiIGN5PSIxNSIgcj0iNiIgZmlsbD0iI0IwOEQ2QSIgLz4NCiAgPCEtLSBFeWUgLS0+DQogIDxsaW5lIHgxPSIxNSIgeTE9IjM1IiB4Mj0iMjIiIHkyPSIzNSIgc3Ryb2tlPSIjNEEzQjMyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8IS0tIE5vc2UvTW91dGggLS0+DQogIDxwYXRoIGQ9Ik0gNSA1MCBRIDggNTAgMTAgNTUgUSAxMiA1MCAxNSA1MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNEEzQjMyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8IS0tIEJsdXNoIC0tPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjQ1IiByPSI0IiBmaWxsPSIjRkY5OTk5IiBvcGFjaXR5PSIwLjYiIC8+DQoNCiAgPCEtLSBDYXB5YmFyYSBMaXR0bGUgRmVldCAoQm90dG9tKSAtLT4NCiAgPHJlY3QgeD0iMjUiIHk9IjY1IiB3aWR0aD0iMTAiIGhlaWdodD0iMTUiIHJ4PSI1IiBmaWxsPSIjQjA4RDZBIiAvPg0KICA8cmVjdCB4PSI4NSIgeT0iNjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxNSIgcng9IjUiIGZpbGw9IiNCMDhENkEiIC8+DQoNCiAgPCEtLSBDYXB5YmFyYSBUYWlsIChSaWdodCBzaWRlKSAtLT4NCiAgPHBhdGggZD0iTSAxMDAgNTAgUSAxMTUgNTAgMTEwIDY1IiBmaWxsPSJub25lIiBzdHJva2U9IiNEMkI0OEMiIHN0cm9rZS13aWR0aD0iMTIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgLz4NCjwvc3ZnPg==');
      border-image-slice: 20 30 20 40 fill;
      border-image-width: 20px 30px 20px 40px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #4A3B32 !important;
      padding: 5px 20px 5px 30px !important;
    }
    
    .bubble-cat-img {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8IS0tIEJvZHkgLS0+DQogIDxyZWN0IHg9IjE1IiB5PSIyMCIgd2lkdGg9IjkwIiBoZWlnaHQ9IjUwIiByeD0iMTUiIGZpbGw9IiNGRkI2QzEiIC8+DQogIA0KICA8IS0tIExlZnQgRWFyIC0tPg0KICA8cG9seWdvbiBwb2ludHM9IjE1LDMwIDI1LDUgMzUsMjAiIGZpbGw9IiNGRkI2QzEiIC8+DQogIDwhLS0gSW5uZXIgTGVmdCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iMjAsMjUgMjUsMTIgMzAsMjAiIGZpbGw9IiNGRjk5QTgiIC8+DQogIA0KICA8IS0tIFJpZ2h0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSI4NSwyMCA5NSw1IDEwNSwzMCIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPCEtLSBJbm5lciBSaWdodCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iOTAsMjAgOTUsMTIgMTAwLDI1IiBmaWxsPSIjRkY5OUE4IiAvPg0KDQogIDwhLS0gQ2F0IFRhaWwgKFJpZ2h0IHNpZGUpIC0tPg0KICA8cGF0aCBkPSJNIDEwMCA2MCBRIDExNSA2MCAxMTUgNDAgUSAxMTUgMzAgMTEwIDI1IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkI2QzEiIHN0cm9rZS13aWR0aD0iOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPg0KDQogIDwhLS0gQ3V0ZSBDYXQgRmFjZSAoTGVmdCBTaWRlKSAtLT4NCiAgPGNpcmNsZSBjeD0iMjUiIGN5PSI0NSIgcj0iMi41IiBmaWxsPSIjNDQ0IiAvPg0KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjQ1IiByPSIyLjUiIGZpbGw9IiM0NDQiIC8+DQogIDxwYXRoIGQ9Ik0gMzAgNDggUSAzMi41IDUyIDM1IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiM0NDQiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4NCiAgPGNpcmNsZSBjeD0iMjAiIGN5PSI1MCIgcj0iMyIgZmlsbD0iI0ZGNkI4MSIgb3BhY2l0eT0iMC42IiAvPg0KICA8Y2lyY2xlIGN4PSI0NSIgY3k9IjUwIiByPSIzIiBmaWxsPSIjRkY2QjgxIiBvcGFjaXR5PSIwLjYiIC8+DQogIA0KICA8IS0tIFBhd3MgKEJvdHRvbSBsZWZ0KSAtLT4NCiAgPGNpcmNsZSBjeD0iMjUiIGN5PSI3MCIgcj0iNiIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPGNpcmNsZSBjeD0iNDAiIGN5PSI3MCIgcj0iNiIgZmlsbD0iI0ZGQjZDMSIgLz4NCjwvc3ZnPg==');
      border-image-slice: 25 25 20 50 fill;
      border-image-width: 25px 25px 20px 50px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #333 !important;
      padding: 0px 10px 5px 40px !important;
    }

    
    /* Mine variants for directional bubbles */
    .mine .bubble-capybara {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMjAiIHk9IjEwIiB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHJ4PSIxNSIgZmlsbD0iI0QyQjQ4QyIgLz4NCiAgDQogIDwhLS0gQ2FweWJhcmEgU25vdXQvSGVhZCAoTGVmdCBzaWRlKSAtLT4NCiAgPHBhdGggZD0iTSAzMCAxMCBMIDEwIDIwIFEgMCA0MCAxMCA3MCBMIDMwIDcwIFoiIGZpbGw9IiNEMkI0OEMiIC8+DQogIDwhLS0gRWFyIC0tPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjE1IiByPSI2IiBmaWxsPSIjQjA4RDZBIiAvPg0KICA8IS0tIEV5ZSAtLT4NCiAgPGxpbmUgeDE9IjE1IiB5MT0iMzUiIHgyPSIyMiIgeTI9IjM1IiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gTm9zZS9Nb3V0aCAtLT4NCiAgPHBhdGggZD0iTSA1IDUwIFEgOCA1MCAxMCA1NSBRIDEyIDUwIDE1IDUwIiBmaWxsPSJub25lIiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gQmx1c2ggLS0+DQogIDxjaXJjbGUgY3g9IjIwIiBjeT0iNDUiIHI9IjQiIGZpbGw9IiNGRjk5OTkiIG9wYWNpdHk9IjAuNiIgLz4NCg0KICA8IS0tIENhcHliYXJhIExpdHRsZSBGZWV0IChCb3R0b20pIC0tPg0KICA8cmVjdCB4PSIyNSIgeT0iNjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxNSIgcng9IjUiIGZpbGw9IiNCMDhENkEiIC8+DQogIDxyZWN0IHg9Ijg1IiB5PSI2NSIgd2lkdGg9IjEwIiBoZWlnaHQ9IjE1IiByeD0iNSIgZmlsbD0iI0IwOEQ2QSIgLz4NCg0KICA8IS0tIENhcHliYXJhIFRhaWwgKFJpZ2h0IHNpZGUpIC0tPg0KICA8cGF0aCBkPSJNIDEwMCA1MCBRIDExNSA1MCAxMTAgNjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0QyQjQ4QyIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 20 40 20 30 fill !important;
      border-image-width: 20px 40px 20px 30px !important;
      padding: 5px 30px 5px 20px !important;
    }
    
    .mine .bubble-cat-img {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMTUiIHk9IjIwIiB3aWR0aD0iOTAiIGhlaWdodD0iNTAiIHJ4PSIxNSIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgDQogIDwhLS0gTGVmdCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iMTUsMzAgMjUsNSAzNSwyMCIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPCEtLSBJbm5lciBMZWZ0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSIyMCwyNSAyNSwxMiAzMCwyMCIgZmlsbD0iI0ZGOTlBOCIgLz4NCiAgDQogIDwhLS0gUmlnaHQgRWFyIC0tPg0KICA8cG9seWdvbiBwb2ludHM9Ijg1LDIwIDk1LDUgMTA1LDMwIiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8IS0tIElubmVyIFJpZ2h0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSI5MCwyMCA5NSwxMiAxMDAsMjUiIGZpbGw9IiNGRjk5QTgiIC8+DQoNCiAgPCEtLSBDYXQgVGFpbCAoUmlnaHQgc2lkZSkgLS0+DQogIDxwYXRoIGQ9Ik0gMTAwIDYwIFEgMTE1IDYwIDExNSA0MCBRIDExNSAzMCAxMTAgMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGQjZDMSIgc3Ryb2tlLXdpZHRoPSI4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+DQoNCiAgPCEtLSBDdXRlIENhdCBGYWNlIChMZWZ0IFNpZGUpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjQ1IiByPSIyLjUiIGZpbGw9IiM0NDQiIC8+DQogIDxjaXJjbGUgY3g9IjQwIiBjeT0iNDUiIHI9IjIuNSIgZmlsbD0iIzQ0NCIgLz4NCiAgPHBhdGggZD0iTSAzMCA0OCBRIDMyLjUgNTIgMzUgNDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQ0NCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjUwIiByPSIzIiBmaWxsPSIjRkY2QjgxIiBvcGFjaXR5PSIwLjYiIC8+DQogIDxjaXJjbGUgY3g9IjQ1IiBjeT0iNTAiIHI9IjMiIGZpbGw9IiNGRjZCODEiIG9wYWNpdHk9IjAuNiIgLz4NCiAgDQogIDwhLS0gUGF3cyAoQm90dG9tIGxlZnQpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 25 50 20 25 fill !important;
      border-image-width: 25px 50px 20px 25px !important;
      padding: 0px 40px 5px 10px !important;
    }

    .bubble-neon {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiAgPGRlZnM+DQogICAgPGZpbHRlciBpZD0iZ2xvdyIgeD0iLTIwJSIgeT0iLTIwJSIgd2lkdGg9IjE0MCUiIGhlaWdodD0iMTQwJSI+DQogICAgICA8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIzIiByZXN1bHQ9ImJsdXIiIC8+DQogICAgICA8ZmVNZXJnZT4NCiAgICAgICAgPGZlTWVyZ2VOb2RlIGluPSJibHVyIiAvPg0KICAgICAgICA8ZmVNZXJnZU5vZGUgaW49ImJsdXIiIC8+DQogICAgICAgIDxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIgLz4NCiAgICAgIDwvZmVNZXJnZT4NCiAgICA8L2ZpbHRlcj4NCiAgPC9kZWZzPg0KICA8cmVjdCB4PSI1IiB5PSI1IiB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHJ4PSIxMCIgZmlsbD0iIzExMSIgc3Ryb2tlPSIjMDBGRkZGIiBzdHJva2Utd2lkdGg9IjIiIGZpbHRlcj0idXJsKCNnbG93KSIgLz4NCiAgPHJlY3QgeD0iNSIgeT0iNSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMTAiIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2U9IiNGRjAwRkYiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWRhc2hhcnJheT0iMTAgNSIgLz4NCjwvc3ZnPg==');
      border-image-slice: 20 fill;
      border-image-width: 20px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #00FFFF !important;
      padding: 10px 15px !important;
    }
    
    .mine .bubble-capybara, .mine .bubble-cat-img, .mine 
    /* Mine variants for directional bubbles */
    .mine .bubble-capybara {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMjAiIHk9IjEwIiB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHJ4PSIxNSIgZmlsbD0iI0QyQjQ4QyIgLz4NCiAgDQogIDwhLS0gQ2FweWJhcmEgU25vdXQvSGVhZCAoTGVmdCBzaWRlKSAtLT4NCiAgPHBhdGggZD0iTSAzMCAxMCBMIDEwIDIwIFEgMCA0MCAxMCA3MCBMIDMwIDcwIFoiIGZpbGw9IiNEMkI0OEMiIC8+DQogIDwhLS0gRWFyIC0tPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjE1IiByPSI2IiBmaWxsPSIjQjA4RDZBIiAvPg0KICA8IS0tIEV5ZSAtLT4NCiAgPGxpbmUgeDE9IjE1IiB5MT0iMzUiIHgyPSIyMiIgeTI9IjM1IiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gTm9zZS9Nb3V0aCAtLT4NCiAgPHBhdGggZD0iTSA1IDUwIFEgOCA1MCAxMCA1NSBRIDEyIDUwIDE1IDUwIiBmaWxsPSJub25lIiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gQmx1c2ggLS0+DQogIDxjaXJjbGUgY3g9IjIwIiBjeT0iNDUiIHI9IjQiIGZpbGw9IiNGRjk5OTkiIG9wYWNpdHk9IjAuNiIgLz4NCg0KICA8IS0tIENhcHliYXJhIExpdHRsZSBGZWV0IChCb3R0b20pIC0tPg0KICA8cmVjdCB4PSIyNSIgeT0iNjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxNSIgcng9IjUiIGZpbGw9IiNCMDhENkEiIC8+DQogIDxyZWN0IHg9Ijg1IiB5PSI2NSIgd2lkdGg9IjEwIiBoZWlnaHQ9IjE1IiByeD0iNSIgZmlsbD0iI0IwOEQ2QSIgLz4NCg0KICA8IS0tIENhcHliYXJhIFRhaWwgKFJpZ2h0IHNpZGUpIC0tPg0KICA8cGF0aCBkPSJNIDEwMCA1MCBRIDExNSA1MCAxMTAgNjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0QyQjQ4QyIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 20 40 20 30 fill !important;
      border-image-width: 20px 40px 20px 30px !important;
      padding: 5px 30px 5px 20px !important;
    }
    
    .mine .bubble-cat-img {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMTUiIHk9IjIwIiB3aWR0aD0iOTAiIGhlaWdodD0iNTAiIHJ4PSIxNSIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgDQogIDwhLS0gTGVmdCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iMTUsMzAgMjUsNSAzNSwyMCIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPCEtLSBJbm5lciBMZWZ0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSIyMCwyNSAyNSwxMiAzMCwyMCIgZmlsbD0iI0ZGOTlBOCIgLz4NCiAgDQogIDwhLS0gUmlnaHQgRWFyIC0tPg0KICA8cG9seWdvbiBwb2ludHM9Ijg1LDIwIDk1LDUgMTA1LDMwIiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8IS0tIElubmVyIFJpZ2h0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSI5MCwyMCA5NSwxMiAxMDAsMjUiIGZpbGw9IiNGRjk5QTgiIC8+DQoNCiAgPCEtLSBDYXQgVGFpbCAoUmlnaHQgc2lkZSkgLS0+DQogIDxwYXRoIGQ9Ik0gMTAwIDYwIFEgMTE1IDYwIDExNSA0MCBRIDExNSAzMCAxMTAgMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGQjZDMSIgc3Ryb2tlLXdpZHRoPSI4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+DQoNCiAgPCEtLSBDdXRlIENhdCBGYWNlIChMZWZ0IFNpZGUpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjQ1IiByPSIyLjUiIGZpbGw9IiM0NDQiIC8+DQogIDxjaXJjbGUgY3g9IjQwIiBjeT0iNDUiIHI9IjIuNSIgZmlsbD0iIzQ0NCIgLz4NCiAgPHBhdGggZD0iTSAzMCA0OCBRIDMyLjUgNTIgMzUgNDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQ0NCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjUwIiByPSIzIiBmaWxsPSIjRkY2QjgxIiBvcGFjaXR5PSIwLjYiIC8+DQogIDxjaXJjbGUgY3g9IjQ1IiBjeT0iNTAiIHI9IjMiIGZpbGw9IiNGRjZCODEiIG9wYWNpdHk9IjAuNiIgLz4NCiAgDQogIDwhLS0gUGF3cyAoQm90dG9tIGxlZnQpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 25 50 20 25 fill !important;
      border-image-width: 25px 50px 20px 25px !important;
      padding: 0px 40px 5px 10px !important;
    }

    .bubble-neon {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiAgPGRlZnM+DQogICAgPGZpbHRlciBpZD0iZ2xvdyIgeD0iLTIwJSIgeT0iLTIwJSIgd2lkdGg9IjE0MCUiIGhlaWdodD0iMTQwJSI+DQogICAgICA8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIzIiByZXN1bHQ9ImJsdXIiIC8+DQogICAgICA8ZmVNZXJnZT4NCiAgICAgICAgPGZlTWVyZ2VOb2RlIGluPSJibHVyIiAvPg0KICAgICAgICA8ZmVNZXJnZU5vZGUgaW49ImJsdXIiIC8+DQogICAgICAgIDxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIgLz4NCiAgICAgIDwvZmVNZXJnZT4NCiAgICA8L2ZpbHRlcj4NCiAgPC9kZWZzPg0KICA8cmVjdCB4PSI1IiB5PSI1IiB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHJ4PSIxMCIgZmlsbD0iIzExMSIgc3Ryb2tlPSIjMDBGRkZGIiBzdHJva2Utd2lkdGg9IjIiIGZpbHRlcj0idXJsKCNnbG93KSIgLz4NCiAgPHJlY3QgeD0iNSIgeT0iNSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMTAiIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2U9IiNGRjAwRkYiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWRhc2hhcnJheT0iMTAgNSIgLz4NCjwvc3ZnPg==');
      border-image-slice: 20 fill;
      border-image-width: 20px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #00FFFF !important;
      padding: 10px 15px !important;
    }
    

    .bubble-cloud::after {
        border: none;
    }

    /* Modo Oscuro Night Owl */
    :host-context(.night-owl-mode) .mine .bubble-cat::before, :host-context(.night-owl-mode) .mine .bubble-cat::after,
    :host-context(.night-owl-mode) .mine .bubble-dog::before, :host-context(.night-owl-mode) .mine .bubble-dog::after,
    :host-context(.night-owl-mode) .mine .bubble-cloud::before, :host-context(.night-owl-mode) .mine 
    /* TEST BUBBLES WITH 9-SLICE BORDER-IMAGE */
    .bubble-capybara {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8IS0tIEJvZHkgLS0+DQogIDxyZWN0IHg9IjIwIiB5PSIxMCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjYwIiByeD0iMTUiIGZpbGw9IiNEMkI0OEMiIC8+DQogIA0KICA8IS0tIENhcHliYXJhIFNub3V0L0hlYWQgKExlZnQgc2lkZSkgLS0+DQogIDxwYXRoIGQ9Ik0gMzAgMTAgTCAxMCAyMCBRIDAgNDAgMTAgNzAgTCAzMCA3MCBaIiBmaWxsPSIjRDJCNDhDIiAvPg0KICA8IS0tIEVhciAtLT4NCiAgPGNpcmNsZSBjeD0iMjAiIGN5PSIxNSIgcj0iNiIgZmlsbD0iI0IwOEQ2QSIgLz4NCiAgPCEtLSBFeWUgLS0+DQogIDxsaW5lIHgxPSIxNSIgeTE9IjM1IiB4Mj0iMjIiIHkyPSIzNSIgc3Ryb2tlPSIjNEEzQjMyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8IS0tIE5vc2UvTW91dGggLS0+DQogIDxwYXRoIGQ9Ik0gNSA1MCBRIDggNTAgMTAgNTUgUSAxMiA1MCAxNSA1MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNEEzQjMyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8IS0tIEJsdXNoIC0tPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjQ1IiByPSI0IiBmaWxsPSIjRkY5OTk5IiBvcGFjaXR5PSIwLjYiIC8+DQoNCiAgPCEtLSBDYXB5YmFyYSBMaXR0bGUgRmVldCAoQm90dG9tKSAtLT4NCiAgPHJlY3QgeD0iMjUiIHk9IjY1IiB3aWR0aD0iMTAiIGhlaWdodD0iMTUiIHJ4PSI1IiBmaWxsPSIjQjA4RDZBIiAvPg0KICA8cmVjdCB4PSI4NSIgeT0iNjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxNSIgcng9IjUiIGZpbGw9IiNCMDhENkEiIC8+DQoNCiAgPCEtLSBDYXB5YmFyYSBUYWlsIChSaWdodCBzaWRlKSAtLT4NCiAgPHBhdGggZD0iTSAxMDAgNTAgUSAxMTUgNTAgMTEwIDY1IiBmaWxsPSJub25lIiBzdHJva2U9IiNEMkI0OEMiIHN0cm9rZS13aWR0aD0iMTIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgLz4NCjwvc3ZnPg==');
      border-image-slice: 20 30 20 40 fill;
      border-image-width: 20px 30px 20px 40px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #4A3B32 !important;
      padding: 5px 20px 5px 30px !important;
    }
    
    .bubble-cat-img {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8IS0tIEJvZHkgLS0+DQogIDxyZWN0IHg9IjE1IiB5PSIyMCIgd2lkdGg9IjkwIiBoZWlnaHQ9IjUwIiByeD0iMTUiIGZpbGw9IiNGRkI2QzEiIC8+DQogIA0KICA8IS0tIExlZnQgRWFyIC0tPg0KICA8cG9seWdvbiBwb2ludHM9IjE1LDMwIDI1LDUgMzUsMjAiIGZpbGw9IiNGRkI2QzEiIC8+DQogIDwhLS0gSW5uZXIgTGVmdCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iMjAsMjUgMjUsMTIgMzAsMjAiIGZpbGw9IiNGRjk5QTgiIC8+DQogIA0KICA8IS0tIFJpZ2h0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSI4NSwyMCA5NSw1IDEwNSwzMCIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPCEtLSBJbm5lciBSaWdodCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iOTAsMjAgOTUsMTIgMTAwLDI1IiBmaWxsPSIjRkY5OUE4IiAvPg0KDQogIDwhLS0gQ2F0IFRhaWwgKFJpZ2h0IHNpZGUpIC0tPg0KICA8cGF0aCBkPSJNIDEwMCA2MCBRIDExNSA2MCAxMTUgNDAgUSAxMTUgMzAgMTEwIDI1IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkI2QzEiIHN0cm9rZS13aWR0aD0iOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPg0KDQogIDwhLS0gQ3V0ZSBDYXQgRmFjZSAoTGVmdCBTaWRlKSAtLT4NCiAgPGNpcmNsZSBjeD0iMjUiIGN5PSI0NSIgcj0iMi41IiBmaWxsPSIjNDQ0IiAvPg0KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjQ1IiByPSIyLjUiIGZpbGw9IiM0NDQiIC8+DQogIDxwYXRoIGQ9Ik0gMzAgNDggUSAzMi41IDUyIDM1IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiM0NDQiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4NCiAgPGNpcmNsZSBjeD0iMjAiIGN5PSI1MCIgcj0iMyIgZmlsbD0iI0ZGNkI4MSIgb3BhY2l0eT0iMC42IiAvPg0KICA8Y2lyY2xlIGN4PSI0NSIgY3k9IjUwIiByPSIzIiBmaWxsPSIjRkY2QjgxIiBvcGFjaXR5PSIwLjYiIC8+DQogIA0KICA8IS0tIFBhd3MgKEJvdHRvbSBsZWZ0KSAtLT4NCiAgPGNpcmNsZSBjeD0iMjUiIGN5PSI3MCIgcj0iNiIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPGNpcmNsZSBjeD0iNDAiIGN5PSI3MCIgcj0iNiIgZmlsbD0iI0ZGQjZDMSIgLz4NCjwvc3ZnPg==');
      border-image-slice: 25 25 20 50 fill;
      border-image-width: 25px 25px 20px 50px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #333 !important;
      padding: 0px 10px 5px 40px !important;
    }

    
    /* Mine variants for directional bubbles */
    .mine .bubble-capybara {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMjAiIHk9IjEwIiB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHJ4PSIxNSIgZmlsbD0iI0QyQjQ4QyIgLz4NCiAgDQogIDwhLS0gQ2FweWJhcmEgU25vdXQvSGVhZCAoTGVmdCBzaWRlKSAtLT4NCiAgPHBhdGggZD0iTSAzMCAxMCBMIDEwIDIwIFEgMCA0MCAxMCA3MCBMIDMwIDcwIFoiIGZpbGw9IiNEMkI0OEMiIC8+DQogIDwhLS0gRWFyIC0tPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjE1IiByPSI2IiBmaWxsPSIjQjA4RDZBIiAvPg0KICA8IS0tIEV5ZSAtLT4NCiAgPGxpbmUgeDE9IjE1IiB5MT0iMzUiIHgyPSIyMiIgeTI9IjM1IiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gTm9zZS9Nb3V0aCAtLT4NCiAgPHBhdGggZD0iTSA1IDUwIFEgOCA1MCAxMCA1NSBRIDEyIDUwIDE1IDUwIiBmaWxsPSJub25lIiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gQmx1c2ggLS0+DQogIDxjaXJjbGUgY3g9IjIwIiBjeT0iNDUiIHI9IjQiIGZpbGw9IiNGRjk5OTkiIG9wYWNpdHk9IjAuNiIgLz4NCg0KICA8IS0tIENhcHliYXJhIExpdHRsZSBGZWV0IChCb3R0b20pIC0tPg0KICA8cmVjdCB4PSIyNSIgeT0iNjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxNSIgcng9IjUiIGZpbGw9IiNCMDhENkEiIC8+DQogIDxyZWN0IHg9Ijg1IiB5PSI2NSIgd2lkdGg9IjEwIiBoZWlnaHQ9IjE1IiByeD0iNSIgZmlsbD0iI0IwOEQ2QSIgLz4NCg0KICA8IS0tIENhcHliYXJhIFRhaWwgKFJpZ2h0IHNpZGUpIC0tPg0KICA8cGF0aCBkPSJNIDEwMCA1MCBRIDExNSA1MCAxMTAgNjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0QyQjQ4QyIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 20 40 20 30 fill !important;
      border-image-width: 20px 40px 20px 30px !important;
      padding: 5px 30px 5px 20px !important;
    }
    
    .mine .bubble-cat-img {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMTUiIHk9IjIwIiB3aWR0aD0iOTAiIGhlaWdodD0iNTAiIHJ4PSIxNSIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgDQogIDwhLS0gTGVmdCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iMTUsMzAgMjUsNSAzNSwyMCIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPCEtLSBJbm5lciBMZWZ0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSIyMCwyNSAyNSwxMiAzMCwyMCIgZmlsbD0iI0ZGOTlBOCIgLz4NCiAgDQogIDwhLS0gUmlnaHQgRWFyIC0tPg0KICA8cG9seWdvbiBwb2ludHM9Ijg1LDIwIDk1LDUgMTA1LDMwIiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8IS0tIElubmVyIFJpZ2h0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSI5MCwyMCA5NSwxMiAxMDAsMjUiIGZpbGw9IiNGRjk5QTgiIC8+DQoNCiAgPCEtLSBDYXQgVGFpbCAoUmlnaHQgc2lkZSkgLS0+DQogIDxwYXRoIGQ9Ik0gMTAwIDYwIFEgMTE1IDYwIDExNSA0MCBRIDExNSAzMCAxMTAgMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGQjZDMSIgc3Ryb2tlLXdpZHRoPSI4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+DQoNCiAgPCEtLSBDdXRlIENhdCBGYWNlIChMZWZ0IFNpZGUpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjQ1IiByPSIyLjUiIGZpbGw9IiM0NDQiIC8+DQogIDxjaXJjbGUgY3g9IjQwIiBjeT0iNDUiIHI9IjIuNSIgZmlsbD0iIzQ0NCIgLz4NCiAgPHBhdGggZD0iTSAzMCA0OCBRIDMyLjUgNTIgMzUgNDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQ0NCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjUwIiByPSIzIiBmaWxsPSIjRkY2QjgxIiBvcGFjaXR5PSIwLjYiIC8+DQogIDxjaXJjbGUgY3g9IjQ1IiBjeT0iNTAiIHI9IjMiIGZpbGw9IiNGRjZCODEiIG9wYWNpdHk9IjAuNiIgLz4NCiAgDQogIDwhLS0gUGF3cyAoQm90dG9tIGxlZnQpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 25 50 20 25 fill !important;
      border-image-width: 25px 50px 20px 25px !important;
      padding: 0px 40px 5px 10px !important;
    }

    .bubble-neon {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiAgPGRlZnM+DQogICAgPGZpbHRlciBpZD0iZ2xvdyIgeD0iLTIwJSIgeT0iLTIwJSIgd2lkdGg9IjE0MCUiIGhlaWdodD0iMTQwJSI+DQogICAgICA8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIzIiByZXN1bHQ9ImJsdXIiIC8+DQogICAgICA8ZmVNZXJnZT4NCiAgICAgICAgPGZlTWVyZ2VOb2RlIGluPSJibHVyIiAvPg0KICAgICAgICA8ZmVNZXJnZU5vZGUgaW49ImJsdXIiIC8+DQogICAgICAgIDxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIgLz4NCiAgICAgIDwvZmVNZXJnZT4NCiAgICA8L2ZpbHRlcj4NCiAgPC9kZWZzPg0KICA8cmVjdCB4PSI1IiB5PSI1IiB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHJ4PSIxMCIgZmlsbD0iIzExMSIgc3Ryb2tlPSIjMDBGRkZGIiBzdHJva2Utd2lkdGg9IjIiIGZpbHRlcj0idXJsKCNnbG93KSIgLz4NCiAgPHJlY3QgeD0iNSIgeT0iNSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMTAiIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2U9IiNGRjAwRkYiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWRhc2hhcnJheT0iMTAgNSIgLz4NCjwvc3ZnPg==');
      border-image-slice: 20 fill;
      border-image-width: 20px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #00FFFF !important;
      padding: 10px 15px !important;
    }
    
    .mine .bubble-capybara, .mine .bubble-cat-img, .mine 
    /* Mine variants for directional bubbles */
    .mine .bubble-capybara {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMjAiIHk9IjEwIiB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHJ4PSIxNSIgZmlsbD0iI0QyQjQ4QyIgLz4NCiAgDQogIDwhLS0gQ2FweWJhcmEgU25vdXQvSGVhZCAoTGVmdCBzaWRlKSAtLT4NCiAgPHBhdGggZD0iTSAzMCAxMCBMIDEwIDIwIFEgMCA0MCAxMCA3MCBMIDMwIDcwIFoiIGZpbGw9IiNEMkI0OEMiIC8+DQogIDwhLS0gRWFyIC0tPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjE1IiByPSI2IiBmaWxsPSIjQjA4RDZBIiAvPg0KICA8IS0tIEV5ZSAtLT4NCiAgPGxpbmUgeDE9IjE1IiB5MT0iMzUiIHgyPSIyMiIgeTI9IjM1IiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gTm9zZS9Nb3V0aCAtLT4NCiAgPHBhdGggZD0iTSA1IDUwIFEgOCA1MCAxMCA1NSBRIDEyIDUwIDE1IDUwIiBmaWxsPSJub25lIiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gQmx1c2ggLS0+DQogIDxjaXJjbGUgY3g9IjIwIiBjeT0iNDUiIHI9IjQiIGZpbGw9IiNGRjk5OTkiIG9wYWNpdHk9IjAuNiIgLz4NCg0KICA8IS0tIENhcHliYXJhIExpdHRsZSBGZWV0IChCb3R0b20pIC0tPg0KICA8cmVjdCB4PSIyNSIgeT0iNjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxNSIgcng9IjUiIGZpbGw9IiNCMDhENkEiIC8+DQogIDxyZWN0IHg9Ijg1IiB5PSI2NSIgd2lkdGg9IjEwIiBoZWlnaHQ9IjE1IiByeD0iNSIgZmlsbD0iI0IwOEQ2QSIgLz4NCg0KICA8IS0tIENhcHliYXJhIFRhaWwgKFJpZ2h0IHNpZGUpIC0tPg0KICA8cGF0aCBkPSJNIDEwMCA1MCBRIDExNSA1MCAxMTAgNjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0QyQjQ4QyIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 20 40 20 30 fill !important;
      border-image-width: 20px 40px 20px 30px !important;
      padding: 5px 30px 5px 20px !important;
    }
    
    .mine .bubble-cat-img {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMTUiIHk9IjIwIiB3aWR0aD0iOTAiIGhlaWdodD0iNTAiIHJ4PSIxNSIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgDQogIDwhLS0gTGVmdCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iMTUsMzAgMjUsNSAzNSwyMCIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPCEtLSBJbm5lciBMZWZ0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSIyMCwyNSAyNSwxMiAzMCwyMCIgZmlsbD0iI0ZGOTlBOCIgLz4NCiAgDQogIDwhLS0gUmlnaHQgRWFyIC0tPg0KICA8cG9seWdvbiBwb2ludHM9Ijg1LDIwIDk1LDUgMTA1LDMwIiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8IS0tIElubmVyIFJpZ2h0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSI5MCwyMCA5NSwxMiAxMDAsMjUiIGZpbGw9IiNGRjk5QTgiIC8+DQoNCiAgPCEtLSBDYXQgVGFpbCAoUmlnaHQgc2lkZSkgLS0+DQogIDxwYXRoIGQ9Ik0gMTAwIDYwIFEgMTE1IDYwIDExNSA0MCBRIDExNSAzMCAxMTAgMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGQjZDMSIgc3Ryb2tlLXdpZHRoPSI4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+DQoNCiAgPCEtLSBDdXRlIENhdCBGYWNlIChMZWZ0IFNpZGUpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjQ1IiByPSIyLjUiIGZpbGw9IiM0NDQiIC8+DQogIDxjaXJjbGUgY3g9IjQwIiBjeT0iNDUiIHI9IjIuNSIgZmlsbD0iIzQ0NCIgLz4NCiAgPHBhdGggZD0iTSAzMCA0OCBRIDMyLjUgNTIgMzUgNDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQ0NCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjUwIiByPSIzIiBmaWxsPSIjRkY2QjgxIiBvcGFjaXR5PSIwLjYiIC8+DQogIDxjaXJjbGUgY3g9IjQ1IiBjeT0iNTAiIHI9IjMiIGZpbGw9IiNGRjZCODEiIG9wYWNpdHk9IjAuNiIgLz4NCiAgDQogIDwhLS0gUGF3cyAoQm90dG9tIGxlZnQpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 25 50 20 25 fill !important;
      border-image-width: 25px 50px 20px 25px !important;
      padding: 0px 40px 5px 10px !important;
    }

    .bubble-neon {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiAgPGRlZnM+DQogICAgPGZpbHRlciBpZD0iZ2xvdyIgeD0iLTIwJSIgeT0iLTIwJSIgd2lkdGg9IjE0MCUiIGhlaWdodD0iMTQwJSI+DQogICAgICA8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIzIiByZXN1bHQ9ImJsdXIiIC8+DQogICAgICA8ZmVNZXJnZT4NCiAgICAgICAgPGZlTWVyZ2VOb2RlIGluPSJibHVyIiAvPg0KICAgICAgICA8ZmVNZXJnZU5vZGUgaW49ImJsdXIiIC8+DQogICAgICAgIDxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIgLz4NCiAgICAgIDwvZmVNZXJnZT4NCiAgICA8L2ZpbHRlcj4NCiAgPC9kZWZzPg0KICA8cmVjdCB4PSI1IiB5PSI1IiB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHJ4PSIxMCIgZmlsbD0iIzExMSIgc3Ryb2tlPSIjMDBGRkZGIiBzdHJva2Utd2lkdGg9IjIiIGZpbHRlcj0idXJsKCNnbG93KSIgLz4NCiAgPHJlY3QgeD0iNSIgeT0iNSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMTAiIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2U9IiNGRjAwRkYiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWRhc2hhcnJheT0iMTAgNSIgLz4NCjwvc3ZnPg==');
      border-image-slice: 20 fill;
      border-image-width: 20px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #00FFFF !important;
      padding: 10px 15px !important;
    }
    

    .bubble-cloud::after {
        background: linear-gradient(135deg, #8b5cf6, #6d28d9); box-shadow: none; border: none;
    }
    :host-context(.night-owl-mode) .message-wrapper:not(.mine) .bubble-cat::before, :host-context(.night-owl-mode) .message-wrapper:not(.mine) .bubble-cat::after,
    :host-context(.night-owl-mode) .message-wrapper:not(.mine) .bubble-dog::before, :host-context(.night-owl-mode) .message-wrapper:not(.mine) .bubble-dog::after,
    :host-context(.night-owl-mode) .message-wrapper:not(.mine) .bubble-cloud::before, :host-context(.night-owl-mode) .message-wrapper:not(.mine) 
    /* TEST BUBBLES WITH 9-SLICE BORDER-IMAGE */
    .bubble-capybara {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8IS0tIEJvZHkgLS0+DQogIDxyZWN0IHg9IjIwIiB5PSIxMCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjYwIiByeD0iMTUiIGZpbGw9IiNEMkI0OEMiIC8+DQogIA0KICA8IS0tIENhcHliYXJhIFNub3V0L0hlYWQgKExlZnQgc2lkZSkgLS0+DQogIDxwYXRoIGQ9Ik0gMzAgMTAgTCAxMCAyMCBRIDAgNDAgMTAgNzAgTCAzMCA3MCBaIiBmaWxsPSIjRDJCNDhDIiAvPg0KICA8IS0tIEVhciAtLT4NCiAgPGNpcmNsZSBjeD0iMjAiIGN5PSIxNSIgcj0iNiIgZmlsbD0iI0IwOEQ2QSIgLz4NCiAgPCEtLSBFeWUgLS0+DQogIDxsaW5lIHgxPSIxNSIgeTE9IjM1IiB4Mj0iMjIiIHkyPSIzNSIgc3Ryb2tlPSIjNEEzQjMyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8IS0tIE5vc2UvTW91dGggLS0+DQogIDxwYXRoIGQ9Ik0gNSA1MCBRIDggNTAgMTAgNTUgUSAxMiA1MCAxNSA1MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNEEzQjMyIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8IS0tIEJsdXNoIC0tPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjQ1IiByPSI0IiBmaWxsPSIjRkY5OTk5IiBvcGFjaXR5PSIwLjYiIC8+DQoNCiAgPCEtLSBDYXB5YmFyYSBMaXR0bGUgRmVldCAoQm90dG9tKSAtLT4NCiAgPHJlY3QgeD0iMjUiIHk9IjY1IiB3aWR0aD0iMTAiIGhlaWdodD0iMTUiIHJ4PSI1IiBmaWxsPSIjQjA4RDZBIiAvPg0KICA8cmVjdCB4PSI4NSIgeT0iNjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxNSIgcng9IjUiIGZpbGw9IiNCMDhENkEiIC8+DQoNCiAgPCEtLSBDYXB5YmFyYSBUYWlsIChSaWdodCBzaWRlKSAtLT4NCiAgPHBhdGggZD0iTSAxMDAgNTAgUSAxMTUgNTAgMTEwIDY1IiBmaWxsPSJub25lIiBzdHJva2U9IiNEMkI0OEMiIHN0cm9rZS13aWR0aD0iMTIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgLz4NCjwvc3ZnPg==');
      border-image-slice: 20 30 20 40 fill;
      border-image-width: 20px 30px 20px 40px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #4A3B32 !important;
      padding: 5px 20px 5px 30px !important;
    }
    
    .bubble-cat-img {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8IS0tIEJvZHkgLS0+DQogIDxyZWN0IHg9IjE1IiB5PSIyMCIgd2lkdGg9IjkwIiBoZWlnaHQ9IjUwIiByeD0iMTUiIGZpbGw9IiNGRkI2QzEiIC8+DQogIA0KICA8IS0tIExlZnQgRWFyIC0tPg0KICA8cG9seWdvbiBwb2ludHM9IjE1LDMwIDI1LDUgMzUsMjAiIGZpbGw9IiNGRkI2QzEiIC8+DQogIDwhLS0gSW5uZXIgTGVmdCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iMjAsMjUgMjUsMTIgMzAsMjAiIGZpbGw9IiNGRjk5QTgiIC8+DQogIA0KICA8IS0tIFJpZ2h0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSI4NSwyMCA5NSw1IDEwNSwzMCIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPCEtLSBJbm5lciBSaWdodCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iOTAsMjAgOTUsMTIgMTAwLDI1IiBmaWxsPSIjRkY5OUE4IiAvPg0KDQogIDwhLS0gQ2F0IFRhaWwgKFJpZ2h0IHNpZGUpIC0tPg0KICA8cGF0aCBkPSJNIDEwMCA2MCBRIDExNSA2MCAxMTUgNDAgUSAxMTUgMzAgMTEwIDI1IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkI2QzEiIHN0cm9rZS13aWR0aD0iOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPg0KDQogIDwhLS0gQ3V0ZSBDYXQgRmFjZSAoTGVmdCBTaWRlKSAtLT4NCiAgPGNpcmNsZSBjeD0iMjUiIGN5PSI0NSIgcj0iMi41IiBmaWxsPSIjNDQ0IiAvPg0KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjQ1IiByPSIyLjUiIGZpbGw9IiM0NDQiIC8+DQogIDxwYXRoIGQ9Ik0gMzAgNDggUSAzMi41IDUyIDM1IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiM0NDQiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4NCiAgPGNpcmNsZSBjeD0iMjAiIGN5PSI1MCIgcj0iMyIgZmlsbD0iI0ZGNkI4MSIgb3BhY2l0eT0iMC42IiAvPg0KICA8Y2lyY2xlIGN4PSI0NSIgY3k9IjUwIiByPSIzIiBmaWxsPSIjRkY2QjgxIiBvcGFjaXR5PSIwLjYiIC8+DQogIA0KICA8IS0tIFBhd3MgKEJvdHRvbSBsZWZ0KSAtLT4NCiAgPGNpcmNsZSBjeD0iMjUiIGN5PSI3MCIgcj0iNiIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPGNpcmNsZSBjeD0iNDAiIGN5PSI3MCIgcj0iNiIgZmlsbD0iI0ZGQjZDMSIgLz4NCjwvc3ZnPg==');
      border-image-slice: 25 25 20 50 fill;
      border-image-width: 25px 25px 20px 50px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #333 !important;
      padding: 0px 10px 5px 40px !important;
    }

    
    /* Mine variants for directional bubbles */
    .mine .bubble-capybara {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMjAiIHk9IjEwIiB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHJ4PSIxNSIgZmlsbD0iI0QyQjQ4QyIgLz4NCiAgDQogIDwhLS0gQ2FweWJhcmEgU25vdXQvSGVhZCAoTGVmdCBzaWRlKSAtLT4NCiAgPHBhdGggZD0iTSAzMCAxMCBMIDEwIDIwIFEgMCA0MCAxMCA3MCBMIDMwIDcwIFoiIGZpbGw9IiNEMkI0OEMiIC8+DQogIDwhLS0gRWFyIC0tPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjE1IiByPSI2IiBmaWxsPSIjQjA4RDZBIiAvPg0KICA8IS0tIEV5ZSAtLT4NCiAgPGxpbmUgeDE9IjE1IiB5MT0iMzUiIHgyPSIyMiIgeTI9IjM1IiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gTm9zZS9Nb3V0aCAtLT4NCiAgPHBhdGggZD0iTSA1IDUwIFEgOCA1MCAxMCA1NSBRIDEyIDUwIDE1IDUwIiBmaWxsPSJub25lIiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gQmx1c2ggLS0+DQogIDxjaXJjbGUgY3g9IjIwIiBjeT0iNDUiIHI9IjQiIGZpbGw9IiNGRjk5OTkiIG9wYWNpdHk9IjAuNiIgLz4NCg0KICA8IS0tIENhcHliYXJhIExpdHRsZSBGZWV0IChCb3R0b20pIC0tPg0KICA8cmVjdCB4PSIyNSIgeT0iNjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxNSIgcng9IjUiIGZpbGw9IiNCMDhENkEiIC8+DQogIDxyZWN0IHg9Ijg1IiB5PSI2NSIgd2lkdGg9IjEwIiBoZWlnaHQ9IjE1IiByeD0iNSIgZmlsbD0iI0IwOEQ2QSIgLz4NCg0KICA8IS0tIENhcHliYXJhIFRhaWwgKFJpZ2h0IHNpZGUpIC0tPg0KICA8cGF0aCBkPSJNIDEwMCA1MCBRIDExNSA1MCAxMTAgNjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0QyQjQ4QyIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 20 40 20 30 fill !important;
      border-image-width: 20px 40px 20px 30px !important;
      padding: 5px 30px 5px 20px !important;
    }
    
    .mine .bubble-cat-img {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMTUiIHk9IjIwIiB3aWR0aD0iOTAiIGhlaWdodD0iNTAiIHJ4PSIxNSIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgDQogIDwhLS0gTGVmdCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iMTUsMzAgMjUsNSAzNSwyMCIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPCEtLSBJbm5lciBMZWZ0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSIyMCwyNSAyNSwxMiAzMCwyMCIgZmlsbD0iI0ZGOTlBOCIgLz4NCiAgDQogIDwhLS0gUmlnaHQgRWFyIC0tPg0KICA8cG9seWdvbiBwb2ludHM9Ijg1LDIwIDk1LDUgMTA1LDMwIiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8IS0tIElubmVyIFJpZ2h0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSI5MCwyMCA5NSwxMiAxMDAsMjUiIGZpbGw9IiNGRjk5QTgiIC8+DQoNCiAgPCEtLSBDYXQgVGFpbCAoUmlnaHQgc2lkZSkgLS0+DQogIDxwYXRoIGQ9Ik0gMTAwIDYwIFEgMTE1IDYwIDExNSA0MCBRIDExNSAzMCAxMTAgMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGQjZDMSIgc3Ryb2tlLXdpZHRoPSI4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+DQoNCiAgPCEtLSBDdXRlIENhdCBGYWNlIChMZWZ0IFNpZGUpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjQ1IiByPSIyLjUiIGZpbGw9IiM0NDQiIC8+DQogIDxjaXJjbGUgY3g9IjQwIiBjeT0iNDUiIHI9IjIuNSIgZmlsbD0iIzQ0NCIgLz4NCiAgPHBhdGggZD0iTSAzMCA0OCBRIDMyLjUgNTIgMzUgNDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQ0NCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjUwIiByPSIzIiBmaWxsPSIjRkY2QjgxIiBvcGFjaXR5PSIwLjYiIC8+DQogIDxjaXJjbGUgY3g9IjQ1IiBjeT0iNTAiIHI9IjMiIGZpbGw9IiNGRjZCODEiIG9wYWNpdHk9IjAuNiIgLz4NCiAgDQogIDwhLS0gUGF3cyAoQm90dG9tIGxlZnQpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 25 50 20 25 fill !important;
      border-image-width: 25px 50px 20px 25px !important;
      padding: 0px 40px 5px 10px !important;
    }

    .bubble-neon {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiAgPGRlZnM+DQogICAgPGZpbHRlciBpZD0iZ2xvdyIgeD0iLTIwJSIgeT0iLTIwJSIgd2lkdGg9IjE0MCUiIGhlaWdodD0iMTQwJSI+DQogICAgICA8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIzIiByZXN1bHQ9ImJsdXIiIC8+DQogICAgICA8ZmVNZXJnZT4NCiAgICAgICAgPGZlTWVyZ2VOb2RlIGluPSJibHVyIiAvPg0KICAgICAgICA8ZmVNZXJnZU5vZGUgaW49ImJsdXIiIC8+DQogICAgICAgIDxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIgLz4NCiAgICAgIDwvZmVNZXJnZT4NCiAgICA8L2ZpbHRlcj4NCiAgPC9kZWZzPg0KICA8cmVjdCB4PSI1IiB5PSI1IiB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHJ4PSIxMCIgZmlsbD0iIzExMSIgc3Ryb2tlPSIjMDBGRkZGIiBzdHJva2Utd2lkdGg9IjIiIGZpbHRlcj0idXJsKCNnbG93KSIgLz4NCiAgPHJlY3QgeD0iNSIgeT0iNSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMTAiIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2U9IiNGRjAwRkYiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWRhc2hhcnJheT0iMTAgNSIgLz4NCjwvc3ZnPg==');
      border-image-slice: 20 fill;
      border-image-width: 20px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #00FFFF !important;
      padding: 10px 15px !important;
    }
    
    .mine .bubble-capybara, .mine .bubble-cat-img, .mine 
    /* Mine variants for directional bubbles */
    .mine .bubble-capybara {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMjAiIHk9IjEwIiB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHJ4PSIxNSIgZmlsbD0iI0QyQjQ4QyIgLz4NCiAgDQogIDwhLS0gQ2FweWJhcmEgU25vdXQvSGVhZCAoTGVmdCBzaWRlKSAtLT4NCiAgPHBhdGggZD0iTSAzMCAxMCBMIDEwIDIwIFEgMCA0MCAxMCA3MCBMIDMwIDcwIFoiIGZpbGw9IiNEMkI0OEMiIC8+DQogIDwhLS0gRWFyIC0tPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjE1IiByPSI2IiBmaWxsPSIjQjA4RDZBIiAvPg0KICA8IS0tIEV5ZSAtLT4NCiAgPGxpbmUgeDE9IjE1IiB5MT0iMzUiIHgyPSIyMiIgeTI9IjM1IiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gTm9zZS9Nb3V0aCAtLT4NCiAgPHBhdGggZD0iTSA1IDUwIFEgOCA1MCAxMCA1NSBRIDEyIDUwIDE1IDUwIiBmaWxsPSJub25lIiBzdHJva2U9IiM0QTNCMzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDwhLS0gQmx1c2ggLS0+DQogIDxjaXJjbGUgY3g9IjIwIiBjeT0iNDUiIHI9IjQiIGZpbGw9IiNGRjk5OTkiIG9wYWNpdHk9IjAuNiIgLz4NCg0KICA8IS0tIENhcHliYXJhIExpdHRsZSBGZWV0IChCb3R0b20pIC0tPg0KICA8cmVjdCB4PSIyNSIgeT0iNjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxNSIgcng9IjUiIGZpbGw9IiNCMDhENkEiIC8+DQogIDxyZWN0IHg9Ijg1IiB5PSI2NSIgd2lkdGg9IjEwIiBoZWlnaHQ9IjE1IiByeD0iNSIgZmlsbD0iI0IwOEQ2QSIgLz4NCg0KICA8IS0tIENhcHliYXJhIFRhaWwgKFJpZ2h0IHNpZGUpIC0tPg0KICA8cGF0aCBkPSJNIDEwMCA1MCBRIDExNSA1MCAxMTAgNjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0QyQjQ4QyIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 20 40 20 30 fill !important;
      border-image-width: 20px 40px 20px 30px !important;
      padding: 5px 30px 5px 20px !important;
    }
    
    .mine .bubble-cat-img {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTIwLCAwKSBzY2FsZSgtMSwgMSkiPg0KDQogIDwhLS0gQm9keSAtLT4NCiAgPHJlY3QgeD0iMTUiIHk9IjIwIiB3aWR0aD0iOTAiIGhlaWdodD0iNTAiIHJ4PSIxNSIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgDQogIDwhLS0gTGVmdCBFYXIgLS0+DQogIDxwb2x5Z29uIHBvaW50cz0iMTUsMzAgMjUsNSAzNSwyMCIgZmlsbD0iI0ZGQjZDMSIgLz4NCiAgPCEtLSBJbm5lciBMZWZ0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSIyMCwyNSAyNSwxMiAzMCwyMCIgZmlsbD0iI0ZGOTlBOCIgLz4NCiAgDQogIDwhLS0gUmlnaHQgRWFyIC0tPg0KICA8cG9seWdvbiBwb2ludHM9Ijg1LDIwIDk1LDUgMTA1LDMwIiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8IS0tIElubmVyIFJpZ2h0IEVhciAtLT4NCiAgPHBvbHlnb24gcG9pbnRzPSI5MCwyMCA5NSwxMiAxMDAsMjUiIGZpbGw9IiNGRjk5QTgiIC8+DQoNCiAgPCEtLSBDYXQgVGFpbCAoUmlnaHQgc2lkZSkgLS0+DQogIDxwYXRoIGQ9Ik0gMTAwIDYwIFEgMTE1IDYwIDExNSA0MCBRIDExNSAzMCAxMTAgMjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGQjZDMSIgc3Ryb2tlLXdpZHRoPSI4IiBzdHJva2UtbGluZWNhcD0icm91bmQiIC8+DQoNCiAgPCEtLSBDdXRlIENhdCBGYWNlIChMZWZ0IFNpZGUpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjQ1IiByPSIyLjUiIGZpbGw9IiM0NDQiIC8+DQogIDxjaXJjbGUgY3g9IjQwIiBjeT0iNDUiIHI9IjIuNSIgZmlsbD0iIzQ0NCIgLz4NCiAgPHBhdGggZD0iTSAzMCA0OCBRIDMyLjUgNTIgMzUgNDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQ0NCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjUwIiByPSIzIiBmaWxsPSIjRkY2QjgxIiBvcGFjaXR5PSIwLjYiIC8+DQogIDxjaXJjbGUgY3g9IjQ1IiBjeT0iNTAiIHI9IjMiIGZpbGw9IiNGRjZCODEiIG9wYWNpdHk9IjAuNiIgLz4NCiAgDQogIDwhLS0gUGF3cyAoQm90dG9tIGxlZnQpIC0tPg0KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjcwIiByPSI2IiBmaWxsPSIjRkZCNkMxIiAvPg0KDQo8L2c+DQo8L3N2Zz4=') !important;
      border-image-slice: 25 50 20 25 fill !important;
      border-image-width: 25px 50px 20px 25px !important;
      padding: 0px 40px 5px 10px !important;
    }

    .bubble-neon {
      border-image-source: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiAgPGRlZnM+DQogICAgPGZpbHRlciBpZD0iZ2xvdyIgeD0iLTIwJSIgeT0iLTIwJSIgd2lkdGg9IjE0MCUiIGhlaWdodD0iMTQwJSI+DQogICAgICA8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIzIiByZXN1bHQ9ImJsdXIiIC8+DQogICAgICA8ZmVNZXJnZT4NCiAgICAgICAgPGZlTWVyZ2VOb2RlIGluPSJibHVyIiAvPg0KICAgICAgICA8ZmVNZXJnZU5vZGUgaW49ImJsdXIiIC8+DQogICAgICAgIDxmZU1lcmdlTm9kZSBpbj0iU291cmNlR3JhcGhpYyIgLz4NCiAgICAgIDwvZmVNZXJnZT4NCiAgICA8L2ZpbHRlcj4NCiAgPC9kZWZzPg0KICA8cmVjdCB4PSI1IiB5PSI1IiB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHJ4PSIxMCIgZmlsbD0iIzExMSIgc3Ryb2tlPSIjMDBGRkZGIiBzdHJva2Utd2lkdGg9IjIiIGZpbHRlcj0idXJsKCNnbG93KSIgLz4NCiAgPHJlY3QgeD0iNSIgeT0iNSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMTAiIGZpbGw9InRyYW5zcGFyZW50IiBzdHJva2U9IiNGRjAwRkYiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWRhc2hhcnJheT0iMTAgNSIgLz4NCjwvc3ZnPg==');
      border-image-slice: 20 fill;
      border-image-width: 20px;
      border-image-outset: 0px;
      border-image-repeat: stretch;
      background: transparent !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      color: #00FFFF !important;
      padding: 10px 15px !important;
    }
    

    .bubble-cloud::after {
        background: rgba(40,40,40,0.9); box-shadow: none; border: none;
    }

    .deleted-tombstone {
      font-style: italic; display: flex; align-items: center; gap: 6px; padding: 2px 4px;
      font-weight: 500; font-size: 0.9rem;
    }
    .mine .deleted-tombstone { color: rgba(255,255,255,0.8); }
    .message-wrapper:not(.mine) .deleted-tombstone { color: #888; }
    
    .mine .bubble:has(.deleted-tombstone) {
      background: rgba(255, 117, 140, 0.4) !important;
      box-shadow: none !important;
      border: 1px dashed rgba(255, 117, 140, 0.6) !important;
    }
    .message-wrapper:not(.mine) .bubble:has(.deleted-tombstone) {
      background: rgba(255, 255, 255, 0.4) !important;
      box-shadow: none !important;
      border: 1px dashed rgba(0, 0, 0, 0.15) !important;
    }
    
    .bubble:has(.deleted-tombstone)::before, .bubble:has(.deleted-tombstone)::after {
      display: none !important; /* Hide ears/clouds for deleted messages */
    }

    /* ====== ESTILOS DE BURBUJAS TIKTOK ====== */
    
    /* ESTILO TIKTOK ROSA */
    .bubble-tiktok-pink {
      background: #FFE4E1 !important; /* Misty rose */
      border-radius: 20px !important;
      position: relative;
      color: #555 !important;
      overflow: visible !important;
      box-shadow: 0 2px 5px rgba(0,0,0,0.05) !important;
      padding: 10px 15px;
    }
    
    /* Pegatina superior izquierda */
    .message-wrapper:not(.mine) .bubble-tiktok-pink::before {
      content: '💕';
      position: absolute;
      top: -10px;
      left: -10px;
      font-size: 20px;
      z-index: 10;
      filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2));
    }
    
    /* Pegatina inferior derecha */
    .message-wrapper:not(.mine) .bubble-tiktok-pink::after {
      content: '🐸';
      position: absolute;
      bottom: -10px;
      right: -10px;
      font-size: 22px;
      z-index: 10;
      filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2));
    }
    
    /* Ajustes cuando es mío */
    .mine .bubble-tiktok-pink {
      background: #FFD1DC !important;
    }
    .mine .bubble-tiktok-pink::before {
      content: '💖';
      position: absolute;
      top: -10px;
      right: -10px;
      font-size: 20px;
      z-index: 10;
      filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2));
    }
    .mine .bubble-tiktok-pink::after {
      content: '🌸';
      position: absolute;
      bottom: -10px;
      left: -10px;
      font-size: 22px;
      z-index: 10;
      filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2));
    }

    /* ESTILO TIKTOK MÁGICO */
    .bubble-tiktok-magic {
      background: linear-gradient(135deg, #E0C3FC 0%, #8EC5FC 100%) !important;
      border-radius: 20px !important;
      position: relative;
      color: #111 !important;
      overflow: visible !important;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1) !important;
      padding: 10px 15px;
    }
    
    .message-wrapper:not(.mine) .bubble-tiktok-magic::before {
      content: '✨';
      position: absolute;
      top: -12px;
      left: -8px;
      font-size: 22px;
      z-index: 10;
    }
    
    .message-wrapper:not(.mine) .bubble-tiktok-magic::after {
      content: '🌙';
      position: absolute;
      bottom: -12px;
      right: -8px;
      font-size: 20px;
      z-index: 10;
    }
    
    .mine .bubble-tiktok-magic::before {
      content: '🌟';
      position: absolute;
      top: -12px;
      right: -8px;
      font-size: 22px;
      z-index: 10;
    }
    .mine .bubble-tiktok-magic::after {
      content: '💫';
      position: absolute;
      bottom: -12px;
      left: -8px;
      font-size: 22px;
      z-index: 10;
    }


    /* ESTILO TIKTOK GATO */
    .bubble-tiktok-cat {
      background: #FFF0D4 !important; /* Pastel orange/yellow */
      border-radius: 20px !important;
      position: relative;
      color: #555 !important;
      overflow: visible !important;
      box-shadow: 0 2px 5px rgba(0,0,0,0.05) !important;
      padding: 10px 15px;
    }
    .message-wrapper:not(.mine) .bubble-tiktok-cat::before {
      content: '🐾'; position: absolute; top: -10px; left: -10px; font-size: 20px; z-index: 10;
    }
    .message-wrapper:not(.mine) .bubble-tiktok-cat::after {
      content: '🐱'; position: absolute; bottom: -10px; right: -10px; font-size: 24px; z-index: 10;
    }
    .mine .bubble-tiktok-cat { background: #FFE4B5 !important; }
    .mine .bubble-tiktok-cat::before {
      content: '🧶'; position: absolute; top: -10px; right: -10px; font-size: 20px; z-index: 10;
    }
    .mine .bubble-tiktok-cat::after {
      content: '😸'; position: absolute; bottom: -10px; left: -10px; font-size: 24px; z-index: 10;
    }

    /* ESTILO TIKTOK PERRO */
    .bubble-tiktok-dog {
      background: #F5E6D3 !important; /* Pastel brown/beige */
      border-radius: 20px !important;
      position: relative;
      color: #4A3B32 !important;
      overflow: visible !important;
      box-shadow: 0 2px 5px rgba(0,0,0,0.05) !important;
      padding: 10px 15px;
    }
    .message-wrapper:not(.mine) .bubble-tiktok-dog::before {
      content: '🦴'; position: absolute; top: -10px; left: -10px; font-size: 20px; z-index: 10;
    }
    .message-wrapper:not(.mine) .bubble-tiktok-dog::after {
      content: '🐶'; position: absolute; bottom: -10px; right: -10px; font-size: 24px; z-index: 10;
    }
    .mine .bubble-tiktok-dog { background: #E8D3C0 !important; }
    .mine .bubble-tiktok-dog::before {
      content: '🎾'; position: absolute; top: -10px; right: -10px; font-size: 20px; z-index: 10;
    }
    .mine .bubble-tiktok-dog::after {
      content: '🐕'; position: absolute; bottom: -10px; left: -10px; font-size: 24px; z-index: 10;
    }

    /* ESTILO TIKTOK NUBE */
    .bubble-tiktok-cloud {
      background: #E0F7FA !important; /* Pastel sky blue */
      border-radius: 20px !important;
      position: relative;
      color: #006064 !important;
      overflow: visible !important;
      box-shadow: 0 2px 5px rgba(0,0,0,0.05) !important;
      padding: 10px 15px;
    }
    .message-wrapper:not(.mine) .bubble-tiktok-cloud::before {
      content: '☁️'; position: absolute; top: -10px; left: -10px; font-size: 20px; z-index: 10;
    }
    .message-wrapper:not(.mine) .bubble-tiktok-cloud::after {
      content: '⛅'; position: absolute; bottom: -10px; right: -10px; font-size: 24px; z-index: 10;
    }
    .mine .bubble-tiktok-cloud { background: #B2EBF2 !important; }
    .mine .bubble-tiktok-cloud::before {
      content: '🌤️'; position: absolute; top: -10px; right: -10px; font-size: 20px; z-index: 10;
    }
    .mine .bubble-tiktok-cloud::after {
      content: '☁️'; position: absolute; bottom: -10px; left: -10px; font-size: 24px; z-index: 10;
    }

    /* ESTILO TIKTOK OSITO */
    .bubble-tiktok-bear { background: #EFEBE9 !important; border-radius: 20px !important; position: relative; color: #4E342E !important; overflow: visible !important; box-shadow: 0 2px 5px rgba(0,0,0,0.05) !important; padding: 10px 15px; }
    .message-wrapper:not(.mine) .bubble-tiktok-bear::before { content: '🍯'; position: absolute; top: -10px; left: -10px; font-size: 20px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2)); }
    .message-wrapper:not(.mine) .bubble-tiktok-bear::after { content: '🐻'; position: absolute; bottom: -10px; right: -10px; font-size: 24px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2)); }
    .mine .bubble-tiktok-bear { background: #D7CCC8 !important; }
    .mine .bubble-tiktok-bear::before { content: '🌲'; position: absolute; top: -10px; right: -10px; font-size: 20px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2)); }
    .mine .bubble-tiktok-bear::after { content: '🧸'; position: absolute; bottom: -10px; left: -10px; font-size: 24px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2)); }

    /* ESTILO TIKTOK RANITA */
    .bubble-tiktok-frog { background: #E8F5E9 !important; border-radius: 20px !important; position: relative; color: #1B5E20 !important; overflow: visible !important; box-shadow: 0 2px 5px rgba(0,0,0,0.05) !important; padding: 10px 15px; }
    .message-wrapper:not(.mine) .bubble-tiktok-frog::before { content: '🌿'; position: absolute; top: -10px; left: -10px; font-size: 20px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2)); }
    .message-wrapper:not(.mine) .bubble-tiktok-frog::after { content: '🐸'; position: absolute; bottom: -10px; right: -10px; font-size: 24px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2)); }
    .mine .bubble-tiktok-frog { background: #C8E6C9 !important; }
    .mine .bubble-tiktok-frog::before { content: '🍄'; position: absolute; top: -10px; right: -10px; font-size: 20px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2)); }
    .mine .bubble-tiktok-frog::after { content: '🐸'; position: absolute; bottom: -10px; left: -10px; font-size: 24px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2)); }

    /* ESTILO TIKTOK ESPAÑA */
    .bubble-tiktok-es { background: #FFF9C4 !important; border-radius: 20px !important; position: relative; color: #B71C1C !important; overflow: visible !important; box-shadow: 0 2px 5px rgba(0,0,0,0.05) !important; padding: 10px 15px; border: 1px solid #FFCDD2 !important; }
    .message-wrapper:not(.mine) .bubble-tiktok-es::before { content: '💃'; position: absolute; top: -10px; left: -10px; font-size: 20px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2));}
    .message-wrapper:not(.mine) .bubble-tiktok-es::after { content: ''; width: 24px; height: 24px; background: url(/assets/bubbles/flag_1.svg) no-repeat center/contain; position: absolute; bottom: -10px; right: -10px; font-size: 24px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2));}
    .mine .bubble-tiktok-es { background: #FFECB3 !important; }
    .mine .bubble-tiktok-es::before { content: '🥘'; position: absolute; top: -10px; right: -10px; font-size: 20px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2));}
    .mine .bubble-tiktok-es::after { content: ''; width: 24px; height: 24px; background: url(/assets/bubbles/flag_1.svg) no-repeat center/contain; position: absolute; bottom: -10px; left: -10px; font-size: 24px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2));}

    /* ESTILO TIKTOK MÉXICO */
    .bubble-tiktok-mx { background: #F1F8E9 !important; border-radius: 20px !important; position: relative; color: #1B5E20 !important; overflow: visible !important; box-shadow: 0 2px 5px rgba(0,0,0,0.05) !important; padding: 10px 15px; border: 1px solid #DCEDC8 !important; }
    .message-wrapper:not(.mine) .bubble-tiktok-mx::before { content: '🌮'; position: absolute; top: -10px; left: -10px; font-size: 20px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2));}
    .message-wrapper:not(.mine) .bubble-tiktok-mx::after { content: ''; width: 24px; height: 24px; background: url(/assets/bubbles/flag_2.svg) no-repeat center/contain; position: absolute; bottom: -10px; right: -10px; font-size: 24px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2));}
    .mine .bubble-tiktok-mx { background: #DCEDC8 !important; }
    .mine .bubble-tiktok-mx::before { content: '🌵'; position: absolute; top: -10px; right: -10px; font-size: 20px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2));}
    .mine .bubble-tiktok-mx::after { content: ''; width: 24px; height: 24px; background: url(/assets/bubbles/flag_2.svg) no-repeat center/contain; position: absolute; bottom: -10px; left: -10px; font-size: 24px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2));}

    /* ESTILO TIKTOK ARGENTINA */
    .bubble-tiktok-ar { background: #E3F2FD !important; border-radius: 20px !important; position: relative; color: #0D47A1 !important; overflow: visible !important; box-shadow: 0 2px 5px rgba(0,0,0,0.05) !important; padding: 10px 15px; }
    .message-wrapper:not(.mine) .bubble-tiktok-ar::before { content: '🧉'; position: absolute; top: -10px; left: -10px; font-size: 20px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2));}
    .message-wrapper:not(.mine) .bubble-tiktok-ar::after { content: ''; width: 24px; height: 24px; background: url(/assets/bubbles/flag_3.svg) no-repeat center/contain; position: absolute; bottom: -10px; right: -10px; font-size: 24px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2));}
    .mine .bubble-tiktok-ar { background: #BBDEFB !important; }
    .mine .bubble-tiktok-ar::before { content: '☀️'; position: absolute; top: -10px; right: -10px; font-size: 20px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2));}
    .mine .bubble-tiktok-ar::after { content: ''; width: 24px; height: 24px; background: url(/assets/bubbles/flag_3.svg) no-repeat center/contain; position: absolute; bottom: -10px; left: -10px; font-size: 24px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2));}

    /* ESTILO TIKTOK COLOMBIA */
    .bubble-tiktok-co { background: #FFFDE7 !important; border-radius: 20px !important; position: relative; color: #F57F17 !important; overflow: visible !important; box-shadow: 0 2px 5px rgba(0,0,0,0.05) !important; padding: 10px 15px; }
    .message-wrapper:not(.mine) .bubble-tiktok-co::before { content: '☕'; position: absolute; top: -10px; left: -10px; font-size: 20px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2));}
    .message-wrapper:not(.mine) .bubble-tiktok-co::after { content: ''; width: 24px; height: 24px; background: url(/assets/bubbles/flag_4.svg) no-repeat center/contain; position: absolute; bottom: -10px; right: -10px; font-size: 24px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2));}
    .mine .bubble-tiktok-co { background: #FFF9C4 !important; }
    .mine .bubble-tiktok-co::before { content: '🦋'; position: absolute; top: -10px; right: -10px; font-size: 20px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2));}
    .mine .bubble-tiktok-co::after { content: ''; width: 24px; height: 24px; background: url(/assets/bubbles/flag_4.svg) no-repeat center/contain; position: absolute; bottom: -10px; left: -10px; font-size: 24px; z-index: 10; filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.2));}

    .sending-graffiti-badge {
      position: absolute;
      top: -45px; /* Above input area */
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      padding: 8px 16px;
      border-radius: 20px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      color: #FF4D6D;
      z-index: 100;
      animation: slideUpFade 0.3s ease forwards;
    }
    .sending-graffiti-badge ion-spinner {
      width: 18px;
      height: 18px;
      color: #FF4D6D;
    }
    @keyframes slideUpFade {
      0% {
        opacity: 0;
        transform: translate(-50%, 20px);
      }
      100% {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ChatWidgetComponent implements OnInit, AfterViewInit {
  pollingInterval: any;
  @ViewChild('msgContainer') msgContainer!: IonContent;
  private api = inject(LoveApiService);
  private toastController = inject(ToastController);
  private firestore = inject(Firestore);
  private tutorialService = inject(TutorialService);
  private cdr = inject(ChangeDetectorRef);
  private actionSheetCtrl = inject(ActionSheetController);
  private alertCtrl = inject(AlertController);
  public premiumService = inject(PremiumService);
  private modalCtrl = inject(ModalController);
  public environment = environment;
  
  messages: any[] = [];
  regularMessages: any[] = [];
  graffitisByAnchorId: {[key: number]: any[]} = {};
  deletedLocalMessages: number[] = [];
  newMessage = '';
  sending = false;
  avatars: { [key: string]: string } = {};
  
  replyingTo: any = null;
  showReactionsMsgId: number | null = null;
  currentUser: string = '';
  myUserId: number = 0;
  private timeouts: any[] = [];

  @ViewChild('doodleCanvas', { static: false }) doodleCanvas: any;
  @ViewChild('chatInput', { static: false }) chatInput: any;
  
  constructor() {
    addIcons({ paperPlane, hourglassOutline, close, arrowUndoOutline, trashOutline, pencil, image, search, mic, stopCircle, colorPalette, checkmark, add, play, pause, colorWandOutline, eye, eyeOffOutline, banOutline, lockClosed, 'time-outline': timeOutline, 'checkmark-outline': checkmarkOutline, 'checkmark-done-outline': checkmarkDoneOutline, 'image-outline': imageOutline, 'partly-sunny-outline': partlySunnyOutline, 'water-outline': waterOutline, 'moon-outline': moonOutline, 'planet-outline': planetOutline, 'heart-outline': heartOutline, 'color-palette-outline': colorPaletteOutline, 'chatbubble-ellipses-outline': chatbubbleEllipsesOutline, 'text-outline': textOutline, 'musical-notes-outline': musicalNotesOutline, 'person-circle-outline': personCircleOutline });
  }

  // --- Background Feature ---
  chatBackground: string = '';
  chatFont: string = 'default';
  chatSound: string = 'default';
  myBubbleStyle: string = 'default';
  partnerBubbleStyle: string = 'default';
  myAvatarFrame: string = 'default';
  partnerAvatarFrame: string = 'default';
  myAvatarMood: string = '';
  partnerAvatarMood: string = '';


  async loadChatBackground() {
    const { value } = await Preferences.get({ key: 'chat_bg' });
    if (value) {
      this.chatBackground = value;
    }
    const { value: fontValue } = await Preferences.get({ key: 'chat_font' });
    if (fontValue) this.chatFont = fontValue;

    const { value: soundValue } = await Preferences.get({ key: 'chat_sound' });
    if (soundValue) this.chatSound = soundValue;
    
    this.loadCoupleInfoSettings();
    if (false) {
    }
  }

  
  async openChatSettings() {
    const isFree = this.premiumService.isFree$.value;
    const lockStr = isFree ? ' 🔒' : '';
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Ajustes del Chat 🎨',
      cssClass: 'premium-action-sheet',
      buttons: [
        { text: 'Fondos de Chat' + lockStr, icon: 'image-outline', handler: () => { setTimeout(() => this.openBgSettings(), 300); } },
        { text: 'Estilo de Burbujas' + lockStr, icon: 'chatbubble-ellipses-outline', handler: () => { setTimeout(() => this.openBubbleSettings(), 300); } },
        { text: 'Tipografía' + lockStr, icon: 'text-outline', handler: () => { setTimeout(() => this.openFontSettings(), 300); } },
        { text: 'Sonidos' + lockStr, icon: 'musical-notes-outline', handler: () => { setTimeout(() => this.openSoundSettings(), 300); } },
        { text: 'Cancelar', icon: 'close', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  async openBubbleSettings() {
    if (this.premiumService.isFree$.value) {
      this.openPaywall();
      return;
    }
    
    const categoryAlert = await this.actionSheetCtrl.create({
      header: 'Categorías de Burbujas',
      cssClass: 'premium-action-sheet',
      buttons: [
        { text: '🎨 Básicos y Mágicos', handler: () => this.openBubbleSubmenu('basics') },
        { text: '🐾 Animales', handler: () => this.openBubbleSubmenu('animals') },
        { text: '🌍 Países', handler: () => this.openBubbleSubmenu('countries') },
        { text: 'Cancelar', icon: 'close', role: 'cancel' }
      ]
    });
    await categoryAlert.present();
  }

  async openBubbleSubmenu(category: string) {
    let buttons: any[] = [];
    if (category === 'basics') {
      buttons = [
        { text: 'Clásica 💬', handler: () => this.saveCoupleInfoSetting('bubble_shape', 'default') },
        { text: 'Decorada Rosa 🎀', handler: () => this.saveCoupleInfoSetting('bubble_shape', 'tiktok-pink') },
        { text: 'Decorada Mágica ✨', handler: () => this.saveCoupleInfoSetting('bubble_shape', 'tiktok-magic') },
        { text: 'Decorada Nube ☁️', handler: () => this.saveCoupleInfoSetting('bubble_shape', 'tiktok-cloud') },
        { text: 'Volver ↩️', handler: () => setTimeout(() => this.openBubbleSettings(), 300) }
      ];
    } else if (category === 'animals') {
      buttons = [
        { text: 'Decorada Gato 🐱', handler: () => this.saveCoupleInfoSetting('bubble_shape', 'tiktok-cat') },
        { text: 'Decorada Perrito 🐶', handler: () => this.saveCoupleInfoSetting('bubble_shape', 'tiktok-dog') },
        { text: 'Decorada Osito 🐻', handler: () => this.saveCoupleInfoSetting('bubble_shape', 'tiktok-bear') },
        { text: 'Decorada Ranita 🐸', handler: () => this.saveCoupleInfoSetting('bubble_shape', 'tiktok-frog') },
        { text: 'Volver ↩️', handler: () => setTimeout(() => this.openBubbleSettings(), 300) }
      ];
    } else if (category === 'countries') {
      buttons = [
        { text: 'España 🇪🇸', handler: () => this.saveCoupleInfoSetting('bubble_shape', 'tiktok-es') },
        { text: 'México 🇲🇽', handler: () => this.saveCoupleInfoSetting('bubble_shape', 'tiktok-mx') },
        { text: 'Argentina 🇦🇷', handler: () => this.saveCoupleInfoSetting('bubble_shape', 'tiktok-ar') },
        { text: 'Colombia 🇨🇴', handler: () => this.saveCoupleInfoSetting('bubble_shape', 'tiktok-co') },
        { text: 'Volver ↩️', handler: () => setTimeout(() => this.openBubbleSettings(), 300) }
      ];
    }
    
    const alert = await this.actionSheetCtrl.create({
      header: 'Elige un estilo',
      cssClass: 'premium-action-sheet',
      buttons: buttons
    });
    await alert.present();
  }

  async openFontSettings() {
    if (this.premiumService.isFree$.value) {
      this.openPaywall();
      return;
    }
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Tipografía (Local)',
      cssClass: 'premium-action-sheet',
      buttons: [
        { text: 'Por Defecto', handler: () => this.setLocalPref('chat_font', 'default', 'chatFont') },
        { text: 'Máquina de Escribir', handler: () => this.setLocalPref('chat_font', 'typewriter', 'chatFont') },
        { text: 'Escritura a Mano', handler: () => this.setLocalPref('chat_font', 'handwriting', 'chatFont') },
        { text: 'Kawaii', handler: () => this.setLocalPref('chat_font', 'kawaii', 'chatFont') },
        { text: 'Cancelar', icon: 'close', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  async openSoundSettings() {
    if (this.premiumService.isFree$.value) {
      this.openPaywall();
      return;
    }
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Sonido de Mensaje (Local)',
      cssClass: 'premium-action-sheet',
      buttons: [
        { text: 'Por Defecto', handler: () => this.setLocalPref('chat_sound', 'default', 'chatSound') },
        { text: 'Burbuja de Agua 💧', handler: () => this.setLocalPref('chat_sound', 'water', 'chatSound') },
        { text: 'Campanilla 🔔', handler: () => this.setLocalPref('chat_sound', 'bell', 'chatSound') },
        { text: 'Silencio 🔇', handler: () => this.setLocalPref('chat_sound', 'none', 'chatSound') },
        { text: 'Cancelar', icon: 'close', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  

  async setLocalPref(key: string, value: string, varName: string) {
    (this as any)[varName] = value;
    await Preferences.set({ key, value });
    this.cdr.detectChanges();
  }

  async saveCoupleInfoSetting(field: string, value: string) {
    if (field === 'bubble_shape') this.myBubbleStyle = value;
    if (field === 'current_mood') this.myAvatarMood = value;
    if (field === 'avatar_frame') this.myAvatarFrame = value;
    try {
      await this.api.updateCoupleInfo({ [field]: value });
    } catch(e) {
      console.error(e);
    }
  }

  async loadCoupleInfoSettings() {
    try {
      const info = await this.api.getCoupleInfo();
      if (info) {
        this.myBubbleStyle = info.my_bubble_shape || info.bubble_shape || 'default';
        this.partnerBubbleStyle = info.partner_bubble_shape || 'default';
        this.myAvatarMood = info.my_mood || info.current_mood || '';
        this.partnerAvatarMood = info.partner_mood || '';
        this.myAvatarFrame = info.my_avatar_frame || info.avatar_frame || 'default';
        this.partnerAvatarFrame = info.partner_avatar_frame || 'default';
        this.cdr.detectChanges();
      }
    } catch(e){}
  }


  async openBgSettings() {
    if (this.premiumService.isFree$.value) {
      this.openPaywall();
      return;
    }
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Fondo del Chat',
      cssClass: 'premium-action-sheet',
      buttons: [
        {
          text: 'Fondo por Defecto',
          icon: 'trash-outline',
          handler: () => this.setChatBackground('')
        },
        {
          text: 'Patrón Kawaii',
          icon: 'heart-outline',
          handler: () => this.setChatBackground("url('assets/backgrounds/cute_pattern.png')")
        },
        {
          text: 'Atardecer Cálido',
          icon: 'partly-sunny-outline',
          handler: () => this.setChatBackground("url('assets/backgrounds/bg_sunset.png')")
        },
        {
          text: 'Océano Profundo',
          icon: 'water-outline',
          handler: () => this.setChatBackground("url('assets/backgrounds/bg_ocean.png')")
        },
        {
          text: 'Noche Estrellada',
          icon: 'moon-outline',
          handler: () => this.setChatBackground("url('assets/backgrounds/bg_night.png')")
        },
        {
          text: 'Aurora Boreal',
          icon: 'planet-outline',
          handler: () => this.setChatBackground("url('assets/backgrounds/bg_aurora.png')")
        },
        {
          text: 'Rosa Pastel',
          icon: 'color-palette-outline',
          handler: () => this.setChatBackground("url('assets/backgrounds/bg_pastel.png')")
        },
        {
          text: 'Subir Foto Personal',
          icon: 'image-outline',
          handler: () => {
            this.pickCustomBackground();
          }
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async pickCustomBackground() {
    try {
      const image = await Camera.getPhoto({
        quality: 60,
        width: 1080,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });
      if (image.dataUrl) {
        const bgString = `url(${image.dataUrl})`;
        this.setChatBackground(bgString);
      }
    } catch (e) {
      console.log('User cancelled or error picking image', e);
    }
  }

  async setChatBackground(bg: string) {
    this.chatBackground = bg;
    this.cdr.detectChanges();
    if (bg) {
      await Preferences.set({ key: 'chat_bg', value: bg });
    } else {
      await Preferences.remove({ key: 'chat_bg' });
    }
  }
  // --------------------------

  private viewInitialized = false;
  private subscriptions: Subscription[] = [];

  async ngOnInit() {
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('hide-tabs');
      if (this.chatInput && this.chatInput.nativeElement) {
        this.chatInput.nativeElement.blur();
      }
    });
    this.currentUser = localStorage.getItem('love_widget_user') === 'juan' ? 'Juan' : 'Roberta';
    this.loadChatBackground();
    
    this.pollingInterval = setInterval(() => {
      this.loadMessages(true);
    }, 5000);
    
    const deletedPref = await Preferences.get({ key: 'deleted_chat_messages' });
    if (deletedPref.value) {
      try { this.deletedLocalMessages = JSON.parse(deletedPref.value); } catch(e){}
    }

    await this.loadAvatars();
    await this.loadMessages();
    this.tutorialService.showChatTour();

    this.subscriptions.push(this.api.avatarUpdated$.subscribe(() => {
      this.loadAvatars();
    }));
  }

  ngOnDestroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    this.timeouts.forEach(t => clearTimeout(t));
    this.subscriptions.forEach(s => s.unsubscribe());
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

  lastKnownMessageId: number = 0;

  async loadMessages(isBackground = false) {
    try {
      // 1. Mostrar caché primero para experiencia instantánea
      if (!isBackground) {
        const cache = await Preferences.get({ key: 'chat_cache' });
        if (cache.value) {
          this.messages = JSON.parse(cache.value);
          if (this.messages.length > 0) {
            this.lastKnownMessageId = this.messages[this.messages.length - 1].id;
          }
          this.processMessages();
          this.safeTimeout(() => this.scrollToBottom(false), 50);
          this.safeTimeout(() => this.scrollToBottom(false), 300);
        }
      }

      // 2. Fetch de la red en segundo plano
      const newMessages = await this.api.getChatMessages();
      
      // 3. Actualizar la vista solo si hay cambios (evita parpadeos)
      if (JSON.stringify(this.messages) !== JSON.stringify(newMessages)) {
        this.messages = newMessages;
        
        let shouldScrollToBottom = !isBackground;

        if (this.messages.length > 0) {
          const latestMsg = this.messages[this.messages.length - 1];
          if (this.lastKnownMessageId > 0 && latestMsg.id > this.lastKnownMessageId && !this.isMine(latestMsg)) {
            shouldScrollToBottom = true;
            if (this.isEmojiOnly(latestMsg.mensaje)) {
              this.triggerEmojiReaction(latestMsg.mensaje.trim());
            }
            if (latestMsg.mensaje && latestMsg.mensaje.includes('✨')) {
              this.triggerConfetti();
            }
            if (this.chatSound && this.chatSound !== 'default' && this.chatSound !== 'none') {
              const audio = new Audio(`assets/sounds/${this.chatSound}.wav`);
              audio.play().catch(e => console.log('Audio play error:', e));
            }
          }
          this.lastKnownMessageId = latestMsg.id;
        }
        
        this.processMessages();
        if (shouldScrollToBottom) {
          this.safeTimeout(() => this.scrollToBottom(false), 100);
          this.safeTimeout(() => this.scrollToBottom(true), 500);
        }
        await Preferences.set({ key: 'chat_cache', value: JSON.stringify(this.messages) });
      }
    } catch (e) {
      if (!isBackground) {
        console.error(e);
        this.showError('No pudimos cargar los mensajes. ¿Hay conexión?');
      }
    }
  }

  private processMessages() {
    this.regularMessages = [];
    this.graffitisByAnchorId = {};

    this.messages.forEach(msg => {
      if (this.deletedLocalMessages.includes(msg.id)) {
        msg.isDeletedLocally = true;
      }

      if (msg.mensaje && msg.mensaje.startsWith('[GRAFFITI:')) {
        const parts = msg.mensaje.split(':');
        if (parts.length >= 6) {
          msg.isGraffiti = true;
          msg.anchorMsgId = parseInt(parts[1], 10);
          msg.offsetX = parseInt(parts[2], 10);
          msg.offsetY = parseInt(parts[3], 10);
          msg.width = parseInt(parts[4], 10);
          if (parts.length >= 7) {
            msg.height = parseInt(parts[5], 10);
            msg.custom_image_path = parts[6].replace(']', '');
          } else {
            msg.height = parseInt(parts[5].replace(']', ''), 10);
          }
          
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

  onInputFocus() {
    document.body.classList.add('hide-tabs');
  }

  onInputBlur() {
    document.body.classList.remove('hide-tabs');
  }

  async sendMessage() {
    if (!this.newMessage.trim()) return;
    
    const payloadMessage = this.newMessage;
    this.newMessage = ''; // Limpiar el input inmediatamente para seguir escribiendo
    this.safeTimeout(() => this.autoResize(), 10); // Reset textarea height
    const isReplyingTo = this.replyingTo;
    this.replyingTo = null; // Limpiar el reply también
    
    // Trigger locally immediately if it's an emoji
    if (this.isEmojiOnly(payloadMessage)) {
      this.triggerEmojiReaction(payloadMessage.trim());
    }
    
    if (payloadMessage.includes('✨')) {
      this.triggerConfetti();
    }
    
    if (payloadMessage.includes('🫆')) {
      this.openFingerprintGame();
    }
    
    try {
      if (this.isEditing && this.editingMsgId) {
        await this.api.editMessage(this.editingMsgId, payloadMessage);
        this.isEditing = false;
        this.editingMsgId = null;
      } else {
        const replyPayload = isReplyingTo ? {
          id: isReplyingTo.id,
          user: isReplyingTo.user?.name,
          text: isReplyingTo.mensaje || '📷 Foto'
        } : undefined;
        
        // Push a fake pending message immediately
        const fakeMsg = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          user_id: this.myUserId,
          mensaje: payloadMessage,
          status: 'pending',
          user: { name: this.currentUser },
          reply_to: replyPayload
        };
        this.regularMessages.push(fakeMsg);
        this.safeTimeout(() => this.scrollToBottom(true), 50);

        await this.api.sendMessage(payloadMessage, undefined, replyPayload);
      }
      
      await this.loadMessages();
      
      this.safeTimeout(() => this.scrollToBottom(true), 100);
    } catch (e) {
      console.error(e);
      this.showError('Ocurrió un error al enviar tu mensaje. Inténtalo de nuevo.');
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
    if (this.premiumService.isFree$.value) {
      this.openPaywall();
      return;
    }

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
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    if (!this.ctx) return;
    this.drawing = true;
    const touch = e.touches[0];
    const rect = e.target.getBoundingClientRect();
    this.currentStrokePoints = [{ x: touch.clientX - rect.left, y: touch.clientY - rect.top }];
  }

  onDoodleMove(e: any) {
    if (!this.drawing || !this.ctx) return;
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
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
      // Use Blob directly to avoid 'Illegal constructor' error on some Capacitor webviews
      const description = `[GRAFFITI:${anchorMsgId}:${Math.round(offsetX)}:${Math.round(offsetY)}:${cropResult.w}:${cropResult.h}]`;
      const res = await this.api.uploadPhoto(cropResult.blob, description);
      if (res && res.photo && res.photo.id) {
        const messageContent = `[GRAFFITI:${anchorMsgId}:${Math.round(offsetX)}:${Math.round(offsetY)}:${cropResult.w}:${cropResult.h}:${res.photo.image_path}]`;
        const replyPayload = this.replyingTo ? { id: this.replyingTo.id, user: this.replyingTo.user?.name, text: '🎨 Graffiti' } : undefined;
        await this.api.sendMessage(messageContent, undefined, replyPayload);
        this.replyingTo = null;
        await this.loadMessages();
        this.safeTimeout(() => this.scrollToBottom(), 100);
      }
    } catch (e: any) {
      console.error('Error sending doodle', e);
      const errMsg = e.message ? e.message : JSON.stringify(e);
      this.showError('Error al enviar garabato: ' + errMsg);
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

  graffitiSwipeStartX = 0;
  graffitiSwipeStartY = 0;

  startGraffitiPress(graf: any, event: any) {
    if (event.touches && event.touches.length > 0) {
      this.graffitiSwipeStartX = event.touches[0].clientX;
      this.graffitiSwipeStartY = event.touches[0].clientY;
    }

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

  moveGraffitiPress(event: any) {
    if (!event.touches) return;
    const x = event.touches[0].clientX;
    const y = event.touches[0].clientY;
    const deltaX = x - this.graffitiSwipeStartX;
    const deltaY = y - this.graffitiSwipeStartY;
    
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      this.endGraffitiPress();
    }
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
  sendingGraffiti = false;
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: any[] = [];
  recordingTime = 0;
  recordingInterval: any;
  
  onSendBtnClick(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    
    if (this.isRecording) {
      this.stopAudioRecording();
    } else if (this.newMessage.trim()) {
      this.sendMessage();
    } else {
      this.startAudioRecording();
    }
  }

  autoResize() {
    if (!this.chatInput) return;
    const el = this.chatInput.nativeElement;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  async openPaywall() {
    const modal = await this.modalCtrl.create({
      component: PaywallComponent
    });
    await modal.present();
  }

  async startAudioRecording() {
    if (this.premiumService.isFree$.value) {
      this.openPaywall();
      return;
    }
    
    if (this.isDoodling) return;
    try {
      // 1. Verify if device supports recording
      const canRecord = await VoiceRecorder.canDeviceVoiceRecord();
      if (!canRecord.value) {
        this.showError('Tu dispositivo no soporta grabación de voz nativa.');
        return;
      }

      // 2. Check current permissions
      let hasPermission;
      try {
        hasPermission = await VoiceRecorder.hasAudioRecordingPermission();
      } catch (err: any) {
        alert('Error al chequear permiso: ' + (err?.message || JSON.stringify(err)));
        return;
      }

      // 3. Request if missing
      if (!hasPermission.value) {
        try {
          hasPermission = await VoiceRecorder.requestAudioRecordingPermission();
        } catch (err: any) {
          alert('Error al pedir permiso: ' + (err?.message || JSON.stringify(err)));
          return;
        }
      }
      
      if (!hasPermission.value) {
        this.showError('Permiso de micrófono denegado. Habilítalo en Ajustes.');
        return;
      }

      // 4. Start recording
      await VoiceRecorder.startRecording();
      
      this.isRecording = true;
      this.recordingTime = 0;
      this.recordingInterval = setInterval(() => this.recordingTime++, 1000);
    } catch (e: any) {
      console.error('Error starting audio recording:', e);
      let errorMsg = e?.message || JSON.stringify(e) || 'Desconocido';
      alert('Error de grabación: ' + errorMsg);
    }
  }

  stopAudioRecording() {
    if (this.isRecording) {
      this.processAudio();
    }
  }

  cancelAudioRecording() {
    this.isRecording = false;
    clearInterval(this.recordingInterval);
    VoiceRecorder.stopRecording().catch(e => console.error('Cancel recording error', e));
  }

  async processAudio() {
    this.isRecording = false;
    clearInterval(this.recordingInterval);
    this.cdr.detectChanges();
    
    this.sending = true;
    try {
      const result = await VoiceRecorder.stopRecording();
      if (result.value && result.value.recordDataBase64) {
        const mimeType = result.value.mimeType || 'audio/aac';
        const base64Audio = `data:${mimeType};base64,${result.value.recordDataBase64}`;
        
        const replyPayload = this.replyingTo ? { id: this.replyingTo.id, user: this.replyingTo.user?.name, text: '🎤 Audio' } : undefined;
        await this.api.sendMessage('[AUDIO]' + base64Audio, undefined, replyPayload);
        this.replyingTo = null;
        await this.loadMessages();
        this.safeTimeout(() => this.scrollToBottom(), 100);
      } else {
        this.sending = false;
      }
    } catch (e) {
      console.error('Error sending base64 audio', e);
      this.showError('Error al enviar audio. Puede ser demasiado largo.');
    } finally {
      this.sending = false;
      this.cdr.detectChanges();
    }
  }

  getAudioSrc(msg: any): string {
    if (msg.mensaje && msg.mensaje.length > 20 && msg.mensaje.includes('data:audio')) {
      return msg.mensaje.replace('[AUDIO]', '');
    }
    return this.environment.storageUrl + msg.photo?.image_path;
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
    if (!this.isMine(msg)) return false;
    
    // Check if within 2 minutes
    const msgDate = new Date(msg.created_at);
    const now = new Date();
    const diffMs = now.getTime() - msgDate.getTime();
    return diffMs <= 120000; // 120000 ms = 2 minutes
  }

  async confirmDeleteMessage(msg: any) {
    this.closePopover();
    
    const isMine = this.isMine(msg);
    const buttons = [];
    
    if (isMine) {
      buttons.push({
        text: 'Eliminar para todos',
        role: 'destructive',
        icon: 'trash',
        handler: () => {
          this.deleteMessageForEveryone(msg.id);
        }
      });
    }
    
    buttons.push({
      text: 'Eliminar para mí',
      icon: 'eye-off',
      handler: () => {
        this.deleteMessageForMe(msg.id);
      }
    });
    
    buttons.push({
      text: 'Cancelar',
      icon: 'close',
      role: 'cancel'
    });

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Eliminar mensaje',
      cssClass: 'premium-action-sheet',
      buttons
    });
    
    await actionSheet.present();
  }

  async deleteMessageForEveryone(msgId: number) {
    try {
      await this.api.editMessage(msgId, '[DELETED]');
      
      const msg = this.messages.find(m => m.id === msgId);
      if (msg) {
        msg.mensaje = '[DELETED]';
        msg.isDeletedLocally = true; // Act as local delete so it shows tombstone
      }
      this.processMessages();
    } catch (e) {
      console.error(e);
      this.showError('Error al eliminar mensaje');
    }
  }
  
  async deleteMessageForMe(msgId: number) {
    if (!this.deletedLocalMessages.includes(msgId)) {
      this.deletedLocalMessages.push(msgId);
      await Preferences.set({ key: 'deleted_chat_messages', value: JSON.stringify(this.deletedLocalMessages) });
    }
    const msg = this.messages.find(m => m.id === msgId);
    if (msg) msg.isDeletedLocally = true;
    this.processMessages();
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
  swipeDirection: 'horizontal' | 'vertical' | null = null;

  ts(event: any, msg: any) {
    if (event.touches && event.touches.length > 0) {
      this.swipeStartX = event.touches[0].clientX;
      this.swipeStartY = event.touches[0].clientY;
      this.swipingMsgId = msg.id;
      this.swipeDirection = null;
    }
    this.startPress(event, msg);
  }

  tm(event: any, msg: any) {
    if (this.swipingMsgId !== msg.id || !event.touches) return;
    
    const x = event.touches[0].clientX;
    const y = event.touches[0].clientY;
    const deltaX = x - this.swipeStartX;
    const deltaY = y - this.swipeStartY;
    
    if (!this.swipeDirection) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        if (Math.abs(deltaY) > Math.abs(deltaX) * 1.2) {
           this.swipeDirection = 'vertical';
        } else {
           this.swipeDirection = 'horizontal';
        }
      }
    }

    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      this.endPress();
    }

    if (this.swipeDirection === 'vertical') return;

    const isMine = this.isMine(msg);
    if (isMine && deltaX > 0) return;
    if (!isMine && deltaX < 0) return;

    let move = deltaX;
    if (move > 80) move = 80 + (move - 80) * 0.2;
    if (move < -80) move = -80 + (move + 80) * 0.2;

    const el = document.getElementById('slide-el-' + msg.id);
    const iconEl = document.getElementById('swipe-icon-' + msg.id);

    if (el) {
      el.style.transform = `translateX(${move}px)`;
      el.style.transition = 'none';
    }

    if (iconEl) {
      const progress = Math.min(Math.abs(move) / 80, 1);
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
    if (isMine && move <= -70) {
      this.replyToMessage(msg);
      Haptics.impact({ style: ImpactStyle.Light }).catch(()=>{});
    } else if (!isMine && move >= 70) {
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

  floatingEmojis: any[] = [];
  
  private isEmojiOnly(text: string): boolean {
    if (!text) return false;
    const t = text.trim();
    if (t.length === 0 || t.length > 10) return false;
    const stripped = t.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '');
    return stripped.length === 0;
  }
  
  private triggerEmojiReaction(emoji: string) {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    const count = 15 + Math.random() * 10;
    for (let i = 0; i < count; i++) {
      const duration = 2.5 + Math.random() * 2.5;
      const delay = Math.random() * 1.5;
      const newEmoji = {
        id: Date.now() + Math.random(),
        emoji: emoji,
        left: Math.random() * 100,
        duration: duration,
        delay: delay,
        size: 1.5 + Math.random() * 2
      };
      this.floatingEmojis.push(newEmoji);
      
      setTimeout(() => {
        this.floatingEmojis = this.floatingEmojis.filter(e => e.id !== newEmoji.id);
        this.cdr.detectChanges();
      }, (duration + 1) * 1000);
    }
    this.cdr.detectChanges();
  }

  private dotLottieEmptyState: DotLottie | null = null;
  
  @ViewChild('sadLottie') set sadLottie(el: ElementRef<HTMLCanvasElement>) {
    if (el) {
      if (!this.dotLottieEmptyState) {
        this.dotLottieEmptyState = new DotLottie({
          canvas: el.nativeElement,
          src: 'assets/lottie/Sad Heart.lottie',
          loop: true,
          autoplay: true
        });
      }
    } else {
      if (this.dotLottieEmptyState) {
        this.dotLottieEmptyState.destroy();
        this.dotLottieEmptyState = null;
      }
    }
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

  private triggerConfetti() {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#00ff88', '#ff4d6d', '#ffffff']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#00ff88', '#ff4d6d', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }

  private async openFingerprintGame() {
    let partnerNameStr = 'Tu amor';
    const info = await this.api.getCoupleInfo();
    if (info && info.partner_name) {
      partnerNameStr = info.partner_name;
    }
    
    const modal = await this.modalCtrl.create({
      component: FingerprintGameModalComponent,
      componentProps: {
        partnerName: partnerNameStr
      },
      cssClass: 'fullscreen-modal'
    });
    await modal.present();
  }
}

