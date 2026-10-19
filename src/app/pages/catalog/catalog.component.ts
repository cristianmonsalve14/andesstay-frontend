import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { BffApiService, BffCallResult } from '../../api/bff-api.service';
import { canManageCatalog, rolesFromAccount } from '../../auth/role.util';
import { AppShellComponent } from '../../layout/app-shell.component';
import { SHOWCASE, unitPhoto } from '../../ui/photos';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [AppShellComponent, RouterLink, FormsModule],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css',
})
export class CatalogComponent implements OnInit {
  private readonly api = inject(BffApiService);
  private readonly msal = inject(MsalService);

  readonly result = signal<BffCallResult | null>(null);
  readonly actionResult = signal<BffCallResult | null>(null);
  readonly canManage = signal(false);
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly editHint = signal('');
  readonly showcase = SHOWCASE;

  formCode = '';
  formName = '';
  formRate = 100000;
  formAvailable = true;

  ngOnInit(): void {
    const roles = rolesFromAccount(this.msal.instance.getActiveAccount());
    this.canManage.set(canManageCatalog(roles));
    void this.load();
  }

  idOf(row: Record<string, unknown>): string {
    return field(row, ['id', 'unitId', 'unit_id']) || '';
  }

  titleOf(row: Record<string, unknown>): string {
    return field(row, ['name', 'nombre', 'title', 'code']) || 'Unidad';
  }

  codeOf(row: Record<string, unknown>): string {
    return field(row, ['code', 'codigo']);
  }

  rateOf(row: Record<string, unknown>): string {
    const raw = field(row, ['rate', 'tarifa', 'price', 'precio', 'nightlyRate']);
    if (!raw) {
      return '';
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      return raw;
    }
    return formatClp(n);
  }

  availableOf(row: Record<string, unknown>): boolean | null {
    const match = Object.keys(row).find((k) =>
      ['available', 'disponible', 'disponibilidad'].includes(k.toLowerCase()),
    );
    if (!match) {
      return null;
    }
    const value = row[match];
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'si', 'sí', 'disponible', 'available'].includes(normalized)) {
        return true;
      }
      if (['false', '0', 'no', 'nodisponible', 'unavailable'].includes(normalized)) {
        return false;
      }
    }
    return null;
  }

  availabilityLabel(row: Record<string, unknown>): string {
    const available = this.availableOf(row);
    if (available === true) {
      return 'Disponible';
    }
    if (available === false) {
      return 'No disponible';
    }
    const status = field(row, ['status', 'estado']);
    return status ? `Estado ${status}` : '';
  }

  photoOf(row: Record<string, unknown>, index: number): string {
    return unitPhoto(index, row);
  }

  startCreate(): void {
    this.resetForm();
    this.clearFeedback();
  }

  startEdit(row: Record<string, unknown>): void {
    const id = this.idOf(row);
    if (!id) {
      this.actionResult.set({
        status: 'error',
        httpStatus: 0,
        path: '/api/catalog/units',
        items: [],
        message: 'No se pudo identificar la unidad para editar.',
        raw: '',
      });
      return;
    }
    this.editingId.set(id);
    this.formCode = this.codeOf(row) || '';
    this.formName = this.titleOf(row);
    const rateRaw = field(row, ['rate', 'tarifa', 'price', 'precio', 'nightlyRate']);
    this.formRate = Number(rateRaw) || 100000;
    this.formAvailable = this.availableOf(row) ?? true;
    this.editHint.set(
      `Editando ${this.formName || this.formCode}. Cambia la tarifa o la disponibilidad y guarda.`,
    );
    this.clearFeedback();
    queueMicrotask(() => {
      document.getElementById('catalog-admin-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  cancelEdit(): void {
    this.resetForm();
    this.clearFeedback();
  }

  async submitUnit(): Promise<void> {
    if (!this.canManage()) {
      return;
    }
    const code = this.formCode.trim();
    const name = this.formName.trim();
    const rate = Number(this.formRate);
    if (!code || !name || !Number.isFinite(rate) || rate <= 0) {
      this.actionResult.set({
        status: 'error',
        httpStatus: 0,
        path: '/api/catalog/units',
        items: [],
        message: 'Completa código, nombre y una tarifa válida.',
        raw: '',
      });
      return;
    }

    this.saving.set(true);
    const body = {
      code,
      name,
      rate,
      available: !!this.formAvailable,
    };
    const editingId = this.editingId();
    const res = editingId
      ? await this.api.updateCatalogUnit(editingId, body)
      : await this.api.createCatalogUnit(body);
    this.saving.set(false);

    if (res.status === 'ok') {
      // Reset del form sin borrar el feedback de éxito (Héctor review).
      this.resetForm();
      await this.load();
    }
    this.actionResult.set(res);
  }

  /** Solo campos del formulario; no toca actionResult. */
  private resetForm(): void {
    this.editingId.set(null);
    this.editHint.set('');
    this.formCode = '';
    this.formName = '';
    this.formRate = 100000;
    this.formAvailable = true;
  }

  private clearFeedback(): void {
    this.actionResult.set(null);
  }

  private async load(): Promise<void> {
    // Lista siempre desde backend (disponibilidad real post-reserva).
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

function formatClp(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);
}
