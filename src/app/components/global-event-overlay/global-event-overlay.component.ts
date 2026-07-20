import { Component, OnInit, OnDestroy, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GlobalEventService, GlobalEvent } from '../../services/global-event.service';
import { Subscription } from 'rxjs';
import { animate, style, transition, trigger } from '@angular/animations';
import confetti from 'canvas-confetti';
import { IonIcon, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeCircleOutline, starOutline } from 'ionicons/icons';

@Component({
  selector: 'app-global-event-overlay',
  standalone: true,
  imports: [CommonModule, IonIcon, IonButton],
  templateUrl: './global-event-overlay.component.html',
  styleUrls: ['./global-event-overlay.component.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9) translateY(20px)' }),
        animate('400ms cubic-bezier(0.175, 0.885, 0.32, 1.275)', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'scale(0.9) translateY(20px)' }))
      ])
    ])
  ]
})
export class GlobalEventOverlayComponent implements OnInit, OnDestroy {
  public globalEventService = inject(GlobalEventService);
  private ngZone = inject(NgZone);
  public event: GlobalEvent | null = null;
  private sub?: Subscription;
  public isDismissed = false;
  
  public emojisToAnimate: { id: number, emoji: string, left: number, duration: number, delay: number }[] = [];

  get formattedMessage() {
    if (!this.event || typeof this.event.message !== 'string') return '';
    return this.event.message.replace(/\n/g, '<br>');
  }

  constructor() {
    addIcons({ closeCircleOutline, starOutline });
  }

  ngOnInit() {
    this.sub = this.globalEventService.activeEvent$.subscribe(evt => {
      console.log('GlobalEvent Received:', evt);
      if (evt && evt.id && (!this.event || this.event.id !== evt.id)) {
        this.event = evt;
        this.isDismissed = (localStorage.getItem('dismissed_global_event_' + evt.id) === 'true');
        
        // Launch effects
        if (evt.confetti_enabled && !this.isDismissed) {
          this.launchConfetti(evt.confetti_colors);
        }

        // Handle top bar color
        if (evt.top_bar_color) {
          document.body.style.setProperty('--custom-header-bg', evt.top_bar_color);
          document.body.style.setProperty('--ion-color-primary', evt.top_bar_color);
          document.body.style.setProperty('--ion-background-color', evt.top_bar_color);
        } else {
          document.body.style.removeProperty('--custom-header-bg');
          document.body.style.removeProperty('--ion-color-primary');
          document.body.style.removeProperty('--ion-background-color');
        }

      } else if (!evt || !evt.id) {
        this.event = null;
        document.body.style.removeProperty('--custom-header-bg');
        document.body.style.removeProperty('--ion-color-primary');
        document.body.style.removeProperty('--ion-background-color');
      }
    });
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
    document.body.style.removeProperty('--custom-header-bg');
    document.body.style.removeProperty('--ion-color-primary');
    document.body.style.removeProperty('--ion-background-color');
  }

  dismiss() {
    this.isDismissed = true;
    if (this.event && this.event.id) {
      localStorage.setItem('dismissed_global_event_' + this.event.id, 'true');
    }
  }

  launchConfetti(colors: string[]) {
    this.ngZone.runOutsideAngular(() => {
      const duration = 5000;
      const end = Date.now() + duration;

      const interval = setInterval(() => {
        if (Date.now() > end || this.isDismissed) {
          return clearInterval(interval);
        }

        confetti({
          particleCount: 15,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors && colors.length ? colors : undefined
        });
        
        confetti({
          particleCount: 15,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors && colors.length ? colors : undefined
        });
      }, 250);
    });
  }
}
