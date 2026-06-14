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
            title: '¡Bienvenido/a a Love Widget! 👋',
            description: 'Este es vuestro rincón privado. Hemos preparado un pequeño tour para enseñarte las cosas más chulas que podéis hacer.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '.custom-header .avatar-container:not(.partner-container)',
          popover: {
            title: 'Tu Estado de Ánimo 🎭',
            description: 'Toca tu foto de perfil en cualquier momento para actualizar cómo te sientes y que tu pareja lo vea al instante.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '.poke-btn',
          popover: {
            title: '¡Zumbidos! 💘',
            description: 'Toca el corazón central para mandar un "zumbido". Le llegará una notificación a tu pareja y le vibrará el móvil.',
            side: 'bottom',
            align: 'center'
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
          element: '.plus-circle',
          popover: {
            title: 'Sube Momentos 📸',
            description: 'Toca aquí para hacer una foto o subirla de tu galería y compartirla al instante.',
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
        // Cuando termina el tour de bienvenida, como estamos en la pestaña de fotos, lanzamos su tutorial
        setTimeout(() => {
          this.showPhotosTour();
        }, 500);
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
          element: '.floating-toggles',
          popover: {
            title: 'Vista Feed o Galería 🖼️',
            description: 'Cambia entre la vista inmersiva tipo Feed (una a una) o la vista de Galería compacta.',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '#photo-album-selector',
          popover: {
            title: 'Tus Álbumes 🗂️',
            description: 'Aquí puedes crear y organizar tus recuerdos en álbumes temáticos.',
            side: 'bottom',
            align: 'end'
          }
        },
        {
          element: '.streak-badge',
          popover: {
            title: 'Vuestra Racha 🔥',
            description: 'Si ambos subís al menos una foto hoy, la racha aumenta. ¡Mantened viva la llama y no rompáis la cadena!',
            side: 'bottom',
            align: 'start'
          }
        }
      ],
      onDestroyed: () => {
        this.markTutorialAsSeen('photos');
      }
    });

    setTimeout(() => {
      // Validar si los elementos existen antes de lanzar
      if (document.querySelector('.floating-toggles')) {
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
      showProgress: true,
      doneBtnText: '¡A explorar!',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Atrás',
      steps: [
        {
          element: '#mas-nuestro-tiempo',
          popover: {
            title: 'Nuestro Tiempo ⏳',
            description: 'Aquí podéis ver cuánto tiempo lleváis juntos y configurar las fechas de vuestros cumpleaños.',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '#mas-eventos',
          popover: {
            title: 'Próximos Eventos 📅',
            description: 'Llevamos la cuenta atrás de vuestro aniversario, cumpleaños y días como San Valentín automáticamente.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '#mas-hitos',
          popover: {
            title: 'Hitos Importantes 🚩',
            description: '¿Vuestro primer viaje? ¿El día que adoptasteis al gato? Añadid aquí vuestras fechas especiales.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '#mas-deseos',
          popover: {
            title: 'Cubo de Deseos ✨',
            description: 'Una lista compartida con todo lo que soñáis hacer juntos. ¡Marcadlos cuando los cumpláis!',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '#mas-coleccion',
          popover: {
            title: 'Colección del Widget 🖼️',
            description: 'Elige qué álbum de fotos quieres que aparezca en el widget de inicio de tu móvil.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '#mas-gastro',
          popover: {
            title: 'Tour Gastro 🍔',
            description: 'Guardad vuestros restaurantes favoritos o los que queréis probar en el futuro.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '#mas-cine',
          popover: {
            title: 'Cine Pareja 🍿',
            description: 'Haced una lista de las pelis y series pendientes para que no haya peleas al elegir.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '#mas-test',
          popover: {
            title: 'Test Pareja 🎮',
            description: 'Un minijuego divertido para ver cuánto os conocéis.',
            side: 'top',
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
