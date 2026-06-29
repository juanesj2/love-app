import { Component, inject, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { App } from '@capacitor/app';
import { PluginListenerHandle } from '@capacitor/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { IonContent, IonRefresher, IonRefresherContent, IonIcon, ToastController, ActionSheetController, AlertController, IonSelect, IonSelectOption, IonSearchbar } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { LoveApiService } from '../../services/love-api.service';
import { Preferences } from '@capacitor/preferences';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { LocationService } from '../../services/location.service';
import { TutorialService } from '../../services/tutorial.service';
import { OfflineSyncService } from '../../services/offline-sync.service';
import { addIcons } from 'ionicons';
import { logOutOutline, timeOutline, settingsOutline, heart, heartOutline, flagOutline, addCircleOutline, gameControllerOutline, starOutline, checkmarkCircle, ellipseOutline, personCircleOutline, moonOutline, closeCircle, closeOutline, calendar, restaurantOutline, filmOutline, star, cameraOutline, pencilOutline, add, locationOutline, trophyOutline, sparklesOutline, airplaneOutline, wineOutline, musicalNotesOutline, mapOutline, searchOutline } from 'ionicons/icons';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { TimelineWidgetComponent } from '../timeline-widget/timeline-widget.component';


@Component({
  selector: 'app-mas-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonRefresher, IonRefresherContent, IonIcon, IonSelect, IonSelectOption, IonSearchbar, TimelineWidgetComponent],
  template: `
    <ion-content class="scroll-content">
      <ng-template #staticStars let-rating="rating">
        <div style="display: flex; gap: 2px; justify-content: center;">
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
        <div class="glass-card" id="mas-nuestro-tiempo">
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
          
          <div class="milestone-list" *ngIf="visibleEvents.length > 0">
            <div class="milestone-item" *ngFor="let ev of visibleEvents" (click)="openEventModal(ev)">
              <ion-icon [name]="ev.icon" class="event-icon text-pink"></ion-icon>
              <div class="milestone-info" style="margin-left: 10px;">
                <span class="m-title">{{ ev.name }}</span>
                <span class="m-date">{{ ev.dateStr }}</span>
              </div>
              <div class="m-days" *ngIf="ev.daysLeft > 0">Faltan {{ ev.daysLeft }} d</div>
              <div class="m-days" *ngIf="ev.daysLeft === 0">¡Hoy!</div>
            </div>
          </div>
          
          <div *ngIf="visibleEvents.length === 0" style="text-align: center; color: #888; padding: 15px 0;">
            <ion-icon name="calendar-clear-outline" style="font-size: 2rem; opacity: 0.5;"></ion-icon>
            <p style="margin: 5px 0 0; font-size: 0.9rem;">No hay eventos en los próximos 7 días</p>
          </div>

          <div style="text-align: center; margin-top: 10px;" *ngIf="annualEvents.length > visibleEvents.length || showAllEvents">
            <button class="glass-btn" style="font-size: 0.85rem; padding: 6px 12px; margin: auto;" (click)="toggleAllEvents()">
              {{ showAllEvents ? 'Ocultar eventos lejanos' : 'Ver todos los eventos' }}
            </button>
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

        <!-- Timeline y Planes -->
        <div class="glass-card timeline-banner" id="mas-timeline" (click)="openTimelineModal()">
          <div class="timeline-banner-content">
            <div class="icon-circle" style="background: linear-gradient(135deg, #a2d2ff, #bde0fe); box-shadow: 0 4px 15px rgba(162, 210, 255, 0.3); color: #023e8a; width: 60px; height: 60px; font-size: 1.8rem; margin-bottom: 10px;">
              <ion-icon name="map-outline"></ion-icon>
            </div>
            <h3 style="color: #590D22; margin: 0; font-weight: 900; font-size: 1.5rem;">Timeline y Planes</h3>
            <p style="color: #a4133c; margin: 5px 0 0; font-size: 0.95rem;">Ideas, viajes futuros y el historial de nuestra historia.</p>
            
            <div *ngIf="upcomingPlan" class="upcoming-preview" (click)="$event.stopPropagation(); openTimelineModal(upcomingPlan.id)" style="margin-top: 15px; padding: 10px 15px; background: rgba(255,255,255,0.7); border-radius: 12px; display: flex; align-items: center; gap: 12px; border: 1px solid rgba(255,77,109,0.1); cursor: pointer;">
              <ion-icon [name]="getCategoryIcon(upcomingPlan.category)" style="font-size: 1.4rem; color: #FF4D6D; background: rgba(255,77,109,0.1); padding: 8px; border-radius: 50%;"></ion-icon>
              <div style="flex: 1; text-align: left; overflow: hidden;">
                <div style="font-size: 0.75rem; color: #FF4D6D; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Próximo plan</div>
                <div style="font-size: 0.95rem; color: #590D22; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ upcomingPlan.title }}</div>
              </div>
            </div>
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
            <ion-select interface="popover" [interfaceOptions]="{ cssClass: 'love-popover' }" [(ngModel)]="selectedAlbumId" (ionChange)="saveSelectedAlbum()" class="glass-select" style="--padding-start: 16px; --padding-end: 16px; --padding-top: 14px; --padding-bottom: 14px;">
              <ion-select-option value="feed">Todas las fotos</ion-select-option>
              <ion-select-option *ngFor="let album of albums" [value]="album.id">{{ album.name }}</ion-select-option>
            </ion-select>
          </div>

          <!-- Tour Gastronómico -->
          <div class="grid-card interactive" id="mas-gastro" (click)="openGastroModal()">
            <div class="icon-circle" style="background: linear-gradient(135deg, #FF9A9E, #FECFEF); box-shadow: 0 4px 15px rgba(255, 154, 158, 0.3); color: #c9184a;">
              <ion-icon name="restaurant-outline"></ion-icon>
            </div>
            <h4>Tour Gastro</h4>
            <span class="sub">Platos y sitios</span>
          </div>

          <!-- Cine Pareja -->
          <div class="grid-card interactive" id="mas-cine" (click)="openCineModal()">
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
        <!-- Settings -->
          <div class="grid-card full-width interactive" id="mas-ajustes" (click)="isSettingsModalOpen = true">
            <h4><ion-icon name="settings-sharp" style="color: #6c757d;"></ion-icon> Ajustes de Cuenta</h4>
            <p style="margin: 0; font-size: 0.85rem; color: #495057; font-weight: 500;">Modo Búho, Privacidad y Cuenta.</p>
          </div>

        </div>

        <!-- Logout -->
        <button class="logout-btn" (click)="isLogoutModalOpen = true">
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

      <!-- Settings Modal -->
      <div class="custom-overlay" *ngIf="isSettingsModalOpen" (click)="isSettingsModalOpen = false" style="align-items: flex-end;">
        <div class="bottom-sheet-modal" (click)="$event.stopPropagation()">
          <div class="bottom-sheet-header">
            <div class="sheet-close-btn" (click)="isSettingsModalOpen = false">
              <ion-icon name="close-outline"></ion-icon>
            </div>
            <h2>Ajustes</h2>
            <p>Configura tu cuenta y preferencias.</p>
          </div>
          
          <div class="bottom-sheet-body">
            <div class="settings-list">
              <div class="settings-item" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: rgba(255,255,255,0.8); border-radius: 14px; margin-bottom: 10px;">
                <div>
                  <h4 style="margin: 0; color: #590D22; font-weight: 700;">🦉 Modo Búho</h4>
                  <p style="margin: 0; font-size: 0.8rem; color: #6c757d;">Activa el modo oscuro global.</p>
                </div>
                <ion-toggle [(ngModel)]="isNightOwlEnabled" (ionChange)="toggleNightOwl()"></ion-toggle>
              </div>

              <div class="settings-item interactive" (click)="confirmUnpair()" style="display: flex; align-items: center; padding: 15px; background: rgba(255, 77, 109, 0.1); border-radius: 14px; margin-bottom: 10px;">
                <ion-icon name="heart-dislike-outline" style="color: #FF4D6D; font-size: 1.5rem; margin-right: 15px;"></ion-icon>
                <div>
                  <h4 style="margin: 0; color: #FF4D6D; font-weight: 700;">Desvincular Pareja</h4>
                  <p style="margin: 0; font-size: 0.8rem; color: #a4133c;">Romper el vínculo actual.</p>
                </div>
              </div>

              <div class="settings-item interactive" (click)="confirmDeleteAccount()" style="display: flex; align-items: center; padding: 15px; background: rgba(200, 0, 0, 0.1); border-radius: 14px;">
                <ion-icon name="trash-outline" style="color: #c80000; font-size: 1.5rem; margin-right: 15px;"></ion-icon>
                <div>
                  <h4 style="margin: 0; color: #c80000; font-weight: 700;">Eliminar mi Cuenta</h4>
                  <p style="margin: 0; font-size: 0.8rem; color: #a4133c;">Borrar todos mis datos para siempre.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        <!-- Food List Modal -->
        <div class="custom-overlay" *ngIf="isFoodListModalOpen" (click)="closeGastroModal()" style="align-items: flex-end;">
          <div class="bottom-sheet-modal" (click)="$event.stopPropagation()">
            <div class="bottom-sheet-header">
              <div class="sheet-close-btn" (click)="closeGastroModal()">
                <ion-icon name="close-outline"></ion-icon>
              </div>
              <h2>Tour Gastronómico</h2>
              <p>Restaurantes y platos que hemos probado.</p>
            </div>
            
            <div class="bottom-sheet-body">
              <div style="position: relative; margin-bottom: 15px; width: 100%;">
                <ion-icon name="search-outline" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #a4133c; font-size: 1.4rem; z-index: 1; pointer-events: none;"></ion-icon>
                <input type="text" id="gastro-search" [(ngModel)]="searchQueryFoodPlaces" placeholder="Buscar restaurante..." class="glass-input" style="padding-left: 45px; background: rgba(255,255,255,0.8); box-shadow: 0 4px 15px rgba(0,0,0,0.05);" />
              </div>

              <div id="gastro-filters" style="display: flex; gap: 10px; margin-bottom: 15px; align-items: center;">
                <ion-select interface="popover" [interfaceOptions]="{ cssClass: 'love-popover' }" [(ngModel)]="selectedFoodCategory" class="glass-input" style="flex: 1; --padding-start: 15px; --padding-end: 15px; --padding-top: 8px; --padding-bottom: 8px;" placeholder="Todas las categorías">
                  <ion-select-option value="">Todas las categorías</ion-select-option>
                  <ion-select-option *ngFor="let cat of foodCategories" [value]="cat">{{ cat }}</ion-select-option>
                </ion-select>
                
                <button class="glass-btn" style="padding: 8px 15px; font-size: 1.5rem; width: auto; flex: 0 0 auto; box-shadow: none;" [style.color]="showFavoritesOnlyFoodPlaces ? '#FF4D6D' : '#888'" [style.background]="showFavoritesOnlyFoodPlaces ? 'rgba(255, 77, 109, 0.1)' : 'rgba(255, 255, 255, 0.5)'" (click)="showFavoritesOnlyFoodPlaces = !showFavoritesOnlyFoodPlaces">
                  <ion-icon [name]="showFavoritesOnlyFoodPlaces ? 'heart' : 'heart-outline'"></ion-icon>
                </button>
              </div>
              
              <div id="gastro-list" style="margin-bottom: 0;">
                <div class="food-places-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                  <div class="food-place-item" *ngFor="let place of filteredFoodPlaces" (click)="openFoodPlaceModal(place)" style="position: relative; background: rgba(255,255,255,0.8); border-radius: 14px; padding: 10px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); cursor: pointer;">
                    <div *ngIf="place.is_favorite" style="position: absolute; top: 8px; left: 8px; z-index: 5;">
                      <ion-icon name="heart" style="color: #FF4D6D; font-size: 1.2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));"></ion-icon>
                    </div>
                    <div style="position: absolute; top: 8px; right: 8px; width: 26px; height: 26px; background: rgba(255,255,255,0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); z-index: 5;" (click)="$event.stopPropagation(); editFoodPlace(place)">
                      <ion-icon name="pencil-outline" style="font-size: 1.1rem; color: #FF4D6D;"></ion-icon>
                    </div>
                    <div class="place-image" [style.backgroundImage]="'url(' + (place.image_url_full || 'assets/default-food.png') + ')'" style="width: 100%; aspect-ratio: 1; border-radius: 10px; background-size: cover; background-position: center; margin: 0 auto 10px;"></div>
                    <span class="p-title" style="display: block; font-weight: 700; color: #590D22; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ place.name }}</span>
                    <span *ngIf="place.category" style="display: block; font-size: 0.7rem; color: #a4133c; margin-bottom: 2px;">{{ place.category }}</span>
                    <span class="p-rating" style="color: #FFB703; font-size: 0.8rem;">
                      <ng-container *ngTemplateOutlet="staticStars; context: { rating: place.rating }"></ng-container>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="bottom-sheet-footer">
              <button id="gastro-add" class="glass-btn" style="width: 100%; box-shadow: 0 4px 15px rgba(255, 77, 109, 0.4);" (click)="openAddFoodPlaceModal()">
                <ion-icon name="add-circle-outline"></ion-icon> Añadir Restaurante
              </button>
            </div>
          </div>
        </div>

        <!-- Movies List Modal -->
        <div class="custom-overlay" id="cine-modal" *ngIf="isMovieListModalOpen" (click)="closeCineModal()" style="align-items: flex-end;">
          <div class="bottom-sheet-modal" (click)="$event.stopPropagation()">
            <div class="bottom-sheet-header">
              <div class="sheet-close-btn" (click)="closeCineModal()">
                <ion-icon name="close-outline"></ion-icon>
              </div>
              <h2>Cine en Pareja</h2>
              <p>Películas y series que vemos juntos.</p>
            </div>
            
            <div class="bottom-sheet-body">
              <div style="position: relative; margin-bottom: 15px; width: 100%;">
                <ion-icon name="search-outline" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #a4133c; font-size: 1.4rem; z-index: 1; pointer-events: none;"></ion-icon>
                <input type="text" id="cine-search" [(ngModel)]="searchQueryMovies" placeholder="Buscar película o serie..." class="glass-input" style="padding-left: 45px; background: rgba(255,255,255,0.8); box-shadow: 0 4px 15px rgba(0,0,0,0.05);" />
              </div>

              <div id="cine-filters" style="display: flex; gap: 10px; margin-bottom: 15px; align-items: center;">
                <ion-select interface="popover" [interfaceOptions]="{ cssClass: 'love-popover' }" [(ngModel)]="selectedMovieGenre" class="glass-input" style="flex: 1; --padding-start: 15px; --padding-end: 15px; --padding-top: 8px; --padding-bottom: 8px;" placeholder="Todos los géneros">
                  <ion-select-option value="">Todos los géneros</ion-select-option>
                  <ion-select-option *ngFor="let g of movieGenres" [value]="g">{{ g }}</ion-select-option>
                </ion-select>
                
                <button class="glass-btn" style="padding: 8px 15px; font-size: 1.5rem; width: auto; flex: 0 0 auto; box-shadow: none;" [style.color]="showFavoritesOnlyMovies ? '#FF4D6D' : '#888'" [style.background]="showFavoritesOnlyMovies ? 'rgba(255, 77, 109, 0.1)' : 'rgba(255, 255, 255, 0.5)'" (click)="showFavoritesOnlyMovies = !showFavoritesOnlyMovies">
                  <ion-icon [name]="showFavoritesOnlyMovies ? 'heart' : 'heart-outline'"></ion-icon>
                </button>
              </div>
              
              <div id="cine-list" style="margin-bottom: 0;">
                <div class="movies-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                  <div class="movie-item" *ngFor="let movie of filteredMovies" (click)="openMovieModal(movie)" style="position: relative; background: rgba(255,255,255,0.8); border-radius: 14px; padding: 10px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); cursor: pointer;">
                    <div *ngIf="movie.is_favorite" style="position: absolute; top: 8px; left: 8px; z-index: 5;">
                      <ion-icon name="heart" style="color: #FF4D6D; font-size: 1.2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));"></ion-icon>
                    </div>
                    <div style="position: absolute; top: 8px; right: 8px; width: 26px; height: 26px; background: rgba(255,255,255,0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); z-index: 5;" (click)="$event.stopPropagation(); editMovie(movie)">
                      <ion-icon name="pencil-outline" style="font-size: 1.1rem; color: #FF4D6D;"></ion-icon>
                    </div>
                    <div class="movie-image" [style.backgroundImage]="'url(' + (movie.image_url_full || 'assets/default-movie.png') + ')'" style="width: 100%; aspect-ratio: 2/3; border-radius: 10px; background-size: cover; background-position: center; margin: 0 auto 10px;"></div>
                    <span class="m-title" style="display: block; font-weight: 800; color: #590D22; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">{{ movie.title }}</span>
                    <span *ngIf="movie.genre" style="display: block; font-size: 0.7rem; color: #a4133c; margin-top: 3px;">{{ movie.genre }}</span>
                    <span class="m-rating" style="color: #FFB703; font-size: 0.8rem; display: block; margin-top: 3px;">
                      <ng-container *ngTemplateOutlet="staticStars; context: { rating: movie.rating }"></ng-container>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="bottom-sheet-footer">
              <button id="cine-add" class="glass-btn" style="width: 100%; box-shadow: 0 4px 15px rgba(255, 77, 109, 0.4);" (click)="openAddMovieModal()">
                <ion-icon name="add-circle-outline"></ion-icon> Añadir Película/Serie
              </button>
            </div>
          </div>
        </div>

        <!-- Add Food Place Modal -->
        <div class="custom-overlay" *ngIf="isAddingFoodPlace" (click)="isAddingFoodPlace = false">
          <div class="modal-content glass-card" style="margin: 20px; padding: 25px; text-align: center; width: 90%; max-width: 400px; box-sizing: border-box; border: none; background: rgba(255, 255, 255, 0.95); max-height: 75vh; overflow-y: auto;" (click)="$event.stopPropagation()">
            <h2 style="color: #590D22; margin-bottom: 20px; font-weight: 900;">{{ newFoodPlace.id ? 'Editar Restaurante' : 'Nuevo Restaurante' }} 🍔</h2>
            
            <div *ngIf="newFoodPlace.imageBase64 || newFoodPlace.image_url_full" class="milestone-cover" style="width: 100%; height: 150px; border-radius: 18px; margin-bottom: 20px; overflow: hidden; position: relative;">
              <img [src]="newFoodPlace.imageBase64 || newFoodPlace.image_url_full" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; cursor: pointer;" (click)="uploadNewFoodPlacePhoto()">
                 <ion-icon name="camera-outline" style="color: white; font-size: 3rem;"></ion-icon>
              </div>
            </div>
            
            <button *ngIf="!newFoodPlace.imageBase64 && !newFoodPlace.image_url_full" class="glass-btn" style="margin-bottom: 15px;" (click)="uploadNewFoodPlacePhoto()">
              <ion-icon name="camera-outline"></ion-icon> Añadir Foto
            </button>
            
            <input id="gastro-add-name" type="text" placeholder="Nombre del sitio" [(ngModel)]="newFoodPlace.name" class="glass-input" style="width: 100%; margin-bottom: 10px;" />
            <input id="gastro-add-location" type="text" placeholder="Ubicación (ej: Madrid)" [(ngModel)]="newFoodPlace.location" (ngModelChange)="onLocationChange($event)" class="glass-input" style="width: 100%; margin-bottom: 10px;" />
            <div *ngIf="previewMapUrl" style="width: 100%; height: 150px; border-radius: 12px; overflow: hidden; margin-bottom: 10px;">
              <iframe [src]="previewMapUrl" width="100%" height="100%" frameborder="0" style="border:0;" allowfullscreen></iframe>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
              <ion-select id="gastro-add-category" interface="popover" [interfaceOptions]="{ cssClass: 'love-popover' }" [(ngModel)]="newFoodPlace.category" class="glass-input" style="flex: 1; --padding-start: 15px; --padding-end: 15px; --padding-top: 14px; --padding-bottom: 14px;" placeholder="(Sin categoría)">
                <ion-select-option value="">(Sin categoría)</ion-select-option>
                <ion-select-option *ngFor="let cat of foodCategories" [value]="cat">{{ cat }}</ion-select-option>
              </ion-select>
              
              <button class="glass-btn" style="padding: 0 15px; font-size: 1.5rem; width: auto; flex: 0 0 auto; box-shadow: none; display: flex; align-items: center; justify-content: center;" [style.color]="newFoodPlace.is_favorite ? '#FF4D6D' : '#888'" [style.background]="newFoodPlace.is_favorite ? 'rgba(255, 77, 109, 0.1)' : 'rgba(255, 255, 255, 0.5)'" (click)="newFoodPlace.is_favorite = !newFoodPlace.is_favorite">
                <ion-icon [name]="newFoodPlace.is_favorite ? 'heart' : 'heart-outline'"></ion-icon>
              </button>
            </div>
            
            <textarea id="gastro-add-desc" placeholder="¿Qué tal estaba? Plato estrella, etc." [(ngModel)]="newFoodPlace.description" class="glass-input" style="width: 100%; min-height: 80px; margin-bottom: 10px; resize: vertical;"></textarea>
            
            <div style="margin-bottom: 20px;">
              <p style="margin: 0 0 5px; color: #a4133c; font-weight: 600;">Puntuación:</p>
              <div id="gastro-add-rating" style="display: flex; justify-content: center; gap: 5px;">
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
              <button *ngIf="newFoodPlace?.id" class="glass-btn" style="flex: 1; background: rgba(255,0,0,0.1); color: red; font-size: 0.9rem;" (click)="deleteFoodPlace(newFoodPlace.id)">Eliminar</button>
              <button class="glass-btn" style="flex: 1; background: rgba(128,15,47,0.1); color: #800f2f;" (click)="isAddingFoodPlace = false">Cancelar</button>
              <button class="glass-btn" style="flex: 1;" (click)="saveFoodPlace()">Guardar</button>
            </div>
          </div>
        </div>

        <!-- View Food Place Modal -->
        <div class="custom-overlay" *ngIf="isFoodPlaceModalOpen" (click)="isFoodPlaceModalOpen = false">
          <div class="modal-content glass-card" style="position: relative; margin: 10px; padding: 25px; text-align: center; width: 90%; max-width: 450px; box-sizing: border-box; border: none; background: rgba(255, 255, 255, 0.95); box-shadow: 0 10px 40px rgba(255, 77, 109, 0.15); max-height: 75vh; overflow-y: auto;" (click)="$event.stopPropagation()">
            
            <div style="position: absolute; top: 15px; left: 15px; width: 36px; height: 36px; background: rgba(255,255,255,0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1); z-index: 10; cursor: pointer;" (click)="editFoodPlace(selectedFoodPlace)">
              <ion-icon name="pencil-outline" style="font-size: 1.5rem; color: #FF4D6D;"></ion-icon>
            </div>
            
            <div style="position: absolute; top: 15px; right: 15px; width: 36px; height: 36px; background: rgba(255,255,255,0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1); z-index: 10; cursor: pointer;" (click)="isFoodPlaceModalOpen = false">
              <ion-icon name="close-outline" style="font-size: 1.8rem; color: #590D22;"></ion-icon>
            </div>
            
            <div *ngIf="selectedFoodPlace?.image_url_full" class="milestone-cover" style="width: 100%; height: 180px; border-radius: 18px; margin-bottom: 20px; overflow: hidden; position: relative;">
              <img [src]="selectedFoodPlace?.image_url_full" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            
            <h2 style="color: #590D22; margin-bottom: 5px; font-weight: 900; font-size: 1.6rem;">
              {{ selectedFoodPlace?.name }}
              <ion-icon *ngIf="selectedFoodPlace?.is_favorite" name="heart" style="color: #FF4D6D; font-size: 1.2rem; vertical-align: middle; margin-left: 5px;"></ion-icon>
            </h2>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
              <button class="glass-btn" style="padding: 6px 12px; font-size: 1rem; display: inline-flex; align-items: center; gap: 5px; color: #590D22; background: rgba(255,255,255,0.9); border: 1px solid rgba(255,77,109,0.3);" (click)="openMap(selectedFoodPlace?.location)">
                <ion-icon name="location-outline" style="font-size: 1.2rem; color: #FF4D6D;"></ion-icon> 
                <span style="font-weight: 800;">{{ selectedFoodPlace?.location }}</span>
              </button>
              <span *ngIf="selectedFoodPlace?.category" style="background: rgba(255,77,109,0.1); padding: 4px 10px; border-radius: 12px; font-size: 0.85rem; font-weight: 700; color: #FF4D6D;">{{ selectedFoodPlace.category }}</span>
            </div>
            <div style="color: #FFB703; font-size: 1.5rem; margin-bottom: 15px;">
                <ng-container *ngTemplateOutlet="staticStars; context: { rating: selectedFoodPlace?.rating }"></ng-container>
            </div>
            
            <p *ngIf="selectedFoodPlace?.description" style="color: #590D22; font-size: 1rem; line-height: 1.5; font-weight: 500; text-align: left; background: rgba(255,255,255,0.8); padding: 15px; border-radius: 14px; border: 1px solid rgba(255,77,109,0.2); margin-bottom: 20px;">
              "{{ selectedFoodPlace.description }}"
            </p>
            
            <div class="dishes-section" style="text-align: left; margin-bottom: 20px; max-height: 40vh; overflow-y: auto; padding-right: 5px;">
              <h4 style="color: #800f2f; font-weight: 800; border-bottom: 2px solid rgba(255,77,109,0.2); padding-bottom: 5px; margin-bottom: 15px;">Platos</h4>
              
              <div class="dish-item" *ngFor="let dish of selectedFoodPlace?.dishes" style="display: flex; gap: 10px; background: rgba(255,255,255,0.6); padding: 10px; border-radius: 12px; margin-bottom: 10px; align-items: center;">
                <div style="position: relative;">
                  <div *ngIf="dish.image_url_full" style="width: 60px; height: 60px; border-radius: 8px; background-size: cover; background-position: center;" [style.backgroundImage]="'url(' + dish.image_url_full + ')'"></div>
                  <div *ngIf="!dish.image_url_full" style="width: 60px; height: 60px; border-radius: 8px; background: rgba(255,77,109,0.1); display: flex; align-items: center; justify-content: center;">
                    <ion-icon name="restaurant-outline" style="font-size: 1.5rem; color: rgba(255,77,109,0.5);"></ion-icon>
                  </div>
                  <div style="position: absolute; top: -6px; left: -6px; width: 22px; height: 22px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); cursor: pointer; z-index: 2;" (click)="editFoodDish(dish)">
                    <ion-icon name="pencil-outline" style="font-size: 0.9rem; color: #FF4D6D;"></ion-icon>
                  </div>
                </div>
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
                 
                 <div *ngIf="newDish.imageBase64 || newDish.image_url_full" style="height: 100px; border-radius: 8px; background-size: cover; background-position: center; margin-bottom: 10px;" [style.backgroundImage]="'url(' + (newDish.imageBase64 || newDish.image_url_full) + ')'"></div>
                 
                 <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <button class="glass-btn" style="flex: 1; padding: 10px; font-size: 0.9rem;" (click)="isAddingDish = false">Cancelar</button>
                    <button class="glass-btn" style="flex: 1; padding: 10px; font-size: 0.9rem;" (click)="saveFoodDish()">Guardar Plato</button>
                 </div>
              </div>
              
              <button *ngIf="!isAddingDish" class="glass-btn" style="width: 100%; padding: 10px; font-size: 0.9rem; margin-top: 10px;" (click)="isAddingDish = true">
                <ion-icon name="add"></ion-icon> Añadir Plato
              </button>
            </div>


          </div>
        </div>

        <!-- Add Movie Modal -->
        <div class="custom-overlay" *ngIf="isAddingMovie" (click)="isAddingMovie = false">
          <div class="modal-content glass-card" style="margin: 20px; padding: 25px; text-align: center; width: 90%; max-width: 400px; box-sizing: border-box; border: none; background: rgba(255, 255, 255, 0.95); max-height: 75vh; overflow-y: auto;" (click)="$event.stopPropagation()">
            <h2 style="color: #590D22; margin-bottom: 20px; font-weight: 900;">
              {{ newMovie.id ? 'Editar Peli/Serie' : 'Nueva Peli/Serie' }} 
              <span (click)="showWhoFellAsleep = !showWhoFellAsleep" style="cursor: pointer; user-select: none;" title="Haz clic para revelar una opción secreta 😉">🍿</span>
            </h2>
            
            <div *ngIf="newMovie.imageBase64 || newMovie.image_url_full || newMovie.image_url" class="milestone-cover" style="width: 120px; height: 180px; border-radius: 12px; margin: 0 auto 20px; overflow: hidden; position: relative;">
              <img [src]="newMovie.imageBase64 || newMovie.image_url_full || newMovie.image_url" style="width: 100%; height: 100%; object-fit: cover;" />
              <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; cursor: pointer;" (click)="uploadNewMoviePhoto()">
                 <ion-icon name="camera-outline" style="color: white; font-size: 3rem;"></ion-icon>
              </div>
            </div>
            
            <button *ngIf="!newMovie.imageBase64 && !newMovie.image_url_full && !newMovie.image_url" class="glass-btn" style="margin-bottom: 15px;" (click)="uploadNewMoviePhoto()">
              <ion-icon name="camera-outline"></ion-icon> Cartel / Foto
            </button>
            
            <input id="cine-add-name" type="text" placeholder="Título" [(ngModel)]="newMovie.title" class="glass-input" style="width: 100%; margin-bottom: 10px;" />
            <textarea id="cine-add-desc" placeholder="¿De qué iba la peli/serie?" [(ngModel)]="newMovie.description" class="glass-input" style="width: 100%; min-height: 60px; margin-bottom: 10px; resize: vertical;"></textarea>
            
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
              <ion-select id="cine-add-category" interface="popover" [interfaceOptions]="{ cssClass: 'love-popover' }" [(ngModel)]="newMovie.genre" class="glass-input" style="flex: 1; --padding-start: 15px; --padding-end: 15px; --padding-top: 14px; --padding-bottom: 14px;" placeholder="(Sin categoría)">
                <ion-select-option value="">(Sin categoría)</ion-select-option>
                <ion-select-option *ngFor="let cat of movieGenres" [value]="cat">{{ cat }}</ion-select-option>
              </ion-select>
              
              <button class="glass-btn" style="padding: 0 15px; font-size: 1.5rem; width: auto; flex: 0 0 auto; box-shadow: none; display: flex; align-items: center; justify-content: center;" [style.color]="newMovie.is_favorite ? '#FF4D6D' : '#888'" [style.background]="newMovie.is_favorite ? 'rgba(255, 77, 109, 0.1)' : 'rgba(255, 255, 255, 0.5)'" (click)="newMovie.is_favorite = !newMovie.is_favorite">
                <ion-icon [name]="newMovie.is_favorite ? 'heart' : 'heart-outline'"></ion-icon>
              </button>
            </div>
            <input *ngIf="showWhoFellAsleep" type="text" placeholder="¿Quién se quedó dormido primero?" [(ngModel)]="newMovie.who_fell_asleep" class="glass-input" style="width: 100%; margin-bottom: 10px;" />
            <textarea id="cine-add-quote" placeholder="Nuestra frase favorita / Momento top" [(ngModel)]="newMovie.favorite_quote" class="glass-input" style="width: 100%; min-height: 80px; margin-bottom: 10px; resize: vertical;"></textarea>
            
            <div style="margin-bottom: 20px;">
              <p style="margin: 0 0 5px; color: #a4133c; font-weight: 600;">Puntuación:</p>
              <div id="cine-add-rating" style="display: flex; justify-content: center; gap: 5px;">
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
              <button *ngIf="newMovie?.id" class="glass-btn" style="flex: 1; background: rgba(255,0,0,0.1); color: red; font-size: 0.9rem;" (click)="deleteMovie(newMovie.id)">Eliminar</button>
              <button class="glass-btn" style="flex: 1; background: rgba(128,15,47,0.1); color: #800f2f;" (click)="isAddingMovie = false">Cancelar</button>
              <button class="glass-btn" style="flex: 1;" (click)="saveMovie()">Guardar</button>
            </div>
          </div>
        </div>

        <!-- View Movie Modal -->
        <div class="custom-overlay" *ngIf="isMovieModalOpen" (click)="isMovieModalOpen = false">
          <div class="modal-content glass-card" style="position: relative; margin: 10px; padding: 25px; text-align: center; width: 90%; max-width: 450px; box-sizing: border-box; border: none; background: rgba(255, 255, 255, 0.95); box-shadow: 0 10px 40px rgba(255, 77, 109, 0.15); max-height: 75vh; overflow-y: auto;" (click)="$event.stopPropagation()">
            
            <div style="position: absolute; top: 15px; left: 15px; width: 36px; height: 36px; background: rgba(255,255,255,0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1); z-index: 10; cursor: pointer;" (click)="editMovie(selectedMovie)">
              <ion-icon name="pencil-outline" style="font-size: 1.5rem; color: #FF4D6D;"></ion-icon>
            </div>
            
            <div style="position: absolute; top: 15px; right: 15px; width: 36px; height: 36px; background: rgba(255,255,255,0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1); z-index: 10; cursor: pointer;" (click)="isMovieModalOpen = false">
              <ion-icon name="close-outline" style="font-size: 1.8rem; color: #590D22;"></ion-icon>
            </div>
            
            <div *ngIf="selectedMovie?.image_url_full || selectedMovie?.image_url" class="milestone-cover" style="width: 140px; height: 210px; border-radius: 12px; margin: 0 auto 20px; overflow: hidden; position: relative; box-shadow: 0 8px 20px rgba(0,0,0,0.15);">
              <img [src]="selectedMovie?.image_url_full || selectedMovie?.image_url" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
            
            <h2 style="color: #590D22; margin-bottom: 10px; font-weight: 900; font-size: 1.6rem;">
              {{ selectedMovie?.title }}
              <ion-icon *ngIf="selectedMovie?.is_favorite" name="heart" style="color: #FF4D6D; font-size: 1.2rem; vertical-align: middle; margin-left: 5px;"></ion-icon>
            </h2>
            <div *ngIf="selectedMovie?.genre" style="margin-bottom: 10px;">
              <span style="display: inline-block; background: rgba(255,77,109,0.1); padding: 4px 10px; border-radius: 12px; font-size: 0.85rem; font-weight: 600; color: #FF4D6D;">{{ selectedMovie.genre }}</span>
            </div>
            
            <div style="color: #FFB703; font-size: 1.8rem; margin-bottom: 20px;">
                <ng-container *ngTemplateOutlet="staticStars; context: { rating: selectedMovie?.rating }"></ng-container>
            </div>
            
            <p *ngIf="selectedMovie?.description" style="color: #590D22; font-size: 0.95rem; line-height: 1.4; margin-bottom: 20px; text-align: center; white-space: pre-wrap;">
              {{ selectedMovie.description }}
            </p>
            
            <div *ngIf="selectedMovie?.who_fell_asleep" style="background: rgba(255,77,109,0.05); border-radius: 14px; padding: 15px; margin-bottom: 15px; text-align: center;">
              <p style="margin: 0; color: #a4133c; font-size: 0.95rem;">
                <ion-icon name="moon-outline" style="vertical-align: middle; margin-right: 5px;"></ion-icon>
                <strong>Se durmió:</strong> {{ selectedMovie.who_fell_asleep }}
              </p>
            </div>
            
            <p *ngIf="selectedMovie?.favorite_quote" style="color: #590D22; font-size: 1.05rem; line-height: 1.5; font-style: italic; font-weight: 500; text-align: center; background: rgba(255,255,255,0.8); padding: 15px; border-radius: 14px; border: 1px solid rgba(255,77,109,0.2); margin-bottom: 20px;">
              "{{ selectedMovie.favorite_quote }}"
            </p>
            

          </div>
        </div>

        <!-- Logout Confirmation Modal -->
        <div class="custom-overlay" *ngIf="isLogoutModalOpen" (click)="isLogoutModalOpen = false">
          <div class="modal-content glass-card" style="margin: 20px; padding: 30px; text-align: center; width: 85%; max-width: 350px; box-sizing: border-box; border: none; background: rgba(255, 255, 255, 0.95); box-shadow: 0 10px 40px rgba(255, 77, 109, 0.15);" (click)="$event.stopPropagation()">
            <ion-icon name="log-out-outline" style="font-size: 4rem; color: #FF4D6D; margin-bottom: 15px; background: rgba(255,77,109,0.1); padding: 15px; border-radius: 50%;"></ion-icon>
            <h2 style="color: #590D22; margin-bottom: 10px; font-weight: 900; font-size: 1.5rem;">Cerrar Sesión</h2>
            <p style="color: #a4133c; font-size: 1.05rem; font-weight: 500; margin-bottom: 25px;">
              ¿Estás seguro de que quieres salir?
            </p>
            
            <div style="display: flex; gap: 10px;">
              <button class="glass-btn" style="flex: 1; background: rgba(128,15,47,0.1); color: #800f2f;" (click)="isLogoutModalOpen = false">Cancelar</button>
              <button class="glass-btn" style="flex: 1; background: #FF4D6D; color: white;" (click)="doLogout()">Salir</button>
            </div>
          </div>
        </div>
          
        <!-- Map Modal -->
        <div class="custom-overlay" *ngIf="isMapModalOpen" style="z-index: 9999999;" (click)="isMapModalOpen = false">
          <div class="modal-content glass-card" style="margin: 20px; padding: 25px; text-align: center; width: 90%; max-width: 400px; box-sizing: border-box; border: none; background: rgba(255, 255, 255, 0.95); max-height: 75vh; overflow-y: auto;" (click)="$event.stopPropagation()">
            <h2 style="color: #590D22; margin-bottom: 15px; font-weight: 900;">Ubicación 📍</h2>
            <div style="width: 100%; height: 300px; border-radius: 12px; overflow: hidden; margin-bottom: 20px;">
              <iframe *ngIf="safeMapUrl" [src]="safeMapUrl" width="100%" height="100%" frameborder="0" style="border:0;" allowfullscreen></iframe>
            </div>
            <button class="glass-btn" style="width: 100%; padding: 12px;" (click)="isMapModalOpen = false">Cerrar</button>
          </div>
        </div>
        
        <!-- Confirm Modal -->
        <div class="custom-overlay" *ngIf="isConfirmModalOpen" style="z-index: 100000;" (click)="isConfirmModalOpen = false">
          <div class="modal-content glass-card" style="margin: 20px; padding: 25px; text-align: center; width: 90%; max-width: 400px; box-sizing: border-box; border: none; background: rgba(255, 255, 255, 0.95); max-height: 75vh; overflow-y: auto;" (click)="$event.stopPropagation()">
            <h2 style="color: #590D22; margin-bottom: 15px; font-weight: 900;">{{ confirmTitle }}</h2>
            <p style="color: #a4133c; font-size: 1.1rem; margin-bottom: 25px; font-weight: 500;">{{ confirmMessage }}</p>
            <div style="display: flex; gap: 10px;">
              <button class="glass-btn" style="flex: 1; background: rgba(128,15,47,0.1); color: #800f2f; box-shadow: none;" (click)="isConfirmModalOpen = false">Cancelar</button>
              <button class="glass-btn" style="flex: 1; box-shadow: none;" (click)="executeConfirm()">Sí, eliminar</button>
            </div>
          </div>
        </div>

        <!-- TIMELINE COMPONENT -->
        <app-timeline-widget *ngIf="isTimelineModalOpen" [initialPlanId]="timelineInitialPlanId" (close)="closeTimelineModal()"></app-timeline-widget>
      </ion-content>
    `,
    styles: [`
    :host { display: block; height: 100%; }
    .scroll-content { --background: transparent; }
    .mas-container { padding: calc(env(safe-area-inset-top) + 85px) 20px 20px; font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #fff0f3 0%, #ffccd5 100%); min-height: 100%; padding-bottom: 100px; }
    
    .header { margin-bottom: 25px; text-align: center; }
    .title { margin: 0; font-size: 1.8rem; font-weight: 900; color: #590D22; letter-spacing: -0.5px; text-shadow: 0 2px 10px rgba(255,255,255,0.8); }
    .subtitle { margin: 5px 0 0; color: #a4133c; font-weight: 500; font-size: 0.95rem; }

    .custom-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center; z-index: 99999;
    }
    
    .bottom-sheet-modal {
      width: 100%; height: 90%; background: #fff0f3;
      border-top-left-radius: 30px; border-top-right-radius: 30px;
      display: flex; flex-direction: column; overflow: hidden; position: relative;
    }
    .bottom-sheet-header { padding: 25px 20px 10px; position: relative; background: #fff0f3; z-index: 2; text-align: left; }
    .bottom-sheet-header h2 { margin: 0; font-size: 1.8rem; font-weight: 900; color: #590D22; display: flex; align-items: center; gap: 10px; }
    .bottom-sheet-header p { margin: 5px 0 20px; color: #a4133c; font-size: 0.95rem; }
    .bottom-sheet-body { flex: 1; overflow-y: auto; padding: 0 20px; }
    .bottom-sheet-footer { padding: 15px 20px 25px; background: linear-gradient(to top, #fff0f3 80%, rgba(255,240,243,0)); position: relative; z-index: 2; }
    
    .sheet-close-btn {
      position: absolute; top: 20px; right: 20px; width: 36px; height: 36px;
      background: rgba(255,255,255,0.8); border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1); cursor: pointer;
    }
    .sheet-close-btn ion-icon { font-size: 1.5rem; color: #590D22; }

    /* Glassmorphism Cards */
    .glass-card { background: rgba(255, 255, 255, 0.5); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-radius: 24px; padding: 22px; margin-bottom: 20px; box-shadow: 0 8px 32px rgba(255, 77, 109, 0.08); border: 1px solid rgba(255, 255, 255, 0.6); }
    
    .section-title { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
    .section-title ion-icon { font-size: 1.6rem; color: #FF4D6D; background: rgba(255,77,109,0.1); padding: 8px; border-radius: 12px; flex-shrink: 0; }
    .section-title h3 { margin: 0; font-size: 1.2rem; font-weight: 800; color: #590D22; }
    .desc { font-size: 0.9rem; color: #800f2f; margin-bottom: 15px; line-height: 1.4; font-weight: 500; }

    /* Inputs */
    .glass-input { width: 100%; padding: 14px 16px; border-radius: 14px; border: 2px solid rgba(255,255,255,0.8); background: rgba(255,255,255,0.6); font-family: 'Inter', sans-serif; font-size: 0.95rem; color: #590D22; outline: none; transition: all 0.3s; font-weight: 600; box-shadow: inset 0 2px 5px rgba(0,0,0,0.02); color-scheme: light; -webkit-appearance: none; appearance: none; position: relative; }
    input[type="date"].glass-input, input[type="datetime-local"].glass-input { min-height: 50px; display: block; }
    .glass-input:focus { border-color: #FF4D6D; background: #fff; box-shadow: 0 4px 15px rgba(255,77,109,0.1); }
    .glass-input::placeholder { color: #b08a96; font-weight: normal; opacity: 1; -webkit-text-fill-color: #b08a96; }
    .glass-input::-webkit-calendar-picker-indicator { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); cursor: pointer; filter: invert(20%) sepia(80%) saturate(300%) hue-rotate(310deg) brightness(60%) contrast(100%); opacity: 0.8; }
    .glass-input::-webkit-calendar-picker-indicator:hover { opacity: 1; }
    .glass-input::-webkit-datetime-edit { color: #590D22; }
    
    .glass-select { width: 100%; padding: 14px 16px; border-radius: 14px; border: 2px solid rgba(255,255,255,0.8); background: rgba(255,255,255,0.6); font-family: 'Inter', sans-serif; font-size: 1rem; color: #590D22; font-weight: 700; outline: none; appearance: none; -webkit-appearance: none; cursor: pointer; }
    .glass-select:focus { border-color: #FF4D6D; background: #fff; }
    ion-select.glass-input, ion-select.glass-select { 
      padding: 0 !important; 
      --padding-top: 12px !important; 
      --padding-bottom: 12px !important; 
      --padding-start: 16px !important; 
      --padding-end: 16px !important; 
      --highlight-color-valid: #FF4D6D !important; 
      --highlight-color-invalid: #FF4D6D !important; 
      --highlight-color-focused: #FF4D6D !important; 
      --icon-color: #FF4D6D; 
      min-height: unset; 
    }

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
    
    .milestone-item.is-past { opacity: 0.85; }
    .milestone-item.is-past .milestone-indicator { background: #b0b0b0; }
    .milestone-item.is-past .m-days { color: #6c757d; background: rgba(108,117,125,0.15); }
    
    
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
      
      :host-context(.night-owl-mode) .mas-container { background: linear-gradient(135deg, #121212 0%, #1a1a1a 100%); }
      :host-context(.night-owl-mode) .glass-card { background: rgba(30, 30, 30, 0.85); border-color: rgba(255, 255, 255, 0.05); box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
      :host-context(.night-owl-mode) .title, :host-context(.night-owl-mode) .section-title h3, :host-context(.night-owl-mode) .food-info h4, :host-context(.night-owl-mode) .movie-info h4 { color: #fdfdfd; text-shadow: none; }
      :host-context(.night-owl-mode) .subtitle, :host-context(.night-owl-mode) .desc { color: #ccc; }
      :host-context(.night-owl-mode) .glass-input, :host-context(.night-owl-mode) .glass-select { background: rgba(0,0,0,0.4); border-color: #333; color: #fdfdfd; color-scheme: dark; }
      :host-context(.night-owl-mode) .glass-input::-webkit-datetime-edit { color: #fdfdfd; }
      :host-context(.night-owl-mode) .glass-input:focus { border-color: #a78bfa; background: #111; box-shadow: 0 4px 15px rgba(167,139,250,0.2); }
      :host-context(.night-owl-mode) .glass-btn { background: linear-gradient(135deg, #a78bfa, #8b5cf6); box-shadow: 0 4px 15px rgba(167,139,250,0.3); }
      :host-context(.night-owl-mode) .date-picker-glass label { color: #ccc; }
      :host-context(.night-owl-mode) .heart-pulse ion-icon, :host-context(.night-owl-mode) .section-title ion-icon { color: #a78bfa; filter: drop-shadow(0 0 15px rgba(167,139,250,0.6)); background: rgba(167,139,250,0.1); }
      :host-context(.night-owl-mode) .time-block { background: rgba(0,0,0,0.5); border-color: #333; }
      :host-context(.night-owl-mode) .time-val { color: #fdfdfd; }
      :host-context(.night-owl-mode) .time-lbl { color: #a78bfa; }
      :host-context(.night-owl-mode) .food-card, :host-context(.night-owl-mode) .movie-card { background: rgba(0,0,0,0.4); border-color: #333; }
      :host-context(.night-owl-mode) .add-btn { background: rgba(167,139,250,0.1); color: #a78bfa; border-color: rgba(167,139,250,0.3); }
      :host-context(.night-owl-mode) .modal-content.glass-card { background: rgba(30,30,30,0.95); }
      :host-context(.night-owl-mode) .modal-content h2 { color: #fdfdfd !important; }
    `]
})
export class MasWidgetComponent implements OnInit, OnDestroy {
  @Output() openGameEvent = new EventEmitter<void>();

  private api = inject(LoveApiService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private actionSheetCtrl = inject(ActionSheetController);
  private locationService = inject(LocationService);
  private sanitizer = inject(DomSanitizer);
  private tutorialService = inject(TutorialService);
  private offlineSync = inject(OfflineSyncService);

  isMapModalOpen = false;
  safeMapUrl: SafeResourceUrl | null = null;
  
  previewMapUrl: SafeResourceUrl | null = null;
  locationSubject = new Subject<string>();

  startDate: string = '';
  selectedAlbumId: number | string = 'feed';
  albums: any[] = [];
  isTimelineModalOpen = false;
  timelineInitialPlanId: number | null = null;
  upcomingPlan: any = null;

  async loadUpcomingPlan() {
    try {
      const plans = await this.api.getPlans();
      // find the next planned event that is not completed
      const upcoming = plans.filter((p: any) => p.status === 'planned' && p.target_date)
                            .sort((a: any, b: any) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime());
      
      const now = new Date().getTime();
      const futurePlans = upcoming.filter((p: any) => new Date(p.target_date).getTime() >= now - 86400000); // include today
      
      if (futurePlans.length > 0) {
        this.upcomingPlan = futurePlans[0];
      } else {
        this.upcomingPlan = null;
      }
    } catch(e) {
      console.error(e);
    }
  }

  getCategoryIcon(cat: string) {
    if (cat === 'trip') return 'airplane-outline';
    if (cat === 'date') return 'wine-outline';
    if (cat === 'music') return 'musical-notes-outline';
    return 'star-outline';
  }

  openTimelineModal(planId?: number) {
    this.timelineInitialPlanId = planId || null;
    this.isTimelineModalOpen = true;
  }

  closeTimelineModal() {
    this.isTimelineModalOpen = false;
    this.timelineInitialPlanId = null;
    this.loadUpcomingPlan();
  }

  timeTogether = { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  
  annualEvents: { name: string, daysLeft: number, dateStr: string, icon: string, alwaysShow?: boolean }[] = [];
  visibleEvents: { name: string, daysLeft: number, dateStr: string, icon: string, alwaysShow?: boolean }[] = [];
  showAllEvents = false;
  
  isEventModalOpen = false;
  selectedEvent: any = null;

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
  isLogoutModalOpen = false;
  isMovieListModalOpen = false;

  isAddingFoodPlace = false;
  newFoodPlace: any = { name: '', location: '', description: '', rating: 5, category: '', is_favorite: false, imageBase64: null };

  openMap(location: string) {
    if (!location) return;
    const url = `https://maps.google.com/maps?q=${encodeURIComponent(location)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
    this.safeMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.isMapModalOpen = true;
  }

  onLocationChange(value: string) {
    this.locationSubject.next(value);
  }
  isFoodPlaceModalOpen = false;
  selectedFoodPlace: any = null;
  
  foodCategories = ['Española', 'Italiana', 'Árabe', 'Asiática', 'Mexicana', 'Americana', 'Comida Rápida', 'Desayunos/Brunch', 'Postres', 'Otro'];
  selectedFoodCategory = '';
  searchQueryFoodPlaces = '';
  showFavoritesOnlyFoodPlaces = false;

  get filteredFoodPlaces() {
    return this.foodPlaces.filter(p => {
      const matchFav = this.showFavoritesOnlyFoodPlaces ? p.is_favorite : true;
      const matchCat = this.selectedFoodCategory ? p.category === this.selectedFoodCategory : true;
      const matchSearch = this.searchQueryFoodPlaces ? p.name.toLowerCase().includes(this.searchQueryFoodPlaces.toLowerCase()) : true;
      return matchFav && matchCat && matchSearch;
    });
  }
  
  isAddingDish = false;
  newDish: any = { id: null, name: '', description: '', rating: 5, imageBase64: null };
  
  isAddingMovie = false;
  showWhoFellAsleep = false;
  newMovie: any = { title: '', description: '', who_fell_asleep: '', favorite_quote: '', rating: 5, genre: '', is_favorite: false, imageBase64: null };
  isMovieModalOpen = false;
  selectedMovie: any = null;
  
  movieGenres = ['Acción', 'Comedia', 'Drama', 'Terror', 'Ciencia Ficción', 'Fantasía', 'Romance', 'Animación', 'Documental', 'Thriller', 'Otro'];
  selectedMovieGenre = '';
  searchQueryMovies = '';
  showFavoritesOnlyMovies = false;

  get filteredMovies() {
    return this.movies.filter(m => {
      const matchFav = this.showFavoritesOnlyMovies ? m.is_favorite : true;
      const matchGenre = this.selectedMovieGenre ? m.genre === this.selectedMovieGenre : true;
      const matchSearch = this.searchQueryMovies ? m.title.toLowerCase().includes(this.searchQueryMovies.toLowerCase()) : true;
      return matchFav && matchGenre && matchSearch;
    });
  }

  
  isConfirmModalOpen = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmAction: () => void = () => {};

  showConfirm(title: string, message: string, action: () => void) {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmAction = action;
    this.isConfirmModalOpen = true;
  }

  executeConfirm() {
    this.confirmAction();
    this.isConfirmModalOpen = false;
  }

  isSettingsModalOpen = false;
  isNightOwlEnabled = false;

  constructor() {
    addIcons({ bookOutline, imageOutline, logOutOutline, addCircleOutline, starOutline, star, closeOutline, checkmarkCircleOutline, restaurantOutline, locationOutline, pencilOutline, filmOutline, gameControllerOutline, personCircleOutline, informationCircleOutline, heartOutline, heart, chatboxEllipsesOutline, heartDislikeOutline, trashOutline, settingsSharp, timeOutline, settingsOutline, flagOutline, checkmarkCircle, ellipseOutline, moonOutline, closeCircle, calendar, add, cameraOutline, trophyOutline, sparklesOutline, airplaneOutline, wineOutline, musicalNotesOutline, mapOutline, searchOutline });
  }

  async checkNightOwl() {
    const pref = await Preferences.get({ key: 'night_owl_enabled' });
    this.isNightOwlEnabled = pref.value === 'true';
  }

  async toggleNightOwl() {
    await Preferences.set({ key: 'night_owl_enabled', value: this.isNightOwlEnabled ? 'true' : 'false' });
    document.body.classList.toggle('night-owl-mode', this.isNightOwlEnabled);
    document.documentElement.classList.toggle('night-owl-mode', this.isNightOwlEnabled);
  }

  async confirmUnpair() {
    const alert = await this.alertCtrl.create({
      header: '¿Desvincular pareja?',
      message: 'Dejarás de ver toda la información compartida hasta que vuelvas a vincularte. ¿Estás seguro?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Sí, desvincular', 
          role: 'destructive',
          handler: async () => {
            await this.api.unpair();
            this.showToast('Pareja desvinculada', 'success');
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        }
      ]
    });
    await alert.present();
  }

  async confirmDeleteAccount() {
    const alert = await this.alertCtrl.create({
      header: '¿ELIMINAR CUENTA?',
      message: 'Esta acción es IRREVERSIBLE. Se borrarán todos tus datos. ¿Estás absolutamente seguro?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'ELIMINAR', 
          role: 'destructive',
          handler: async () => {
            await this.api.deleteAccount();
            await this.api.logout();
            window.location.reload();
          }
        }
      ]
    });
    await alert.present();
  }

  async ngOnInit() {
    this.checkNightOwl();
    this.locationSubject.pipe(debounceTime(2000)).subscribe(location => {
      if (location && location.trim().length > 0) {
        const url = `https://maps.google.com/maps?q=${encodeURIComponent(location)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
        this.previewMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      } else {
        this.previewMapUrl = null;
      }
    });

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
    } catch (e) {}
    
    this.loadFoodAndMovies();
    this.loadUpcomingPlan();

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

  async openGastroModal() {
    this.isFoodListModalOpen = true;
    document.body.classList.add('hide-tabs');
    setTimeout(() => this.tutorialService.showGastroTour(), 600);
  }

  closeGastroModal() {
    this.isFoodListModalOpen = false;
    document.body.classList.remove('hide-tabs');
  }

  openCineModal() {
    this.isMovieListModalOpen = true;
    document.body.classList.add('hide-tabs');
    setTimeout(() => this.tutorialService.showCineTour(), 600);
  }

  closeCineModal() {
    this.isMovieListModalOpen = false;
    document.body.classList.remove('hide-tabs');
  }

  async handleRefresh(event: any) {
    event.target.complete();
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

    const addEvent = (name: string, month: number, day: number, icon: string, birthYear?: number, alwaysShow?: boolean) => {
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

      this.annualEvents.push({ name: displayName, daysLeft, dateStr, icon, alwaysShow });
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
      addEvent(`Aniversario (${years} años)`, start.getMonth(), start.getDate(), 'time-outline', undefined, true);
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
    this.filterEvents();
  }

  filterEvents() {
    if (this.showAllEvents) {
      this.visibleEvents = [...this.annualEvents];
    } else {
      // Filtrar para mostrar solo los que faltan 7 días o menos, EXCEPTO los marcados con alwaysShow
      this.visibleEvents = this.annualEvents.filter((ev: any) => ev.daysLeft <= 7 || ev.alwaysShow);
    }
  }

  toggleAllEvents() {
    this.showAllEvents = !this.showAllEvents;
    this.filterEvents();
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

  doLogout() {
    this.isLogoutModalOpen = false;
    this.api.logout();
    this.router.navigate(['/login']);
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
    
    if (!navigator.onLine) {
      await this.offlineSync.enqueueAction({
        id: Date.now().toString(),
        type: 'food_place',
        method: this.newFoodPlace.id ? 'PUT' : 'POST',
        endpointId: this.newFoodPlace.id,
        payload: { ...this.newFoodPlace }
      });
      // Añadir temporalmente a la lista para que se vea
      if (this.newFoodPlace.id) {
        const idx = this.foodPlaces.findIndex(p => p.id === this.newFoodPlace.id);
        if (idx !== -1) this.foodPlaces[idx] = { ...this.newFoodPlace };
      } else {
        this.foodPlaces.unshift({ ...this.newFoodPlace, id: Date.now() });
      }
      this.isAddingFoodPlace = false;
      this.newFoodPlace = { name: '', location: '', description: '', rating: 5, category: '', is_favorite: false, imageBase64: null };
      return;
    }

    try {
      if (this.newFoodPlace.id) {
        await this.api.updateFoodPlace(this.newFoodPlace.id, this.newFoodPlace.name, this.newFoodPlace.location, this.newFoodPlace.rating, this.newFoodPlace.description, this.newFoodPlace.imageBase64, this.newFoodPlace.category, this.newFoodPlace.is_favorite);
        this.showToast('Restaurante actualizado', 'success');
      } else {
        await this.api.addFoodPlace(this.newFoodPlace.name, this.newFoodPlace.location, this.newFoodPlace.rating, this.newFoodPlace.description, this.newFoodPlace.imageBase64, this.newFoodPlace.category, this.newFoodPlace.is_favorite);
        this.showToast('Restaurante añadido', 'success');
      }
      this.isAddingFoodPlace = false;
      this.newFoodPlace = { name: '', location: '', description: '', rating: 5, category: '', is_favorite: false, imageBase64: null };
      this.loadFoodAndMovies();
    } catch (e) {
      this.showToast('Error al guardar restaurante', 'danger');
    }
  }

  openAddFoodPlaceModal() {
    this.newFoodPlace = { name: '', location: '', description: '', rating: 5, category: '', is_favorite: false, imageBase64: null };
    this.previewMapUrl = null;
    this.isAddingFoodPlace = true;
    setTimeout(() => this.tutorialService.showGastroAddTour(), 600);
  }

  openAddMovieModal() {
    this.newMovie = { title: '', description: '', rating: 5, genre: '', who_fell_asleep: '', favorite_quote: '', is_favorite: false, imageBase64: null };
    this.isAddingMovie = true;
    setTimeout(() => this.tutorialService.showCineAddTour(), 600);
  }

  editFoodPlace(place: any) {
    this.newFoodPlace = { ...place, imageBase64: null };
    this.previewMapUrl = null;
    if (this.newFoodPlace.location) {
        this.onLocationChange(this.newFoodPlace.location);
    }
    this.isFoodPlaceModalOpen = false;
    this.isAddingFoodPlace = true;
  }

  deleteFoodPlace(id: number) {
    this.showConfirm('Eliminar restaurante', '¿Seguro que quieres eliminar este restaurante de la lista?', async () => {
      try {
        await this.api.deleteFoodPlace(id);
        this.isFoodPlaceModalOpen = false;
        this.isAddingFoodPlace = false;
        this.loadFoodAndMovies();
        this.showToast('Eliminado', 'success');
      } catch (e) {}
    });
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
      if (this.newDish.id) {
        // Update existing
        const updated = await this.api.updateFoodDish(this.selectedFoodPlace.id, this.newDish.id, this.newDish.name, this.newDish.rating, this.newDish.description, this.newDish.imageBase64);
        const index = this.selectedFoodPlace.dishes.findIndex((d: any) => d.id === this.newDish.id);
        if (index !== -1) {
          this.selectedFoodPlace.dishes[index] = updated;
        }
        this.showToast('Plato actualizado', 'success');
      } else {
        // Create new
        const dish = await this.api.addFoodDish(this.selectedFoodPlace.id, this.newDish.name, this.newDish.rating, this.newDish.description, this.newDish.imageBase64);
        if(!this.selectedFoodPlace.dishes) this.selectedFoodPlace.dishes = [];
        this.selectedFoodPlace.dishes.push(dish);
        this.showToast('Plato añadido', 'success');
      }
      this.isAddingDish = false;
      this.newDish = { id: null, name: '', description: '', rating: 5, imageBase64: null };
      this.loadFoodAndMovies();
    } catch (e) {
      this.showToast('Error al guardar plato', 'danger');
    }
  }

  editFoodDish(dish: any) {
    this.newDish = {
      id: dish.id,
      name: dish.name,
      description: dish.description || '',
      rating: dish.rating || 5,
      imageBase64: dish.image_url_full || null
    };
    this.isAddingDish = true;
  }

  deleteFoodDish(dishId: number) {
    this.showConfirm('Eliminar plato', '¿Seguro que quieres eliminar este plato?', async () => {
      try {
        await this.api.deleteFoodDish(this.selectedFoodPlace.id, dishId);
        if (this.selectedFoodPlace) {
          this.selectedFoodPlace.dishes = this.selectedFoodPlace.dishes.filter((d: any) => d.id !== dishId);
        }
        this.showToast('Plato eliminado', 'success');
      } catch (e) {}
    });
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
        if (image.dataUrl) {
          this.newMovie.imageBase64 = image.dataUrl;
          console.log('[PHOTO] Movie photo set, dataUrl length:', image.dataUrl.length);
        } else {
          console.warn('[PHOTO] Camera returned no dataUrl');
        }
      } catch (e) {
        console.error('[PHOTO] Error getting movie photo:', e);
      }
    });
  }

  async saveMovie() {
    if (!this.newMovie.title) return this.showToast('Ponle título', 'warning');
    
    if (!navigator.onLine) {
      await this.offlineSync.enqueueAction({
        id: Date.now().toString(),
        type: 'movie',
        method: this.newMovie.id ? 'PUT' : 'POST',
        endpointId: this.newMovie.id,
        payload: { ...this.newMovie }
      });
      if (this.newMovie.id) {
        const idx = this.movies.findIndex(m => m.id === this.newMovie.id);
        if (idx !== -1) this.movies[idx] = { ...this.newMovie };
      } else {
        this.movies.unshift({ ...this.newMovie, id: Date.now() });
      }
      this.isAddingMovie = false;
      this.newMovie = { title: '', description: '', who_fell_asleep: '', favorite_quote: '', rating: 5, genre: '', is_favorite: false, imageBase64: null };
      this.showWhoFellAsleep = false;
      return;
    }

    try {
      console.log('[SAVE] imageBase64 presente:', !!this.newMovie.imageBase64, 'length:', this.newMovie.imageBase64?.length);
      if (this.newMovie.id) {
        await this.api.updateMovie(this.newMovie.id, this.newMovie.title, this.newMovie.rating, this.newMovie.who_fell_asleep, this.newMovie.favorite_quote, this.newMovie.imageBase64, this.newMovie.description, this.newMovie.genre, this.newMovie.is_favorite);
        this.showToast('Peli actualizada', 'success');
      } else {
        await this.api.addMovie(this.newMovie.title, this.newMovie.rating, this.newMovie.who_fell_asleep, this.newMovie.favorite_quote, this.newMovie.imageBase64, this.newMovie.description, this.newMovie.genre, this.newMovie.is_favorite);
        this.showToast('Peli añadida', 'success');
      }
      this.isAddingMovie = false;
      this.newMovie = { title: '', description: '', who_fell_asleep: '', favorite_quote: '', rating: 5, genre: '', is_favorite: false, imageBase64: null };
      this.showWhoFellAsleep = false;
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

  deleteMovie(id: number) {
    this.showConfirm('Eliminar película', '¿Seguro que quieres eliminar esta peli?', async () => {
      try {
        await this.api.deleteMovie(id);
        this.isMovieModalOpen = false;
        this.isAddingMovie = false;
        this.loadFoodAndMovies();
        this.showToast('Eliminada', 'success');
      } catch (e) {}
    });
  }
}
