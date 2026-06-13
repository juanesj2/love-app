import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { driver } from 'driver.js';

@Injectable({
  providedIn: 'root'
})
export class TutorialService {

  constructor() { }

  private async hasSeenTutorial(tutorialName: string): Promise<boolean> {
    const { value } = await Preferences.get({ key: `tutorial_${tutorialName}` });
    return value === 'true';
  }

  private async markTutorialAsSeen(tutorialName: string) {
    await Preferences.set({ key: `tutorial_${tutorialName}`, value: 'true' });
  }

  public async showWelcomeTour() {
    if (await this.hasSeenTutorial('welcome')) return;

    const tour = driver({
      showProgress: true,
      nextBtnText: 'Siguiente',
      prevBtnText: 'Atrás',
      doneBtnText: '¡Empezar!',
      allowClose: false,
      steps: [
        {
          popover: {
            title: '¡Bienvenido/a a Love Widget! ❤️',
            description: 'Este es vuestro rincón privado. Hemos preparado un pequeño tour para enseñarte las cosas más chulas que podéis hacer.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#tab-photo',
          popover: {
            title: 'Tus Recuerdos 📸',
            description: 'Aquí verás el Feed con las fotos que subís. Puedes organizarlas en álbumes privados para tenerlas ordenadas y siempre a mano.',
            side: 'top',
            align: 'center',
            popoverClass: 'tour-bottom-tab'
          }
        },
        {
          element: '#tab-chat',
          popover: {
            title: 'Chat de Pareja 💬',
            description: 'Un chat solo para los dos. Podéis reaccionar a fotos, enviar audios y no perderos nada.',
            side: 'top',
            align: 'center',
            popoverClass: 'tour-bottom-tab'
          }
        },
        {
          element: '#tab-map',
          popover: {
            title: 'El Mapa 🗺️',
            description: '¿Dónde está tu pareja? Aquí puedes ver su ubicación en tiempo real si decide compartirla.',
            side: 'top',
            align: 'center',
            popoverClass: 'tour-bottom-tab'
          }
        },
        {
          element: '#tab-mas',
          popover: {
            title: 'Minijuegos y Más 🎲',
            description: 'Retos de dibujo, ruleta de citas, películas pendientes y vuestros hitos juntos. ¡Explóralo!',
            side: 'top',
            align: 'center',
            popoverClass: 'tour-bottom-tab'
          }
        }
      ],
      onDestroyed: () => {
        this.markTutorialAsSeen('welcome');
      }
    });

    // Pequeño delay para asegurar que el DOM está listo
    setTimeout(() => {
      tour.drive();
    }, 500);
  }

  public async showPhotosTour() {
    if (await this.hasSeenTutorial('photos')) return;

    const tour = driver({
      showProgress: false,
      nextBtnText: 'Siguiente',
      prevBtnText: 'Atrás',
      doneBtnText: '¡Entendido!',
      steps: [
        {
          element: '#photo-album-selector',
          popover: {
            title: 'Feed o Álbumes',
            description: 'Pulsa aquí para cambiar entre la vista de Feed (todas las fotos mezcladas) o ver tus álbumes específicos.',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '#upload-fab-button',
          popover: {
            title: 'Sube un Recuerdo',
            description: 'Usa este botón flotante para subir nuevas fotos y compartirlas.',
            side: 'left',
            align: 'center'
          }
        }
      ],
      onDestroyed: () => {
        this.markTutorialAsSeen('photos');
      }
    });

    setTimeout(() => {
      // Validar si los elementos existen antes de lanzar
      if (document.getElementById('photo-album-selector')) {
        tour.drive();
      }
    }, 800);
  }

  public async showChatTour() {
    if (await this.hasSeenTutorial('chat')) return;

    const tour = driver({
      showProgress: false,
      doneBtnText: '¡A chatear!',
      steps: [
        {
          popover: {
            title: 'Tu chat privado',
            description: 'Mantén presionado cualquier mensaje para reaccionar a él o pulsa las imágenes para abrirlas en pantalla completa.',
            side: 'top',
            align: 'center'
          }
        }
      ],
      onDestroyed: () => {
        this.markTutorialAsSeen('chat');
      }
    });

    setTimeout(() => {
      tour.drive();
    }, 800);
  }

  public async showMapTour() {
    if (await this.hasSeenTutorial('map')) return;

    const tour = driver({
      showProgress: false,
      doneBtnText: '¡Entendido!',
      steps: [
        {
          element: '.privacy-map-btn',
          popover: {
            title: 'Modo Fantasma 👻',
            description: 'Activa o desactiva tu ubicación. Si la ocultas, no podrás ver dónde está tu pareja.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '.partner-location-card',
          popover: {
            title: 'Estado de tu Pareja',
            description: 'Aquí verás a qué distancia está. Toca la tarjeta para centrar el mapa.',
            side: 'top',
            align: 'center'
          }
        }
      ],
      onDestroyed: () => {
        this.markTutorialAsSeen('map');
      }
    });

    setTimeout(() => {
      tour.drive();
    }, 800);
  }

  public async showMasTour() {
    if (await this.hasSeenTutorial('mas')) return;

    const tour = driver({
      showProgress: false,
      doneBtnText: '¡A explorar!',
      steps: [
        {
          element: '.grid-card',
          popover: {
            title: 'Panel de Control ⚙️',
            description: 'Aquí tienes un montón de herramientas extras: notas compartidas, hitos, y todo lo demás.',
            side: 'bottom',
            align: 'center'
          }
        }
      ],
      onDestroyed: () => {
        this.markTutorialAsSeen('mas');
      }
    });

    setTimeout(() => {
      tour.drive();
    }, 800);
  }
}
