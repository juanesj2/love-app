import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoveApiService, API_BASE_URL } from '../../services/love-api.service';
import { TutorialService } from '../../services/tutorial.service';
import { IonIcon, ToastController, IonContent, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, trashOutline, checkmarkCircleOutline, arrowUndoOutline } from 'ionicons/icons';
import { Location } from '@angular/common';
import iro from '@jaames/iro';

@Component({
  selector: 'app-drawing-game',
  template: `
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)" [disabled]="gameState === 'drawing'">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <div class="drawing-container">
        <div class="header">
          <button class="back-btn" (click)="goBack()"><ion-icon name="arrow-back"></ion-icon></button>
        <div class="header-titles">
          <h2>Reto de Dibujo</h2>
          <div class="progress-bar-small" *ngIf="progress">
            <div class="progress-fill" [style.width.%]="progress.drawing?.percentage || 0"></div>
          </div>
        </div>
      </div>

      <!-- VISTA DE CATEGORIAS O LISTA DE COMPLETADAS -->
      <ng-container *ngIf="gameState === 'categories' || gameState === 'completed_list'">
        <div class="custom-toggle-container" id="tour-draw-filters">
          <div class="toggle-pill" [class.active]="gameState === 'categories'" (click)="gameState = 'categories'">
            <ion-icon name="play-circle-outline"></ion-icon> Jugar
          </div>
          <div class="toggle-pill" [class.active]="gameState === 'completed_list'" (click)="loadCompletedList()">
            <ion-icon name="images-outline"></ion-icon> Galería
          </div>
        </div>

        <div class="categories-area" *ngIf="gameState === 'categories'">
          <p class="subtitle">Elige un tema para dar rienda suelta a tu imaginación</p>
          
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

        <div class="completed-list-area" *ngIf="gameState === 'completed_list'">
          <div class="custom-toggle-container sub-filter">
            <div class="toggle-pill" [class.active]="galleryFilter === 'all'" (click)="galleryFilter = 'all'">Todos</div>
            <div class="toggle-pill" [class.active]="galleryFilter === 'new'" (click)="galleryFilter = 'new'">Nuevos</div>
            <div class="toggle-pill" [class.active]="galleryFilter === 'seen'" (click)="galleryFilter = 'seen'">Ya Vistos</div>
          </div>

          <div *ngIf="completedPrompts.length === 0 && waitingPrompts.length === 0 && waitingMePrompts.length === 0" class="empty-state">
            <p>Aún no hay dibujos en la galería 🎨</p>
          </div>

          <div *ngIf="(galleryFilter === 'all' || galleryFilter === 'new') && waitingMePrompts.length > 0" class="mb-20">
            <h3 class="section-title">¡Es tu turno! Nuevos dibujos ({{waitingMePrompts.length}})</h3>
            <div class="drawing-item unread-item" *ngFor="let p of waitingMePrompts" (click)="startSpecificPrompt(p)">
              <h4 class="d-title">{{ p.prompt_text }} <span class="new-badge">NUEVO</span></h4>
              <p class="action-text"><ion-icon name="brush-outline"></ion-icon> Tu pareja ha dibujado. ¡Dibuja tú para verlo!</p>
            </div>
          </div>

          <div *ngIf="(galleryFilter === 'all' || galleryFilter === 'seen') && waitingPrompts.length > 0" class="mb-20">
            <h3 class="section-title">Esperando a tu pareja ({{waitingPrompts.length}})</h3>
            <div class="drawing-item" *ngFor="let p of waitingPrompts">
              <h4 class="d-title">{{ p.prompt_text }}</h4>
              <div class="d-grid">
                <div class="d-col">
                  <img [src]="getImageUrl(p.my_drawing)" class="d-img-thumb" />
                  <span>Tú</span>
                </div>
                <div class="d-col d-hidden">
                  <ion-icon name="lock-closed-outline"></ion-icon>
                  <span>Pareja</span>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="(galleryFilter === 'all' || galleryFilter === 'seen') && completedPrompts.length > 0">
            <h3 class="section-title">Completadas ({{completedPrompts.length}})</h3>
            <div class="drawing-item" *ngFor="let p of completedPrompts">
              <h4 class="d-title">{{ p.prompt_text }}</h4>
              <div class="d-grid">
                <div class="d-col">
                  <img [src]="getImageUrl(p.my_drawing)" class="d-img-thumb" />
                  <span>Tú</span>
                </div>
                <div class="d-col">
                  <img [src]="getImageUrl(p.partner_drawing)" class="d-img-thumb" />
                  <span>Pareja</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ng-container>

      <div class="content" *ngIf="prompt && gameState !== 'categories' && gameState !== 'completed_list'">
        <div class="prompt-card">
          <p>Dibuja:</p>
          <h3 *ngIf="selectedCategory" class="cat-badge">{{ selectedCategory }}</h3>
          <h3>{{ prompt.prompt_text }}</h3>
        </div>

        <ng-container *ngIf="gameState === 'drawing'">
          <div class="canvas-wrapper">
            <canvas #drawingCanvas (touchstart)="startDrawing($event)" (touchmove)="draw($event)" (touchend)="stopDrawing()" (mousedown)="startDrawing($event)" (mousemove)="draw($event)" (mouseup)="stopDrawing()" (mouseleave)="stopDrawing()"></canvas>
          </div>
          <div class="color-picker-container" [class.hidden]="!showCustomPicker">
            <div #colorPicker class="iro-picker-wrapper"></div>
          </div>
          <div class="color-picker-scrollable">
            <div class="color-btn custom-color-btn" (click)="toggleCustomPicker()" [class.active-color]="showCustomPicker"></div>
            <div class="color-btn" *ngFor="let c of predefinedColors" [style.background]="c" (click)="setColorFromBtn(c)" [class.active-color]="currentColor === c && !showCustomPicker"></div>
          </div>
          <div class="thickness-slider-container">
            <ion-icon name="remove-outline" style="font-size: 0.8rem;"></ion-icon>
            <input type="range" min="1" max="40" [value]="currentThickness" (input)="setThickness($event)" class="thickness-slider">
            <ion-icon name="ellipse" style="font-size: 1.2rem;"></ion-icon>
          </div>
          <div class="tools">
            <button class="tool-btn warning" (click)="undo()"><ion-icon name="arrow-undo-outline"></ion-icon> Deshacer</button>
            <button class="tool-btn danger" (click)="clearCanvas()"><ion-icon name="trash-outline"></ion-icon> Borrar</button>
            <button class="tool-btn success" (click)="submitDrawing()"><ion-icon name="checkmark-circle-outline"></ion-icon> Terminar</button>
          </div>
        </ng-container>

        <ng-container *ngIf="gameState === 'waiting'">
          <div class="waiting-state">
            <div class="spinner">⏳</div>
            <h3>Esperando a tu pareja</h3>
            <p>Tu obra de arte se ha guardado. Dile a tu pareja que acepte el reto para ver ambos resultados.</p>
            <button class="primary-btn mt-20" (click)="checkResult()">Comprobar</button>
          </div>
        </ng-container>

        <ng-container *ngIf="gameState === 'completed' && result">
          <div class="results-view">
            <h3>¡Obras de Arte!</h3>
            
            <div class="comparison">
              <div class="drawing-col">
                <span class="label">Tú</span>
                <img [src]="getImageUrl(result.my_drawing)" alt="Mi dibujo" class="d-img">
              </div>
              <div class="drawing-col">
                <span class="label">Pareja</span>
                <img [src]="getImageUrl(result.partner_drawing)" alt="Su dibujo" class="d-img">
              </div>
            </div>

            <button class="primary-btn mt-20" (click)="loadPrompt()">Siguiente Reto</button>
          </div>
        </ng-container>
      </div>

      <div class="empty-state" *ngIf="!prompt && gameState === 'init'">
        <h3>No hay más retos</h3>
        <p>¡Habéis superado todos los retos candentes de esta categoría! Elegid otra para seguir jugando.</p>
      </div>
    </div>
    </ion-content>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
    .drawing-container { padding: calc(var(--safe-top) + 40px) 20px calc(var(--safe-bottom) + 80px); background: #fff0f3; min-height: 100vh; display: flex; flex-direction: column; overflow-y: auto; height: 100vh; box-sizing: border-box; overscroll-behavior-y: none; }
    .header { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; }
    .back-btn { background: rgba(255, 77, 109, 0.1); border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: #590D22; font-size: 1.5rem; cursor: pointer; flex-shrink: 0; }
    .header-titles { flex: 1; text-align: center; display: flex; flex-direction: column; align-items: center; margin-right: 40px; }
    .header-titles h2 { color: #590D22; margin: 0 0 5px; font-weight: 800; font-size: 1.5rem; }
    .progress-bar-small { width: 100px; height: 6px; background: rgba(0,0,0,0.05); border-radius: 3px; overflow: hidden; }
    .progress-bar-small .progress-fill { height: 100%; background: #FF4D6D; border-radius: 3px; transition: width 0.5s ease-out; }

    /* VISTA CATEGORIAS */
    .categories-area { text-align: center; }
    .subtitle { color: #a4133c; font-weight: bold; margin-bottom: 15px; }
    .category-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px; }
    .cat-card { background: white; border-radius: 15px; padding: 20px; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.05); cursor: pointer; transition: transform 0.2s; }
    .cat-card:active { transform: scale(0.95); }
    .cat-card h3 { margin: 0; color: #590D22; font-weight: bold; font-size: 1.1rem; }
    .all-card { grid-column: span 2; background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; }
    .all-card h3 { color: white; margin-top: 5px; }
    .all-card ion-icon { font-size: 2rem; }

    .content { flex: 1; display: flex; flex-direction: column; }
    .prompt-card { background: white; padding: 15px; border-radius: 15px; text-align: center; box-shadow: 0 4px 10px rgba(255,77,109,0.1); margin-bottom: 20px; }
    .prompt-card p { margin: 0; color: #a4133c; font-size: 0.9rem; text-transform: uppercase; font-weight: bold; }
    .cat-badge { display: inline-block; background: #ffb3c1; color: #590d22; font-size: 0.8rem; padding: 3px 8px; border-radius: 10px; margin-top: 5px; }
    .prompt-card h3 { margin: 5px 0 0; color: #590D22; font-size: 1.3rem; font-weight: 800; }

    /* TOGGLE TABS */
    .custom-toggle-container { display: flex; background: rgba(255,255,255,0.6); padding: 5px; border-radius: 30px; margin: 0 0 15px 0; box-shadow: inset 0 2px 5px rgba(0,0,0,0.05); }
    .toggle-pill { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 10px 0; border-radius: 25px; font-weight: 700; color: #888; transition: all 0.3s; cursor: pointer; font-size: 0.9rem; position: relative; }
    .toggle-pill.active { background: white; color: #FF4D6D; box-shadow: 0 4px 10px rgba(255,77,109,0.15); transform: scale(1.02); }
    
    .sub-filter { transform: scale(0.9); margin-top: -10px; margin-bottom: 20px; box-shadow: none; background: rgba(0,0,0,0.03); }
    .sub-filter .toggle-pill.active { box-shadow: 0 2px 5px rgba(0,0,0,0.1); }

    /* LISTA COMPLETA */
    .section-title { color: #590D22; font-size: 1.1rem; border-bottom: 2px solid #ffb3c1; padding-bottom: 5px; margin-bottom: 15px; text-align: left; }
    .mb-20 { margin-bottom: 20px; }
    .drawing-item { background: white; border-radius: 15px; padding: 15px; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); text-align: center; }
    .d-title { margin: 0 0 15px; color: #590D22; font-weight: bold; font-size: 1.1rem; }
    .d-grid { display: flex; gap: 15px; }
    .d-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; font-size: 0.8rem; font-weight: bold; color: #FF4D6D; text-transform: uppercase; }
    .d-img-thumb { width: 100%; aspect-ratio: 1; object-fit: contain; background: #f8f9fa; border-radius: 10px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.05); }
    .d-hidden { background: #f1f3f5; border-radius: 10px; justify-content: center; color: #888; font-size: 0.9rem; aspect-ratio: 1; margin-bottom: 20px; }
    .d-hidden ion-icon { font-size: 2rem; margin-bottom: 5px; }

    .canvas-wrapper { flex: 1; background: white; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden; position: relative; min-height: 350px; }
    canvas { width: 100%; height: 100%; touch-action: none; display: block; }
    
    .tools { display: flex; gap: 10px; margin-top: 20px; }
    .color-picker-container { display: flex; justify-content: center; margin-top: 20px; transition: all 0.3s; }
    .color-picker-container.hidden { display: none; }
    .iro-picker-wrapper { background: rgba(255,255,255,0.8); border-radius: 50%; padding: 5px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
    .color-picker-scrollable { display: flex; gap: 12px; overflow-x: auto; padding: 10px 5px; margin-top: 15px; align-items: center; scrollbar-width: none; }
    .color-picker-scrollable::-webkit-scrollbar { display: none; }
    .color-btn { width: 35px; height: 35px; border-radius: 50%; cursor: pointer; border: 2px solid #ddd; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: transform 0.2s; }
    .color-btn.active-color { transform: scale(1.2); border-color: #FF4D6D; border-width: 3px; }
    .custom-color-btn { background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red); }

    .thickness-slider-container { display: flex; align-items: center; gap: 10px; margin: 10px 0; background: rgba(255,255,255,0.6); padding: 10px 15px; border-radius: 20px; color: #FF4D6D; box-shadow: inset 0 2px 5px rgba(0,0,0,0.05); }
    .thickness-slider { flex: 1; accent-color: #FF4D6D; }

    .unread-item { cursor: pointer; transition: transform 0.2s; background: linear-gradient(145deg, #ffffff, #fff0f3); border: 1px solid #ffb3c1; }
    .unread-item:active { transform: scale(0.98); }
    .new-badge { background: #FF4D6D; color: white; font-size: 0.7rem; padding: 3px 6px; border-radius: 10px; vertical-align: middle; margin-left: 5px; }
    .action-text { margin: 0; color: #a4133c; font-size: 0.9rem; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 5px; }
    .tool-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 20px; border: none; font-weight: bold; font-size: 1rem; cursor: pointer; color: white; }
    .tool-btn.warning { background: #f4a261; }
    .tool-btn.danger { background: #e63946; }
    .tool-btn.success { background: #2a9d8f; }

    .waiting-state { text-align: center; margin-top: 50px; }
    .spinner { font-size: 4rem; animation: spin 2s infinite linear; margin-bottom: 20px; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    .waiting-state h3 { color: #590D22; font-size: 1.5rem; }
    .waiting-state p { color: #a4133c; margin-bottom: 20px; }
    
    .primary-btn { background: #FF4D6D; color: white; border: none; padding: 12px 25px; border-radius: 25px; font-weight: bold; font-size: 1.1rem; width: 100%; display: block; margin: 0 auto; }
    .mt-20 { margin-top: 20px; }

    .results-view { text-align: center; }
    .results-view h3 { color: #590D22; font-size: 1.8rem; margin-bottom: 20px; }
    .comparison { display: flex; gap: 10px; }
    .drawing-col { flex: 1; background: white; padding: 10px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .label { font-weight: bold; color: #FF4D6D; text-transform: uppercase; font-size: 0.9rem; }
    .d-img { width: 100%; border-radius: 5px; object-fit: contain; background: #f8f9fa; aspect-ratio: 1; }

    .empty-state { text-align: center; margin-top: 50px; }
    .empty-state h3 { color: #590D22; font-size: 1.5rem; }
    .empty-state p { color: #a4133c; margin-bottom: 20px; }

    :host-context(.night-owl-mode) .drawing-container { background: #121212; }
    :host-context(.night-owl-mode) .header-titles h2 { color: #fdfdfd; }
    :host-context(.night-owl-mode) .back-btn { background: #222; color: #fdfdfd; }
    :host-context(.night-owl-mode) .progress-bar-small { background: rgba(255,255,255,0.1); }
    :host-context(.night-owl-mode) .subtitle { color: #ccc; }
    :host-context(.night-owl-mode) .custom-toggle-container { background: rgba(30, 30, 30, 0.8); box-shadow: none; }
    :host-context(.night-owl-mode) .toggle-pill { color: #999; }
    :host-context(.night-owl-mode) .toggle-pill.active { background: #222; color: #a78bfa; }
    :host-context(.night-owl-mode) .cat-card { background: rgba(30,30,30,0.85); box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
    :host-context(.night-owl-mode) .cat-card h3 { color: #fdfdfd; }
    :host-context(.night-owl-mode) .prompt-card { background: rgba(30,30,30,0.85); box-shadow: 0 10px 20px rgba(0,0,0,0.5); }
    :host-context(.night-owl-mode) .prompt-card p { color: #ccc; }
    :host-context(.night-owl-mode) .prompt-card h3 { color: #fdfdfd; }
    :host-context(.night-owl-mode) .canvas-wrapper { border-color: rgba(255,255,255,0.1); box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
    :host-context(.night-owl-mode) .iro-picker-wrapper { background: rgba(30,30,30,0.8); box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
    :host-context(.night-owl-mode) .color-btn { border-color: #444; }
    :host-context(.night-owl-mode) .color-picker-scrollable { background: #1a1a1a; box-shadow: inset 0 2px 10px rgba(0,0,0,0.5); border-radius: 15px; padding: 15px; }
    :host-context(.night-owl-mode) .tools { background: #1a1a1a; box-shadow: 0 -2px 10px rgba(0,0,0,0.5); padding: 10px; border-radius: 15px; }
    :host-context(.night-owl-mode) .unread-item { background: linear-gradient(145deg, #222, #331f24); border-color: #590d22; }
    :host-context(.night-owl-mode) .waiting-state h3 { color: #fdfdfd; }
    :host-context(.night-owl-mode) .waiting-state p { color: #ccc; }
    :host-context(.night-owl-mode) .results-view h3 { color: #fdfdfd; }
    :host-context(.night-owl-mode) .drawing-col { background: #1a1a1a; box-shadow: 0 2px 10px rgba(0,0,0,0.5); }
    :host-context(.night-owl-mode) .d-img { background: #222; }
    :host-context(.night-owl-mode) .empty-state h3 { color: #fdfdfd; }
    :host-context(.night-owl-mode) .empty-state p { color: #ccc; }
    :host-context(.night-owl-mode) .section-title { color: #fdfdfd; border-bottom-color: rgba(255,255,255,0.1); }
    :host-context(.night-owl-mode) .drawing-item { background: rgba(30,30,30,0.85); box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
    :host-context(.night-owl-mode) .d-title { color: #fdfdfd; }
    :host-context(.night-owl-mode) .d-col span { color: #ccc; }
  `],
  standalone: true,
  imports: [CommonModule, IonIcon, IonContent, IonRefresher, IonRefresherContent]
})
export class DrawingGameComponent implements OnInit, AfterViewInit {
  @ViewChild('drawingCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('colorPicker') colorPickerRef!: ElementRef<HTMLElement>;
  private ctx!: CanvasRenderingContext2D;
  private colorPickerObj: any = null;

  categories: string[] = [];
  selectedCategory: string = '';
  prompt: any = null;
  gameState: 'categories' | 'completed_list' | 'init' | 'drawing' | 'waiting' | 'completed' = 'categories';
  galleryFilter: 'all' | 'new' | 'seen' = 'all';
  result: any = null;
  progress: any = null;

  completedPrompts: any[] = [];
  waitingPrompts: any[] = [];
  waitingMePrompts: any[] = [];

  showCustomPicker: boolean = false;

  private isDrawing = false;
  private drawingHistory: ImageData[] = [];
  public currentColor: string = '#000000';
  public currentThickness: number = 4;
  public predefinedColors = [
    '#000000', '#ffffff', '#8b4513', '#a0522d', '#cd853f', '#f5deb3', 
    '#ffb6c1', '#ff69b4', '#9370db', '#e6e6fa', '#add8e6', '#98fb98'
  ];
  private api = inject(LoveApiService);
  private toastCtrl = inject(ToastController);
  private location = inject(Location);
  private tutorialService = inject(TutorialService);

  constructor() {
    addIcons({ arrowBack, trashOutline, checkmarkCircleOutline, arrowUndoOutline, 'play-circle-outline': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><path d="M112 111v290c0 17.44 17 28.52 31 20.16l247.9-148.37c12.12-7.25 12.12-26.33 0-33.58L143 90.84c-14-8.36-31 2.72-31 20.16z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/></svg>', 'lock-closed-outline': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><path d="M336 208v-95a80 80 0 00-160 0v95" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><rect x="96" y="208" width="320" height="272" rx="48" ry="48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>', 'infinite-outline': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><path d="M256 256s-48-96-126-96c-54.12 0-98 43-98 96s43.88 96 98 96c37.51 0 71-22.41 94-48M256 256s48 96 126 96c54.12 0 98-43 98-96s-43.88-96-98-96c-37.51 0-71 22.41-94 48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="48"/></svg>', 'images-outline': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><path d="M432 112V96a48.14 48.14 0 00-48-48H64a48.14 48.14 0 00-48 48v256a48.14 48.14 0 0048 48h16" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/><rect x="96" y="128" width="400" height="336" rx="45.99" ry="45.99" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/><ellipse cx="372.92" cy="219.64" rx="30.77" ry="30.55" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/><path d="M342.15 372.17L255 285.78a30.93 30.93 0 00-42.18-1.21L96 387.64M265.23 464l118.59-117.73a31 31 0 0141.46-1.87L496 402.91" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>', 'brush-outline': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><path d="M452.37 59.63h0a40.49 40.49 0 00-57.26 0L184.54 270.17a64.12 64.12 0 00-17.72 31.78L160 336l34.05-6.81a64.12 64.12 0 0031.78-17.72L436.37 101.9a40.49 40.49 0 000-57.26z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path d="M160 336l-34.05 6.81A32 32 0 00104 368.53v0a32 32 0 0032 32h0a32 32 0 0025.72-12.78L192 352" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path d="M224 400h128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>' });
  }

  async ngOnInit() {}

  async ionViewDidEnter() {
    this.loadCategories();
    try {
      this.progress = await this.api.getGamesProgress();
    } catch (e) {
      console.error('Error fetching progress', e);
    }
    setTimeout(() => {
      this.tutorialService.showDrawTour();
    }, 500);
  }

  async handleRefresh(event: any) {
    if (this.gameState === 'categories') {
      await this.loadCategories();
    } else if (this.gameState === 'completed_list') {
      await this.loadCompletedList();
    } else if (this.prompt) {
      await this.checkResult();
    }
    
    try {
      this.progress = await this.api.getGamesProgress();
    } catch (e) {}

    event.target.complete();
  }

  ngAfterViewInit() {}

  async loadCategories() {
    try {
      this.categories = await this.api.getDrawingCategories();
    } catch (e: any) {
      console.error(e);
      const toast = await this.toastCtrl.create({
        message: 'Error al cargar categorías. Revisa tu backend.',
        duration: 3000,
        color: 'danger',
        position: 'bottom',
        icon: 'warning-outline'
      });
      toast.present();
    }
  }

  async selectCategory(cat: string) {
    this.selectedCategory = cat;
    this.gameState = 'init';
    this.prompt = null;
    await this.loadPrompt();
  }

  async loadCompletedList() {
    this.gameState = 'completed_list';
    try {
      const response: any = await this.api.getAllDrawingPrompts();
      let allPrompts: any[] = [];
      
      if (Array.isArray(response)) {
        allPrompts = response;
      } else if (response && Array.isArray(response.data)) {
        allPrompts = response.data;
      } else if (response && Array.isArray(response.cards)) {
        allPrompts = response.cards;
      } else if (response && typeof response === 'object') {
        allPrompts = Object.values(response).find(val => Array.isArray(val)) as any[] || [];
      }

      this.completedPrompts = allPrompts.filter(p => p.status === 'completed');
      this.waitingPrompts = allPrompts.filter(p => p.status === 'waiting_partner');
      this.waitingMePrompts = allPrompts.filter(p => p.status === 'waiting_you');
    } catch (e) {
      console.error(e);
    }
  }

  startSpecificPrompt(p: any) {
    this.prompt = { id: p.id, prompt_text: p.prompt_text, category: p.category };
    this.checkResult();
  }

  goBack() {
    if (this.gameState !== 'categories' && this.gameState !== 'completed_list') {
      this.gameState = 'categories';
      this.selectedCategory = '';
      this.prompt = null;
    } else {
      this.location.back();
    }
  }

  async loadPrompt() {
    try {
      this.prompt = await this.api.getDrawingPrompt(this.selectedCategory);
      this.checkResult(); 
    } catch (e: any) {
      console.error(e);
      this.gameState = 'init';
      
      const toast = await this.toastCtrl.create({
        message: e?.status === 404 ? 'No hay retos disponibles.' : 'Error al cargar el reto.',
        duration: 3000,
        color: e?.status === 404 ? 'warning' : 'danger',
        position: 'bottom',
        icon: 'alert-circle-outline'
      });
      toast.present();
    }
  }

  initCanvas() {
    setTimeout(() => {
      if (this.canvasRef) {
        const canvas = this.canvasRef.nativeElement;
        const wrapper = canvas.parentElement;
        if (wrapper) {
          canvas.width = wrapper.clientWidth;
          canvas.height = wrapper.clientHeight;
        }
        
        const context = canvas.getContext('2d');
        if (context) {
          this.ctx = context;
          this.ctx.lineCap = 'round';
          this.ctx.lineJoin = 'round';
          this.ctx.lineWidth = this.currentThickness;
          this.ctx.strokeStyle = this.currentColor;
          
          // White background
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillRect(0, 0, canvas.width, canvas.height);

          this.drawingHistory = [];
          this.saveHistory();

          if (this.colorPickerRef && !this.colorPickerObj) {
            this.colorPickerObj = (iro as any).ColorPicker(this.colorPickerRef.nativeElement, {
              width: 150,
              color: '#ff0000', // start bright
              borderWidth: 2,
              borderColor: '#ffffff',
              layout: [
                { 
                  component: (iro as any).ui.Wheel,
                  options: {}
                }
              ]
            });
            this.colorPickerObj.on('color:change', (color: any) => {
              if (this.showCustomPicker) {
                this.setColor(color.hexString);
              }
            });
          }
        }
      }
    }, 100);
  }

  async checkResult() {
    if (!this.prompt) return;
    try {
      const res = await this.api.getDrawingResult(this.prompt.id);
      if (res.status === 'completed') {
        this.gameState = 'completed';
        this.result = res;
      } else if (res.status === 'waiting_partner') {
        // Significa que yo ya lo hice pero mi pareja no
        this.gameState = 'waiting';
      } else {
        // pending_me o cualquier otro estado donde falte yo por dibujar
        this.gameState = 'drawing';
        this.initCanvas();
      }
    } catch (e: any) {
      if (e.status === 404 || (e.error && e.error.message === 'Falta que uno termine')) {
         this.gameState = 'drawing';
         this.initCanvas();
      } else {
         this.gameState = 'drawing';
         this.initCanvas();
      }
    }
  }

  getImageUrl(path: string) {
    return `${API_BASE_URL.replace('/api', '')}/storage/${path}`;
  }

  // --- DRAWING LOGIC ---

  private getXY(e: TouchEvent | MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    if (window.TouchEvent && e instanceof TouchEvent) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      const me = e as MouseEvent;
      return {
        x: me.clientX - rect.left,
        y: me.clientY - rect.top
      };
    }
  }

  startDrawing(e: TouchEvent | MouseEvent) {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    this.isDrawing = true;
    const { x, y } = this.getXY(e);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  draw(e: TouchEvent | MouseEvent) {
    if (!this.isDrawing) return;
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    const { x, y } = this.getXY(e);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  stopDrawing() {
    if (this.isDrawing) {
      this.ctx.closePath();
      this.isDrawing = false;
      this.saveHistory();
    }
  }

  clearCanvas() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.saveHistory();
  }

  toggleCustomPicker() {
    this.showCustomPicker = !this.showCustomPicker;
    if (this.showCustomPicker) {
      // Set to bright red initially if black, to avoid black wheel
      if (this.currentColor === '#000000' || this.currentColor === '#ffffff') {
        this.setColor('#ff0000');
        if (this.colorPickerObj) this.colorPickerObj.color.hexString = '#ff0000';
      } else {
        if (this.colorPickerObj) this.colorPickerObj.color.hexString = this.currentColor;
      }
    }
  }

  setColorFromBtn(color: string) {
    this.showCustomPicker = false;
    this.setColor(color);
    if (this.colorPickerObj) {
      this.colorPickerObj.color.hexString = color;
    }
  }

  setColor(color: string) {
    this.currentColor = color;
    if (this.ctx) {
      this.ctx.strokeStyle = this.currentColor;
    }
  }

  setThickness(e: any) {
    this.currentThickness = e.target.value;
    if (this.ctx) {
      this.ctx.lineWidth = this.currentThickness;
    }
  }

  saveHistory() {
    if (this.ctx && this.canvasRef) {
      const canvas = this.canvasRef.nativeElement;
      this.drawingHistory.push(this.ctx.getImageData(0, 0, canvas.width, canvas.height));
    }
  }

  undo() {
    if (this.drawingHistory.length > 1 && this.ctx && this.canvasRef) {
      this.drawingHistory.pop(); // remove current state
      const previousState = this.drawingHistory[this.drawingHistory.length - 1];
      this.ctx.putImageData(previousState, 0, 0);
    }
  }

  async submitDrawing() {
    const canvas = this.canvasRef.nativeElement;
    const base64 = canvas.toDataURL('image/png');

    try {
      await this.api.uploadDrawing(this.prompt.id, base64);
      this.api.unlockAchievement('first_drawing');
      this.checkResult();
    } catch (e) {
      console.error(e);
      const toast = await this.toastCtrl.create({
        message: 'Error al subir el dibujo',
        duration: 2000,
        color: 'danger'
      });
      toast.present();
    }
  }
}

