import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BffApiService } from '../../api/bff-api.service';
import { fieldOf } from '../../api/unit-profile';
import {
  canCreateReservation,
  canOperateCatalog,
  isCliente,
  rolesFromAccount,
} from '../../auth/role.util';
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
  private readonly api = inject(BffApiService);

  readonly account = signal(this.msal.instance.getActiveAccount());
  readonly name = computed(() => this.account()?.name ?? this.account()?.username ?? 'Usuario');
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
      return 'Escritorio de recepción: estados de reserva, altas y unidades.';
    }
    if (roles.includes('Auditor')) {
      return 'Puedes revisar la operación con una mirada de control. Catálogo y reservas los gestiona recepción.';
    }
    if (roles.includes('Admin')) {
      return 'Administración: inventario, reservas y control.';
    }
    return 'Bienvenido a AndesStay.';
  });
  readonly isGuest = computed(() => isCliente(this.roles()));
  readonly isStaffDesk = computed(() => canOperateCatalog(this.roles()));
  readonly isOperador = computed(() => this.roles().includes('Operador'));
  readonly isAuditor = computed(() => this.roles().includes('Auditor'));
  readonly isAdmin = computed(() => this.roles().includes('Admin'));
  readonly showNewReservation = computed(() => canCreateReservation(this.roles()));

  readonly bffUser = signal('');
  readonly bffRoles = signal<string[]>([]);
  readonly unitsCount = signal(0);
  readonly reservationsCount = signal(0);
  readonly pendingCount = signal(0);
  readonly inStayCount = signal(0);
  readonly deskLoading = signal(false);
  readonly recentRows = signal<Record<string, unknown>[]>([]);

  ngOnInit(): void {
    void this.loadMe();
    if (this.isStaffDesk()) {
      void this.loadDesk();
    }
  }

  statusOf(row: Record<string, unknown>): string {
    return (fieldOf(row, ['status', 'estado']) || 'CREADA').toUpperCase();
  }

  titleOf(row: Record<string, unknown>): string {
    return fieldOf(row, ['unitName', 'unidad', 'name', 'code']) || 'Reserva';
  }

  guestOf(row: Record<string, unknown>): string {
    return fieldOf(row, ['customerName', 'customerUserId', 'guest', 'nombre']) || 'Huésped';
  }

  datesOf(row: Record<string, unknown>): string {
    const inn = fieldOf(row, ['checkInDate', 'checkIn', 'from']);
    const out = fieldOf(row, ['checkOutDate', 'checkOut', 'to']);
    if (inn && out) {
      return `${inn} → ${out}`;
    }
    return inn || out || '—';
  }

  private async loadMe(): Promise<void> {
    const account =
      this.msal.instance.getActiveAccount() ?? this.msal.instance.getAllAccounts()[0] ?? null;
    if (!account) {
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
            this.bffUser.set(pickUser(body) || this.name());
            this.bffRoles.set(pickRoles(body));
            if (canOperateCatalog(this.roles())) {
              void this.loadDesk();
            }
          },
          error: (_err: HttpErrorResponse) => {
            this.bffUser.set('');
            this.bffRoles.set([]);
          },
        });
    } catch {
      // roles del token bastan para renderizar
    }
  }

  private async loadDesk(): Promise<void> {
    this.deskLoading.set(true);
    try {
      const [units, reservations] = await Promise.all([
        this.api.catalogUnits(),
        this.api.reservations(),
      ]);
      if (units.status === 'ok') {
        this.unitsCount.set(units.items.length);
      }
      if (reservations.status === 'ok') {
        this.reservationsCount.set(reservations.items.length);
        const pending = reservations.items.filter((row) => {
          const s = this.statusOf(row);
          return s === 'CREADA' || s === 'CONFIRMADA' || s === 'CHECKIN_PENDIENTE';
        }).length;
        const inStay = reservations.items.filter((row) => this.statusOf(row) === 'EN_ESTADIA').length;
        this.pendingCount.set(pending);
        this.inStayCount.set(inStay);
        this.recentRows.set(reservations.items.slice(0, 6));
      }
    } finally {
      this.deskLoading.set(false);
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
