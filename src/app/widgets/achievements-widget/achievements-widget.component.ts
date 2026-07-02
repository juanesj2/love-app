import { Component, inject, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, ToastController, IonSegment, IonSegmentButton, IonLabel } from '@ionic/angular/standalone';
import { Location } from '@angular/common';
import { addIcons } from 'ionicons';
import { arrowBack, trophyOutline, lockClosedOutline, sparklesOutline, helpCircleOutline, alertCircleOutline, searchOutline, heartCircleOutline, colorPaletteOutline, flameOutline, cameraOutline, moonOutline, restaurantOutline, filmOutline, chatbubblesOutline, apertureOutline, happyOutline, earthOutline } from 'ionicons/icons';
import { DotLottie } from '@lottiefiles/dotlottie-web';
import { LoveApiService } from '../../services/love-api.service';

@Component({
  selector: 'app-achievements-widget',
  template: `
    <ion-content class="scroll-content">
      <div class="achievements-container">
        <div class="header">
          <button class="back-btn" (click)="goBack()">
            <ion-icon name="arrow-back"></ion-icon>
          </button>
          <h2 (click)="onTitleClick()">Logros y Secretos <span class="secret-trophy" (click)="unlockTrophySecret(); $event.stopPropagation()">🏆</span></h2>
          <p>Explora la app para descubrirlos todos</p>
        </div>

        <div class="filter-container" *ngIf="!isLoading && achievementsList.length > 0">
          <ion-segment [(ngModel)]="filterMode" (ionChange)="applyFilter()" mode="ios">
            <ion-segment-button value="all">
              <ion-label>Todos</ion-label>
            </ion-segment-button>
            <ion-segment-button value="unlocked">
              <ion-label>Logrados</ion-label>
            </ion-segment-button>
            <ion-segment-button value="locked">
              <ion-label>Secretos</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>

        <div class="achievements-grid" *ngIf="!isLoading && displayedAchievements.length > 0">
          <div class="achievement-card" *ngFor="let act of displayedAchievements" [class.unlocked]="act.unlocked" [class.locked]="!act.unlocked">
            <div class="icon-container">
              <ion-icon [name]="act.unlocked ? act.icon : 'lock-closed-outline'"></ion-icon>
            </div>
            <div class="info">
              <h3>{{ act.unlocked ? act.title : '???' }}</h3>
              <p>{{ act.unlocked ? act.description : 'Sigue explorando para descubrir este logro secreto.' }}</p>
              <span class="date" *ngIf="act.unlocked">{{ act.unlockedAt | date:'mediumDate' }}</span>
              
              <!-- Hints Area (Only if locked) -->
              <div class="hints-section" *ngIf="!act.unlocked && act.hints?.length > 0">
                <div class="hint-item" *ngFor="let hint of act.hints; let i = index">
                  <p *ngIf="isHintUnlocked(act.id, i)">💡 Pista {{ i + 1 }}: {{ hint }}</p>
                </div>
                
                <button class="hint-btn" *ngIf="!hasUnlockedAllHints(act)" (click)="requestHint(act.id)">
                  <ion-icon name="help-circle-outline"></ion-icon> Revelar Pista ({{ getUnlockedHintsCount(act.id) }}/{{ act.hints.length }})
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="!isLoading && achievementsList.length > 0 && displayedAchievements.length === 0">
          <ion-icon name="search-outline" style="font-size: 3rem; color: #ff4d6d;"></ion-icon>
          <h3 style="color: #800f2f;">No hay logros aquí</h3>
          <p style="color: #800f2f; opacity: 0.8;">Sigue explorando para rellenar esta sección.</p>
        </div>

        <div class="empty-state" *ngIf="!isLoading && achievementsList.length === 0">
          <ion-icon name="alert-circle-outline"></ion-icon>
          <h3>No se pudieron cargar los logros</h3>
          <p>¿Seguro que el backend está actualizado? Asegúrate de haber hecho git pull y de haber insertado los logros en la base de datos.</p>
          <button class="primary-btn" (click)="loadAchievements()">Reintentar</button>
        </div>

        <div class="loading-state" *ngIf="isLoading">
          <div class="spinner"></div>
          <p>Cargando secretos...</p>
        </div>

        <!-- Winner Lottie Overlay -->
        <div class="winner-overlay" *ngIf="showWinnerLottie">
          <div class="winner-content">
            <canvas #winnerLottie width="300" height="300"></canvas>
            <h2 class="winner-message">{{ winnerMessage }}</h2>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .scroll-content { --background: #fff0f3; }
    .achievements-container { padding: 20px; padding-bottom: 80px; min-height: 100vh; position: relative; }
    
    .winner-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); z-index: 5000; display: flex; flex-direction: column; align-items: center; justify-content: center; animation: fadeIn 0.3s; }
    .winner-content { text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .winner-content canvas { width: 300px; height: 300px; max-width: 90vw; margin-bottom: 20px; }
    .winner-message { color: white; font-size: 1.5rem; font-weight: 800; text-shadow: 0 4px 10px rgba(0,0,0,0.5); max-width: 80%; line-height: 1.3; animation: slideUpPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUpPop { 0% { transform: translateY(30px) scale(0.9); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }

    .header { text-align: center; margin-bottom: 20px; margin-top: 10px; position: relative; padding-top: 45px; }
    .header h2 { font-size: 2rem; font-weight: 800; color: #800f2f; margin: 0; }
    .header p { color: #a4133c; margin-top: 5px; font-weight: 500; }
    .secret-trophy { display: inline-block; cursor: pointer; transition: transform 0.2s; user-select: none; }
    .secret-trophy:active { transform: scale(0.8); }
    .back-btn { position: absolute; left: 0; top: 0; background: rgba(255, 143, 163, 0.2); border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: #800f2f; font-size: 1.5rem; backdrop-filter: blur(5px); z-index: 10; cursor: pointer; transition: background 0.3s ease; }
    .back-btn:active { background: rgba(255, 143, 163, 0.4); }

    .filter-container { margin-bottom: 20px; padding: 0 5px; }
    ion-segment { 
      background: rgba(255, 255, 255, 0.8); 
      border-radius: 12px; 
      padding: 4px;
    }
    ion-segment-button {
      --color: #800f2f;
      --color-checked: #ffffff;
      --indicator-color: #ff4d6d;
      font-weight: 600;
      min-height: 40px;
    }

    .achievements-grid { display: flex; flex-direction: column; gap: 15px; }
    .achievement-card { display: flex; gap: 15px; background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(10px); border-radius: 16px; padding: 15px; border: 1px solid rgba(255, 255, 255, 0.8); box-shadow: 0 4px 15px rgba(0,0,0,0.05); transition: all 0.3s ease; }
    .achievement-card.locked { opacity: 0.85; background: rgba(255, 255, 255, 0.3); border: 1px dashed rgba(164, 19, 60, 0.3); }
    .achievement-card.unlocked { background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,228,235,0.9)); border: 1px solid rgba(255, 143, 163, 0.5); align-items: center; }
    
    .icon-container { width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; margin-top: 5px; }
    .locked .icon-container { background: rgba(0,0,0,0.05); color: #888; }
    .unlocked .icon-container { background: #ff4d6d; color: white; box-shadow: 0 4px 10px rgba(255, 77, 109, 0.4); margin-top: 0; }
    
    .info { flex-grow: 1; display: flex; flex-direction: column; }
    .info h3 { margin: 0; font-size: 1.1rem; color: #800f2f; font-weight: 700; }
    .info p { margin: 4px 0 0; font-size: 0.85rem; color: #555; line-height: 1.3; }
    .date { font-size: 0.75rem; color: #ff4d6d; margin-top: 5px; font-weight: 600; }

    /* Hints Section */
    .hints-section { margin-top: 15px; border-top: 1px dashed rgba(164, 19, 60, 0.2); padding-top: 10px; }
    .hint-item p { margin: 0 0 5px 0; font-size: 0.85rem; color: #800f2f; background: rgba(255, 255, 255, 0.5); padding: 5px 10px; border-radius: 8px; font-weight: 500; font-style: italic; }
    .hint-btn { margin-top: 5px; background: rgba(255, 77, 109, 0.1); color: #ff4d6d; border: 1px solid rgba(255, 77, 109, 0.3); border-radius: 20px; padding: 6px 15px; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 5px; cursor: pointer; transition: all 0.2s; }
    .hint-btn:active { background: rgba(255, 77, 109, 0.2); transform: scale(0.95); }

    .empty-state { text-align: center; margin-top: 50px; color: #800f2f; }
    .empty-state ion-icon { font-size: 3rem; color: #ff4d6d; margin-bottom: 10px; }
    .empty-state h3 { font-weight: 800; font-size: 1.2rem; }
    .empty-state p { font-size: 0.9rem; opacity: 0.8; max-width: 80%; margin: 10px auto 20px; }
    .primary-btn { background: #ff4d6d; color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer; }
    
    .loading-state { text-align: center; margin-top: 50px; color: #ff4d6d; }
    .spinner { border: 4px solid rgba(255, 77, 109, 0.2); border-top: 4px solid #ff4d6d; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 10px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    :host-context(.night-owl-mode) .scroll-content { --background: #121212; }
    :host-context(.night-owl-mode) .header h2 { color: #fdfdfd; }
    :host-context(.night-owl-mode) .header p { color: #ccc; }
    :host-context(.night-owl-mode) .back-btn { background: #222; color: #fdfdfd; }
    :host-context(.night-owl-mode) .back-btn:active { background: #333; }
    :host-context(.night-owl-mode) ion-segment { background: rgba(30, 30, 30, 0.8); }
    :host-context(.night-owl-mode) ion-segment-button { --color: #999; --color-checked: #a78bfa; --indicator-color: #222; }
    :host-context(.night-owl-mode) .achievement-card { background: #1a1a1a; border-color: rgba(255,255,255,0.05); }
    :host-context(.night-owl-mode) .achievement-card.locked { background: rgba(30,30,30,0.5); border-color: rgba(167,139,250,0.3); }
    :host-context(.night-owl-mode) .achievement-card.unlocked { background: rgba(30,30,30,0.85); border-color: rgba(167,139,250,0.5); }
    :host-context(.night-owl-mode) .locked .icon-container { background: #222; color: #555; }
    :host-context(.night-owl-mode) .unlocked .icon-container { background: #a78bfa; box-shadow: 0 4px 10px rgba(167,139,250,0.4); color: white; }
    :host-context(.night-owl-mode) .info h3 { color: #fdfdfd; }
    :host-context(.night-owl-mode) .info p { color: #aaa; }
    :host-context(.night-owl-mode) .date { color: #c4b5fd; }
    :host-context(.night-owl-mode) .hint-item p { color: #fdfdfd; background: #222; }
    :host-context(.night-owl-mode) .hint-btn { background: #1a1a1a; color: #a78bfa; border-color: #a78bfa; }
    :host-context(.night-owl-mode) .hint-btn:active { background: #222; }
    :host-context(.night-owl-mode) .empty-state ion-icon { color: #a78bfa; }
    :host-context(.night-owl-mode) .empty-state h3 { color: #fdfdfd; }
    :host-context(.night-owl-mode) .empty-state p { color: #ccc; }
    :host-context(.night-owl-mode) .primary-btn { background: #a78bfa; }
    :host-context(.night-owl-mode) .loading-state { color: #a78bfa; }
    :host-context(.night-owl-mode) .spinner { border-color: rgba(167,139,250,0.2); border-top-color: #a78bfa; }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonSegment, IonSegmentButton, IonLabel]
})
export class AchievementsWidgetComponent implements OnInit {
  private api = inject(LoveApiService);
  private location = inject(Location);
  private toastCtrl = inject(ToastController);

  private cdr = inject(ChangeDetectorRef);

  achievementsList: any[] = [];
  displayedAchievements: any[] = [];
  unlockedHintsList: any[] = [];
  filterMode: 'all' | 'unlocked' | 'locked' = 'all';
  isLoading: boolean = true;
  
  // Variables para secretos
  titleClickCount: number = 0;
  titleClickTimer: any;

  // Variables para Lottie
  showWinnerLottie: boolean = false;
  winnerMessage: string = '';
  @ViewChild('winnerLottie') winnerLottie?: ElementRef<HTMLCanvasElement>;
  private dotLottieInstance: DotLottie | null = null;

  constructor() {
    addIcons({ 
      arrowBack, trophyOutline, lockClosedOutline, sparklesOutline, helpCircleOutline, alertCircleOutline,
      searchOutline, heartCircleOutline, colorPaletteOutline, flameOutline, cameraOutline, moonOutline,
      restaurantOutline, filmOutline, chatbubblesOutline, apertureOutline, happyOutline, earthOutline
    });
  }

  ngOnInit() {
    this.loadAchievements();
    this.checkNightSecret();
    // Intenta desbloquear curious_click (si falla no pasa nada)
    this.api.unlockAchievement('curious_click').then(() => this.loadAchievements()).catch(() => {});
  }

  checkNightSecret() {
    const hour = new Date().getHours();
    // Entre las 2:00 AM y las 4:59 AM
    if (hour >= 2 && hour < 5) {
      this.unlockSecretSilent('secret_owl', '🦉 ¡Eres todo un búho nocturno!');
    }
  }

  async loadAchievements() {
    this.isLoading = true;
    try {
      const data = await this.api.getAchievements();
      if (data && data.achievements) {
        // Mapear los datos que vienen del backend
        const all = data.achievements;
        const unlockedActs = data.unlocked_achievements || [];
        this.unlockedHintsList = data.unlocked_hints || [];

        this.achievementsList = all.map((act: any) => {
          const found = unlockedActs.find((u: any) => u.achievement_id === act.id);
          return {
            ...act,
            unlocked: !!found,
            unlockedAt: found ? found.unlocked_at : null
          };
        });
        
        this.applyFilter();
      }
    } catch (e) {
      console.error('Error fetching achievements', e);
    } finally {
      this.isLoading = false;
    }
  }

  applyFilter() {
    let sorted = [...this.achievementsList].sort((a, b) => {
      // Unlocked first
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      return 0;
    });

    if (this.filterMode === 'unlocked') {
      this.displayedAchievements = sorted.filter(a => a.unlocked);
    } else if (this.filterMode === 'locked') {
      this.displayedAchievements = sorted.filter(a => !a.unlocked);
    } else {
      this.displayedAchievements = sorted;
    }
  }

  isHintUnlocked(achievementId: string, index: number): boolean {
    return this.unlockedHintsList.some(h => h.achievement_id === achievementId && h.hint_index === index);
  }

  getUnlockedHintsCount(achievementId: string): number {
    return this.unlockedHintsList.filter(h => h.achievement_id === achievementId).length;
  }

  hasUnlockedAllHints(act: any): boolean {
    if (!act.hints) return true;
    return this.getUnlockedHintsCount(act.id) >= act.hints.length;
  }

  async requestHint(achievementId: string) {
    try {
      const res = await this.api.unlockHint(achievementId);
      if (res && res.success) {
        this.unlockedHintsList.push(res.hint);
        const toast = await this.toastCtrl.create({
          message: '💡 ¡Nueva pista revelada!',
          duration: 3000,
          color: 'success',
          position: 'top'
        });
        toast.present();
      }
    } catch (e: any) {
      console.error('Error requesting hint', e);
      let msg = 'Hubo un error al pedir la pista.';
      if (e.error && e.error.message) {
        msg = e.error.message;
      }
      const toast = await this.toastCtrl.create({
        message: msg,
        duration: 4000,
        color: 'warning',
        position: 'top',
        icon: 'lock-closed-outline'
      });
      toast.present();
    }
  }

  async unlockTrophySecret() {
    this.unlockSecretSilent('trophy_secret', '🏆 ¡Logro Desbloqueado: Trofeo Secreto!');
  }

  onTitleClick() {
    this.titleClickCount++;
    clearTimeout(this.titleClickTimer);
    
    if (this.titleClickCount >= 10) {
      this.titleClickCount = 0;
      this.unlockSecretSilent('secret_spammer', '👆 ¡Logro Desbloqueado: Dedo Inquieto!');
    } else {
      this.titleClickTimer = setTimeout(() => {
        this.titleClickCount = 0;
      }, 1500); // 1.5s para seguir tocando
    }
  }

  private playWinnerAnimation(message: string) {
    this.winnerMessage = message;
    this.showWinnerLottie = true;
    this.cdr.detectChanges(); // Forzar dibujado del div y canvas

    setTimeout(() => {
      if (this.dotLottieInstance) {
        this.dotLottieInstance.destroy();
      }
      
      if (this.winnerLottie?.nativeElement) {
        this.dotLottieInstance = new DotLottie({
          canvas: this.winnerLottie.nativeElement,
          src: 'assets/lottie/Winner.lottie',
          loop: false,
          autoplay: true
        });

        // Ocultar la animación después de 3.5 segundos
        setTimeout(() => {
          this.showWinnerLottie = false;
          if (this.dotLottieInstance) {
            this.dotLottieInstance.destroy();
            this.dotLottieInstance = null;
          }
        }, 3500);
      }
    }, 50);
  }

  async unlockSecretSilent(achievementId: string, successMessage: string) {
    const hasSecret = this.achievementsList.find(a => a.id === achievementId)?.unlocked;
    if (hasSecret) return;

    try {
      const res = await this.api.unlockAchievement(achievementId);
      if (res && res.newly_unlocked) {
        this.playWinnerAnimation(successMessage);
        this.loadAchievements();
      }
    } catch (e) {
      // Ignorar
      console.error('Error unlocking secret', achievementId, e);
    }
  }

  goBack() {
    this.location.back();
  }
}
