import { AccountInfo } from '@azure/msal-browser';

export function rolesFromAccount(account: AccountInfo | null): string[] {
  if (!account) {
    return [];
  }
  const claims = account.idTokenClaims as { roles?: string[] } | undefined;
  return claims?.roles ?? [];
}

export function isCliente(roles: string[]): boolean {
  return roles.includes('Cliente') && !roles.includes('Admin') && !roles.includes('Operador');
}

export function canOperateCatalog(roles: string[]): boolean {
  return roles.includes('Admin') || roles.includes('Operador') || roles.includes('Auditor');
}

export function canCreateReservation(roles: string[]): boolean {
  return roles.includes('Cliente') || roles.includes('Operador') || roles.includes('Admin');
}

export function canManageReservationStatus(roles: string[]): boolean {
  return roles.includes('Operador') || roles.includes('Admin');
}
