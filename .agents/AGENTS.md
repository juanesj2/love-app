# Reglas del Proyecto Love App

## Patrones de UI y Dise帽o
- **Animaci贸n de Barra de Pesta帽as (Tab Bar Hiding)**: Cuando se abren modales de pantalla completa (como el Timeline o Detalles), es una excelente pr谩ctica ocultar la barra de navegaci贸n principal inferior (`ion-tab-bar`) para evitar que estorbe con los botones de acci贸n del modal (como los FAB buttons o footers). El patr贸n implementado consiste en usar una clase global `.hide-tabs` en el `body` que aplica `transform: translateY(100%)` a `ion-tab-bar` con una transici贸n `cubic-bezier`. Para aplicarlo, se debe a帽adir `document.body.classList.add('hide-tabs')` al abrir el modal y `document.body.classList.remove('hide-tabs')` al cerrarlo.

## Patr髇 de Pesta馻s Deslizables (Swipeable Tabs)
- **Implementaci髇 de Gestos y Animaciones**: Para permitir a los usuarios deslizar entre pesta馻s, el contenedor principal debe tener (touchstart)=onTouchStart($event) y (touchend)=onTouchEnd($event).
- **L骻ica de Swipe en TS**: Guardar 	ouchStartX y 	ouchEndX, calcular la diferencia (diff) con un umbral de 50px, y cambiar la pesta馻 actual bas醤dose en si la diferencia es positiva o negativa. Adem醩, a馻dir clases din醡icas de animaci髇 (swipe-left-enter o swipe-right-enter) que se eliminan tras 300ms con un setTimeout.
- **CSS de Animaciones**: Usar @keyframes slideInRight y @keyframes slideInLeft junto con transiciones en el contenedor principal para que los elementos entren suavemente desde los lados.
