import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { BffApiService, BffCallResult } from '../../api/bff-api.service';
import { PreparationStatus, preparationOf } from '../../api/unit-profile';
import {
  canManageReservationStatus,
  isCliente,
  rolesFromAccount,
} from '../../auth/role.util';
import { AppShellComponent } from '../../layout/app-shell.component';
import { SHOWCASE, unitPhoto } from '../../ui/photos';

const STATUS_LABELS: Record<string, string> = {
  CREADA: 'Creada',
  CONFIRMADA: 'Confirmada',
  CHECKIN_PENDIENTE: 'Check-in pendiente',
  EN_ESTADIA: 'En estadía',
  CHECKOUT: 'Checkout',
  CANCELADA: 'Cancelada',
};

const PREP_LABELS: Record<PreparationStatus, string> = {
  NONE: 'Sin preparación',
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  READY: 'Listo para llegada',
};

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [AppShellComponent, RouterLink],
  templateUrl: './reservations.component.html',
  styleUrl: './reservations.component.css',
})
export class ReservationsComponent implements OnInit {
  private readonly api = inject(BffApiService);
  private readonly msal = inject(MsalService);

  readonly result = signal<BffCallResult | null>(null);
  readonly roles = signal<string[]>([]);
  readonly canManageStatus = signal(false);
  readonly isGuest = signal(false);
  readonly actionError = signal('');

  statusOptionsFor(row: Record<string, unknown>): string[] {
    const current = this.statusOf(row).toUpperCase();
    const transitions: Record<string, string[]> = {
      CREADA: ['CONFIRMADA', 'CANCELADA'],
      CONFIRMADA: ['CHECKIN_PENDIENTE', 'CANCELADA'],
      CHECKIN_PENDIENTE: ['EN_ESTADIA', 'CANCELADA'],
      EN_ESTADIA: ['CHECKOUT'],
      CHECKOUT: [],
      CANCELADA: [],
    };

    return Array.from(new Set([current, ...(transitions[current] ?? [])].filter(Boolean)));
  }

  preparationOptionsFor(row: Record<string, unknown>): PreparationStatus[] {
    const current = this.preparationOf(row);
    if (!this.canEditPreparation(row)) {
      return [current];
    }
    const transitions: Record<PreparationStatus, PreparationStatus[]> = {
      NONE: [],
      PENDING: ['IN_PROGRESS', 'READY'],
      IN_PROGRESS: ['READY'],
      READY: [],
    };
    return Array.from(new Set([current, ...transitions[current]]));
  }

  ngOnInit(): void {
    const roles = rolesFromAccount(this.msal.instance.getActiveAccount());
    this.roles.set(roles);
    this.canManageStatus.set(canManageReservationStatus(roles));
    this.isGuest.set(isCliente(roles));
    void this.load();
  }

  idOf(row: Record<string, unknown>): string {
    return field(row, ['id', 'reservationId', 'reservation_id', 'codigo']) || '0';
  }

  titleOf(row: Record<string, unknown>): string {
    const named = field(row, ['unitName', 'unidad', 'name', 'code']);
    if (named) {
      return named;
    }
    const unitId = field(row, ['unitId']);
    const cabin = SHOWCASE.find((u) => String(u.id) === unitId);
    if (cabin) {
      return cabin.title;
    }
    return 'Estadía AndesStay';
  }

  datesOf(row: Record<string, unknown>): string {
    const inn = field(row, ['checkInDate', 'checkIn', 'check_in', 'from', 'inicio', 'startDate']);
    const out = field(row, ['checkOutDate', 'checkOut', 'check_out', 'to', 'fin', 'endDate']);
    if (inn && out) {
      return `${inn} → ${out}`;
    }
    return inn || out || 'Fechas por confirmar';
  }

  statusOf(row: Record<string, unknown>): string {
    const value = field(row, ['status', 'estado']);
    if (!value) {
      return 'CREADA';
    }

    const normalized = value.toUpperCase();
    const aliases: Record<string, string> = {
      PEDIDO: 'CREADA',
      PENDIENTE: 'CREADA',
    };

    return aliases[normalized] ?? normalized;
  }

  statusLabel(status: string): string {
    const key = status.toUpperCase();
    return STATUS_LABELS[key] ?? key;
  }

  preparationOf(row: Record<string, unknown>): PreparationStatus {
    return preparationOf(row);
  }

  preparationLabel(status: PreparationStatus): string {
    return PREP_LABELS[status];
  }

  isCabinReady(row: Record<string, unknown>): boolean {
    return this.preparationOf(row) === 'READY';
  }

  canEditPreparation(row: Record<string, unknown>): boolean {
    if (!this.canManageStatus()) {
      return false;
    }
    const reservationStatus = this.statusOf(row);
    const prep = this.preparationOf(row);
    const allowedReservation =
      reservationStatus === 'CONFIRMADA' ||
      reservationStatus === 'CHECKIN_PENDIENTE' ||
      reservationStatus === 'EN_ESTADIA';
    return allowedReservation && (prep === 'PENDING' || prep === 'IN_PROGRESS');
  }

  guestsOf(row: Record<string, unknown>): string {
    const guests = field(row, ['guests', 'huespedes', 'pax']);
    return guests ? `${guests} huéspedes` : '';
  }

  customerOf(row: Record<string, unknown>): string {
    return field(row, ['customerName', 'guestName', 'customer', 'nombre']);
  }

  amountOf(row: Record<string, unknown>): string {
    const raw = field(row, ['amount', 'total', 'monto']);
    if (!raw) {
      return '';
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      return raw;
    }
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(n);
  }

  photoOf(row: Record<string, unknown>, index: number): string {
    const unitId = field(row, ['unitId']);
    const cabin = SHOWCASE.find((u) => String(u.id) === unitId);
    if (cabin) {
      return cabin.photo;
    }
    return unitPhoto(index, row);
  }

  changeStatus(row: Record<string, unknown>, event: Event): void {
    if (!this.canManageStatus()) {
      return;
    }

    const target = event.target as HTMLSelectElement | null;
    const nextStatus = target?.value;
    const id = this.idOf(row);
    if (!nextStatus || !id || id === '0') {
      return;
    }

    const allowed = this.statusOptionsFor(row);
    if (!allowed.includes(nextStatus.toUpperCase())) {
      return;
    }

    void this.updateStatus(id, nextStatus, row);
  }

  changePreparation(row: Record<string, unknown>, event: Event): void {
    if (!this.canEditPreparation(row)) {
      return;
    }

    const target = event.target as HTMLSelectElement | null;
    const next = (target?.value || '').toUpperCase() as PreparationStatus;
    const id = this.idOf(row);
    if (!id || id === '0' || (next !== 'IN_PROGRESS' && next !== 'READY')) {
      return;
    }

    const allowed = this.preparationOptionsFor(row);
    if (!allowed.includes(next)) {
      return;
    }

    void this.updatePreparation(id, next, row);
  }

  private async updateStatus(id: string, nextStatus: string, row: Record<string, unknown>): Promise<void> {
    this.actionError.set('');
    const previous = snapshotRow(row);
    const normalizedNextStatus = nextStatus.toUpperCase();
    const res = await this.api.updateReservationStatus(id, normalizedNextStatus);
    if (res.status === 'ok') {
      this.applyServerRow(row, res.items[0], {
        status: normalizedNextStatus,
        estado: normalizedNextStatus,
        preparationStatus:
          normalizedNextStatus === 'CONFIRMADA' && preparationOf(row) === 'NONE'
            ? 'PENDING'
            : preparationOf(row),
      });
      return;
    }

    restoreRow(row, previous);
    this.patchResultRow(row, previous);
    this.actionError.set(res.message || 'No se pudo actualizar el estado.');
  }

  private async updatePreparation(
    id: string,
    next: PreparationStatus,
    row: Record<string, unknown>,
  ): Promise<void> {
    this.actionError.set('');
    const previous = snapshotRow(row);
    const res = await this.api.updatePreparation(id, next);
    if (res.status === 'ok') {
      this.applyServerRow(row, res.items[0], { preparationStatus: next });
      return;
    }

    restoreRow(row, previous);
    this.patchResultRow(row, previous);
    this.actionError.set(res.message || 'No se pudo actualizar la preparación.');
  }

  private applyServerRow(
    row: Record<string, unknown>,
    server: Record<string, unknown> | undefined,
    fallback: Record<string, unknown>,
  ): void {
    const merged = { ...row, ...fallback, ...(server ?? {}) };
    Object.keys(merged).forEach((key) => {
      row[key] = merged[key];
    });
    this.patchResultRow(row, merged);
  }

  private patchResultRow(row: Record<string, unknown>, patch: Record<string, unknown>): void {
    const current = this.result();
    if (!current) {
      return;
    }
    const rowId = row['id'] ?? row['reservationId'];
    this.result.set({
      ...current,
      items: current.items.map((item) => {
        const itemId = item['id'] ?? item['reservationId'];
        return itemId === rowId ? { ...item, ...patch } : item;
      }),
    });
  }

  private async load(): Promise<void> {
    this.actionError.set('');
    this.result.set(await this.api.reservations());
  }
}

function field(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const match = Object.keys(row).find((k) => k.toLowerCase() === key.toLowerCase());
    if (match && row[match] != null && typeof row[match] !== 'object') {
      return String(row[match]);
    }
  }
  return '';
}

function snapshotRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    status: row['status'],
    estado: row['estado'],
    preparationStatus: row['preparationStatus'],
    preparation_status: row['preparation_status'],
  };
}

function restoreRow(row: Record<string, unknown>, previous: Record<string, unknown>): void {
  Object.keys(previous).forEach((key) => {
    row[key] = previous[key];
  });
}
