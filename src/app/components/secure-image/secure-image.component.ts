import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';

import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-secure-image',
  templateUrl: './secure-image.component.html',
  styleUrls: ['./secure-image.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class SecureImageComponent implements OnInit, OnChanges, OnDestroy {
  @Input() url!: string;
  @Input() alt: string = '';
  @Input() objectFit: 'cover' | 'contain' | 'inherit' = 'cover';
  @Input() showPlaceholder: boolean = true;
  
  public secureUrl: SafeUrl | null = null;
  public loading: boolean = true;
  public error: boolean = false;
  private imageSubscription?: Subscription;
  private objectUrl?: string;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    if (this.url) {
      this.loadImage(this.url);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['url'] && !changes['url'].firstChange) {
      this.loadImage(this.url);
    }
  }

  ngOnDestroy(): void {
    this.cleanUp();
  }

  private cleanUp() {
    if (this.imageSubscription) {
      this.imageSubscription.unsubscribe();
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = undefined;
    }
  }

  private async loadImage(url: string) {
    this.loading = true;
    this.error = false;
    this.cleanUp();

    if (!url) {
      this.loading = false;
      this.error = true;
      return;
    }

    try {
      let cache: Cache | undefined;
      let response: Response | undefined;
      
      try {
        cache = await caches.open('secure-image-cache');
        response = await cache.match(url);
      } catch (e) {
        console.warn('Cache API no disponible o falló:', e);
      }

      if (!response) {
        const { getToken } = await import('../../interceptors/auth.interceptor');
        const token = await getToken();
        
        response = await fetch(url, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (response.ok && cache) {
          cache.put(url, response.clone());
        } else if (!response.ok) {
          throw new Error('Network response was not ok');
        }
      }

      const blob = await response.blob();
      this.objectUrl = URL.createObjectURL(blob);
      this.secureUrl = this.sanitizer.bypassSecurityTrustUrl(this.objectUrl);
      this.loading = false;
    } catch (err) {
      console.error('Error loading secure image:', err);
      this.loading = false;
      this.error = true;
    }
  }
}
