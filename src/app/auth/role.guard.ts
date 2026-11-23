import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { canAccessRoute, rolesFromAccount } from './role.util';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  private readonly msal = inject(MsalService);
  private readonly router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const account = this.msal.instance.getActiveAccount();
    const requestedRoles = (route.data['roles'] as string[] | undefined) ?? [];
    const roles = rolesFromAccount(account);

    if (!requestedRoles.length) {
      return true;
    }

    if (!account) {
      return this.router.createUrlTree(['/login'], {
        queryParams: { redirectUrl: state.url, reason: 'auth' },
      });
    }

    if (!roles.length) {
      console.warn('RoleGuard: cuenta sin roles', account.username);
      return this.router.createUrlTree(['/login'], {
        queryParams: { reason: 'roles', user: account.username },
      });
    }

    if (!canAccessRoute(roles, requestedRoles)) {
      return this.router.createUrlTree(['/login'], {
        queryParams: { redirectUrl: state.url, reason: 'forbidden' },
      });
    }

    return true;
  }
}
