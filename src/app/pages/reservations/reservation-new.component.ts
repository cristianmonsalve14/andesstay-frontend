import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { BffApiService, BffCallResult } from '../../api/bff-api.service';
import { AppShellComponent } from '../../layout/app-shell.component';
import { SHOWCASE } from '../../ui/photos';

@Component({
  selector: 'app-reservation-new',
  standalone: true,
  imports: [AppShellComponent, FormsModule, RouterLink],
  templateUrl: './reservation-new.component.html',
  styleUrl: './reservation-new.component.css',
})
export class ReservationNewComponent {
  private readonly api = inject(BffApiService);
  private readonly msal = inject(MsalService);

  readonly cabinOptions = SHOWCASE.map((unit) => ({
    value: unit.id,
    label: unit.title,
    subtitle: unit.subtitle,
    photo: unit.photo,
    nightlyRate: unit.nightlyRate,
  }));

  readonly unitId = signal(this.cabinOptions[0]?.value ?? 10);
  readonly checkIn = signal('');
  readonly checkOut = signal('');
  readonly guests = signal(2);
  readonly sending = signal(false);
  readonly result = signal<BffCallResult | null>(null);

  readonly selectedCabin = computed(() => {
    const match = this.cabinOptions.find((c) => Number(c.value) === Number(this.unitId()));
    return match ?? this.cabinOptions[0]!;
  });
  readonly nights = computed(() => nightCount(this.checkIn(), this.checkOut()));
  readonly amount = computed(() => (this.selectedCabin()?.nightlyRate ?? 100000) * this.nights());
  readonly guestDisplayName = computed(() => {
    const account =
      this.msal.instance.getActiveAccount() ?? this.msal.instance.getAllAccounts()[0] ?? null;
    return account?.name ?? account?.username ?? 'Huésped AndesStay';
  });

  async submit(): Promise<void> {
    this.sending.set(true);
    const account =
      this.msal.instance.getActiveAccount() ?? this.msal.instance.getAllAccounts()[0] ?? null;
    const customerUserId =
      account?.username ??
      account?.localAccountId ??
      (account?.idTokenClaims as { oid?: string } | undefined)?.oid ??
      'cliente-local';

    const cabin = this.selectedCabin();
    this.result.set(
      await this.api.createReservation({
        customerUserId,
        unitId: Number(this.unitId()),
        checkInDate: this.checkIn(),
        checkOutDate: this.checkOut(),
        amount: this.amount(),
        unitName: cabin?.label,
        guests: Number(this.guests()) || 1,
        customerName: this.guestDisplayName(),
      }),
    );
    this.sending.set(false);
  }

  formatClp(value: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(value);
  }
}

function nightCount(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) {
    return 1;
  }
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  const ms = end.getTime() - start.getTime();
  const nights = Math.round(ms / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : 1;
}
