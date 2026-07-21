import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LoveApiService } from './love-api.service';

@Injectable({ providedIn: 'root' })
export class PendingLetterService {
  private api = inject(LoveApiService);

  // La carta pendiente que hay que mostrar (null si no hay ninguna)
  public pendingLetter$ = new BehaviorSubject<any>(null);

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
