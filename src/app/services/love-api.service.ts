import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Preferences } from '@capacitor/preferences';
import { firstValueFrom, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

const API_BASE_URL = environment.apiUrl;

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
    return new HttpHeaders({
      'Authorization': `Bearer ${t}`,
      'Accept': 'application/json'
    });
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

  async logout(): Promise<void> {
    await Preferences.remove({ key: 'auth_token' });
    this.token$.next(null);
  }

  // --- LOVE ALBUM ---
  async getCoupleInfo(): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get(`${API_BASE_URL}/love-album/info`, { headers }));
  }

  async getPhotos(): Promise<any[]> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get<any[]>(`${API_BASE_URL}/love-album/photos`, { headers }));
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

  async uploadPhoto(file: File, description: string = ''): Promise<any> {
    const formData = new FormData();
    formData.append('image', file);
    if (description) formData.append('description', description);
    
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/photos`, formData, { headers }));
  }

  async reactToPhoto(photoId: number, emoji: string): Promise<any> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/photos/${photoId}/reactions`, { content: emoji }, { headers }));
  }

  // --- CHAT ---
  async getChatMessages(): Promise<any[]> {
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.get<any[]>(`${API_BASE_URL}/love-album/chat`, { headers }));
  }

  async sendMessage(mensaje: string, photoId?: number): Promise<any> {
    const body: any = { mensaje };
    if (photoId) body.love_photo_id = photoId;
    
    const headers = await this.getHeaders();
    return firstValueFrom(this.http.post(`${API_BASE_URL}/love-album/chat`, body, { headers }));
  }
}
