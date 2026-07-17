import { Injectable, inject } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Observable, of, interval, BehaviorSubject, switchMap, timer } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';
import { Preferences } from '@capacitor/preferences';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
import { LoveApiService } from './love-api.service';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export interface UserLocation {
  name: string;
  position: { latitude: number; longitude: number };
  avatar: string;
  is_sharing?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private loveApi = inject(LoveApiService);
  public debugError = '';

  async getPrivacyMode(): Promise<boolean> {
    const { value } = await Preferences.get({ key: 'ghost_mode' });
    return value === 'true';
  }

  async setPrivacyMode(isGhost: boolean): Promise<void> {
    await Preferences.set({ key: 'ghost_mode', value: isGhost ? 'true' : 'false' });
    if (isGhost) {
      await this.loveApi.updateLocation(0, 0, false).catch(() => {});
    }
  }

  async updateMyLocation(userId: string, name: string) {
    try {
      const isGhost = await this.getPrivacyMode();
      
      if (isGhost) {
        await this.loveApi.updateLocation(0, 0, false);
        
        const savedWatcher = localStorage.getItem('bg_watcher_id');
        if (savedWatcher) {
           BackgroundGeolocation.removeWatcher({ id: savedWatcher });
           localStorage.removeItem('bg_watcher_id');
        }
        return;
      }

      // 1. Pedir permisos
      try {
        const permissions = await Geolocation.checkPermissions();
        if (permissions.location !== 'granted') {
          await Geolocation.requestPermissions();
        }
      } catch (e) {
        console.warn('CheckPermissions no soportado', e);
      }

      // 2. Obtener ubicación
      let coordinates;
      try {
        coordinates = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });
      } catch (e) {
        console.error('Error getCurrentPosition:', e);
        return;
      }

      await this.loveApi.updateLocation(coordinates.coords.latitude, coordinates.coords.longitude, true);
      console.log('Ubicación actualizada APIREST:', userId);

      // 3. Background Geolocation watcher
      if (Capacitor.isNativePlatform()) {
        try {
          const existingWatcher = localStorage.getItem('bg_watcher_id');
          if (existingWatcher) {
            return;
          }

          BackgroundGeolocation.addWatcher(
            {
              backgroundMessage: "La aplicación está usando tu ubicación.",
              backgroundTitle: "Ubicación en segundo plano",
              requestPermissions: true,
              stale: false,
              distanceFilter: 10,
              icon: "ic_notification"
            } as any,
            async (location, error) => {
              if (error) {
                if (error.code === 'NOT_AUTHORIZED') {
                  if (window.confirm("La aplicación necesita acceso a la ubicación en segundo plano. ¿Ir a ajustes?")) {
                    BackgroundGeolocation.openSettings();
                  }
                }
                return console.error(error);
              }
              if (location) {
                const currentGhost = await this.getPrivacyMode();
                if (currentGhost) return;
                await this.loveApi.updateLocation(location.latitude, location.longitude, true).catch(()=>console.error('bg fail'));
                console.log('Fondo actualizado APIREST:', location);
              }
            }
          ).then(watcherId => {
            localStorage.setItem('bg_watcher_id', watcherId);
          });
        } catch (e) {
          console.error('Error al inicializar BackgroundGeolocation', e);
        }
      }

    } catch (error) {
      console.error('Error actualizando ubicación:', error);
    }
  }

  async testDirectGetDoc(userId: string): Promise<string> {
    try {
      const partner = await this.loveApi.getPartnerLocation();
      return `REST getDoc: FOUND (${partner.latitude}, ${partner.longitude})`;
    } catch (e: any) {
      return `REST getDoc ERR: ${e.message}`;
    }
  }

  listenToUserLocation(userId: string): Observable<any> {
    if (!userId) return of(null);
    
    // Polling cada 5 segundos
    return timer(0, 5000).pipe(
      switchMap(() => this.loveApi.getPartnerLocation()),
      map((partner: any) => {
        return {
          name: partner.name,
          avatar: partner.avatar,
          is_sharing: true,
          position: {
            latitude: partner.latitude,
            longitude: partner.longitude
          }
        };
      }),
      catchError(err => {
        console.error('Error polling location:', err);
        this.debugError = err.message || err.toString();
        // Return false/null mapping to handle offline/sharing off gracefully
        return of({ is_sharing: false });
      })
    );
  }
}
