import { Injectable, inject } from '@angular/core';
import { PushNotifications, Token, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Platform } from '@ionic/angular';
import { LoveApiService } from './love-api.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private platform = inject(Platform);
  private api = inject(LoveApiService);

  async init() {
    if (!this.platform.is('capacitor')) {
      console.log('Not in native app. Push notifications not available.');
      return;
    }

    try {
      await this.initPush();
      await this.initLocal();
    } catch (e) {
      console.error('Error initializing notifications:', e);
    }
  }

  private async initPush() {
    // Request permission to use push notifications
    // iOS will prompt user and return if they granted permission or not
    // Android will just grant without prompting
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive === 'granted') {
      // Register with Apple / Google to receive push via APNS/FCM
      PushNotifications.register();
    } else {
      console.warn('Push notification permission denied');
    }

    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration',
      async (token: Token) => {
        console.log('Push registration success, token: ' + token.value);
        // Envía el token FCM a nuestro backend
        try {
          await this.api.saveFcmToken(token.value);
          console.log('FCM Token saved to backend successfully');
        } catch(e) {
          console.error('Error saving FCM Token to backend:', e);
        }
      }
    );

    // Some issue with our setup and push will not work
    PushNotifications.addListener('registrationError',
      (error: any) => {
        console.error('Error on registration: ' + JSON.stringify(error));
      }
    );

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener('pushNotificationReceived',
      (notification: any) => {
        console.log('Push received: ' + JSON.stringify(notification));
      }
    );

    // Method called when tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed',
      (notification: ActionPerformed) => {
        console.log('Push action performed: ' + JSON.stringify(notification));
      }
    );
  }

  private async initLocal() {
    // Permisos
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return;

    // Crear un recordatorio diario a las 20:00 para la racha
    await LocalNotifications.schedule({
      notifications: [
        {
          title: '🔥 ¡No rompas la racha!',
          body: 'Sube un recuerdo de hoy y descubre si tu pareja también lo hizo.',
          id: 1,
          schedule: {
            on: { hour: 20, minute: 0 },
            allowWhileIdle: true,
          }
        }
      ]
    });
  }
}
