import { Injectable, inject } from '@angular/core';
import { PushNotifications, Token, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
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
      await this.syncToken();
    } catch (e) {
      console.error('Error initializing notifications:', e);
    }
  }

  private async syncToken() {
    const { value: token } = await Preferences.get({ key: 'fcm_token' });
    if (token) {
      try {
        await this.api.saveFcmToken(token);
        console.log('FCM Token synced to backend successfully');
      } catch(e) {
        console.error('Error syncing FCM Token to backend:', e);
      }
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
        await Preferences.set({ key: 'fcm_token', value: token.value });
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

    // La racha se maneja ahora inteligentemente desde el servidor (J2-API/routes/console.php)
    // por lo que eliminamos la notificación local estática para que no avise si ya han subido foto.
    
    // Cancelar la notificación estática anterior si existía (ID: 1)
    try {
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
    } catch (e) {
      console.log('No prev notification to cancel', e);
    }
  }

  async scheduleTripReminders(plans: any[]) {
    if (!this.platform.is('capacitor')) return;
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return;

    // Cancel previously scheduled trip reminders to start fresh
    const pending = await LocalNotifications.getPending();
    const tripIdsToCancel = pending.notifications
      .filter(n => n.id >= 10000)
      .map(n => ({ id: n.id }));
      
    if (tripIdsToCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: tripIdsToCancel });
    }

    const notificationsToSchedule: any[] = [];
    const now = new Date();

    for (const plan of plans) {
      if (plan.status !== 'planned' || !plan.target_date || !plan.id) continue;
      
      const targetDate = new Date(plan.target_date);
      if (isNaN(targetDate.getTime())) continue;

      // 3 days before at 10:00 AM
      const threeDaysBefore = new Date(targetDate);
      threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
      threeDaysBefore.setHours(10, 0, 0, 0);

      if (threeDaysBefore > now) {
        notificationsToSchedule.push({
          title: '¡Se acerca el plan! 🗺️',
          body: `Faltan 3 días para "${plan.title}"`,
          id: 10000 + plan.id,
          schedule: { at: threeDaysBefore }
        });
      }

      // 1 day before at 10:00 AM
      const oneDayBefore = new Date(targetDate);
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);
      oneDayBefore.setHours(10, 0, 0, 0);

      if (oneDayBefore > now) {
        notificationsToSchedule.push({
          title: '¡Es mañana! 🎉',
          body: `Prepárate para "${plan.title}"`,
          id: 20000 + plan.id,
          schedule: { at: oneDayBefore }
        });
      }
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule
      });
    }
  }
}
