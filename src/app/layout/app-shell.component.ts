import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { canCreateReservation, rolesFromAccount } from '../auth/role.util';

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
  readonly showNewReservation = computed(() => canCreateReservation(this.rolesList()));
  readonly name = this.account?.name ?? this.account?.username ?? 'Usuario';
  readonly roles = this.rolesList().join(', ') || 'sin rol';

  logout(): void {
    this.msal.logoutRedirect();
  }
}
