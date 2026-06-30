import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Platform } from '@ionic/angular';
import { LoveApiService } from './love-api.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PremiumService {
  private api = inject(LoveApiService);
  private platform = inject(Platform);

  // Observable for the entire app to know if they are premium
  public isPremium$ = new BehaviorSubject<boolean>(true); // Por defecto true para no bloquear mientras carga
  
  // To track if it's explicitly a free user
  public isFree$ = new BehaviorSubject<boolean>(false);
  
  public packages$ = new BehaviorSubject<any[]>([]);

  get isPremium() {
    return this.isPremium$.value;
  }

  constructor() {}

  async initialize() {
    // Wait until platform is ready for native plugins
    await this.platform.ready();
    
    // Configurar RevenueCat
    // ATENCIÓN: Estas claves deben ser reemplazadas por las reales en producción
    try {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      
      if (this.platform.is('ios')) {
        await Purchases.configure({ apiKey: environment.revenuecatAppleKey });
      } else if (this.platform.is('android')) {
        await Purchases.configure({ apiKey: environment.revenuecatGoogleKey });
      } else {
        // En web, asumiremos premium temporalmente para pruebas o requeriremos el backend
        this.verifyPremiumFromBackend();
        return;
      }

      const me = await this.api.getMe().catch(() => null);
      if (me && me.id) {
        // Usar un ID de pareja o el ID del usuario para loguear en RC
        // Lo ideal es un ID de pareja (si lo tuviéramos) o el app_id
        await Purchases.logIn({ appUserID: `user_${me.id}` });
      }

      await this.checkSubscriptionStatus();
      await this.fetchOfferings();
    } catch (e) {
      console.error('Error initializing RevenueCat', e);
      // Fallback al backend
      this.verifyPremiumFromBackend();
    }
  }

  private async verifyPremiumFromBackend() {
    try {
      const info: any = await this.api.getMe(); // getMe() returns a Promise
      if (info && info.is_premium !== undefined) {
        this.setPremiumState(info.is_premium);
      }
    } catch (e) {
      console.error('Error fallback backend premium', e);
    }
  }

  async checkSubscriptionStatus() {
    if (!this.platform.is('hybrid')) return;

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      // "Premium" es el nombre del entitlement que debes crear en RevenueCat
      const isPremium = typeof customerInfo.customerInfo.entitlements.active['Premium'] !== 'undefined';
      this.setPremiumState(isPremium);
    } catch (e) {
      console.error('Error checking status', e);
    }
  }

  async fetchOfferings() {
    if (!this.platform.is('hybrid')) {
      // Fallback simulado para web
      this.packages$.next([
        { identifier: 'monthly', packageType: 'MONTHLY', product: { priceString: '1,99 €', title: 'Mensual' } },
        { identifier: 'annual', packageType: 'ANNUAL', product: { priceString: '20,00 €', title: 'Anual' } }
      ]);
      return;
    }

    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current && offerings.current.availablePackages.length !== 0) {
        this.packages$.next(offerings.current.availablePackages);
      }
    } catch (e) {
      console.error('Error fetching offerings', e);
    }
  }

  async purchasePremium(pkg?: any): Promise<boolean> {
    if (!this.platform.is('hybrid')) {
      // Simulamos éxito en Web
      this.setPremiumState(true);
      return true;
    }

    try {
      if (!pkg) {
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length !== 0) {
          pkg = offerings.current.availablePackages[0];
        } else {
          return false;
        }
      }
      
      const purchaseResult = await Purchases.purchasePackage({ aPackage: pkg });
      
      const isPremium = typeof purchaseResult.customerInfo.entitlements.active['Premium'] !== 'undefined';
      this.setPremiumState(isPremium);
      return isPremium;
    } catch (e: any) {
      if (!e.userCancelled) {
        console.error('Error en compra', e);
      }
    }
    return false;
  }

  async restorePurchases(): Promise<boolean> {
    if (!this.platform.is('hybrid')) return false;

    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPremium = typeof customerInfo.customerInfo.entitlements.active['Premium'] !== 'undefined';
      this.setPremiumState(isPremium);
      return isPremium;
    } catch (e) {
      console.error('Error restoring', e);
      return false;
    }
  }

  private setPremiumState(isPremium: boolean) {
    this.isPremium$.next(isPremium);
    this.isFree$.next(!isPremium);
  }
}
