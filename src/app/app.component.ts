import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly msal = inject(MsalService);
  private readonly broadcast = inject(MsalBroadcastService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.msal.handleRedirectObservable().subscribe({
      next: (result) => {
        if (result?.account) {
          this.msal.instance.setActiveAccount(result.account);
          void this.router.navigateByUrl('/dashboard');
        } else if (!this.msal.instance.getActiveAccount()) {
          const [first] = this.msal.instance.getAllAccounts();
          if (first) {
            this.msal.instance.setActiveAccount(first);
          }
        }
      },
      error: (err) => console.error('MSAL redirect', err),
    });

    this.broadcast.inProgress$
      .pipe(filter((status) => status === InteractionStatus.None))
      .subscribe(() => {
        if (!this.msal.instance.getActiveAccount()) {
          const [first] = this.msal.instance.getAllAccounts();
          if (first) {
            this.msal.instance.setActiveAccount(first);
          }
        }
      });
  }
}
