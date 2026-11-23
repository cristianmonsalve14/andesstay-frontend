import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../../../environments/environment';
import { clearAccessTokenRoles, rolesFromAccount } from '../../auth/role.util';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private readonly msal = inject(MsalService);
  private readonly route = inject(ActivatedRoute);

  readonly hint = signal('');

  ngOnInit(): void {
    const reason = this.route.snapshot.queryParamMap.get('reason');
    const userParam = this.route.snapshot.queryParamMap.get('user');
    const account = this.msal.instance.getActiveAccount() ?? this.msal.instance.getAllAccounts()[0];
    const who = userParam || account?.username || '(cuenta desconocida)';

    if (reason === 'roles') {
      this.hint.set(
        `Entraste como ${who}, pero esa cuenta no trae App roles (Admin/Operador/Cliente/Auditor). Debes elegir andesstay.admin@proyectomonsalve.onmicrosoft.com (u otro usuario de prueba del tenant). Si ya es ese usuario, falta asignarle el App role en Entra → Enterprise applications → AndesStay → Users and groups.`,
      );
    } else if (reason === 'forbidden') {
      this.hint.set('Tu usuario no tiene permiso para esa pantalla.');
    } else if (account && !rolesFromAccount(account).length) {
      this.hint.set(
        `Sesión detectada (${who}) sin roles. Pulsa Continuar y elige andesstay.admin@proyectomonsalve.onmicrosoft.com.`,
      );
    }
  }

  async login(): Promise<void> {
    this.hint.set('Redirigiendo a Microsoft…');

    // Sesión local sin roles + SSO silencioso: parece que el botón “no hace nada”.
    const stale = this.msal.instance
      .getAllAccounts()
      .some((account) => !rolesFromAccount(account).length);
    if (stale) {
      clearAccessTokenRoles();
      await this.msal.instance.clearCache();
    }
    this.msal.instance.setActiveAccount(null);

    this.msal
      .loginRedirect({
        scopes: environment.apiScopes,
        prompt: 'select_account',
      })
      .subscribe({
        error: (err: unknown) => {
          console.error('MSAL loginRedirect', err);
          const msg = err instanceof Error ? err.message : String(err);
          this.hint.set(
            msg.includes('interaction_in_progress')
              ? 'Hay un login a medias. Recarga la página (F5) y vuelve a intentar.'
              : `No se pudo abrir Microsoft: ${msg}`,
          );
        },
      });
  }
}
