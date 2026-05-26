import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoveApiService, API_BASE_URL } from '../../services/love-api.service';
import { IonIcon, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, trashOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { Location } from '@angular/common';

@Component({
  selector: 'app-drawing-game',
  template: `
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

      <!-- VISTA DE CATEGORIAS -->
      <ng-container *ngIf="gameState === 'categories'">
        <div class="categories-area">
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
      </ng-container>

      <div class="content" *ngIf="prompt && gameState !== 'categories'">
        <div class="prompt-card">
          <p>Dibuja:</p>
          <h3 *ngIf="selectedCategory" class="cat-badge">{{ selectedCategory }}</h3>
          <h3>{{ prompt.prompt_text }}</h3>
        </div>

        <ng-container *ngIf="gameState === 'drawing'">
          <div class="canvas-wrapper">
            <canvas #drawingCanvas (touchstart)="startDrawing($event)" (touchmove)="draw($event)" (touchend)="stopDrawing()" (mousedown)="startDrawing($event)" (mousemove)="draw($event)" (mouseup)="stopDrawing()" (mouseleave)="stopDrawing()"></canvas>
          </div>
          <div class="tools">
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
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
    .drawing-container { padding: 20px; background: #fff0f3; min-height: 100vh; display: flex; flex-direction: column; }
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

    .canvas-wrapper { flex: 1; background: white; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden; position: relative; min-height: 350px; }
    canvas { width: 100%; height: 100%; touch-action: none; display: block; }
    
    .tools { display: flex; gap: 10px; margin-top: 20px; }
    .tool-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 10px; border: none; font-weight: bold; font-size: 1rem; cursor: pointer; color: white; }
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
  `],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class DrawingGameComponent implements OnInit, AfterViewInit {
  @ViewChild('drawingCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;

  categories: string[] = [];
  selectedCategory: string = '';
  prompt: any = null;
  gameState: 'categories' | 'init' | 'drawing' | 'waiting' | 'completed' = 'categories';
  result: any = null;
  progress: any = null;

  private isDrawing = false;
  private api = inject(LoveApiService);
  private toastCtrl = inject(ToastController);
  private location = inject(Location);

  constructor() {
    addIcons({ arrowBack, trashOutline, checkmarkCircleOutline, 'infinite-outline': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><path d="M256 256s-48-96-126-96c-54.12 0-98 43-98 96s43.88 96 98 96c37.51 0 71-22.41 94-48M256 256s48 96 126 96c54.12 0 98-43 98-96s-43.88-96-98-96c-37.51 0-71 22.41-94 48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="48"/></svg>' });
  }

  async ngOnInit() {
    this.loadCategories();
    try {
      this.progress = await this.api.getGamesProgress();
    } catch (e) {
      console.error('Error fetching progress', e);
    }
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

  goBack() {
    if (this.gameState !== 'categories') {
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
          this.ctx.lineWidth = 4;
          this.ctx.strokeStyle = '#590D22';
          
          // White background
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    if (e.cancelable) e.preventDefault();
    this.isDrawing = true;
    const { x, y } = this.getXY(e);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  draw(e: TouchEvent | MouseEvent) {
    if (!this.isDrawing) return;
    if (e.cancelable) e.preventDefault();
    const { x, y } = this.getXY(e);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  stopDrawing() {
    if (this.isDrawing) {
      this.ctx.closePath();
      this.isDrawing = false;
    }
  }

  clearCanvas() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  async submitDrawing() {
    const canvas = this.canvasRef.nativeElement;
    const base64 = canvas.toDataURL('image/png');

    try {
      await this.api.uploadDrawing(this.prompt.id, base64);
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
