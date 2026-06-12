import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, AlertController, ToastController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { heart, mailOutline, lockClosedOutline, personOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { LocationService } from '../services/location.service';
import { LoveApiService } from '../services/love-api.service';
import { NotificationService } from '../services/notification.service';
import { Browser } from '@capacitor/browser';
import { Preferences } from '@capacitor/preferences';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, IonIcon, CommonModule, FormsModule]
})
export class LoginPage implements OnInit {
  private router = inject(Router);
  private locationService = inject(LocationService);
  private loveApi = inject(LoveApiService);
  private notificationService = inject(NotificationService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  public isLoginMode = true;
  public isLoading = false;

  public loginData = {
    email: '',
    password: ''
  };

  public registerData = {
    name: '',
    email: '',
    password: '',
    password_confirmation: ''
  };

  constructor() {
    addIcons({ heart, mailOutline, lockClosedOutline, personOutline, shieldCheckmarkOutline });
  }

  async ngOnInit() {
    // Auto-login si ya hay token y usuario
    const storedUser = localStorage.getItem('love_widget_user');
    const { value: token } = await Preferences.get({ key: 'auth_token' });
    if (storedUser && token) {
      try {
        await this.loveApi.getCoupleInfo();
        this.notificationService.init();
        this.locationService.updateMyLocation(storedUser as 'juan' | 'roberta', storedUser);
        this.router.navigate(['/home'], { replaceUrl: true });
      } catch (e: any) {
        if (e.status === 403 || e.error?.message?.includes('No estás vinculado')) {
          this.router.navigate(['/pairing'], { replaceUrl: true });
        }
      }
    }
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
  }

  async onLogin(event: Event) {
    event.preventDefault();
    if (!this.loginData.email || !this.loginData.password) return;

    this.isLoading = true;
    try {
      await this.loveApi.login(this.loginData.email, this.loginData.password);
      await this.handleSuccessfulAuth(this.loginData.email);
    } catch (e: any) {
      console.log('Error login:', e);
      this.showToast('Credenciales incorrectas o error en el servidor.', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async onRegister(event: Event) {
    event.preventDefault();
    if (!this.registerData.name || !this.registerData.email || !this.registerData.password) return;

    if (this.registerData.password !== this.registerData.password_confirmation) {
      this.showToast('Las contraseñas no coinciden', 'warning');
      return;
    }

    this.isLoading = true;
    try {
      await this.loveApi.register({
        ...this.registerData,
        app: 'love_widget'
      });
      await this.handleSuccessfulAuth(this.registerData.email);
    } catch (e: any) {
      console.log('Error registro:', e);
      const msg = e.error?.message || 'Error al crear la cuenta. Inténtalo de nuevo.';
      this.showToast(msg, 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  private async handleSuccessfulAuth(email: string) {
    // Check if the user is paired
    try {
      await this.loveApi.getCoupleInfo();
      // If we are here, we are paired.
      
      let userId = 'juan'; // default temporal
      if (email.toLowerCase().includes('roberta')) {
        userId = 'roberta';
      }

      localStorage.setItem('love_widget_user', userId);
      await Preferences.set({ key: 'myUserId', value: userId });
      
      this.notificationService.init();
      this.locationService.updateMyLocation(userId as 'juan' | 'roberta', userId);
      
      this.router.navigate(['/home'], { replaceUrl: true });
    } catch (e: any) {
      if (e.status === 403 || e.error?.message?.includes('No estás vinculado')) {
        // Not paired yet, redirect to pairing page
        this.router.navigate(['/pairing'], { replaceUrl: true });
      } else {
        // Other errors, probably token issues, but we'll try home just in case
        this.router.navigate(['/home'], { replaceUrl: true });
      }
    }
  }

  async forgotPassword() {
    const alert = await this.alertCtrl.create({
      header: 'Recuperar Contraseña',
      subHeader: 'Introduce tu correo',
      message: 'Te enviaremos un enlace para restaurar tu contraseña.',
      cssClass: 'glass-alert',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'tu@correo.com',
          value: this.loginData.email
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'glass-alert-cancel'
        },
        {
          text: 'Enviar',
          cssClass: 'glass-alert-confirm',
          handler: async (data) => {
            if (data.email) {
              try {
                this.isLoading = true;
                await this.loveApi.forgotPassword(data.email);
                this.showToast('Correo enviado. Revisa tu bandeja de entrada.', 'success');
              } catch (e: any) {
                this.showToast(e.error?.message || 'Error al enviar el correo.', 'danger');
              } finally {
                this.isLoading = false;
              }
            }
          }
        }
      ]
    });
    await alert.present();
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
