# Flujo de Trabajo: Revisión de Seguridad

Ejecuta estos pasos para validar la seguridad de cualquier componente o controlador modificado:

1. **Revisión de Autorización (Backend)**:
   - Valida que la ruta en Laravel esté protegida por el middleware de sesión de la API (ej. `auth:sanctum`).
   - Revisa que en las operaciones destructivas o de modificación (borrar foto, editar mensaje, etc.), el controlador compruebe que el recurso pertenece genuinamente al usuario logueado (`Auth::user()->id`) o a la pareja registrada.

2. **Validación de Inputs (Backend)**:
   - Confirma que todas las entradas de usuario (`$request->all()`) sean sanitizadas y validadas mediante `$request->validate([...])` antes de insertarse en base de datos para prevenir inyecciones.

3. **Filtrado de Salida (Frontend)**:
   - Cerciórate de que Angular esté renderizando los textos usando interpolación segura (`{{ }}`).
   - Si se inyecta HTML directo (`[innerHTML]`), asegúrate de que pase por el `DomSanitizer` para evitar Cross-Site Scripting (XSS).

4. **Almacenamiento Seguro (Frontend)**:
   - Verifica que los datos confidenciales, contraseñas o tokens no se queden en memorias globales desprotegidas o localstorage ordinario (solo usar `@capacitor/preferences`).
