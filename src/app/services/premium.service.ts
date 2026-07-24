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
  public isPremium$ = new BehaviorSubject<boolean>(false);
  
  // To track if it's explicitly a free user
  public isFree$ = new BehaviorSubject<boolean>(true);
  
  public packages$ = new BehaviorSubject<any[]>([]);

  public premiumDaysLeft$ = new BehaviorSubject<number | null>(null);
  public premiumExpiresAt$ = new BehaviorSubject<Date | null>(null);

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
        if (info.premium_until) {
          const expirationDate = new Date(info.premium_until);
          this.premiumExpiresAt$.next(expirationDate);
          const diff = expirationDate.getTime() - new Date().getTime();
          this.premiumDaysLeft$.next(Math.max(0, Math.ceil(diff / (1000 * 3600 * 24))));
        } else if (info.is_premium) {
          this.premiumDaysLeft$.next(365); // Default si no hay fecha pero es premium
        }
      } else {
        this.setPremiumState(false);
      }
    } catch (e) {
      console.error('Error fallback backend premium', e);
      this.setPremiumState(false);
    }
  }

  async checkSubscriptionStatus() {
    if (!this.platform.is('hybrid')) return;

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      // "Premium" es el nombre del entitlement que debes crear en RevenueCat
      const premiumEntitlement = customerInfo.customerInfo.entitlements.active['Love Widget Pro'];
      const isPremium = typeof premiumEntitlement !== 'undefined';
      
      if (isPremium) {
        this.updateDaysLeftFromEntitlement(premiumEntitlement);
      }
      this.setPremiumState(isPremium);
    } catch (e) {
      console.error('Error checking status', e);
    }
  }

  private updateDaysLeftFromEntitlement(entitlement: any) {
    if (entitlement && entitlement.expirationDate) {
      const expirationDate = new Date(entitlement.expirationDate);
      this.premiumExpiresAt$.next(expirationDate);
      const diff = expirationDate.getTime() - new Date().getTime();
      this.premiumDaysLeft$.next(Math.max(0, Math.ceil(diff / (1000 * 3600 * 24))));
    } else {
      this.premiumDaysLeft$.next(365);
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

  async purchasePremium(pkg?: any): Promise<{success: boolean, error?: any}> {
    if (!this.platform.is('hybrid')) {
      const confirmPurchase = confirm('Estás en la web (modo simulado). ¿Seguro que quieres "comprar" el plan Premium? No se te cobrará nada real.');
      if (!confirmPurchase) return { success: false, error: { userCancelled: true } };

      // Simulamos éxito en Web con 7 días de prueba
      this.setPremiumState(true);
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7);
      this.premiumExpiresAt$.next(expirationDate);
      this.premiumDaysLeft$.next(7);
      return { success: true };
    }

    try {
      if (!pkg) {
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length !== 0) {
          pkg = offerings.current.availablePackages[0];
        } else {
          return { success: false, error: { message: 'No hay paquetes de suscripción configurados.' } };
        }
      }
      
      const purchaseResult = await Purchases.purchasePackage({ aPackage: pkg });
      
      const premiumEntitlement = purchaseResult.customerInfo.entitlements.active['Love Widget Pro'];
      const isPremium = typeof premiumEntitlement !== 'undefined';
      if (!isPremium) {
         return { success: false, error: { message: 'Compra procesada, pero los permisos no están activos. Entitlements activos: ' + JSON.stringify(Object.keys(purchaseResult.customerInfo.entitlements.active)) } };
      } else {
         this.updateDaysLeftFromEntitlement(premiumEntitlement);
      }
      this.setPremiumState(isPremium);
      return { success: isPremium };
    } catch (e: any) {
      console.error('Error en compra', e);
      return { success: false, error: e };
    }
  }

  async purchaseConsumable(productId: string): Promise<{success: boolean, error?: any}> {
    if (!this.platform.is('hybrid')) {
      const confirmPurchase = confirm(`Estás en la web (modo simulado). ¿Seguro que quieres "comprar" el producto ${productId}?`);
      if (!confirmPurchase) return { success: false, error: { userCancelled: true } };
      return { success: true };
    }

    try {
      // 1. Obtener el producto de las tiendas
      const productsInfo = await (Purchases as any).getProducts({ productIdentifiers: [productId] });
      if (!productsInfo || productsInfo.length === 0) {
        return { success: false, error: { message: `Producto ${productId} no encontrado en RevenueCat/Google Play` } };
      }

      // 2. Realizar la compra usando purchaseStoreProduct (método para consumibles)
      const purchaseResult = await (Purchases as any).purchaseStoreProduct({ product: productsInfo[0] });
      
      // Si no ha lanzado excepción, la compra nativa fue exitosa.
      return { success: true };
    } catch (e: any) {
      console.error('Error comprando consumible:', e);
      return { success: false, error: e };
    }
  }

  async restorePurchases(): Promise<boolean> {
    if (!this.platform.is('hybrid')) return false;

    try {
      const customerInfo = await Purchases.restorePurchases();
      const premiumEntitlement = customerInfo.customerInfo.entitlements.active['Love Widget Pro'];
      const isPremium = typeof premiumEntitlement !== 'undefined';
      if (isPremium) {
        this.updateDaysLeftFromEntitlement(premiumEntitlement);
      }
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
