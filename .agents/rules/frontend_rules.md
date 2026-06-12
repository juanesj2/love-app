---
description: Reglas de desarrollo para la interfaz y lógica en el Frontend (Angular/Ionic)
globs: ["src/**/*.ts", "src/**/*.html", "src/**/*.scss"]
---

# Reglas del Frontend (Ionic / Angular)

1. **Componentización y UI**:
   - Utilizar componentes de Ionic (`<ion-card>`, `<ion-button>`, etc.) para garantizar el "look and feel" nativo.
   - Mantener un diseño estéticamente **Premium**. Si utilizas CSS/SCSS, asegúrate de aplicar buenas prácticas, uso de variables, bordes redondeados, sombras suaves y micro-animaciones que asombren al usuario.
2. **Interacciones con API**:
   - No utilizar `fetch` directamente. Todas las peticiones HTTP deben realizarse inyectando `HttpClient` en los servicios de Angular (principalmente en `love-api.service.ts`).
   - Todos los endpoints deben utilizar la constante de entorno importada desde environment.
3. **Estado y Tokens**:
   - La gestión del token de autenticación se hace mediante Capacitor Preferences (`@capacitor/preferences`), nunca en localStorage plano.
4. **Programación Reactiva**:
   - Fomentar el uso de RxJS (Observables, BehaviorSubjects) para el manejo de estado global.
