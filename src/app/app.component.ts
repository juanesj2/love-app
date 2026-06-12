import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet, ToastController, Platform } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { NotificationService } from './services/notification.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private notificationService = inject(NotificationService);
  private toastCtrl = inject(ToastController);
  private router = inject(Router);
  private platform = inject(Platform);

  private lastBackPress = 0;

  constructor() {
    this.notificationService.init();
    this.setupBackButton();
  }

  setupBackButton() {
    this.platform.backButton.subscribeWithPriority(10, async (processNextHandler) => {
      if (this.router.url === '/home') {
        const now = Date.now();
        if (now - this.lastBackPress < 2000) {
          App.exitApp();
        } else {
          this.lastBackPress = now;
          const toast = await this.toastCtrl.create({
            message: 'Pulsa de nuevo para salir de la app',
            duration: 2000,
            position: 'bottom',
            color: 'dark',
            cssClass: 'premium-toast'
          });
          toast.present();
        }
      } else {
        processNextHandler();
      }
    });
  }
}
