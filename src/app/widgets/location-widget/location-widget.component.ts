import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import * as L from 'leaflet';
import { LocationService } from '../../services/location.service';
import { Subscription, combineLatest } from 'rxjs';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';
import { addIcons } from 'ionicons';
import { locateOutline, flagOutline } from 'ionicons/icons';
import { LoveApiService } from '../../services/love-api.service';

@Component({
  selector: 'app-location-widget',
  template: `
    <div class="location-container">
      <div class="map-wrapper">
        <div id="map"></div>
        <button class="center-map-btn" *ngIf="myLastPos" (click)="centerMap()">
          <ion-icon name="locate-outline"></ion-icon>
        </button>
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
          <h2>¡Estamos juntos! ❤️</h2>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .location-container { height: 100%; display: flex; flex-direction: column; position: relative; }
    .map-wrapper { flex: 1; position: relative; }
    #map { width: 100%; height: 100%; background: #1a1a1a; }
    
    .center-map-btn { position: absolute; top: 15px; right: 15px; z-index: 2000; width: 44px; height: 44px; border-radius: 50%; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.4); color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.3); font-size: 1.5rem; transition: transform 0.2s; }
    .center-map-btn:active { transform: scale(0.9); }
    
    .next-milestone-card { position: absolute; top: 15px; left: 15px; z-index: 2000; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(10px); border-radius: 20px; padding: 10px 18px 10px 12px; display: flex; align-items: center; gap: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.6); max-width: 65%; cursor: pointer; transition: transform 0.2s; }
    .next-milestone-card:active { transform: scale(0.95); }
    .nm-icon { background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; box-shadow: 0 4px 10px rgba(255,77,109,0.3); }
    .nm-info { display: flex; flex-direction: column; overflow: hidden; }
    .nm-title { font-weight: 800; color: #590D22; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
    .nm-days { font-weight: 700; color: #FF4D6D; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; }
    
    .together-box { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 20px; padding: 20px 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 1000; min-width: 250px; }
    
    .avatar-container { position: relative; width: 60px; height: 60px; border-radius: 50%; border: 3px solid #FF4D6D; }
    .avatar { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
    .camera-icon { position: absolute; bottom: -5px; right: -5px; background: white; border-radius: 50%; padding: 4px; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
    
    .avatars-together { display: flex; align-items: center; justify-content: center; }
    .together-left { z-index: 2; margin-right: -15px; border-color: white; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 70px; height: 70px; }
    .together-right { z-index: 1; border-color: white; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 70px; height: 70px; }
    
    .text-info-together { text-align: center; animation: pulse 2s infinite; }
    .text-info-together h2 { margin: 0; font-size: 1.5rem; font-weight: 800; color: #c9184a; }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
  `],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class LocationWidgetComponent implements OnInit, OnDestroy {
  private locationService = inject(LocationService);
  private api = inject(LoveApiService);

  public nextMilestone: any = null;
  public daysRemaining: number = 0;

  private map!: L.Map;
  public myUserId!: 'juan' | 'roberta';
  public partnerId!: 'juan' | 'roberta';

  public uploadingAvatar = false;
  public areTogether = false;
  public defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffb3c1"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
  public myAvatarUrl = '';
  public partnerAvatarUrl = '';

  public myLastPos?: L.LatLng;
  public partnerLastPos?: L.LatLng;

  private myMarker?: L.Marker;
  private partnerMarker?: L.Marker;
  private distanceMarker?: L.Marker;
  private connectionLine?: L.Polyline;

  private locationsSub?: Subscription;

  private hasCentered = false;

  constructor() {
    addIcons({ locateOutline, flagOutline });
    const storedUser = localStorage.getItem('love_widget_user') as 'juan' | 'roberta';
    if (storedUser) {
      this.myUserId = storedUser;
      this.partnerId = storedUser === 'juan' ? 'roberta' : 'juan';
    }
  }

  ngOnInit() {
    setTimeout(() => {
      this.initMap();
      this.startTracking();
      this.loadNextMilestone();
    }, 100);

    const myName = this.myUserId === 'juan' ? 'Juan' : 'Roberta';
    this.locationService.updateMyLocation(this.myUserId, myName).catch(err => {
      console.error('Error GPS', err);
    });
  }

  ngOnDestroy() {
    this.locationsSub?.unsubscribe();
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

  private initMap() {
    this.map = L.map('map', { zoomControl: false }).setView([40.4168, -3.7038], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);
  }

  private startTracking() {
    const me$ = this.locationService.listenToUserLocation(this.myUserId);
    const partner$ = this.locationService.listenToUserLocation(this.partnerId);

    this.locationsSub = combineLatest([me$, partner$]).subscribe(([me, partner]) => {
      if (me) this.myAvatarUrl = me.avatar || '';
      if (partner) this.partnerAvatarUrl = partner.avatar || '';

      if (me?.position && partner?.position) {
        const p1 = L.latLng(me.position.latitude, me.position.longitude);
        const p2 = L.latLng(partner.position.latitude, partner.position.longitude);
        this.myLastPos = p1;
        this.partnerLastPos = p2;

        const distanceMeters = p1.distanceTo(p2);
        this.areTogether = distanceMeters < 50; 

        if (this.areTogether) {
          this.clearMapElements();
          if (!this.hasCentered) {
            this.map.setView(p1, 15);
            this.hasCentered = true;
          }
        } else {
          this.updateMarker('me', p1, me.avatar);
          this.updateMarker('partner', p2, partner.avatar);
          this.drawConnection(p1, p2);
          
          const midPoint = L.latLng((p1.lat + p2.lat) / 2, (p1.lng + p2.lng) / 2);
          const distText = distanceMeters > 1000
            ? `${(distanceMeters / 1000).toFixed(1)} km`
            : `${Math.round(distanceMeters)} m`;
          this.updateDistanceMarker(midPoint, distText);
          
          if (!this.hasCentered) {
            this.centerMap();
            this.hasCentered = true;
          }
        }
      } else if (me?.position) {
        const p1 = L.latLng(me.position.latitude, me.position.longitude);
        this.myLastPos = p1;
        this.areTogether = false;
        this.clearMapElements();
        this.updateMarker('me', p1, me.avatar);
        if (!this.hasCentered) {
          this.map.setView(p1, 14);
          this.hasCentered = true;
        }
      }
    });
  }

  public centerMap() {
    if (this.myLastPos && this.partnerLastPos && !this.areTogether) {
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

    const htmlIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="${backgroundStyle} width:54px; height:54px; border-radius:50%; border:3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4);"></div>`,
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
      html: `<div style="background: white; color: #333; font-weight: 800; border-radius: 16px; font-size: 0.95rem; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 1px solid #eee; white-space: nowrap; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">${text}</div>`,
      iconSize: [110, 32],
      iconAnchor: [55, 16]
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
        color: '#ffffff',
        weight: 3,
        dashArray: '10, 10',
        opacity: 0.8
      }).addTo(this.map);
    }
  }

  async changeMyAvatar() {
    try {
      const image = await Camera.getPhoto({
        quality: 60, width: 300, height: 300, allowEditing: true, resultType: CameraResultType.DataUrl, source: CameraSource.Prompt
      });
      if (image.dataUrl) {
        this.uploadingAvatar = true;
        await this.locationService.uploadAvatar(this.myUserId, image.dataUrl);
        this.uploadingAvatar = false;
      }
    } catch (e) {
      this.uploadingAvatar = false;
    }
  }
}
