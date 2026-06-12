# Cerebro Central: Arquitectura Love App

## Resumen del Proyecto
Love App es una plataforma (SaaS potencial) orientada a parejas, diseñada para estrechar el vínculo a través de gamificación, recuerdos y comunicación. 
La aplicación se compone de un ecosistema desacoplado: Frontend en Ionic/Angular y Backend en Laravel (ubicado en el subdirectorio `Enfoca_ProyectoFinal`).

## Estructura Core
- **Frontend (`/src`)**: Aplicación móvil multiplataforma desarrollada con Ionic 8, Angular 20 y Capacitor 8. 
  - Gestión de estado e interacciones API centralizadas en `src/app/services/`.
  - Integración de features nativas (cámara, FCM push, geolocalización) vía Capacitor.
- **Backend (`/Enfoca_ProyectoFinal`)**: API REST construida en Laravel 11.
  - Base de datos relacional (MySQL/PostgreSQL) para manejar la lógica de emparejamiento, chat, juegos e historial de fotos.
  - Autenticación segura mediante Laravel Sanctum (Bearer Tokens).

## Lógica Principal
1. **Vinculación (Pairing)**: Unión de dos cuentas de usuario en la tabla `couples` mediante un código único de 6 caracteres.
2. **Gamificación y Rachas**: La app registra el `current_streak` basado en fotos diarias (almacenadas como `LovePhoto`).
3. **Comunicación**: Sistema de chat privado entre la pareja con posibilidad de reacciones, adjuntos fotográficos y envío de GIFs mediante la API de Giphy.
4. **Juegos (Games Hub)**: Subsistemas como "Swipe Game" (Tinder-style), Preguntas, Dibujos y Ruleta, cuyas interacciones se sincronizan con la base de datos a través de `GameController`.

## Regla de Oro: Control de Versiones
Cualquier cambio de código realizado en este proyecto **DEBE** subirse inmediatamente a GitHub. 
Dado que el frontend (`love-app`) y el backend (`Enfoca_ProyectoFinal`) son repositorios separados, tras finalizar un cambio funcional se deben ejecutar los commits y pushes correspondientes en sus respectivos directorios.

> [!NOTE]
> Cuando la IA o tú comiencen una tarea, siempre mantengan en mente esta arquitectura desacoplada: cualquier feature full-stack requerirá actualizar la base de datos, exponer un endpoint en Laravel, consumir la API vía Angular HttpClient en los servicios, y reflejar la nueva interfaz con componentes Ionic en el Frontend.
