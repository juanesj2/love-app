import { Injectable, inject } from '@angular/core';
import { PushNotifications, Token, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { Platform } from '@ionic/angular';
import { LoveApiService } from './love-api.service';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private platform = inject(Platform);
  private api = inject(LoveApiService);
  public newNotification$ = new Subject<any>();

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
    if (this.platform.is('android')) {
      try {
        await PushNotifications.createChannel({
          id: 'love_app_channel_default',
          name: 'Notificaciones (Defecto)',
          description: 'Notificaciones de mensajes y fotos',
          importance: 5,
          visibility: 1,
          vibration: true,
        });
        await PushNotifications.createChannel({
          id: 'love_app_channel_water',
          name: 'Notificaciones (Agua)',
          description: 'Notificaciones con sonido de agua',
          importance: 5,
          visibility: 1,
          vibration: true,
          sound: 'water.wav'
        });
        await PushNotifications.createChannel({
          id: 'love_app_channel_bell',
          name: 'Notificaciones (Campanilla)',
          description: 'Notificaciones con sonido de campanilla',
          importance: 5,
          visibility: 1,
          vibration: true,
          sound: 'bell.wav'
        });
        await PushNotifications.createChannel({
          id: 'love_app_channel_none',
          name: 'Notificaciones (Silencio)',
          description: 'Notificaciones silenciosas',
          importance: 3,
          visibility: 1,
          vibration: false,
        });
      } catch (e) {
        console.error('Error creating push channels', e);
      }
    }

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
        this.newNotification$.next(notification);
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

    if (this.platform.is('android')) {
      try {
        await LocalNotifications.createChannel({
          id: 'love_app_local',
          name: 'Recordatorios Love App',
          description: 'Recordatorios de planes y eventos',
          importance: 5,
          visibility: 1,
          vibration: true,
        });
      } catch (e) {
        console.error('Error creating local notification channel', e);
      }
    }

    // La racha se maneja ahora inteligentemente desde el servidor (J2-API/routes/console.php)
    // por lo que eliminamos la notificación local estática para que no avise si ya han subido foto.
    
    // Cancelar la notificación estática anterior si existía (ID: 1)
    try {
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
    } catch (e) {
      console.log('No prev notification to cancel', e);
    }
    
    // Programar aniversarios en base a la caché si existe
    const startDatePref = await Preferences.get({ key: 'relationshipStartDate' });
    if (startDatePref.value) {
      this.scheduleAnniversaryReminders(startDatePref.value);
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
          channelId: 'love_app_local',
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
          channelId: 'love_app_local',
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

  async scheduleAnniversaryReminders(startDateStr: string) {
    if (!this.platform.is('capacitor') || !startDateStr) return;
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return;

    const pending = await LocalNotifications.getPending();
    const annivIdsToCancel = pending.notifications
      .filter(n => n.id >= 30000 && n.id < 40000)
      .map(n => ({ id: n.id }));
      
    if (annivIdsToCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: annivIdsToCancel });
    }

    const notificationsToSchedule: any[] = [];
    const now = new Date();
    const startDate = new Date(startDateStr);
    if (isNaN(startDate.getTime())) return;

    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i, startDate.getDate(), 10, 0, 0);
      
      const notificationDate = new Date(targetDate);
      notificationDate.setDate(notificationDate.getDate() - 1);
      
      if (notificationDate > now) {
        let monthsDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12 + (targetDate.getMonth() - startDate.getMonth());
        
        if (monthsDiff > 0) {
          let message = '';
          if (monthsDiff % 12 === 0) {
            const years = monthsDiff / 12;
            message = `¡Mañana hacéis ${years} año${years > 1 ? 's' : ''}! 🎉❤️`;
          } else if (monthsDiff > 12) {
            const years = Math.floor(monthsDiff / 12);
            const remainingMonths = monthsDiff % 12;
            message = `¡Mañana hacéis ${years} año${years > 1 ? 's' : ''} y ${remainingMonths} mes${remainingMonths > 1 ? 'es' : ''}! 🥰`;
          } else {
            message = `¡Mañana hacéis ${monthsDiff} mes${monthsDiff > 1 ? 'es' : ''}! 💕`;
          }

          notificationsToSchedule.push({
            title: '¡Aniversario a la vista! 💘',
            body: message,
            id: 30000 + i,
            channelId: 'love_app_local',
            schedule: { at: notificationDate }
          });
        }
      }
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule
      });
    }
  }
}
