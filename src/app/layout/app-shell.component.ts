import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import {
  canCreateReservation,
  canViewAudit,
  canViewCatalog,
  canViewReservations,
  rolesFromAccount,
} from '../auth/role.util';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
})
export class AppShellComponent {
  private readonly msal = inject(MsalService);

  readonly account = this.msal.instance.getActiveAccount();
  readonly rolesList = computed(() => rolesFromAccount(this.account));
  readonly showCatalog = computed(() => canViewCatalog(this.rolesList()));
  readonly showReservations = computed(() => canViewReservations(this.rolesList()));
  readonly showNewReservation = computed(() => canCreateReservation(this.rolesList()));
  readonly showAudit = computed(() => canViewAudit(this.rolesList()));
  readonly name = this.account?.name ?? this.account?.username ?? 'Usuario';
  readonly displayName = computed(() => {
    const roles = this.rolesList();
    if (roles.includes('Operador')) {
      return 'AndesStay Operador';
    }
    if (roles.includes('Auditor')) {
      return 'AndesStay Auditor';
    }
    if (roles.includes('Admin')) {
      return 'AndesStay Admin';
    }
    if (roles.includes('Cliente')) {
      return 'AndesStay Cliente';
    }
    return this.name;
  });
  readonly roles = this.rolesList().join(', ') || 'sin rol';

  logout(): void {
    this.msal.logoutRedirect();
  }
}
