import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { rolesFromAccount } from '../auth/role.util';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
})
export class AppShellComponent {
  private readonly msal = inject(MsalService);

  readonly name =
    this.msal.instance.getActiveAccount()?.name ??
    this.msal.instance.getActiveAccount()?.username ??
    'Usuario';
  readonly roles = rolesFromAccount(this.msal.instance.getActiveAccount()).join(', ') || 'sin rol';

  logout(): void {
    this.msal.logoutRedirect();
  }
}
