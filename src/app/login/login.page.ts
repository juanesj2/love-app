import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, AlertController, ToastController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { eyeOutline, eyeOffOutline, heart, mailOutline, lockClosedOutline, personOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { LocationService } from '../services/location.service';
import { LoveApiService } from '../services/love-api.service';
import { NotificationService } from '../services/notification.service';
import { Browser } from '@capacitor/browser';
import { Preferences } from '@capacitor/preferences';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

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

  public authMode: 'login' | 'register' | 'forgot' = 'login';
  public isLoading = false;
  
  public showPassword = false;
  public showConfirmPassword = false;

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

  public forgotData = {
    email: ''
  };

  constructor() {
    addIcons({ eyeOutline, eyeOffOutline, heart, mailOutline, lockClosedOutline, personOutline, shieldCheckmarkOutline });
  }

  async ngOnInit() {
      // Auto-login si ya hay token y usuario
      const storedUser = localStorage.getItem('love_widget_user');
      let token = null;
      try {
        const res = await SecureStoragePlugin.get({ key: 'auth_token' }).catch(async () => await Preferences.get({ key: 'auth_token' }));
        token = res.value;
      } catch (e) {
        token = null;
      }
    if (storedUser && token) {
      try {
        await this.loveApi.getCoupleInfo();
        this.notificationService.init();
        this.locationService.updateMyLocation(storedUser, storedUser);
        this.router.navigate(['/home'], { replaceUrl: true });
      } catch (e: any) {
        if (e.status === 403 || e.error?.message?.includes('No estás vinculado')) {
          this.router.navigate(['/pairing'], { replaceUrl: true });
        }
      }
    }
  }

  showForgotPassword() {
    this.authMode = 'forgot';
  }

  async sendForgotPassword(event: Event) {
    event.preventDefault();
    if (!this.forgotData.email) return;

    try {
      this.isLoading = true;
      await this.loveApi.forgotPassword(this.forgotData.email);
      this.showToast('Correo enviado. Revisa tu bandeja de entrada.', 'success');
      this.authMode = 'login';
    } catch (e: any) {
      this.showToast(e.error?.message || 'Error al enviar el correo.', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  toggleMode() {
    if (this.authMode === 'forgot') {
      this.authMode = 'login';
    } else {
      this.authMode = this.authMode === 'login' ? 'register' : 'login';
    }
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
      const info = await this.loveApi.getCoupleInfo();
      // If we are here, we are paired.
      
      const userId = info.my_id.toString();

      localStorage.setItem('love_widget_user', userId);
      await Preferences.set({ key: 'myUserId', value: userId });
      
      this.notificationService.init();
      this.locationService.updateMyLocation(userId, info.my_name || userId);
      
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
