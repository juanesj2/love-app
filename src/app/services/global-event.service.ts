import { Injectable, inject } from '@angular/core';
import { LoveApiService } from './love-api.service';
import { BehaviorSubject, timer, Subscription } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export interface GlobalEvent {
  id: number;
  title: string;
  message: string;
  confetti_enabled: boolean;
  confetti_colors: string[];
  emojis_enabled: boolean;
  emojis_list: string;
  top_bar_color: string;
  is_active: boolean;
  expires_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalEventService {
  private loveApi = inject(LoveApiService);
  public activeEvent$ = new BehaviorSubject<GlobalEvent | null>(null);
  private pollingSub?: Subscription;

  startPolling() {
    if (this.pollingSub) return;
    
    // Check for global events every 3 minutes, and immediately on start
    this.pollingSub = timer(0, 180000).pipe(
      switchMap(() => this.loveApi.getActiveGlobalEvent()),
      catchError(err => {
        console.error('Error fetching global event:', err);
        return of(null);
      })
    ).subscribe(event => {
      // Ignorar el evento global antiguo de prueba de regalos
      if (event && event.title && event.title.includes('Regalo')) {
        this.activeEvent$.next(null);
      } else {
        this.activeEvent$.next(event);
      }
    });
  }

  stopPolling() {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
  }

  async triggerEvent(data: any) {
    const event = await this.loveApi.triggerGlobalEvent(data);
    this.activeEvent$.next(event);
    return event;
  }

  async stopEvent() {
    await this.loveApi.stopGlobalEvent();
    this.activeEvent$.next(null);
  }
}
