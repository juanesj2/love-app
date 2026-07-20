import { Component, OnInit, OnDestroy, Output, EventEmitter, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { IonIcon } from "@ionic/angular/standalone";
import { ToastController } from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import { closeOutline, sparklesOutline, heart, rocketOutline, moonOutline, sunnyOutline, giftOutline, pencilOutline, chevronUpOutline } from "ionicons/icons";
import { LoveApiService } from "../../../services/love-api.service";
import { GlobalEventService } from "../../../services/global-event.service";

interface EventPreset {
  id: string;
  emoji: string;
  label: string;
  title: string;
  message: string;
  confetti_enabled: boolean;
  confetti_colors: string[];
  emojis_enabled: boolean;
  emojis_list: string;
  top_bar_color: string;
  gradient: string;
}

@Component({
  selector: "app-premium-event-modal",
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  template: `
    <div class="overlay" (click)="onOverlayClick($event)">
      <div class="modal-sheet">
        <div class="handle-bar"></div>

        <div class="modal-header">
          <div class="header-icon">🚀</div>
          <h2 class="header-title">Impulsa tu Relación</h2>
          <p class="header-sub">Envíale una notificación sorpresa a tu pareja. Durará <strong>24 horas</strong>.</p>
          <button class="close-btn" (click)="close.emit()">
            <ion-icon name="close-outline"></ion-icon>
          </button>
        </div>

        <div class="price-tag">
          <div class="price-left">
            <span class="price-label">PRECIO</span>
            <span class="price-sub">· 24h · Solo para tu pareja</span>
          </div>
          <span class="price-value">0.99 €</span>
        </div>

        <div class="section-label">
          <ion-icon name="sparkles-outline"></ion-icon>
          Elige el estilo del momento
        </div>

        <div class="preset-grid">
          <div
            *ngFor="let p of presets"
            class="preset-card"
            [class.selected]="selectedPreset?.id === p.id"
            [style.background]="p.gradient"
            (click)="selectPreset(p)">
            <span class="preset-emoji">{{ p.emoji }}</span>
            <span class="preset-label">{{ p.label }}</span>
            <div class="check-badge" *ngIf="selectedPreset?.id === p.id">✓</div>
          </div>
        </div>

        <div class="custom-toggle" (click)="showCustom = !showCustom">
          <ion-icon [name]="showCustom ? 'chevron-up-outline' : 'pencil-outline'"></ion-icon>
          {{ showCustom ? "Usar un preset" : "Escribir mensaje personalizado" }}
        </div>

        <div class="custom-fields" *ngIf="showCustom">
          <input type="text" [(ngModel)]="customTitle" placeholder="Título del mensaje..." class="custom-input" maxlength="60">
          <textarea [(ngModel)]="customMessage" placeholder="Escríbele algo especial..." class="custom-textarea" maxlength="200" rows="3"></textarea>
        </div>

        <div class="preview-box" *ngIf="selectedPreset || (showCustom && customTitle && customMessage)">
          <div class="preview-bar" [style.background]="previewBarColor"></div>
          <div class="preview-content">
            <span class="preview-emojis">{{ previewEmojis }}</span>
            <div class="preview-title">{{ previewTitle }}</div>
            <div class="preview-message">{{ previewMessage }}</div>
          </div>
        </div>

        <button class="cta-btn" [disabled]="isLoading || !canSend" (click)="send()">
          <span *ngIf="!isLoading">💝 Enviar a mi pareja · 0.99 €</span>
          <span *ngIf="isLoading" class="spinner"></span>
        </button>

        <p class="disclaimer">Compra simulada — integración real de pago próximamente.</p>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(5px); z-index: 9999; display: flex; align-items: flex-end; animation: fadeIn 0.2s ease; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .modal-sheet { background: #fff; border-radius: 28px 28px 0 0; width: 100%; max-height: 92vh; overflow-y: auto; padding: 0 20px 40px; animation: slideUp 0.35s cubic-bezier(0.34, 1.2, 0.64, 1); }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .modal-sheet::-webkit-scrollbar { display: none; }

    .handle-bar { width: 40px; height: 4px; background: #e0e0e0; border-radius: 2px; margin: 12px auto 0; }

    .modal-header { position: relative; text-align: center; padding: 18px 40px 0; }
    .header-icon { font-size: 2.8rem; margin-bottom: 6px; }
    .header-title { font-size: 1.5rem; font-weight: 900; background: linear-gradient(135deg, #FF4D6D, #c9184a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; }
    .header-sub { color: #999; font-size: 0.86rem; margin: 6px 0 0; line-height: 1.4; }
    .close-btn { position: absolute; top: 14px; right: 0; background: #f5f5f5; border: none; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; cursor: pointer; }

    .price-tag { background: linear-gradient(135deg, #fff5f7, #ffe0e8); border: 1.5px solid #ffccd5; border-radius: 16px; padding: 12px 18px; margin: 18px 0; display: flex; align-items: center; }
    .price-left { display: flex; flex-direction: column; }
    .price-label { font-size: 0.7rem; color: #c9184a; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
    .price-sub { font-size: 0.78rem; color: #a4133c; font-weight: 600; }
    .price-value { font-size: 2rem; font-weight: 900; color: #FF4D6D; margin-left: auto; }

    .section-label { display: flex; align-items: center; gap: 7px; font-size: 0.8rem; font-weight: 800; color: #777; text-transform: uppercase; letter-spacing: 0.5px; margin: 4px 0 12px; }

    .preset-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
    .preset-card { border-radius: 18px; padding: 16px 8px 12px; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; position: relative; border: 2.5px solid transparent; transition: all 0.2s; }
    .preset-card:active { transform: scale(0.96); }
    .preset-card.selected { border-color: white; box-shadow: 0 0 0 3px #FF4D6D; transform: scale(1.05); }
    .preset-emoji { font-size: 2rem; }
    .preset-label { font-size: 0.72rem; font-weight: 800; color: white; text-shadow: 0 1px 4px rgba(0,0,0,0.3); text-align: center; }
    .check-badge { position: absolute; top: 7px; right: 9px; background: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: #FF4D6D; font-weight: 900; }

    .custom-toggle { display: flex; align-items: center; gap: 7px; font-size: 0.87rem; font-weight: 700; color: #FF4D6D; margin-bottom: 10px; cursor: pointer; }
    .custom-fields { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
    .custom-input, .custom-textarea { width: 100%; border: 2px solid #f0f0f0; border-radius: 12px; padding: 11px 14px; font-size: 0.95rem; font-family: inherit; background: #fafafa; color: #222; transition: 0.2s; box-sizing: border-box; }
    .custom-input:focus, .custom-textarea:focus { border-color: #FF4D6D; outline: none; background: #fff; color: #222; }
    .custom-textarea { resize: none; color: #222; }

    .preview-box { border-radius: 16px; overflow: hidden; margin-bottom: 18px; box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
    .preview-bar { height: 7px; }
    .preview-content { background: #fff8fa; padding: 14px 16px; }
    .preview-emojis { font-size: 1.4rem; }
    .preview-title { font-size: 0.95rem; font-weight: 800; color: #222; margin-top: 4px; }
    .preview-message { font-size: 0.82rem; color: #666; margin-top: 3px; }

    .cta-btn { width: 100%; padding: 17px; border-radius: 18px; border: none; background: linear-gradient(135deg, #FF4D6D, #c9184a); color: white; font-size: 1.05rem; font-weight: 800; cursor: pointer; box-shadow: 0 8px 24px rgba(255,77,109,0.4); transition: 0.2s; display: flex; align-items: center; justify-content: center; min-height: 58px; }
    .cta-btn:active { transform: scale(0.97); box-shadow: 0 4px 12px rgba(255,77,109,0.3); }
    .cta-btn:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
    .spinner { width: 22px; height: 22px; border: 3px solid rgba(255,255,255,0.35); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .disclaimer { text-align: center; font-size: 0.72rem; color: #ccc; margin: 10px 0 0; }

    :host-context(.night-owl-mode) .modal-sheet { background: #1a1b1e; }
    :host-context(.night-owl-mode) .close-btn { background: #25262b; color: #ccc; }
    :host-context(.night-owl-mode) .custom-input, :host-context(.night-owl-mode) .custom-textarea { background: #25262b; border-color: #333; color: #eee; }
    :host-context(.night-owl-mode) .preview-content { background: #25262b; }
    :host-context(.night-owl-mode) .preview-title { color: #eee; }
    :host-context(.night-owl-mode) .preview-message { color: #aaa; }
  `]
})
export class PremiumEventModalComponent implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();
  private api = inject(LoveApiService);
  private toastCtrl = inject(ToastController);

  isLoading = false;
  showCustom = false;
  customTitle = "";
  customMessage = "";
  selectedPreset: EventPreset | null = null;

  presets: EventPreset[] = [
    { id: "amor", emoji: "❤️", label: "Te Quiero", title: "Pensando en ti...", message: "Solo quería recordarte que te amo ❤️", confetti_enabled: true, confetti_colors: ["#ff4d6d","#c9184a"], emojis_enabled: true, emojis_list: "❤️,💖,💘,🥰", top_bar_color: "linear-gradient(135deg, #FF4D6D, #c9184a)", gradient: "linear-gradient(135deg, #FF4D6D, #c9184a)" },
    { id: "buenos_dias", emoji: "☀️", label: "Buenos Días", title: "¡Buenos días mi vida!", message: "Espero que tengas un día maravilloso ☀️", confetti_enabled: false, confetti_colors: [], emojis_enabled: true, emojis_list: "☀️,☕,🌻,🥰", top_bar_color: "linear-gradient(120deg, #f6d365 0%, #fda085 100%)", gradient: "linear-gradient(135deg, #f6d365, #fda085)" },
    { id: "buenas_noches", emoji: "🌙", label: "Buenas Noches", title: "¡Buenas noches mi amor!", message: "Que sueñes con los angelitos ✨", confetti_enabled: false, confetti_colors: [], emojis_enabled: true, emojis_list: "🌙,✨,💫,😴", top_bar_color: "linear-gradient(135deg, #1e3c72, #2a5298)", gradient: "linear-gradient(135deg, #1e3c72, #2a5298)" },
    { id: "sorpresa", emoji: "🎁", label: "Sorpresita", title: "¡Tengo una sorpresa para ti!", message: "Abre el chat cuando puedas 👀", confetti_enabled: true, confetti_colors: ["#ffd700","#fb8500"], emojis_enabled: true, emojis_list: "🎁,🤫,👀,✨", top_bar_color: "linear-gradient(120deg, #f093fb 0%, #f5576c 100%)", gradient: "linear-gradient(135deg, #f093fb, #f5576c)" },
    { id: "te_extrano", emoji: "🥺", label: "Te Extraño", title: "¡Te echo mucho de menos!", message: "Tengo muchas ganas de verte 🥺", confetti_enabled: false, confetti_colors: [], emojis_enabled: true, emojis_list: "🥺,🫂,💔,😢", top_bar_color: "linear-gradient(to right, #4facfe 0%, #00f2fe 100%)", gradient: "linear-gradient(135deg, #4facfe, #00f2fe)" },
    { id: "cumple", emoji: "🎂", label: "Cumpleaños", title: "¡Feliz Cumpleaños!", message: "¡Que lo pases genial hoy en tu día! 🎂", confetti_enabled: true, confetti_colors: ["#ff0000","#00ff00","#0000ff","#ffff00"], emojis_enabled: true, emojis_list: "🎂,🎉,🥳,🎁", top_bar_color: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)", gradient: "linear-gradient(135deg, #ff9a9e, #fecfef)" }
  ];

  ngOnInit() { document.body.classList.add("hide-tabs"); addIcons({ closeOutline, sparklesOutline, heart, rocketOutline, moonOutline, sunnyOutline, giftOutline, pencilOutline, chevronUpOutline }); }
  ngOnDestroy() { document.body.classList.remove("hide-tabs"); }

  selectPreset(p: EventPreset) { this.selectedPreset = p; this.showCustom = false; }

  get canSend(): boolean { return this.showCustom ? !!(this.customTitle.trim() && this.customMessage.trim()) : !!this.selectedPreset; }
  get previewTitle(): string { return this.showCustom ? this.customTitle : (this.selectedPreset?.title || ""); }
  get previewMessage(): string { return this.showCustom ? this.customMessage : (this.selectedPreset?.message || ""); }
  get previewEmojis(): string { return !this.showCustom && this.selectedPreset ? this.selectedPreset.emojis_list.split(",").slice(0,3).join("") : "💝"; }
  get previewBarColor(): string { return this.selectedPreset?.top_bar_color || "linear-gradient(135deg, #FF4D6D, #c9184a)"; }

  onOverlayClick(e: Event) { if ((e.target as HTMLElement).classList.contains("overlay")) this.close.emit(); }

  async send() {
    if (!this.canSend || this.isLoading) return;
    this.isLoading = true;
    try {
      const payload = this.showCustom
        ? { title: this.customTitle.trim(), message: this.customMessage.trim(), confetti_enabled: false, emojis_enabled: true, emojis_list: "❤️,💖,✨", top_bar_color: "linear-gradient(135deg, #FF4D6D, #c9184a)" }
        : { title: this.selectedPreset!.title, message: this.selectedPreset!.message, confetti_enabled: this.selectedPreset!.confetti_enabled, confetti_colors: this.selectedPreset!.confetti_colors, emojis_enabled: this.selectedPreset!.emojis_enabled, emojis_list: this.selectedPreset!.emojis_list, top_bar_color: this.selectedPreset!.top_bar_color };

      await this.api.purchaseGlobalEvent(payload);
      const t = await this.toastCtrl.create({ message: "¡Sorpresa enviada! 💝 Tu pareja recibirá la notificación ahora mismo", duration: 3500, color: "success", position: "top" });
      t.present();
      this.close.emit();
    } catch (e: any) {
      const t = await this.toastCtrl.create({ message: e?.error?.error || "Error al enviar el evento", duration: 3000, color: "danger" });
      t.present();
    } finally { this.isLoading = false; }
  }
}
