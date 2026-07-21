import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subscription, timer } from 'rxjs';
import { filter, take, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { LoveApiService } from './love-api.service';

@Injectable({ providedIn: 'root' })
export class PendingLetterService {
  private api = inject(LoveApiService);

  // La carta pendiente que hay que mostrar (null si no hay ninguna)
  public pendingLetter$ = new BehaviorSubject<any>(null);

  // IDs de cartas ya mostradas para no repetir
  private shownLetterIds = new Set<number>();

  private pollSub?: Subscription;
  private myId: number | null = null;

  /**
   * Espera a que el token esté disponible y arranca el polling automático.
   * Funciona sin importar cuánto tarde el login.
   */
  waitForTokenAndCheck() {
    this.api.token$.pipe(
      filter(token => !!token),
      take(1)
    ).subscribe(async () => {
      // Obtener mi ID una sola vez
      try {
        const me = await this.api.getMe();
        this.myId = me?.id ?? null;
      } catch (e) {
        console.error('Error getting user ID:', e);
      }
      // Arrancar polling cada 15 segundos
      this.startPolling();
    });
  }

  private startPolling() {
    if (this.pollSub) return;

    // Comprobar inmediatamente y luego cada 15 segundos
    this.pollSub = timer(500, 15000).pipe(
      switchMap(() => this.fetchPendingLetter()),
      catchError(err => {
        console.error('Error polling letters:', err);
        return of(null);
      })
    ).subscribe(unread => {
      if (unread) {
        this.pendingLetter$.next(unread);
      }
    });
  }

  private async fetchPendingLetter(): Promise<any> {
    try {
      if (!this.api.token$.value || !this.myId) return null;

      // Si ya hay una carta mostrándose no interrumpas
      if (this.pendingLetter$.value) return null;

      const messages: any[] = await this.api.getChatMessages();

      const unread = messages.find(msg =>
        msg.mensaje?.startsWith('[LETTER]') &&
        msg.user_id !== this.myId &&
        !msg.meta?.opened &&
        !this.shownLetterIds.has(msg.id)
      );

      return unread ?? null;
    } catch (e) {
      return null;
    }
  }

  async checkForPendingLetters() {
    const unread = await this.fetchPendingLetter();
    if (unread) this.pendingLetter$.next(unread);
  }

  dismiss() {
    // Marcar esta carta como ya mostrada para no volver a mostrarla
    const current = this.pendingLetter$.value;
    if (current?.id) this.shownLetterIds.add(current.id);
    this.pendingLetter$.next(null);
  }

  stopPolling() {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
  }
}
