import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, ToastController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { linkOutline, copyOutline, keyOutline } from 'ionicons/icons';
import { LoveApiService } from '../services/love-api.service';

@Component({
  selector: 'app-pairing',
  templateUrl: './pairing.page.html',
  styleUrls: ['./pairing.page.scss'],
  standalone: true,
  imports: [IonContent, IonIcon, CommonModule, FormsModule]
})
export class PairingPage implements OnInit {
  private loveApi = inject(LoveApiService);
  private toastCtrl = inject(ToastController);
  private router = inject(Router);

  public myCode: string | null = null;
  public partnerCode: string = '';
  public isLoading = false;

  constructor() {
    addIcons({ linkOutline, copyOutline, keyOutline });
  }

  async ngOnInit() {
    await this.loadMyCode();
  }

  async loadMyCode() {
    try {
      const res = await this.loveApi.getMe();
      const user = res.data ? res.data : res;
      if (user && user.pairing_code) {
        this.myCode = user.pairing_code;
      }
    } catch (e) {
      console.error('Error loading user profile:', e);
    }
  }

  async copyCode() {
    if (!this.myCode) return;
    try {
      await navigator.clipboard.writeText(this.myCode);
      this.showToast('Código copiado al portapapeles', 'success');
    } catch (e) {
      console.error('Failed to copy', e);
    }
  }

  async onPair(event: Event) {
    event.preventDefault();
    if (!this.partnerCode || this.partnerCode.length < 6) return;

    this.isLoading = true;
    try {
      await this.loveApi.pair(this.partnerCode);
      this.showToast('¡Vinculación exitosa!', 'success');
      // Una vez emparejado, vamos a home
      this.router.navigate(['/home'], { replaceUrl: true });
    } catch (e: any) {
      const msg = e.error?.message || 'Error al vincular. Revisa el código.';
      this.showToast(msg, 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async logout() {
    await this.loveApi.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
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
