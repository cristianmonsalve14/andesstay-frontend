import { AccountInfo } from '@azure/msal-browser';

export function rolesFromAccount(account: AccountInfo | null): string[] {
  if (!account) {
    return [];
  }
  const claims = account.idTokenClaims as { roles?: string[] } | undefined;
  return claims?.roles ?? [];
}
