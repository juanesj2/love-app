import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    canActivate: [authGuard]
  },
  {
    path: 'questions',
    loadComponent: () => import('./widgets/questions-widget/questions-widget.component').then(m => m.QuestionsWidgetComponent),
    canActivate: [authGuard]
  },
  {
    path: 'games',
    loadComponent: () => import('./widgets/games-hub/games-hub.component').then(m => m.GamesHubComponent),
    canActivate: [authGuard]
  },
  {
    path: 'games/swipe',
    loadComponent: () => import('./widgets/swipe-game/swipe-game.component').then(m => m.SwipeGameComponent),
    canActivate: [authGuard]
  },
  {
    path: 'games/draw',
    loadComponent: () => import('./widgets/drawing-game/drawing-game.component').then(m => m.DrawingGameComponent),
    canActivate: [authGuard]
  },
  {
    path: 'games/roulette',
    loadComponent: () => import('./widgets/roulette-widget/roulette-widget.component').then(m => m.RouletteWidgetComponent),
    canActivate: [authGuard]
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'pairing',
    loadComponent: () => import('./pairing/pairing.page').then( m => m.PairingPage)
  },
  {
    path: 'achievements',
    loadComponent: () => import('./widgets/achievements-widget/achievements-widget.component').then(m => m.AchievementsWidgetComponent),
    canActivate: [authGuard]
  },
];
