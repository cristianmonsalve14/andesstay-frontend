import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { BffApiService, BffCallResult } from '../../api/bff-api.service';
import { canManageReservationStatus, rolesFromAccount } from '../../auth/role.util';
import { AppShellComponent } from '../../layout/app-shell.component';
import { unitPhoto } from '../../ui/photos';

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

  readonly statusOptions = ['PENDIENTE', 'CONFIRMADA', 'CANCELADA'];

  ngOnInit(): void {
    this.roles.set(rolesFromAccount(this.msal.instance.getActiveAccount()));
    this.canManageStatus.set(canManageReservationStatus(this.roles()));
    void this.load();
  }

  idOf(row: Record<string, unknown>): string {
    return field(row, ['id', 'reservationId', 'reservation_id', 'codigo']) || '0';
  }

  titleOf(row: Record<string, unknown>): string {
    return field(row, ['unitName', 'unidad', 'name', 'code', 'unitId', 'id']) || 'Estadía AndesStay';
  }

  datesOf(row: Record<string, unknown>): string {
    const inn = field(row, ['checkIn', 'check_in', 'from', 'inicio', 'startDate']);
    const out = field(row, ['checkOut', 'check_out', 'to', 'fin', 'endDate']);
    if (inn && out) {
      return `${inn} → ${out}`;
    }
    return inn || out || 'Fechas por confirmar';
  }

  statusOf(row: Record<string, unknown>): string {
    return field(row, ['status', 'estado']) || 'Pedido';
  }

  guestsOf(row: Record<string, unknown>): string {
    const guests = field(row, ['guests', 'huespedes', 'pax']);
    return guests ? `${guests} huéspedes` : '';
  }

  photoOf(row: Record<string, unknown>, index: number): string {
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

    void this.updateStatus(id, nextStatus, row);
  }

  private async updateStatus(id: string, nextStatus: string, row: Record<string, unknown>): Promise<void> {
    const previousStatus = this.statusOf(row);
    const normalizedNextStatus = nextStatus.toUpperCase();
    const res = await this.api.updateReservationStatus(id, normalizedNextStatus);
    if (res.status === 'ok') {
      row['status'] = normalizedNextStatus;
      row['estado'] = normalizedNextStatus;
      const current = this.result();
      if (current) {
        this.result.set({
          ...current,
          items: current.items.map((item) => {
            const itemId = item['id'] ?? item['reservationId'];
            const rowId = row['id'] ?? row['reservationId'];
            return itemId === rowId
              ? { ...item, status: normalizedNextStatus, estado: normalizedNextStatus }
              : item;
          }),
        });
      }
      return;
    }

    row['status'] = previousStatus;
    row['estado'] = previousStatus;
    const current = this.result();
    if (current) {
      this.result.set({
        ...current,
        message: res.message,
      });
    }
  }

  private async load(): Promise<void> {
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
