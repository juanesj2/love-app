import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LoveApiService } from '../../services/love-api.service';
import { TutorialService } from '../../services/tutorial.service';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { gameControllerOutline, swapHorizontalOutline, colorPaletteOutline, arrowBack, apertureOutline } from 'ionicons/icons';

@Component({
  selector: 'app-games-hub',
  template: `
    <div class="games-hub-container">
      <div class="header">
        <button class="back-btn" (click)="goBack()"><ion-icon name="arrow-back"></ion-icon></button>
        <h2>Centro de Juegos</h2>
        <p>Elige a qué queréis jugar hoy</p>
      </div>

      <div class="games-list">
        <div class="game-card test-card" id="tour-game-test" (click)="goTo('questions')">
          <div class="game-icon-bg"><ion-icon name="game-controller-outline"></ion-icon></div>
          <div class="game-info">
            <h3>Test de Pareja</h3>
            <p>Descubre cuánto os conocéis respondiendo a preguntas de todo tipo, desde divertidas hasta muy íntimas.</p>
            <div class="progress-container" *ngIf="progress">
              <div class="progress-bar"><div class="progress-fill" [style.width.%]="progress.questions?.percentage || 0"></div></div>
              <span class="progress-text">{{ progress.questions?.percentage || 0 }}% completado</span>
            </div>
          </div>
        </div>

        <div class="game-card swipe-card" id="tour-game-swipe" (click)="goTo('games/swipe')">
          <div class="game-icon-bg"><ion-icon name="swap-horizontal-outline"></ion-icon></div>
          <div class="game-info">
            <h3>Tinder de Pareja</h3>
            <p>Desliza rápido y descubre vuestra afinidad en diferentes temas, incluyendo los más candentes.</p>
            <div class="progress-container" *ngIf="progress">
              <div class="progress-bar"><div class="progress-fill" [style.width.%]="progress.swipe?.percentage || 0"></div></div>
              <span class="progress-text">{{ progress.swipe?.percentage || 0 }}% completado</span>
            </div>
          </div>
        </div>

        <div class="game-card draw-card" id="tour-game-draw" (click)="goTo('games/draw')">
          <div class="game-icon-bg"><ion-icon name="color-palette-outline"></ion-icon></div>
          <div class="game-info">
            <h3>Reto de Dibujo</h3>
            <p>Sacad vuestro lado creativo (y atrevido) dibujando los retos propuestos al mismo tiempo.</p>
            <div class="progress-container" *ngIf="progress">
              <div class="progress-bar"><div class="progress-fill" [style.width.%]="progress.drawing?.percentage || 0"></div></div>
              <span class="progress-text">{{ progress.drawing?.percentage || 0 }}% completado</span>
            </div>
          </div>
        </div>

        <div class="game-card roulette-card" id="tour-game-roulette" (click)="goTo('games/roulette')">
          <div class="game-icon-bg"><ion-icon name="aperture-outline"></ion-icon></div>
          <div class="game-info">
            <h3>Tarro de Citas</h3>
            <p>Gira la ruleta para decidir el plan del fin de semana. ¡Añade vuestros planes favoritos al tarro!</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .games-hub-container { padding: calc(env(safe-area-inset-top) + 40px) 20px 20px; padding-bottom: 80px; background: #fff0f3; min-height: 100vh; height: 100vh; overflow-y: auto; overflow-x: hidden; position: relative; }
    
    /* Decorative Background Elements */
    .games-hub-container::before { content: ''; position: absolute; top: -100px; right: -100px; width: 300px; height: 300px; background: radial-gradient(circle, rgba(255,189,203,0.6) 0%, rgba(255,189,203,0) 70%); border-radius: 50%; z-index: 0; pointer-events: none; }
    .games-hub-container::after { content: ''; position: absolute; bottom: 100px; left: -100px; width: 250px; height: 250px; background: radial-gradient(circle, rgba(255,143,163,0.3) 0%, rgba(255,143,163,0) 70%); border-radius: 50%; z-index: 0; pointer-events: none; }

    .header { text-align: center; margin-bottom: 35px; position: relative; z-index: 1; padding: 0 45px; }
    .back-btn { position: absolute; left: 0; top: 0; background: white; border: 1px solid rgba(255,77,109,0.2); border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: #590D22; font-size: 1.5rem; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.05); transition: transform 0.2s; }
    .back-btn:active { transform: scale(0.9); }
    .header h2 { color: #590D22; margin: 0 0 8px; font-weight: 900; font-size: 2rem; padding-top: 5px; letter-spacing: -0.5px; }
    .header p { color: #a4133c; margin: 0; font-size: 1rem; font-weight: 500; opacity: 0.8; }

    .games-list { display: flex; flex-direction: column; gap: 20px; position: relative; z-index: 1; }
    
    .game-card { display: flex; align-items: center; gap: 18px; padding: 22px; border-radius: 28px; cursor: pointer; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); box-shadow: 0 12px 35px rgba(255, 77, 109, 0.08); border: 1px solid rgba(255, 255, 255, 0.9); transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); position: relative; overflow: hidden; }
    .game-card:active { transform: scale(0.96) translateY(2px); box-shadow: 0 5px 15px rgba(255, 77, 109, 0.12); }
    .game-card::after { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 100%); pointer-events: none; border-radius: 28px; }

    .game-icon-bg { width: 68px; height: 68px; border-radius: 22px; display: flex; align-items: center; justify-content: center; font-size: 2.4rem; flex-shrink: 0; box-shadow: 0 8px 20px rgba(0,0,0,0.1); position: relative; z-index: 2; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
    .game-card:hover .game-icon-bg { transform: rotate(-5deg) scale(1.05); }
    
    .game-info { flex: 1; position: relative; z-index: 2; }
    .game-info h3 { margin: 0 0 6px; color: #590D22; font-size: 1.25rem; font-weight: 800; letter-spacing: -0.3px; }
    .game-info p { margin: 0; color: #666; font-size: 0.92rem; line-height: 1.4; opacity: 0.9; }

    /* Custom Gradients for Cards */
    .test-card .game-icon-bg { background: linear-gradient(135deg, #FF9A9E, #FECFEF); color: #c9184a; border: 2px solid rgba(255,255,255,0.8); }
    .swipe-card .game-icon-bg { background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; border: 2px solid rgba(255,77,109,0.3); }
    .draw-card .game-icon-bg { background: linear-gradient(135deg, #a2d2ff, #bde0fe); color: #023e8a; border: 2px solid rgba(255,255,255,0.8); }
    .roulette-card .game-icon-bg { background: linear-gradient(135deg, #ffd166, #ff9f1c); color: white; border: 2px solid rgba(255,255,255,0.8); }

    .progress-container { display: flex; align-items: center; gap: 12px; margin-top: 14px; background: rgba(255,255,255,0.6); padding: 6px 12px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.03); }
    .progress-bar { flex: 1; height: 8px; background: rgba(255, 77, 109, 0.1); border-radius: 4px; overflow: hidden; position: relative; }
    .progress-fill { height: 100%; border-radius: 4px; transition: width 1s cubic-bezier(0.25, 0.8, 0.25, 1); box-shadow: inset 0 2px 4px rgba(255,255,255,0.3); }
    .progress-text { font-size: 0.8rem; font-weight: 800; color: #a4133c; white-space: nowrap; }

    .test-card .progress-fill { background: linear-gradient(90deg, #FF9A9E, #ff758c); }
    .swipe-card .progress-fill { background: linear-gradient(90deg, #FF4D6D, #c9184a); }
    .draw-card .progress-fill { background: linear-gradient(90deg, #a2d2ff, #0077b6); }

    :host-context(.night-owl-mode) .games-hub-container { background: #121212; }
    :host-context(.night-owl-mode) .games-hub-container::before { background: radial-gradient(circle, rgba(167,139,250,0.15) 0%, rgba(167,139,250,0) 70%); }
    :host-context(.night-owl-mode) .games-hub-container::after { background: radial-gradient(circle, rgba(124,58,237,0.1) 0%, rgba(124,58,237,0) 70%); }
    :host-context(.night-owl-mode) .header h2 { color: #fdfdfd; }
    :host-context(.night-owl-mode) .header p { color: #ccc; }
    :host-context(.night-owl-mode) .back-btn { background: #222; border-color: #333; color: #fdfdfd; }
    :host-context(.night-owl-mode) .game-card { background: rgba(30, 30, 30, 0.85); border-color: rgba(255, 255, 255, 0.05); }
    :host-context(.night-owl-mode) .game-info h3 { color: #fdfdfd; }
    :host-context(.night-owl-mode) .game-info p { color: #aaa; }
    :host-context(.night-owl-mode) .progress-container { background: rgba(0, 0, 0, 0.4); border-color: rgba(255, 255, 255, 0.05); }
    :host-context(.night-owl-mode) .progress-text { color: #c4b5fd; }
  `],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class GamesHubComponent {
  progress: any = null;
  private api = inject(LoveApiService);
  private tutorialService = inject(TutorialService);

  constructor(private router: Router) {
    addIcons({ gameControllerOutline, swapHorizontalOutline, colorPaletteOutline, arrowBack, apertureOutline });
  }

  async ionViewDidEnter() {
    try {
      this.progress = await this.api.getGamesProgress();
    } catch (e) {
      console.error('Error fetching games progress', e);
    }
    
    setTimeout(() => {
      this.tutorialService.showGamesHubTour();
    }, 500);
  }

  goBack() {
    this.router.navigate(['/']); // or navigate to mas
  }

  goTo(route: string) {
    this.router.navigate([`/${route}`]);
  }
}
