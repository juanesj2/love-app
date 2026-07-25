import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subscription, timer } from 'rxjs';
import { filter, take, switchMap, catchError } from 'rxjs/operators';
import { of, from } from 'rxjs';
import { LoveApiService } from './love-api.service';
import { Preferences } from '@capacitor/preferences';

@Injectable({ providedIn: 'root' })
export class PendingLetterService {
  private api = inject(LoveApiService);

  public pendingLetter$ = new BehaviorSubject<any>(null);
  public pendingGift$ = new BehaviorSubject<any>(null);
  private shownLetterIds = new Set<number>();
  private pollSub?: Subscription;
  public myId: number | null = null;

  constructor() {
    this.loadShownLetters();
  }

  private async loadShownLetters() {
    const cached = await Preferences.get({ key: 'shown_letters_ids' });
    if (cached.value) {
      try {
        const ids = JSON.parse(cached.value);
        if (Array.isArray(ids)) {
          ids.forEach(id => this.shownLetterIds.add(id));
        }
      } catch (e) {}
    }
  }

  waitForTokenAndCheck() {
    this.api.token$.pipe(
      filter(token => !!token),
      take(1)
    ).subscribe(async () => {
      console.log('[PendingSurprise] Token disponible, cargando ID...');
      try {
        const info = await this.api.getCoupleInfo();
        this.myId = info?.my_id ?? null;
      } catch (e) {}
      this.startPolling();
    });
  }

  private startPolling() {
    if (this.pollSub) return;

    this.pollSub = timer(500, 15000).pipe(
      switchMap(() => from(this.fetchPendingSurprise())),
      catchError(err => {
        return of(null);
      })
    ).subscribe(unread => {
      if (unread) {
        if (unread.mensaje.startsWith('[LETTER]')) {
           this.pendingLetter$.next(unread);
        } else if (unread.mensaje.startsWith('[GIFT]') || unread.mensaje.startsWith('[ADMIN_GIFT]')) {
           this.pendingGift$.next(unread);
        }
      }
    });
  }

  private async fetchPendingSurprise(): Promise<any> {
    try {
      if (!this.api.token$.value) return null;
      if (!this.myId) {
        const info = await this.api.getCoupleInfo();
        this.myId = info?.my_id ?? null;
        if (!this.myId) return null;
      }

      // No interrumpir si ya hay algo mostrándose
      if (this.pendingLetter$.value || this.pendingGift$.value) return null;

      const messages: any[] = await this.api.getChatMessages();
      
      const surprises = messages.filter(msg => 
         msg.mensaje?.startsWith('[LETTER]') || msg.mensaje?.startsWith('[GIFT]') || msg.mensaje?.startsWith('[ADMIN_GIFT]')
      );

      const unreadPartnerSurprises = surprises.filter(msg =>
        (Number(msg.user_id) !== Number(this.myId)) &&
        !msg.meta?.opened
      );

      if (unreadPartnerSurprises.length === 0) return null;

      unreadPartnerSurprises.sort((a, b) => a.id - b.id);
      
      const latestUnread = unreadPartnerSurprises[unreadPartnerSurprises.length - 1];

      for (let i = 0; i < unreadPartnerSurprises.length - 1; i++) {
        this.shownLetterIds.add(unreadPartnerSurprises[i].id);
      }

      if (this.shownLetterIds.has(latestUnread.id)) {
        return null;
      }

      return latestUnread;
    } catch (e) {
      return null;
    }
  }

  dismiss(type: 'letter' | 'gift' = 'letter') {
    const current = type === 'letter' ? this.pendingLetter$.value : this.pendingGift$.value;
    if (current?.id) {
      this.shownLetterIds.add(current.id);
      Preferences.set({ key: 'shown_letters_ids', value: JSON.stringify(Array.from(this.shownLetterIds)) }).catch(e => console.error(e));
    }
    if (type === 'letter') {
       this.pendingLetter$.next(null);
    } else {
       this.pendingGift$.next(null);
    }
  }

  stopPolling() {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
  }
}
