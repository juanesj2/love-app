import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

// Importaciones de Firebase
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

// PWA Elements para la cámara en web
import { defineCustomElements } from '@ionic/pwa-elements/loader';

import { provideHttpClient } from '@angular/common/http';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(),
    
    // Inicialización de Firebase
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => getFirestore()),
  ],
});

// Inicializar elementos de interfaz de cámara para web
defineCustomElements(window);

// Inicializar Google Sign In para web
GoogleSignIn.initialize({
  clientId: '598297080553-h6sfq42rfibl91g88usbaqb91r56gbbp.apps.googleusercontent.com',
  redirectUrl: window.location.origin + '/login',
});
