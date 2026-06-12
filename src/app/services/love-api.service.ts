import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Preferences } from '@capacitor/preferences';
import { firstValueFrom, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export const API_BASE_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class LoveApiService {
  private http = inject(HttpClient);
  public token$ = new BehaviorSubject<string | null>(null);
  
  constructor() {
    this.loadToken();
  }

  private async loadToken() {
    const { value } = await Preferences.get({ key: 'auth_token' });
    if (value) {
      this.token$.next(value);
    }
  }

  private async getHeaders(): Promise<HttpHeaders> {
    let t = this.token$.value;
    if (!t) {
      const { value } = await Preferences.get({ key: 'auth_token' });
      t = value;
      if (value) {
        this.token$.next(value);
      }
    }
    let headers = new HttpHeaders({
      'Accept': 'application/json'
    });
    if (t) {
      headers = headers.set('Authorization', `Bearer ${t}`);
    }
    return headers;
  }

  async sendStreakReminder(): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/remind-streak`, {}, { headers }));
  }

  async sendCustomNotification(title: string, body: string): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/custom-notification`, { title, body }, { headers }));
  }

  // --- AUTH ---
  async login(email: string, password: string): Promise<any> {
    const res: any = await firstValueFrom(this.http.post(`${API_BASE_URL}/login`, { email, password }));
    if (res && res.access_token) {
      await Preferences.set({ key: 'auth_token', value: res.access_token });
      this.token$.next(res.access_token);
    }
    return res;
  }

  async register(data: {name: string, email: string, password: string, password_confirmation: string, app: string}): Promise<any> {
    const res: any = await firstValueFrom(this.http.post(`${API_BASE_URL}/register`, data));
    if (res && res.access_token) {
      await Preferences.set({ key: 'auth_token', value: res.access_token });
      this.token$.next(res.access_token);
    }
    return res;
  }

  async getMe(): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get(`${API_BASE_URL}/user`, { headers }));
  }

  async pair(pairingCode: string): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/pair`, { pairing_code: pairingCode }, { headers }));
  }

  async logout(): Promise<void> {
    await Preferences.remove({ key: 'auth_token' });
    this.token$.next(null);
  }

  // --- INFO Y POKE ---
  async getCoupleInfo(): Promise<any> {
    const headers = await this.getHeaders();
    const date = new Date();
    const localDate = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    return firstValueFrom(this.http.get<any>(`${API_BASE_URL}/love-album/info?local_date=${localDate}`, { headers }));
  }

  async updateCoupleInfo(data: any): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.put<any>(`${API_BASE_URL}/love-album/info`, data, { headers }));
  }

  async sendPoke(): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post<any>(`${API_BASE_URL}/love-album/poke`, {}, { headers }));
  }

  // --- HITOS IMPORTANTES ---
  async getMilestones(): Promise<any[]> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get<any[]>(`${API_BASE_URL}/love-album/milestones`, { headers }));
  }

  async addMilestone(title: string, date: string): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post<any>(`${API_BASE_URL}/love-album/milestones`, { title, date }, { headers }));
  }

  async deleteMilestone(id: number): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.delete<any>(`${API_BASE_URL}/love-album/milestones/${id}`, { headers }));
  }

  // --- PREGUNTAS MINIJUEGO ---
  async getQuestions(): Promise<any[]> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get<any[]>(`${API_BASE_URL}/love-album/questions`, { headers }));
  }

  async saveFcmToken(token: string): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post<any>(`${API_BASE_URL}/love-album/save-fcm-token`, { token }, { headers }));
  }

  async answerQuestion(id: number, answer: string): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post<any>(`${API_BASE_URL}/love-album/questions/${id}/answer`, { answer }, { headers }));
  }

  // --- FOTOGRAFÍAS ---
  async getPhotos(albumId?: number, page: number = 1): Promise<any> {
    const headers = await this.getHeaders();
    let url = `${API_BASE_URL}/love-album/photos?page=${page}`;
    if (albumId) {
      url += `&album_id=${albumId}`;
    }
    return firstValueFrom(this.http.get<any>(url, { headers }));
  }

  async downloadPhotoBlob(id: number): Promise<Blob> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get(`${API_BASE_URL}/love-album/photos/${id}/download`, { headers, responseType: 'blob' }));
  }

  // --- ALBUMES PERSONALIZADOS ---
  async getAlbums(): Promise<any[]> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get<any[]>(`${API_BASE_URL}/love-album/albums`, { headers }));
  }

  async createAlbum(name: string): Promise<any> {
    const headers = await this.getHeaders();
    const res: any = await firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/albums`, { name }, { headers }));
    return res.album;
  }

  async updateAlbum(id: number, name: string): Promise<any> {
    const headers = await this.getHeaders();
    const res: any = await firstValueFrom(this.http.put(`${API_BASE_URL}/love-album/albums/${id}`, { name }, { headers }));
    return res.album;
  }

  async deleteAlbum(id: number): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.delete(`${API_BASE_URL}/love-album/albums/${id}`, { headers }));
  }

  async uploadAlbumCover(albumId: number, base64Image: string): Promise<any> {
    const headers = await this.getHeaders();
    const res: any = await firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/albums/${albumId}/cover`, { image: base64Image }, { headers }));
    return res.album;
  }

  async uploadPhoto(file: File, description: string = '', albumId?: number): Promise<any> {
    const formData = new FormData();
    formData.append('image', file);
    if (description) formData.append('description', description);
    if (albumId) formData.append('album_id', albumId.toString());
    
    const date = new Date();
    const localDate = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    formData.append('local_date', localDate);
    
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/photos`, formData, { headers }));
  }

  async assignPhotosToAlbum(albumId: number, photoIds: number[]): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/albums/${albumId}/photos`, { photo_ids: photoIds }, { headers }));
  }

  async reactToPhoto(photoId: number, emoji: string): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/photos/${photoId}/reactions`, { content: emoji }, { headers }));
  }

  async deletePhoto(photoId: number): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.delete(`${API_BASE_URL}/love-album/photos/${photoId}`, { headers }));
  }

  // --- CHAT ---
  async getChatMessages(): Promise<any[]> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get<any[]>(`${API_BASE_URL}/love-album/chat`, { headers }));
  }

  async sendMessage(mensaje: string, photoId?: number, replyTo?: any): Promise<any> {
    const body: any = { mensaje };
    if (photoId) body.love_photo_id = photoId;
    if (replyTo) body.reply_to = replyTo;
    
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/chat`, body, { headers }));
  }

  async editMessage(id: number, mensaje: string): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.put(`${API_BASE_URL}/love-album/chat/${id}`, { mensaje }, { headers }));
  }

  async reactToChatMessage(id: number, reaction: string): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/chat/${id}/react`, { reaction }, { headers }));
  }

  // --- GAMES ---
  
  async getGamesProgress(): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get(`${API_BASE_URL}/love-album/games/progress`, { headers }));
  }

  async getSwipeCategories(): Promise<string[]> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get<string[]>(`${API_BASE_URL}/love-album/games/swipe/categories`, { headers }));
  }

  async getSwipeCards(category?: string): Promise<any[]> {
    const headers = await this.getHeaders();
    const url = category ? `${API_BASE_URL}/love-album/games/swipe/cards?category=${encodeURIComponent(category)}` : `${API_BASE_URL}/love-album/games/swipe/cards`;
    return firstValueFrom(this.http.get<any[]>(url, { headers }));
  }

  async getAllSwipeCards(): Promise<any[]> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get<any[]>(`${API_BASE_URL}/love-album/games/swipe/all`, { headers }));
  }

  async answerSwipe(questionId: number, answer: boolean): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/games/swipe/answer`, { question_id: questionId, answer }, { headers }));
  }

  async getSwipeStats(category?: string): Promise<any> {
    const headers = await this.getHeaders();
    const url = category ? `${API_BASE_URL}/love-album/games/swipe/stats?category=${encodeURIComponent(category)}` : `${API_BASE_URL}/love-album/games/swipe/stats`;
    return firstValueFrom(this.http.get(url, { headers }));
  }

  async getDrawingCategories(): Promise<string[]> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get<string[]>(`${API_BASE_URL}/love-album/games/drawing/categories`, { headers }));
  }

  async getDrawingPrompt(category?: string): Promise<any> {
    const headers = await this.getHeaders();
    const url = category ? `${API_BASE_URL}/love-album/games/drawing/prompt?category=${encodeURIComponent(category)}` : `${API_BASE_URL}/love-album/games/drawing/prompt`;
    return firstValueFrom(this.http.get(url, { headers }));
  }

  async getAllDrawingPrompts(): Promise<any[]> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get<any[]>(`${API_BASE_URL}/love-album/games/drawing/all`, { headers }));
  }

  async uploadDrawing(promptId: number, base64Image: string): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/games/drawing/upload`, { prompt_id: promptId, image: base64Image }, { headers }));
  }

  async getDrawingResult(promptId: number): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get(`${API_BASE_URL}/love-album/games/drawing/${promptId}/result`, { headers }));
  }
}
