import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoveApiService } from '../../services/love-api.service';
import { IonIcon, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { heartDislikeOutline, heartOutline, arrowBack, statsChartOutline } from 'ionicons/icons';
import { Location } from '@angular/common';

@Component({
  selector: 'app-swipe-game',
  template: `
    <div class="swipe-container">
      <div class="header">
        <button class="back-btn" (click)="goBack()"><ion-icon name="arrow-back"></ion-icon></button>
        <div class="header-titles">
          <h2>Tinder de Pareja</h2>
          <div class="progress-bar-small" *ngIf="progress">
            <div class="progress-fill" [style.width.%]="progress.swipe?.percentage || 0"></div>
          </div>
        </div>
        <button class="stats-btn" *ngIf="viewMode !== 'categories'" (click)="viewMode = viewMode === 'play' ? 'stats' : 'play'; loadStats()">
          <ion-icon [name]="viewMode === 'play' ? 'stats-chart-outline' : 'heart-outline'"></ion-icon>
        </button>
      </div>

      <!-- VISTA DE CATEGORIAS -->
      <ng-container *ngIf="viewMode === 'categories'">
        <div class="categories-area">
          <p class="subtitle">Elige un tema para empezar a deslizar y descubrir vuestra afinidad</p>
          
          <div class="category-grid">
            <div class="cat-card all-card" (click)="selectCategory('')">
              <ion-icon name="infinite-outline"></ion-icon>
              <h3>Todas</h3>
            </div>
            <div class="cat-card" *ngFor="let cat of categories" (click)="selectCategory(cat)">
              <h3>{{ cat }}</h3>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="viewMode === 'play'">
        <div class="cards-area" *ngIf="cards.length > 0; else noCards">
          <!-- Stack of cards -->
          <div class="card" 
               *ngFor="let card of cards; let i = index"
               [class.active]="i === 0"
               [style.zIndex]="cards.length - i"
               [style.transform]="getTransform(i)"
               (touchstart)="onTouchStart($event, i)"
               (touchmove)="onTouchMove($event, i)"
               (touchend)="onTouchEnd($event, i)"
               (mousedown)="onTouchStart($event, i)"
               (mousemove)="onTouchMove($event, i)"
               (mouseup)="onTouchEnd($event, i)"
               (mouseleave)="onTouchEnd($event, i)">
            
            <div class="card-content">
              <h3>{{ card.question_text }}</h3>
            </div>
            
            <div class="stamp nope" [style.opacity]="getNopeOpacity(i)">NO</div>
            <div class="stamp like" [style.opacity]="getLikeOpacity(i)">SÍ</div>
          </div>
        </div>

        <div class="actions" *ngIf="cards.length > 0">
          <button class="action-btn nope-btn" (click)="answerTopCard(false)"><ion-icon name="heart-dislike-outline"></ion-icon></button>
          <button class="action-btn like-btn" (click)="answerTopCard(true)"><ion-icon name="heart-outline"></ion-icon></button>
        </div>
      </ng-container>

      <ng-template #noCards>
        <div class="empty-state" *ngIf="viewMode === 'play'">
          <h3>¡No hay más cartas!</h3>
          <p>Habéis respondido a todas las preguntas candentes de este tema. Vuelve más tarde o elige otro.</p>
          <button class="primary-btn" (click)="viewMode = 'stats'; loadStats()">Ver Estadísticas</button>
        </div>
      </ng-template>

      <!-- VISTA DE ESTADISTICAS -->
      <ng-container *ngIf="viewMode === 'stats'">
        <div class="stats-area" *ngIf="stats">
          <h3 class="stats-title" *ngIf="selectedCategory">Tema: {{ selectedCategory }}</h3>
          <div class="percentage-circle">
            <div class="value">{{ stats.percentage }}%</div>
            <div class="label">Afinidad</div>
          </div>
          <p class="subtitle">Habéis respondido {{ stats.total_common }} preguntas en común.</p>

          <div class="results-list">
            <h4>Coincidencias ({{ stats.matches.length }})</h4>
            <div class="result-item match" *ngFor="let m of stats.matches">
              <span class="q-text">{{ m.question }}</span>
              <span class="badge">{{ m.my_answer ? 'SÍ' : 'NO' }}</span>
            </div>
            <p *ngIf="stats.matches.length === 0" class="no-data">Aún no habéis coincidido en nada.</p>

            <h4 class="mt-20">Desacuerdos ({{ stats.mismatches.length }})</h4>
            <div class="result-item mismatch" *ngFor="let m of stats.mismatches">
              <span class="q-text">{{ m.question }}</span>
              <div class="answers-badge">
                <span class="me">Tú: {{ m.my_answer ? 'SÍ' : 'NO' }}</span>
                <span class="partner">Pareja: {{ m.partner_answer ? 'SÍ' : 'NO' }}</span>
              </div>
            </div>
            <p *ngIf="stats.mismatches.length === 0" class="no-data">¡Estáis de acuerdo en todo!</p>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
    .swipe-container { padding: 20px; background: #fff0f3; min-height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .back-btn, .stats-btn { background: rgba(255, 77, 109, 0.1); border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: #590D22; font-size: 1.5rem; cursor: pointer; flex-shrink: 0; }
    .header-titles { flex: 1; text-align: center; display: flex; flex-direction: column; align-items: center; }
    .header-titles h2 { color: #590D22; margin: 0 0 5px; font-weight: 800; font-size: 1.5rem; }
    .progress-bar-small { width: 100px; height: 6px; background: rgba(0,0,0,0.05); border-radius: 3px; overflow: hidden; }
    .progress-bar-small .progress-fill { height: 100%; background: #FF4D6D; border-radius: 3px; transition: width 0.5s ease-out; }

    /* VISTA CATEGORIAS */
    .categories-area { text-align: center; }
    .category-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px; }
    .cat-card { background: white; border-radius: 15px; padding: 20px; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.05); cursor: pointer; transition: transform 0.2s; }
    .cat-card:active { transform: scale(0.95); }
    .cat-card h3 { margin: 0; color: #590D22; font-weight: bold; font-size: 1.1rem; }
    .all-card { grid-column: span 2; background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; }
    .all-card h3 { color: white; margin-top: 5px; }
    .all-card ion-icon { font-size: 2rem; }

    /* JUEGO */
    .cards-area { flex: 1; position: relative; display: flex; justify-content: center; align-items: center; min-height: 50vh; }
    .card { position: absolute; width: 90%; max-width: 350px; aspect-ratio: 3/4; max-height: 60vh; background: white; border-radius: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; padding: 30px; text-align: center; transition: transform 0.3s ease-out; touch-action: none; user-select: none; }
    .card.active { transition: none; }
    .card-content h3 { font-size: 1.6rem; color: #590D22; line-height: 1.4; font-weight: 800; margin: 0; }

    .stamp { position: absolute; top: 30px; font-size: 2.5rem; font-weight: 900; padding: 5px 15px; border-radius: 10px; border: 4px solid; opacity: 0; pointer-events: none; }
    .stamp.nope { right: 20px; color: #e63946; border-color: #e63946; transform: rotate(15deg); }
    .stamp.like { left: 20px; color: #2a9d8f; border-color: #2a9d8f; transform: rotate(-15deg); }

    .actions { display: flex; justify-content: center; gap: 40px; padding: 20px 0 40px; z-index: 10; }
    .action-btn { width: 70px; height: 70px; border-radius: 50%; border: none; font-size: 2.5rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 5px 15px rgba(0,0,0,0.1); transition: transform 0.2s; background: white; z-index: 10; }
    .action-btn:active { transform: scale(0.9); }
    .nope-btn { color: #e63946; }
    .like-btn { color: #2a9d8f; }

    .empty-state { text-align: center; margin-top: 50px; }
    .empty-state h3 { color: #590D22; font-size: 1.5rem; }
    .empty-state p { color: #a4133c; margin-bottom: 20px; }
    .primary-btn { background: #FF4D6D; color: white; border: none; padding: 12px 25px; border-radius: 25px; font-weight: bold; font-size: 1.1rem; }

    /* STATS VIEW */
    .stats-area { flex: 1; overflow-y: auto; text-align: center; padding-bottom: 50px; }
    .stats-title { color: #590D22; font-size: 1.2rem; margin-bottom: 20px; font-weight: bold; }
    .percentage-circle { width: 150px; height: 150px; border-radius: 50%; background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 auto 15px; box-shadow: 0 10px 20px rgba(255,77,109,0.3); }
    .percentage-circle .value { font-size: 3rem; font-weight: 900; line-height: 1; }
    .percentage-circle .label { font-size: 1rem; font-weight: 600; opacity: 0.9; }
    .subtitle { color: #a4133c; font-weight: bold; margin-bottom: 30px; }

    .results-list { text-align: left; }
    .results-list h4 { color: #590D22; font-size: 1.2rem; border-bottom: 2px solid #ffb3c1; padding-bottom: 5px; margin-bottom: 15px; }
    .mt-20 { margin-top: 30px; }
    .result-item { background: white; padding: 15px; border-radius: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; gap: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
    .result-item.match { border-left: 5px solid #2a9d8f; }
    .result-item.mismatch { border-left: 5px solid #e63946; }
    .q-text { font-weight: bold; color: #590D22; flex: 1; font-size: 0.95rem; }
    .badge { background: #2a9d8f; color: white; padding: 5px 10px; border-radius: 10px; font-size: 0.8rem; font-weight: bold; }
    .answers-badge { display: flex; flex-direction: column; gap: 5px; font-size: 0.8rem; font-weight: bold; }
    .answers-badge .me { color: #590D22; }
    .answers-badge .partner { color: #FF4D6D; }
    .no-data { color: #888; font-style: italic; }
  `],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class SwipeGameComponent implements OnInit {
  viewMode: 'categories' | 'play' | 'stats' = 'categories';
  categories: string[] = [];
  selectedCategory: string = '';
  cards: any[] = [];
  stats: any = null;
  progress: any = null;

  private api = inject(LoveApiService);
  private toastCtrl = inject(ToastController);
  private location = inject(Location);

  // Touch logic
  private startX = 0;
  private currentX = 0;
  private isDragging = false;
  private cardWidth = window.innerWidth * 0.9;

  constructor() {
    addIcons({ heartDislikeOutline, heartOutline, arrowBack, statsChartOutline, 'infinite-outline': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><path d="M256 256s-48-96-126-96c-54.12 0-98 43-98 96s43.88 96 98 96c37.51 0 71-22.41 94-48M256 256s48 96 126 96c54.12 0 98-43 98-96s-43.88-96-98-96c-37.51 0-71 22.41-94 48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="48"/></svg>' });
  }

  async ngOnInit() {
    this.loadCategories();
    try {
      this.progress = await this.api.getGamesProgress();
    } catch (e) {
      console.error('Error fetching progress', e);
    }
  }

  goBack() {
    if (this.viewMode === 'play' || this.viewMode === 'stats') {
      this.viewMode = 'categories';
      this.selectedCategory = '';
    } else {
      this.location.back();
    }
  }

  async loadCategories() {
    try {
      this.categories = await this.api.getSwipeCategories();
    } catch (e) {
      console.error(e);
    }
  }

  async selectCategory(cat: string) {
    this.selectedCategory = cat;
    this.viewMode = 'play';
    this.cards = [];
    try {
      this.cards = await this.api.getSwipeCards(cat);
    } catch (e) {
      console.error(e);
    }
  }

  async loadStats() {
    if (this.viewMode !== 'stats') return;
    try {
      this.stats = await this.api.getSwipeStats(this.selectedCategory);
    } catch (e) {
      console.error(e);
    }
  }

  getTransform(index: number) {
    if (index !== 0) {
      const scale = 1 - (index * 0.05);
      const y = index * 10;
      return `translateY(${y}px) scale(${scale})`;
    }
    if (!this.isDragging) return 'translateX(0px) rotate(0deg)';
    
    const rotate = this.currentX * 0.05;
    return `translateX(${this.currentX}px) rotate(${rotate}deg)`;
  }

  getLikeOpacity(index: number) {
    if (index !== 0 || !this.isDragging || this.currentX < 0) return 0;
    return Math.min(this.currentX / 100, 1);
  }

  getNopeOpacity(index: number) {
    if (index !== 0 || !this.isDragging || this.currentX > 0) return 0;
    return Math.min(Math.abs(this.currentX) / 100, 1);
  }

  onTouchStart(e: TouchEvent | MouseEvent, index: number) {
    if (index !== 0) return;
    this.startX = ('touches' in e) ? e.touches[0].clientX : e.clientX;
    this.isDragging = true;
  }

  onTouchMove(e: TouchEvent | MouseEvent, index: number) {
    if (index !== 0 || !this.isDragging) return;
    const clientX = ('touches' in e) ? e.touches[0].clientX : e.clientX;
    this.currentX = clientX - this.startX;
  }

  onTouchEnd(e: TouchEvent | MouseEvent, index: number) {
    if (index !== 0 || !this.isDragging) return;
    this.isDragging = false;

    if (this.currentX > 100) {
      this.answerTopCard(true);
    } else if (this.currentX < -100) {
      this.answerTopCard(false);
    }
    this.currentX = 0;
  }

  async answerTopCard(answer: boolean) {
    if (this.cards.length === 0) return;
    const card = this.cards[0];
    
    // Animación visual (se quita de la lista)
    this.cards.shift();

    try {
      await this.api.answerSwipe(card.id, answer);
    } catch (e) {
      console.error(e);
      // Revert if failed
      this.cards.unshift(card);
      const toast = await this.toastCtrl.create({
        message: 'Error de red',
        duration: 2000,
        color: 'danger'
      });
      toast.present();
    }
  }
}
