import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

// Importaciones de Firebase
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, initializeFirestore } from '@angular/fire/firestore';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { getApp } from '@angular/fire/app';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

// PWA Elements para la cámara en web
import { defineCustomElements } from '@ionic/pwa-elements/loader';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './app/interceptors/auth.interceptor';
import { nativeHttpInterceptor } from './app/interceptors/native-http.interceptor';
import { LOCALE_ID } from '@angular/core';
import localeEs from '@angular/common/locales/es';
import { registerLocaleData } from '@angular/common';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

registerLocaleData(localeEs, 'es-ES');

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: LOCALE_ID, useValue: 'es-ES' },
    provideIonicAngular(),
    provideAnimationsAsync(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor])),
    
    // Inicialización de Firebase
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => initializeFirestore(getApp(), { experimentalForceLongPolling: true })),
  ],
});

// Inicializar elementos de interfaz de cámara para web
defineCustomElements(window);

// Inicializar Google Sign In para web
GoogleSignIn.initialize({
  clientId: '598297080553-h6sfq42rfibl91g88usbaqb91r56gbbp.apps.googleusercontent.com',
  redirectUrl: window.location.origin + '/login',
});
