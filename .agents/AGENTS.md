# Reglas del Proyecto Love App

## Patrones de UI y Diseño
- **Animación de Barra de Pestañas (Tab Bar Hiding)**: Cuando se abren modales de pantalla completa (como el Timeline o Detalles), es una excelente práctica ocultar la barra de navegación principal inferior (`ion-tab-bar`) para evitar que estorbe con los botones de acción del modal (como los FAB buttons o footers). El patrón implementado consiste en usar una clase global `.hide-tabs` en el `body` que aplica `transform: translateY(100%)` a `ion-tab-bar` con una transición `cubic-bezier`. Para aplicarlo, se debe añadir `document.body.classList.add('hide-tabs')` al abrir el modal y `document.body.classList.remove('hide-tabs')` al cerrarlo.
