import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon, ToastController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { LoveApiService } from '../../services/love-api.service';
import { Location } from '@angular/common';
import { addIcons } from 'ionicons';
import { arrowBack, trophyOutline, lockClosedOutline, sparklesOutline } from 'ionicons/icons';

@Component({
  selector: 'app-achievements-widget',
  template: `
    <ion-content class="scroll-content">
      <div class="achievements-container">
        <div class="header">
          <button class="back-btn" (click)="goBack()">
            <ion-icon name="arrow-back"></ion-icon>
          </button>
          <h2>Logros y Secretos 🏆</h2>
          <p>Explora la app para descubrirlos todos</p>
        </div>

        <div class="achievements-grid">
          <div class="achievement-card" *ngFor="let act of achievementsList" [class.unlocked]="act.unlocked" [class.locked]="!act.unlocked">
            <div class="icon-container">
              <ion-icon [name]="act.unlocked ? act.icon : 'lock-closed-outline'"></ion-icon>
            </div>
            <div class="info">
              <h3>{{ act.unlocked ? act.title : '???' }}</h3>
              <p>{{ act.unlocked ? act.description : 'Sigue explorando para descubrir este logro secreto.' }}</p>
              <span class="date" *ngIf="act.unlocked">{{ act.unlockedAt | date:'mediumDate' }}</span>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .scroll-content { --background: #fff0f3; }
    .achievements-container { padding: 20px; padding-bottom: 80px; min-height: 100vh; position: relative; }
    
    .header { text-align: center; margin-bottom: 30px; margin-top: 10px; position: relative; }
    .header h2 { font-size: 2rem; font-weight: 800; color: #800f2f; margin: 0; margin-top: 15px; }
    .header p { color: #a4133c; margin-top: 5px; font-weight: 500; }
    .back-btn { position: absolute; left: 0; top: 0; background: rgba(255, 143, 163, 0.2); border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: #800f2f; font-size: 1.5rem; backdrop-filter: blur(5px); z-index: 10; cursor: pointer; transition: background 0.3s ease; }
    .back-btn:active { background: rgba(255, 143, 163, 0.4); }

    .achievements-grid { display: flex; flex-direction: column; gap: 15px; }
    .achievement-card { display: flex; gap: 15px; background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(10px); border-radius: 16px; padding: 15px; border: 1px solid rgba(255, 255, 255, 0.8); box-shadow: 0 4px 15px rgba(0,0,0,0.05); align-items: center; transition: all 0.3s ease; }
    .achievement-card.locked { opacity: 0.7; background: rgba(255, 255, 255, 0.3); border: 1px dashed rgba(164, 19, 60, 0.3); }
    .achievement-card.unlocked { background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,228,235,0.9)); border: 1px solid rgba(255, 143, 163, 0.5); }
    
    .icon-container { width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; }
    .locked .icon-container { background: rgba(0,0,0,0.05); color: #888; }
    .unlocked .icon-container { background: #ff4d6d; color: white; box-shadow: 0 4px 10px rgba(255, 77, 109, 0.4); }
    
    .info { flex-grow: 1; display: flex; flex-direction: column; }
    .info h3 { margin: 0; font-size: 1.1rem; color: #800f2f; font-weight: 700; }
    .info p { margin: 4px 0 0; font-size: 0.85rem; color: #555; line-height: 1.3; }
    .date { font-size: 0.75rem; color: #ff4d6d; margin-top: 5px; font-weight: 600; }
  `],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon]
})
export class AchievementsWidgetComponent implements OnInit {
  private api = inject(LoveApiService);
  private location = inject(Location);
  private toastCtrl = inject(ToastController);

  achievementsList = [
    { id: 'curious_click', title: 'Curioso', description: 'Has encontrado el menú de logros.', icon: 'sparkles-outline', unlocked: false, unlockedAt: null },
    { id: 'explorer_poke', title: 'Explorador', description: 'Has mandado un zumbido intenso (10 toques).', icon: 'sparkles-outline', unlocked: false, unlockedAt: null },
    { id: 'first_drawing', title: 'Artista', description: 'Has jugado al reto de dibujo por primera vez.', icon: 'sparkles-outline', unlocked: false, unlockedAt: null },
    { id: 'cupid_swipe', title: 'Cupido', description: 'Has completado 5 rondas del Tinder de pareja.', icon: 'sparkles-outline', unlocked: false, unlockedAt: null }
  ];

  constructor() {
    addIcons({ arrowBack, trophyOutline, lockClosedOutline, sparklesOutline });
  }

  ngOnInit() {
    this.loadAchievements();
    this.api.unlockAchievement('curious_click');
  }

  async loadAchievements() {
    try {
      const unlocked = await this.api.getAchievements();
      if (Array.isArray(unlocked)) {
        this.achievementsList = this.achievementsList.map(act => {
          const found = unlocked.find((u: any) => u.achievement_id === act.id);
          if (found) {
            return { ...act, unlocked: true, unlockedAt: found.unlocked_at };
          }
          return act;
        });
      }
    } catch (e) {
      console.error('Error fetching achievements', e);
    }
  }

  goBack() {
    this.location.back();
  }
}
