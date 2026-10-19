import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { rolesFromAccount, isCliente, canCreateReservation } from '../../auth/role.util';
import { AppShellComponent } from '../../layout/app-shell.component';

type MePayload = Record<string, unknown>;

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
  /** Roles del id token (UI local). El cierre de #14 usa los del BFF cuando llegan. */
  readonly tokenRoles = computed(() => rolesFromAccount(this.account()));
  readonly roles = computed(() => {
    const fromBff = this.bffRoles();
    return fromBff.length > 0 ? fromBff : this.tokenRoles();
  });
  readonly displayName = computed(() => {
    const fromBff = this.bffUser();
    if (fromBff) {
      return fromBff;
    }
    const roles = this.roles();
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
    return this.name();
  });
  readonly headline = computed(() => {
    const roles = this.roles();
    if (roles.includes('Cliente')) {
      return 'Consulta tus reservas y planea tu próxima escapada.';
    }
    if (roles.includes('Operador')) {
      return 'Gestiona la operación del hostal con claridad y rapidez.';
    }
    if (roles.includes('Auditor')) {
      return 'Puedes revisar la operación con una mirada de control. Catálogo y reservas los gestiona recepción.';
    }
    if (roles.includes('Admin')) {
      return 'Gestiona el catálogo y la operación del hostal con una visión general de reservas.';
    }
    return 'Bienvenido a AndesStay.';
  });
  readonly isGuest = computed(() => isCliente(this.roles()));
  readonly isOperador = computed(() => this.roles().includes('Operador'));
  readonly isAuditor = computed(() => this.roles().includes('Auditor'));
  readonly isAdmin = computed(() => this.roles().includes('Admin'));
  readonly showNewReservation = computed(() => canCreateReservation(this.roles()));

  readonly meStatus = signal('Comprobando tu sesión…');
  readonly meHttp = signal<number | null>(null);
  readonly bffUser = signal('');
  readonly bffRoles = signal<string[]>([]);
  readonly sessionKind = computed(() => {
    const code = this.meHttp();
    if (code === 200) {
      return 'ok';
    }
    if (code === 403) {
      return 'warn';
    }
    if (code === 401 || code === 0 || (code != null && code >= 500)) {
      return 'bad';
    }
    if (this.meStatus().includes('sesión')) {
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
      this.meStatus.set('No hay una sesión activa');
      this.meHttp.set(null);
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
        .get<MePayload>(`${environment.apiUrl}/me`, {
          headers: { Authorization: `Bearer ${token.accessToken}` },
        })
        .subscribe({
          next: (body) => {
            this.meHttp.set(200);
            this.meStatus.set('Sesión activa');
            this.bffUser.set(pickUser(body) || this.name());
            this.bffRoles.set(pickRoles(body));
          },
          error: (err: HttpErrorResponse) => this.showHttpError(err),
        });
    } catch {
      this.meHttp.set(null);
      this.meStatus.set('No se pudo confirmar tu sesión');
    }
  }

  private showHttpError(err: HttpErrorResponse): void {
    this.meHttp.set(err.status);
    this.bffUser.set('');
    this.bffRoles.set([]);
    if (err.status === 0) {
      this.meStatus.set('No pudimos conectar con el servicio');
    } else if (err.status === 401) {
      this.meStatus.set('Tu sesión no es válida. Vuelve a iniciar sesión.');
    } else if (err.status === 403) {
      this.meStatus.set('No tienes permiso para esta acción');
    } else if (err.status === 502 || err.status === 503) {
      this.meStatus.set('El servicio no está disponible por el momento');
    } else {
      this.meStatus.set('No se pudo confirmar tu sesión');
    }
  }
}

function pickUser(body: MePayload): string {
  const keys = ['name', 'nombre', 'preferred_username', 'username', 'email', 'sub', 'oid'];
  for (const key of keys) {
    const match = Object.keys(body).find((k) => k.toLowerCase() === key.toLowerCase());
    const value = match ? body[match] : null;
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return '';
}

function pickRoles(body: MePayload): string[] {
  const keys = ['roles', 'role', 'authorities'];
  for (const key of keys) {
    const match = Object.keys(body).find((k) => k.toLowerCase() === key.toLowerCase());
    if (!match) {
      continue;
    }
    const value = body[match];
    if (Array.isArray(value)) {
      return value.map(String).filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
      return value.split(/[,\s]+/).filter(Boolean);
    }
  }
  return [];
}
