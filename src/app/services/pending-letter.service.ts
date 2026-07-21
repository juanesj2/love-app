import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subscription, timer } from 'rxjs';
import { filter, take, switchMap, catchError } from 'rxjs/operators';
import { of, from } from 'rxjs';
import { LoveApiService } from './love-api.service';

@Injectable({ providedIn: 'root' })
export class PendingLetterService {
  private api = inject(LoveApiService);

  public pendingLetter$ = new BehaviorSubject<any>(null);
  private shownLetterIds = new Set<number>();
  private pollSub?: Subscription;
  private myId: number | null = null;

  waitForTokenAndCheck() {
    this.api.token$.pipe(
      filter(token => !!token),
      take(1)
    ).subscribe(async () => {
      console.log('[PendingLetter] Token disponible, cargando ID de usuario...');
      try {
        const me = await this.api.getMe();
        this.myId = me?.id ?? null;
        console.log('[PendingLetter] Mi ID:', this.myId);
      } catch (e) {
        console.error('[PendingLetter] Error al obtener usuario:', e);
      }
      this.startPolling();
    });
  }

  private startPolling() {
    if (this.pollSub) return;
    console.log('[PendingLetter] Iniciando polling cada 15 segundos...');

    this.pollSub = timer(500, 15000).pipe(
      switchMap(() => from(this.fetchPendingLetter())),
      catchError(err => {
        console.error('[PendingLetter] Error en polling:', err);
        return of(null);
      })
    ).subscribe(unread => {
      if (unread) {
        console.log('[PendingLetter] ¡Carta pendiente encontrada!', unread);
        this.pendingLetter$.next(unread);
      }
    });
  }

  private async fetchPendingLetter(): Promise<any> {
    try {
      if (!this.api.token$.value) return null;

      // Si myId no está cargado todavía, intentar de nuevo
      if (!this.myId) {
        const me = await this.api.getMe();
        this.myId = me?.id ?? null;
        if (!this.myId) return null;
      }

      // No interrumpir si ya hay una carta mostrándose
      if (this.pendingLetter$.value) return null;

      const messages: any[] = await this.api.getChatMessages();
      console.log('[PendingLetter] Mensajes revisados:', messages.length, '| Mi ID:', this.myId);

      const letters = messages.filter(msg => msg.mensaje?.startsWith('[LETTER]'));
      console.log('[PendingLetter] Cartas encontradas:', letters.length, letters.map(m => ({ id: m.id, user_id: m.user_id, opened: m.meta?.opened })));

      const unread = letters.find(msg =>
        msg.user_id !== this.myId &&
        !msg.meta?.opened &&
        !this.shownLetterIds.has(msg.id)
      );

      return unread ?? null;
    } catch (e) {
      console.error('[PendingLetter] Error al buscar cartas:', e);
      return null;
    }
  }

  dismiss() {
    const current = this.pendingLetter$.value;
    if (current?.id) this.shownLetterIds.add(current.id);
    this.pendingLetter$.next(null);
  }

  stopPolling() {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
  }
}
