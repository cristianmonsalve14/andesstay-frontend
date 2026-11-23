import { AccountInfo } from '@azure/msal-browser';

/** Roles leídos del access token cuando el ID token no trae `roles`. */
let accessTokenRoles: string[] = [];

export function setAccessTokenRoles(roles: string[]): void {
  accessTokenRoles = normalizeRoles(roles);
}

export function clearAccessTokenRoles(): void {
  accessTokenRoles = [];
}

export function rolesFromAccount(account: AccountInfo | null): string[] {
  if (!account) {
    return [];
  }
  const claims = account.idTokenClaims as { roles?: string[] | string } | undefined;
  const fromId = normalizeRoles(claims?.roles);
  if (fromId.length) {
    return fromId;
  }
  return accessTokenRoles;
}

export function rolesFromJwt(token: string | null | undefined): string[] {
  if (!token) {
    return [];
  }
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return [];
    }
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      roles?: string[] | string;
    };
    return normalizeRoles(json.roles);
  } catch {
    return [];
  }
}

function normalizeRoles(roles: string[] | string | undefined | null): string[] {
  if (!roles) {
    return [];
  }
  const list = Array.isArray(roles) ? roles : roles.split(/[,\s]+/);
  return list.map(String).map((r) => r.trim()).filter(Boolean);
}

export function isCliente(roles: string[]): boolean {
  return roles.includes('Cliente') && !roles.includes('Admin') && !roles.includes('Operador');
}

/** Operación de inventario (edición / preparación): Admin y Operador. */
export function canOperateCatalog(roles: string[]): boolean {
  return roles.includes('Admin') || roles.includes('Operador');
}

/** Explorar unidades: Cliente + operación. Auditor no. Alineado a GET /api/catalog en el BFF. */
export function canViewCatalog(roles: string[]): boolean {
  return canOperateCatalog(roles) || roles.includes('Cliente');
}

/** Crear/editar unidades: solo Admin (POST/PUT /api/catalog en el BFF). */
export function canManageCatalog(roles: string[]): boolean {
  return roles.includes('Admin');
}

/** Reservas: Admin, Operador, Cliente. Auditor no entra. */
export function canViewReservations(roles: string[]): boolean {
  return roles.includes('Admin') || roles.includes('Operador') || roles.includes('Cliente');
}

export function canAccessRoute(roles: string[], allowedRoles: string[]): boolean {
  const allowed = new Set(allowedRoles.map((role) => role.trim()));
  return roles.some((role) => allowed.has(role));
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
