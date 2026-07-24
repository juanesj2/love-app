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
            <p><strong>Juan Stiven Alcañiz Aullon</strong> (en adelante "el Desarrollador") opera la aplicación "Love Widget". Al usar nuestra app, usted acepta la recopilación y uso de información de acuerdo con esta política. Esta política está diseñada para cumplir con el RGPD (Europa), CCPA (California) y las estrictas normativas de privacidad de Google Play y Apple App Store.</p>
            
            <h4 style="color: #590D22; margin-top: 15px;">1. Datos Recopilados y Finalidad</h4>
            <ul>
              <li><strong>Cuenta:</strong> Email, nombre y foto de perfil (para identificarle ante su pareja).</li>
              <li><strong>Contenido Generado:</strong> Textos, fotos, garabatos y audios enviados en el chat. Estos datos se procesan únicamente para entregarlos a su pareja vinculada.</li>
              <li><strong>Ubicación en Segundo Plano (IMPORTANTE):</strong> La aplicación solicita acceso a su ubicación precisa y en segundo plano (incluso cuando la app está cerrada o no se está usando) <strong>estrictamente</strong> para actualizar su posición en el mapa en tiempo real y compartirla exclusivamente con su pareja vinculada. <strong>Nunca</strong> vendemos, alquilamos ni compartimos su historial de ubicaciones con terceros, anunciantes o agencias. Usted puede revocar este permiso en cualquier momento desde los ajustes de su dispositivo o activando el "Modo Fantasma" en la app.</li>
              <li><strong>Información del Dispositivo:</strong> Tokens de notificaciones push (para enviarle avisos) y datos de diagnóstico anónimos en caso de errores técnicos.</li>
            </ul>

            <h4 style="color: #590D22; margin-top: 15px;">2. Proveedores de Terceros</h4>
            <p>Utilizamos servicios de terceros que cumplen con normativas de privacidad internacionales: <strong>Firebase (Google)</strong> para autenticación y notificaciones push, <strong>RevenueCat</strong> para la gestión de suscripciones, y servidores propios seguros (AlwaysData) para alojar el contenido multimedia temporalmente. Ninguno de estos terceros tiene derecho a usar sus datos para fines publicitarios.</p>

            <h4 style="color: #590D22; margin-top: 15px;">3. Retención y Eliminación de Datos</h4>
            <p>Sus datos se retienen únicamente mientras su cuenta esté activa. Usted tiene el derecho absoluto de eliminar sus datos. Puede borrar su cuenta y todo su historial de ubicaciones y mensajes instantáneamente yendo a <strong>Ajustes > Eliminar mi Cuenta</strong>. Alternativamente, puede solicitar la eliminación escribiendo a <strong>lovewidgetsupport@gmail.com</strong>.</p>
            
            <h4 style="color: #590D22; margin-top: 15px;">4. Restricción de Edad</h4>
            <p>La Aplicación no está dirigida a menores de 13 años (o la edad mínima legal en su país). No recopilamos conscientemente datos de menores. Si descubrimos que un menor nos ha proporcionado información, la eliminaremos inmediatamente.</p>

            <h4 style="color: #590D22; margin-top: 15px;">5. Cambios en la Política y Contacto</h4>
            <p>Nos reservamos el derecho a actualizar esta política. En caso de cambios sustanciales sobre el tratamiento de su ubicación, se le solicitará consentimiento nuevamente. Para cualquier consulta legal o de privacidad, contacte a: <strong>lovewidgetsupport@gmail.com</strong>.</p>
          </div>

          <!-- CONTENIDO TÉRMINOS Y CONDICIONES -->
          <div *ngIf="documentType === 'terms'">
            <p>Al acceder, descargar o utilizar "Love Widget", usted acepta estar legalmente vinculado por estos Términos y Condiciones. Si no está de acuerdo, no utilice la Aplicación.</p>

            <h4 style="color: #590D22; margin-top: 15px;">1. Uso Consentido y Prohibición de Acoso</h4>
            <p>Esta aplicación está diseñada exclusivamente para su uso entre parejas u otras relaciones de <strong>mutuo consentimiento</strong>. Al vincular su cuenta con otro usuario, usted otorga permiso explícito para compartir su ubicación, estado del teléfono y mensajes.<br><br><strong>Queda estrictamente prohibido:</strong> Instalar la aplicación en el dispositivo de otra persona sin su conocimiento (Spyware/Stalking), acosar, amenazar o usar los datos de ubicación para fines maliciosos. El Desarrollador se reserva el derecho de bloquear inmediatamente cuentas que violen esta norma y reportarlas a las autoridades competentes si fuese necesario.</p>

            <h4 style="color: #590D22; margin-top: 15px;">2. Renuncia de Responsabilidad ("AS IS")</h4>
            <p><strong>Limitación de Responsabilidad Legal:</strong> La aplicación se proporciona "TAL CUAL" y "SEGÚN DISPONIBILIDAD". El Desarrollador <strong>no se hace responsable</strong> de problemas personales, disputas de pareja, o consecuencias derivadas del uso o mala interpretación de la información mostrada en la app (como errores de GPS, retrasos en la ubicación, o mensajes no entregados). Usted utiliza la información de la aplicación bajo su propio riesgo.</p>

            <h4 style="color: #590D22; margin-top: 15px;">3. Compras, Suscripciones y Política de Reembolsos</h4>
            <p>Las compras y suscripciones premium se gestionan a través de Apple App Store o Google Play Store. Debido a que el contenido digital premium se entrega inmediatamente tras la compra, <strong>todas las ventas son definitivas y no se emitirán reembolsos</strong> bajo ninguna circunstancia, excepto cuando sea requerido imperativamente por la ley local (ej. derecho de desistimiento de la UE, si aplica) o a discreción exclusiva de la tienda de aplicaciones. Es su responsabilidad cancelar suscripciones recurrentes al menos 24 horas antes de la renovación desde los ajustes de su teléfono.</p>

            <h4 style="color: #590D22; margin-top: 15px;">4. Contenido del Usuario</h4>
            <p>Usted conserva los derechos de propiedad intelectual sobre las fotos y textos que envíe. Sin embargo, usted es el único responsable legal de que dicho contenido no viole leyes de derechos de autor, no contenga material ilegal, extremista o no consensuado.</p>

            <h4 style="color: #590D22; margin-top: 15px;">5. Jurisdicción y Contacto</h4>
            <p>Estos Términos se regirán e interpretarán de acuerdo con las leyes aplicables al domicilio del Desarrollador (España). Para cualquier disputa o consulta, puede contactar a: <strong>lovewidgetsupport@gmail.com</strong>.</p>
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
