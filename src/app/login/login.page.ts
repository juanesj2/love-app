import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, AlertController, ToastController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { person, heart } from 'ionicons/icons';
import { LocationService } from '../services/location.service';
import { LoveApiService } from '../services/love-api.service';
import { NotificationService } from '../services/notification.service';
import { environment } from '../../environments/environment';

import { Preferences } from '@capacitor/preferences';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule]
})
export class LoginPage implements OnInit {
  private router = inject(Router);
  private locationService = inject(LocationService);
  private loveApi = inject(LoveApiService);
  private notificationService = inject(NotificationService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  public juanAvatarUrl = '';
  public robertaAvatarUrl = '';
  public defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffb3c1"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';

  constructor() {
    addIcons({ person, heart });
  }

  async ngOnInit() {
    this.locationService.listenToUserLocation('juan').subscribe(data => {
      if (data && data.avatar) this.juanAvatarUrl = data.avatar;
    });
    this.locationService.listenToUserLocation('roberta').subscribe(data => {
      if (data && data.avatar) this.robertaAvatarUrl = data.avatar;
    });

    // Auto-login si ya hay token y usuario
    const storedUser = localStorage.getItem('love_widget_user');
    const { value: token } = await Preferences.get({ key: 'auth_token' });
    if (storedUser && token) {
      this.notificationService.init();
      this.locationService.updateMyLocation(storedUser as 'juan' | 'roberta', storedUser);
      this.router.navigate(['/home']);
    }
  }

  async selectProfile(userId: 'juan' | 'roberta') {
    const alert = await this.alertCtrl.create({
      cssClass: 'premium-login-alert',
      header: 'Contraseña',
      message: `Ingresa la contraseña para ${userId}`,
      inputs: [
        {
          name: 'password',
          type: 'password',
          placeholder: 'Contraseña'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Entrar',
          handler: async (data) => {
            const email = userId === 'juan' ? environment.apiCredentials.juanEmail : environment.apiCredentials.robertaEmail;
            const password = data.password; 
            try {
              await this.loveApi.login(email, password);
              // Guardar el usuario localmente
              localStorage.setItem('love_widget_user', userId);
              // Guardar nativamente para el Widget de Android
              await Preferences.set({ key: 'myUserId', value: userId });
              // Pedir notificaciones y guardar token ahora que estamos logueados
              this.notificationService.init();
              this.locationService.updateMyLocation(userId, userId);
              // Redirigir a home
              this.router.navigate(['/home']);
            } catch (e) {
              console.log('Error login API Laravel (¿El usuario no existe o mala contraseña?):', e);
              const toast = await this.toastCtrl.create({
                message: 'Contraseña incorrecta. Por favor, inténtalo de nuevo.',
                duration: 3000,
                color: 'danger',
                position: 'bottom'
              });
              await toast.present();
            }
          }
        }
      ]
    });
    
    await alert.present();
  }
}
