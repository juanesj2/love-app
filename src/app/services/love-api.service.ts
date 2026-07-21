import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastController } from '@ionic/angular/standalone';
import { Preferences } from '@capacitor/preferences';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { firstValueFrom, BehaviorSubject, Subject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

export const API_BASE_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class LoveApiService {
  private http = inject(HttpClient);
  private toastCtrl = inject(ToastController);
  private router = inject(Router);
  public token$ = new BehaviorSubject<string | null>(null);
  public unlockedAchievements$ = new BehaviorSubject<string[]>([]);
  public inventory$ = new BehaviorSubject<any>({ gifts: false, letters: false, spicy_pack: false });
  public avatarUpdated$ = new Subject<void>();
  
  constructor() {
    this.loadToken();
  }

  private async loadToken() {
    const { value } = await SecureStoragePlugin.get({ key: 'auth_token' }).catch(() => ({ value: null }));
    if (value) {
      this.token$.next(value);
    }
  }



  async sendStreakReminder(): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/remind-streak`, {}));
  }

  async reviveStreak(usePaid: boolean = false): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/revive-streak`, { use_paid: usePaid }));
  }

  async purchaseRevivalPack(): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/purchase-revival-pack`, {}));
  }

  async storePurchase(data: any): Promise<any> {
    const payload = typeof data === 'string' ? { item: data } : data;
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/store/purchase`, payload));
  }

  async sendCustomNotification(title: string, body: string): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/custom-notification`, { title, body }));
  }

  // --- Achievements ---

  async getAchievements(): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${API_BASE_URL}/love-album/achievements`));
  }

  async unlockHint(achievementId: string): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/achievements/hints/unlock`, { achievement_id: achievementId }));
  }

  async unlockAchievement(achievementId: string): Promise<any> {
    try {
      const res: any = await firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/achievements/unlock`, { achievement_id: achievementId }));
      if (res && res.newly_unlocked) {
        const toast = await this.toastCtrl.create({
          message: `🏆 ¡Logro Desbloqueado! Ve a 'Más' para verlo.`,
          duration: 4000,
          position: 'top',
          color: 'warning',
          buttons: [{ text: 'Ver', role: 'cancel', handler: () => { this.router.navigate(['/achievements']); } }]
        });
        toast.present();
      }
      return res;
    } catch (error) {
      console.error('Error unlocking achievement:', error);
      throw error;
    }
  }

  // --- Buzón Secreto (Cartitas de Amor) ---
  
  async getSecretNotes(): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${API_BASE_URL}/love-album/secret-notes`));
  }

  async saveSecretNote(content: string): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/secret-notes`, { content }));
  }

  async deleteSecretNote(id: number): Promise<any> {
    return firstValueFrom(this.http.delete(`${API_BASE_URL}/love-album/secret-notes/${id}`));
  }

  // --- Estadísticas Secretas ---
  async getSecretStats(): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${API_BASE_URL}/love-album/secret-stats`));
  }

  // --- AUTH ---
  async login(email: string, password: string): Promise<any> {
    const res: any = await firstValueFrom(this.http.post(`${API_BASE_URL}/login`, { email, password }, { headers: { 'Accept': 'application/json' } }));
    const token = res?.access_token || res?.token;
    if (token) {
      await Preferences.set({ key: 'auth_token', value: token });
      SecureStoragePlugin.set({ key: 'auth_token', value: token }).catch(() => {}); // Don't await to prevent Android keystore hang
      this.token$.next(token);
    }
    return res;
  }

  async googleLogin(email: string, name: string, uid: string): Promise<any> {
    const res: any = await firstValueFrom(this.http.post(`${API_BASE_URL}/google-login`, { email, name, uid }, { headers: { 'Accept': 'application/json' } }));
    const token = res?.access_token || res?.token;
    if (token) {
      await Preferences.set({ key: 'auth_token', value: token });
      SecureStoragePlugin.set({ key: 'auth_token', value: token }).catch(() => {}); // Don't await
      this.token$.next(token);
    }
    return res;
  }

  async register(data: {name: string, email: string, password: string, password_confirmation: string, app: string}): Promise<any> {
    const res: any = await firstValueFrom(this.http.post(`${API_BASE_URL}/register`, data, { headers: { 'Accept': 'application/json' } }));
    const token = res?.access_token || res?.token;
    if (token) {
      await Preferences.set({ key: 'auth_token', value: token });
      SecureStoragePlugin.set({ key: 'auth_token', value: token }).catch(() => {}); // Don't await
      this.token$.next(token);
    }
    return res;
  }

  async getMe(): Promise<any> {
    return firstValueFrom(this.http.get(`${API_BASE_URL}/usuario`));
  }

  async pair(pairingCode: string): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/pair`, { pairing_code: pairingCode }));
  }

  async forgotPassword(email: string): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/forgot-password`, { email }));
  }

  async logout(): Promise<void> {
    try {
      // Intentar invalidar la sesion en el backend para borrar cookies de Sanctum
      await firstValueFrom(this.http.post(`${API_BASE_URL}/logout`, {}).pipe(catchError(() => of(null))));
    } catch (e) {}

    try {
      // Limpiar cookies de Capacitor para evitar que Sanctum nos redirija a /home en el proximo login
      const { CapacitorCookies } = await import('@capacitor/core');
      await CapacitorCookies.clearAllCookies();
    } catch (e) {}

    await Preferences.remove({ key: 'auth_token' });
    await SecureStoragePlugin.remove({ key: 'auth_token' }).catch(() => {});
    this.token$.next(null);
  }

  async unpair(): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/unpair`, {}));
  }

  async deleteAccount(): Promise<any> {
    return firstValueFrom(this.http.delete(`${API_BASE_URL}/usuario`));
  }

  // --- INFO Y POKE ---
  async getCoupleInfo(): Promise<any> {
    const date = new Date();
    const localDate = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    const res = await firstValueFrom(this.http.get<any>(`${API_BASE_URL}/love-album/info?local_date=${localDate}`));
    if (res && res.unlocked_achievements) {
      this.unlockedAchievements$.next(res.unlocked_achievements);
    }
    if (res && res.couple && res.couple.inventory) {
      this.inventory$.next(res.couple.inventory);
    }
    return res;
  }

  async uploadAvatar(base64Image: string): Promise<any> {
    const res = await firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/avatar`, { avatar: base64Image }));
    this.avatarUpdated$.next();
    return res;
  }

  async getRouletteOptions(): Promise<any> {
    return firstValueFrom(this.http.get(`${API_BASE_URL}/love-album/roulette`));
  }

  async updateRouletteOptions(options: string[]): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/roulette`, { options }));
  }

  async updateCoupleInfo(data: any): Promise<any> {
    const res = await firstValueFrom(this.http.put<any>(`${API_BASE_URL}/love-album/info`, data));
    this.avatarUpdated$.next();
    return res;
  }

  async sendPoke(isSuper: boolean = false): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${API_BASE_URL}/love-album/poke`, { is_super: isSuper }));
  }

  async getAllUsers(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${API_BASE_URL}/love-album/global-events/users`));
  }

  // --- TIMELINE Y PLANES ---
  async getPlans(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${API_BASE_URL}/love-album/plans`));
  }

  async addPlan(data: any): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${API_BASE_URL}/love-album/plans`, data));
  }

  async updatePlan(id: number, data: any): Promise<any> {
    return firstValueFrom(this.http.put<any>(`${API_BASE_URL}/love-album/plans/${id}`, data));
  }

  async deletePlan(id: number): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${API_BASE_URL}/love-album/plans/${id}`));
  }

  // --- PREGUNTAS MINIJUEGO ---
  async getQuestions(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${API_BASE_URL}/love-album/questions`));
  }

  async saveFcmToken(token: string): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${API_BASE_URL}/love-album/save-fcm-token`, { token }));
  }

  async updateNotificationSound(sound: string): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${API_BASE_URL}/love-album/notification-sound`, { sound }));
  }

  async answerQuestion(id: number, answer: string): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${API_BASE_URL}/love-album/questions/${id}/answer`, { answer }));
  }

  // --- FOTOGRAFÍAS ---
  async getPhotos(albumId?: number, page: number = 1, targetMonth?: string): Promise<any> {
    let url = `${API_BASE_URL}/love-album/photos?page=${page}`;
    if (albumId) {
      url += `&album_id=${albumId}`;
    }
    if (targetMonth) {
      url += `&target_month=${targetMonth}`;
    }
    return firstValueFrom(this.http.get<any>(url));
  }

  async getTimeline(albumId?: number): Promise<any> {
    let url = `${API_BASE_URL}/love-album/photos/timeline`;
    if (albumId) {
      url += `?album_id=${albumId}`;
    }
    return firstValueFrom(this.http.get<any>(url));
  }

  async downloadPhotoBlob(id: number): Promise<Blob> {
    return firstValueFrom(this.http.get(`${API_BASE_URL}/love-album/photos/${id}/download`, { responseType: 'blob' }));
  }

  // --- ALBUMES PERSONALIZADOS ---
  async getAlbums(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${API_BASE_URL}/love-album/albums`));
  }

  async createAlbum(name: string): Promise<any> {
    const res: any = await firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/albums`, { name }));
    return res.album;
  }

  async updateAlbum(id: number, name: string): Promise<any> {
    const res: any = await firstValueFrom(this.http.put(`${API_BASE_URL}/love-album/albums/${id}`, { name }));
    return res.album;
  }

  async deleteAlbum(id: number): Promise<any> {
    return firstValueFrom(this.http.delete(`${API_BASE_URL}/love-album/albums/${id}`));
  }

  async uploadAlbumCover(albumId: number, base64Image: string): Promise<any> {
    const res: any = await firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/albums/${albumId}/cover`, { image: base64Image }));
    return res.album;
  }

  async uploadPhoto(file: File | Blob, description: string = '', albumId?: number): Promise<any> {
    const formData = new FormData();
    const fileName = (file instanceof File) ? file.name : 'image.png';
    formData.append('image', file, fileName);
    if (description) formData.append('description', description);
    if (albumId) formData.append('album_id', albumId.toString());
    
    const date = new Date();
    const localDate = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    formData.append('local_date', localDate);
    
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/photos`, formData));
  }

  async assignPhotosToAlbum(albumId: number, photoIds: number[]): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/albums/${albumId}/photos`, { photo_ids: photoIds }));
  }

  async removePhotosFromAlbum(photoIds: number[]): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/albums/photos/remove`, { photo_ids: photoIds }));
  }

  async reactToPhoto(photoId: number, emoji: string): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/photos/${photoId}/reactions`, { content: emoji }));
  }

  async deletePhoto(photoId: number): Promise<any> {
    return firstValueFrom(this.http.delete(`${API_BASE_URL}/love-album/photos/${photoId}`));
  }

  // --- CHAT ---
  async getChatMessages(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${API_BASE_URL}/love-album/chat`));
  }

  async markMessagesDelivered(): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/chat/delivered`, {}));
  }

  async sendMessage(mensaje: string, photoId?: number, replyTo?: any, meta?: any): Promise<any> {
    const payload: any = { mensaje };
    if (photoId) payload.love_photo_id = photoId;
    if (replyTo) payload.reply_to = replyTo;
    if (meta) payload.meta = meta;
    
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/chat`, payload));
  }

  async editMessage(id: number, mensaje: string, meta?: any): Promise<any> {
    const payload: any = { mensaje };
    if (meta) payload.meta = meta;
    return firstValueFrom(this.http.put(`${API_BASE_URL}/love-album/chat/${id}`, payload));
  }

  async reactToMessage(msgId: number, emoji: string): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/chat/${msgId}/react`, { content: emoji }));
  }

  async deleteMessage(msgId: number): Promise<any> {
    return firstValueFrom(this.http.delete(`${API_BASE_URL}/love-album/chat/${msgId}`));
  }

  async reactToChatMessage(id: number, reaction: string): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/chat/${id}/react`, { reaction }));
  }

  // --- GAMES ---
  
  async getGamesProgress(): Promise<any> {
    return firstValueFrom(this.http.get(`${API_BASE_URL}/love-album/games/progress`));
  }

  async getSwipeCategories(): Promise<string[]> {
    return firstValueFrom(this.http.get<string[]>(`${API_BASE_URL}/love-album/games/swipe/categories`));
  }

  async getSwipeCards(category?: string): Promise<any[]> {
    const url = category ? `${API_BASE_URL}/love-album/games/swipe/cards?category=${encodeURIComponent(category)}` : `${API_BASE_URL}/love-album/games/swipe/cards`;
    return firstValueFrom(this.http.get<any[]>(url));
  }

  async getAllSwipeCards(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${API_BASE_URL}/love-album/games/swipe/all`));
  }

  async answerSwipe(questionId: number, answer: boolean): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/games/swipe/answer`, { 
      question_id: questionId, 
      answer: answer ? 1 : 0,
      answer_bool: answer
    }));
  }

  async getSwipeStats(category?: string): Promise<any> {
    const url = category ? `${API_BASE_URL}/love-album/games/swipe/stats?category=${encodeURIComponent(category)}` : `${API_BASE_URL}/love-album/games/swipe/stats`;
    return firstValueFrom(this.http.get(url));
  }

  async getDrawingCategories(): Promise<string[]> {
    return firstValueFrom(this.http.get<string[]>(`${API_BASE_URL}/love-album/games/drawing/categories`));
  }

  async getDrawingPrompt(category?: string): Promise<any> {
    const url = category ? `${API_BASE_URL}/love-album/games/drawing/prompt?category=${encodeURIComponent(category)}` : `${API_BASE_URL}/love-album/games/drawing/prompt`;
    return firstValueFrom(this.http.get(url));
  }

  async getAllDrawingPrompts(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${API_BASE_URL}/love-album/games/drawing/all`));
  }

  async uploadDrawing(promptId: number, base64Image: string): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/games/drawing/upload`, { 
      prompt_id: promptId, 
      drawing_prompt_id: promptId,
      image: base64Image 
    }));
  }

  async getDrawingResult(promptId: number): Promise<any> {
    return firstValueFrom(this.http.get(`${API_BASE_URL}/love-album/games/drawing/${promptId}/result`));
  }

  // --- WIDGET EXTRAS ---
  // Food Places
  async getFoodPlaces(): Promise<any[]> {
    const result = await firstValueFrom(this.http.get<any[]>(`${API_BASE_URL}/love-album/widget/food-places`));
    return result;
  }

  async addFoodPlace(name: string, location?: string, rating?: number, description?: string, imageBase64?: string, category?: string, is_favorite?: boolean): Promise<any> {
    const formData = new FormData();
    formData.append('name', name);
    if (location) formData.append('location', location);
    if (rating) formData.append('rating', rating.toString());
    if (description) formData.append('description', description);
    if (category) formData.append('category', category);
    if (is_favorite !== undefined) formData.append('is_favorite', is_favorite ? '1' : '0');
    
    if (imageBase64) {
      try {
        const response = await fetch(imageBase64);
        const blob = await response.blob();
        const file = new File([blob], `place_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
        formData.append('image', file);
      } catch (e) {
        console.error('Error attaching image', e);
      }
    }
    
    // Removing Content-Type header so the browser sets it automatically with the boundary for multipart/form-data
    let reqHeaders = new HttpHeaders();
    const tokenData = await SecureStoragePlugin.get({ key: 'auth_token' }).catch(() => ({ value: null }));
    const currentToken = tokenData.value;
    if (currentToken) {
      reqHeaders = reqHeaders.set('Authorization', `Bearer ${currentToken}`);
    }

    return firstValueFrom(this.http.post<any>(`${API_BASE_URL}/love-album/widget/food-places`, formData, { headers: reqHeaders }));
  }

  async updateFoodPlace(id: number, name: string, location?: string, rating?: number, description?: string, imageBase64?: string, category?: string, is_favorite?: boolean): Promise<any> {
    const formData = new FormData();
    formData.append('_method', 'PUT');
    formData.append('name', name);
    if (location) formData.append('location', location);
    if (rating) formData.append('rating', rating.toString());
    if (description) formData.append('description', description);
    if (category) formData.append('category', category);
    if (is_favorite !== undefined) formData.append('is_favorite', is_favorite ? '1' : '0');
    
    if (imageBase64) {
      try {
        const response = await fetch(imageBase64);
        const blob = await response.blob();
        const file = new File([blob], 'place.jpg', { type: blob.type || 'image/jpeg' });
        formData.append('image', file);
      } catch (e) {
        console.error('Error converting base64 to blob', e);
      }
    }

    // Usamos firstValueFrom de rxjs
    return firstValueFrom(this.http.post<any>(`${API_BASE_URL}/love-album/widget/food-places/${id}`, formData));
  }

  async deleteFoodPlace(id: number): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${API_BASE_URL}/love-album/widget/food-places/${id}`));
  }

  // Food Dishes
  async addFoodDish(placeId: number, name: string, rating?: number, description?: string, imageBase64?: string): Promise<any> {
    const formData = new FormData();
    formData.append('name', name);
    if (rating) formData.append('rating', rating.toString());
    if (description) formData.append('description', description);
    
    if (imageBase64) {
      try {
        const response = await fetch(imageBase64);
        const blob = await response.blob();
        const file = new File([blob], `dish_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
        formData.append('image', file);
      } catch (e) {
        console.error('Error attaching image', e);
      }
    }
    
    let reqHeaders = new HttpHeaders();
    const tokenData = await SecureStoragePlugin.get({ key: 'auth_token' }).catch(() => ({ value: null }));
    const currentToken = tokenData.value;
    if (currentToken) {
      reqHeaders = reqHeaders.set('Authorization', `Bearer ${currentToken}`);
    }

    return firstValueFrom(this.http.post<any>(`${API_BASE_URL}/love-album/widget/food-places/${placeId}/dishes`, formData, { headers: reqHeaders }));
  }

  async updateFoodDish(placeId: number, dishId: number, name: string, rating?: number, description?: string, imageBase64?: string): Promise<any> {
    const formData = new FormData();
    formData.append('name', name);
    if (rating) formData.append('rating', rating.toString());
    if (description) formData.append('description', description);
    
    if (imageBase64 && imageBase64.startsWith('data:')) {
      try {
        const response = await fetch(imageBase64);
        const blob = await response.blob();
        const file = new File([blob], `dish_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
        formData.append('image', file);
      } catch (e) {
        console.error('Error attaching image', e);
      }
    }
    
    let reqHeaders = new HttpHeaders();
    const tokenData = await SecureStoragePlugin.get({ key: 'auth_token' }).catch(() => ({ value: null }));
    if (tokenData.value) {
      reqHeaders = reqHeaders.set('Authorization', `Bearer ${tokenData.value}`);
    }

    return firstValueFrom(this.http.post<any>(`${API_BASE_URL}/love-album/widget/food-places/${placeId}/dishes/${dishId}`, formData, { headers: reqHeaders }));
  }

  async deleteFoodDish(placeId: number, dishId: number): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${API_BASE_URL}/love-album/widget/food-places/${placeId}/dishes/${dishId}`));
  }

  // Movies
  async getMovies(): Promise<any[]> {
    const result = await firstValueFrom(this.http.get<any[]>(`${API_BASE_URL}/love-album/widget/movies`));
    return result;
  }

  async addMovie(title: string, rating?: number, who_fell_asleep?: string, favorite_quote?: string, imageBase64?: string, description?: string, genre?: string, is_favorite?: boolean): Promise<any> {
    const formData = new FormData();
    formData.append('title', title);
    if (rating) formData.append('rating', rating.toString());
    if (who_fell_asleep) formData.append('who_fell_asleep', who_fell_asleep);
    if (favorite_quote) formData.append('favorite_quote', favorite_quote);
    if (description) formData.append('description', description);
    if (genre) formData.append('genre', genre);
    if (is_favorite !== undefined) formData.append('is_favorite', is_favorite ? '1' : '0');
    
    if (imageBase64) {
      try {
        const response = await fetch(imageBase64);
        const blob = await response.blob();
        const file = new File([blob], `movie_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
        formData.append('image', file);
      } catch (e) {
        console.error('Error attaching image', e);
      }
    }
    
    let reqHeaders = new HttpHeaders();
    const tokenData = await SecureStoragePlugin.get({ key: 'auth_token' }).catch(() => ({ value: null }));
    const currentToken = tokenData.value;
    if (currentToken) {
      reqHeaders = reqHeaders.set('Authorization', `Bearer ${currentToken}`);
    }

    return firstValueFrom(this.http.post<any>(`${API_BASE_URL}/love-album/widget/movies`, formData, { headers: reqHeaders }));
  }

  async updateMovie(id: number, title: string, rating?: number, whoFellAsleep?: string, quote?: string, imageBase64?: string, description?: string, genre?: string, is_favorite?: boolean): Promise<any> {
    const formData = new FormData();
    formData.append('_method', 'PUT');
    formData.append('title', title);
    if (rating) formData.append('rating', rating.toString());
    if (whoFellAsleep) formData.append('who_fell_asleep', whoFellAsleep);
    if (quote) formData.append('favorite_quote', quote);
    if (description) formData.append('description', description);
    if (genre) formData.append('genre', genre);
    if (is_favorite !== undefined) formData.append('is_favorite', is_favorite ? '1' : '0');
    
    if (imageBase64) {
      try {
        const response = await fetch(imageBase64);
        const blob = await response.blob();
        const file = new File([blob], 'movie.jpg', { type: blob.type || 'image/jpeg' });
        formData.append('image', file);
      } catch (e) {
        console.error('Error converting base64 to blob', e);
      }
    }

    return firstValueFrom(this.http.post<any>(`${API_BASE_URL}/love-album/widget/movies/${id}`, formData));
  }

  async deleteMovie(id: number): Promise<any> {
    return firstValueFrom(this.http.delete<any>(`${API_BASE_URL}/love-album/widget/movies/${id}`));
  }

  // --- LOCATION (REST) ---
  async updateLocation(latitude: number, longitude: number, isSharing: boolean = true): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/location`, { latitude, longitude, is_sharing_location: isSharing }));
  }

  async getPartnerLocation(): Promise<any> {
    return firstValueFrom(this.http.get(`${API_BASE_URL}/location/partner`));
  }

  // --- GLOBAL EVENTS (GOD MODE) ---
  async getActiveGlobalEvent(): Promise<any> {
    return firstValueFrom(this.http.get(`${API_BASE_URL}/love-album/global-events/active`));
  }

  async triggerGlobalEvent(data: any): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/global-events`, data));
  }

  async stopGlobalEvent(): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/global-events/stop`, {}));
  }

  async purchaseGlobalEvent(data: any): Promise<any> {
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/global-events/purchase`, data));
  }
}
