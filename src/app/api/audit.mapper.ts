export interface AuditEvent {
  id: number | string;
  occurredAt: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId: string;
  detail: string;
  severity: string;
}

/**
 * TimelineResponse del MS audit: { items: AuditEventResponse[] }.
 * Extrae `items` de forma explícita (no reutilizar el normalizador genérico de listados).
 */
export function asAuditEvents(data: unknown): AuditEvent[] {
  return extractTimelineItems(data).map((row) => ({
    id: (row['id'] as number | string) ?? '',
    occurredAt: String(row['occurredAt'] ?? ''),
    actor: String(row['actor'] ?? ''),
    action: String(row['action'] ?? ''),
    resourceType: String(row['resourceType'] ?? ''),
    resourceId: String(row['resourceId'] ?? ''),
    detail: String(row['detail'] ?? ''),
    severity: String(row['severity'] ?? 'INFO'),
  }));
}

function extractTimelineItems(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return asObjectRows(data);
  }
  if (data && typeof data === 'object') {
    const items = (data as Record<string, unknown>)['items'];
    if (Array.isArray(items)) {
      return asObjectRows(items);
    }
  }
  return [];
}

function asObjectRows(list: unknown[]): Record<string, unknown>[] {
  return list.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
}
