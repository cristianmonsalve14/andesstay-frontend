import { Component, inject } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly msal = inject(MsalService);

  login(): void {
    this.msal.loginRedirect({
      scopes: environment.apiScopes,
    });
  }
}
