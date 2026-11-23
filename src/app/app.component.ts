import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { filter } from 'rxjs';
import { environment } from '../environments/environment';
import {
  clearAccessTokenRoles,
  rolesFromAccount,
  rolesFromJwt,
  setAccessTokenRoles,
} from './auth/role.util';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly msal = inject(MsalService);
  private readonly broadcast = inject(MsalBroadcastService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.msal.handleRedirectObservable().subscribe({
      next: (result) => {
        void this.afterRedirect(result?.account ?? null);
      },
      error: (err) => console.error('MSAL redirect', err),
    });

    this.broadcast.inProgress$
      .pipe(filter((status) => status === InteractionStatus.None))
      .subscribe(() => {
        if (!this.msal.instance.getActiveAccount()) {
          const [first] = this.msal.instance.getAllAccounts();
          if (first) {
            this.msal.instance.setActiveAccount(first);
          }
        }
      });
  }

  private async afterRedirect(
    redirectAccount: ReturnType<MsalService['instance']['getActiveAccount']>,
  ): Promise<void> {
    const account =
      redirectAccount ??
      this.msal.instance.getActiveAccount() ??
      this.msal.instance.getAllAccounts()[0] ??
      null;
    if (!account) {
      return;
    }
    this.msal.instance.setActiveAccount(account);

    // Entra a veces pone `roles` solo en el access token del API scope.
    if (!rolesFromAccount(account).length) {
      try {
        const silent = await this.msal.instance.acquireTokenSilent({
          account,
          scopes: environment.apiScopes,
        });
        setAccessTokenRoles(rolesFromJwt(silent.accessToken));
      } catch (err) {
        clearAccessTokenRoles();
        console.warn('MSAL acquireTokenSilent (roles)', err);
      }
    }

    const roles = rolesFromAccount(account);
    console.info('AndesStay sesión', {
      user: account.username,
      roles,
      idTokenClaims: account.idTokenClaims,
    });

    const url = this.router.url.split('?')[0];
    if (!roles.length) {
      if (url !== '/login') {
        void this.router.navigate(['/login'], {
          queryParams: { reason: 'roles', user: account.username },
        });
      }
      return;
    }
    if (url === '/' || url === '/login') {
      void this.router.navigateByUrl('/dashboard');
    }
  }
}
