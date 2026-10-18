import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { rolesFromAccount, isCliente, canCreateReservation } from '../../auth/role.util';
import { AppShellComponent } from '../../layout/app-shell.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AppShellComponent, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly msal = inject(MsalService);
  private readonly http = inject(HttpClient);

  readonly account = signal(this.msal.instance.getActiveAccount());
  readonly name = computed(() => this.account()?.name ?? this.account()?.username ?? 'Usuario');
  readonly roles = computed(() => rolesFromAccount(this.account()));
  readonly headline = computed(() => {
    const roles = this.roles();
    if (roles.includes('Cliente')) {
      return 'Consulta tus reservas y planea tu próxima escapada.';
    }
    if (roles.includes('Operador')) {
      return 'Gestiona la operación del hostal con claridad y rapidez.';
    }
    if (roles.includes('Auditor')) {
      return 'Revisa información clave de la operación con una visión general.';
    }
    if (roles.includes('Admin')) {
      return 'Gestiona el catálogo y la operación del hostal con una visión general de reservas.';
    }
    return 'Bienvenido a AndesStay.';
  });
  readonly showNewReservation = computed(() => canCreateReservation(this.roles()));

  isGuest(): boolean {
    return isCliente(this.roles());
  }
  readonly meStatus = signal('Verificando sesión…');
  readonly meBody = signal('');
  readonly sessionKind = computed(() => {
    const text = this.meStatus();
    if (text.startsWith('Verificada') || text.startsWith('Sesión')) {
      return 'ok';
    }
    if (text.includes('permiso') || text.includes('acceso')) {
      return 'warn';
    }
    if (text.includes('no disponible') || text.includes('sesión') || text.includes('No se pudo')) {
      return 'bad';
    }
    return 'idle';
  });

  ngOnInit(): void {
    void this.loadMe();
  }

  private async loadMe(): Promise<void> {
    const account =
      this.msal.instance.getActiveAccount() ?? this.msal.instance.getAllAccounts()[0] ?? null;
    if (!account) {
      this.meStatus.set('No hay sesión activa');
      return;
    }
    this.msal.instance.setActiveAccount(account);

    try {
      const token = await firstValueFrom(
        this.msal.acquireTokenSilent({
          account,
          scopes: environment.apiScopes,
        }),
      );
      this.http
        .get(`${environment.apiUrl}/me`, {
          headers: { Authorization: `Bearer ${token.accessToken}` },
        })
        .subscribe({
          next: (body) => {
            this.meStatus.set('Sesión verificada');
            this.meBody.set(JSON.stringify(body, null, 2));
          },
          error: (err: HttpErrorResponse) => this.showHttpError(err),
        });
    } catch (err) {
      this.meStatus.set('No se pudo completar la comprobación de acceso');
      this.meBody.set(err instanceof Error ? err.message : String(err));
    }
  }

  private showHttpError(err: HttpErrorResponse): void {
    if (err.status === 0) {
      this.meStatus.set('Servicio no disponible por el momento');
    } else if (err.status === 401) {
      this.meStatus.set('Tu sesión no es válida');
    } else if (err.status === 403) {
      this.meStatus.set('No tienes permisos para esta acción');
    } else {
      this.meStatus.set('No se pudo completar la solicitud');
    }
    this.meBody.set(
      typeof err.error === 'string' ? err.error : JSON.stringify(err.error ?? err.message, null, 2),
    );
  }

}
