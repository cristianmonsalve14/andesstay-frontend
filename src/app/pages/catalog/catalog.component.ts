import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { BffApiService, BffCallResult } from '../../api/bff-api.service';
import {
  amenitiesList,
  catalogUnitPayload,
  fieldOf,
  numberFieldOf,
} from '../../api/unit-profile';
import { canManageCatalog, canOperateCatalog, isCliente, rolesFromAccount } from '../../auth/role.util';
import { AppShellComponent } from '../../layout/app-shell.component';
import { GalleryShot, SHOWCASE, unitGalleryShots, unitPhoto } from '../../ui/photos';

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
  readonly isStaff = signal(false);
  readonly isGuest = signal(false);
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly editHint = signal('');
  readonly showcase = SHOWCASE;
  /** Índice de foto activa por tarjeta (0..n). */
  readonly activeShot = signal<Record<number, number>>({});

  formCode = '';
  formName = '';
  formRate = 100000;
  formAvailable = true;
  formDescription = '';
  formLocation = '';
  formMaxGuests: number | null = 4;
  formImageUrl = '';
  formAmenities = '';
  formBedrooms: number | null = null;
  formBathrooms: number | null = null;

  ngOnInit(): void {
    const roles = rolesFromAccount(this.msal.instance.getActiveAccount());
    this.canManage.set(canManageCatalog(roles));
    this.isStaff.set(canOperateCatalog(roles));
    this.isGuest.set(isCliente(roles));
    void this.load();
  }

  idOf(row: Record<string, unknown>): string {
    return fieldOf(row, ['id', 'unitId', 'unit_id']) || '';
  }

  titleOf(row: Record<string, unknown>): string {
    return fieldOf(row, ['name', 'nombre', 'title', 'code']) || 'Unidad';
  }

  codeOf(row: Record<string, unknown>): string {
    return fieldOf(row, ['code', 'codigo']);
  }

  locationOf(row: Record<string, unknown>): string {
    return (
      fieldOf(row, ['location', 'ubicacion', 'ubicación']) || 'Cajón del Maipo · Cordillera'
    );
  }

  descriptionOf(row: Record<string, unknown>): string {
    return (
      fieldOf(row, ['description', 'descripcion', 'descripción']) ||
      'Cabaña AndesStay con calefacción, cocina básica y entorno de montaña.'
    );
  }

  guestsOf(row: Record<string, unknown>): string {
    const n = numberFieldOf(row, ['maxGuests', 'max_guests', 'guests']) || 2;
    return `Hasta ${n} huéspedes`;
  }

  roomsOf(row: Record<string, unknown>): string {
    const bedrooms = numberFieldOf(row, ['bedrooms']) || 1;
    const bathrooms = numberFieldOf(row, ['bathrooms']) || 1;
    return `${bedrooms} hab. · ${bathrooms} baño${bathrooms > 1 ? 's' : ''}`;
  }

  amenitiesOf(row: Record<string, unknown>): string[] {
    const list = amenitiesList(row);
    return list.length ? list : ['Wifi', 'Calefacción', 'Cocina'];
  }

  rateOf(row: Record<string, unknown>): string {
    const raw = fieldOf(row, ['rate', 'tarifa', 'price', 'precio', 'nightlyRate']);
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
    const status = fieldOf(row, ['status', 'estado']);
    return status ? `Estado ${status}` : '';
  }

  galleryOf(row: Record<string, unknown>, cardIndex: number): GalleryShot[] {
    return unitGalleryShots(cardIndex, row, this.amenitiesOf(row));
  }

  photoOf(row: Record<string, unknown>, cardIndex: number): string {
    const shots = this.galleryOf(row, cardIndex);
    const shot = this.activeShot()[cardIndex] ?? 0;
    return shots[shot]?.src ?? unitPhoto(cardIndex, row);
  }

  photoLabel(row: Record<string, unknown>, cardIndex: number): string {
    const shots = this.galleryOf(row, cardIndex);
    const shot = this.activeShot()[cardIndex] ?? 0;
    return shots[shot]?.label ?? 'Exterior';
  }

  isActiveShot(cardIndex: number, shotIndex: number): boolean {
    return (this.activeShot()[cardIndex] ?? 0) === shotIndex;
  }

  selectPreview(cardIndex: number, shotIndex: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.activeShot.update((map) => ({ ...map, [cardIndex]: shotIndex }));
  }

  nextPhoto(row: Record<string, unknown>, cardIndex: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const total = this.galleryOf(row, cardIndex).length || 1;
    const current = this.activeShot()[cardIndex] ?? 0;
    this.activeShot.update((map) => ({ ...map, [cardIndex]: (current + 1) % total }));
  }

  prevPhoto(row: Record<string, unknown>, cardIndex: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const total = this.galleryOf(row, cardIndex).length || 1;
    const current = this.activeShot()[cardIndex] ?? 0;
    this.activeShot.update((map) => ({
      ...map,
      [cardIndex]: (current - 1 + total) % total,
    }));
  }

  reserveQuery(row: Record<string, unknown>): Record<string, string> {
    const id = this.idOf(row);
    return id ? { unitId: id } : {};
  }

  mountainTip(row: Record<string, unknown>): string {
    const location = this.locationOf(row).toLowerCase();
    if (!location) {
      return '';
    }
    if (location.includes('maipo') || location.includes('cordillera') || location.includes('andes')) {
      return 'Antes de viajar: revisa el acceso por nieve o lluvia y llega con luz de día.';
    }
    if (location.includes('laguna') || location.includes('lago') || location.includes('pucón') || location.includes('villarrica')) {
      return 'Antes de viajar: clima de lago/volcán puede cambiar rápido; lleva capa impermeable.';
    }
    return 'Antes de viajar: confirma horario de check-in y condiciones de acceso a la cabaña.';
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
    const rateRaw = fieldOf(row, ['rate', 'tarifa', 'price', 'precio', 'nightlyRate']);
    this.formRate = Number(rateRaw) || 100000;
    this.formAvailable = this.availableOf(row) ?? true;
    this.formDescription = this.descriptionOf(row);
    this.formLocation = this.locationOf(row);
    this.formMaxGuests = numberFieldOf(row, ['maxGuests', 'max_guests']);
    this.formImageUrl = fieldOf(row, ['imageUrl', 'image_url', 'photo', 'image']);
    this.formAmenities = fieldOf(row, ['amenities']);
    this.formBedrooms = numberFieldOf(row, ['bedrooms']);
    this.formBathrooms = numberFieldOf(row, ['bathrooms']);
    this.editHint.set(
      `Editando ${this.formName || this.formCode}. Reenvía siempre la ficha (ubicación, foto, amenities) para no borrarla en el API.`,
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
    const body = catalogUnitPayload({
      code,
      name,
      rate,
      available: !!this.formAvailable,
      description: this.formDescription,
      location: this.formLocation,
      maxGuests: this.formMaxGuests,
      imageUrl: this.formImageUrl,
      amenities: this.formAmenities,
      bedrooms: this.formBedrooms,
      bathrooms: this.formBathrooms,
    });
    const editingId = this.editingId();
    const res = editingId
      ? await this.api.updateCatalogUnit(editingId, body)
      : await this.api.createCatalogUnit(body);
    this.saving.set(false);

    if (res.status === 'ok') {
      this.resetForm();
      await this.load();
    } else if (res.httpStatus === 400 && this.hasProfileFields(body)) {
      res.message =
        `${res.message} Si el catálogo aún no tiene CAT-01 mergeado, prueba sin los campos nuevos o espera el merge de Héctor.`;
    }
    this.actionResult.set(res);
  }

  private hasProfileFields(body: ReturnType<typeof catalogUnitPayload>): boolean {
    return !!(
      body.description ||
      body.location ||
      body.maxGuests ||
      body.imageUrl ||
      body.amenities ||
      body.bedrooms ||
      body.bathrooms
    );
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.editHint.set('');
    this.formCode = '';
    this.formName = '';
    this.formRate = 100000;
    this.formAvailable = true;
    this.formDescription = '';
    this.formLocation = '';
    this.formMaxGuests = 4;
    this.formImageUrl = '';
    this.formAmenities = '';
    this.formBedrooms = null;
    this.formBathrooms = null;
  }

  private clearFeedback(): void {
    this.actionResult.set(null);
  }

  private async load(): Promise<void> {
    this.result.set(await this.api.catalogUnits());
  }
}

function formatClp(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);
}
