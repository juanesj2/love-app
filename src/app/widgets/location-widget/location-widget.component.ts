import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { App } from '@capacitor/app';
import { PluginListenerHandle } from '@capacitor/core';
import { CommonModule } from '@angular/common';
import { IonIcon, ActionSheetController } from '@ionic/angular/standalone';
import * as L from 'leaflet';
import { LocationService } from '../../services/location.service';
import { Subscription, combineLatest } from 'rxjs';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';
import { addIcons } from 'ionicons';
import { locateOutline, flagOutline, camera, image, close, locationOutline, heart } from 'ionicons/icons';
import { LoveApiService } from '../../services/love-api.service';

@Component({
  selector: 'app-location-widget',
  template: `
    <div class="location-container" [class.is-together]="areTogether">
      <div class="map-wrapper">
        <div id="map"></div>
        <button class="center-map-btn" *ngIf="myLastPos" (click)="centerMap()">
          <ion-icon name="locate-outline"></ion-icon>
        </button>
      </div>
      
      <!-- Partner Location Card -->
      <div class="partner-location-card" *ngIf="partnerCity && !areTogether">
        <ion-icon name="location-outline"></ion-icon>
        <span>{{ partnerName }} está en <strong>{{ partnerCity }}</strong></span>
      </div>
      
      <!-- Floating Next Milestone -->
      <div class="next-milestone-card" *ngIf="nextMilestone" (click)="loadNextMilestone()">
        <div class="nm-icon">
          <ion-icon name="flag-outline"></ion-icon>
        </div>
        <div class="nm-info">
          <span class="nm-title">{{ nextMilestone.name }}</span>
          <span class="nm-days">Faltan {{ daysRemaining }} días</span>
        </div>
      </div>
      
      <!-- Together Box -->
      <div class="together-box" *ngIf="areTogether">
        <div class="confetti-container">
          <ion-icon name="heart" class="heart-drop h1"></ion-icon>
          <ion-icon name="heart" class="heart-drop h2"></ion-icon>
          <ion-icon name="heart" class="heart-drop h3"></ion-icon>
          <ion-icon name="heart" class="heart-drop h4"></ion-icon>
          <ion-icon name="heart" class="heart-drop h5"></ion-icon>
        </div>
        <div class="avatars-together">
          <div class="avatar-container together-left" (click)="changeMyAvatar()">
            <img [src]="myAvatarUrl || defaultAvatar" class="avatar" />
            <div class="camera-icon" *ngIf="!uploadingAvatar">📷</div>
            <div class="spinner" *ngIf="uploadingAvatar">⏳</div>
          </div>
          <div class="avatar-container together-right">
            <img [src]="partnerAvatarUrl || defaultAvatar" class="avatar" />
          </div>
        </div>
        <div class="text-info-together">
          <h2>¡Estáis juntos! ❤️</h2>
          <p>Disfrutad del momento</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
    .location-container { height: 100%; display: flex; flex-direction: column; position: relative; overflow: hidden; }
    .location-container.is-together { background: linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%); }
    .location-container.is-together .map-wrapper { opacity: 0; pointer-events: none; transition: opacity 1s ease; }
    .map-wrapper { flex: 1; position: relative; transition: opacity 1s ease; }
    #map { width: 100%; height: 100%; background: #fdfbfb; }
    ::ng-deep .leaflet-tile-pane { filter: brightness(1.02) saturate(1.2) hue-rotate(345deg); }
    ::ng-deep .leaflet-control-attribution { display: none !important; }
    
    .partner-location-card { position: absolute; top: 15px; left: 50%; transform: translateX(-50%); z-index: 2000; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); border-radius: 20px; padding: 10px 20px; display: flex; align-items: center; gap: 8px; box-shadow: 0 8px 25px rgba(255,77,109,0.2); border: 1px solid rgba(255,255,255,0.8); color: #590D22; font-size: 0.95rem; white-space: nowrap; }
    .partner-location-card ion-icon { color: #FF4D6D; font-size: 1.3rem; }
    .center-map-btn { position: absolute; top: 15px; right: 15px; z-index: 2000; width: 44px; height: 44px; border-radius: 50%; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.4); color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.3); font-size: 1.5rem; transition: transform 0.2s; }
    .center-map-btn:active { transform: scale(0.9); }
    
    .next-milestone-card { position: absolute; bottom: 25px; left: 15px; z-index: 2000; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(10px); border-radius: 20px; padding: 10px 18px 10px 12px; display: flex; align-items: center; gap: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.6); max-width: 65%; cursor: pointer; transition: transform 0.2s; }
    .next-milestone-card:active { transform: scale(0.95); }
    .nm-icon { background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; box-shadow: 0 4px 10px rgba(255,77,109,0.3); }
    .nm-info { display: flex; flex-direction: column; overflow: hidden; }
    .nm-title { font-weight: 800; color: #590D22; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
    .nm-days { font-weight: 700; color: #FF4D6D; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; }
    
    .together-box { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.5); border-radius: 30px; padding: 40px 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; box-shadow: 0 20px 50px rgba(201, 24, 74, 0.2); z-index: 1000; min-width: 280px; overflow: hidden; }
    
    .avatar-container { position: relative; width: 80px; height: 80px; border-radius: 50%; border: 4px solid #FF4D6D; background: white; z-index: 2; }
    .avatar { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
    .camera-icon { position: absolute; bottom: -5px; right: -5px; background: white; border-radius: 50%; padding: 6px; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
    
    .avatars-together { display: flex; align-items: center; justify-content: center; }
    .together-left { z-index: 3; margin-right: -20px; border-color: white; box-shadow: 0 8px 25px rgba(0,0,0,0.2); width: 90px; height: 90px; }
    .together-right { z-index: 2; border-color: white; box-shadow: 0 8px 25px rgba(0,0,0,0.2); width: 90px; height: 90px; }
    
    .text-info-together { text-align: center; animation: pulse 2s infinite; z-index: 2; }
    .text-info-together h2 { margin: 0 0 5px; font-size: 1.8rem; font-weight: 900; color: #a4133c; letter-spacing: -0.5px; }
    .text-info-together p { margin: 0; font-size: 1rem; color: #FF4D6D; font-weight: 600; }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }

    /* Hearts falling animation */
    .confetti-container { position: absolute; top: -50px; left: 0; width: 100%; height: 150%; z-index: 1; pointer-events: none; overflow: hidden; }
    .heart-drop { position: absolute; color: #ffb3c1; font-size: 24px; animation: fall linear infinite; opacity: 0; }
    .heart-drop.h1 { left: 10%; animation-duration: 3s; animation-delay: 0s; font-size: 20px; color: #FF4D6D; }
    .heart-drop.h2 { left: 30%; animation-duration: 4s; animation-delay: 1s; font-size: 28px; }
    .heart-drop.h3 { left: 50%; animation-duration: 2.5s; animation-delay: 0.5s; font-size: 22px; color: #c9184a; }
    .heart-drop.h4 { left: 70%; animation-duration: 3.5s; animation-delay: 2s; font-size: 26px; }
    .heart-drop.h5 { left: 90%; animation-duration: 4.5s; animation-delay: 0.2s; font-size: 18px; color: #FF4D6D; }
    @keyframes fall { 0% { transform: translateY(-50px) rotate(0deg); opacity: 1; } 100% { transform: translateY(300px) rotate(360deg); opacity: 0; } }

    ::ng-deep .pulse-marker::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 50%; border: 3px solid #FF4D6D; animation: radarPulse 2s infinite; z-index: -1; }
    @keyframes radarPulse { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(1.6); opacity: 0; } }
  `],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class LocationWidgetComponent implements OnInit, OnDestroy {
  private locationService = inject(LocationService);
  private api = inject(LoveApiService);
  private actionSheetCtrl = inject(ActionSheetController);

  public nextMilestone: any = null;
  public daysRemaining: number = 0;

  private map!: L.Map;
  public myUserId!: string;
  public partnerId!: string;

  public uploadingAvatar = false;
  public areTogether = false;
  public defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffb3c1"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
  public myAvatarUrl = '';
  public partnerAvatarUrl = '';

  public myMood = '';
  public partnerMood = '';
  public partnerName = '';
  public partnerCity = '';

  public myLastPos?: L.LatLng;
  public partnerLastPos?: L.LatLng;

  private myMarker?: L.Marker;
  private partnerMarker?: L.Marker;
  private distanceMarker?: L.Marker;
  private connectionLine?: L.Polyline;

  private locationsSub?: Subscription;
  private moodInterval: any;

  private hasCentered = false;

  constructor() {
    addIcons({ locateOutline, flagOutline, camera, image, close, locationOutline, heart });
  }

  private appStateListener?: PluginListenerHandle;

  async ngOnInit() {
    setTimeout(() => {
      this.initMap();
    }, 100);

    try {
      const info = await this.api.getCoupleInfo();
      this.myUserId = info.my_id as any;
      this.partnerId = info.partner_id as any;
      this.myMood = info.my_mood || '';
      this.partnerMood = info.partner_mood || '';
      this.myAvatarUrl = info.my_avatar || '';
      this.partnerAvatarUrl = info.partner_avatar || '';
      this.partnerName = info.partner_name || 'Tu pareja';

      const myName = info.my_name || 'Yo';
      this.locationService.updateMyLocation(this.myUserId, myName).catch(err => {
        console.error('Error GPS', err);
      });

      this.startTracking();
      this.loadNextMilestone();
      this.startMoodInterval();
    } catch(e) {
      console.error('Error in location init', e);
    }

    this.appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        this.loadMoods();
        this.startMoodInterval();
      } else {
        this.stopMoodInterval();
      }
    });
  }

  private startMoodInterval() {
    if (!this.moodInterval) {
      this.moodInterval = setInterval(() => this.loadMoods(), 15000);
    }
  }

  private stopMoodInterval() {
    if (this.moodInterval) {
      clearInterval(this.moodInterval);
      this.moodInterval = null;
    }
  }

  ngOnDestroy() {
    this.locationsSub?.unsubscribe();
    this.stopMoodInterval();
    if (this.appStateListener) {
      this.appStateListener.remove();
    }
  }

  async loadNextMilestone() {
    try {
      const milestones = await this.api.getMilestones();
      const now = new Date();
      now.setHours(0,0,0,0);
      
      let closest = null;
      let minDiff = Infinity;
      
      for (const m of milestones) {
        const d = new Date(m.target_date);
        d.setHours(0,0,0,0);
        const diffTime = d.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0 && diffDays < minDiff) {
          minDiff = diffDays;
          closest = m;
        }
      }
      
      if (closest) {
        this.nextMilestone = closest;
        this.daysRemaining = minDiff;
      }
    } catch (e) {
      console.error('Error fetching milestones', e);
    }
  }

  async loadMoods() {
    try {
      const info = await this.api.getCoupleInfo().catch(() => null);
      if (info) {
        this.myMood = info.my_mood || '';
        this.partnerMood = info.partner_mood || '';
        this.refreshMarkers();
      }
    } catch (e) {
      console.error('Error loading moods', e);
    }
  }

  private refreshMarkers() {
    if (!this.map) return;
    if (this.areTogether) return;
    
    if (this.myLastPos) {
      this.updateMarker('me', this.myLastPos, this.myAvatarUrl);
    }
    if (this.partnerLastPos) {
      this.updateMarker('partner', this.partnerLastPos, this.partnerAvatarUrl);
    }
  }

  private initMap() {
    this.map = L.map('map', { zoomControl: false }).setView([40.4168, -3.7038], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; CartoDB'
    }).addTo(this.map);
  }

  private async getCityName(lat: number, lng: number) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`);
      const data = await res.json();
      if (data && data.address) {
        this.partnerCity = data.address.city || data.address.town || data.address.village || data.address.county || 'Un lugar desconocido';
      }
    } catch(e) {
      console.error(e);
    }
  }

  private startTracking() {
    const me$ = this.locationService.listenToUserLocation(this.myUserId);
    const partner$ = this.locationService.listenToUserLocation(this.partnerId);

    this.locationsSub = combineLatest([me$, partner$]).subscribe(([me, partner]) => {
      // Fallback si no hay posición en Firebase (ej: Madrid y Barcelona)
      const myPos = me?.position 
        ? L.latLng(me.position.latitude, me.position.longitude)
        : L.latLng(40.4168, -3.7038); // Madrid

      const partnerPos = partner?.position
        ? L.latLng(partner.position.latitude, partner.position.longitude)
        : L.latLng(41.3851, 2.1734); // Barcelona

      this.myLastPos = myPos;
      this.partnerLastPos = partnerPos;

      if (!this.partnerCity && partnerPos && !this.areTogether) {
        this.getCityName(partnerPos.lat, partnerPos.lng);
      }

      const distanceMeters = myPos.distanceTo(partnerPos);
      this.areTogether = distanceMeters < 50; 

      if (this.areTogether) {
        this.clearMapElements();
        if (!this.hasCentered) {
          this.centerMap();
          this.hasCentered = true;
        }
      } else {
        this.updateMarker('me', myPos, this.myAvatarUrl);
        this.updateMarker('partner', partnerPos, this.partnerAvatarUrl);
        this.drawConnection(myPos, partnerPos);
        
        const midPoint = L.latLng((myPos.lat + partnerPos.lat) / 2, (myPos.lng + partnerPos.lng) / 2);
        const distText = distanceMeters > 1000
          ? `${(distanceMeters / 1000).toLocaleString('es-ES', { maximumFractionDigits: 0 })} km`
          : `${Math.round(distanceMeters)} m`;
        this.updateDistanceMarker(midPoint, distText);
        
        if (!this.hasCentered) {
          this.centerMap();
          this.hasCentered = true;
        }
      }
    });
  }

  public centerMap() {
    if (this.myLastPos && this.partnerLastPos) {
      const bounds = L.latLngBounds([this.myLastPos, this.partnerLastPos]);
      this.map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    } else if (this.myLastPos) {
      this.map.setView(this.myLastPos, 14);
    }
  }

  private clearMapElements() {
    if (this.connectionLine) { this.map.removeLayer(this.connectionLine); this.connectionLine = undefined; }
    if (this.distanceMarker) { this.map.removeLayer(this.distanceMarker); this.distanceMarker = undefined; }
    if (this.myMarker) { this.map.removeLayer(this.myMarker); this.myMarker = undefined; }
    if (this.partnerMarker) { this.map.removeLayer(this.partnerMarker); this.partnerMarker = undefined; }
  }

  private updateMarker(type: 'me' | 'partner', latLng: L.LatLng, avatarUrl?: string) {
    const backgroundStyle = avatarUrl
      ? `background-image: url('${avatarUrl}'); background-size: cover; background-position: center;`
      : `background-color: white;`;

    const mood = type === 'me' ? this.myMood : this.partnerMood;
    const moodHtml = mood
      ? `<div style="position: absolute; top: -8px; right: -8px; background: white; width: 28px; height: 28px; border-radius: 50%; border: 2px solid #FF4D6D; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.2); z-index: 10;">${mood}</div>`
      : '';

    const htmlIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="pulse-marker" style="position: relative; ${backgroundStyle} width:100%; height:100%; border-radius:50%; border:3px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.15); box-sizing: border-box; z-index: 2;">
          ${moodHtml}
        </div>
      `,
      iconSize: [54, 54],
      iconAnchor: [27, 27]
    });

    if (type === 'me') {
      if (this.myMarker) {
        this.myMarker.setLatLng(latLng);
        this.myMarker.setIcon(htmlIcon);
      } else {
        this.myMarker = L.marker(latLng, { icon: htmlIcon, zIndexOffset: 1000 }).addTo(this.map);
        this.myMarker.on('click', () => this.changeMyAvatar());
      }
    } else {
      if (this.partnerMarker) {
        this.partnerMarker.setLatLng(latLng);
        this.partnerMarker.setIcon(htmlIcon);
      } else {
        this.partnerMarker = L.marker(latLng, { icon: htmlIcon, zIndexOffset: 900 }).addTo(this.map);
      }
    }
  }

  private updateDistanceMarker(latLng: L.LatLng, text: string) {
    const htmlIcon = L.divIcon({
      className: 'distance-pill-icon',
      html: `<div style="background: #FF4D6D; color: white; font-weight: 800; border-radius: 24px; font-size: 1.1rem; box-shadow: 0 6px 20px rgba(255,77,109,0.4); border: 2px solid white; white-space: nowrap; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; box-sizing: border-box; font-family: 'Inter', sans-serif; letter-spacing: -0.5px;">${text}</div>`,
      iconSize: [120, 40],
      iconAnchor: [60, 20]
    });

    if (this.distanceMarker) {
      this.distanceMarker.setLatLng(latLng);
      this.distanceMarker.setIcon(htmlIcon);
    } else {
      this.distanceMarker = L.marker(latLng, { icon: htmlIcon }).addTo(this.map);
    }
  }

  private drawConnection(p1: L.LatLng, p2: L.LatLng) {
    if (this.connectionLine) {
      this.connectionLine.setLatLngs([p1, p2]);
    } else {
      this.connectionLine = L.polyline([p1, p2], {
        color: '#FF4D6D',
        weight: 3,
        dashArray: '10, 10',
        opacity: 0.8
      }).addTo(this.map);
    }
  }

  async presentPhotoOptions(callback: (source: CameraSource) => void) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Cambiar Mi Foto',
      cssClass: 'premium-action-sheet',
      buttons: [
        { text: 'Tomar Foto', icon: 'camera', handler: () => callback(CameraSource.Camera) },
        { text: 'De la Galería', icon: 'image', handler: () => callback(CameraSource.Photos) },
        { text: 'Cancelar', icon: 'close', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  async changeMyAvatar() {
    this.presentPhotoOptions(async (source) => {
      try {
        const image = await Camera.getPhoto({
          quality: 60, width: 300, height: 300, allowEditing: true, resultType: CameraResultType.DataUrl, source: source
        });
        if (image.dataUrl) {
          this.uploadingAvatar = true;
          await this.api.uploadAvatar(image.dataUrl);
          // Actualizar el avatar local para verlo de inmediato
          this.myAvatarUrl = image.dataUrl;
          this.refreshMarkers();
          this.uploadingAvatar = false;
        }
      } catch (e) {
        this.uploadingAvatar = false;
      }
    });
  }
}
