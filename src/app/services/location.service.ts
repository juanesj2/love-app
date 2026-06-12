import { Injectable, inject } from '@angular/core';
import { Firestore, doc, docData, setDoc, GeoPoint } from '@angular/fire/firestore';
import { Geolocation } from '@capacitor/geolocation';
import { registerPlugin } from '@capacitor/core';
import { Observable } from 'rxjs';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export interface UserLocation {
  name: string;
  position: GeoPoint;
  avatar: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private firestore = inject(Firestore);

  async updateMyLocation(userId: string, name: string) {
    try {
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
      const userDocRef = doc(this.firestore, `locations/${userId}`);

      await setDoc(userDocRef, {
        name: name,
        position: geoPoint
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
            const bgGeoPoint = new GeoPoint(location.latitude, location.longitude);
            await setDoc(userDocRef, { position: bgGeoPoint }, { merge: true });
            console.log('Fondo actualizado:', location);
          }
        }
      ).then(watcherId => {
        // Guardar watcher_id si es necesario (para detenerlo luego)
        // localStorage.setItem('bg_watcher_id', watcherId);
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
