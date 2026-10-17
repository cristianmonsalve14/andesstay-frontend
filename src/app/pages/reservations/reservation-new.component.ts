import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BffApiService, BffCallResult } from '../../api/bff-api.service';
import { AppShellComponent } from '../../layout/app-shell.component';

@Component({
  selector: 'app-reservation-new',
  standalone: true,
  imports: [AppShellComponent, FormsModule, RouterLink],
  templateUrl: './reservation-new.component.html',
  styleUrl: './reservation-new.component.css',
})
export class ReservationNewComponent {
  private readonly api = inject(BffApiService);

  unitId = '';
  checkIn = '';
  checkOut = '';
  guests = 2;
  readonly sending = signal(false);
  readonly result = signal<BffCallResult | null>(null);

  async submit(): Promise<void> {
    this.sending.set(true);
    this.result.set(
      await this.api.createReservation({
        unitId: this.unitId.trim(),
        checkIn: this.checkIn,
        checkOut: this.checkOut,
        guests: Number(this.guests) || 1,
      }),
    );
    this.sending.set(false);
  }
}
