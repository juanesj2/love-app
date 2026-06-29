import { Component, EventEmitter, inject, OnInit, OnDestroy, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  closeOutline, 
  airplaneOutline, 
  wineOutline, 
  musicalNotesOutline, 
  starOutline, 
  addCircleOutline,
  trashOutline,
  imageOutline,
  checkboxOutline,
  squareOutline,
  calendarOutline,
  flagOutline
} from 'ionicons/icons';
import { NotificationService } from '../../services/notification.service';
import { LoveApiService } from '../../services/love-api.service';
import { Camera, CameraResultType } from '@capacitor/camera';

@Component({
  selector: 'app-timeline-widget',
  template: `
    <div class="custom-overlay" (click)="close.emit()">
      <div class="timeline-modal-content glass-card" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="timeline-header">
          <div class="close-btn" (click)="close.emit()">
            <ion-icon name="close-outline"></ion-icon>
          </div>
          <h2>Nuestra Historia</h2>
          <p>El pasado, presente y futuro de nosotros.</p>
          
          <div class="tabs">
            <div class="tab" [class.active]="activeTab === 'idea'" (click)="activeTab = 'idea'">
              <ion-icon name="star-outline"></ion-icon> Ideas
            </div>
            <div class="tab" [class.active]="activeTab === 'planned'" (click)="activeTab = 'planned'">
              <ion-icon name="calendar-outline"></ion-icon> Próximos
            </div>
            <div class="tab" [class.active]="activeTab === 'completed'" (click)="activeTab = 'completed'">
              <ion-icon name="flag-outline"></ion-icon> Historia
            </div>
          </div>
        </div>

        <!-- Lista de Planes -->
        <div class="timeline-body">
          <div *ngIf="filteredPlans.length === 0 && !isEditing" class="empty-state">
            No hay planes aquí todavía. ¡Añade uno nuevo!
          </div>

          <div class="plan-card" *ngFor="let plan of filteredPlans" (click)="openPlan(plan)">
            <div class="plan-icon" [ngClass]="getCategoryClass(plan.category)">
              <ion-icon [name]="getCategoryIcon(plan.category)"></ion-icon>
            </div>
            <div class="plan-info">
              <h3>{{ plan.title }}</h3>
              <span class="plan-date" *ngIf="plan.target_date">{{ plan.target_date | date:'longDate' }}</span>
              <div class="plan-countdown" *ngIf="plan.status === 'planned' && plan.target_date">
                {{ getCountdownText(plan.target_date) }}
              </div>
              <div class="plan-countdown completed" *ngIf="plan.status === 'completed' && plan.target_date">
                {{ getDaysAgoText(plan.target_date) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Floating Add Button -->
        <div class="fab-btn" *ngIf="!isEditing" (click)="createNewPlan()">
          <ion-icon name="add-circle-outline"></ion-icon>
        </div>

        <!-- Formulario Editor de Plan -->
        <div class="editor-overlay" *ngIf="isEditing">
          <div class="editor-header">
            <h3 style="margin: 0;">{{ editingPlan.id ? 'Editar Plan' : 'Nuevo Plan' }}</h3>
            <ion-icon name="close-outline" (click)="isEditing = false" style="font-size: 1.5rem;"></ion-icon>
          </div>
          
          <div class="editor-body">
            <label>Título</label>
            <input type="text" class="glass-input" [(ngModel)]="editingPlan.title" placeholder="Ej: Viaje a Roma">
            
            <label>Categoría</label>
            <ion-select class="glass-select" [(ngModel)]="editingPlan.category" interface="popover" [interfaceOptions]="{ cssClass: 'love-popover' }">
              <ion-select-option value="trip">✈️ Viaje</ion-select-option>
              <ion-select-option value="date">🍷 Cita / Restaurante</ion-select-option>
              <ion-select-option value="music">🎵 Concierto / Festival</ion-select-option>
              <ion-select-option value="other">🎢 Otro / Aventura</ion-select-option>
            </ion-select>

            <label>Estado</label>
            <ion-select class="glass-select" [(ngModel)]="editingPlan.status" interface="popover" [interfaceOptions]="{ cssClass: 'love-popover' }">
              <ion-select-option value="idea">💡 Solo es una idea</ion-select-option>
              <ion-select-option value="planned">📅 ¡Ya hay fecha!</ion-select-option>
              <ion-select-option value="completed">✅ Completado</ion-select-option>
            </ion-select>

            <div *ngIf="editingPlan.status !== 'idea'">
              <label>Fecha</label>
              <input type="date" class="glass-input" [(ngModel)]="editingPlan.target_date">
            </div>

            <label>Descripción / Notas</label>
            <textarea class="glass-input" [(ngModel)]="editingPlan.description" rows="3" placeholder="Añade detalles, enlaces o precios..."></textarea>

            <!-- CAMPOS DINÁMICOS SEGÚN CATEGORÍA -->
            <div class="dynamic-section" *ngIf="editingPlan.category === 'trip'">
              <h4 style="margin-top: 20px; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 5px;">🎒 Lista de Equipaje</h4>
              <div class="packing-list">
                <div class="packing-item" *ngFor="let item of editingPlan.dynamic_data?.packing_list; let i = index">
                  <ion-icon 
                    [name]="item.checked ? 'checkbox-outline' : 'square-outline'" 
                    (click)="item.checked = !item.checked"
                    style="font-size: 1.3rem; color: #FF4D6D; cursor: pointer;">
                  </ion-icon>
                  <input type="text" [(ngModel)]="item.name" placeholder="Ej: Pasaporte" class="inline-input" (ngModelChange)="saveLocalDynamicData()">
                  <ion-icon name="trash-outline" (click)="removePackingItem(i)" style="color: #ccc;"></ion-icon>
                </div>
                <button class="small-glass-btn" (click)="addPackingItem()">+ Añadir a la maleta</button>
              </div>
            </div>

            <div class="dynamic-section" *ngIf="editingPlan.category === 'music'">
              <h4 style="margin-top: 20px;">🎫 Entradas</h4>
              <p style="font-size: 0.8rem; color: #666;">Puedes subir una captura de las entradas para tenerlas a mano.</p>
              <button class="small-glass-btn" (click)="uploadTicketPhoto()"><ion-icon name="image-outline"></ion-icon> Subir Entrada</button>
              <div *ngIf="editingPlan.dynamic_data?.ticket_image" class="ticket-preview">
                <img [src]="editingPlan.dynamic_data.ticket_image" style="width: 100%; border-radius: 10px; margin-top: 10px;" />
              </div>
            </div>

            <!-- VINCULAR ÁLBUM (Solo completados) -->
            <div class="dynamic-section" *ngIf="editingPlan.status === 'completed'">
              <h4 style="margin-top: 20px; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 5px;">📸 Vincular Álbum</h4>
              <p style="font-size: 0.8rem; color: #666;">Asocia las fotos de este plan a un álbum de la galería.</p>
              <ion-select class="glass-select" [(ngModel)]="editingPlan.linked_album_id" interface="popover" [interfaceOptions]="{ cssClass: 'love-popover' }" placeholder="Seleccionar álbum">
                <ion-select-option [value]="null">Sin álbum vinculado</ion-select-option>
                <ion-select-option *ngFor="let album of albums" [value]="album.id">{{ album.name }}</ion-select-option>
              </ion-select>
            </div>

          </div>

          <div class="editor-footer">
            <button class="glass-btn danger-btn" *ngIf="editingPlan.id" (click)="deletePlan()">Eliminar</button>
            <button class="glass-btn" (click)="savePlan()">Guardar</button>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .custom-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      display: flex; align-items: flex-end; justify-content: center; z-index: 99999;
    }
    .timeline-modal-content {
      width: 100%; height: 90%; background: #fff0f3;
      border-top-left-radius: 30px; border-top-right-radius: 30px;
      display: flex; flex-direction: column; overflow: hidden; position: relative;
    }
    .timeline-header { padding: 25px 20px 10px; position: relative; background: #fff0f3; z-index: 2; }
    .timeline-header h2 { margin: 0; font-size: 1.8rem; font-weight: 900; color: #590D22; }
    .timeline-header p { margin: 5px 0 20px; color: #a4133c; font-size: 0.9rem; }
    
    .close-btn {
      position: absolute; top: 20px; right: 20px; width: 36px; height: 36px;
      background: rgba(255,255,255,0.8); border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1); cursor: pointer;
    }
    .close-btn ion-icon { font-size: 1.5rem; color: #590D22; }

    .tabs { display: flex; gap: 10px; background: rgba(255,255,255,0.5); padding: 5px; border-radius: 20px; }
    .tab {
      flex: 1; text-align: center; padding: 10px 5px; font-size: 0.85rem; font-weight: 700;
      color: #800f2f; border-radius: 15px; cursor: pointer; transition: 0.3s;
      display: flex; align-items: center; justify-content: center; gap: 5px;
    }
    .tab.active { background: #FF4D6D; color: white; box-shadow: 0 4px 10px rgba(255,77,109,0.3); }

    .timeline-body { flex: 1; overflow-y: auto; padding: 20px; padding-bottom: 80px; }
    .empty-state { text-align: center; color: #a4133c; margin-top: 50px; font-weight: 500; }

    .plan-card {
      background: rgba(255,255,255,0.8); border-radius: 20px; padding: 15px;
      margin-bottom: 15px; display: flex; gap: 15px; align-items: center;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05); cursor: pointer;
    }
    .plan-icon {
      width: 50px; height: 50px; border-radius: 15px; display: flex;
      align-items: center; justify-content: center; font-size: 1.5rem; color: white;
    }
    .plan-icon.cat-trip { background: linear-gradient(135deg, #a2d2ff, #bde0fe); color: #023e8a; }
    .plan-icon.cat-date { background: linear-gradient(135deg, #FF9A9E, #FECFEF); color: #c9184a; }
    .plan-icon.cat-music { background: linear-gradient(135deg, #7209b7, #b5179e); }
    .plan-icon.cat-other { background: linear-gradient(135deg, #ffca3a, #ff9f1c); color: #d62828; }

    .plan-info { flex: 1; overflow: hidden; }
    .plan-info h3 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #590D22; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .plan-date { font-size: 0.8rem; color: #666; display: block; margin-top: 2px; }
    .plan-countdown {
      display: inline-block; background: rgba(255,77,109,0.1); color: #FF4D6D;
      padding: 4px 10px; border-radius: 10px; font-size: 0.75rem; font-weight: 800; margin-top: 5px;
    }
    .plan-countdown.completed { background: rgba(0,0,0,0.05); color: #666; }

    .fab-btn {
      position: absolute; bottom: max(30px, calc(env(safe-area-inset-bottom) + 20px)); right: 20px; width: 60px; height: 60px;
      background: linear-gradient(135deg, #FF4D6D, #c9184a); border-radius: 50%;
      display: flex; align-items: center; justify-content: center; z-index: 100;
      box-shadow: 0 6px 20px rgba(255,77,109,0.4); color: white; font-size: 2.5rem; cursor: pointer;
    }

    /* Editor Overlay */
    .editor-overlay {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: #fff0f3; z-index: 10; display: flex; flex-direction: column;
    }
    .editor-header { padding: 20px; display: flex; justify-content: space-between; align-items: center; color: #590D22; font-weight: 900; font-size: 1.3rem; }
    .editor-body { flex: 1; overflow-y: auto; padding: 0 20px 100px; }
    .editor-body label { display: block; font-weight: 700; color: #800f2f; margin: 15px 0 5px; font-size: 0.9rem; }
    
    .glass-input, .glass-select {
      width: 100%; padding: 14px; border-radius: 12px; border: 2px solid rgba(255,255,255,0.8);
      background: rgba(255,255,255,0.6); font-family: 'Inter', sans-serif; font-size: 0.95rem;
      color: #590D22; --color: #590D22; outline: none; font-weight: 600;
    }
    .glass-input[type="date"] { color-scheme: light; }
    .glass-input[type="date"]::-webkit-calendar-picker-indicator {
      filter: invert(12%) sepia(87%) saturate(3025%) hue-rotate(327deg) brightness(82%) contrast(106%);
      opacity: 0.7; cursor: pointer;
    }
    .editor-footer { padding: 20px; display: flex; gap: 10px; background: rgba(255,255,255,0.8); backdrop-filter: blur(10px); }
    .glass-btn { flex: 1; padding: 15px; border-radius: 15px; border: none; background: #FF4D6D; color: white; font-weight: 800; font-size: 1rem; }
    .danger-btn { background: rgba(255,0,0,0.1); color: red; flex: 0.5; }

    .inline-input { border: none; background: transparent; flex: 1; font-family: 'Inter', sans-serif; color: #590D22; font-weight: 500; font-size: 0.95rem; outline: none; }
    .packing-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05); }
    .small-glass-btn { background: rgba(255,77,109,0.1); color: #FF4D6D; border: none; padding: 8px 15px; border-radius: 10px; font-weight: 700; margin-top: 10px; width: 100%; cursor: pointer; }
    .dynamic-section h4 { color: #590D22; }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class TimelineWidgetComponent implements OnInit, OnDestroy {
  @Input() initialPlanId: number | null = null;
  @Output() close = new EventEmitter<void>();

  private api = inject(LoveApiService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private notificationService = inject(NotificationService);

  activeTab: 'idea' | 'planned' | 'completed' = 'idea';
  plans: any[] = [];
  albums: any[] = [];
  
  isEditing = false;
  editingPlan: any = {};

  constructor() {
    addIcons({ closeOutline, airplaneOutline, wineOutline, musicalNotesOutline, starOutline, addCircleOutline, trashOutline, imageOutline, checkboxOutline, squareOutline, calendarOutline, flagOutline });
  }

  ngOnInit() {
    document.body.classList.add('hide-tabs');
    this.loadPlans();
    this.loadAlbums();
  }

  ngOnDestroy() {
    document.body.classList.remove('hide-tabs');
  }

  get filteredPlans() {
    return this.plans.filter(p => p.status === this.activeTab);
  }

  async loadPlans() {
    try {
      this.plans = await this.api.getPlans();
      this.notificationService.scheduleTripReminders(this.plans);
      if (this.initialPlanId) {
        const p = this.plans.find((x: any) => x.id === this.initialPlanId);
        if (p) {
          this.activeTab = p.status;
          this.openPlan(p);
        }
        this.initialPlanId = null;
      }
    } catch (e) {
      console.error(e);
      this.showToast('Error cargando planes', 'danger');
    }
  }

  async loadAlbums() {
    try {
      this.albums = await this.api.getAlbums();
    } catch (e) {
      console.error(e);
    }
  }

  getCategoryIcon(cat: string) {
    if (cat === 'trip') return 'airplane-outline';
    if (cat === 'date') return 'wine-outline';
    if (cat === 'music') return 'musical-notes-outline';
    return 'star-outline';
  }

  getCategoryClass(cat: string) {
    return `cat-${cat}`;
  }

  createNewPlan() {
    this.editingPlan = {
      title: '',
      description: '',
      category: 'trip',
      status: this.activeTab === 'completed' ? 'idea' : this.activeTab,
      target_date: null,
      dynamic_data: { packing_list: [] }
    };
    this.isEditing = true;
  }

  openPlan(plan: any) {
    this.editingPlan = JSON.parse(JSON.stringify(plan));
    if (this.editingPlan.target_date) {
      try {
        this.editingPlan.target_date = new Date(this.editingPlan.target_date).toISOString().split('T')[0];
      } catch (e) {}
    }
    if (!this.editingPlan.dynamic_data) this.editingPlan.dynamic_data = {};
    if (!this.editingPlan.dynamic_data.packing_list) this.editingPlan.dynamic_data.packing_list = [];
    this.isEditing = true;
  }

  async savePlan() {
    if (!this.editingPlan.title) {
      this.showToast('Ponle un título al plan', 'warning');
      return;
    }
    
    try {
      if (this.editingPlan.id) {
        await this.api.updatePlan(this.editingPlan.id, this.editingPlan);
      } else {
        await this.api.addPlan(this.editingPlan);
      }
      this.isEditing = false;
      this.loadPlans();
      this.showToast('Plan guardado', 'success');
    } catch (e) {
      this.showToast('Error al guardar', 'danger');
    }
  }

  async deletePlan() {
    const alert = await this.alertCtrl.create({
      header: '¿Eliminar Plan?',
      message: 'Se borrará para siempre.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Eliminar', 
          role: 'destructive',
          handler: async () => {
            try {
              await this.api.deletePlan(this.editingPlan.id);
              this.isEditing = false;
              this.loadPlans();
              this.showToast('Plan eliminado', 'medium');
            } catch (e) {
              this.showToast('Error al eliminar', 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  addPackingItem() {
    if (!this.editingPlan.dynamic_data) this.editingPlan.dynamic_data = {};
    if (!this.editingPlan.dynamic_data.packing_list) this.editingPlan.dynamic_data.packing_list = [];
    this.editingPlan.dynamic_data.packing_list.push({ name: '', checked: false });
  }

  removePackingItem(index: number) {
    this.editingPlan.dynamic_data.packing_list.splice(index, 1);
  }

  saveLocalDynamicData() {
    // Para que angular actualice la vista (opcional, ngModel ya lo hace)
  }

  async uploadTicketPhoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.DataUrl,
      });
      if (image.dataUrl) {
        if (!this.editingPlan.dynamic_data) this.editingPlan.dynamic_data = {};
        this.editingPlan.dynamic_data.ticket_image = image.dataUrl;
      }
    } catch (e) {
      console.log(e);
    }
  }

  getCountdownText(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    d.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    const diff = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return '¡Es hoy! 🎉';
    if (diff === 1) return '¡Falta 1 día!';
    if (diff < 0) return 'La fecha ya pasó';
    return `¡Faltan ${diff} días!`;
  }

  getDaysAgoText(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    d.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    const diff = Math.round((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return '¡Hoy!';
    if (diff === 1) return 'Ayer';
    return `Hace ${diff} días`;
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message, duration: 2000, color, position: 'top'
    });
    toast.present();
  }
}
