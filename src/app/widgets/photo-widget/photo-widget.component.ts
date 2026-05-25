import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { LoveApiService } from '../../services/love-api.service';
import { environment } from '../../../environments/environment';

// ... (Resto del decorador y imports no cambian, los saltamos por ahora, inyectaremos el AlertController abajo)

@Component({
  selector: 'app-photo-widget',
  template: `
    <div class="photo-widget-container">
      <div class="header">
        <div class="streak-badge" *ngIf="coupleInfo">
          <span class="streak-icon">🔥</span>
          <span class="streak-text">{{ coupleInfo.current_streak }} días</span>
        </div>
        <h2 class="title albums-btn" (click)="openAlbumsModal()">
          Nuestro Álbum <ion-icon name="chevron-down-outline" style="font-size: 1.2rem;"></ion-icon>
        </h2>
      </div>

      <div class="photos-list" *ngIf="groupedPhotos.length > 0; else noPhotos">
        <div *ngFor="let group of groupedPhotos" class="date-group">
          
          <div class="date-header">
            <span class="date-line"></span>
            <span class="date-text">{{ group.date }}</span>
            <span class="date-line"></span>
          </div>

          <div class="photo-card" *ngFor="let photo of group.photos">
            <div class="image-wrapper">
              <img [src]="environment.storageUrl + photo.image_path" class="main-photo" />
            </div>
            
            <div class="photo-details">
              <p *ngIf="photo.description" class="description"><strong>{{photo.user.name}}:</strong> {{photo.description}}</p>
              
              <div class="reactions-list" *ngIf="photo.reactions?.length">
                <span class="reaction-bubble" *ngFor="let r of photo.reactions">{{r.content}}</span>
              </div>

              <div class="actions">
                <button class="reaction-btn" (click)="react(photo.id, '❤️')">❤️</button>
                <button class="reaction-btn" (click)="react(photo.id, '😍')">😍</button>
                <button class="reaction-btn" (click)="react(photo.id, '😂')">😂</button>
              </div>

              <div class="reply-box">
                <input type="text" [(ngModel)]="replyTexts[photo.id]" placeholder="Escribe un mensaje para el chat..." (keyup.enter)="replyWithText(photo.id)" />
                <button class="send-reply-btn" (click)="replyWithText(photo.id)" [disabled]="!replyTexts[photo.id]"><ion-icon name="send"></ion-icon></button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <ng-template #noPhotos>
        <div class="empty-state">
          <ion-icon name="images-outline" class="empty-icon"></ion-icon>
          <p>No hay fotos aún.<br>¡Sube una para empezar la racha!</p>
        </div>
      </ng-template>

      <!-- Pantalla superpuesta de Colecciones (Modal) -->
      <ion-modal [isOpen]="isAlbumsModalOpen" (didDismiss)="closeAlbumsModal()" initialBreakpoint="0.75" [breakpoints]="[0, 0.75, 1]">
        <ng-template>
          <div class="albums-modal-content">
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
              
              <div class="album-item" *ngFor="let album of albums">
                <div class="album-cover">
                  <ion-icon name="heart" style="color: white; font-size: 2rem;"></ion-icon>
                </div>
                <span class="album-name">{{ album.name }}</span>
              </div>
            </div>
          </div>
        </ng-template>
      </ion-modal>

    </div>
  `,
  styles: [`
    .photo-widget-container { padding: 15px; height: 100%; display: flex; flex-direction: column; background: linear-gradient(135deg, #fff5f8 0%, #ffe3e9 100%); font-family: 'Inter', sans-serif; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .title { margin: 0; font-size: 1.4rem; font-weight: 800; color: #590D22; letter-spacing: -0.5px; }
    .albums-btn { display: flex; align-items: center; gap: 5px; cursor: pointer; background: rgba(255, 77, 109, 0.1); padding: 8px 14px; border-radius: 20px; transition: all 0.2s; }
    .albums-btn:active { transform: scale(0.95); background: rgba(255, 77, 109, 0.2); }
    
    .streak-badge { background: linear-gradient(90deg, #FF4D6D, #ff758c); color: white; padding: 6px 14px; border-radius: 25px; font-weight: 700; display: flex; align-items: center; gap: 5px; box-shadow: 0 4px 15px rgba(255, 77, 109, 0.4); animation: pulse 2s infinite; }
    .streak-icon { font-size: 1.2rem; }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
    
    .photos-list { flex: 1; overflow-y: auto; padding-bottom: 10px; }
    .photos-list::-webkit-scrollbar { width: 0px; }
    
    .date-header { display: flex; align-items: center; justify-content: center; margin: 15px 0 25px 0; }
    .date-text { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(5px); padding: 6px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; color: #a4133c; margin: 0 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); text-transform: capitalize; }
    .date-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(255, 77, 109, 0.3), transparent); }

    
    .photo-card { max-width: 500px; margin: 0 auto 25px auto; background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid rgba(255,255,255,0.8); transition: transform 0.3s ease; }
    .photo-card:hover { transform: translateY(-5px); }
    .image-wrapper { width: 100%; max-height: 450px; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #fff5f8; }
    .main-photo { width: 100%; height: 100%; max-height: 450px; object-fit: contain; display: block; }
    
    .photo-details { padding: 16px; }
    .description { margin: 0 0 10px 0; color: #444; font-size: 0.95rem; line-height: 1.4; }
    
    .reactions-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px; }
    .reaction-bubble { background: rgba(255, 255, 255, 0.9); padding: 4px 10px; border-radius: 15px; font-size: 1.1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    
    .actions { display: flex; justify-content: center; gap: 15px; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 15px; margin-bottom: 15px; }
    .reaction-btn { background: #fff; border: none; border-radius: 50%; width: 45px; height: 45px; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.06); transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    .reaction-btn:hover { transform: scale(1.2); box-shadow: 0 6px 15px rgba(255, 77, 109, 0.2); }
    
    .reply-box { display: flex; gap: 10px; align-items: center; background: rgba(255,255,255,0.8); padding: 8px; border-radius: 20px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.05); }
    .reply-box input { flex: 1; border: none; background: transparent; padding: 8px 12px; outline: none; font-size: 0.95rem; color: #444; }
    .send-reply-btn { background: #FF4D6D; color: white; border: none; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; }
    .send-reply-btn:hover:not(:disabled) { transform: scale(1.1); background: #c9184a; }
    .send-reply-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .empty-state { text-align: center; color: #a08c92; padding: 40px 20px; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .empty-icon { font-size: 4rem; margin-bottom: 15px; color: #ffb3c1; opacity: 0.8; }
    
    .albums-modal-content { padding: 20px; background: #fff5f8; height: 100%; border-radius: 25px 25px 0 0; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
    .modal-header h2 { margin: 0; font-size: 1.6rem; font-weight: 800; color: #590D22; }
    .close-btn { background: rgba(0,0,0,0.05); border: none; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; cursor: pointer; }
    
    .albums-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 15px; }
    .album-item { display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; transition: transform 0.2s; }
    .album-item:active { transform: scale(0.95); }
    .album-cover { width: 100%; aspect-ratio: 1; border-radius: 20px; background: linear-gradient(135deg, #FF4D6D, #c9184a); box-shadow: 0 5px 15px rgba(255, 77, 109, 0.3); display: flex; align-items: center; justify-content: center; }
    .album-cover.empty { background: white; border: 2px dashed #ffb3c1; box-shadow: none; color: #FF4D6D; font-size: 2.5rem; }
    .album-name { font-size: 0.9rem; font-weight: 700; color: #590D22; text-align: center; }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class PhotoWidgetComponent implements OnInit {
  private api = inject(LoveApiService);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);
  public environment = environment;
  
  photos: any[] = [];
  groupedPhotos: { date: string, photos: any[] }[] = [];
  albums: any[] = [];
  coupleInfo: any = null;
  uploading = false;
  
  isAlbumsModalOpen = false;

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    try {
      this.coupleInfo = await this.api.getCoupleInfo();
      this.photos = await this.api.getPhotos();
      this.groupPhotosByDate();
      this.albums = await this.api.getAlbums().catch(() => []); // Ignorar error si backend no está actualizado
    } catch (e) {
      console.error(e);
      this.showError('Error al cargar las fotos o tu pareja. Comprueba la conexión.');
    }
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

  async createNewAlbum() {
    const alert = await this.alertController.create({
      header: 'Nueva Colección',
      message: 'Dale un nombre a este álbum especial (ej. "Viaje a París", "Nuestro Aniversario").',
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
      this.loadData(); // recargar
    } catch (e) {
      console.error(e);
      this.showError('No se pudo guardar la reacción.');
    }
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

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.uploading = true;
      try {
        await this.api.uploadPhoto(file, '');
        this.loadData();
        this.showSuccess('¡Recuerdo subido con éxito!');
      } catch (e: any) {
        console.error('Error completo:', e);
        let errorMsg = 'Ocurrió un problema al subir la foto.';
        
        // Extraer los mensajes de validación (422) de Laravel si existen
        if (e.error && e.error.errors) {
          const firstErrorKey = Object.keys(e.error.errors)[0];
          errorMsg = e.error.errors[firstErrorKey][0];
        } else if (e.error && e.error.message) {
          errorMsg = e.error.message;
        }
        
        this.showError(errorMsg);
      } finally {
        this.uploading = false;
        event.target.value = ''; // reset input
      }
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
}
