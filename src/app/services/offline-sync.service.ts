import { Injectable, inject } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { LoveApiService } from './love-api.service';
import { ToastController } from '@ionic/angular/standalone';

export interface OfflineAction {
  id?: string;
  type: 'food_place' | 'movie' | 'food_dish' | 'plan';
  method: 'POST' | 'PUT' | 'DELETE';
  endpointId?: number; // For PUT/DELETE
  parentId?: number; // For food_dish
  payload?: any;
  timestamp?: string;
  retryCount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineSyncService {
  private api = inject(LoveApiService);
  private toastCtrl = inject(ToastController);
  private QUEUE_KEY = 'offline_actions_queue';

  constructor() {
    window.addEventListener('online', () => this.syncOfflineQueue());
  }

  async enqueueAction(action: OfflineAction) {
    if (!action.id) action.id = 'off_' + new Date().getTime() + '_' + Math.random().toString(36).substring(2, 9);
    if (!action.timestamp) action.timestamp = new Date().toISOString();
    action.retryCount = 0;

    const queue = await this.getQueue();
    queue.push(action);
    await Preferences.set({ key: this.QUEUE_KEY, value: JSON.stringify(queue) });
    this.showToast('Sin conexión. Guardado localmente, se subirá al conectarse.', 'warning');
  }

  private async getQueue(): Promise<OfflineAction[]> {
    const { value } = await Preferences.get({ key: this.QUEUE_KEY });
    return value ? JSON.parse(value) : [];
  }

  private async clearQueue() {
    await Preferences.remove({ key: this.QUEUE_KEY });
  }

  async syncOfflineQueue() {
    const queue = await this.getQueue();
    if (queue.length === 0) return;

    this.showToast('Sincronizando datos guardados sin conexión...', 'primary');
    
    const failedActions: OfflineAction[] = [];
    let syncedCount = 0;

    for (const action of queue) {
      try {
        if (action.type === 'food_place') {
          const p = action.payload;
          if (action.method === 'POST') await this.api.addFoodPlace(p.name, p.location, p.rating, p.description, p.imageBase64, p.category, p.is_favorite);
          else if (action.method === 'PUT') await this.api.updateFoodPlace(action.endpointId!, p.name, p.location, p.rating, p.description, p.imageBase64, p.category, p.is_favorite);
          else if (action.method === 'DELETE') await this.api.deleteFoodPlace(action.endpointId!);
        } else if (action.type === 'movie') {
          const p = action.payload;
          if (action.method === 'POST') await this.api.addMovie(p.title, p.rating, p.who_fell_asleep, p.favorite_quote, p.imageBase64, p.description, p.genre, p.is_favorite);
          else if (action.method === 'PUT') await this.api.updateMovie(action.endpointId!, p.title, p.rating, p.who_fell_asleep, p.favorite_quote, p.imageBase64, p.description, p.genre, p.is_favorite);
          else if (action.method === 'DELETE') await this.api.deleteMovie(action.endpointId!);
        } else if (action.type === 'plan') {
          if (action.method === 'POST') await this.api.addPlan(action.payload);
          else if (action.method === 'PUT') await this.api.updatePlan(action.endpointId!, action.payload);
          else if (action.method === 'DELETE') await this.api.deletePlan(action.endpointId!);
        }
        syncedCount++;
      } catch (error) {
        console.error('Error syncing action:', action, error);
        action.retryCount = (action.retryCount || 0) + 1;
        // Keep in queue if failed less than 5 times
        if (action.retryCount < 5) {
          failedActions.push(action);
        } else {
          console.warn('Action discarded after 5 failed retries:', action);
        }
      }
    }

    if (failedActions.length === 0) {
      await this.clearQueue();
      if (syncedCount > 0) this.showToast('¡Todo sincronizado!', 'success');
      window.dispatchEvent(new CustomEvent('offline-sync-complete'));
    } else {
      await Preferences.set({ key: this.QUEUE_KEY, value: JSON.stringify(failedActions) });
      this.showToast(`Sincronizados ${syncedCount}, ${failedActions.length} fallaron y se reintentarán.`, 'danger');
      window.dispatchEvent(new CustomEvent('offline-sync-complete'));
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
