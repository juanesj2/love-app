import { Component, inject, OnInit, ChangeDetectorRef, OnDestroy, ViewChild } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController, ActionSheetController, ModalController, IonContent } from '@ionic/angular';
import { LoveApiService } from '../../services/love-api.service';
import { environment } from '../../../environments/environment';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { addIcons } from 'ionicons';
import { arrowBack, chevronDownOutline, add, list, grid, downloadOutline, send, checkmarkCircle, ellipseOutline, imagesOutline, camera, close, download, heart, addCircle, checkmarkDoneOutline, trashOutline, settingsOutline, pencilOutline } from 'ionicons/icons';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-photo-widget',
  template: `
    <div class="photo-widget-container">
      
      <!-- Global Date Overlay -->
      <div class="global-date-overlay" [class.show]="showingGlobalDate" [class.fade-out]="fadingGlobalDate">
        <div class="overlay-content">
          <ion-icon name="calendar-outline"></ion-icon>
          <h2>{{ globalDateText }}</h2>
          <p>{{ globalDateSubtext }}</p>
        </div>
      </div>

      <!-- Floating Top Bar -->
      <div class="floating-top-bar">
        <div class="streak-badge" *ngIf="coupleInfo && !currentAlbum" (click)="openStreakModal()"
             [ngClass]="{
               'active': coupleInfo.current_streak > 0 && coupleInfo.my_photo_today && coupleInfo.partner_photo_today,
               'pending': coupleInfo.current_streak > 0 && (!coupleInfo.my_photo_today || !coupleInfo.partner_photo_today),
               'zero': coupleInfo.current_streak === 0
             }">
          <span class="streak-icon" *ngIf="coupleInfo.current_streak > 0 && coupleInfo.my_photo_today && coupleInfo.partner_photo_today">🔥</span>
          <span class="streak-icon" *ngIf="coupleInfo.current_streak > 0 && (!coupleInfo.my_photo_today || !coupleInfo.partner_photo_today)">⏳</span>
          <span class="streak-icon" *ngIf="coupleInfo.current_streak === 0">🤍</span>
          <span class="streak-text">{{ coupleInfo.current_streak }} días</span>
        </div>
        <div class="streak-badge back-badge" *ngIf="currentAlbum" (click)="clearAlbum()" style="background: rgba(255,255,255,0.95); color: #590D22; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
          <ion-icon name="arrow-back"></ion-icon>
        </div>

        <div class="floating-toggles" *ngIf="!currentAlbum">
          <button [class.active]="viewMode === 'feed'" (click)="viewMode = 'feed'"><ion-icon name="list"></ion-icon></button>
          <button [class.active]="viewMode === 'grid'" (click)="viewMode = 'grid'"><ion-icon name="grid"></ion-icon></button>
        </div>
        
        <div class="floating-actions">
          <button class="albums-btn-small" (click)="openAlbumsModal()">
            <ion-icon name="images-outline"></ion-icon>
          </button>
          
          <ng-container *ngIf="currentAlbum">
            <button class="header-icon-btn" (click)="openAlbumOptions()">
              <ion-icon name="settings-outline"></ion-icon>
            </button>
            <button class="header-icon-btn" (click)="activateSelectionMode()" *ngIf="photos.length > 0">
              <ion-icon name="checkmark-done-outline"></ion-icon>
            </button>
            <button class="header-upload-btn" (click)="uploadNewPhoto()">
              <ion-icon name="add"></ion-icon>
            </button>
          </ng-container>
        </div>
      </div>

      <ion-content class="scroll-content" [class.snap-feed]="true" [class.ion-hide]="viewMode !== 'feed'">
        <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
          <ion-refresher-content></ion-refresher-content>
        </ion-refresher>

        <div class="photos-list" *ngIf="groupedPhotos.length > 0 && viewMode === 'feed'; else noFeedPhotos">
          <div *ngFor="let group of groupedPhotos" class="date-group">
            
          <div class="photo-card" *ngFor="let photo of group.photos; let i = index" [attr.data-date]="group.date" #photoCards>
            
            <div class="image-wrapper">
              <img [src]="environment.storageUrl + photo.image_path" class="main-photo" loading="lazy" />
              
              <div class="photo-overlay-bottom">
                <div class="card-user-info">
                  <img *ngIf="avatars[photo.user?.name]" [src]="avatars[photo.user.name]" class="card-avatar" />
                  <div *ngIf="!avatars[photo.user?.name]" class="card-avatar-fallback">{{ photo.user?.name?.charAt(0) || 'U' }}</div>
                  <span class="card-username">{{photo.user?.name}}</span>
                </div>
                <button *ngIf="isMine(photo)" class="delete-post-btn" (click)="deletePhoto(photo)">
                  <ion-icon name="trash-outline"></ion-icon>
                </button>
              </div>
            </div>
            
            <div class="photo-details">
              <p *ngIf="photo.description" class="description">{{photo.description}}</p>
              
              <div class="reactions-list" *ngIf="photo.reactions?.length">
                <span class="reaction-bubble" *ngFor="let r of photo.reactions | slice:0:3">{{$any(r).content}}</span>
                <span class="reaction-bubble ellipsis-bubble" *ngIf="photo.reactions.length > 3">...</span>
              </div>

              <div class="actions">
                <button class="reaction-btn" (click)="react(photo.id, '❤️')">❤️</button>
                <button class="reaction-btn" (click)="react(photo.id, '😍')">😍</button>
                <button class="reaction-btn" (click)="react(photo.id, '😂')">😂</button>
                <button class="reaction-btn custom-reaction" (click)="reactCustom(photo.id)"><ion-icon name="add"></ion-icon></button>
                <button class="reaction-btn download-btn" (click)="downloadPhoto(photo)"><ion-icon name="download-outline"></ion-icon></button>
              </div>

              <div class="reply-box">
                <input type="text" [(ngModel)]="replyTexts[photo.id]" placeholder="Escribe un mensaje para el chat..." (keyup.enter)="replyWithText(photo.id)" />
                <button class="send-reply-btn" (click)="replyWithText(photo.id)" [disabled]="!replyTexts[photo.id]"><ion-icon name="send"></ion-icon></button>
              </div>
            </div>
          </div>

        </div>
        </div>

        <ion-infinite-scroll (ionInfinite)="loadMore($event)">
          <ion-infinite-scroll-content loadingSpinner="bubbles" loadingText="Cargando más fotos..."></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </ion-content>

      <!-- VISTA GRID (GALERÍA) -->
      <ion-content #gridContent class="scroll-content" [class.ion-hide]="viewMode !== 'grid'" [scrollEvents]="true" (ionScroll)="onContentScroll($event)">
        <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
          <ion-refresher-content></ion-refresher-content>
        </ion-refresher>

        <ng-container>
          <div class="grid-wrapper" 
               (touchstart)="onGridTouchStart($event)" 
               (touchmove)="onGridTouchMove($event)" 
               (touchend)="onGridTouchEnd($event)">
          <div class="selection-top-bar" *ngIf="selectionMode">
             <div class="select-all-wrapper" (click)="toggleSelectAll()">
               <ion-icon name="checkmark-circle" *ngIf="isAllSelected()" color="primary"></ion-icon>
               <ion-icon name="ellipse-outline" *ngIf="!isAllSelected()"></ion-icon>
               <span>Seleccionar todo</span>
             </div>
          </div>

          <!-- Filtros de Galería -->
          <div class="filter-chips-container" *ngIf="!selectionMode">
            <button class="filter-chip" [class.active]="currentGalleryFilter === 'todas'" (click)="setGalleryFilter('todas')">Todas</button>
            <button class="filter-chip" [class.active]="currentGalleryFilter === 'ultimas'" (click)="setGalleryFilter('ultimas')">Último mes</button>
            <button class="filter-chip" [class.active]="currentGalleryFilter === 'solo_yo'" (click)="setGalleryFilter('solo_yo')">Tus fotos</button>
            <button class="filter-chip" [class.active]="currentGalleryFilter === 'solo_pareja'" (click)="setGalleryFilter('solo_pareja')">Sus fotos</button>
          </div>

          <!-- Recuerdo Destacado -->
          <div class="memory-highlight-container" *ngIf="highlightedMemory && !selectionMode && currentGalleryFilter === 'todas'" (click)="openLightbox(highlightedMemory)">
            <div class="memory-highlight">
              <img [src]="environment.storageUrl + highlightedMemory.image_path" class="memory-bg" />
              <div class="memory-overlay">
                <span class="memory-title">Recuerdo destacado</span>
                <span class="memory-subtitle">{{ highlightedMemory.created_at | date:'longDate':'':'es-ES' }}</span>
              </div>
            </div>
          </div>

          <div *ngFor="let group of galleryGroups; let i = index" class="gallery-month-group" [id]="'group-' + i">
            <div class="month-header">
              <h3 class="gallery-month-title">{{ group.monthYear }}</h3>
              <div class="select-month-wrapper" *ngIf="selectionMode" (click)="toggleSelectMonth(group)">
                <ion-icon name="checkmark-circle" *ngIf="isMonthSelected(group)" color="primary"></ion-icon>
                <ion-icon name="ellipse-outline" *ngIf="!isMonthSelected(group)"></ion-icon>
              </div>
            </div>
            <div class="grid-view" [ngStyle]="{'grid-template-columns': 'repeat(' + gridColumns + ', 1fr)'}">
              <div class="grid-photo-container" *ngFor="let photo of group.photos" 
                   (mousedown)="startPress(photo)" (mouseup)="endPress()" (mouseleave)="endPress()"
                   (touchstart)="startPress(photo)" (touchend)="endPress()"
                   (click)="openLightbox(photo)"
                   [class.selected]="selectedPhotos.has(photo.id)"
                   [class.large]="photo.isLarge">
                <img [src]="environment.storageUrl + photo.image_path" class="grid-photo" loading="lazy" />
                <div class="selection-overlay" *ngIf="selectionMode">
                  <ion-icon name="checkmark-circle" *ngIf="selectedPhotos.has(photo.id)"></ion-icon>
                  <ion-icon name="ellipse-outline" *ngIf="!selectedPhotos.has(photo.id)"></ion-icon>
                </div>
                <div class="grid-overlay" *ngIf="photo.reactions?.length && !selectionMode">
                  <span *ngFor="let r of (photo.reactions || []).slice(0, 1)">{{r.content}}</span>
                </div>
              </div>
            </div>
          </div>
          </div>
          </ng-container>

        <ion-infinite-scroll (ionInfinite)="loadMore($event)">
          <ion-infinite-scroll-content loadingSpinner="bubbles" loadingText="Cargando más fotos..."></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </ion-content>

      <!-- Fast Scroller Timeline (fuera del ion-content para que no se desplace) -->
      <div class="timeline-track" *ngIf="viewMode === 'grid'"
           [class.visible]="isTimelineVisible || isDraggingTimeline"
           (touchstart)="onTimelineTouchStart($event)"
           (touchmove)="onTimelineTouchMove($event)"
           (touchend)="onTimelineTouchEnd($event)">
        
        <div class="timeline-thumb" [style.top.%]="timelineThumbY">
          <div class="thumb-lines"></div>
        </div>
        
        <div class="timeline-bubble" *ngIf="isDraggingTimeline" [style.top.%]="timelineThumbY">
          {{ timelineActiveLabel }}
        </div>

        <div class="timeline-years">
          <span *ngFor="let y of timelineYears">{{ y.year }}</span>
        </div>
      </div>

      <!-- Lightbox Inmersivo -->
      <div class="lightbox-modal" *ngIf="lightboxActive && lightboxPhotos.length > 0">
        <div class="lightbox-backdrop" (click)="closeLightbox()"></div>
        
        <button class="lightbox-close" style="position: absolute; top: 15px; right: 15px; z-index: 2003;" (click)="closeLightbox()">
          <ion-icon name="close"></ion-icon>
        </button>

        <div class="lightbox-content"
             style="align-items: center; padding: 20px;"
             (touchstart)="onLightboxTouchStart($event)"
             (touchmove)="onLightboxTouchMove($event)"
             (touchend)="onLightboxTouchEnd($event)">
          
          <ng-container *ngIf="lightboxPhotos[currentLightboxIndex] as photo">
            <div class="photo-card lightbox-card" [ngClass]="lightboxAnimationClass" 
                 [ngStyle]="{'transform': 'scale(' + lightboxScale + ') translateY(' + lightboxTranslateY + 'px)'}"
                 style="margin: auto; width: 100%; max-height: 90vh;">
              
              <div class="image-wrapper">
                <img [src]="environment.storageUrl + photo.image_path" class="main-photo" loading="lazy" />
                
                <div class="photo-overlay-bottom">
                  <div class="card-user-info">
                    <img *ngIf="avatars[photo.user?.name]" [src]="avatars[photo.user.name]" class="card-avatar" />
                    <div *ngIf="!avatars[photo.user?.name]" class="card-avatar-fallback">{{ photo.user?.name?.charAt(0) || 'U' }}</div>
                    <span class="card-username">{{photo.user?.name}}</span>
                  </div>
                  <button *ngIf="isMine(photo)" class="delete-post-btn" (click)="deletePhoto(photo)">
                    <ion-icon name="trash-outline"></ion-icon>
                  </button>
                </div>
              </div>
              
              <div class="photo-details">
                <p *ngIf="photo.description" class="description">{{photo.description}}</p>
                
                <div class="reactions-list" *ngIf="photo.reactions?.length">
                  <span class="reaction-bubble" *ngFor="let r of photo.reactions | slice:0:3">{{$any(r).content}}</span>
                  <span class="reaction-bubble ellipsis-bubble" *ngIf="photo.reactions.length > 3">...</span>
                </div>

                <div class="actions">
                  <button class="reaction-btn" (click)="react(photo.id, '❤️')">❤️</button>
                  <button class="reaction-btn" (click)="react(photo.id, '😍')">😍</button>
                  <button class="reaction-btn" (click)="react(photo.id, '😂')">😂</button>
                  <button class="reaction-btn custom-reaction" (click)="reactCustom(photo.id)"><ion-icon name="add"></ion-icon></button>
                  <button class="reaction-btn download-btn" (click)="downloadPhoto(photo)"><ion-icon name="download-outline"></ion-icon></button>
                </div>

                <div class="reply-box">
                  <input type="text" [(ngModel)]="replyTexts[photo.id]" placeholder="Escribe un mensaje para el chat..." (keyup.enter)="replyWithText(photo.id)" />
                  <button class="send-reply-btn" (click)="replyWithText(photo.id)" [disabled]="!replyTexts[photo.id]"><ion-icon name="send"></ion-icon></button>
                </div>
              </div>
            </div>
          </ng-container>
        </div>
      </div>

      <ng-template #noFeedPhotos>
        <div class="empty-state" *ngIf="viewMode === 'feed'">
          <ion-icon name="images-outline" class="empty-icon"></ion-icon>
          <p>No hay fotos aún.</p>
          <p *ngIf="!currentAlbum">¡Sube una para empezar la racha!</p>
          <button *ngIf="currentAlbum" class="empty-upload-btn" (click)="uploadNewPhoto()"><ion-icon name="camera"></ion-icon> Añadir foto al álbum</button>
        </div>
      </ng-template>

      <div class="selection-actions" *ngIf="selectionMode">
        <button class="selection-btn cancel" (click)="cancelSelection()"><ion-icon name="close"></ion-icon></button>
        <span class="selection-count">{{selectedPhotos.size}} seleccionadas</span>
        
        <!-- Si estamos añadiendo a un álbum, mostramos el botón de añadir -->
        <button class="selection-btn add" *ngIf="addingToAlbumId" (click)="addSelectedToAlbum()" [disabled]="selectedPhotos.size === 0">
          <ion-icon name="add-circle"></ion-icon>
        </button>
        
        <!-- Si no, mostramos el de descargar -->
        <button class="selection-btn download" *ngIf="!addingToAlbumId" (click)="downloadSelected()" [disabled]="selectedPhotos.size === 0">
          <ion-icon name="download"></ion-icon>
        </button>
        
        <!-- Botón para eliminar fotos seleccionadas (tanto en general como de álbum) -->
        <button class="selection-btn delete" *ngIf="!addingToAlbumId" (click)="deleteSelectedPhotos()" [disabled]="!canDeleteSelected" style="color: #FF4D6D; background: rgba(255, 77, 109, 0.1);">
          <ion-icon name="trash-outline"></ion-icon>
        </button>
      </div>

      <div class="selection-actions" *ngIf="pickingCoverForAlbumId" style="justify-content: flex-start; padding-left: 20px;">
        <button class="selection-btn cancel" (click)="cancelPickingCover()"><ion-icon name="close"></ion-icon></button>
        <span class="selection-count" style="margin-left: 15px;">Elige foto para portada</span>
      </div>

      <!-- Pantalla superpuesta de Colecciones (Overlay CSS) -->
      <div class="albums-overlay" *ngIf="isAlbumsModalOpen" (click)="closeAlbumsModal()">
        <div class="albums-sheet" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Tus Colecciones</h2>
            <button class="close-btn" (click)="closeAlbumsModal()"><ion-icon name="close"></ion-icon></button>
          </div>
          
          <div class="albums-grid">
            <div class="album-item create-new" (click)="createNewAlbum()">
              <div class="album-cover empty">
                <ion-icon name="add"></ion-icon>
              </div>
              <span class="album-name">Crear Nuevo</span>
            </div>
            
            <div class="album-item" *ngFor="let album of albums" (click)="openAlbum(album)">
              <div class="album-cover" [style.backgroundImage]="album.cover_image ? 'url(' + environment.storageUrl + album.cover_image + ')' : ''">
                <ion-icon name="heart" *ngIf="!album.cover_image" style="color: white; font-size: 2rem;"></ion-icon>
                <div class="change-cover-btn" (click)="changeAlbumCover(album.id, $event)">
                  <ion-icon name="camera"></ion-icon>
                </div>
              </div>
              <span class="album-name">{{ album.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Custom Upload Prompt Overlay -->
      <div class="albums-overlay" *ngIf="pendingPhotoFile" (click)="cancelUpload()">
        <div class="albums-sheet prompt-sheet" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Un recuerdo especial</h2>
          </div>
          <div class="prompt-body">
            <div class="prompt-preview-container">
              <img [src]="pendingPhotoPreview" class="prompt-preview" />
            </div>
            <textarea class="premium-textarea" placeholder="Escribe algo bonito sobre este momento (opcional)..." [(ngModel)]="pendingPhotoText"></textarea>
          </div>
          <div class="prompt-actions">
            <button class="prompt-btn cancel" (click)="cancelUpload()" [disabled]="uploading">Cancelar</button>
            <button class="prompt-btn confirm" (click)="confirmUpload()" [disabled]="uploading">
              <span *ngIf="!uploading">Subir</span>
              <span *ngIf="uploading">⏳</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Streak Modal -->
      <div class="streak-modal-overlay" *ngIf="showStreakModal" (click)="showStreakModal = false">
        <div class="streak-modal-content" (click)="$event.stopPropagation()">
          <button class="streak-close-btn" (click)="showStreakModal = false"><ion-icon name="close"></ion-icon></button>
          
          <div class="streak-modal-icon">🔥</div>
          <h3>Racha de {{coupleInfo?.current_streak || 0}} días</h3>
          
          <div class="streak-status">
            <p *ngIf="coupleInfo?.my_photo_today && coupleInfo?.partner_photo_today">
              ¡Ambos habéis subido foto hoy! 🎉
            </p>
            <p *ngIf="!coupleInfo?.my_photo_today && coupleInfo?.partner_photo_today">
              A tu pareja solo le faltas tú para no perder la racha. ¡Sube tu foto! 📸
            </p>
            <p *ngIf="coupleInfo?.my_photo_today && !coupleInfo?.partner_photo_today">
              Tú ya has cumplido. Falta la foto de tu pareja. ⏳
            </p>
            <p *ngIf="!coupleInfo?.my_photo_today && !coupleInfo?.partner_photo_today">
              Ninguno ha subido foto hoy. ¡La racha está en peligro! 🚨
            </p>
          </div>

          <button class="streak-remind-btn" *ngIf="coupleInfo?.my_photo_today && !coupleInfo?.partner_photo_today" (click)="sendStreakReminder()">
            <ion-icon name="notifications"></ion-icon> Recordar a mi pareja
          </button>
          <div *ngIf="!coupleInfo?.my_photo_today" style="margin-top: 15px; text-align: center;">
            <p style="font-size: 0.9rem; color: #FF4D6D; font-weight: bold; background: rgba(255,77,109,0.1); padding: 10px; border-radius: 10px;">
              ¡Sube tu foto primero antes de avisar a tu pareja!
            </p>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
    .photo-widget-container { padding: 0; position: relative; height: 100%; display: flex; flex-direction: column; background: linear-gradient(135deg, #fff5f8 0%, #ffe3e9 100%); font-family: 'Inter', sans-serif; }
    
    .floating-top-bar { position: absolute; top: 15px; left: 15px; right: 15px; z-index: 50; display: flex; justify-content: space-between; align-items: center; pointer-events: none; }
    .floating-top-bar > * { pointer-events: auto; }
    
    .floating-toggles { position: absolute; left: 50%; transform: translateX(-50%); display: flex; background: rgba(255,255,255,0.85); backdrop-filter: blur(10px); padding: 4px; border-radius: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); gap: 5px; }
    .floating-toggles button { background: transparent; border: none; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #888; transition: all 0.2s; cursor: pointer; }
    .floating-toggles button.active { background: white; color: #FF4D6D; box-shadow: 0 2px 8px rgba(255,77,109,0.2); transform: scale(1.05); }
    
    .floating-actions { display: flex; gap: 8px; align-items: center; }
    .albums-btn-small { background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); color: #FF4D6D; border: none; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.08); transition: transform 0.2s; }
    .albums-btn-small:active { transform: scale(0.9); }
    
    .header-upload-btn { background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; border: none; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 77, 109, 0.4); transition: transform 0.2s; }
    .header-upload-btn:active { transform: scale(0.9); }
    .header-icon-btn { background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); color: #590D22; border: none; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; cursor: pointer; transition: transform 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.08); }
    .header-icon-btn:active { transform: scale(0.9); }
    
    .streak-badge { padding: 6px 14px; border-radius: 25px; font-weight: 700; display: flex; align-items: center; gap: 5px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); transition: all 0.3s; }
    .streak-badge.active { background: linear-gradient(90deg, #FF4D6D, #ff758c); color: white; box-shadow: 0 4px 15px rgba(255, 77, 109, 0.4); animation: pulse 2s infinite; }
    .streak-badge.pending { background: linear-gradient(90deg, #FDB813, #F3A183); color: white; box-shadow: 0 4px 15px rgba(253, 184, 19, 0.4); }
    .streak-badge.zero { background: rgba(255,255,255,0.9); color: #888; }
    .streak-icon { font-size: 1.2rem; }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
    
    .scroll-content { flex: 1; --background: transparent; }
    .photos-list { padding-top: 85px; padding-bottom: 40px; }
    .grid-wrapper { padding-top: 85px; padding-bottom: 40px; }
    
    .global-date-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; display: flex; align-items: center; justify-content: center; z-index: 9999; opacity: 0; visibility: hidden; transition: opacity 0.8s ease-in-out, visibility 0.8s; pointer-events: none; border-radius: inherit; }
    .global-date-overlay.show { opacity: 1; visibility: visible; }
    .global-date-overlay.fade-out { opacity: 0; visibility: hidden; }
    .overlay-content { text-align: center; animation: scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    .global-date-overlay ion-icon { font-size: 5rem; margin-bottom: 15px; opacity: 0.9; }
    .global-date-overlay h2 { font-size: 3.5rem; font-weight: 800; margin: 0; text-transform: capitalize; letter-spacing: -1px; }
    .global-date-overlay p { font-size: 1.2rem; opacity: 0.85; margin: 10px 0 0 0; font-weight: 600; }
    .month-header { display: flex; justify-content: space-between; align-items: center; margin: 0 10px 10px 10px; border-bottom: 2px solid rgba(255, 77, 109, 0.2); padding-bottom: 5px; }
    .gallery-month-title { margin: 0; font-size: 1.1rem; font-weight: 800; color: #590D22; text-transform: capitalize; }
    .select-month-wrapper { font-size: 1.5rem; color: #FF4D6D; cursor: pointer; display: flex; align-items: center; }
    
    .selection-top-bar { display: flex; justify-content: flex-end; padding: 0 10px 10px 10px; margin-bottom: 10px; }
    .select-all-wrapper { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #FF4D6D; cursor: pointer; font-size: 1.1rem; }
    .select-all-wrapper ion-icon { font-size: 1.5rem; }

    .grid-view { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-flow: dense; gap: 4px; padding: 0 10px; }
    .grid-photo-container.large { grid-column: span 2; grid-row: span 2; }
    .grid-photo-container { position: relative; width: 100%; aspect-ratio: 1; cursor: pointer; overflow: hidden; border-radius: 8px; transition: all 0.2s; animation: scaleIn 0.4s ease-out forwards; opacity: 0; transform: scale(0.9); }
    @keyframes scaleIn { to { opacity: 1; transform: scale(1); } }
    
    .photo-card { animation: fadeInUp 0.5s ease-out forwards; opacity: 0; transform: translateY(20px); }
    @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
    
    .photo-card:active img.main-photo { transform: scale(0.98); }
    .grid-photo { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
    .grid-photo-container:active .grid-photo { transform: scale(0.95); }
    .grid-photo-container.selected { border: 3px solid #FF4D6D; transform: scale(0.95); }
    .grid-overlay { position: absolute; bottom: 3px; right: 3px; background: rgba(255,255,255,0.85); border-radius: 12px; padding: 1px 4px; font-size: 0.7rem; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
    .selection-overlay { position: absolute; top: 5px; right: 5px; font-size: 1.5rem; color: #FF4D6D; background: rgba(255,255,255,0.8); border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
    
    .snap-feed::part(scroll) { scroll-snap-type: y mandatory; scroll-padding-top: 0px; }
    
    .photo-card { scroll-snap-align: start; scroll-margin-top: 80px; scroll-snap-stop: always; width: calc(100% - 20px); max-width: 500px; margin: 0 auto 20px auto; background: rgba(255, 255, 255, 0.95); border-radius: 28px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.8); position: relative; display: flex; flex-direction: column; transition: transform 0.3s ease; }
    
    .photo-card:hover { transform: translateY(-3px); }
    
    .photo-overlay-bottom { position: absolute; bottom: 0; left: 0; width: 100%; padding: 40px 15px 12px 15px; display: flex; justify-content: space-between; align-items: flex-end; background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%); pointer-events: none; }
    .photo-overlay-bottom > * { pointer-events: auto; }
    .card-user-info { display: flex; align-items: center; gap: 10px; }
    .card-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
    .card-avatar-fallback { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1rem; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
    .card-username { font-weight: 700; color: white; font-size: 1.05rem; text-transform: capitalize; text-shadow: 0 1px 4px rgba(0,0,0,0.6); }
    
    .delete-post-btn { background: rgba(0,0,0,0.3); border: none; color: white; border-radius: 50%; width: 36px; height: 36px; font-size: 1.2rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
    .delete-post-btn:hover { background: #FF4D6D; transform: scale(1.1); }
    
    .image-wrapper { width: 100%; aspect-ratio: 1/1; max-height: 48vh; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #000; position: relative; }
    .main-photo { width: 100%; height: 100%; object-fit: cover; display: block; }
    
    .photo-details { padding: 8px 14px; }
    .description { margin: 0 0 8px 0; color: #444; font-size: 0.95rem; line-height: 1.4; }
    
    .reactions-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
    .reaction-bubble { background: rgba(255, 255, 255, 0.9); padding: 4px 10px; border-radius: 15px; font-size: 1.1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center; }
    .ellipsis-bubble { color: #FF4D6D; font-weight: bold; letter-spacing: 2px; }
    
    .actions { display: flex; justify-content: center; gap: 12px; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 8px; margin-bottom: 8px; }
    .reaction-btn { background: #fff; border: none; border-radius: 50%; width: 36px; height: 36px; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 3px 8px rgba(0,0,0,0.06); transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    .reaction-btn:hover { transform: scale(1.15); box-shadow: 0 5px 12px rgba(255, 77, 109, 0.2); }
    .reaction-btn.custom-reaction { font-size: 1.1rem; color: #ffb3c1; border: 1px dashed #ffb3c1; }
    .reaction-btn.download-btn { font-size: 1.1rem; color: #590D22; border: 1px solid rgba(0,0,0,0.1); }
    
    .reply-box { display: flex; gap: 8px; align-items: center; background: rgba(255,255,255,0.8); padding: 5px 5px 5px 12px; border-radius: 20px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.05); }
    .reply-box input { flex: 1; border: none; background: transparent; padding: 6px 8px; outline: none; font-size: 0.9rem; color: #444; }
    .send-reply-btn { background: #FF4D6D; color: white; border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; }
    .send-reply-btn:hover:not(:disabled) { transform: scale(1.1); background: #c9184a; }
    .send-reply-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .empty-state { text-align: center; color: #a08c92; padding: 100px 20px 40px; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .empty-icon { font-size: 4rem; margin-bottom: 15px; color: #ffb3c1; opacity: 0.8; }
    .empty-upload-btn { background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; border: none; padding: 12px 24px; border-radius: 20px; font-weight: bold; margin-top: 15px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(255, 77, 109, 0.3); }

    .selection-actions { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); display: flex; align-items: center; gap: 15px; padding: 10px 20px; border-radius: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); z-index: 1000; border: 1px solid rgba(255,77,109,0.2); }
    .selection-count { font-weight: 700; color: #590D22; font-size: 1rem; }
    .selection-btn { background: none; border: none; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s; }
    .selection-btn:active { transform: scale(0.9); }
    .selection-btn.cancel { color: #888; }
    .selection-btn.download { color: #FF4D6D; }
    .selection-btn.add { color: #FF4D6D; }
    .selection-btn.download:disabled, .selection-btn.add:disabled { opacity: 0.5; color: #ccc; }
    
    /* Modals & Overlays */
    .albums-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); backdrop-filter: blur(5px); z-index: 1000; display: flex; align-items: flex-end; }
    .albums-sheet { background: #fff; width: 100%; border-radius: 25px 25px 0 0; padding: 20px; box-shadow: 0 -10px 20px rgba(0,0,0,0.1); max-height: 80vh; overflow-y: auto; }
    
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .modal-header h2 { margin: 0; font-size: 1.3rem; font-weight: 800; color: #590D22; }
    .close-btn { background: #f1f3f5; border: none; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #555; cursor: pointer; }
    
    .albums-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
    .album-item { display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; }
    .album-cover { width: 100%; aspect-ratio: 1; border-radius: 15px; background-size: cover; background-position: center; background-color: #ffb3c1; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
    .album-cover.empty { background: white; border: 2px dashed #ffb3c1; color: #ffb3c1; font-size: 2rem; }
    .album-name { font-size: 0.85rem; font-weight: 700; color: #590D22; text-align: center; }
    .change-cover-btn { position: absolute; bottom: 5px; right: 5px; background: rgba(255,255,255,0.8); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #FF4D6D; font-size: 1.1rem; }

    /* Filter Chips */
    .filter-chips-container { display: flex; overflow-x: auto; padding: 5px 10px 15px 10px; gap: 8px; scrollbar-width: none; }
    .filter-chips-container::-webkit-scrollbar { display: none; }
    .filter-chip { padding: 6px 16px; border-radius: 20px; background: rgba(255,255,255,0.7); color: #590D22; border: 1px solid rgba(255,77,109,0.2); white-space: nowrap; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; backdrop-filter: blur(5px); }
    .filter-chip.active { background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; border: none; box-shadow: 0 4px 10px rgba(255, 77, 109, 0.3); }

    /* Memory Highlight */
    .memory-highlight-container { padding: 0 10px 15px 10px; }
    .memory-highlight { position: relative; width: 100%; height: 200px; border-radius: 15px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.1); cursor: pointer; }
    .memory-bg { width: 100%; height: 100%; object-fit: cover; }
    .memory-overlay { position: absolute; bottom: 0; left: 0; width: 100%; padding: 30px 15px 15px 15px; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); display: flex; flex-direction: column; }
    .memory-title { color: white; font-size: 1.2rem; font-weight: 800; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
    .memory-subtitle { color: rgba(255,255,255,0.8); font-size: 0.9rem; margin-top: 2px; }

    /* Lightbox Modal */
    .lightbox-modal { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2000; display: flex; flex-direction: column; justify-content: center; touch-action: none; }
    .lightbox-backdrop { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); }
    .lightbox-content { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; z-index: 2001; }
    .lightbox-header { position: absolute; top: 0; left: 0; width: 100%; padding: 40px 20px 20px 20px; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent); z-index: 2002; }
    .lightbox-date { color: white; font-weight: 600; font-size: 1.1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
    .lightbox-close { background: rgba(255,255,255,0.2); border: none; color: white; width: 40px; height: 40px; border-radius: 50%; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(5px); transition: background 0.2s; }
    .lightbox-close:active { background: rgba(255,255,255,0.4); }
    .lightbox-image { flex: 1; width: 100%; height: 100%; object-fit: contain; }
    .lightbox-footer { position: absolute; bottom: 0; left: 0; width: 100%; padding: 20px 20px 40px 20px; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); color: white; font-size: 1rem; line-height: 1.4; text-shadow: 0 2px 4px rgba(0,0,0,0.5); z-index: 2002; }

    /* Lightbox Animations */
    .lightbox-card { transition: transform 0.1s ease-out, opacity 0.25s; opacity: 1; transform-origin: center; }
    .slide-out-up { opacity: 0; }
    .slide-out-down { opacity: 0; }
    .slide-in-up { animation: slideInUp 0.3s forwards; }
    .slide-in-down { animation: slideInDown 0.3s forwards; }
    @keyframes slideInUp { 0% { transform: translateY(100px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
    @keyframes slideInDown { 0% { transform: translateY(-100px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }

    /* Custom Upload Prompt */
    .prompt-sheet { padding-bottom: 30px; }
    .prompt-body { display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; }
    .prompt-preview-container { width: 100%; display: flex; justify-content: center; background: #fff5f8; border-radius: 15px; overflow: hidden; max-height: 250px; }
    .prompt-preview { max-width: 100%; max-height: 250px; object-fit: contain; }
    .premium-textarea { width: 100%; min-height: 100px; border: 2px solid rgba(255, 77, 109, 0.2); border-radius: 15px; padding: 15px; font-size: 1rem; color: #590D22; background: rgba(255, 255, 255, 0.8); resize: none; outline: none; transition: border-color 0.3s; }
    .premium-textarea:focus { border-color: #FF4D6D; }
    .premium-textarea::placeholder { color: #a08c92; }

    /* Streak Modal */
    .streak-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); z-index: 3000; display: flex; align-items: center; justify-content: center; }
    .streak-modal-content { background: white; border-radius: 25px; padding: 30px; width: 90%; max-width: 350px; text-align: center; position: relative; box-shadow: 0 15px 35px rgba(0,0,0,0.2); animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    .streak-close-btn { position: absolute; top: 15px; right: 15px; background: #f1f3f5; border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 1.2rem; color: #555; display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .streak-modal-icon { font-size: 4rem; margin-bottom: 10px; }
    .streak-modal-content h3 { font-size: 1.5rem; font-weight: 800; color: #590D22; margin-top: 0; margin-bottom: 15px; }
    .streak-status p { font-size: 1rem; color: #555; line-height: 1.5; margin-bottom: 20px; }
    .streak-remind-btn { background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; border: none; padding: 12px 20px; border-radius: 20px; font-weight: bold; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; box-shadow: 0 4px 15px rgba(255, 77, 109, 0.4); transition: transform 0.2s; }
    .streak-remind-btn:active { transform: scale(0.95); }
    @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

    /* Timeline Fast Scroller */
    .timeline-track { position: absolute; top: 80px; bottom: 80px; right: 5px; width: 30px; z-index: 1500; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 20px 0; opacity: 0; transition: opacity 0.3s, background 0.3s; pointer-events: none; }
    .timeline-track.visible { opacity: 1; pointer-events: auto; }
    .timeline-track:active { background: rgba(0,0,0,0.05); border-radius: 15px; }
    
    .timeline-years { position: absolute; top: 0; bottom: 0; right: 0; width: 100%; display: flex; flex-direction: column; justify-content: space-between; align-items: center; pointer-events: none; padding: 20px 0; }
    .timeline-years span { font-size: 0.7rem; font-weight: bold; color: #a08c92; writing-mode: vertical-rl; text-orientation: mixed; user-select: none; }

    .timeline-thumb { position: absolute; left: -10px; width: 36px; height: 36px; background: white; border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; transform: translateY(-50%); z-index: 2; transition: background 0.2s; }
    .thumb-lines { width: 14px; height: 2px; background: #FF4D6D; position: relative; border-radius: 2px; }
    .thumb-lines::before, .thumb-lines::after { content: ''; position: absolute; width: 14px; height: 2px; background: #FF4D6D; left: 0; border-radius: 2px; }
    .thumb-lines::before { top: -5px; }
    .thumb-lines::after { top: 5px; }
    .timeline-track:active .timeline-thumb { background: #FF4D6D; }
    .timeline-track:active .thumb-lines, .timeline-track:active .thumb-lines::before, .timeline-track:active .thumb-lines::after { background: white; }

    .timeline-bubble { position: absolute; right: 45px; transform: translateY(-50%); background: #FF4D6D; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 15px rgba(255, 77, 109, 0.4); white-space: nowrap; pointer-events: none; z-index: 3; animation: fadeInBubble 0.2s; }
    .timeline-bubble::after { content: ''; position: absolute; right: -6px; top: 50%; transform: translateY(-50%); border-width: 6px 0 6px 6px; border-style: solid; border-color: transparent transparent transparent #FF4D6D; }
    @keyframes fadeInBubble { from { opacity: 0; transform: translate(-10px, -50%); } to { opacity: 1; transform: translate(0, -50%); } }
    
    .prompt-actions { display: flex; gap: 10px; }
    .prompt-btn { flex: 1; padding: 14px; border-radius: 20px; font-weight: bold; font-size: 1.1rem; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; }
    .prompt-btn.cancel { background: #f1f3f5; color: #888; }
    .prompt-btn.confirm { background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; box-shadow: 0 4px 15px rgba(255, 77, 109, 0.3); }
    .prompt-btn:disabled { opacity: 0.7; pointer-events: none; }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class PhotoWidgetComponent implements OnInit {
  private api = inject(LoveApiService);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);
  private actionSheetCtrl = inject(ActionSheetController);
  private cdr = inject(ChangeDetectorRef);
  public environment = environment;
  
  pendingPhotoFile: File | null = null;
  pendingPhotoPreview: string = '';
  pendingPhotoText: string = '';

  viewMode: 'feed' | 'grid' = 'feed';
  @ViewChild('gridContent', { static: false }) content!: IonContent;

  photos: any[] = [];
  groupedPhotos: any[] = [];
  galleryGroups: any[] = [];

  albums: any[] = [];
  isAlbumsModalOpen = false;
  currentAlbum: any = null;

  selectionMode = false;
  selectedPhotos = new Set<number>();
  addingToAlbumId: number | null = null;
  
  longPressTimeout: any;

  coupleInfo: any = null;
  uploading = false;
  
  showStreakModal = false;

  avatars: { [key: string]: string } = {};

  get canDeleteSelected(): boolean {
    if (this.selectedPhotos.size === 0) return false;
    for (const id of Array.from(this.selectedPhotos)) {
      const photo = this.photos.find(p => p.id === id);
      if (photo && !this.isMine(photo)) {
        return false;
      }
    }
    return true;
  }

  private observer: IntersectionObserver | null = null;
  
  globalDateText = '';
  globalDateSubtext = '';
  showingGlobalDate = false;
  fadingGlobalDate = false;
  lastShownDate = '';
  dateOverlayTimeout: any;

  // --- Galería Premium ---
  currentGalleryFilter: 'todas' | 'solo_yo' | 'solo_pareja' | 'ultimas' = 'todas';
  highlightedMemory: any = null;
  
  // Lightbox
  lightboxActive = false;
  lightboxPhotos: any[] = [];
  currentLightboxIndex = 0;
  
  // Swipe logic para lightbox
  touchStartY = 0;
  touchEndY = 0;
  isLightboxAnimating = false;
  lightboxAnimationClass = '';
  lightboxTranslateY = 0;

  // Pinch to Zoom
  gridColumns = 3;
  lastGridColumns = 3;
  isPinchingGrid = false;
  initialGridPinchDist = 0;

  lightboxScale = 1;
  isPinchingLightbox = false;
  initialLightboxPinchDist = 0;

  // Timeline Fast Scroller
  timelineYears: { year: string, index: number }[] = [];
  timelineActiveLabel = '';
  isTimelineVisible = false;
  isDraggingTimeline = false;
  timelineThumbY = 0; // Porcentaje de 0 a 100
  timelineHideTimeout: any;

  constructor() {
    addIcons({ arrowBack, chevronDownOutline, add, list, grid, downloadOutline, send, checkmarkCircle, ellipseOutline, imagesOutline, camera, close, download, heart, addCircle, checkmarkDoneOutline, trashOutline, settingsOutline, pencilOutline, calendarOutline: 'calendar-outline', chevronExpand: 'chevron-expand' });
  }

  async ngOnInit() {
    this.loadAvatars();
    
    const albumIntent = await Preferences.get({ key: 'open_album_id_intent' });
    if (albumIntent.value) {
      this.currentAlbum = { id: parseInt(albumIntent.value), name: 'Cargando...' };
      await Preferences.remove({ key: 'open_album_id_intent' });
    }
    
    this.loadData();
  }
  
  ngOnDestroy() {
    if (this.observer) this.observer.disconnect();
  }

  setupObserver() {
    if (this.observer) this.observer.disconnect();
    this.observer = new IntersectionObserver((entries) => {
      let bestEntry: IntersectionObserverEntry | null = null;
      for (const entry of entries) {
        if (entry.isIntersecting) {
          bestEntry = entry;
        }
      }
      if (bestEntry) {
        const date = (bestEntry.target as HTMLElement).getAttribute('data-date');
        if (date) this.triggerGlobalDateOverlay(date);
      }
    }, { threshold: 0.3 });
    
    setTimeout(() => {
      document.querySelectorAll('.photo-card[data-date]').forEach(el => this.observer?.observe(el));
    }, 300);
  }

  triggerGlobalDateOverlay(date: string) {
    if (this.lastShownDate === date) return;
    this.lastShownDate = date;

    this.globalDateText = date;
    if (date === 'Hoy') this.globalDateSubtext = 'Tus recuerdos de hoy';
    else if (date === 'Ayer') this.globalDateSubtext = 'Lo que vivisteis ayer';
    else this.globalDateSubtext = 'Tus recuerdos';

    this.showingGlobalDate = true;
    this.fadingGlobalDate = false;
    this.cdr.detectChanges();

    if (this.dateOverlayTimeout) clearTimeout(this.dateOverlayTimeout);

    this.dateOverlayTimeout = setTimeout(() => {
      this.fadingGlobalDate = true;
      this.cdr.detectChanges();
      
      setTimeout(() => {
        this.showingGlobalDate = false;
        this.fadingGlobalDate = false;
        this.cdr.detectChanges();
      }, 800); // Wait for CSS transition
    }, 1200);
  }

  async loadAvatars() {
    try {
      const info = await this.api.getCoupleInfo();
      if (info) {
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

  currentPage = 1;
  lastPage = 1;

  async loadData() {
    try {
      this.currentPage = 1;
      
      // 1. Mostrar caché primero si no estamos en un álbum específico
      if (!this.currentAlbum) {
        const cachePhotos = await Preferences.get({ key: 'feed_photos_cache' });
        const cacheCouple = await Preferences.get({ key: 'couple_info_cache' });
        const cacheAlbums = await Preferences.get({ key: 'albums_cache' });
        
        if (cachePhotos.value) {
          this.photos = JSON.parse(cachePhotos.value);
          this.groupPhotosByDate();
          this.groupPhotosForGallery();
        }
        if (cacheCouple.value) this.coupleInfo = JSON.parse(cacheCouple.value);
        if (cacheAlbums.value) this.albums = JSON.parse(cacheAlbums.value);
      }

      // 2. Carga desde red en segundo plano
      this.coupleInfo = await this.api.getCoupleInfo();
      const response = await this.api.getPhotos(this.currentAlbum ? this.currentAlbum.id : undefined, this.currentPage);
      this.lastPage = response.last_page || 1;
      const newPhotos = response.data || response;
      
      // 3. Actualizar vistas solo si cambió algo
      if (JSON.stringify(this.photos) !== JSON.stringify(newPhotos)) {
        this.photos = newPhotos;
        this.groupPhotosByDate();
        this.generateHighlightMemory();
        this.applyGalleryFilters();
        this.setupObserver();
        if (!this.currentAlbum) {
          await Preferences.set({ key: 'feed_photos_cache', value: JSON.stringify(this.photos) });
        }
      } else {
        // Asegurarse de enganchar el observer aunque vengan de caché
        this.setupObserver();
      }
      
      this.albums = await this.api.getAlbums();
      if (!this.currentAlbum) {
        await Preferences.set({ key: 'couple_info_cache', value: JSON.stringify(this.coupleInfo) });
        await Preferences.set({ key: 'albums_cache', value: JSON.stringify(this.albums) });
      }

    } catch (e) {
      console.error(e);
      this.showError('No se pudo cargar la galería. Comprueba tu conexión.');
    }
  }

  async loadMore(event: any) {
    if (this.currentPage >= this.lastPage) {
      event.target.complete();
      event.target.disabled = true;
      return;
    }
    this.currentPage++;
    try {
      const response = await this.api.getPhotos(this.currentAlbum ? this.currentAlbum.id : undefined, this.currentPage);
      const newPhotos = response.data || [];
      this.photos = [...this.photos, ...newPhotos];
      this.groupPhotosByDate();
      this.generateHighlightMemory();
      this.applyGalleryFilters();
      this.setupObserver();
      event.target.complete();
    } catch (e) {
      event.target.complete();
    }
  }

  async handleRefresh(event: any) {
    const infiniteScroll = document.querySelector('ion-infinite-scroll');
    if (infiniteScroll) infiniteScroll.disabled = false;
    await this.loadData();
    event.target.complete();
  }

  groupPhotosByDate() {
    const groups: { [key: string]: any[] } = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    for (const p of this.photos) {
      const dateObj = new Date(p.created_at);
      
      let groupName = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
      if (dateObj.toDateString() === today.toDateString()) {
        groupName = 'Hoy';
      } else if (dateObj.toDateString() === yesterday.toDateString()) {
        groupName = 'Ayer';
      }

      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(p);
    }
    
    // Convertir a array manteniendo el orden de las claves
    this.groupedPhotos = Object.keys(groups).map(k => ({ date: k, photos: groups[k] }));
  }

  groupPhotosForGallery() {
    const groups: { [key: string]: any[] } = {};
    for (const p of this.photos) {
      const dateObj = new Date(p.created_at);
      let monthYear = dateObj.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      monthYear = monthYear.charAt(0).toUpperCase() + monthYear.slice(1); // Capitalizar
      
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(p);
    }
    
    // Sort array descending if needed, currently API returns new to old
    this.galleryGroups = Object.keys(groups).map(k => ({ monthYear: k, photos: groups[k] }));
    this.generateTimelineYears();
  }

  generateTimelineYears() {
    this.timelineYears = this.galleryGroups.map((group, index) => {
      const parts = group.monthYear.split(' ');
      const shortMonth = parts[0].substring(0, 3).toUpperCase();
      const shortYear = parts[1] ? parts[1].substring(2) : '';
      return { year: `${shortMonth} '${shortYear}`, index: index };
    });
  }

  // --- Filtros de Galería ---
  setGalleryFilter(filter: 'todas' | 'solo_yo' | 'solo_pareja' | 'ultimas') {
    this.currentGalleryFilter = filter;
    this.applyGalleryFilters();
  }

  applyGalleryFilters() {
    const me = this.coupleInfo?.my_id;
    const partner = this.coupleInfo?.couple?.user1_id === me ? this.coupleInfo?.couple?.user2_id : this.coupleInfo?.couple?.user1_id;
    
    let filtered = this.photos;
    
    if (this.currentGalleryFilter === 'solo_yo') {
      filtered = this.photos.filter(p => p.user_id === me);
    } else if (this.currentGalleryFilter === 'solo_pareja') {
      filtered = this.photos.filter(p => p.user_id === partner);
    } else if (this.currentGalleryFilter === 'ultimas') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filtered = this.photos.filter(p => new Date(p.created_at) >= thirtyDaysAgo);
    }
    
    // Agrupar con las filtradas
    this.groupFilteredPhotosForGallery(filtered);
  }

  groupFilteredPhotosForGallery(filteredPhotos: any[]) {
    const groups: { [key: string]: any[] } = {};
    for (const p of filteredPhotos) {
      const dateObj = new Date(p.created_at);
      let monthYear = dateObj.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      monthYear = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
      
      // Lógica de tamaño dinámico (Grid 2x2 algorítmico)
      p.isLarge = (p.id % 7 === 0);
      
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(p);
    }
    
    this.galleryGroups = Object.keys(groups).map(k => ({ monthYear: k, photos: groups[k] }));
    this.generateTimelineYears();
  }

  // --- Recuerdo Destacado ---
  generateHighlightMemory() {
    if (this.photos.length < 5) return;
    const oldPhotos = this.photos.filter(p => {
      const ageInDays = (new Date().getTime() - new Date(p.created_at).getTime()) / (1000 * 3600 * 24);
      return ageInDays > 14; // Más de 2 semanas
    });
    
    if (oldPhotos.length > 0) {
      // Elegir aleatoria usando un seed del día (para que no cambie cada vez que recarga hoy)
      const daySeed = new Date().getDate();
      const index = (daySeed * 7) % oldPhotos.length;
      this.highlightedMemory = oldPhotos[index];
    }
  }

  // --- Lightbox Inmersivo ---
  openStreakModal() {
    this.showStreakModal = true;
  }

  async sendStreakReminder() {
    try {
      await this.api.sendStreakReminder();
      this.showStreakModal = false;
      const toast = await this.toastController.create({
        message: '¡Recordatorio enviado con éxito! 🔔',
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      toast.present();
    } catch (e) {
      console.error(e);
      const toast = await this.toastController.create({
        message: 'Error al enviar el recordatorio',
        duration: 2000,
        position: 'top',
        color: 'danger'
      });
      toast.present();
    }
  }

  openLightbox(photo: any) {
    if (this.selectionMode) {
      this.toggleSelection(photo);
      return;
    }
    
    // Extraer todas las fotos filtradas actualmente
    this.lightboxPhotos = [];
    for (const group of this.galleryGroups) {
      this.lightboxPhotos.push(...group.photos);
    }
    
    this.currentLightboxIndex = this.lightboxPhotos.findIndex(p => p.id === photo.id);
    if (this.currentLightboxIndex === -1) {
       this.lightboxPhotos = [photo];
       this.currentLightboxIndex = 0;
    }
    
    this.lightboxActive = true;
  }

  closeLightbox() {
    this.lightboxActive = false;
  }

  animateLightboxTo(direction: 'up' | 'down', callback: () => void) {
    if (this.isLightboxAnimating) return;
    this.isLightboxAnimating = true;
    
    this.lightboxAnimationClass = direction === 'up' ? 'slide-out-up' : 'slide-out-down';
    
    setTimeout(() => {
      callback();
      this.lightboxAnimationClass = direction === 'up' ? 'slide-in-up' : 'slide-in-down';
      
      setTimeout(() => {
        this.lightboxAnimationClass = '';
        this.isLightboxAnimating = false;
      }, 300);
    }, 250);
  }

  nextLightboxPhoto() {
    if (this.currentLightboxIndex < this.lightboxPhotos.length - 1) {
      this.animateLightboxTo('up', () => {
        this.currentLightboxIndex++;
      });
    }
  }

  prevLightboxPhoto() {
    if (this.currentLightboxIndex > 0) {
      this.animateLightboxTo('down', () => {
        this.currentLightboxIndex--;
      });
    }
  }

  getDistance(t1: Touch, t2: Touch) {
    return Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
  }

  // --- Fast Scroller Timeline ---
  async onContentScroll(e: any) {
    if (this.viewMode !== 'grid') return;
    
    this.isTimelineVisible = true;
    clearTimeout(this.timelineHideTimeout);
    
    if (!this.isDraggingTimeline && this.content) {
      try {
        const scrollEl = await this.content.getScrollElement();
        const scrollTop = e.detail.scrollTop;
        const scrollHeight = scrollEl.scrollHeight - scrollEl.clientHeight;
        if (scrollHeight > 0) {
          this.timelineThumbY = (scrollTop / scrollHeight) * 100;
          this.timelineThumbY = Math.max(0, Math.min(100, this.timelineThumbY));
        }
      } catch (err) {}
    }

    this.timelineHideTimeout = setTimeout(() => {
      this.isTimelineVisible = false;
    }, 1500);
  }

  onTimelineTouchStart(e: TouchEvent) {
    e.preventDefault(); // Evita scroll nativo
    this.isDraggingTimeline = true;
    this.isTimelineVisible = true;
    clearTimeout(this.timelineHideTimeout);
    this.handleTimelineDrag(e.touches[0]);
  }

  onTimelineTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (this.isDraggingTimeline) {
      this.handleTimelineDrag(e.touches[0]);
    }
  }

  onTimelineTouchEnd(e: TouchEvent) {
    this.isDraggingTimeline = false;
    this.timelineHideTimeout = setTimeout(() => {
      this.isTimelineVisible = false;
    }, 1500);
  }

  handleTimelineDrag(touch: Touch) {
    const track = (touch.target as HTMLElement).closest('.timeline-track');
    if (!track) return;
    
    const rect = track.getBoundingClientRect();
    let y = touch.clientY - rect.top;
    y = Math.max(0, Math.min(y, rect.height));
    
    // Calcular porcentaje (0 a 100)
    this.timelineThumbY = (y / rect.height) * 100;
    
    // Mapear el porcentaje al índice del grupo de fotos
    if (this.galleryGroups.length === 0) return;
    
    const index = Math.floor((y / rect.height) * this.galleryGroups.length);
    const safeIndex = Math.max(0, Math.min(index, this.galleryGroups.length - 1));
    
    const targetGroup = this.galleryGroups[safeIndex];
    if (targetGroup) {
      this.timelineActiveLabel = targetGroup.monthYear;
      const el = document.getElementById('group-' + safeIndex);
      if (el) {
        this.content.scrollToPoint(0, el.offsetTop, 10);
      }
    }
  }

  // --- Grid Pinch-to-Zoom ---
  onGridTouchStart(e: TouchEvent) {
    if (e.touches.length === 2) {
      this.isPinchingGrid = true;
      this.initialGridPinchDist = this.getDistance(e.touches[0], e.touches[1]);
      this.lastGridColumns = this.gridColumns;
    }
  }

  onGridTouchMove(e: TouchEvent) {
    if (!this.isPinchingGrid || e.touches.length !== 2) return;
    
    const dist = this.getDistance(e.touches[0], e.touches[1]);
    const ratio = dist / this.initialGridPinchDist;

    // ratio > 1 means fingers moving apart (zoom in -> fewer columns)
    // ratio < 1 means fingers moving together (zoom out -> more columns)
    if (ratio > 1.3 && this.lastGridColumns > 2) {
      this.gridColumns = this.lastGridColumns - 1;
      this.lastGridColumns = this.gridColumns;
      this.initialGridPinchDist = dist; 
    } else if (ratio < 0.7 && this.lastGridColumns < 4) {
      this.gridColumns = this.lastGridColumns + 1;
      this.lastGridColumns = this.gridColumns;
      this.initialGridPinchDist = dist;
    }
  }

  onGridTouchEnd(e: TouchEvent) {
    if (e.touches.length < 2) {
      this.isPinchingGrid = false;
    }
  }

  // --- Lightbox Pinch-to-Zoom & Swipe ---
  onLightboxTouchStart(e: TouchEvent) {
    if (e.touches.length === 2) {
      this.isPinchingLightbox = true;
      this.initialLightboxPinchDist = this.getDistance(e.touches[0], e.touches[1]);
    } else if (e.touches.length === 1 && !this.isPinchingLightbox) {
      this.touchStartY = e.changedTouches[0].screenY;
      this.lightboxTranslateY = 0;
    }
  }

  onLightboxTouchMove(e: TouchEvent) {
    if (this.isPinchingLightbox && e.touches.length === 2) {
      if (e.cancelable) e.preventDefault();
      const dist = this.getDistance(e.touches[0], e.touches[1]);
      const ratio = dist / this.initialLightboxPinchDist;
      this.lightboxScale = Math.max(1, Math.min(3, ratio));
    } else if (e.touches.length === 1 && !this.isPinchingLightbox && this.lightboxScale === 1) {
      // Opcional: mover un poco la tarjeta al deslizar para feedback visual
      const currentY = e.changedTouches[0].screenY;
      const diff = currentY - this.touchStartY;
      if (Math.abs(diff) < 150) {
        this.lightboxTranslateY = diff;
      }
    }
  }

  onLightboxTouchEnd(e: TouchEvent) {
    if (this.isPinchingLightbox) {
      if (e.touches.length < 2) {
        this.isPinchingLightbox = false;
        // Restaurar scale original
        this.lightboxScale = 1;
      }
    } else if (this.lightboxScale === 1) {
      this.touchEndY = e.changedTouches[0].screenY;
      this.handleLightboxSwipe();
      this.lightboxTranslateY = 0;
    }
  }

  handleLightboxSwipe() {
    const swipeDist = this.touchStartY - this.touchEndY;
    // Swipe UP (scroll down) -> Next photo
    if (swipeDist > 50) {
      this.nextLightboxPhoto();
    } 
    // Swipe DOWN (scroll up) -> Prev photo
    else if (swipeDist < -50) {
      this.prevLightboxPhoto();
    }
  }

  async createNewAlbum() {
    const alert = await this.alertController.create({
      header: 'Nueva Colección',
      message: 'Dale un nombre a este álbum especial (ej. "Viaje a París", "Nuestro Aniversario").',
      cssClass: 'custom-love-alert',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Nombre de la colección...'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Crear',
          handler: async (data) => {
            if (data.name) {
              try {
                await this.api.createAlbum(data.name);
                this.albums = await this.api.getAlbums();
                this.showSuccess('¡Colección creada!');
              } catch (e) {
                this.showError('Asegúrate de que la API está actualizada en Alwaysdata.');
              }
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async presentPhotoOptions(callback: (source: CameraSource) => void) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Seleccionar Imagen',
      cssClass: 'premium-action-sheet',
      buttons: [
        {
          text: 'Tomar Foto',
          icon: 'camera',
          handler: () => {
            callback(CameraSource.Camera);
          }
        },
        {
          text: 'Elegir de la Galería',
          icon: 'image',
          handler: () => {
            callback(CameraSource.Photos);
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

  pickingCoverForAlbumId: number | null = null;

  async changeAlbumCover(albumId: number, event: Event) {
    event.stopPropagation();
    
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Cambiar Portada',
      cssClass: 'premium-action-sheet',
      buttons: [
        {
          text: 'Fotos de la app',
          icon: 'images',
          handler: () => {
            this.startPickingCover(albumId);
          }
        },
        {
          text: 'Tomar Foto',
          icon: 'camera',
          handler: () => {
            this.takeAndUploadCover(albumId, CameraSource.Camera);
          }
        },
        {
          text: 'De la Galería',
          icon: 'image',
          handler: () => {
            this.takeAndUploadCover(albumId, CameraSource.Photos);
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

  async takeAndUploadCover(albumId: number, source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 60, width: 600, height: 600, allowEditing: true, resultType: CameraResultType.DataUrl, source: source
      });
      
      if (image.dataUrl) {
        await this.api.uploadAlbumCover(albumId, image.dataUrl);
        this.loadData();
        this.showSuccess('Portada actualizada');
      }
    } catch (e) {
      console.log('User cancelled or error', e);
    }
  }

  startPickingCover(albumId: number) {
    this.pickingCoverForAlbumId = albumId;
    this.isAlbumsModalOpen = false; // Cerramos el modal para que vea las fotos
    this.currentAlbum = null; // Mostramos todas las fotos
    this.viewMode = 'grid'; // Cambiamos a la vista de galería
    this.cdr.detectChanges(); // Forzamos actualización de la UI
    this.showSuccess('Selecciona una foto para la portada');
    this.loadData();
  }

  openAlbum(album: any) {
    this.currentAlbum = album;
    this.closeAlbumsModal();
    this.loadData();
  }

  clearAlbum() {
    this.currentAlbum = null;
    this.loadData();
  }

  openAlbumsModal() {
    this.isAlbumsModalOpen = true;
  }
  
  closeAlbumsModal() {
    this.isAlbumsModalOpen = false;
  }

  async react(photoId: number, emoji: string) {
    try {
      await this.api.reactToPhoto(photoId, emoji);
      await this.api.sendMessage(emoji, photoId); // Mandar la reacción al chat también
      // Actualización local para no perder la paginación
      const photo = this.photos.find(p => p.id === photoId);
      if (photo) {
        if (!photo.reactions) photo.reactions = [];
        photo.reactions.push({ content: emoji, user: { name: 'Yo' } });
      }
    } catch (e) {
      console.error(e);
      this.showError('No se pudo guardar la reacción.');
    }
  }

  async reactCustom(photoId: number) {
    const alert = await this.alertController.create({
      header: 'Reacción',
      message: 'Pon el emoji o sticker con el que quieres reaccionar',
      cssClass: 'custom-love-alert',
      inputs: [
        { name: 'emoji', type: 'text', placeholder: 'Escribe un emoji...' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Enviar',
          handler: (data) => {
            if (data.emoji) {
              this.react(photoId, data.emoji);
            }
          }
        }
      ]
    });
    await alert.present();
  }

  isMine(photo: any): boolean {
    const stored = localStorage.getItem('love_widget_user');
    if (!stored || !photo || !photo.user) return false;
    const myName = stored === 'juan' ? 'Juan' : 'Roberta';
    return photo.user.name === myName;
  }

  async deletePhoto(photo: any) {
    const alert = await this.alertController.create({
      header: '¿Eliminar foto?',
      message: '¿Estás seguro de que quieres borrar este recuerdo para siempre?',
      cssClass: 'custom-love-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.api.deletePhoto(photo.id);
              this.showSuccess('Foto eliminada');
              // Remove locally
              this.photos = this.photos.filter(p => p.id !== photo.id);
              this.groupPhotosByDate();
              this.groupPhotosForGallery();
              if (!this.currentAlbum) {
                await Preferences.set({ key: 'feed_photos_cache', value: JSON.stringify(this.photos) });
              }
            } catch (e) {
              console.error(e);
              this.showError('No se pudo eliminar la foto');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  replyTexts: { [key: number]: string } = {};

  async replyWithText(photoId: number) {
    const text = this.replyTexts[photoId];
    if (!text || !text.trim()) return;
    try {
      await this.api.sendMessage(text, photoId);
      this.replyTexts[photoId] = '';
      this.showSuccess('Mensaje enviado al chat');
    } catch (e) {
      console.error(e);
      this.showError('No se pudo enviar el mensaje.');
    }
  }

  async uploadNewPhoto() {
    if (this.currentAlbum) {
      const actionSheet = await this.actionSheetCtrl.create({
        header: 'Añadir al álbum',
        cssClass: 'premium-action-sheet',
        buttons: [
          {
            text: 'Fotos de la app',
            icon: 'images',
            handler: () => {
              this.startAddingToAlbum();
            }
          },
          {
            text: 'Tomar Foto',
            icon: 'camera',
            handler: () => {
              this.takeAndUploadPhoto(CameraSource.Camera);
            }
          },
          {
            text: 'De la Galería',
            icon: 'image',
            handler: () => {
              this.takeAndUploadPhoto(CameraSource.Photos);
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
    } else {
      this.presentPhotoOptions((source) => {
        this.takeAndUploadPhoto(source);
      });
    }
  }

  async takeAndUploadPhoto(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 70, width: 800, height: 800, allowEditing: false, resultType: CameraResultType.Uri, source: source
      });
      
      if (image.webPath) {
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        this.pendingPhotoFile = new File([blob], `photo_${new Date().getTime()}.jpg`, { type: blob.type });
        this.pendingPhotoPreview = URL.createObjectURL(this.pendingPhotoFile);
        this.pendingPhotoText = '';
      }
    } catch (e) {
      console.log('User cancelled or error', e);
    }
  }

  cancelUpload() {
    this.pendingPhotoFile = null;
    this.pendingPhotoPreview = '';
    this.pendingPhotoText = '';
  }

  async confirmUpload() {
    if (!this.pendingPhotoFile) return;
    this.uploading = true;
    try {
      await this.api.uploadPhoto(this.pendingPhotoFile, this.pendingPhotoText, this.currentAlbum?.id);
      this.cancelUpload();
      this.loadData();
      this.showSuccess('¡Recuerdo subido con éxito!');
    } catch (e: any) {
      console.error(e);
      this.showError('Error al subir: ' + (e.message || 'Error desconocido'));
    } finally {
      this.uploading = false;
    }
  }

  startAddingToAlbum() {
    this.addingToAlbumId = this.currentAlbum.id;
    this.currentAlbum = null; // Volver al feed general
    this.activateSelectionMode();
    this.loadData(); // Cargar todas las fotos
  }

  async addSelectedToAlbum() {
    if (!this.addingToAlbumId) return;
    
    const selectedIds = Array.from(this.selectedPhotos);
    this.showSuccess(`Añadiendo ${selectedIds.length} foto(s)...`);
    
    try {
      await this.api.assignPhotosToAlbum(this.addingToAlbumId, selectedIds);
      // Volver a abrir el álbum
      const targetAlbum = this.albums.find(a => a.id === this.addingToAlbumId);
      this.cancelSelection();
      if (targetAlbum) {
        this.openAlbum(targetAlbum);
      } else {
        this.loadData();
      }
      this.showSuccess('Fotos añadidas al álbum');
    } catch (e) {
      console.error(e);
      this.showError('Error al añadir las fotos al álbum');
    }
  }

  // --- Selección y Descarga ---
  activateSelectionMode() {
    this.viewMode = 'grid';
    this.selectionMode = true;
  }

  startPress(photo: any) {
    if (this.selectionMode) return;
    this.longPressTimeout = setTimeout(() => {
      this.selectionMode = true;
      this.toggleSelection(photo);
    }, 500); // 500ms para mantener pulsado
  }

  endPress() {
    clearTimeout(this.longPressTimeout);
  }

  toggleSelection(photo: any) {
    if (this.selectedPhotos.has(photo.id)) {
      this.selectedPhotos.delete(photo.id);
      if (this.selectedPhotos.size === 0) {
        this.selectionMode = false;
      }
    } else {
      this.selectedPhotos.add(photo.id);
    }
  }

  isMonthSelected(group: any): boolean {
    if (!group || !group.photos || group.photos.length === 0) return false;
    return group.photos.every((p: any) => this.selectedPhotos.has(p.id));
  }

  toggleSelectMonth(group: any) {
    const allSelected = this.isMonthSelected(group);
    if (allSelected) {
      group.photos.forEach((p: any) => this.selectedPhotos.delete(p.id));
      if (this.selectedPhotos.size === 0) this.selectionMode = false;
    } else {
      group.photos.forEach((p: any) => this.selectedPhotos.add(p.id));
    }
  }

  isAllSelected(): boolean {
    if (this.photos.length === 0) return false;
    return this.photos.every(p => this.selectedPhotos.has(p.id));
  }

  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.selectedPhotos.clear();
      this.selectionMode = false;
    } else {
      this.photos.forEach(p => this.selectedPhotos.add(p.id));
    }
  }
  
  onPhotoClick(photo: any) {
    if (this.pickingCoverForAlbumId) {
      this.setPhotoAsCover(this.pickingCoverForAlbumId, photo);
      return;
    }
    if (this.selectionMode) {
      this.toggleSelection(photo);
    } else {
      this.viewMode = 'feed';
      // Aquí se podría hacer scroll hacia la foto si quisieramos
    }
  }

  async setPhotoAsCover(albumId: number, photo: any) {
    try {
      this.showSuccess('Descargando imagen para la portada...');
      const blob = await this.api.downloadPhotoBlob(photo.id);
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        try {
          await this.api.uploadAlbumCover(albumId, base64data);
          this.pickingCoverForAlbumId = null;
          this.isAlbumsModalOpen = true; // Reabrir el modal para ver el cambio
          this.cdr.detectChanges();
          this.loadData();
          this.showSuccess('Portada actualizada');
        } catch(e) {
          this.showError('Error al actualizar la portada');
        }
      }
      reader.readAsDataURL(blob);
    } catch(e) {
      this.showError('Error al procesar la foto');
    }
  }

  cancelPickingCover() {
    this.pickingCoverForAlbumId = null;
    this.isAlbumsModalOpen = true; // Volvemos a abrir el modal de álbumes
    this.cdr.detectChanges(); // Forzamos actualización UI para que sea instantáneo
  }

  cancelSelection() {
    this.selectionMode = false;
    this.selectedPhotos.clear();
    
    if (this.addingToAlbumId) {
      const targetAlbum = this.albums.find(a => a.id === this.addingToAlbumId);
      this.addingToAlbumId = null;
      if (targetAlbum) {
        this.openAlbum(targetAlbum);
      }
    }
  }

  async downloadSelected() {
    const selectedIds = Array.from(this.selectedPhotos);
    this.showSuccess(`Descargando ${selectedIds.length} foto(s)...`);
    
    for (const photoId of selectedIds) {
      const photo = this.photos.find(p => p.id === photoId);
      if (photo) {
        await this.downloadPhoto(photo);
      }
    }
    
    this.cancelSelection();
  }

  async downloadPhoto(photo: any) {
    try {
      const blob = await this.api.downloadPhotoBlob(photo.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `love_photo_${photo.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      this.showSuccess('Imagen descargada');
    } catch (e) {
      console.error('Error al descargar:', e);
      this.showError('Error al descargar la imagen');
    }
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
      duration: 2500,
      color: 'success',
      position: 'top',
      icon: 'checkmark-circle-outline'
    });
    await toast.present();
  }

  async openAlbumOptions() {
    if (!this.currentAlbum) return;

    const actionSheet = await this.actionSheetCtrl.create({
      header: `Opciones: ${this.currentAlbum.name}`,
      cssClass: 'premium-action-sheet',
      buttons: [
        {
          text: 'Renombrar álbum',
          icon: 'pencil-outline',
          handler: () => {
            this.promptRenameAlbum();
          }
        },
        {
          text: 'Cambiar portada',
          icon: 'camera',
          handler: () => {
            this.changeAlbumCover(this.currentAlbum.id, new Event('click'));
          }
        },
        {
          text: 'Eliminar álbum',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => {
            this.promptDeleteAlbum();
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

  async promptRenameAlbum() {
    const alert = await this.alertController.create({
      header: 'Renombrar Álbum',
      cssClass: 'custom-love-alert',
      inputs: [
        {
          name: 'name',
          type: 'text',
          value: this.currentAlbum.name,
          placeholder: 'Nuevo nombre'
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (data.name && data.name.trim().length > 0) {
              try {
                const updated = await this.api.updateAlbum(this.currentAlbum.id, data.name.trim());
                this.currentAlbum.name = updated.name;
                const idx = this.albums.findIndex(a => a.id === this.currentAlbum.id);
                if (idx !== -1) this.albums[idx].name = updated.name;
                this.showSuccess('Álbum renombrado');
              } catch (e) {
                this.showError('Error al renombrar el álbum');
              }
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async promptDeleteAlbum() {
    const alert = await this.alertController.create({
      header: 'Eliminar Álbum',
      message: '¿Estás seguro? Las fotos exclusivas de este álbum también se borrarán.',
      cssClass: 'custom-love-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.api.deleteAlbum(this.currentAlbum.id);
              this.albums = this.albums.filter(a => a.id !== this.currentAlbum.id);
              this.clearAlbum();
              this.showSuccess('Álbum eliminado');
            } catch (e) {
              this.showError('Error al eliminar el álbum');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteSelectedPhotos() {
    if (this.selectedPhotos.size === 0) return;

    const alert = await this.alertController.create({
      header: 'Eliminar Fotos',
      message: `¿Estás seguro de eliminar ${this.selectedPhotos.size} foto(s)?`,
      cssClass: 'custom-love-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            let successCount = 0;
            for (const id of Array.from(this.selectedPhotos)) {
              try {
                await this.api.deletePhoto(id);
                this.photos = this.photos.filter(p => p.id !== id);
                successCount++;
              } catch (e) {
                console.error('Error al borrar foto', id, e);
              }
            }
            this.selectedPhotos.clear();
            this.selectionMode = false;
            this.groupPhotosByDate();
            this.groupPhotosForGallery();
            if (successCount > 0) {
              this.showSuccess(`Se han borrado ${successCount} fotos.`);
            }
          }
        }
      ]
    });
    await alert.present();
  }
}
