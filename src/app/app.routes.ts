import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'questions',
    loadComponent: () => import('./widgets/questions-widget/questions-widget.component').then(m => m.QuestionsWidgetComponent)
  },
  {
    path: 'games',
    loadComponent: () => import('./widgets/games-hub/games-hub.component').then(m => m.GamesHubComponent)
  },
  {
    path: 'games/swipe',
    loadComponent: () => import('./widgets/swipe-game/swipe-game.component').then(m => m.SwipeGameComponent)
  },
  {
    path: 'games/draw',
    loadComponent: () => import('./widgets/drawing-game/drawing-game.component').then(m => m.DrawingGameComponent)
  },
  {
    path: 'games/roulette',
    loadComponent: () => import('./widgets/roulette-widget/roulette-widget.component').then(m => m.RouletteWidgetComponent)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then( m => m.LoginPage)
  },  {
    path: 'pairing',
    loadComponent: () => import('./pairing/pairing.page').then( m => m.PairingPage)
  },

];
