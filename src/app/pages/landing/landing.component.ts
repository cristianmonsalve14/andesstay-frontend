import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../../../environments/environment';
import { UNIT_PHOTOS } from '../../ui/photos';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent {
  private readonly msal = inject(MsalService);

  readonly year = new Date().getFullYear();
  readonly gallery = UNIT_PHOTOS;
  readonly status = signal('');

  readonly highlights = [
    {
      title: 'Cabañas con alma andina',
      text: 'Refugios con vista cordillera, chimenea y terraza para desconectar de verdad.',
      image: '/photos/cabin-1.png',
    },
    {
      title: 'Todo listo para tu llegada',
      text: 'Elige fechas, unidad y huéspedes. Nosotros preparamos el espacio antes de que cruces la puerta.',
      image: '/photos/cabin-2.png',
    },
    {
      title: 'Reserva segura',
      text: 'Acceso con Microsoft Entra ID: tu cuenta protegida, sin contraseñas inventadas en formularios frágiles.',
      image: '/photos/cabin-3.png',
    },
  ];

  readonly steps = [
    { n: '01', title: 'Explora el catálogo', text: 'Fotos, amenities y tarifas por noche.' },
    { n: '02', title: 'Elige tu estadía', text: 'Fechas, huéspedes y la cabaña ideal.' },
    { n: '03', title: 'Llega y descansa', text: 'Confirmación clara y preparación del alojamiento.' },
  ];

  signIn(): void {
    this.startAuth('login');
  }

  createAccount(): void {
    // Entra ID: prompt create abre el flujo de registro cuando el tenant lo permite.
    this.startAuth('create');
  }

  private startAuth(prompt: 'login' | 'create'): void {
    this.status.set(prompt === 'create' ? 'Abriendo registro Microsoft…' : 'Abriendo inicio de sesión…');
    this.msal.instance.setActiveAccount(null);
    this.msal
      .loginRedirect({
        scopes: environment.apiScopes,
        prompt,
      })
      .subscribe({
        error: (err: unknown) => {
          console.error('MSAL landing', err);
          const msg = err instanceof Error ? err.message : String(err);
          // Si create no está habilitado en el tenant, caemos a select_account.
          if (prompt === 'create') {
            this.msal
              .loginRedirect({
                scopes: environment.apiScopes,
                prompt: 'select_account',
              })
              .subscribe({
                error: (fallbackErr: unknown) => {
                  this.status.set(
                    fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr),
                  );
                },
              });
            return;
          }
          this.status.set(msg);
        },
      });
  }
}
