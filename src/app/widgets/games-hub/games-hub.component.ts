import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { gameControllerOutline, swapHorizontalOutline, colorPaletteOutline, arrowBack } from 'ionicons/icons';

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
        <div class="game-card test-card" (click)="goTo('questions')">
          <div class="game-icon-bg"><ion-icon name="game-controller-outline"></ion-icon></div>
          <div class="game-info">
            <h3>Test de Pareja</h3>
            <p>Descubre cuánto os conocéis respondiendo a ciegas a preguntas clásicas.</p>
          </div>
        </div>

        <div class="game-card swipe-card" (click)="goTo('games/swipe')">
          <div class="game-icon-bg"><ion-icon name="swap-horizontal-outline"></ion-icon></div>
          <div class="game-info">
            <h3>Tinder de Pareja</h3>
            <p>Desliza para responder preguntas rápidas y descubre en qué coincidís.</p>
          </div>
        </div>

        <div class="game-card draw-card" (click)="goTo('games/draw')">
          <div class="game-icon-bg"><ion-icon name="color-palette-outline"></ion-icon></div>
          <div class="game-info">
            <h3>Reto de Dibujo</h3>
            <p>Dibujad algo al mismo tiempo y comparad vuestras obras de arte.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .games-hub-container { padding: 20px; background: #fff0f3; min-height: 100vh; }
    .header { text-align: center; margin-bottom: 30px; position: relative; }
    .back-btn { position: absolute; left: 0; top: 0; background: rgba(255, 77, 109, 0.1); border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: #590D22; font-size: 1.5rem; cursor: pointer; }
    .header h2 { color: #590D22; margin: 0 0 5px; font-weight: 800; font-size: 1.8rem; padding-top: 5px; }
    .header p { color: #a4133c; margin: 0; font-size: 0.95rem; }

    .games-list { display: flex; flex-direction: column; gap: 20px; }
    .game-card { display: flex; align-items: center; gap: 15px; padding: 20px; border-radius: 20px; cursor: pointer; box-shadow: 0 4px 15px rgba(255,77,109,0.15); transition: transform 0.2s; background: white; }
    .game-card:active { transform: scale(0.95); }
    .game-icon-bg { width: 60px; height: 60px; border-radius: 15px; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: white; flex-shrink: 0; }
    .game-info h3 { margin: 0 0 5px; color: #590D22; font-size: 1.2rem; font-weight: 800; }
    .game-info p { margin: 0; color: #666; font-size: 0.9rem; line-height: 1.3; }

    .test-card .game-icon-bg { background: linear-gradient(135deg, #FF9A9E, #FECFEF); }
    .swipe-card .game-icon-bg { background: linear-gradient(135deg, #FF4D6D, #c9184a); }
    .draw-card .game-icon-bg { background: linear-gradient(135deg, #a2d2ff, #bde0fe); color: #023e8a; }
  `],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class GamesHubComponent {
  constructor(private router: Router) {
    addIcons({ gameControllerOutline, swapHorizontalOutline, colorPaletteOutline, arrowBack });
  }

  goBack() {
    this.router.navigate(['/']); // or navigate to mas
  }

  goTo(route: string) {
    this.router.navigate([`/${route}`]);
  }
}
