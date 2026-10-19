import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { CatalogComponent } from './pages/catalog/catalog.component';
import { ReservationsComponent } from './pages/reservations/reservations.component';
import { ReservationNewComponent } from './pages/reservations/reservation-new.component';
import { AuditComponent } from './pages/audit/audit.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [MsalGuard] },
  { path: 'catalogo', component: CatalogComponent, canActivate: [MsalGuard] },
  { path: 'reservas/nueva', component: ReservationNewComponent, canActivate: [MsalGuard] },
  { path: 'reservas', component: ReservationsComponent, canActivate: [MsalGuard] },
  { path: 'auditoria', component: AuditComponent, canActivate: [MsalGuard] },
  { path: '**', redirectTo: 'login' },
];
