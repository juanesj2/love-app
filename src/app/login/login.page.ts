import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, AlertController, ToastController } from '@ionic/angular/standalone';
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
  imports: [IonContent, CommonModule, FormsModule]
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
      this.notificationService.init();
      // Si el login fue con el modo antiguo, lo mantenemos temporalmente
      // idealmente habría que buscar el perfil en base al usuario autenticado,
      // pero por compatibilidad con el widget lo dejamos.
      this.locationService.updateMyLocation(storedUser as 'juan' | 'roberta', storedUser);
      this.router.navigate(['/home'], { replaceUrl: true });
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
    // Determinar temporalmente el userId basado en el correo para no romper la app actual
    // (A futuro esto debería venir del backend /user endpoint)
    let userId = 'juan'; // default temporal
    if (email.toLowerCase().includes('roberta')) {
      userId = 'roberta';
    }

    localStorage.setItem('love_widget_user', userId);
    await Preferences.set({ key: 'myUserId', value: userId });
    
    this.notificationService.init();
    this.locationService.updateMyLocation(userId as 'juan' | 'roberta', userId);
    
    this.router.navigate(['/home'], { replaceUrl: true });
  }

  async forgotPassword() {
    // Abre el navegador interno con la URL del backend
    await Browser.open({ url: 'https://enfoca.alwaysdata.net/forgot-password' });
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
