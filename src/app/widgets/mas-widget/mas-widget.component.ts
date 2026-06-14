import { Component, inject, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { App } from '@capacitor/app';
import { PluginListenerHandle } from '@capacitor/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonRefresher, IonRefresherContent, IonIcon, ToastController, ActionSheetController, AlertController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { LoveApiService } from '../../services/love-api.service';
import { TutorialService } from '../../services/tutorial.service';
import { Preferences } from '@capacitor/preferences';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { LocationService } from '../../services/location.service';
import { addIcons } from 'ionicons';
import { logOutOutline, timeOutline, settingsOutline, heart, flagOutline, addCircleOutline, gameControllerOutline, starOutline, checkmarkCircle, ellipseOutline, personCircleOutline, moonOutline, closeCircle, calendar, restaurantOutline, filmOutline, star, cameraOutline, pencilOutline, add, trophyOutline, sparklesOutline } from 'ionicons/icons';

@Component({
  selector: 'app-mas-widget',
  template: `
    <ion-content class="scroll-content">
      <ng-template #staticStars let-rating="rating">
        <div style="display: flex; gap: 2px;">
          <div class="star" [class.is-active]="s <= rating" *ngFor="let s of [1,2,3,4,5]" style="width: 24px; height: 24px; cursor: default;">
            <div class="svg-container">
              <svg xmlns="http://www.w3.org/2000/svg" class="svg-outline" viewBox="0 0 24 24"><path d="M12 2.5L9.45 8.5L3 9.06L7.725 13.39L6.25 19.82L12 16.5L17.75 19.82L16.275 13.39L21 9.06L14.55 8.5L12 2.5ZM12 4.75L14 9.33L18.7 9.75L15 13.07L16.18 17.75L12 15.16L7.82 17.75L9 13.07L5.3 9.75L10 9.33L12 4.75Z"></path></svg>
              <svg xmlns="http://www.w3.org/2000/svg" class="svg-filled" viewBox="0 0 24 24"><path d="M12 2.5L9.45 8.5L3 9.06L7.725 13.39L6.25 19.82L12 16.5L17.75 19.82L16.275 13.39L21 9.06L14.55 8.5L12 2.5Z"></path></svg>
            </div>
          </div>
        </div>
      </ng-template>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <div class="mas-container">
        <div class="header">
          <h2 class="title">Panel de Control ✨</h2>
          <p class="subtitle">Gestiona tu experiencia</p>
        </div>

        <!-- Nuestro Tiempo -->
        <div class="glass-card" id="nuestro-tiempo">
          <div class="section-title">
            <ion-icon name="time-outline"></ion-icon>
            <h3>Nuestro Tiempo Juntos</h3>
          </div>
          
          <div class="date-picker-glass">
            <label>¿Cuándo empezó nuestra historia?</label>
            <div class="date-input-wrapper">
              <input type="datetime-local" class="glass-input" [(ngModel)]="startDate" (change)="saveStartDate()" />
            </div>
          </div>

          <div class="live-counter" *ngIf="startDate">
            <div class="heart-pulse">
              <ion-icon name="heart"></ion-icon>
            </div>
            <div class="time-grid">
              <div class="time-block" *ngIf="timeTogether.years > 0">
                <span class="value">{{ timeTogether.years }}</span>
                <span class="label">Años</span>
              </div>
              <div class="time-block" *ngIf="timeTogether.months > 0 || timeTogether.years > 0">
                <span class="value">{{ timeTogether.months }}</span>
                <span class="label">Meses</span>
              </div>
              <div class="time-block">
                <span class="value">{{ timeTogether.days }}</span>
                <span class="label">Días</span>
              </div>
              <div class="time-block">
                <span class="value">{{ timeTogether.hours }}</span>
                <span class="label">Horas</span>
              </div>
              <div class="time-block">
                <span class="value">{{ timeTogether.minutes }}</span>
                <span class="label">Min</span>
              </div>
              <div class="time-block highlight">
                <span class="value">{{ timeTogether.seconds }}</span>
                <span class="label">Seg</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Próximos Eventos -->
        <div class="glass-card" id="mas-eventos">
          <div class="section-title">
            <ion-icon name="calendar"></ion-icon>
            <h3>Próximos Eventos Especiales</h3>
          </div>
          
          <div class="milestone-list">
            <div class="milestone-item" *ngFor="let ev of annualEvents" (click)="openEventModal(ev)">
              <ion-icon [name]="ev.icon" class="event-icon text-pink"></ion-icon>
              <div class="milestone-info" style="margin-left: 10px;">
                <span class="m-title">{{ ev.name }}</span>
                <span class="m-date">{{ ev.dateStr }}</span>
              </div>
              <div class="m-days" *ngIf="ev.daysLeft > 0">Faltan {{ ev.daysLeft }} d</div>
              <div class="m-days" *ngIf="ev.daysLeft === 0">¡Hoy!</div>
            </div>
          </div>



          <div class="date-picker-glass" style="margin-top: 15px;">
            <label>Mi cumpleaños</label>
            <div class="date-input-wrapper">
              <input type="date" class="glass-input" [(ngModel)]="myBirthday" (change)="saveBirthdays()" />
            </div>
            <label style="margin-top: 10px;">Cumple de mi pareja</label>
            <div class="date-input-wrapper">
              <input type="date" class="glass-input" [(ngModel)]="partnerBirthday" (change)="saveBirthdays()" />
            </div>
          </div>
        </div>

        <!-- Hitos -->
        <div class="glass-card" id="mas-hitos">
          <div class="section-title">
            <ion-icon name="flag-outline"></ion-icon>
            <h3>Hitos Importantes</h3>
          </div>
          
          <div class="milestone-list">
            <div class="milestone-item" *ngFor="let m of milestones" (click)="openMilestoneModal(m)">
              <div class="milestone-indicator"></div>
              <div class="milestone-info">
                <span class="m-title">{{ m.title }}</span>
                <span class="m-date">{{ m.date | date:'longDate' }}</span>
              </div>
              <div class="m-days">{{ calculateDays(m.date) }} d</div>
              <ion-icon name="close-circle" class="delete-icon" (click)="deleteMilestone(m.id); $event.stopPropagation()"></ion-icon>
            </div>
          </div>

          <div class="add-glass">
            <input type="text" placeholder="Ej: Viaje a París" [(ngModel)]="newMilestoneTitle" class="glass-input" />
            <input type="date" [(ngModel)]="newMilestoneDate" class="glass-input" />
            <button class="glass-btn" (click)="addMilestone()"><ion-icon name="add-circle-outline"></ion-icon> Añadir Hito</button>
          </div>
        </div>

        <!-- Cubo de Deseos -->
        <div class="glass-card" id="mas-deseos">
          <div class="section-title">
            <ion-icon name="star-outline"></ion-icon>
            <h3>Cubo de Deseos</h3>
          </div>
          <p class="desc">Planes de futuro y cosas que queréis hacer juntos.</p>
          
          <div class="bucket-list">
            <div class="bucket-item" *ngFor="let item of bucketList; let i = index" (click)="toggleBucketItem(i)" [class.is-done]="item.completed">
              <ion-icon [name]="item.completed ? 'checkmark-circle' : 'ellipse-outline'" class="check-icon"></ion-icon>
              <span class="b-text">{{ item.title }}</span>
              <ion-icon name="close-circle" class="delete-icon" (click)="deleteBucketItem(i, $event)"></ion-icon>
            </div>
          </div>

          <div class="add-glass">
            <input type="text" placeholder="Ej: Viajar a Japón..." [(ngModel)]="newBucketTitle" (keyup.enter)="addBucketItem()" class="glass-input" />
            <button class="glass-btn" (click)="addBucketItem()"><ion-icon name="add-circle-outline"></ion-icon> Añadir Deseo</button>
          </div>
        </div>

        <!-- Quick Actions Grid -->
        <div class="quick-actions-grid">
          <!-- Logros y Secretos (Spans full width) -->
          <div class="grid-card full-width interactive" id="mas-logros" (click)="goTo('achievements')">
            <h4><ion-icon name="trophy-outline" class="text-pink"></ion-icon> Logros y Secretos</h4>
            <p style="margin: 0; font-size: 0.85rem; color: #a4133c; font-weight: 500;">Descubre y desbloquea los secretitos de la app.</p>
          </div>

          <!-- Widget Config (Spans full width) -->
          <div class="grid-card full-width" id="mas-coleccion">
            <h4><ion-icon name="settings-outline" class="text-pink"></ion-icon> Colección del Widget</h4>
            <select [(ngModel)]="selectedAlbumId" (change)="saveSelectedAlbum()" class="glass-select">
              <option value="feed">Todas las fotos</option>
              <option *ngFor="let album of albums" [value]="album.id">{{ album.name }}</option>
            </select>
          </div>

          <!-- Tour Gastronómico -->
          <div class="grid-card interactive" id="mas-gastro" (click)="openFoodListModal()">
            <div class="icon-circle" style="background: linear-gradient(135deg, #FF9A9E, #FECFEF); box-shadow: 0 4px 15px rgba(255, 154, 158, 0.3); color: #c9184a;">
              <ion-icon name="restaurant-outline"></ion-icon>
            </div>
            <h4>Tour Gastro</h4>
            <span class="sub">Platos y sitios</span>
          </div>

          <!-- Cine en Pareja -->
          <div class="grid-card interactive" id="mas-cine" (click)="openMovieListModal()">
            <div class="icon-circle" style="background: linear-gradient(135deg, #a2d2ff, #bde0fe); box-shadow: 0 4px 15px rgba(162, 210, 255, 0.3); color: #023e8a;">
              <ion-icon name="film-outline"></ion-icon>
            </div>
            <h4>Cine Pareja</h4>
            <span class="sub">Pelis y series</span>
          </div>

          <!-- Minijuego -->
          <div class="grid-card interactive" id="mas-test" (click)="openGame()">
            <div class="icon-circle bg-purple">
              <ion-icon name="game-controller-outline"></ion-icon>
            </div>
            <h4>Test Pareja</h4>
            <span class="sub">Jugar a ciegas</span>
          </div>

          <!-- Perfil -->
          <div class="grid-card interactive" (click)="changeProfilePicture()">
            <div class="icon-circle bg-blue">
              <ion-icon name="person-circle-outline"></ion-icon>
            </div>
            <h4>Mi Avatar</h4>
            <span class="sub" *ngIf="!uploadingAvatar">Cambiar foto</span>
            <span class="sub" *ngIf="uploadingAvatar">Actualizando...</span>
          </div>
        </div>

        <!-- Logout -->
        <button class="logout-btn" (click)="confirmLogout()">
          <ion-icon name="log-out-outline"></ion-icon> Cerrar sesión
        </button>
      </div>

      <!-- Modal for Event Details -->
      <div class="custom-overlay" *ngIf="isEventModalOpen" (click)="isEventModalOpen = false">
        <div class="modal-content glass-card" style="margin: 20px; padding: 30px; text-align: center; width: 85%; max-width: 400px; box-sizing: border-box; border: none; background: rgba(255, 255, 255, 0.85); box-shadow: 0 10px 40px rgba(255, 77, 109, 0.15);" (click)="$event.stopPropagation()">
          <ion-icon [name]="selectedEvent?.icon" style="font-size: 4rem; color: #FF4D6D; margin-bottom: 15px; background: rgba(255,77,109,0.1); padding: 15px; border-radius: 50%;"></ion-icon>
          <h2 style="color: #590D22; margin-bottom: 5px; font-weight: 900; font-size: 1.5rem;">{{ selectedEvent?.name }}</h2>
          <p style="color: #a4133c; font-size: 1.1rem; font-weight: 700; margin-bottom: 25px;">
            {{ selectedEvent?.dateStr }}
          </p>
          
          <div style="background: rgba(255,77,109,0.1); border-radius: 18px; padding: 18px; margin-bottom: 25px;">
            <h3 *ngIf="selectedEvent?.daysLeft > 0" style="color: #FF4D6D; margin: 0; font-weight: 900; font-size: 1.2rem;">
              Faltan {{ selectedEvent?.daysLeft }} días
            </h3>
            <h3 *ngIf="selectedEvent?.daysLeft === 0" style="color: #FF4D6D; margin: 0; font-weight: 900; font-size: 1.2rem;">
              ¡Es hoy! 🎉
            </h3>
          </div>

          <button class="glass-btn" (click)="isEventModalOpen = false" style="width: 100%; padding: 15px; font-size: 1.1rem; border-radius: 14px;">
            Cerrar
          </button>
        </div>
      </div>

      <!-- Modal for Milestone Details -->
      <div class="custom-overlay" *ngIf="isMilestoneModalOpen" (click)="isMilestoneModalOpen = false">
        <div class="modal-content glass-card" style="margin: 20px; padding: 25px; text-align: center; width: 90%; max-width: 450px; box-sizing: border-box; border: none; background: rgba(255, 255, 255, 0.95); box-shadow: 0 10px 40px rgba(255, 77, 109, 0.15); max-height: 90vh; overflow-y: auto;" (click)="$event.stopPropagation()">
          
          <!-- Portada del Hito -->
          <div *ngIf="selectedMilestone?.image_url_full || selectedMilestone?.newImageBase64" class="milestone-cover" style="width: 100%; height: 180px; border-radius: 18px; margin-bottom: 20px; overflow: hidden; position: relative;">
            <img [src]="selectedMilestone?.newImageBase64 || selectedMilestone?.image_url_full" style="width: 100%; height: 100%; object-fit: cover;" />
            <div *ngIf="isEditingMilestone" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; cursor: pointer;" (click)="uploadMilestonePhoto()">
               <ion-icon name="camera-outline" style="color: white; font-size: 3rem;"></ion-icon>
            </div>
          </div>
          
          <ion-icon *ngIf="!selectedMilestone?.image_url_full && !selectedMilestone?.newImageBase64" name="flag" style="font-size: 4rem; color: #FF4D6D; margin-bottom: 15px; background: rgba(255,77,109,0.1); padding: 15px; border-radius: 50%;"></ion-icon>
          
          <h2 style="color: #590D22; margin-bottom: 5px; font-weight: 900; font-size: 1.6rem;">{{ selectedMilestone?.title }}</h2>
          <p style="color: #a4133c; font-size: 1.1rem; font-weight: 700; margin-bottom: 20px;">
            {{ selectedMilestone?.date | date:'longDate' }}
          </p>
          
          <div style="background: rgba(255,77,109,0.05); border-radius: 18px; padding: 18px; margin-bottom: 20px; text-align: center;">
            <p style="color: #800f2f; margin: 0; font-weight: 600; font-size: 1rem; line-height: 1.4; font-style: italic;">
              {{ getMilestonePhrase(selectedMilestone?.date) }}
            </p>
          </div>

          <!-- Mostrar Anécdota -->
          <div *ngIf="!isEditingMilestone" style="margin-bottom: 25px;">
            <p *ngIf="selectedMilestone?.story" style="color: #590D22; font-size: 1rem; line-height: 1.5; font-weight: 500; text-align: left; background: rgba(255,255,255,0.8); padding: 15px; border-radius: 14px; border: 1px solid rgba(255,77,109,0.2);">
              "{{ selectedMilestone.story }}"
            </p>
            <button *ngIf="!selectedMilestone?.story && !selectedMilestone?.image_url_full" class="glass-btn" style="background: rgba(255,77,109,0.1); color: #FF4D6D; width: auto; padding: 10px 20px; font-size: 0.9rem;" (click)="isEditingMilestone = true">
              <ion-icon name="pencil-outline"></ion-icon> Añadir un recuerdo
            </button>
            <button *ngIf="selectedMilestone?.story || selectedMilestone?.image_url_full" class="glass-btn" style="background: transparent; color: #a4133c; width: auto; padding: 5px 15px; font-size: 0.9rem; margin-top: 10px; border: none; box-shadow: none;" (click)="isEditingMilestone = true">
              <ion-icon name="create-outline"></ion-icon> Editar recuerdo
            </button>
          </div>

          <!-- Editar Anécdota y Foto -->
          <div *ngIf="isEditingMilestone" style="margin-bottom: 25px; text-align: left;">
            <button *ngIf="!selectedMilestone?.image_url_full && !selectedMilestone?.newImageBase64" class="glass-btn" style="width: 100%; margin-bottom: 15px; background: rgba(255,77,109,0.1); color: #FF4D6D;" (click)="uploadMilestonePhoto()">
              <ion-icon name="camera-outline"></ion-icon> Subir portada
            </button>
            <label style="color: #a4133c; font-weight: 700; font-size: 0.9rem; margin-bottom: 5px; display: block;">Nuestra historia</label>
            <textarea class="glass-input" rows="4" placeholder="Escribe aquí vuestra anécdota, cómo os sentisteis, etc." [(ngModel)]="selectedMilestone.story" style="width: 100%; border-radius: 14px; resize: none; margin-bottom: 15px;"></textarea>
            
            <div style="display: flex; gap: 10px;">
              <button class="glass-btn" style="flex: 1; background: rgba(128,15,47,0.1); color: #800f2f;" (click)="isEditingMilestone = false">Cancelar</button>
              <button class="glass-btn" style="flex: 1;" (click)="saveMilestoneChanges()">Guardar</button>
            </div>
          </div>

          <button *ngIf="!isEditingMilestone" class="glass-btn" (click)="isMilestoneModalOpen = false" style="width: 100%; padding: 15px; font-size: 1.1rem; border-radius: 14px;">
            Cerrar
          </button>
        </div>
      </div>

        <!-- Food List Modal -->
        <div class="custom-overlay" *ngIf="isFoodListModalOpen" (click)="isFoodListModalOpen = false">
          <div class="modal-content glass-card" id="tour-food-modal" style="margin: 20px; padding: 25px; text-align: center; width: 90%; max-width: 450px; box-sizing: border-box; border: none; background: rgba(255, 255, 255, 0.95); box-shadow: 0 10px 40px rgba(255, 77, 109, 0.15); max-height: 90vh; overflow-y: auto;" (click)="$event.stopPropagation()">
            <h2 style="color: #590D22; margin-bottom: 5px; font-weight: 900; font-size: 1.6rem;"><ion-icon name="restaurant-outline"></ion-icon> Tour Gastronómico</h2>
            <p style="color: #a4133c; font-size: 0.95rem; margin-bottom: 20px;">Restaurantes y platos que hemos probado</p>
            
            <div class="food-places-grid" id="tour-food-list" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
              <div class="food-place-item" *ngFor="let place of foodPlaces" (click)="openFoodPlaceModal(place)" style="background: rgba(255,255,255,0.8); border-radius: 14px; padding: 10px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); cursor: pointer;">
                <div class="place-image" [style.backgroundImage]="'url(' + (place.image_url_full || 'assets/default-food.png') + ')'" style="width: 100%; aspect-ratio: 1; border-radius: 10px; background-size: cover; background-position: center; margin: 0 auto 10px;"></div>
                <span class="p-title" style="display: block; font-weight: 700; color: #590D22; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ place.name }}</span>
                <span class="p-rating" style="color: #FFB703; font-size: 0.8rem;">
                  <ng-container *ngTemplateOutlet="staticStars; context: { rating: place.rating }"></ng-container>
                </span>
              </div>
            </div>
            
            <button class="glass-btn" id="tour-food-add" style="width: 100%; margin-bottom: 10px;" (click)="openAddFoodPlaceModal()">
              <ion-icon name="add-circle-outline"></ion-icon> Añadir Restaurante
            </button>
            <button class="glass-btn" style="width: 100%; background: rgba(128,15,47,0.1); color: #800f2f;" (click)="isFoodListModalOpen = false">Cerrar</button>
          </div>
        </div>

        <!-- Movies List Modal -->
        <div class="custom-overlay" *ngIf="isMovieListModalOpen" (click)="isMovieListModalOpen = false">
          <div class="modal-content glass-card" id="tour-movie-modal" style="margin: 20px; padding: 25px; text-align: center; width: 90%; max-width: 450px; box-sizing: border-box; border: none; background: rgba(255, 255, 255, 0.95); box-shadow: 0 10px 40px rgba(255, 77, 109, 0.15); max-height: 90vh; overflow-y: auto;" (click)="$event.stopPropagation()">
            <h2 style="color: #590D22; margin-bottom: 5px; font-weight: 900; font-size: 1.6rem;"><ion-icon name="film-outline"></ion-icon> Cine en Pareja</h2>
            <p style="color: #a4133c; font-size: 0.95rem; margin-bottom: 20px;">Películas y series que vemos juntos</p>
            
            <div class="movies-grid" id="tour-movie-list" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
              <div class="movie-item" *ngFor="let movie of movies" (click)="openMovieModal(movie)" style="background: rgba(255,255,255,0.8); border-radius: 10px; padding: 8px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); cursor: pointer;">
                <div class="movie-image" [style.backgroundImage]="'url(' + (movie.image_url_full || 'assets/default-movie.png') + ')'" style="width: 100%; aspect-ratio: 0.7; border-radius: 8px; background-size: cover; background-position: center; margin: 0 auto 8px;"></div>
                <span class="m-title" style="display: block; font-weight: 700; color: #590D22; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ movie.title }}</span>
                <span class="p-rating" style="color: #FFB703; font-size: 0.7rem;">
                  <ng-container *ngTemplateOutlet="staticStars; context: { rating: movie.rating }"></ng-container>
                </span>
              </div>
            </div>
            
            <button class="glass-btn" id="tour-movie-add" style="width: 100%; margin-bottom: 10px;" (click)="isAddingMovie = true">
              <ion-icon name="add-circle-outline"></ion-icon> Añadir Película/Serie
            </button>
            <button class="glass-btn" style="width: 100%; background: rgba(128,15,47,0.1); color: #800f2f;" (click)="isMovieListModalOpen = false">Cerrar</button>
          </div>
        </div>

        <!-- Add Food Place Modal -->
        <div class="custom-overlay" *ngIf="isAddingFoodPlace" (click)="isAddingFoodPlace = false">
          <div class="modal-content glass-card" style="margin: 20px; padding: 25px; text-align: center; width: 90%; max-width: 400px; box-sizing: border-box; border: none; background: rgba(255, 255, 255, 0.95); max-height: 90vh; overflow-y: auto;" (click)="$event.stopPropagation()">
            <h2 style="color: #590D22; margin-bottom: 20px; font-weight: 900;">Nuevo Restaurante 🍔</h2>
            
            <div *ngIf="newFoodPlace.imageBase64" class="milestone-cover" style="width: 100%; height: 150px; border-radius: 18px; margin-bottom: 20px; overflow: hidden; position: relative;">
              <img [src]="newFoodPlace.imageBase64" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; cursor: pointer;" (click)="uploadNewFoodPlacePhoto()">
                 <ion-icon name="camera-outline" style="color: white; font-size: 3rem;"></ion-icon>
              </div>
            </div>
            
            <button *ngIf="!newFoodPlace.imageBase64" class="glass-btn" style="margin-bottom: 15px;" (click)="uploadNewFoodPlacePhoto()">
              <ion-icon name="camera-outline"></ion-icon> Añadir Foto
            </button>
            
            <input type="text" placeholder="Nombre del sitio" [(ngModel)]="newFoodPlace.name" class="glass-input" style="width: 100%; margin-bottom: 10px;" />
            <input type="text" placeholder="Ubicación (ej: Madrid)" [(ngModel)]="newFoodPlace.location" class="glass-input" id="tour-food-location" style="width: 100%; margin-bottom: 10px;" />
            <textarea placeholder="¿Qué tal estaba? Plato estrella, etc." [(ngModel)]="newFoodPlace.description" class="glass-input" style="width: 100%; min-height: 80px; margin-bottom: 10px; resize: vertical;"></textarea>
            
            <div style="margin-bottom: 20px;">
              <p style="margin: 0 0 5px; color: #a4133c; font-weight: 600;">Puntuación:</p>
              <div style="display: flex; justify-content: center; gap: 5px;">
                <label title="Star" class="star" [class.is-active]="s <= newFoodPlace.rating" *ngFor="let s of [1,2,3,4,5]" (click)="newFoodPlace.rating = s; $event.preventDefault()">
                  <div class="svg-container">
                    <svg xmlns="http://www.w3.org/2000/svg" class="svg-outline" viewBox="0 0 24 24"><path d="M12 2.5L9.45 8.5L3 9.06L7.725 13.39L6.25 19.82L12 16.5L17.75 19.82L16.275 13.39L21 9.06L14.55 8.5L12 2.5ZM12 4.75L14 9.33L18.7 9.75L15 13.07L16.18 17.75L12 15.16L7.82 17.75L9 13.07L5.3 9.75L10 9.33L12 4.75Z"></path></svg>
                    <svg xmlns="http://www.w3.org/2000/svg" class="svg-filled" viewBox="0 0 24 24"><path d="M12 2.5L9.45 8.5L3 9.06L7.725 13.39L6.25 19.82L12 16.5L17.75 19.82L16.275 13.39L21 9.06L14.55 8.5L12 2.5Z"></path></svg>
                    <svg xmlns="http://www.w3.org/2000/svg" height="100" width="100" class="svg-celebrate"><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle></svg>
                  </div>
                </label>
              </div>
            </div>
            
            <div style="display: flex; gap: 10px;">
              <button class="glass-btn" style="flex: 1; background: rgba(128,15,47,0.1); color: #800f2f;" (click)="isAddingFoodPlace = false">Cancelar</button>
              <button class="glass-btn" style="flex: 1;" (click)="saveFoodPlace()">Guardar</button>
            </div>
          </div>
        </div>

        <!-- View Food Place Modal -->
        <div class="custom-overlay" *ngIf="isFoodPlaceModalOpen" (click)="isFoodPlaceModalOpen = false">
          <div class="modal-content glass-card" style="margin: 20px; padding: 25px; text-align: center; width: 90%; max-width: 450px; box-sizing: border-box; border: none; background: rgba(255, 255, 255, 0.95); box-shadow: 0 10px 40px rgba(255, 77, 109, 0.15); max-height: 90vh; overflow-y: auto;" (click)="$event.stopPropagation()">
            
            <div *ngIf="selectedFoodPlace?.image_url_full" class="milestone-cover" style="width: 100%; height: 180px; border-radius: 18px; margin-bottom: 20px; overflow: hidden; position: relative;">
              <img [src]="selectedFoodPlace?.image_url_full" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            
            <h2 style="color: #590D22; margin-bottom: 5px; font-weight: 900; font-size: 1.6rem;">{{ selectedFoodPlace?.name }}</h2>
            <p style="color: #a4133c; font-size: 1.1rem; font-weight: 700; margin-bottom: 10px;">
              {{ selectedFoodPlace?.location }}
            </p>
            <div style="color: #FFB703; font-size: 1.5rem; margin-bottom: 15px;">
                <ng-container *ngTemplateOutlet="staticStars; context: { rating: selectedFoodPlace?.rating }"></ng-container>
            </div>
            
            <p *ngIf="selectedFoodPlace?.description" style="color: #590D22; font-size: 1rem; line-height: 1.5; font-weight: 500; text-align: left; background: rgba(255,255,255,0.8); padding: 15px; border-radius: 14px; border: 1px solid rgba(255,77,109,0.2); margin-bottom: 20px;">
              "{{ selectedFoodPlace.description }}"
            </p>
            
            <div class="dishes-section" style="text-align: left; margin-bottom: 20px;">
              <h4 style="color: #800f2f; font-weight: 800; border-bottom: 2px solid rgba(255,77,109,0.2); padding-bottom: 5px; margin-bottom: 15px;">Platos</h4>
              
              <div class="dish-item" *ngFor="let dish of selectedFoodPlace?.dishes" style="display: flex; gap: 10px; background: rgba(255,255,255,0.6); padding: 10px; border-radius: 12px; margin-bottom: 10px; align-items: center;">
                <div *ngIf="dish.image_url_full" style="width: 60px; height: 60px; border-radius: 8px; background-size: cover; background-position: center;" [style.backgroundImage]="'url(' + dish.image_url_full + ')'"></div>
                <div style="flex: 1;">
                  <span style="display: block; font-weight: 700; color: #590D22;">{{ dish.name }}</span>
                  <span style="color: #FFB703; font-size: 0.8rem;">
                    <ng-container *ngTemplateOutlet="staticStars; context: { rating: dish.rating }"></ng-container>
                  </span>
                  <p *ngIf="dish.description" style="margin: 5px 0 0; font-size: 0.85rem; color: #a4133c;">{{ dish.description }}</p>
                </div>
                <ion-icon name="close-circle" style="color: rgba(255,77,109,0.5); font-size: 1.5rem;" (click)="deleteFoodDish(dish.id)"></ion-icon>
              </div>
              
              <!-- Add dish mini-form -->
              <div style="margin-top: 15px; border-top: 1px dashed rgba(255,77,109,0.3); padding-top: 15px;" *ngIf="isAddingDish">
                 <input type="text" placeholder="Nombre del plato" [(ngModel)]="newDish.name" class="glass-input" style="width: 100%; margin-bottom: 10px; padding: 10px;" />
                 <input type="text" placeholder="Comentario..." [(ngModel)]="newDish.description" class="glass-input" style="width: 100%; margin-bottom: 10px; padding: 10px;" />
                 
                 <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div style="display: flex; gap: 5px;">
                      <label title="Star" class="star" [class.is-active]="s <= newDish.rating" *ngFor="let s of [1,2,3,4,5]" (click)="newDish.rating = s; $event.preventDefault()">
                        <div class="svg-container">
                          <svg xmlns="http://www.w3.org/2000/svg" class="svg-outline" viewBox="0 0 24 24"><path d="M12 2.5L9.45 8.5L3 9.06L7.725 13.39L6.25 19.82L12 16.5L17.75 19.82L16.275 13.39L21 9.06L14.55 8.5L12 2.5ZM12 4.75L14 9.33L18.7 9.75L15 13.07L16.18 17.75L12 15.16L7.82 17.75L9 13.07L5.3 9.75L10 9.33L12 4.75Z"></path></svg>
                          <svg xmlns="http://www.w3.org/2000/svg" class="svg-filled" viewBox="0 0 24 24"><path d="M12 2.5L9.45 8.5L3 9.06L7.725 13.39L6.25 19.82L12 16.5L17.75 19.82L16.275 13.39L21 9.06L14.55 8.5L12 2.5Z"></path></svg>
                          <svg xmlns="http://www.w3.org/2000/svg" height="100" width="100" class="svg-celebrate"><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle></svg>
                        </div>
                      </label>
                    </div>
                    <ion-icon name="camera" style="font-size: 1.8rem; color: #FF4D6D;" (click)="uploadNewDishPhoto()"></ion-icon>
                 </div>
                 
                 <div *ngIf="newDish.imageBase64" style="height: 100px; border-radius: 8px; background-size: cover; background-position: center; margin-bottom: 10px;" [style.backgroundImage]="'url(' + newDish.imageBase64 + ')'"></div>
                 
                 <div style="display: flex; gap: 10px;">
                    <button class="glass-btn" style="flex: 1; padding: 10px; font-size: 0.9rem;" (click)="isAddingDish = false">Cancelar</button>
                    <button class="glass-btn" style="flex: 1; padding: 10px; font-size: 0.9rem;" (click)="saveFoodDish()">Guardar Plato</button>
                 </div>
              </div>
              
              <button *ngIf="!isAddingDish" class="glass-btn" style="width: 100%; padding: 10px; font-size: 0.9rem; margin-top: 10px;" (click)="isAddingDish = true">
                <ion-icon name="add"></ion-icon> Añadir Plato
              </button>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 20px;">
              <button class="glass-btn" style="flex: 1; padding: 12px; font-size: 0.9rem;" (click)="editFoodPlace(selectedFoodPlace)">Editar</button>
              <button class="glass-btn" style="background: rgba(255,0,0,0.1); color: red; flex: 1; padding: 12px; font-size: 0.9rem;" (click)="deleteFoodPlace(selectedFoodPlace.id)">Eliminar</button>
              <button class="glass-btn" style="flex: 1; padding: 12px;" (click)="isFoodPlaceModalOpen = false">Cerrar</button>
            </div>
          </div>
        </div>

        <!-- Add Movie Modal -->
        <div class="custom-overlay" *ngIf="isAddingMovie" (click)="isAddingMovie = false">
          <div class="modal-content glass-card" style="margin: 20px; padding: 25px; text-align: center; width: 90%; max-width: 400px; box-sizing: border-box; border: none; background: rgba(255, 255, 255, 0.95); max-height: 90vh; overflow-y: auto;" (click)="$event.stopPropagation()">
            <h2 style="color: #590D22; margin-bottom: 20px; font-weight: 900;">Nueva Peli/Serie 🎬</h2>
            
            <div *ngIf="newMovie.imageBase64" class="milestone-cover" style="width: 120px; height: 180px; border-radius: 12px; margin: 0 auto 20px; overflow: hidden; position: relative;">
              <img [src]="newMovie.imageBase64" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; cursor: pointer;" (click)="uploadNewMoviePhoto()">
                 <ion-icon name="camera-outline" style="color: white; font-size: 3rem;"></ion-icon>
              </div>
            </div>
            
            <button *ngIf="!newMovie.imageBase64" class="glass-btn" style="margin-bottom: 15px;" (click)="uploadNewMoviePhoto()">
              <ion-icon name="camera-outline"></ion-icon> Cartel / Foto
            </button>
            
            <input type="text" placeholder="Título" [(ngModel)]="newMovie.title" class="glass-input" style="width: 100%; margin-bottom: 10px;" />
            <input type="text" placeholder="¿Quién se quedó dormido primero?" [(ngModel)]="newMovie.who_fell_asleep" class="glass-input" style="width: 100%; margin-bottom: 10px;" />
            <textarea placeholder="Nuestra frase favorita / Momento top" [(ngModel)]="newMovie.favorite_quote" class="glass-input" style="width: 100%; min-height: 80px; margin-bottom: 10px; resize: vertical;"></textarea>
            
            <div style="margin-bottom: 20px;">
              <p style="margin: 0 0 5px; color: #a4133c; font-weight: 600;">Puntuación:</p>
              <div style="display: flex; justify-content: center; gap: 5px;">
                <label title="Star" class="star" [class.is-active]="s <= newMovie.rating" *ngFor="let s of [1,2,3,4,5]" (click)="newMovie.rating = s; $event.preventDefault()">
                  <div class="svg-container">
                    <svg xmlns="http://www.w3.org/2000/svg" class="svg-outline" viewBox="0 0 24 24"><path d="M12 2.5L9.45 8.5L3 9.06L7.725 13.39L6.25 19.82L12 16.5L17.75 19.82L16.275 13.39L21 9.06L14.55 8.5L12 2.5ZM12 4.75L14 9.33L18.7 9.75L15 13.07L16.18 17.75L12 15.16L7.82 17.75L9 13.07L5.3 9.75L10 9.33L12 4.75Z"></path></svg>
                    <svg xmlns="http://www.w3.org/2000/svg" class="svg-filled" viewBox="0 0 24 24"><path d="M12 2.5L9.45 8.5L3 9.06L7.725 13.39L6.25 19.82L12 16.5L17.75 19.82L16.275 13.39L21 9.06L14.55 8.5L12 2.5Z"></path></svg>
                    <svg xmlns="http://www.w3.org/2000/svg" height="100" width="100" class="svg-celebrate"><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle><circle r="2" cy="50" cx="50" class="particle"></circle></svg>
                  </div>
                </label>
              </div>
            </div>
            
            <div style="display: flex; gap: 10px;">
              <button class="glass-btn" style="flex: 1; background: rgba(128,15,47,0.1); color: #800f2f;" (click)="isAddingMovie = false">Cancelar</button>
              <button class="glass-btn" style="flex: 1;" (click)="saveMovie()">Guardar</button>
            </div>
          </div>
        </div>

        <!-- View Movie Modal -->
        <div class="custom-overlay" *ngIf="isMovieModalOpen" (click)="isMovieModalOpen = false">
          <div class="modal-content glass-card" style="margin: 20px; padding: 25px; text-align: center; width: 90%; max-width: 450px; box-sizing: border-box; border: none; background: rgba(255, 255, 255, 0.95); box-shadow: 0 10px 40px rgba(255, 77, 109, 0.15); max-height: 90vh; overflow-y: auto;" (click)="$event.stopPropagation()">
            
            <div *ngIf="selectedMovie?.image_url_full" class="milestone-cover" style="width: 140px; height: 210px; border-radius: 12px; margin: 0 auto 20px; overflow: hidden; position: relative; box-shadow: 0 8px 20px rgba(0,0,0,0.15);">
              <img [src]="selectedMovie?.image_url_full" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            
            <h2 style="color: #590D22; margin-bottom: 10px; font-weight: 900; font-size: 1.6rem;">{{ selectedMovie?.title }}</h2>
            
            <div style="color: #FFB703; font-size: 1.8rem; margin-bottom: 20px;">
                <ng-container *ngTemplateOutlet="staticStars; context: { rating: selectedMovie?.rating }"></ng-container>
            </div>
            
            <div *ngIf="selectedMovie?.who_fell_asleep" style="background: rgba(255,77,109,0.05); border-radius: 14px; padding: 15px; margin-bottom: 15px; text-align: center;">
              <p style="margin: 0; color: #a4133c; font-size: 0.95rem;">
                <ion-icon name="moon-outline" style="vertical-align: middle; margin-right: 5px;"></ion-icon>
                <strong>Se durmió:</strong> {{ selectedMovie.who_fell_asleep }}
              </p>
            </div>
            
            <p *ngIf="selectedMovie?.favorite_quote" style="color: #590D22; font-size: 1.05rem; line-height: 1.5; font-style: italic; font-weight: 500; text-align: center; background: rgba(255,255,255,0.8); padding: 15px; border-radius: 14px; border: 1px solid rgba(255,77,109,0.2); margin-bottom: 20px;">
              "{{ selectedMovie.favorite_quote }}"
            </p>
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
              <button class="glass-btn" style="flex: 1; padding: 12px; font-size: 0.9rem;" (click)="editMovie(selectedMovie)">Editar</button>
              <button class="glass-btn" style="background: rgba(255,0,0,0.1); color: red; flex: 1; padding: 12px; font-size: 0.9rem;" (click)="deleteMovie(selectedMovie.id)">Eliminar</button>
              <button class="glass-btn" style="flex: 1; padding: 12px;" (click)="isMovieModalOpen = false">Cerrar</button>
            </div>
          </div>
        </div>

    </ion-content>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .scroll-content { --background: transparent; }
    .mas-container { padding: calc(env(safe-area-inset-top) + 85px) 20px 20px; font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #fff0f3 0%, #ffccd5 100%); min-height: 100%; padding-bottom: 100px; }
    
    .header { margin-bottom: 25px; text-align: center; }
    .title { margin: 0; font-size: 1.8rem; font-weight: 900; color: #590D22; letter-spacing: -0.5px; text-shadow: 0 2px 10px rgba(255,255,255,0.8); }
    .subtitle { margin: 5px 0 0; color: #a4133c; font-weight: 500; font-size: 0.95rem; }

    /* Glassmorphism Cards */
    .glass-card { background: rgba(255, 255, 255, 0.5); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-radius: 24px; padding: 22px; margin-bottom: 20px; box-shadow: 0 8px 32px rgba(255, 77, 109, 0.08); border: 1px solid rgba(255, 255, 255, 0.6); }
    
    .section-title { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
    .section-title ion-icon { font-size: 1.6rem; color: #FF4D6D; background: rgba(255,77,109,0.1); padding: 8px; border-radius: 12px; flex-shrink: 0; }
    .section-title h3 { margin: 0; font-size: 1.2rem; font-weight: 800; color: #590D22; }
    .desc { font-size: 0.9rem; color: #800f2f; margin-bottom: 15px; line-height: 1.4; font-weight: 500; }

    /* Inputs */
    .glass-input { width: 100%; padding: 14px 16px; border-radius: 14px; border: 2px solid rgba(255,255,255,0.8); background: rgba(255,255,255,0.6); font-family: 'Inter', sans-serif; font-size: 0.95rem; color: #590D22; outline: none; transition: all 0.3s; font-weight: 600; box-shadow: inset 0 2px 5px rgba(0,0,0,0.02); color-scheme: light; }
    .glass-input:focus { border-color: #FF4D6D; background: #fff; box-shadow: 0 4px 15px rgba(255,77,109,0.1); }
    .glass-input::placeholder { color: #b08a96; font-weight: normal; }
    .glass-input::-webkit-calendar-picker-indicator { cursor: pointer; filter: invert(20%) sepia(80%) saturate(300%) hue-rotate(310deg) brightness(60%) contrast(100%); opacity: 0.8; }
    .glass-input::-webkit-calendar-picker-indicator:hover { opacity: 1; }
    
    .glass-select { width: 100%; padding: 14px 16px; border-radius: 14px; border: 2px solid rgba(255,255,255,0.8); background: rgba(255,255,255,0.6); font-family: 'Inter', sans-serif; font-size: 1rem; color: #590D22; font-weight: 700; outline: none; appearance: none; cursor: pointer; }
    .glass-select:focus { border-color: #FF4D6D; background: #fff; }

    .glass-btn { width: 100%; background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; border: none; padding: 14px; border-radius: 14px; font-weight: 700; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 15px rgba(255, 77, 109, 0.3); }
    .glass-btn:active { transform: scale(0.98); box-shadow: 0 2px 8px rgba(255, 77, 109, 0.2); }

    .date-picker-glass label { display: block; font-size: 0.9rem; color: #800f2f; margin-bottom: 8px; font-weight: 600; }
    
    /* Time Grid */
    .live-counter { margin-top: 20px; text-align: center; }
    .heart-pulse ion-icon { font-size: 3.5rem; color: #FF4D6D; filter: drop-shadow(0 0 15px rgba(255, 77, 109, 0.6)); animation: pulse 1s infinite alternate cubic-bezier(0.4, 0, 0.2, 1); margin-bottom: 20px; }
    @keyframes pulse { 0% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(255,77,109,0.4)); } 100% { transform: scale(1.2); filter: drop-shadow(0 0 25px rgba(255,77,109,0.8)); } }
    
    .time-grid { display: flex; flex-wrap: nowrap; justify-content: space-between; gap: 6px; overflow: hidden; }
    .time-block { flex: 1; min-width: 0; background: rgba(255,255,255,0.7); padding: 12px 2px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid rgba(255,255,255,0.9); transition: transform 0.3s; }
    .time-block:hover { transform: translateY(-3px); }
    .time-block.highlight { background: linear-gradient(135deg, #FF4D6D, #ff758c); border: none; box-shadow: 0 6px 20px rgba(255,77,109,0.3); }
    .time-block.highlight .value, .time-block.highlight .label { color: white; }
    .value { display: block; font-size: 1.15rem; font-weight: 900; color: #590D22; white-space: nowrap; }
    .label { display: block; font-size: 0.65rem; font-weight: 700; color: #a4133c; text-transform: uppercase; margin-top: 2px; letter-spacing: -0.2px; white-space: nowrap; overflow: hidden; text-overflow: clip; }

    /* Lists (Milestones & Bucket) */
    .milestone-item, .bucket-item { display: flex; align-items: center; gap: 12px; padding: 14px; background: rgba(255,255,255,0.8); border-radius: 16px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,1); box-shadow: 0 4px 10px rgba(0,0,0,0.02); transition: all 0.3s; }
    
    .milestone-indicator { width: 8px; height: 35px; background: #FF4D6D; border-radius: 4px; }
    .milestone-info { flex: 1; overflow: hidden; }
    .m-title { display: block; font-weight: 800; color: #590D22; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .m-date { font-size: 0.8rem; color: #a4133c; font-weight: 600; margin-top: 2px; display: block; }
    .m-days { font-weight: 900; color: #FF4D6D; background: rgba(255,77,109,0.1); padding: 6px 12px; border-radius: 12px; font-size: 0.85rem; }
    
    .bucket-item.is-done { opacity: 0.6; background: rgba(255,255,255,0.4); }
    .bucket-item.is-done .b-text { text-decoration: line-through; color: #a4133c; }
    .check-icon { font-size: 1.8rem; color: #d3d3d3; transition: color 0.3s; }
    .bucket-item.is-done .check-icon { color: #FF4D6D; }
    .b-text { flex: 1; font-weight: 700; color: #590D22; font-size: 1rem; transition: color 0.3s; }
    
    .delete-icon { color: #ffccd5; font-size: 1.5rem; cursor: pointer; transition: color 0.2s; padding: 4px; }
    .delete-icon:active { color: #FF4D6D; }
    
    .add-glass { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }

    /* Quick Actions Grid */
    .quick-actions-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
    .grid-card { background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(16px); border-radius: 24px; padding: 20px 15px; box-shadow: 0 6px 20px rgba(0,0,0,0.04); border: 1px solid rgba(255,255,255,0.7); display: flex; flex-direction: column; align-items: center; text-align: center; justify-content: center; transition: transform 0.2s, background 0.2s; }
    .grid-card.full-width { grid-column: span 2; align-items: flex-start; text-align: left; padding: 20px; }
    .grid-card.full-width h4 { margin: 0 0 10px 0; font-size: 1.1rem; color: #590D22; font-weight: 800; display: flex; align-items: center; gap: 8px; }
    .grid-card.interactive:active { transform: scale(0.95); background: rgba(255,255,255,0.8); }
    
    .icon-circle { width: 55px; height: 55px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 1.8rem; color: white; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
    .bg-purple { background: linear-gradient(135deg, #7209b7, #b5179e); box-shadow: 0 4px 15px rgba(114, 9, 183, 0.3); }
    .bg-blue { background: linear-gradient(135deg, #4361ee, #4cc9f0); box-shadow: 0 4px 15px rgba(67, 97, 238, 0.3); }
    .text-pink { color: #FF4D6D; font-size: 1.4rem; }
    
    .grid-card h4 { margin: 0; font-size: 1rem; font-weight: 800; color: #590D22; }
    .grid-card .sub { font-size: 0.8rem; color: #a4133c; font-weight: 600; margin-top: 4px; }

    /* Logout */
    .logout-btn { width: 100%; background: rgba(208, 0, 0, 0.1); color: #d00000; border: 2px solid rgba(208, 0, 0, 0.2); padding: 16px; border-radius: 20px; font-weight: 800; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; transition: all 0.2s; backdrop-filter: blur(10px); }
    .logout-btn:active { background: rgba(208, 0, 0, 0.2); transform: scale(0.98); }
    .logout-btn ion-icon { font-size: 1.4rem; }
      .custom-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.15);
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
      }
      .star { --star-color: #FF4D6D; position: relative; width: 44px; height: 44px; transition: transform 0.3s ease; cursor: pointer; }
      .star .svg-container { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
      .star .svg-outline, .star .svg-filled { fill: var(--star-color); position: absolute; left: 0; top: 0; width: 100%; height: 100%; transition: all 0.3s ease; }
      .star .svg-filled { opacity: 0; transform: scale(0); }
      .star .svg-celebrate { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: none; stroke: var(--star-color); fill: var(--star-color); stroke-width: 2px; pointer-events: none; }
      .star .particle { position: absolute; animation-fill-mode: forwards; display: none; }
      .star.is-active .svg-outline { opacity: 0; }
      .star.is-active .svg-filled { opacity: 1; transform: scale(1); animation: keyframes-svg-filled 1s; }
      .star:not(.is-active) .svg-filled { animation: keyframes-svg-unfilled 0.3s forwards; }
      .star.is-active .svg-celebrate { display: block; }
      .star.is-active .particle { display: block; }
      .star .particle:nth-child(1) { animation: particle-1 1s cubic-bezier(0.25, 0.1, 0.25, 1); }
      .star .particle:nth-child(2) { animation: particle-2 1s ease-out; }
      .star .particle:nth-child(3) { animation: particle-3 1s ease-out; }
      .star .particle:nth-child(4) { animation: particle-4 1s ease-out; }
      .star .particle:nth-child(5) { animation: particle-5 1s ease-out; }
      .star .particle:nth-child(6) { animation: particle-6 1s ease-out; }
      .star .particle:nth-child(7) { animation: particle-7 1s ease-out; }
      .star .particle:nth-child(8) { animation: particle-8 1s ease-out; }
      @keyframes keyframes-svg-filled { 0% { transform: scale(0); opacity: 0; } 25% { transform: scale(1.2); opacity: 1; } 50% { transform: scale(1); filter: brightness(1.5); } }
      @keyframes keyframes-svg-unfilled { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(0); opacity: 0; } }
      @keyframes particle-1 { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 40% { transform: translate(-20px, -25px) scale(0.6); opacity: 0.6; } 100% { transform: translate(-40px, 40px) scale(0); opacity: 0; } }
      @keyframes particle-2 { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 40% { transform: translate(20px, -25px) scale(0.6); opacity: 0.6; } 100% { transform: translate(40px, 40px) scale(0); opacity: 0; } }
      @keyframes particle-3 { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 40% { transform: translate(-30px, -20px) scale(0.6); opacity: 0.6; } 100% { transform: translate(-50px, 45px) scale(0); opacity: 0; } }
      @keyframes particle-4 { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 40% { transform: translate(30px, -20px) scale(0.6); opacity: 0.6; } 100% { transform: translate(50px, 45px) scale(0); opacity: 0; } }
      @keyframes particle-5 { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 45% { transform: translate(0, -30px) scale(0.6); opacity: 0.6; } 100% { transform: translate(0, 40px) scale(0); opacity: 0; } }
      @keyframes particle-6 { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 35% { transform: translate(-35px, -15px) scale(0.6); opacity: 0.6; } 100% { transform: translate(-60px, 50px) scale(0); opacity: 0; } }
      @keyframes particle-7 { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 35% { transform: translate(35px, -15px) scale(0.6); opacity: 0.6; } 100% { transform: translate(60px, 50px) scale(0); opacity: 0; } }
      @keyframes particle-8 { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 45% { transform: translate(0, -35px) scale(0.6); opacity: 0.6; } 100% { transform: translate(0, 45px) scale(0); opacity: 0; } }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, IonContent, IonRefresher, IonRefresherContent]
})
export class MasWidgetComponent implements OnInit, OnDestroy {
  @Output() openGameEvent = new EventEmitter<void>();

  private api = inject(LoveApiService);
  private tutorialService = inject(TutorialService);
  private toastCtrl = inject(ToastController);
  private actionSheetCtrl = inject(ActionSheetController);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private locationService = inject(LocationService);

  startDate: string = '';
  selectedAlbumId: number | string = 'feed';
  albums: any[] = [];
  milestones: any[] = [];
  bucketList: any[] = [];

  newMilestoneTitle = '';
  newMilestoneDate = '';
  newBucketTitle = '';

  timeTogether = { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  
  annualEvents: { name: string, daysLeft: number, dateStr: string, icon: string }[] = [];
  
  isEventModalOpen = false;
  selectedEvent: any = null;

  isMilestoneModalOpen = false;
  selectedMilestone: any = null;
  isEditingMilestone = false;

  myBirthday: string = '';
  partnerBirthday: string = '';

  private timer: any;
  private appStateListener?: PluginListenerHandle;
  uploadingAvatar = false;
  myUserId: 'juan' | 'roberta' = 'juan';

  // --- Food Places & Movies ---
  foodPlaces: any[] = [];
  movies: any[] = [];
  
  isFoodListModalOpen = false;
  isMovieListModalOpen = false;

  isAddingFoodPlace = false;
  newFoodPlace: any = { name: '', location: '', description: '', rating: 5, imageBase64: null };
  isFoodPlaceModalOpen = false;
  selectedFoodPlace: any = null;
  
  isAddingDish = false;
  newDish: any = { name: '', description: '', rating: 5, imageBase64: null };
  
  isAddingMovie = false;
  newMovie: any = { title: '', who_fell_asleep: '', favorite_quote: '', rating: 5, imageBase64: null };
  isMovieModalOpen = false;
  selectedMovie: any = null;

  constructor() {
    addIcons({ logOutOutline, timeOutline, settingsOutline, heart, flagOutline, addCircleOutline, gameControllerOutline, starOutline, checkmarkCircle, ellipseOutline, personCircleOutline, moonOutline, closeCircle, calendar, restaurantOutline, filmOutline, star, cameraOutline, pencilOutline, add, trophyOutline, sparklesOutline });
  }

  async ngOnInit() {
    // 1. Sync Date from API
    try {
      const info = await this.api.getCoupleInfo();
      
      // Usar IDs reales
      this.myUserId = info.my_id as any;

      if (info.my_birth_date) {
        this.myBirthday = info.my_birth_date;
        await Preferences.set({ key: 'myBirthday', value: this.myBirthday });
      }
      if (info.partner_birth_date) {
        this.partnerBirthday = info.partner_birth_date;
        await Preferences.set({ key: 'partnerBirthday', value: this.partnerBirthday });
      }

      if (info.couple) {
        if (info.couple.relationship_start_date) {
          const d = new Date(info.couple.relationship_start_date);
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          this.startDate = d.toISOString().slice(0, 16);
          await Preferences.set({ key: 'relationshipStartDate', value: this.startDate });
        } else {
          this.startDate = '';
          await Preferences.remove({ key: 'relationshipStartDate' });
        }
      }
    } catch (e) {
      const dateRes = await Preferences.get({ key: 'relationshipStartDate' });
      if (dateRes.value) {
        this.startDate = dateRes.value;
      }
    }
    
    // Load birthdays as fallback if API fails or empty
    if (!this.myBirthday) {
      const myB = await Preferences.get({ key: 'myBirthday' });
      if (myB.value) this.myBirthday = myB.value;
    }
    if (!this.partnerBirthday) {
      const pB = await Preferences.get({ key: 'partnerBirthday' });
      if (pB.value) this.partnerBirthday = pB.value;
    }

    this.updateAnnualEvents();

    // Check intent
    const actionIntent = await Preferences.get({ key: 'action_intent' });
    if (actionIntent.value === 'scroll_to_counter') {
      setTimeout(() => {
        const el = document.getElementById('nuestro-tiempo');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          // Optional: Add a brief highlight class
          el.classList.add('highlight-pulse');
          setTimeout(() => el.classList.remove('highlight-pulse'), 2000);
        }
      }, 500); // Give DOM time to render
      await Preferences.remove({ key: 'action_intent' });
    }

    const albumRes = await Preferences.get({ key: 'widgetAlbumId' });
    if (albumRes.value) {
      this.selectedAlbumId = albumRes.value;
    }

    // Load API data
    try {
      this.albums = await this.api.getAlbums().catch(() => []);
      this.loadMilestones();
    } catch (e) {}
    
    // Load bucket list from backend
    this.loadBucketList();
    this.loadFoodAndMovies();

    this.startTimer();

    this.appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        this.startTimer();
      } else {
        this.stopTimer();
      }
    });
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'medium') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'top'
    });
    toast.present();
  }

  ngOnDestroy() {
    this.stopTimer();
    if (this.appStateListener) {
      this.appStateListener.remove();
    }
  }

  async saveStartDate() {
    await Preferences.set({ key: 'relationshipStartDate', value: this.startDate });
    this.calculateTime();
    
    // Sync with backend
    try {
      const d = new Date(this.startDate);
      const iso = d.toISOString().replace('T', ' ').substring(0, 19);
      await this.api.updateCoupleInfo({ relationship_start_date: iso });
      this.showToast('Fecha guardada correctamente', 'success');
    } catch (e) {
      console.error(e);
      this.showToast('Error al guardar la fecha', 'danger');
    }
  }

  async saveBirthdays() {
    await Preferences.set({ key: 'myBirthday', value: this.myBirthday });
    await Preferences.set({ key: 'partnerBirthday', value: this.partnerBirthday });
    
    // Sync with backend
    try {
      const payload: any = {};
      if (this.myBirthday) payload.birth_date = this.myBirthday;
      if (this.partnerBirthday) payload.partner_birth_date = this.partnerBirthday;
      
      if (Object.keys(payload).length > 0) {
        await this.api.updateCoupleInfo(payload);
      }
    } catch (e) {
      console.error('Error syncing birthdays with backend', e);
    }

    this.updateAnnualEvents();
    this.showToast('Cumpleaños guardados', 'success');
  }

  async loadMilestones() {
    this.milestones = await this.api.getMilestones();
  }

  async handleRefresh(event: any) {
    await this.loadMilestones();
    event.target.complete();
  }

  async addMilestone() {
    if (!this.newMilestoneTitle || !this.newMilestoneDate) return;
    try {
      await this.api.addMilestone(this.newMilestoneTitle, this.newMilestoneDate);
      this.newMilestoneTitle = '';
      this.newMilestoneDate = '';
      this.loadMilestones();
      this.showToast('Hito añadido con éxito', 'success');
    } catch (e) {
      console.error(e);
      this.showToast('Error al añadir hito', 'danger');
    }
  }

  async deleteMilestone(id: number) {
    try {
      await this.api.deleteMilestone(id);
      this.loadMilestones();
      this.showToast('Hito eliminado', 'medium');
    } catch (e) {
      console.error(e);
      this.showToast('Error al eliminar hito', 'danger');
    }
  }

  async loadBucketList() {
    try {
      const wishes = await this.api.getWishes();
      this.bucketList = wishes;
    } catch (e) {
      console.error('Error loading wishes', e);
    }
  }

  async addBucketItem() {
    if (!this.newBucketTitle.trim()) return;
    try {
      const wish = await this.api.addWish(this.newBucketTitle.trim());
      this.bucketList.unshift(wish);
      this.newBucketTitle = '';
    } catch (e) {
      this.showToast('Error al añadir deseo', 'danger');
    }
  }

  async toggleBucketItem(index: number) {
    const item = this.bucketList[index];
    item.completed = !item.completed;
    try {
      await this.api.updateWish(item.id, item.completed);
    } catch (e) {
      item.completed = !item.completed; // Revert on failure
      this.showToast('Error al actualizar deseo', 'danger');
    }
  }

  async deleteBucketItem(index: number, event: Event) {
    event.stopPropagation();
    const item = this.bucketList[index];
    const originalList = [...this.bucketList];
    this.bucketList.splice(index, 1);
    
    try {
      await this.api.deleteWish(item.id);
    } catch (e) {
      this.bucketList = originalList; // Revert on failure
      this.showToast('Error al eliminar deseo', 'danger');
    }
  }

  calculateDays(dateStr: string): number {
    if (!dateStr) return 0;
    const d = new Date(dateStr).getTime();
    const now = new Date().getTime();
    return Math.floor(Math.abs(now - d) / (1000 * 60 * 60 * 24));
  }

  isPast(dateStr: string): boolean {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    const now = new Date();
    // Compare dates ignoring time
    d.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    return d.getTime() < now.getTime();
  }

  openGame() {
    this.router.navigate(['/games']);
  }

  async saveSelectedAlbum() {
    await Preferences.set({ key: 'widgetAlbumId', value: this.selectedAlbumId.toString() });
    
    let albumName = "Feed General";
    if (this.selectedAlbumId !== 'feed') {
      const album = this.albums.find(a => a.id == this.selectedAlbumId);
      if (album) {
        albumName = album.name;
      }
    }
    await Preferences.set({ key: 'widgetAlbumName', value: albumName });
    
    this.showToast('Configuración guardada. El widget tardará unos minutos en actualizarse.', 'success');
  }



  openFoodListModal() {
    this.isFoodListModalOpen = true;
    setTimeout(() => {
      this.tutorialService.showFoodTour();
    }, 500);
  }

  openMovieListModal() {
    this.isMovieListModalOpen = true;
    setTimeout(() => {
      this.tutorialService.showMovieTour();
    }, 500);
  }

  openAddFoodPlaceModal() {
    this.isAddingFoodPlace = true;
    setTimeout(() => {
      this.tutorialService.showAddFoodTour();
    }, 500);
  }

  startTimer() {
    this.stopTimer();
    this.calculateTime();
    this.timer = setInterval(() => {
      this.calculateTime();
    }, 1000);
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  openEventModal(ev: any) {
    this.selectedEvent = ev;
    this.isEventModalOpen = true;
  }

  openMilestoneModal(m: any) {
    this.selectedMilestone = m;
    this.isEditingMilestone = false;
    this.isMilestoneModalOpen = true;
  }

  async uploadMilestonePhoto() {
    this.presentPhotoOptions(async (source) => {
      try {
        const image = await Camera.getPhoto({
          quality: 80,
          allowEditing: true, // Matching typical app behavior to allow crop
          resultType: CameraResultType.DataUrl,
          source: source
        });
        if (image.dataUrl) {
          this.selectedMilestone.newImageBase64 = image.dataUrl;
        }
      } catch (e) {
        console.log('User cancelled camera or error', e);
      }
    });
  }

  async saveMilestoneChanges() {
    if (!this.selectedMilestone) return;
    try {
      const res = await this.api.updateMilestone(this.selectedMilestone.id, this.selectedMilestone.newImageBase64, this.selectedMilestone.story);
      this.selectedMilestone.image_url_full = res.image_url_full;
      this.selectedMilestone.newImageBase64 = null;
      this.isEditingMilestone = false;
      this.loadMilestones();
      this.showToast('Recuerdo guardado con éxito', 'success');
    } catch (e) {
      console.error(e);
      this.showToast('Error al guardar el recuerdo', 'danger');
    }
  }

  getMilestonePhrase(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    d.setHours(0,0,0,0);
    now.setHours(0,0,0,0);

    const diffTime = Math.abs(now.getTime() - d.getTime());
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (totalDays === 0) return "¡El momento es ahora! 🎉";

    let years = Math.floor(totalDays / 365);
    let remainingDays = totalDays % 365;
    let months = Math.floor(remainingDays / 30);
    let days = remainingDays % 30;

    let timeParts = [];
    if (years > 0) timeParts.push(`${years} ${years === 1 ? 'año' : 'años'}`);
    if (months > 0) timeParts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);
    if (days > 0 || timeParts.length === 0) timeParts.push(`${days} ${days === 1 ? 'día' : 'días'}`);

    const joinedTime = timeParts.join(', ').replace(/, ([^,]*)$/, ' y $1');

    if (d.getTime() < now.getTime()) {
      return `Han pasado ${joinedTime} desde aquel mágico momento.`;
    } else {
      return `¡La emoción crece! Faltan ${joinedTime} para este gran momento.`;
    }
  }

  calculateTime() {
    if (!this.startDate) return;
    
    const start = new Date(this.startDate);
    const now = new Date();
    
    if (start.getTime() > now.getTime()) return; // Future date

    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();

    const startHour = start.getHours() + start.getMinutes() / 60 + start.getSeconds() / 3600;
    const nowHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

    if (nowHour < startHour) {
      days--;
    }

    if (days < 0) {
      months--;
      const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += previousMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    let diff = Math.floor((now.getTime() - start.getTime()) / 1000);
    const hours = Math.floor(diff / 3600) % 24;
    const minutes = Math.floor(diff / 60) % 60;
    const seconds = diff % 60;

    this.timeTogether = { years, months, days, hours, minutes, seconds };
  }

  updateAnnualEvents() {
    this.annualEvents = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const nowUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

    const addEvent = (name: string, month: number, day: number, icon: string, birthYear?: number) => {
      let d = new Date(currentYear, month, day);
      let eventYear = currentYear;
      let dUTC = Date.UTC(currentYear, month, day);

      if (dUTC < nowUTC) {
        d.setFullYear(currentYear + 1);
        eventYear = currentYear + 1;
        dUTC = Date.UTC(currentYear + 1, month, day);
      }
      
      const daysLeft = Math.floor((dUTC - nowUTC) / (1000 * 60 * 60 * 24));
      // Formato DD/MM
      const dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      
      let displayName = name;
      if (birthYear) {
        const age = eventYear - birthYear;
        displayName = `${name} (${age} años)`;
      }

      this.annualEvents.push({ name: displayName, daysLeft, dateStr, icon });
    };

    addEvent('San Valentín', 1, 14, 'heart'); // 1 is February (0-indexed)
    addEvent('Halloween', 9, 31, 'moon-outline'); // 9 is October
    addEvent('Navidad', 11, 25, 'star-outline'); // 11 is December

    if (this.startDate) {
      const start = new Date(this.startDate);
      // Optional: calculate anniversary years!
      let eventYear = currentYear;
      let dUTC = Date.UTC(currentYear, start.getMonth(), start.getDate());
      if (dUTC < nowUTC) {
        eventYear = currentYear + 1;
      }
      const years = eventYear - start.getFullYear();
      addEvent(`Aniversario (${years} años)`, start.getMonth(), start.getDate(), 'time-outline');
    }

    if (this.myBirthday) {
      const parts = this.myBirthday.split('-');
      if (parts.length === 3) {
        addEvent('Mi Cumpleaños', parseInt(parts[1]) - 1, parseInt(parts[2]), 'person-circle-outline', parseInt(parts[0]));
      }
    }

    if (this.partnerBirthday) {
      const parts = this.partnerBirthday.split('-');
      if (parts.length === 3) {
        addEvent('Cumple de Pareja', parseInt(parts[1]) - 1, parseInt(parts[2]), 'person-circle-outline', parseInt(parts[0]));
      }
    }

    this.annualEvents.sort((a, b) => a.daysLeft - b.daysLeft);
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

  async changeProfilePicture() {
    this.presentPhotoOptions(async (source) => {
      try {
        const image = await Camera.getPhoto({
          quality: 60, width: 300, height: 300, allowEditing: true, resultType: CameraResultType.DataUrl, source: source
        });
        
        if (image.dataUrl) {
          this.uploadingAvatar = true;
          try {
            await this.api.uploadAvatar(image.dataUrl);
            this.showToast('Foto de perfil actualizada con éxito', 'success');
          } catch(e) {
            console.error('Error updating avatar:', e);
            this.showToast('Error al actualizar avatar', 'danger');
          } finally {
            this.uploadingAvatar = false;
          }
        }
      } catch (e) {
        console.log('User cancelled camera or error', e);
      }
    });
  }

  async confirmLogout() {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que quieres salir?',
      cssClass: 'premium-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'alert-btn-cancel' },
        { 
          text: 'Salir', 
          role: 'destructive',
          cssClass: 'alert-btn-confirm',
          handler: () => {
            this.api.logout();
            this.router.navigate(['/login']);
          }
        }
      ]
    });
    await alert.present();
  }

  goTo(path: string) {
    this.router.navigate(['/' + path]);
  }

  // --- FOOD PLACES & MOVIES API LOGIC ---
  async loadFoodAndMovies() {
    try {
      this.foodPlaces = await this.api.getFoodPlaces();
      this.movies = await this.api.getMovies();
    } catch (e) {
      console.error('Error loading food and movies', e);
    }
  }

  // Food Places
  openFoodPlaceModal(place: any) {
    this.selectedFoodPlace = place;
    this.isFoodPlaceModalOpen = true;
    this.isAddingDish = false;
  }

  async uploadNewFoodPlacePhoto() {
    this.presentPhotoOptions(async (source) => {
      try {
        const image = await Camera.getPhoto({ quality: 80, allowEditing: true, resultType: CameraResultType.DataUrl, source });
        if (image.dataUrl) this.newFoodPlace.imageBase64 = image.dataUrl;
      } catch (e) { console.log(e); }
    });
  }

  async saveFoodPlace() {
    if (!this.newFoodPlace.name) return this.showToast('Ponle nombre al sitio', 'warning');
    try {
      if (this.newFoodPlace.id) {
        await this.api.updateFoodPlace(this.newFoodPlace.id, this.newFoodPlace.name, this.newFoodPlace.location, this.newFoodPlace.rating, this.newFoodPlace.description, this.newFoodPlace.imageBase64);
        this.showToast('Restaurante actualizado', 'success');
      } else {
        await this.api.addFoodPlace(this.newFoodPlace.name, this.newFoodPlace.location, this.newFoodPlace.rating, this.newFoodPlace.description, this.newFoodPlace.imageBase64);
        this.showToast('Restaurante añadido', 'success');
      }
      this.isAddingFoodPlace = false;
      this.newFoodPlace = { name: '', location: '', description: '', rating: 5, imageBase64: null };
      this.loadFoodAndMovies();
    } catch (e) {
      this.showToast('Error al guardar restaurante', 'danger');
    }
  }

  editFoodPlace(place: any) {
    this.newFoodPlace = { ...place, imageBase64: null };
    this.isFoodPlaceModalOpen = false;
    this.isAddingFoodPlace = true;
  }

  async deleteFoodPlace(id: number) {
    if(!confirm('¿Eliminar este restaurante?')) return;
    try {
      await this.api.deleteFoodPlace(id);
      this.isFoodPlaceModalOpen = false;
      this.loadFoodAndMovies();
      this.showToast('Eliminado', 'success');
    } catch (e) {}
  }

  // Food Dishes
  async uploadNewDishPhoto() {
    this.presentPhotoOptions(async (source) => {
      try {
        const image = await Camera.getPhoto({ quality: 80, allowEditing: true, resultType: CameraResultType.DataUrl, source });
        if (image.dataUrl) this.newDish.imageBase64 = image.dataUrl;
      } catch (e) { console.log(e); }
    });
  }

  async saveFoodDish() {
    if (!this.newDish.name) return this.showToast('Ponle nombre al plato', 'warning');
    try {
      const dish = await this.api.addFoodDish(this.selectedFoodPlace.id, this.newDish.name, this.newDish.rating, this.newDish.description, this.newDish.imageBase64);
      if(!this.selectedFoodPlace.dishes) this.selectedFoodPlace.dishes = [];
      this.selectedFoodPlace.dishes.push(dish);
      this.isAddingDish = false;
      this.newDish = { name: '', description: '', rating: 5, imageBase64: null };
      this.loadFoodAndMovies();
      this.showToast('Plato añadido', 'success');
    } catch (e) {
      this.showToast('Error al añadir plato', 'danger');
    }
  }

  async deleteFoodDish(dishId: number) {
    if(!confirm('¿Eliminar este plato?')) return;
    try {
      await this.api.deleteFoodDish(this.selectedFoodPlace.id, dishId);
      this.selectedFoodPlace.dishes = this.selectedFoodPlace.dishes.filter((d:any) => d.id !== dishId);
      this.loadFoodAndMovies();
    } catch (e) {}
  }

  // Movies
  openMovieModal(movie: any) {
    this.selectedMovie = movie;
    this.isMovieModalOpen = true;
  }

  async uploadNewMoviePhoto() {
    this.presentPhotoOptions(async (source) => {
      try {
        const image = await Camera.getPhoto({ quality: 80, allowEditing: true, resultType: CameraResultType.DataUrl, source });
        if (image.dataUrl) this.newMovie.imageBase64 = image.dataUrl;
      } catch (e) { console.log(e); }
    });
  }

  async saveMovie() {
    if (!this.newMovie.title) return this.showToast('Ponle título', 'warning');
    try {
      if (this.newMovie.id) {
        await this.api.updateMovie(this.newMovie.id, this.newMovie.title, this.newMovie.rating, this.newMovie.who_fell_asleep, this.newMovie.favorite_quote, this.newMovie.imageBase64);
        this.showToast('Peli actualizada', 'success');
      } else {
        await this.api.addMovie(this.newMovie.title, this.newMovie.rating, this.newMovie.who_fell_asleep, this.newMovie.favorite_quote, this.newMovie.imageBase64);
        this.showToast('Peli añadida', 'success');
      }
      this.isAddingMovie = false;
      this.newMovie = { title: '', who_fell_asleep: '', favorite_quote: '', rating: 5, imageBase64: null };
      this.loadFoodAndMovies();
    } catch (e) {
      this.showToast('Error al guardar', 'danger');
    }
  }

  editMovie(movie: any) {
    this.newMovie = { ...movie, imageBase64: null };
    this.isMovieModalOpen = false;
    this.isAddingMovie = true;
  }

  async deleteMovie(id: number) {
    if(!confirm('¿Eliminar esta peli?')) return;
    try {
      await this.api.deleteMovie(id);
      this.isMovieModalOpen = false;
      this.loadFoodAndMovies();
      this.showToast('Eliminada', 'success');
    } catch (e) {}
  }
}
