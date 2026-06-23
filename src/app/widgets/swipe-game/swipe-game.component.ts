import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoveApiService } from '../../services/love-api.service';
import { TutorialService } from '../../services/tutorial.service';
import { IonIcon, ToastController, IonContent, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { heartDislikeOutline, heartOutline, arrowBack, statsChartOutline, playCircleOutline, alertCircleOutline, checkmarkCircleOutline, searchOutline, lockClosedOutline } from 'ionicons/icons';
import { Location } from '@angular/common';

@Component({
  selector: 'app-swipe-game',
  template: `
    <ion-content class="scroll-content">
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <div class="swipe-container">
        <div class="header">
        <button class="back-btn" (click)="goBack()"><ion-icon name="arrow-back"></ion-icon></button>
        <div class="header-titles">
          <h2>Tinder de Pareja</h2>
          <div class="progress-bar-small" *ngIf="progress">
            <div class="progress-fill" [style.width.%]="progress.swipe?.percentage || 0"></div>
          </div>
        </div>
        <button class="stats-btn" id="tour-swipe-stats" *ngIf="viewMode !== 'categories'" (click)="subViewMode = subViewMode === 'completed' ? 'pending' : 'completed'">
          <ion-icon [name]="subViewMode === 'completed' ? 'play-circle-outline' : 'stats-chart-outline'"></ion-icon>
        </button>
      </div>

      <!-- VISTA DE CATEGORIAS -->
      <ng-container *ngIf="viewMode === 'categories'">
        <div class="categories-area">
          <p class="subtitle">Elige un tema para empezar a deslizar y descubrir vuestra afinidad</p>
          
          <div class="category-grid" id="tour-swipe-categories">
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

      <!-- VISTA DE JUEGO (TABS) -->
      <ng-container *ngIf="viewMode === 'play'">
        
        <div class="custom-toggle-container">
          <div class="toggle-pill" [class.active]="subViewMode === 'pending'" (click)="setPendingMode()">
            <ion-icon name="play-circle-outline"></ion-icon> Jugar
          </div>
          <div class="toggle-pill" [class.active]="subViewMode === 'waiting_you'" (click)="subViewMode = 'waiting_you'">
            <ion-icon name="alert-circle-outline"></ion-icon> Te toca <span class="badge-count" *ngIf="waitingYouCards.length > 0">{{ waitingYouCards.length }}</span>
          </div>
          <div class="toggle-pill" [class.active]="subViewMode === 'completed'" (click)="subViewMode = 'completed'">
            <ion-icon name="checkmark-circle-outline"></ion-icon> Ya hechas
          </div>
        </div>

        <div class="search-bar" *ngIf="subViewMode !== 'pending'">
          <ion-icon name="search-outline"></ion-icon>
          <input type="text" placeholder="Buscar preguntas..." [(ngModel)]="searchTerm">
        </div>

        <!-- JUGAR (STACK) -->
        <ng-container *ngIf="subViewMode === 'pending'">
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
                <div class="q-category" style="margin-bottom: 10px;">{{ card.category }}</div>
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

        <!-- TE TOCA (LISTA) -->
        <ng-container *ngIf="subViewMode === 'waiting_you'">
          <div class="q-list">
            <div class="q-card touchable" *ngFor="let q of filteredWaitingYou" (click)="playSpecificCard(q)">
              <div class="q-category attention">¡Tu pareja está esperando!</div>
              <h3 class="q-text">{{ q.question_text }}</h3>
              <p class="q-hint">Toca para responder</p>
            </div>
            <div *ngIf="filteredWaitingYou.length === 0" class="empty-state-list">
              {{ searchTerm ? 'No hay resultados.' : 'Nadie te está esperando por ahora 😊' }}
            </div>
          </div>
        </ng-container>

        <!-- COMPLETADAS / STATS -->
        <ng-container *ngIf="subViewMode === 'completed'">
          <div class="stats-area">
            
            <div class="percentage-circle" *ngIf="!searchTerm && totalCommon > 0">
              <div class="value">{{ affinityPercentage }}%</div>
              <div class="label">Afinidad</div>
            </div>

            <div class="results-list">
              <div *ngIf="filteredMatches.length > 0">
                <h4>Coincidencias ({{ filteredMatches.length }})</h4>
                <div class="result-item match" *ngFor="let m of filteredMatches">
                  <span class="q-text">{{ m.question_text }}</span>
                  <span class="badge">{{ m.my_answer ? 'SÍ' : 'NO' }}</span>
                </div>
              </div>

              <div *ngIf="filteredMismatches.length > 0" class="mt-20">
                <h4>Desacuerdos ({{ filteredMismatches.length }})</h4>
                <div class="result-item mismatch" *ngFor="let m of filteredMismatches">
                  <span class="q-text">{{ m.question_text }}</span>
                  <div class="answers-badge">
                    <span class="me">Tú: {{ m.my_answer ? 'SÍ' : 'NO' }}</span>
                    <span class="partner">Pareja: {{ m.partner_answer ? 'SÍ' : 'NO' }}</span>
                  </div>
                </div>
              </div>

              <div *ngIf="filteredWaitingPartner.length > 0" class="mt-20">
                <h4>Esperando a tu pareja ({{ filteredWaitingPartner.length }})</h4>
                <div class="result-item waiting" *ngFor="let w of filteredWaitingPartner">
                  <span class="q-text">{{ w.question_text }}</span>
                  <div class="answers-badge">
                    <span class="me">Tú: {{ w.my_answer ? 'SÍ' : 'NO' }}</span>
                    <span class="partner-waiting"><ion-icon name="lock-closed-outline"></ion-icon> Oculto</span>
                  </div>
                </div>
              </div>

              <p *ngIf="filteredMatches.length === 0 && filteredMismatches.length === 0 && filteredWaitingPartner.length === 0" class="no-data">
                {{ searchTerm ? 'No se encontraron resultados.' : 'Aún no hay respuestas en esta categoría.' }}
              </p>
            </div>
          </div>
        </ng-container>

      </ng-container>

      <ng-template #noCards>
        <div class="empty-state" *ngIf="subViewMode === 'pending'">
          <h3>¡No hay más cartas aleatorias!</h3>
          <p>Habéis deslizado todas las preguntas posibles aquí. Revisa "Te toca" o las estadísticas.</p>
          <button class="primary-btn" (click)="subViewMode = 'completed'">Ver Afinidad</button>
        </div>
      </ng-template>

      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      display: block;
    }
    .scroll-content { --background: transparent; }
    .swipe-container { padding: calc(env(safe-area-inset-top) + 40px) 20px 20px; background: #fff0f3; min-height: 100%; display: flex; flex-direction: column; padding-bottom: 50px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .back-btn, .stats-btn { background: rgba(255, 77, 109, 0.1); border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: #590D22; font-size: 1.5rem; cursor: pointer; flex-shrink: 0; }
    .header-titles { flex: 1; text-align: center; display: flex; flex-direction: column; align-items: center; }
    .header-titles h2 { color: #590D22; margin: 0 0 5px; font-weight: 800; font-size: 1.5rem; }
    .progress-bar-small { width: 100px; height: 6px; background: rgba(0,0,0,0.05); border-radius: 3px; overflow: hidden; }
    .progress-bar-small .progress-fill { height: 100%; background: #FF4D6D; border-radius: 3px; transition: width 0.5s ease-out; }

    /* CATEGORIAS */
    .categories-area { text-align: center; }
    .subtitle { color: #a4133c; font-weight: bold; margin-bottom: 15px; }
    .category-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px; }
    .cat-card { background: white; border-radius: 15px; padding: 20px; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.05); cursor: pointer; transition: transform 0.2s; }
    .cat-card:active { transform: scale(0.95); }
    .cat-card h3 { margin: 0; color: #590D22; font-weight: bold; font-size: 1.1rem; }
    .all-card { grid-column: span 2; background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; }
    .all-card h3 { color: white; margin-top: 5px; }
    .all-card ion-icon { font-size: 2rem; }

    /* TOGGLE TABS */
    .custom-toggle-container { display: flex; background: rgba(255,255,255,0.6); padding: 5px; border-radius: 30px; margin: 0 0 15px 0; box-shadow: inset 0 2px 5px rgba(0,0,0,0.05); }
    .toggle-pill { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 10px 0; border-radius: 25px; font-weight: 700; color: #888; transition: all 0.3s; cursor: pointer; font-size: 0.9rem; position: relative; }
    .toggle-pill.active { background: white; color: #FF4D6D; box-shadow: 0 4px 10px rgba(255,77,109,0.15); transform: scale(1.02); }
    .badge-count { position: absolute; top: -5px; right: 5px; background: #e63946; color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 10px; }

    .search-bar { display: flex; align-items: center; background: white; padding: 0 15px; border-radius: 20px; margin-bottom: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
    .search-bar ion-icon { color: #888; font-size: 1.2rem; }
    .search-bar input { border: none; padding: 12px 10px; width: 100%; font-size: 1rem; outline: none; background: transparent; color: #590D22; }

    /* JUEGO STACK */
    .cards-area { flex: 1; position: relative; display: flex; justify-content: center; align-items: center; min-height: 50vh; }
    .card { position: absolute; width: 90%; max-width: 350px; aspect-ratio: 3/4; max-height: 55vh; background: white; border-radius: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; padding: 30px; text-align: center; transition: transform 0.3s ease-out; touch-action: none; user-select: none; }
    .card.active { transition: none; }
    .card-content h3 { font-size: 1.6rem; color: #590D22; line-height: 1.4; font-weight: 800; margin: 0; }
    .q-category { display: inline-block; background: #ffb3c1; color: #590D22; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }
    
    .stamp { position: absolute; top: 30px; font-size: 2.5rem; font-weight: 900; padding: 5px 15px; border-radius: 10px; border: 4px solid; opacity: 0; pointer-events: none; }
    .stamp.nope { right: 20px; color: #e63946; border-color: #e63946; transform: rotate(15deg); }
    .stamp.like { left: 20px; color: #2a9d8f; border-color: #2a9d8f; transform: rotate(-15deg); }

    .actions { display: flex; justify-content: center; gap: 40px; padding: 10px 0 30px; z-index: 10; }
    .action-btn { width: 70px; height: 70px; border-radius: 50%; border: none; font-size: 2.5rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 5px 15px rgba(0,0,0,0.1); transition: transform 0.2s; background: white; z-index: 10; }
    .action-btn:active { transform: scale(0.9); }
    .nope-btn { color: #e63946; }
    .like-btn { color: #2a9d8f; }

    /* LISTA TE TOCA */
    .q-list { display: flex; flex-direction: column; gap: 12px; flex: 1; padding-bottom: 20px; }
    .q-card { background: white; border-radius: 15px; padding: 15px; box-shadow: 0 4px 10px rgba(255,77,109,0.1); }
    .q-card.touchable { cursor: pointer; transition: transform 0.2s; }
    .q-card.touchable:active { transform: scale(0.98); }
    .q-category.attention { background: #FF4D6D; color: white; animation: bounce 1s infinite alternate; }
    @keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-3px); } }
    .q-text { color: #590D22; font-size: 1.05rem; margin: 0 0 5px; font-weight: 700; line-height: 1.3; }
    .q-hint { color: #888; font-size: 0.8rem; margin: 0; font-style: italic; }
    .empty-state-list { text-align: center; color: #a4133c; padding: 30px; font-weight: bold; opacity: 0.8; }

    .empty-state { text-align: center; margin-top: 50px; }
    .empty-state h3 { color: #590D22; font-size: 1.5rem; }
    .empty-state p { color: #a4133c; margin-bottom: 20px; }
    .primary-btn { background: #FF4D6D; color: white; border: none; padding: 12px 25px; border-radius: 25px; font-weight: bold; font-size: 1.1rem; }

    /* STATS VIEW */
    .stats-area { flex: 1; text-align: center; padding-bottom: 50px; }
    .percentage-circle { width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 auto 20px; box-shadow: 0 10px 20px rgba(255,77,109,0.3); }
    .percentage-circle .value { font-size: 2.5rem; font-weight: 900; line-height: 1; }
    .percentage-circle .label { font-size: 0.9rem; font-weight: 600; opacity: 0.9; }

    .results-list { text-align: left; }
    .results-list h4 { color: #590D22; font-size: 1.1rem; border-bottom: 2px solid #ffb3c1; padding-bottom: 5px; margin-bottom: 15px; }
    .mt-20 { margin-top: 25px; }
    .result-item { background: white; padding: 15px; border-radius: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; gap: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
    .result-item.match { border-left: 5px solid #2a9d8f; }
    .result-item.mismatch { border-left: 5px solid #e63946; }
    .result-item.waiting { border-left: 5px solid #888; background: #f8f9fa; }
    .badge { background: #2a9d8f; color: white; padding: 5px 10px; border-radius: 10px; font-size: 0.8rem; font-weight: bold; }
    .answers-badge { display: flex; flex-direction: column; gap: 5px; font-size: 0.8rem; font-weight: bold; text-align: right; }
    .answers-badge .me { color: #590D22; }
    .answers-badge .partner { color: #FF4D6D; }
    .partner-waiting { color: #888; display: flex; align-items: center; gap: 3px; justify-content: flex-end; }
    .no-data { text-align: center; color: #888; font-style: italic; padding: 20px; }

    :host-context(body.night-owl-mode) .swipe-container { background: #121212; }
    :host-context(body.night-owl-mode) .header-titles h2 { color: #fdfdfd; }
    :host-context(body.night-owl-mode) .back-btn, :host-context(body.night-owl-mode) .stats-btn { background: #222; color: #fdfdfd; }
    :host-context(body.night-owl-mode) .progress-bar-small { background: rgba(255,255,255,0.1); }
    :host-context(body.night-owl-mode) .subtitle { color: #ccc; }
    :host-context(body.night-owl-mode) .cat-card { background: rgba(30, 30, 30, 0.85); box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
    :host-context(body.night-owl-mode) .cat-card h3 { color: #fdfdfd; }
    :host-context(body.night-owl-mode) .custom-toggle-container { background: rgba(30, 30, 30, 0.8); box-shadow: none; }
    :host-context(body.night-owl-mode) .toggle-pill { color: #999; }
    :host-context(body.night-owl-mode) .toggle-pill.active { background: #222; color: #a78bfa; }
    :host-context(body.night-owl-mode) .search-bar { background: #222; box-shadow: 0 2px 10px rgba(0,0,0,0.5); }
    :host-context(body.night-owl-mode) .search-bar input { color: #fdfdfd; }
    :host-context(body.night-owl-mode) .card { background: #1a1a1a; box-shadow: 0 10px 20px rgba(0,0,0,0.5); }
    :host-context(body.night-owl-mode) .card-content h3 { color: #fdfdfd; }
    :host-context(body.night-owl-mode) .action-btn { background: #222; box-shadow: 0 5px 15px rgba(0,0,0,0.5); }
    :host-context(body.night-owl-mode) .q-card { background: rgba(30,30,30, 0.85); box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
    :host-context(body.night-owl-mode) .q-text { color: #fdfdfd; }
    :host-context(body.night-owl-mode) .q-hint { color: #aaa; }
    :host-context(body.night-owl-mode) .empty-state h3 { color: #fdfdfd; }
    :host-context(body.night-owl-mode) .empty-state-list { color: #c4b5fd; }
    :host-context(body.night-owl-mode) .results-list h4 { color: #fdfdfd; border-bottom-color: rgba(196,181,253,0.2); }
    :host-context(body.night-owl-mode) .result-item { background: #1a1a1a; box-shadow: 0 2px 5px rgba(0,0,0,0.5); }
    :host-context(body.night-owl-mode) .result-item.waiting { background: #222; border-left-color: #555; }
    :host-context(body.night-owl-mode) .answers-badge .me { color: #fdfdfd; }
    :host-context(body.night-owl-mode) .percentage-circle { box-shadow: 0 10px 20px rgba(0,0,0,0.5); }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, IonContent, IonRefresher, IonRefresherContent]
})
export class SwipeGameComponent implements OnInit {
  viewMode: 'categories' | 'play' = 'categories';
  subViewMode: 'pending' | 'waiting_you' | 'completed' = 'pending';
  
  categories: string[] = [];
  selectedCategory: string = '';
  
  allCards: any[] = [];
  cards: any[] = []; // Stack for 'pending'
  
  searchTerm: string = '';
  progress: any = null;

  private api = inject(LoveApiService);
  private toastCtrl = inject(ToastController);
  private location = inject(Location);
  private tutorialService = inject(TutorialService);

  // Touch logic
  private startX = 0;
  private currentX = 0;
  private isDragging = false;

  constructor() {
    addIcons({ heartDislikeOutline, heartOutline, arrowBack, statsChartOutline, playCircleOutline, alertCircleOutline, checkmarkCircleOutline, searchOutline, lockClosedOutline, 'infinite-outline': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><path d="M256 256s-48-96-126-96c-54.12 0-98 43-98 96s43.88 96 98 96c37.51 0 71-22.41 94-48M256 256s48 96 126 96c54.12 0 98-43 98-96s-43.88-96-98-96c-37.51 0-71 22.41-94 48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="48"/></svg>' });
  }

  ngOnInit() {}

  async ionViewDidEnter() {
    this.loadCategories();
    this.loadProgress();
    setTimeout(() => {
      this.tutorialService.showSwipeTour();
    }, 500);
  }

  async loadProgress() {
    try {
      this.progress = await this.api.getGamesProgress();
    } catch (e) {
      console.error(e);
    }
  }

  async loadStats() {
    await this.loadProgress();
    await this.loadCategories();
  }

  async handleRefresh(event: any) {
    if (this.viewMode === 'categories') {
      await this.loadStats();
    } else {
      await this.loadAllCards();
    }
    event.target.complete();
  }

  goBack() {
    if (this.viewMode === 'play') {
      this.viewMode = 'categories';
      this.selectedCategory = '';
      this.searchTerm = '';
    } else {
      this.location.back();
    }
  }

  async loadCategories() {
    try {
      const response: any = await this.api.getSwipeCategories();
      let cats: string[] = [];
      
      if (Array.isArray(response)) {
        cats = response;
      } else if (response && Array.isArray(response.data)) {
        cats = response.data;
      } else if (response && typeof response === 'object') {
        cats = Object.values(response).find(val => Array.isArray(val)) as any[] || [];
      }
      this.categories = cats;
    } catch (e) {
      console.error(e);
      this.categories = [];
    }
  }

  async selectCategory(cat: string) {
    this.selectedCategory = cat;
    this.viewMode = 'play';
    this.subViewMode = 'pending';
    this.searchTerm = '';
    await this.loadAllCards();
  }

  async loadAllCards() {
    try {
      const response: any = await this.api.getAllSwipeCards();
      let all: any[] = [];
      
      if (Array.isArray(response)) {
        all = response;
      } else if (response && Array.isArray(response.data)) {
        all = response.data;
      } else if (response && Array.isArray(response.cards)) {
        all = response.cards;
      } else if (response && typeof response === 'object') {
        // Fallback for unknown object wrappers
        all = Object.values(response).find(val => Array.isArray(val)) as any[] || [];
      }

      this.allCards = this.selectedCategory ? all.filter(c => c.category === this.selectedCategory) : all;
      this.prepareStack();
    } catch (e) {
      console.error(e);
      this.allCards = [];
    }
  }

  isPlayingSpecific = false;

  setPendingMode() {
    this.subViewMode = 'pending';
    this.isPlayingSpecific = false;
    if (this.cards.length === 0 || this.cards[0]?.status !== 'unanswered') {
      this.prepareStack();
    }
  }

  prepareStack() {
    const available = this.allCards.filter(c => c.status === 'unanswered');
    this.cards = available.sort(() => 0.5 - Math.random()).slice(0, 10);
  }

  playSpecificCard(card: any) {
    this.cards = [card];
    this.isPlayingSpecific = true;
    this.subViewMode = 'pending';
  }

  // --- GETTERS PARA LAS LISTAS ---
  get waitingYouCards() {
    return this.allCards.filter(c => c.status === 'waiting_you');
  }

  get filteredWaitingYou() {
    let list = this.waitingYouCards;
    if (this.searchTerm) {
      list = list.filter(c => c.question_text.toLowerCase().includes(this.searchTerm.toLowerCase()));
    }
    return list;
  }

  get filteredWaitingPartner() {
    let list = this.allCards.filter(c => c.status === 'waiting_partner');
    if (this.searchTerm) {
      list = list.filter(c => c.question_text.toLowerCase().includes(this.searchTerm.toLowerCase()));
    }
    return list;
  }

  get filteredMatches() {
    let list = this.allCards.filter(c => c.status === 'answered' && c.my_answer === c.partner_answer);
    if (this.searchTerm) {
      list = list.filter(c => c.question_text.toLowerCase().includes(this.searchTerm.toLowerCase()));
    }
    return list;
  }

  get filteredMismatches() {
    let list = this.allCards.filter(c => c.status === 'answered' && c.my_answer !== c.partner_answer);
    if (this.searchTerm) {
      list = list.filter(c => c.question_text.toLowerCase().includes(this.searchTerm.toLowerCase()));
    }
    return list;
  }

  get totalCommon() {
    return this.allCards.filter(c => c.status === 'answered').length;
  }

  get affinityPercentage() {
    const total = this.totalCommon;
    if (total === 0) return 0;
    const matches = this.allCards.filter(c => c.status === 'answered' && c.my_answer === c.partner_answer).length;
    return Math.round((matches / total) * 100);
  }

  // --- LOGICA DEL SWIPE ---

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
    
    // Animación visual (se quita de la lista visual)
    this.cards.shift();

    try {
      await this.api.answerSwipe(card.id, answer);
      this.loadProgress(); // Actualizar barrita
      
      // Actualizamos su estado localmente para no hacer petición HTTP de nuevo de golpe
      const idx = this.allCards.findIndex(c => c.id === card.id);
      if (idx !== -1) {
        if (this.allCards[idx].status === 'waiting_you') {
          this.allCards[idx].status = 'answered';
          this.allCards[idx].my_answer = answer;
        } else {
          this.allCards[idx].status = 'waiting_partner';
          this.allCards[idx].my_answer = answer;
        }
      }

      // Check for achievement
      const totalMyAnswers = this.allCards.filter(c => c.my_answer !== null && c.my_answer !== undefined).length;
      if (totalMyAnswers >= 50) {
        this.api.unlockAchievement('cupid_swipe');
      }

      // Si nos quedamos sin cartas y veníamos de jugar el stack normal, rellenamos
      if (this.cards.length === 0) {
         if (this.isPlayingSpecific) {
           this.isPlayingSpecific = false;
           this.subViewMode = 'waiting_you';
         } else {
           this.prepareStack();
         }
      }
      
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
