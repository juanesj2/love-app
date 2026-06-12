# Contexto del Proyecto: Love App

## Resumen General
Esta es una aplicación móvil/web orientada a parejas, diseñada para que dos personas se vinculen y compartan momentos, mantengan una racha (streak) diaria, chateen y jueguen minijuegos. El proyecto está dividido en un Frontend (Ionic/Angular) y un Backend (Laravel) alojado como un submódulo/repositorio anidado llamado `Enfoca_ProyectoFinal`.

## Arquitectura y Tecnologías
- **Frontend**: Ionic 8, Angular 20, Capacitor 8.
  - Almacenamiento local de tokens mediante `@capacitor/preferences`.
  - Integración de funciones nativas (cámara, notificaciones push/locales, geolocalización) a través de Capacitor.
  - Módulo principal en `src/app/` que incluye: autenticación, dashboard principal, servicios (`love-api.service.ts`) y widgets (minijuegos).
- **Backend**: Laravel 11/10 (PHP), base de datos relacional (MySQL/PostgreSQL) gestionada a través de Eloquent.
  - Autenticación mediante Laravel Sanctum (Tokens Bearer).
  - API REST bajo el prefijo `/api/love-album/` y `/api/games/`.
  - Las migraciones clave para esta app tienen el prefijo `2026_05_25` y `2026_05_26`.

## Características y Flujos Principales
1. **Vinculación de Pareja (Pairing)**:
   - Los usuarios tienen un `pairing_code` de 6 caracteres.
   - Un usuario ingresa el código del otro para crear un registro en la tabla `couples`.
   - Límite de 1 pareja por usuario; no pueden vincularse a sí mismos.
2. **Rachas (Streaks) y Estado de Ánimo**:
   - Cada pareja mantiene un contador de días consecutivos (`current_streak`) subiendo al menos una foto diaria (`LovePhoto`).
   - Si no se sube foto en más de un día, la racha se reinicia automáticamente al hacer fetch de la info.
   - Los usuarios pueden actualizar su estado de ánimo (`current_mood`), lo que envía una notificación Push (FCM) a su pareja.
3. **Fotos y Álbumes**:
   - Las fotos subidas se almacenan como `LovePhoto`.
   - Las parejas pueden agrupar fotos en `LoveAlbum`.
   - Las fotos permiten reacciones (`LovePhotoReaction`).
4. **Chat en Pareja**:
   - Mensajería uno a uno exclusiva (`couple_messages`).
   - Soporta adjuntar fotos (`love_photo_id`), responder mensajes (`reply_to`), editar y reaccionar.
5. **Hitos (Milestones)**:
   - Seguimiento de fechas importantes (aniversarios, primer beso, etc.) en `couple_milestones`.
6. **Hub de Minijuegos**:
   - **Preguntas Diarias**: Responder preguntas mutuamente y ver las respuestas.
   - **Swipe Game (Estilo Tinder)**: Responder Sí/No deslizando tarjetas. La app compara las respuestas (`swipe_answers`) para mostrar coincidencias o diferencias.
   - **Drawing Game**: Retos de dibujo; un usuario dibuja según el prompt y sube la imagen (`drawings`).
   - **Roulette Game**: Ruleta personalizable (`couple_roulette_options`) para tomar decisiones juntos (ej. ¿qué comer?, ¿qué peli ver?).

## Estructura de Directorios Clave
- `src/app/services/love-api.service.ts`: Core del frontend donde se definen todas las llamadas a la API REST.
- `src/app/widgets/`: Componentes de UI de los distintos juegos y módulos (Roulette, Games Hub, Swipe, Draw, Questions).
- `Enfoca_ProyectoFinal/routes/api.php`: Define todas las rutas de `LoveAlbumController`, `CoupleChatController` y `GameController`.
- `Enfoca_ProyectoFinal/database/migrations/`: Estructura de BD (tablas `couples`, `love_photos`, `couple_messages`, `swipe_questions`, etc.).
- `Enfoca_ProyectoFinal/app/Http/Controllers/Api/`: Controladores con la lógica de negocio.

## Reglas y Convenciones de Desarrollo
1. Al crear nuevas características, asegurar coherencia entre el servicio frontend (`love-api.service.ts`) y el controlador de Laravel.
2. Manejar correctamente la inyección de headers (Token de Sanctum) en las llamadas de Angular.
3. El frontend es estrictamente Ionic/Angular, priorizar componentes de Ionic (`<ion-...>`) y uso de estilos de Ionic.
4. El backend requiere el uso correcto de las relaciones Eloquent considerando la tabla pivote implícita o relaciones directas a través del ID de la pareja (`couple_id`).
