import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { rolesFromAccount } from '../../auth/role.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
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
  readonly meStatus = signal('Cargando GET /api/me…');
  readonly meBody = signal('');

  ngOnInit(): void {
    void this.loadMe();
  }

  private async loadMe(): Promise<void> {
    const account =
      this.msal.instance.getActiveAccount() ?? this.msal.instance.getAllAccounts()[0] ?? null;
    if (!account) {
      this.meStatus.set('No hay sesión MSAL');
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
            this.meStatus.set('200 — JWT aceptado por el BFF');
            this.meBody.set(JSON.stringify(body, null, 2));
          },
          error: (err: HttpErrorResponse) => this.showHttpError(err),
        });
    } catch (err) {
      this.meStatus.set('No se pudo obtener el access token de Azure');
      this.meBody.set(err instanceof Error ? err.message : String(err));
    }
  }

  private showHttpError(err: HttpErrorResponse): void {
    if (err.status === 0) {
      this.meStatus.set(`Sin conexión a ${environment.apiUrl}`);
    } else {
      this.meStatus.set(`${err.status} ${err.error?.error ?? 'error'}`);
    }
    this.meBody.set(
      typeof err.error === 'string' ? err.error : JSON.stringify(err.error ?? err.message, null, 2),
    );
  }

  logout(): void {
    this.msal.logoutRedirect();
  }
}
