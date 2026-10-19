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

/** Catálogo operativo: Admin y Operador (Recepcionista). Auditor no opera catálogo. */
export function canOperateCatalog(roles: string[]): boolean {
  return roles.includes('Admin') || roles.includes('Operador');
}

/** Mismo criterio que GET /api/catalog en el BFF. */
export function canViewCatalog(roles: string[]): boolean {
  return canOperateCatalog(roles);
}

/** Reservas: Admin, Operador, Cliente. Auditor no entra. */
export function canViewReservations(roles: string[]): boolean {
  return roles.includes('Admin') || roles.includes('Operador') || roles.includes('Cliente');
}

export function canCreateReservation(roles: string[]): boolean {
  return roles.includes('Cliente') || roles.includes('Operador') || roles.includes('Admin');
}

export function canManageReservationStatus(roles: string[]): boolean {
  return roles.includes('Operador') || roles.includes('Admin');
}

export function isAuditorOnly(roles: string[]): boolean {
  return roles.includes('Auditor') && !roles.includes('Admin') && !roles.includes('Operador');
}

/** Panel de auditoría: Admin y Auditor (GET /api/audit/** en el BFF). */
export function canViewAudit(roles: string[]): boolean {
  return roles.includes('Admin') || roles.includes('Auditor');
}
