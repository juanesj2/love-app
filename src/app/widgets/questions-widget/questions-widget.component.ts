import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoveApiService } from '../../services/love-api.service';
import { IonIcon, ToastController, IonContent, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { helpCircleOutline, checkmarkCircleOutline, lockClosedOutline, alertCircleOutline, arrowBack, arrowUp } from 'ionicons/icons';
import { Location } from '@angular/common';

@Component({
  selector: 'app-questions-widget',
  template: `
    <ion-content class="scroll-content" [scrollEvents]="true" (ionScroll)="onScroll($event)">
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <div class="questions-container">
      <div class="q-header">
        <button class="back-btn" (click)="goBack()"><ion-icon name="arrow-back"></ion-icon></button>
        <h2>Test de Pareja</h2>
        <p>Responde con sinceridad y descubre los secretos de tu pareja.</p>
        <div class="progress-container" *ngIf="questions.length > 0">
          <div class="progress-bar"><div class="progress-fill" [style.width.%]="percentage"></div></div>
          <span class="progress-text">{{ percentage }}% completado</span>
        </div>
      </div>

      <div class="custom-toggle-container">
        <div class="toggle-pill" [class.active]="viewMode === 'pending'" (click)="viewMode = 'pending'">
          <ion-icon name="help-circle-outline"></ion-icon> Por responder
        </div>
        <div class="toggle-pill" [class.active]="viewMode === 'waiting_you'" (click)="viewMode = 'waiting_you'">
          <ion-icon name="alert-circle-outline"></ion-icon> Te toca
        </div>
        <div class="toggle-pill" [class.active]="viewMode === 'completed'" (click)="viewMode = 'completed'">
          <ion-icon name="checkmark-circle-outline"></ion-icon> Completadas
        </div>
      </div>

      <div class="category-filter-container" *ngIf="categories.length > 1">
        <div class="category-pill" 
             *ngFor="let cat of categories" 
             [class.active]="selectedCategory === cat" 
             (click)="selectedCategory = cat">
          {{ cat }}
        </div>
      </div>

      <div class="q-list">
        
        <ng-container *ngIf="viewMode === 'pending'">
          <div class="q-card" *ngFor="let q of pendingQuestions">
            <div class="q-category">{{ q.category }}</div>
            <h3 class="q-text">{{ q.question_text }}</h3>
            <div class="q-body">
              <div class="q-answer-box">
                <textarea placeholder="Escribe tu respuesta aquí..." [(ngModel)]="draftAnswers[q.id]"></textarea>
                <button (click)="submitAnswer(q.id)">Responder</button>
              </div>
            </div>
          </div>
          <div *ngIf="pendingQuestions.length === 0" class="empty-state">
             ¡Al día! Has respondido a todas las preguntas candentes de esta sección.
          </div>
        </ng-container>

        <ng-container *ngIf="viewMode === 'waiting_you'">
          <div class="q-card" *ngFor="let q of waitingYouQuestions">
            <div class="q-category attention">¡Tu pareja está esperando!</div>
            <h3 class="q-text">{{ q.question_text }}</h3>
            <div class="q-body">
              <div class="q-answer-box">
                <textarea placeholder="Descubre su respuesta al responder tú..." [(ngModel)]="draftAnswers[q.id]"></textarea>
                <button (click)="submitAnswer(q.id)">Responder y Descubrir</button>
              </div>
            </div>
          </div>
          <div *ngIf="waitingYouQuestions.length === 0" class="empty-state">
             Nadie te está esperando por ahora 😊
          </div>
        </ng-container>

        <ng-container *ngIf="viewMode === 'completed'">
          <div class="q-card" *ngFor="let q of completedQuestions">
            <div class="q-category">{{ q.category }}</div>
            <h3 class="q-text">{{ q.question_text }}</h3>
            
            <div class="q-body">
              <div *ngIf="q.status === 'waiting_partner'" class="q-waiting">
                <ion-icon name="lock-closed-outline"></ion-icon>
                <span>Respuesta oculta hasta que tu pareja responda.</span>
              </div>

              <div *ngIf="q.status === 'answered'" class="q-results">
                <div class="answer-row">
                  <span class="a-label">Tú:</span>
                  <span class="a-text">{{ q.my_answer }}</span>
                </div>
                <div class="answer-row partner">
                  <span class="a-label">Pareja:</span>
                  <span class="a-text">{{ q.partner_answer }}</span>
                </div>
              </div>
            </div>
          </div>
          <div *ngIf="completedQuestions.length === 0" class="empty-state">
             Aún no has respondido ninguna pregunta de esta sección. ¡Atrévete con la primera!
          </div>
        </ng-container>
      </div>
      </div>
      <!-- Scroll to Top Button -->
      <div class="scroll-top-btn" [class.visible]="showScrollTop" (click)="scrollToTop()">
        <ion-icon name="arrow-up"></ion-icon>
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
    .scroll-content { --background: transparent; }
    .questions-container { padding: calc(env(safe-area-inset-top) + 40px) 20px 20px; background: #fff0f3; min-height: 100%; padding-bottom: 100px; box-sizing: border-box; }
    .q-header { text-align: center; margin-bottom: 20px; position: relative; }
    .back-btn { position: absolute; left: 0; top: 0; background: rgba(255, 77, 109, 0.1); border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: #590D22; font-size: 1.5rem; cursor: pointer; }
    .q-header h2 { color: #590D22; margin: 0 0 5px; font-weight: 800; font-size: 1.8rem; padding-top: 5px; }
    .q-header p { color: #a4133c; margin: 0; font-size: 0.95rem; }

    .progress-container { display: flex; align-items: center; gap: 8px; margin-top: 15px; padding: 0 10px; }
    .progress-bar { flex: 1; height: 8px; background: rgba(0,0,0,0.05); border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: #FF4D6D; border-radius: 4px; transition: width 0.5s ease-out; }
    .progress-text { font-size: 0.8rem; font-weight: bold; color: #a4133c; white-space: nowrap; }

    .q-list { display: flex; flex-direction: column; gap: 15px; }
    .q-card { background: white; border-radius: 15px; padding: 20px; box-shadow: 0 4px 15px rgba(255,77,109,0.1); }
    .q-category { display: inline-block; background: #ffb3c1; color: #590D22; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; }
    .q-category.attention { background: #FF4D6D; color: white; animation: bounce 1s infinite alternate; }
    @keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-3px); } }
    .q-text { color: #590D22; font-size: 1.1rem; margin: 0 0 15px; font-weight: 700; line-height: 1.4; }

    .q-answer-box { display: flex; flex-direction: column; gap: 10px; }
    .q-answer-box textarea { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid #ffb3c1; background: #fffcfd; color: #590D22; font-family: inherit; font-size: 1.05rem; min-height: 80px; resize: none; outline: none; }
    .q-answer-box textarea::placeholder { color: #ffb3c1; }
    .q-answer-box button { background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; border: none; padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer; }

    .q-waiting { display: flex; align-items: center; gap: 10px; background: #f8f9fa; padding: 15px; border-radius: 10px; color: #6c757d; font-size: 0.9rem; }
    .q-waiting ion-icon { font-size: 1.5rem; }

    .q-results { display: flex; flex-direction: column; gap: 10px; }
    .answer-row { background: #fff0f3; padding: 12px; border-radius: 10px; display: flex; flex-direction: column; gap: 5px; }
    .answer-row.partner { background: #ffb3c1; }
    .a-label { font-size: 0.75rem; font-weight: bold; color: #590D22; text-transform: uppercase; }
    .a-text { font-size: 1.05rem; color: #590D22; line-height: 1.4; }

    .custom-toggle-container { display: flex; background: rgba(255,255,255,0.6); padding: 5px; border-radius: 30px; margin: 0 0 15px 0; box-shadow: inset 0 2px 5px rgba(0,0,0,0.05); }
    .toggle-pill { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 0; border-radius: 25px; font-weight: 700; color: #888; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; }
    .toggle-pill.active { background: white; color: #FF4D6D; box-shadow: 0 4px 10px rgba(255,77,109,0.15); transform: scale(1.02); }
    .category-filter-container { display: flex; gap: 8px; overflow-x: auto; padding: 5px; margin-bottom: 15px; scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch; }
    .category-filter-container::-webkit-scrollbar { display: none; }
    .category-pill { flex-shrink: 0; padding: 6px 14px; background: rgba(255, 77, 109, 0.1); color: #590D22; border-radius: 20px; font-size: 0.85rem; font-weight: bold; white-space: nowrap; cursor: pointer; transition: all 0.2s; }
    .category-pill.active { background: #FF4D6D; color: white; box-shadow: 0 3px 8px rgba(255,77,109,0.3); }
    .empty-state { text-align: center; color: #a4133c; padding: 30px; font-weight: bold; opacity: 0.8; }
    
    .scroll-top-btn { position: fixed; bottom: 30px; right: 20px; width: 50px; height: 50px; background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; box-shadow: 0 4px 15px rgba(255, 77, 109, 0.4); cursor: pointer; z-index: 1000; opacity: 0; transform: translateY(20px) scale(0.8); pointer-events: none; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
    .scroll-top-btn.visible { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
    .scroll-top-btn:active { transform: scale(0.9); }

    :host-context(.night-owl-mode) .questions-container { background: linear-gradient(135deg, #121212 0%, #1a1a1a 100%); }
    :host-context(.night-owl-mode) .glass-card { background: rgba(30, 30, 30, 0.85); border-color: rgba(255, 255, 255, 0.05); box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
    :host-context(.night-owl-mode) .title { color: #fdfdfd; text-shadow: none; }
    :host-context(.night-owl-mode) .subtitle { color: #ccc; }
    :host-context(.night-owl-mode) .glass-input { background: rgba(0,0,0,0.4); border-color: #333; color: #fdfdfd; }
    :host-context(.night-owl-mode) .glass-input:focus { border-color: #a78bfa; background: #111; box-shadow: 0 4px 15px rgba(167,139,250,0.2); }
    :host-context(.night-owl-mode) .glass-btn { background: linear-gradient(135deg, #a78bfa, #8b5cf6); box-shadow: 0 4px 15px rgba(167,139,250,0.3); }
    :host-context(.night-owl-mode) .question-card { background: rgba(0,0,0,0.4); border-color: #333; }
    :host-context(.night-owl-mode) .q-text { color: #fdfdfd; }
    :host-context(.night-owl-mode) .my-answer textarea { background: rgba(0,0,0,0.5); border-color: #444; color: #fdfdfd; }
    :host-context(.night-owl-mode) .my-answer textarea:focus { border-color: #a78bfa; background: #111; }
    :host-context(.night-owl-mode) .save-btn { background: rgba(167,139,250,0.1); color: #a78bfa; border-color: rgba(167,139,250,0.3); }
    :host-context(.night-owl-mode) .answered-state { background: rgba(0,0,0,0.3); border-color: #333; }
    :host-context(.night-owl-mode) .answer-text { color: #fdfdfd; }
    :host-context(.night-owl-mode) .empty-state h3 { color: #fdfdfd; }
    :host-context(.night-owl-mode) .empty-state p { color: #ccc; }
    :host-context(.night-owl-mode) .scroll-top-btn { background: linear-gradient(135deg, #a78bfa, #8b5cf6); box-shadow: 0 4px 15px rgba(167,139,250,0.4); }
    :host-context(.night-owl-mode) .custom-toggle-container { background: rgba(0,0,0,0.5); }
    :host-context(.night-owl-mode) .toggle-pill { color: #aaa; }
    :host-context(.night-owl-mode) .toggle-pill.active { background: #333; color: #a78bfa; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
    :host-context(.night-owl-mode) .category-pill { background: rgba(255,255,255,0.05); color: #ccc; }
    :host-context(.night-owl-mode) .category-pill.active { background: linear-gradient(135deg, #a78bfa, #8b5cf6); color: white; }
    :host-context(.night-owl-mode) .answer-row { background: rgba(0,0,0,0.4); border: 1px solid #333; }
    :host-context(.night-owl-mode) .answer-row.partner { background: rgba(167,139,250,0.15); border-color: rgba(167,139,250,0.3); }
    :host-context(.night-owl-mode) .a-label { color: #8b5cf6; }
    :host-context(.night-owl-mode) .a-text { color: #fdfdfd; }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, IonContent, IonRefresher, IonRefresherContent]
})
export class QuestionsWidgetComponent implements OnInit {
  @ViewChild(IonContent) content!: IonContent;
  
  questions: any[] = [];
  draftAnswers: { [key: number]: string } = {};
  viewMode: 'pending' | 'waiting_you' | 'completed' = 'pending';
  selectedCategory: string = 'Todas';
  showScrollTop = false;

  get categories() {
    const cats = this.questions.map(q => q.category);
    return ['Todas', ...new Set(cats)];
  }

  get pendingQuestions() {
    return this.questions.filter(q => q.status === 'unanswered' && (this.selectedCategory === 'Todas' || q.category === this.selectedCategory));
  }

  get waitingYouQuestions() {
    return this.questions.filter(q => q.status === 'waiting_you' && (this.selectedCategory === 'Todas' || q.category === this.selectedCategory));
  }

  get completedQuestions() {
    return this.questions.filter(q => (q.status === 'waiting_partner' || q.status === 'answered') && (this.selectedCategory === 'Todas' || q.category === this.selectedCategory));
  }

  get totalCompletedQuestions() {
    return this.questions.filter(q => q.status === 'waiting_partner' || q.status === 'answered');
  }

  get percentage() {
    if (this.questions.length === 0) return 0;
    return Math.round((this.totalCompletedQuestions.length / this.questions.length) * 100);
  }

  private api = inject(LoveApiService);
  private toastCtrl = inject(ToastController);
  private location = inject(Location);

  constructor() {
    addIcons({ helpCircleOutline, checkmarkCircleOutline, lockClosedOutline, alertCircleOutline, arrowBack, arrowUp });
  }

  ngOnInit() {
    this.loadQuestions();
  }

  goBack() {
    this.location.back();
  }

  async loadQuestions() {
    try {
      this.questions = await this.api.getQuestions();
    } catch (e) {
      console.error(e);
    }
  }

  async handleRefresh(event: any) {
    await this.loadQuestions();
    event.target.complete();
  }

  onScroll(event: any) {
    this.showScrollTop = event.detail.scrollTop > 300;
  }

  scrollToTop() {
    if (this.content) {
      this.content.scrollToTop(500);
    }
  }

  async submitAnswer(id: number) {
    if (!this.draftAnswers[id]) return;
    try {
      await this.api.answerQuestion(id, this.draftAnswers[id]);
      this.loadQuestions();
      const toast = await this.toastCtrl.create({
        message: 'Respuesta guardada con éxito',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      toast.present();
    } catch (e) {
      console.error(e);
      const toast = await this.toastCtrl.create({
        message: 'Error al guardar la respuesta',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      toast.present();
    }
  }
}
