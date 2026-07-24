import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-legal-modal',
  standalone: true,
  imports: [CommonModule, IonIcon],
  styles: [`
    .custom-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center; z-index: 99999;
      will-change: transform, opacity;
    }
    .bottom-sheet-modal {
      width: 100%; 
      background: #fff0f3;
      border-top-left-radius: 30px; border-top-right-radius: 30px;
      display: flex; flex-direction: column; overflow: hidden; position: relative;
    }
    .bottom-sheet-modal.auto-height-sheet {
      height: auto;
      max-height: calc(100% - var(--safe-top) - 90px);
      padding-bottom: 20px;
    }
    .bottom-sheet-header { padding: 25px 20px 10px; position: relative; background: #fff0f3; z-index: 2; text-align: left; transform: translateZ(0); }
    .bottom-sheet-header h2 { margin: 0; font-size: 1.8rem; font-weight: 900; color: #590D22; display: flex; align-items: center; gap: 10px; }
    .bottom-sheet-header p { margin: 5px 0 20px; color: #a4133c; font-size: 0.95rem; }
    .bottom-sheet-body { flex: 1; overflow-y: auto; padding: 0 20px; transform: translateZ(0); }
    .sheet-close-btn {
      position: absolute; top: 20px; right: 20px; width: 36px; height: 36px;
      background: rgba(255,255,255,0.8); border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1); cursor: pointer;
    }
    .sheet-close-btn ion-icon { font-size: 1.5rem; color: #590D22; }
  `],
  template: `
    <div class="custom-overlay" (click)="close.emit()" style="z-index: 100000; align-items: flex-end;">
      <div class="bottom-sheet-modal auto-height-sheet" (click)="$event.stopPropagation()" style="max-height: 90vh;">
        <div class="bottom-sheet-header">
          <div class="sheet-close-btn" (click)="close.emit()">
            <ion-icon name="close-outline"></ion-icon>
          </div>
          <h2>{{ documentType === 'privacy' ? 'Política de Privacidad' : 'Términos y Condiciones' }}</h2>
          <p>Última actualización: 23 de Julio de 2026</p>
        </div>
        
        <div class="bottom-sheet-body" style="overflow-y: auto; text-align: left; padding: 15px; color: #495057; font-size: 0.9rem; line-height: 1.5;">
          
          <!-- CONTENIDO POLÍTICA DE PRIVACIDAD -->
          <div *ngIf="documentType === 'privacy'">
            <p><strong>Juan Stiven Alcañiz Aullon</strong> opera esta aplicación. El uso de la Aplicación implica la aceptación de la recopilación y el uso de información de acuerdo con esta política (RGPD y Google Play).</p>
            
            <h4 style="color: #590D22; margin-top: 15px;">1. Información Recopilada</h4>
            <ul>
              <li><strong>Cuenta:</strong> Email, nombre y foto de perfil.</li>
              <li><strong>Contenido generado:</strong> Fotos, audios y textos compartidos.</li>
              <li><strong>Ubicación:</strong> Precisa y en segundo plano, estrictamente para compartirla en tiempo real con su pareja.</li>
              <li><strong>Permisos:</strong> Cámara, micrófono, notificaciones push (Firebase) y almacenamiento.</li>
            </ul>

            <h4 style="color: #590D22; margin-top: 15px;">2. Terceros</h4>
            <p>Usamos Firebase para notificaciones y autenticación, y RevenueCat para gestionar suscripciones de Google Play Billing. No vendemos sus datos.</p>

            <h4 style="color: #590D22; margin-top: 15px;">3. Eliminación de Datos</h4>
            <p>Puede eliminar su cuenta y todos sus datos en Ajustes > "Eliminar mi Cuenta", enviando un correo a <strong>lovewidgetsupport@gmail.com</strong> o desde la web (enlace próximamente).</p>
            
            <h4 style="color: #590D22; margin-top: 15px;">4. Contacto</h4>
            <p>Para privacidad: lovewidgetsupport@gmail.com</p>
          </div>

          <!-- CONTENIDO TÉRMINOS Y CONDICIONES -->
          <div *ngIf="documentType === 'terms'">
            <p>Al acceder o utilizar la Aplicación, usted acepta regirse por estos Términos.</p>

            <h4 style="color: #590D22; margin-top: 15px;">1. Uso de la Aplicación</h4>
            <p>Concedemos una licencia personal para vincularse con su pareja. Queda prohibido el acoso o contenido ilegal.</p>

            <h4 style="color: #590D22; margin-top: 15px;">2. Compras In-App y Reembolsos</h4>
            <p>Todas las compras (paquetes premium, créditos, etc.) se procesan de forma segura mediante Google Play o Apple App Store. Debido a la naturaleza digital inmediata de los artículos (bienes digitales), <strong>todas las ventas son definitivas y no se emitirán reembolsos</strong>, salvo que la ley local exija lo contrario o a discreción de la tienda de aplicaciones. Las suscripciones se renuevan automáticamente salvo cancelación 24h antes del fin del ciclo en su respectiva tienda.</p>

            <h4 style="color: #590D22; margin-top: 15px;">3. Contenido</h4>
            <p>Usted conserva los derechos sobre el contenido subido, y es el único responsable del mismo.</p>

            <h4 style="color: #590D22; margin-top: 15px;">4. Limitación de Responsabilidad</h4>
            <p>La app se provee "TAL CUAL". No garantizamos precisión absoluta del GPS ni funcionamiento libre de errores.</p>

            <h4 style="color: #590D22; margin-top: 15px;">5. Contacto</h4>
            <p>lovewidgetsupport@gmail.com</p>
          </div>

          <div style="margin-top: 20px;">
            <button class="glass-btn" style="width: 100%;" (click)="close.emit()">Entendido</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LegalModalComponent {
  @Input() documentType: 'privacy' | 'terms' = 'privacy';
  @Output() close = new EventEmitter<void>();
  constructor() {
    addIcons({ closeOutline });
  }
}
