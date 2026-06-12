# Flujo de Trabajo: Crear Nuevo Módulo Full-Stack

Sigue estos pasos en orden estricto cuando necesites crear una funcionalidad completa (Frontend + Backend):

1. **Backend - Base de Datos**:
   - Crea la migración en `Enfoca_ProyectoFinal/database/migrations/`.
   - Define el esquema (columnas, foreign keys).
   - Crea el Modelo en `Enfoca_ProyectoFinal/app/Models/`, agregando sus `$fillable` y definiendo sus relaciones.
   
2. **Backend - Controlador y Rutas**:
   - Crea el controlador en `Enfoca_ProyectoFinal/app/Http/Controllers/Api/`.
   - Escribe los métodos necesarios (index, store, show, update, destroy) retornando JSON.
   - Añade las rutas en `Enfoca_ProyectoFinal/routes/api.php` bajo el middleware correspondiente (`auth:sanctum`).
   
3. **Frontend - Servicio**:
   - Abre `src/app/services/love-api.service.ts`.
   - Crea el/los método(s) apuntando a las nuevas rutas del backend de Laravel, utilizando `firstValueFrom` u Observables según el patrón vigente.
   
4. **Frontend - UI/Componentes**:
   - Genera la vista o componente de Angular dentro de `src/app/widgets/` o `src/app/`.
   - Construye la interfaz con componentes nativos de Ionic.
   - Consume el servicio de la API, maneja estados de carga e implementa el estilo visual premium de la aplicación.
