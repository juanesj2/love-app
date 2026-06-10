import { Component, inject, OnInit } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController, ActionSheetController, ModalController } from '@ionic/angular';
import { LoveApiService } from '../../services/love-api.service';
import { environment } from '../../../environments/environment';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { addIcons } from 'ionicons';
import { arrowBack, chevronDownOutline, add, list, grid, downloadOutline, send, checkmarkCircle, ellipseOutline, imagesOutline, camera, close, download, heart, addCircle, checkmarkDoneOutline, trashOutline, settingsOutline, pencilOutline } from 'ionicons/icons';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

// ... (Resto del decorador y imports no cambian, los saltamos por ahora, inyectaremos el AlertController abajo)

@Component({
  selector: 'app-photo-widget',
  template: `
    <div class="photo-widget-container">
      <div class="header">
        <div class="streak-badge" *ngIf="coupleInfo && !currentAlbum">
          <span class="streak-icon">🔥</span>
          <span class="streak-text">{{ coupleInfo.current_streak }} días</span>
        </div>
        <div class="streak-badge back-badge" *ngIf="currentAlbum" (click)="clearAlbum()" style="background: rgba(0,0,0,0.05); color: #590D22; cursor: pointer;">
          <ion-icon name="arrow-back"></ion-icon>
          <span class="streak-text">Atrás</span>
        </div>
        <div class="header-actions">
          <h2 class="title albums-btn" (click)="openAlbumsModal()">
            {{ currentAlbum ? currentAlbum.name : 'Nuestros Álbums' }} <ion-icon name="chevron-down-outline" style="font-size: 1.2rem;"></ion-icon>
          </h2>
          <button class="header-icon-btn" *ngIf="currentAlbum" (click)="openAlbumOptions()">
            <ion-icon name="settings-outline"></ion-icon>
          </button>
          <button class="header-icon-btn" (click)="activateSelectionMode()" *ngIf="currentAlbum && photos.length > 0">
            <ion-icon name="checkmark-done-outline"></ion-icon>
          </button>
          <button *ngIf="currentAlbum" class="header-upload-btn" (click)="uploadNewPhoto()">
            <ion-icon name="add"></ion-icon>
          </button>
        </div>
      </div>

      <div class="custom-toggle-container" *ngIf="!currentAlbum">
        <div class="toggle-pill" [class.active]="viewMode === 'feed'" (click)="viewMode = 'feed'">
          <ion-icon name="list"></ion-icon> Feed
        </div>
        <div class="toggle-pill" [class.active]="viewMode === 'grid'" (click)="viewMode = 'grid'">
          <ion-icon name="grid"></ion-icon> Galería
        </div>
      </div>

      <ion-content class="scroll-content">
        <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
          <ion-refresher-content></ion-refresher-content>
        </ion-refresher>

        <div class="photos-list" *ngIf="groupedPhotos.length > 0 && viewMode === 'feed'; else noFeedPhotos">
          <div *ngFor="let group of groupedPhotos" class="date-group">
            
            <div class="date-header">
              <span class="date-line"></span>
              <span class="date-text">{{ group.date }}</span>
              <span class="date-line"></span>
            </div>

          <div class="photo-card" *ngFor="let photo of group.photos">
            <div class="card-header">
              <div class="card-user-info">
                <img *ngIf="avatars[photo.user?.name]" [src]="avatars[photo.user.name]" class="card-avatar" />
                <div *ngIf="!avatars[photo.user?.name]" class="card-avatar-fallback">{{ photo.user?.name?.charAt(0) || 'U' }}</div>
                <span class="card-username">{{photo.user?.name}}</span>
              </div>
              <button *ngIf="isMine(photo)" class="delete-post-btn" (click)="deletePhoto(photo)">
                <ion-icon name="trash-outline"></ion-icon>
              </button>
            </div>
            
            <div class="image-wrapper">
              <ion-img [src]="environment.storageUrl + photo.image_path" class="main-photo"></ion-img>
            </div>
            
            <div class="photo-details">
              <p *ngIf="photo.description" class="description">{{photo.description}}</p>
              
              <div class="reactions-list" *ngIf="photo.reactions?.length">
                <span class="reaction-bubble" *ngFor="let r of photo.reactions">{{r.content}}</span>
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

        <!-- VISTA GRID (GALERÍA) -->
        <ng-container *ngIf="viewMode === 'grid'">
          <div class="selection-top-bar" *ngIf="selectionMode">
             <div class="select-all-wrapper" (click)="toggleSelectAll()">
               <ion-icon name="checkmark-circle" *ngIf="isAllSelected()" color="primary"></ion-icon>
               <ion-icon name="ellipse-outline" *ngIf="!isAllSelected()"></ion-icon>
               <span>Seleccionar todo</span>
             </div>
          </div>

          <div *ngFor="let group of galleryGroups" class="gallery-month-group">
            <div class="month-header">
              <h3 class="gallery-month-title">{{ group.monthYear }}</h3>
              <div class="select-month-wrapper" *ngIf="selectionMode" (click)="toggleSelectMonth(group)">
                <ion-icon name="checkmark-circle" *ngIf="isMonthSelected(group)" color="primary"></ion-icon>
                <ion-icon name="ellipse-outline" *ngIf="!isMonthSelected(group)"></ion-icon>
              </div>
            </div>
            <div class="grid-view">
              <div class="grid-photo-container" *ngFor="let photo of group.photos" 
                   (mousedown)="startPress(photo)" (mouseup)="endPress()" (mouseleave)="endPress()"
                   (touchstart)="startPress(photo)" (touchend)="endPress()"
                   (click)="onPhotoClick(photo)"
                   [class.selected]="selectedPhotos.has(photo.id)">
                <ion-img [src]="environment.storageUrl + photo.image_path" class="grid-photo"></ion-img>
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
        </ng-container>

        <ion-infinite-scroll (ionInfinite)="loadMore($event)">
          <ion-infinite-scroll-content loadingSpinner="bubbles" loadingText="Cargando más fotos..."></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </ion-content>

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
        <button class="selection-btn delete" *ngIf="!addingToAlbumId" (click)="deleteSelectedPhotos()" [disabled]="selectedPhotos.size === 0" style="color: #FF4D6D; background: rgba(255, 77, 109, 0.1);">
          <ion-icon name="trash-outline"></ion-icon>
        </button>
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

    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
    .photo-widget-container { padding: 15px; height: 100%; display: flex; flex-direction: column; background: linear-gradient(135deg, #fff5f8 0%, #ffe3e9 100%); font-family: 'Inter', sans-serif; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .header-actions { display: flex; align-items: center; gap: 10px; }
    .title { margin: 0; font-size: 1.4rem; font-weight: 800; color: #590D22; letter-spacing: -0.5px; }
    .header-upload-btn { background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; border: none; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 77, 109, 0.4); transition: transform 0.2s; }
    .header-upload-btn:active { transform: scale(0.9); }
    .header-icon-btn { background: rgba(0,0,0,0.05); color: #590D22; border: none; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; cursor: pointer; transition: transform 0.2s; }
    .header-icon-btn:active { transform: scale(0.9); }
    .albums-btn { display: flex; align-items: center; gap: 5px; cursor: pointer; background: rgba(255, 77, 109, 0.1); padding: 8px 14px; border-radius: 20px; transition: all 0.2s; }
    .albums-btn:active { transform: scale(0.95); background: rgba(255, 77, 109, 0.2); }
    
    .custom-toggle-container { display: flex; background: rgba(255,255,255,0.6); padding: 5px; border-radius: 30px; margin: 0 10px 15px 10px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.05); }
    .toggle-pill { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 0; border-radius: 25px; font-weight: 700; color: #888; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; }
    .toggle-pill.active { background: white; color: #FF4D6D; box-shadow: 0 4px 10px rgba(255,77,109,0.15); transform: scale(1.02); }
    
    .streak-badge { background: linear-gradient(90deg, #FF4D6D, #ff758c); color: white; padding: 6px 14px; border-radius: 25px; font-weight: 700; display: flex; align-items: center; gap: 5px; box-shadow: 0 4px 15px rgba(255, 77, 109, 0.4); animation: pulse 2s infinite; }
    .streak-icon { font-size: 1.2rem; }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
    
    .scroll-content { flex: 1; --background: transparent; }
    .photos-list { padding-bottom: 10px; }
    
    .date-header { display: flex; align-items: center; justify-content: center; margin: 15px 0 25px 0; }
    .date-text { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(5px); padding: 6px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; color: #a4133c; margin: 0 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); text-transform: capitalize; }
    .date-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(255, 77, 109, 0.3), transparent); }
    
    .gallery-month-group { margin-bottom: 25px; }
    .month-header { display: flex; justify-content: space-between; align-items: center; margin: 0 10px 10px 10px; border-bottom: 2px solid rgba(255, 77, 109, 0.2); padding-bottom: 5px; }
    .gallery-month-title { margin: 0; font-size: 1.1rem; font-weight: 800; color: #590D22; text-transform: capitalize; }
    .select-month-wrapper { font-size: 1.5rem; color: #FF4D6D; cursor: pointer; display: flex; align-items: center; }
    
    .selection-top-bar { display: flex; justify-content: flex-end; padding: 0 10px 10px 10px; margin-bottom: 10px; }
    .select-all-wrapper { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #FF4D6D; cursor: pointer; font-size: 1.1rem; }
    .select-all-wrapper ion-icon { font-size: 1.5rem; }

    .grid-view { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding: 0 10px; }
    .grid-photo-container { position: relative; width: 100%; aspect-ratio: 1; cursor: pointer; overflow: hidden; border-radius: 8px; transition: all 0.2s; animation: scaleIn 0.4s ease-out forwards; opacity: 0; transform: scale(0.9); }
    @keyframes scaleIn { to { opacity: 1; transform: scale(1); } }
    
    .photo-card { animation: fadeInUp 0.5s ease-out forwards; opacity: 0; transform: translateY(20px); }
    @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
    
    ion-img::part(image) { transition: transform 0.3s ease; }
    .photo-card:active ion-img::part(image) { transform: scale(0.98); }
    .grid-photo { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
    .grid-photo-container:active .grid-photo { transform: scale(0.95); }
    .grid-photo-container.selected { border: 3px solid #FF4D6D; transform: scale(0.95); }
    .grid-overlay { position: absolute; bottom: 3px; right: 3px; background: rgba(255,255,255,0.85); border-radius: 12px; padding: 1px 4px; font-size: 0.7rem; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
    .selection-overlay { position: absolute; top: 5px; right: 5px; font-size: 1.5rem; color: #FF4D6D; background: rgba(255,255,255,0.8); border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
    
    .photo-card { max-width: 500px; margin: 0 auto 25px auto; background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid rgba(255,255,255,0.8); transition: transform 0.3s ease; }
    .photo-card:hover { transform: translateY(-5px); }
    .card-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid rgba(0,0,0,0.03); }
    .card-user-info { display: flex; align-items: center; gap: 10px; }
    .card-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid #FF4D6D; }
    .card-avatar-fallback { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem; }
    .card-username { font-weight: 700; color: #590D22; font-size: 0.95rem; text-transform: capitalize; }
    .delete-post-btn { background: none; border: none; color: #ffb3c1; font-size: 1.2rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
    .delete-post-btn:hover { color: #FF4D6D; transform: scale(1.1); }
    .image-wrapper { width: 100%; max-height: 450px; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #fff5f8; }
    .main-photo { width: 100%; height: 100%; max-height: 450px; object-fit: contain; display: block; }
    
    .photo-details { padding: 16px; }
    .description { margin: 0 0 10px 0; color: #444; font-size: 0.95rem; line-height: 1.4; }
    
    .reactions-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px; }
    .reaction-bubble { background: rgba(255, 255, 255, 0.9); padding: 4px 10px; border-radius: 15px; font-size: 1.1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    
    .actions { display: flex; justify-content: center; gap: 15px; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 15px; margin-bottom: 15px; }
    .reaction-btn { background: #fff; border: none; border-radius: 50%; width: 45px; height: 45px; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.06); transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    .reaction-btn:hover { transform: scale(1.2); box-shadow: 0 6px 15px rgba(255, 77, 109, 0.2); }
    .reaction-btn.custom-reaction { font-size: 1.2rem; color: #ffb3c1; border: 1px dashed #ffb3c1; }
    .reaction-btn.download-btn { font-size: 1.2rem; color: #590D22; border: 1px solid rgba(0,0,0,0.1); }
    
    .reply-box { display: flex; gap: 10px; align-items: center; background: rgba(255,255,255,0.8); padding: 8px; border-radius: 20px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.05); }
    .reply-box input { flex: 1; border: none; background: transparent; padding: 8px 12px; outline: none; font-size: 0.95rem; color: #444; }
    .send-reply-btn { background: #FF4D6D; color: white; border: none; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; }
    .send-reply-btn:hover:not(:disabled) { transform: scale(1.1); background: #c9184a; }
    .send-reply-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .empty-state { text-align: center; color: #a08c92; padding: 40px 20px; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
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

    /* Custom Upload Prompt */
    .prompt-sheet { padding-bottom: 30px; }
    .prompt-body { display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; }
    .prompt-preview-container { width: 100%; display: flex; justify-content: center; background: #fff5f8; border-radius: 15px; overflow: hidden; max-height: 250px; }
    .prompt-preview { max-width: 100%; max-height: 250px; object-fit: contain; }
    .premium-textarea { width: 100%; min-height: 100px; border: 2px solid rgba(255, 77, 109, 0.2); border-radius: 15px; padding: 15px; font-size: 1rem; color: #590D22; background: rgba(255, 255, 255, 0.8); resize: none; outline: none; transition: border-color 0.3s; }
    .premium-textarea:focus { border-color: #FF4D6D; }
    .premium-textarea::placeholder { color: #a08c92; }
    
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
  public environment = environment;
  
  pendingPhotoFile: File | null = null;
  pendingPhotoPreview: string = '';
  pendingPhotoText: string = '';

  viewMode: 'feed' | 'grid' = 'feed';
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
  avatars: { [key: string]: string } = {};
  private firestore = inject(Firestore);

  constructor() {
    addIcons({ arrowBack, chevronDownOutline, add, list, grid, downloadOutline, send, checkmarkCircle, ellipseOutline, imagesOutline, camera, close, download, heart, addCircle, checkmarkDoneOutline, trashOutline, settingsOutline, pencilOutline });
  }

  ngOnInit() {
    this.loadAvatars();
    this.loadData();
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
        this.groupPhotosForGallery();
        if (!this.currentAlbum) {
          await Preferences.set({ key: 'feed_photos_cache', value: JSON.stringify(this.photos) });
        }
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
      this.groupPhotosForGallery();
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

  async changeAlbumCover(albumId: number, event: Event) {
    event.stopPropagation();
    
    try {
      const source = Capacitor.getPlatform() === 'web' ? CameraSource.Photos : CameraSource.Prompt;
      const image = await Camera.getPhoto({
        quality: 60, width: 600, height: 600, allowEditing: true, resultType: CameraResultType.DataUrl, source: source
      });
      
      if (image.dataUrl) {
        // @ts-ignore
        await this.api.updateAlbumCover(albumId, image.dataUrl);
        this.loadData();
        this.showSuccess('Portada actualizada');
      }
    } catch (e) {
      console.log('User cancelled or error', e);
    }
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
      // Preguntar si quiere tomar/subir foto o elegir de la app
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
            text: 'Subir nueva',
            icon: 'cloud-upload',
            handler: () => {
              this.takeAndUploadPhoto();
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
      this.takeAndUploadPhoto();
    }
  }

  async takeAndUploadPhoto() {
    try {
      const source = Capacitor.getPlatform() === 'web' ? CameraSource.Photos : CameraSource.Prompt;
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
    if (this.selectionMode) {
      this.toggleSelection(photo);
    } else {
      this.viewMode = 'feed';
      // Aquí se podría hacer scroll hacia la foto si quisieramos
    }
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
          icon: 'trash',
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
