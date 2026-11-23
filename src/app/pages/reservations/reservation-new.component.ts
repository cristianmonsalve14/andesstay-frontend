import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { BffApiService, BffCallResult } from '../../api/bff-api.service';
import { fieldOf, numberFieldOf } from '../../api/unit-profile';
import { canOperateCatalog, rolesFromAccount } from '../../auth/role.util';
import { AppShellComponent } from '../../layout/app-shell.component';
import { SHOWCASE, unitPhoto } from '../../ui/photos';
import { isValidStayRange, nightCount } from './reservation-dates';

type CabinOption = {
  value: number;
  label: string;
  subtitle: string;
  photo: string;
  nightlyRate: number;
};

@Component({
  selector: 'app-reservation-new',
  standalone: true,
  imports: [AppShellComponent, FormsModule, RouterLink],
  templateUrl: './reservation-new.component.html',
  styleUrl: './reservation-new.component.css',
})
export class ReservationNewComponent implements OnInit {
  private readonly api = inject(BffApiService);
  private readonly msal = inject(MsalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly cabinOptions = signal<CabinOption[]>(
    SHOWCASE.map((unit) => ({
      value: unit.id,
      label: unit.title,
      subtitle: unit.subtitle,
      photo: unit.photo,
      nightlyRate: unit.nightlyRate,
    })),
  );

  readonly unitId = signal(this.cabinOptions()[0]?.value ?? 10);
  readonly checkIn = signal('');
  readonly checkOut = signal('');
  readonly guests = signal(2);
  readonly guestName = signal('');
  readonly sending = signal(false);
  readonly result = signal<BffCallResult | null>(null);
  readonly dateError = signal('');
  readonly loadingUnits = signal(true);
  readonly isStaff = signal(
    canOperateCatalog(rolesFromAccount(this.msal.instance.getActiveAccount())),
  );

  readonly selectedCabin = computed(() => {
    const options = this.cabinOptions();
    const match = options.find((c) => Number(c.value) === Number(this.unitId()));
    return match ?? options[0]!;
  });
  readonly nights = computed(() => nightCount(this.checkIn(), this.checkOut()));
  readonly amount = computed(() => {
    const nights = this.nights();
    if (nights <= 0) {
      return 0;
    }
    return (this.selectedCabin()?.nightlyRate ?? 100000) * nights;
  });
  readonly guestDisplayName = computed(() => {
    if (this.isStaff() && this.guestName().trim()) {
      return this.guestName().trim();
    }
    const account =
      this.msal.instance.getActiveAccount() ?? this.msal.instance.getAllAccounts()[0] ?? null;
    return account?.name ?? account?.username ?? 'Huésped AndesStay';
  });

  ngOnInit(): void {
    void this.bootstrap();
  }

  onCheckInChange(value: string): void {
    this.checkIn.set(value);
    this.validateDates();
  }

  onCheckOutChange(value: string): void {
    this.checkOut.set(value);
    this.validateDates();
  }

  async submit(): Promise<void> {
    if (this.isStaff() && !this.guestName().trim()) {
      this.result.set({
        status: 'error',
        httpStatus: 0,
        path: '/api/reservations',
        items: [],
        message: 'Indica el nombre del huésped para el alta en recepción.',
        raw: '',
      });
      return;
    }

    if (!this.validateDates()) {
      this.result.set({
        status: 'error',
        httpStatus: 0,
        path: '/api/reservations',
        items: [],
        message: this.dateError() || 'Completa las fechas antes de confirmar.',
        raw: '',
      });
      return;
    }

    if (this.amount() <= 0) {
      this.result.set({
        status: 'error',
        httpStatus: 0,
        path: '/api/reservations',
        items: [],
        message: 'El total estimado es 0. Revisa las fechas (salida después de llegada).',
        raw: '',
      });
      return;
    }

    this.sending.set(true);
    this.result.set(null);
    const account =
      this.msal.instance.getActiveAccount() ?? this.msal.instance.getAllAccounts()[0] ?? null;
    const customerUserId = this.isStaff()
      ? `guest:${this.guestDisplayName().toLowerCase().replace(/\s+/g, '-')}`
      : account?.username ??
        account?.localAccountId ??
        (account?.idTokenClaims as { oid?: string } | undefined)?.oid ??
        'cliente-local';

    const cabin = this.selectedCabin();
    const created = await this.api.createReservation({
      customerUserId,
      unitId: Number(this.unitId()),
      checkInDate: this.checkIn(),
      checkOutDate: this.checkOut(),
      amount: this.amount(),
      unitName: cabin?.label,
      guests: Number(this.guests()) || 1,
      customerName: this.guestDisplayName(),
    });
    this.result.set(created);
    this.sending.set(false);

    if (created.status === 'ok') {
      // Dar un instante a ver el OK y llevar al tablero de estados.
      window.setTimeout(() => {
        void this.router.navigate(['/reservas'], { queryParams: { created: '1' } });
      }, 700);
    }
  }

  formatClp(value: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private async bootstrap(): Promise<void> {
    const preferred = Number(this.route.snapshot.queryParamMap.get('unitId') || '');
    try {
      const catalog = await this.api.catalogUnits();
      if (catalog.status === 'ok' && catalog.items.length) {
        const options = catalog.items
          .map((row, index) => this.toOption(row, index))
          .filter((opt): opt is CabinOption => opt !== null);
        if (options.length) {
          this.cabinOptions.set(options);
        }
      }
    } finally {
      this.loadingUnits.set(false);
    }

    const options = this.cabinOptions();
    if (preferred && options.some((o) => Number(o.value) === preferred)) {
      this.unitId.set(preferred);
    } else if (options[0]) {
      this.unitId.set(options[0].value);
    }
  }

  private toOption(row: Record<string, unknown>, index: number): CabinOption | null {
    const id = Number(fieldOf(row, ['id', 'unitId', 'unit_id']));
    if (!Number.isFinite(id) || id <= 0) {
      return null;
    }
    const title = fieldOf(row, ['name', 'nombre', 'title', 'code']) || `Unidad ${id}`;
    const location = fieldOf(row, ['location', 'ubicacion', 'ubicación']);
    const guests = numberFieldOf(row, ['maxGuests', 'max_guests', 'guests']);
    const rate =
      numberFieldOf(row, ['rate', 'tarifa', 'price', 'precio', 'nightlyRate']) || 100000;
    const subtitle = [location, guests ? `${guests} huéspedes` : '']
      .filter(Boolean)
      .join(' · ');
    return {
      value: id,
      label: title,
      subtitle: subtitle || 'AndesStay',
      photo: unitPhoto(index, row),
      nightlyRate: rate,
    };
  }

  private validateDates(): boolean {
    const inn = this.checkIn();
    const out = this.checkOut();
    if (!inn || !out) {
      this.dateError.set('Indica la fecha de llegada y de salida.');
      return false;
    }
    if (!isValidStayRange(inn, out)) {
      this.dateError.set('La salida debe ser posterior a la llegada.');
      return false;
    }
    this.dateError.set('');
    return true;
  }
}
