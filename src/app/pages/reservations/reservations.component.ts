import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BffApiService, BffCallResult } from '../../api/bff-api.service';
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

  readonly result = signal<BffCallResult | null>(null);

  ngOnInit(): void {
    void this.load();
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
