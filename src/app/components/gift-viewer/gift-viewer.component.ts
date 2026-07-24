import { Component, Input, OnInit, OnChanges, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gift-viewer',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="viewer-container" [style.height]="height">
      <!-- Loading state could go here if needed -->
      <model-viewer
        *ngIf="modelSrc"
        [src]="modelSrc"
        auto-rotate
        camera-controls
        shadow-intensity="0.5"
        environment-image="neutral"
        exposure="1.8"
        style="width: 100%; height: 100%; display: block;"
        interaction-prompt="none"
        alt="Regalo 3D">
        <div slot="poster" style="display: flex; align-items: center; justify-content: center; height: 100%; color: #FF4D6D; font-weight: bold;">
          Cargando modelo 3D...
        </div>
      </model-viewer>
      
      <div class="error-msg" *ngIf="!modelSrc">
        <p>Modelo no disponible</p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .viewer-container {
      width: 100%;
      position: relative;
      background: transparent;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    model-viewer {
      width: 100%;
      height: 100%;
      background-color: transparent;
      --poster-color: transparent;
    }
    .error-msg {
      color: #FF4D6D;
      font-weight: bold;
      text-align: center;
    }
  `]
})
export class GiftViewerComponent implements OnInit, OnChanges {
  @Input() giftType: 'teddy' | 'rose' | 'ring' | string = 'teddy';
  @Input() height: string = '250px';

  modelSrc: string = '';

  ngOnInit() {
    this.updateModelSrc();
  }

  ngOnChanges() {
    this.updateModelSrc();
  }

  private updateModelSrc() {
    switch (this.giftType) {
      case 'teddy':
        this.modelSrc = '/assets/models/oso.glb';
        break;
      case 'rose':
        this.modelSrc = '/assets/models/rosa.glb';
        break;
      case 'ring':
        this.modelSrc = '/assets/models/anillo.glb';
        break;
      default:
        this.modelSrc = `/assets/models/${this.giftType}.glb`;
        break;
    }
  }
}
