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
        },
        {
          popover: {
            title: 'Secretos y Logros 🏆',
            description: 'Esta app está hecha con mucho cariño y tiene secretitos escondidos. Te invitamos a interactuar con todo, mantener pulsados emojis y explorar. ¡Implementaremos un sistema de logros para que los encuentres todos!',
            side: 'bottom',
            align: 'center'
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
          },
          onHighlightStarted: () => {
            document.querySelector('#mas-nuestro-tiempo')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        },
        {
          element: '#mas-eventos',
          popover: {
            title: 'Próximos Eventos 📅',
            description: 'Llevamos la cuenta atrás de vuestro aniversario, cumpleaños y días como San Valentín automáticamente.',
            side: 'top',
            align: 'center'
          },
          onHighlightStarted: () => {
            document.querySelector('#mas-eventos')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        },
        {
          element: '#mas-hitos',
          popover: {
            title: 'Hitos Importantes 🚩',
            description: '¿Vuestro primer viaje? ¿El día que adoptasteis al gato? Añadid aquí vuestras fechas especiales.',
            side: 'top',
            align: 'center'
          },
          onHighlightStarted: () => {
            document.querySelector('#mas-hitos')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        },
        {
          element: '#mas-deseos',
          popover: {
            title: 'Cubo de Deseos ✨',
            description: 'Una lista compartida con todo lo que soñáis hacer juntos. ¡Marcadlos cuando los cumpláis!',
            side: 'top',
            align: 'center'
          },
          onHighlightStarted: () => {
            document.querySelector('#mas-deseos')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        },
        {
          element: '#mas-coleccion',
          popover: {
            title: 'Colección del Widget 🖼️',
            description: 'Elige qué álbum de fotos quieres que aparezca en el widget de inicio de tu móvil.',
            side: 'top',
            align: 'center'
          },
          onHighlightStarted: () => {
            document.querySelector('#mas-coleccion')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        },
        {
          element: '#mas-gastro',
          popover: {
            title: 'Tour Gastro 🍔',
            description: 'Guardad vuestros restaurantes favoritos o los que queréis probar en el futuro.',
            side: 'top',
            align: 'center'
          },
          onHighlightStarted: () => {
            document.querySelector('#mas-gastro')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        },
        {
          element: '#mas-cine',
          popover: {
            title: 'Cine Pareja 🍿',
            description: 'Haced una lista de las pelis y series pendientes para que no haya peleas al elegir.',
            side: 'top',
            align: 'center'
          },
          onHighlightStarted: () => {
            document.querySelector('#mas-cine')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        },
        {
          element: '#mas-test',
          popover: {
            title: 'Test Pareja 🎮',
            description: 'Un minijuego divertido para ver cuánto os conocéis.',
            side: 'top',
            align: 'center'
          },
          onHighlightStarted: () => {
            document.querySelector('#mas-test')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  public async showFoodTour() {
    if (await this.hasSeenTutorial('food_tour')) return;

    const tour = driver({
      showProgress: true,
      doneBtnText: '¡A comer!',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Atrás',
      steps: [
        {
          element: '#tour-food-modal',
          popover: {
            title: 'Tour Gastronómico 🍔',
            description: 'Aquí podéis guardar todos los restaurantes que habéis visitado o los que queréis probar.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '#tour-food-list',
          popover: {
            title: 'Vuestros Restaurantes 🍽️',
            description: 'La lista de los sitios. Pulsa en cualquiera para ver los detalles y vuestra puntuación.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '#tour-food-add',
          popover: {
            title: 'Añadir un sitio ➕',
            description: 'Pulsa aquí para guardar un nuevo restaurante en la lista.',
            side: 'top',
            align: 'center'
          }
        }
      ],
      onDestroyed: () => {
        this.markTutorialAsSeen('food_tour');
      }
    });

    tour.drive();
  }

  public async showMovieTour() {
    if (await this.hasSeenTutorial('movie_tour')) return;

    const tour = driver({
      showProgress: true,
      doneBtnText: '¡A ver pelis!',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Atrás',
      steps: [
        {
          element: '#tour-movie-modal',
          popover: {
            title: 'Cine Pareja 🍿',
            description: 'Vuestra lista compartida de películas y series pendientes o ya vistas.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '#tour-movie-list',
          popover: {
            title: 'Catálogo 🎥',
            description: 'Aquí aparecerán las portadas. Toca una para ver la nota que le pusisteis.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '#tour-movie-add',
          popover: {
            title: 'Añadir Peli o Serie ➕',
            description: 'Pulsa aquí para apuntar esa serie de la que todo el mundo habla.',
            side: 'top',
            align: 'center'
          }
        }
      ],
      onDestroyed: () => {
        this.markTutorialAsSeen('movie_tour');
      }
    });

    tour.drive();
  }

  public async showAddFoodTour() {
    if (await this.hasSeenTutorial('add_food_tour')) return;

    const tour = driver({
      showProgress: false,
      doneBtnText: '¡Entendido!',
      steps: [
        {
          element: '#tour-food-location',
          popover: {
            title: '¡Búsqueda Mágica! 🪄',
            description: 'Escribes tu ubicación aquí y en 2 segundos lo buscamos por ti automáticamente. ¡Sin esfuerzo!',
            side: 'bottom',
            align: 'center'
          }
        }
      ],
      onDestroyed: () => {
        this.markTutorialAsSeen('add_food_tour');
      }
    });

    tour.drive();
  }

  public async showGamesHubTour() {
    if (await this.hasSeenTutorial('games_hub_tour')) return;

    const tour = driver({
      showProgress: true,
      doneBtnText: '¡A jugar!',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Atrás',
      steps: [
        {
          element: '#tour-game-test',
          popover: {
            title: 'Test de Pareja 📝',
            description: 'Responded a preguntas de todo tipo para ver cuánto os conocéis.',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '#tour-game-swipe',
          popover: {
            title: 'Tinder de Pareja 🔥',
            description: 'Deslizad rápido para descubrir vuestra afinidad en diferentes temas candentes.',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '#tour-game-draw',
          popover: {
            title: 'Reto de Dibujo 🎨',
            description: 'Sacad vuestro lado creativo y atrevido dibujando retos al mismo tiempo.',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '#tour-game-roulette',
          popover: {
            title: 'Tarro de Citas 🎡',
            description: '¿No sabéis qué hacer hoy? Girad la ruleta y dejad que decida por vosotros.',
            side: 'bottom',
            align: 'center'
          }
        }
      ],
      onDestroyed: () => {
        this.markTutorialAsSeen('games_hub_tour');
      }
    });

    tour.drive();
  }

  public async showTestTour() {
    if (await this.hasSeenTutorial('test_tour')) return;

    const tour = driver({
      showProgress: true,
      doneBtnText: '¡Empezar test!',
      steps: [
        {
          element: '#tour-test-filters',
          popover: {
            title: 'Filtros 🔎',
            description: 'Aquí podéis filtrar las preguntas para ver cuáles os faltan por responder, o ver las que ya habéis completado juntos.',
            side: 'bottom',
            align: 'center'
          }
        }
      ],
      onDestroyed: () => {
        this.markTutorialAsSeen('test_tour');
      }
    });

    tour.drive();
  }

  public async showSwipeTour() {
    if (await this.hasSeenTutorial('swipe_tour')) return;

    const tour = driver({
      showProgress: true,
      doneBtnText: '¡A deslizar!',
      steps: [
        {
          element: '#tour-swipe-categories',
          popover: {
            title: 'Categorías 🗂️',
            description: 'Elegid un tema. Tenéis desde preguntas normales hasta cosas más picantes.',
            side: 'bottom',
            align: 'center'
          }
        }
      ],
      onDestroyed: () => {
        this.markTutorialAsSeen('swipe_tour');
      }
    });

    tour.drive();
  }

  public async showDrawTour() {
    if (await this.hasSeenTutorial('draw_tour')) return;

    const tour = driver({
      showProgress: true,
      doneBtnText: '¡A dibujar!',
      steps: [
        {
          element: '#tour-draw-filters',
          popover: {
            title: 'Tus dibujos 🎨',
            description: 'Puedes empezar a jugar ahora mismo o echar un vistazo a la galería con todas las obras de arte que habéis creado.',
            side: 'bottom',
            align: 'center'
          }
        }
      ],
      onDestroyed: () => {
        this.markTutorialAsSeen('draw_tour');
      }
    });

    tour.drive();
  }

  public async showRouletteTour() {
    if (await this.hasSeenTutorial('roulette_tour')) return;

    const tour = driver({
      showProgress: true,
      doneBtnText: '¡A rodar!',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Atrás',
      steps: [
        {
          element: '#tour-roulette-wheel',
          popover: {
            title: 'La Ruleta 🎡',
            description: 'Dale al botón GIRAR cuando no os pongáis de acuerdo en qué plan hacer.',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '#tour-roulette-options',
          popover: {
            title: 'Añadir opciones ✍️',
            description: 'Podéis borrar o añadir vuestros propios planes (ej: "Ir al cine", "Pedir pizza", "Maratón de Netflix").',
            side: 'top',
            align: 'center'
          }
        }
      ],
      onDestroyed: () => {
        this.markTutorialAsSeen('roulette_tour');
      }
    });

    tour.drive();
  }
  public async showGastroTour() {
    if (await this.hasSeenTutorial('gastro_tour')) return;

    const tour = driver({
      showProgress: true,
      doneBtnText: '¡A comer!',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Atrás',
      steps: [
        {
          element: '#gastro-search',
          popover: {
            title: 'Búsqueda rápida 🔍',
            description: 'Encuentra tus restaurantes favoritos en un segundo por su nombre.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#gastro-filters',
          popover: {
            title: 'Filtros mágicos ✨',
            description: 'Filtra por categoría de comida o muestra solo tus lugares favoritos tocando el corazón.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#gastro-list',
          popover: {
            title: 'Tu colección 🍽️',
            description: 'Aquí aparecerán los restaurantes. Toca en ellos para ver detalles y los platos que habéis probado.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '#gastro-add',
          popover: {
            title: 'Añadir restaurante 🍔',
            description: 'Guarda los sitios a los que vayáis para no olvidarlos nunca y dales una puntuación.',
            side: 'top',
            align: 'center'
          }
        }
      ],
      onDestroyed: () => {
        this.markTutorialAsSeen('gastro_tour');
      }
    });

    tour.drive();
  }

  public async showCineTour() {
    if (await this.hasSeenTutorial('cine_tour')) return;

    const tour = driver({
      showProgress: true,
      doneBtnText: '¡Acción! 🎬',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Atrás',
      steps: [
        {
          element: '#cine-search',
          popover: {
            title: 'Buscador de pelis 🍿',
            description: 'Encuentra rápidamente esa película o serie que queréis ver o ya habéis visto.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#cine-filters',
          popover: {
            title: 'Categorías y Favoritos ⭐',
            description: 'Filtra por género o selecciona el corazón para ver vuestras obras maestras preferidas.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#cine-list',
          popover: {
            title: 'Nuestra Cartelera 📺',
            description: 'Todas vuestras pelis y series guardadas. ¡Incluso podréis apuntar quién se quedó dormido primero!',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '#cine-add',
          popover: {
            title: 'Nueva Peli/Serie 🎥',
            description: 'Añadid vuestras próximas películas a ver o las que acabáis de terminar.',
            side: 'top',
            align: 'center'
          }
        }
      ],
      onDestroyed: () => {
        this.markTutorialAsSeen('cine_tour');
      }
    });

    tour.drive();
  }
  public async showGastroAddTour() {
    if (await this.hasSeenTutorial('gastro_add_tour')) return;

    const tour = driver({
      showProgress: true,
      doneBtnText: '¡A puntuar!',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Atrás',
      steps: [
        {
          element: '#gastro-add-name',
          popover: {
            title: 'Nombre del sitio 📝',
            description: '¿Cómo se llama este templo de la comida?',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#gastro-add-location',
          popover: {
            title: 'Ubicación 📍',
            description: 'Pon la ciudad o el barrio, así sabréis adónde volver cuando haya hambre.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#gastro-add-category',
          popover: {
            title: 'Categoría 🌮',
            description: '¿Es comida italiana, mexicana, o un kebab de madrugada?',
            side: 'top',
            align: 'start'
          }
        },
        {
          element: '#gastro-add-desc',
          popover: {
            title: 'La reseña ✍️',
            description: 'Apunta qué pedisteis, qué plato es la estrella y si merece la pena volver.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '#gastro-add-rating',
          popover: {
            title: 'Veredicto final ⭐',
            description: '¿Le dais 5 estrellas Michelin o se queda en 1?',
            side: 'top',
            align: 'center'
          }
        }
      ],
      onDestroyed: () => {
        this.markTutorialAsSeen('gastro_add_tour');
      }
    });

    tour.drive();
  }

  public async showCineAddTour() {
    if (await this.hasSeenTutorial('cine_add_tour')) return;

    const tour = driver({
      showProgress: true,
      doneBtnText: '¡Guardar peli!',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Atrás',
      steps: [
        {
          element: '#cine-add-name',
          popover: {
            title: 'Título 🎬',
            description: 'El nombre de la peli o serie que os acaba de robar el tiempo.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#cine-add-desc',
          popover: {
            title: 'Sinopsis 📜',
            description: '¿De qué iba? Resumidlo a vuestra manera.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#cine-add-category',
          popover: {
            title: 'Género 🎭',
            description: 'Romántica, terror, o "no sé de qué iba pero me he reído".',
            side: 'top',
            align: 'start'
          }
        },
        {
          element: '#cine-add-quote',
          popover: {
            title: 'Momento Top 💬',
            description: 'Aquella frase mítica que os hizo reír o llorar.',
            side: 'top',
            align: 'center'
          }
        },
        {
          element: '#cine-add-rating',
          popover: {
            title: 'Puntuación ⭐',
            description: '¿Ha sido un peliculón o un tostón infumable?',
            side: 'top',
            align: 'center'
          }
        }
      ],
      onDestroyed: () => {
        this.markTutorialAsSeen('cine_add_tour');
      }
    });

    tour.drive();
  }
}
