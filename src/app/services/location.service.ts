import { Injectable, inject } from '@angular/core';
import { Firestore, doc, docData, setDoc, updateDoc, GeoPoint } from '@angular/fire/firestore';
import { Geolocation } from '@capacitor/geolocation';
import { Observable } from 'rxjs';

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

  async updateMyLocation(userId: 'juan' | 'roberta', name: string) {
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
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      throw error; // Lanzamos el error para que la UI lo pueda mostrar
    }
  }

  listenToUserLocation(userId: 'juan' | 'roberta'): Observable<UserLocation> {
    const userDocRef = doc(this.firestore, `locations/${userId}`);
    return docData(userDocRef) as Observable<UserLocation>;
  }

  /**
   * Sube la imagen comprimida (base64) DIRECTAMENTE a Firestore
   * para evitar usar Firebase Storage y que no pida tarjeta.
   */
  async uploadAvatar(userId: 'juan' | 'roberta', base64Image: string) {
    try {
      // Usamos setDoc con { merge: true } en lugar de updateDoc porque
      // si el GPS falló y el documento aún no existe, updateDoc daría error.
      const userDocRef = doc(this.firestore, `locations/${userId}`);
      await setDoc(userDocRef, { avatar: base64Image }, { merge: true });

      return base64Image;
    } catch (error) {
      console.error('Error subiendo avatar a Firestore:', error);
      throw error;
    }
  }
}
