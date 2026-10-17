import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BffApiService, BffCallResult } from '../../api/bff-api.service';
import { AppShellComponent } from '../../layout/app-shell.component';
import { SHOWCASE, unitPhoto } from '../../ui/photos';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [AppShellComponent, RouterLink],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css',
})
export class CatalogComponent implements OnInit {
  private readonly api = inject(BffApiService);

  readonly result = signal<BffCallResult | null>(null);
  readonly showcase = SHOWCASE;

  ngOnInit(): void {
    void this.load();
  }

  titleOf(row: Record<string, unknown>): string {
    return field(row, ['name', 'nombre', 'title', 'code', 'id']) || 'Unidad';
  }

  subtitleOf(row: Record<string, unknown>): string {
    const bits = [
      field(row, ['type', 'tipo', 'category']),
      field(row, ['location', 'ubicacion', 'city', 'comuna']),
    ].filter(Boolean);
    return bits.join(' · ') || 'Hostal / cabaña';
  }

  photoOf(row: Record<string, unknown>, index: number): string {
    return unitPhoto(index, row);
  }

  metaOf(row: Record<string, unknown>): string {
    const capacity = field(row, ['capacity', 'capacidad', 'guests', 'cupos']);
    const status = field(row, ['status', 'estado']);
    return [capacity ? `Cupos ${capacity}` : '', status ? `Estado ${status}` : '']
      .filter(Boolean)
      .join(' · ');
  }

  amenitiesOf(index: number): string[] {
    const sets = [
      ['Chimenea', 'Terraza', 'Vista nieve'],
      ['Cocina', 'Wifi', 'Bosque'],
      ['Living', 'Estacionamiento', '2–6 pax'],
    ];
    return sets[Math.abs(index) % sets.length];
  }

  private async load(): Promise<void> {
    this.result.set(await this.api.catalogUnits());
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
