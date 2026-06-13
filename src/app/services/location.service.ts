import { Injectable, inject } from '@angular/core';
import { Firestore, doc, docData, setDoc, GeoPoint } from '@angular/fire/firestore';
import { Geolocation } from '@capacitor/geolocation';
import { registerPlugin } from '@capacitor/core';
import { Observable } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export interface UserLocation {
  name: string;
  position: GeoPoint;
  avatar: string;
  is_sharing?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private firestore = inject(Firestore);

  async getPrivacyMode(): Promise<boolean> {
    const { value } = await Preferences.get({ key: 'ghost_mode' });
    return value === 'true';
  }

  async setPrivacyMode(isGhost: boolean): Promise<void> {
    await Preferences.set({ key: 'ghost_mode', value: isGhost ? 'true' : 'false' });
  }

  async updateMyLocation(userId: string, name: string) {
    try {
      const isGhost = await this.getPrivacyMode();
      const userDocRef = doc(this.firestore, `locations/${userId}`);
      
      if (isGhost) {
        await setDoc(userDocRef, {
          name: name,
          is_sharing: false
        }, { merge: true });
        
        const savedWatcher = localStorage.getItem('bg_watcher_id');
        if (savedWatcher) {
           BackgroundGeolocation.removeWatcher({ id: savedWatcher });
           localStorage.removeItem('bg_watcher_id');
        }
        return;
      }

      // 1. Pedir permisos explícitamente (evita bloqueos silenciosos)
      const permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted') {
        await Geolocation.requestPermissions();
      }

      // 2. Pedir posición con alta precisión
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });

      const geoPoint = new GeoPoint(coordinates.coords.latitude, coordinates.coords.longitude);

      await setDoc(userDocRef, {
        name: name,
        position: geoPoint,
        is_sharing: true
      }, { merge: true });

      console.log('Ubicación actualizada:', userId);

      // 3. Setup Background Geolocation watcher
      BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: "La aplicación está usando tu ubicación.",
          backgroundTitle: "Ubicación en segundo plano",
          requestPermissions: true,
          stale: false,
          distanceFilter: 10
        },
        async (location, error) => {
          if (error) {
            if (error.code === 'NOT_AUTHORIZED') {
              if (window.confirm(
                "La aplicación necesita acceso a la ubicación en segundo plano. ¿Ir a ajustes?"
              )) {
                BackgroundGeolocation.openSettings();
              }
            }
            return console.error(error);
          }
          if (location) {
            const currentGhost = await this.getPrivacyMode();
            if (currentGhost) return;
            const bgGeoPoint = new GeoPoint(location.latitude, location.longitude);
            await setDoc(userDocRef, { position: bgGeoPoint, is_sharing: true }, { merge: true });
            console.log('Fondo actualizado:', location);
          }
        }
      ).then(watcherId => {
        // Guardar watcher_id para detenerlo si se activa el modo fantasma
        localStorage.setItem('bg_watcher_id', watcherId);
      });

    } catch (error) {
      console.error('Error actualizando ubicación:', error);
      throw error; // Lanzamos el error para que la UI lo pueda mostrar
    }
  }

  listenToUserLocation(userId: string): Observable<UserLocation> {
    const userDocRef = doc(this.firestore, `locations/${userId}`);
    return docData(userDocRef) as Observable<UserLocation>;
  }
}
