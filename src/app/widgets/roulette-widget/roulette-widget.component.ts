import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { addIcons } from 'ionicons';
import { closeCircle, addCircleOutline, syncOutline, arrowBack } from 'ionicons/icons';
import { Location } from '@angular/common';

@Component({
  selector: 'app-roulette-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-content class="roulette-content">
      <div class="header">
        <button class="back-btn" (click)="goBack()"><ion-icon name="arrow-back"></ion-icon></button>
        <h2>Ruleta de Citas</h2>
        <p>¿Qué hacemos hoy?</p>
      </div>

      <div class="roulette-container">
        <div class="roulette-wheel" [style.transform]="'rotate(' + currentRotation + 'deg)'" [style.transition]="isSpinning ? 'transform 4s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'">
          <div class="roulette-slice" *ngFor="let option of options; let i = index" [style.transform]="getSliceTransform(i)">
            <svg viewBox="0 0 100 100" class="slice-svg">
              <path [attr.d]="getSlicePath(i)" [attr.fill]="getColor(i)" />
            </svg>
            <div class="slice-text" [style.transform]="getTextTransform(i)">{{ option }}</div>
          </div>
        </div>
        <div class="roulette-pointer"></div>
        <button class="spin-btn" (click)="spin()" [disabled]="isSpinning || options.length < 2">
          GIRAR
        </button>
      </div>

      <div class="winner-display" [class.show]="winner">
        <h3 class="bounce-in">¡{{ winner }}!</h3>
      </div>

      <div class="options-manager">
        <div class="section-title">Opciones de la Ruleta</div>
        
        <div class="options-list">
          <div class="option-item" *ngFor="let opt of options; let i = index">
            <span>{{ opt }}</span>
            <ion-icon name="close-circle" class="delete-icon" (click)="removeOption(i)"></ion-icon>
          </div>
        </div>

        <div class="add-option">
          <input type="text" [(ngModel)]="newOption" placeholder="Añadir nuevo plan..." (keyup.enter)="addOption()" />
          <button (click)="addOption()"><ion-icon name="add-circle-outline"></ion-icon></button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .roulette-content { --background: #fdf5f7; }
    .header { text-align: center; padding: 20px 20px 10px; position: relative; }
    .back-btn { position: absolute; left: 20px; top: 20px; background: rgba(255, 77, 109, 0.1); border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: #590D22; font-size: 1.5rem; cursor: pointer; z-index: 10; }
    .header h2 { color: #590D22; margin: 0 0 5px; font-weight: 800; font-size: 1.8rem; padding-top: 5px; }
    .header p { color: #a4133c; margin: 0; font-size: 0.95rem; }

    .roulette-container { position: relative; width: 300px; height: 300px; margin: 40px auto; display: flex; align-items: center; justify-content: center; }
    
    .roulette-wheel { width: 100%; height: 100%; border-radius: 50%; position: relative; overflow: hidden; border: 8px solid white; box-shadow: 0 10px 25px rgba(255, 77, 109, 0.3); }
    .roulette-slice { position: absolute; width: 100%; height: 100%; top: 0; left: 0; }
    
    .slice-svg { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
    
    .slice-text { position: absolute; top: 50%; left: 50%; transform-origin: 0 0; color: white; font-weight: bold; font-size: 0.85rem; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); white-space: nowrap; max-width: 85px; overflow: hidden; text-overflow: ellipsis; }
    
    .roulette-pointer { position: absolute; top: -15px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 15px solid transparent; border-right: 15px solid transparent; border-top: 30px solid #590D22; z-index: 10; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.2)); }
    
    .spin-btn { position: absolute; width: 80px; height: 80px; background: white; border-radius: 50%; border: 6px solid #FF4D6D; color: #FF4D6D; font-weight: 900; font-size: 1.1rem; box-shadow: 0 4px 15px rgba(0,0,0,0.1); cursor: pointer; z-index: 10; outline: none; transition: transform 0.1s; }
    .spin-btn:active { transform: scale(0.95); }
    .spin-btn[disabled] { opacity: 0.8; cursor: not-allowed; }
    
    .winner-display { text-align: center; height: 60px; margin: 10px 0; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s; }
    .winner-display.show { opacity: 1; }
    .winner-display h3 { color: #590D22; font-size: 1.8rem; font-weight: 900; margin: 0; text-transform: uppercase; text-shadow: 0 2px 10px rgba(255, 77, 109, 0.2); }
    
    @keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); opacity: 1; } 70% { transform: scale(0.9); } 100% { transform: scale(1); opacity: 1; } }
    .bounce-in { animation: bounceIn 0.8s cubic-bezier(0.215, 0.61, 0.355, 1); }
    
    .options-manager { background: white; border-radius: 24px 24px 0 0; padding: 25px 20px; box-shadow: 0 -10px 20px rgba(0,0,0,0.03); margin-top: 20px; min-height: 300px; }
    .section-title { font-size: 1.2rem; font-weight: 800; color: #590D22; margin-bottom: 15px; }
    
    .options-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; max-height: 250px; overflow-y: auto; }
    .option-item { display: flex; justify-content: space-between; align-items: center; background: #fff0f3; padding: 12px 15px; border-radius: 12px; font-weight: 600; color: #333; }
    .delete-icon { color: #FF4D6D; font-size: 1.4rem; cursor: pointer; }
    
    .add-option { display: flex; gap: 10px; }
    .add-option input { flex: 1; background: #f8f9fa; border: 1px solid rgba(0,0,0,0.05); border-radius: 12px; padding: 0 15px; font-size: 1rem; color: #333; outline: none; }
    .add-option input:focus { border-color: #FF4D6D; }
    .add-option button { width: 50px; height: 50px; border-radius: 12px; background: #FF4D6D; color: white; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; }
  `]
})
export class RouletteWidgetComponent implements OnInit {
  private firestore = inject(Firestore);
  private toastCtrl = inject(ToastController);
  private location = inject(Location);
  
  options: string[] = ['Peli y Manta', 'Cena Fuera', 'Cocinar Juntos', 'Masajes', 'Noche de Juegos', 'Paseo Nocturno'];
  newOption = '';
  
  isSpinning = false;
  currentRotation = 0;
  winner: string | null = null;
  
  colors = ['#FF4D6D', '#FF8FA3', '#FFB3C1', '#c9184a', '#a4133c', '#ff758f', '#ffccd5', '#590D22'];

  constructor() {
    addIcons({ closeCircle, addCircleOutline, syncOutline, arrowBack });
  }

  ngOnInit() {
    this.loadOptions();
  }

  async loadOptions() {
    try {
      const docRef = doc(this.firestore, 'locations', 'roulette_options');
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data()['list']) {
        this.options = snap.data()['list'];
      }
    } catch(e) {
      console.error(e);
    }
  }

  async saveOptions() {
    try {
      const docRef = doc(this.firestore, 'locations', 'roulette_options');
      await setDoc(docRef, { list: this.options }, { merge: true });
    } catch(e) {
      console.error(e);
    }
  }

  goBack() {
    this.location.back();
  }

  removeOption(index: number) {
    if (this.options.length <= 2) {
      this.showToast('La ruleta necesita al menos 2 opciones.');
      return;
    }
    this.options.splice(index, 1);
    this.saveOptions();
  }

  addOption() {
    const val = this.newOption.trim();
    if (!val) return;
    if (this.options.length >= 12) {
      this.showToast('Máximo 12 opciones para que quepan en la ruleta.');
      return;
    }
    this.options.push(val);
    this.newOption = '';
    this.saveOptions();
  }

  getColor(index: number) {
    return this.colors[index % this.colors.length];
  }

  getSlicePath(index: number) {
    const numOptions = this.options.length;
    const angle = 360 / numOptions;
    const startAngle = index * angle;
    const endAngle = (index + 1) * angle;

    const startX = 50 + 50 * Math.cos(Math.PI * (startAngle - 90) / 180);
    const startY = 50 + 50 * Math.sin(Math.PI * (startAngle - 90) / 180);
    const endX = 50 + 50 * Math.cos(Math.PI * (endAngle - 90) / 180);
    const endY = 50 + 50 * Math.sin(Math.PI * (endAngle - 90) / 180);

    const largeArcFlag = angle > 180 ? 1 : 0;

    return `M 50 50 L ${startX} ${startY} A 50 50 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  }

  getSliceTransform(index: number) {
    // We already calculate absolute positions in SVG, so the slice div doesn't rotate, just the wheel
    return 'none';
  }

  getTextTransform(index: number) {
    const numOptions = this.options.length;
    const angle = 360 / numOptions;
    const midAngle = (index * angle) + (angle / 2);
    // Position text towards the outer edge of the slice
    const rot = midAngle - 90;
    return `rotate(${rot}deg) translate(55px, 0)`; 
  }

  spin() {
    if (this.isSpinning || this.options.length < 2) return;
    
    this.isSpinning = true;
    this.winner = null;
    
    // Choose a random winner
    const winnerIndex = Math.floor(Math.random() * this.options.length);
    
    const sliceAngle = 360 / this.options.length;
    
    // Calculate the angle required to place the winner slice at the TOP (270 degrees in math, 0 in css transform since it starts at top)
    // The pointer is at the TOP.
    const targetAngle = 360 - (winnerIndex * sliceAngle + sliceAngle / 2);
    
    // Add multiple full rotations (e.g. 5)
    const extraSpins = 360 * 5;
    
    this.currentRotation = this.currentRotation + extraSpins + targetAngle - (this.currentRotation % 360);
    
    setTimeout(() => {
      this.isSpinning = false;
      this.winner = this.options[winnerIndex];
      // Haptic feedback would be cool here!
    }, 4000);
  }

  async showToast(msg: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2000,
      color: 'dark'
    });
    toast.present();
  }
}
