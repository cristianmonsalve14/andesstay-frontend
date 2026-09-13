import { Component, computed, inject, signal } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { rolesFromAccount } from '../../auth/role.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  private readonly msal = inject(MsalService);

  readonly account = signal(this.msal.instance.getActiveAccount());
  readonly name = computed(() => this.account()?.name ?? this.account()?.username ?? 'Usuario');
  readonly roles = computed(() => rolesFromAccount(this.account()));
  readonly headline = computed(() => {
    const roles = this.roles();
    if (roles.includes('Admin')) {
      return 'Ocupación y KPIs (vista Admin)';
    }
    if (roles.includes('Operador')) {
      return 'Llegadas y salidas del día (vista Operador)';
    }
    if (roles.includes('Cliente')) {
      return 'Tus reservas y estado (vista Cliente)';
    }
    if (roles.includes('Auditor')) {
      return 'Timeline de auditoría (solo lectura)';
    }
    return 'Sesión iniciada. Aún no hay rol de aplicación en el token.';
  });

  logout(): void {
    this.msal.logoutRedirect();
  }
}
