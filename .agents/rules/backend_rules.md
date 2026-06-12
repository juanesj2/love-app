---
description: Reglas de desarrollo para el backend en Laravel (Controladores, Rutas y Lógica de Negocio)
globs: ["Enfoca_ProyectoFinal/app/**/*.php", "Enfoca_ProyectoFinal/routes/**/*.php"]
---

# Reglas del Backend (Laravel)

1. **Ubicación de Archivos**:
   - Todos los controladores API deben ubicarse en `Enfoca_ProyectoFinal/app/Http/Controllers/Api/`.
   - Las rutas deben ser registradas en `Enfoca_ProyectoFinal/routes/api.php` bajo el middleware `auth:sanctum` (salvo rutas públicas de login/registro).
2. **Respuestas API**:
   - Retornar siempre respuestas JSON estructuradas.
   - Utilizar códigos de estado HTTP apropiados (200 OK, 201 Created, 400 Bad Request, 403 Forbidden, 404 Not Found).
3. **Seguridad y Autorización**:
   - Verificar siempre que el usuario autenticado tiene permisos para acceder al recurso (ej. validar que la foto que intenta borrar pertenece a él o a su pareja).
   - Extraer al usuario autenticado usando `Auth::user()`.
4. **Estilo de Código**:
   - Seguir el estándar PSR-12 para PHP.
   - Tipar explícitamente los parámetros y retornos de las funciones siempre que sea posible.
