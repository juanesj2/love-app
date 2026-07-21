import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { LoveApiService } from './love-api.service';

@Injectable({ providedIn: 'root' })
export class PendingLetterService {
  private api = inject(LoveApiService);

  // La carta pendiente que hay que mostrar (null si no hay ninguna)
  public pendingLetter$ = new BehaviorSubject<any>(null);

  /**
   * Espera a que el token de autenticación esté disponible y ENTONCES
   * busca cartas pendientes. Funciona sin importar cuánto tarde el login.
   */
  waitForTokenAndCheck() {
    this.api.token$.pipe(
      filter(token => !!token),  // espera hasta que haya token
      take(1)                     // solo una vez
    ).subscribe(() => {
      // Token listo — pequeño delay para que la UI esté montada
      setTimeout(() => this.checkForPendingLetters(), 1500);
    });
  }

  async checkForPendingLetters() {
    try {
      const token = this.api.token$.value;
      if (!token) return;

      // Obtener mi ID y todos los mensajes en paralelo
      const [me, messages]: [any, any[]] = await Promise.all([
        this.api.getMe(),
        this.api.getChatMessages()
      ]);

      const myId = me?.id;
      if (!myId) return;

      // Buscar la primera carta recibida (no enviada por mí) que no ha sido abierta
      const unread = messages.find(msg =>
        msg.mensaje?.startsWith('[LETTER]') &&
        msg.user_id !== myId &&
        !msg.meta?.opened
      );

      if (unread) {
        this.pendingLetter$.next(unread);
      }
    } catch (e) {
      console.error('Error checking pending letters:', e);
    }
  }

  dismiss() {
    this.pendingLetter$.next(null);
  }
}
