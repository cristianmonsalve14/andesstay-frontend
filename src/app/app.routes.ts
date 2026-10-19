import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { RoleGuard } from './auth/role.guard';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { CatalogComponent } from './pages/catalog/catalog.component';
import { ReservationsComponent } from './pages/reservations/reservations.component';
import { ReservationNewComponent } from './pages/reservations/reservation-new.component';
import { AuditComponent } from './pages/audit/audit.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [MsalGuard, RoleGuard],
    data: { roles: ['Cliente', 'Operador', 'Auditor', 'Admin'] },
  },
  {
    path: 'catalogo',
    component: CatalogComponent,
    canActivate: [MsalGuard, RoleGuard],
    data: { roles: ['Cliente', 'Operador', 'Auditor', 'Admin'] },
  },
  {
    path: 'reservas/nueva',
    component: ReservationNewComponent,
    canActivate: [MsalGuard, RoleGuard],
    data: { roles: ['Cliente', 'Operador', 'Admin'] },
  },
  {
    path: 'reservas',
    component: ReservationsComponent,
    canActivate: [MsalGuard, RoleGuard],
    data: { roles: ['Cliente', 'Operador', 'Auditor', 'Admin'] },
  },
  {
    path: 'auditoria',
    component: AuditComponent,
    canActivate: [MsalGuard, RoleGuard],
    data: { roles: ['Auditor', 'Admin'] },
  },
  { path: '**', redirectTo: 'login' },
];
