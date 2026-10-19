import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { asAuditEvents, type AuditEvent } from './audit.mapper';

export type { AuditEvent };

export type BffCallStatus =
  | 'idle'
  | 'loading'
  | 'ok'
  | 'forbidden'
  | 'unauthorized'
  | 'offline'
  | 'error';

export interface BffCallResult {
  status: BffCallStatus;
  httpStatus: number;
  path: string;
  items: Record<string, unknown>[];
  message: string;
  raw: string;
}

export interface AuditRiskItem {
  label: string;
  status: string;
  severity: string;
}

export interface AuditMetrics {
  asOf: string;
  occupationPercent: number;
  reservationsToday: number;
  checkInsToday: number;
  incidentsOpen: number;
  incidentsNeedReview: number;
  completenessPercent: number;
  availabilityPercent: number;
  paymentsConfirmed: number;
  cancellations: number;
  risks: AuditRiskItem[];
}

export interface AuditMetricsResult {
  status: BffCallStatus;
  httpStatus: number;
  path: string;
  message: string;
  metrics: AuditMetrics | null;
}

export interface AuditEventsResult {
  status: BffCallStatus;
  httpStatus: number;
  path: string;
  message: string;
  items: AuditEvent[];
}

@Injectable({ providedIn: 'root' })
export class BffApiService {
  private readonly http = inject(HttpClient);

  catalogUnits(): Promise<BffCallResult> {
    return this.get(`${environment.apiUrl}/catalog/units`, '/api/catalog/units');
  }

  reservations(): Promise<BffCallResult> {
    return this.get(`${environment.apiUrl}/reservations`, '/api/reservations');
  }

  /** Contrato ms-reservations: CreateReservationRequest (enrich: unitName, guests, customerName) */
  createReservation(body: {
    customerUserId: string;
    unitId: number;
    checkInDate: string;
    checkOutDate: string;
    amount: number;
    unitName?: string;
    guests?: number;
    customerName?: string;
  }): Promise<BffCallResult> {
    return this.post(`${environment.apiUrl}/reservations`, '/api/reservations', body);
  }

  updateReservationStatus(id: string, status: string): Promise<BffCallResult> {
    return this.put(`${environment.apiUrl}/reservations/${id}/status`, `/api/reservations/${id}/status`, {
      status,
    });
  }

  auditMetrics(): Promise<AuditMetricsResult> {
    const path = '/api/audit/metrics';
    return this.getJson<unknown>(`${environment.apiUrl}/audit/metrics`, path).then((res) => {
      if (res.status !== 'ok') {
        return {
          status: res.status,
          httpStatus: res.httpStatus,
          path,
          message: res.message,
          metrics: null,
        };
      }
      return {
        status: 'ok',
        httpStatus: res.httpStatus,
        path,
        message: 'Indicadores de control disponibles.',
        metrics: asAuditMetrics(res.data),
      };
    });
  }

  auditEvents(limit = 50): Promise<AuditEventsResult> {
    const path = '/api/audit/events';
    const url = `${environment.apiUrl}/audit/events?limit=${limit}`;
    return this.getJson<unknown>(url, path).then((res) => {
      if (res.status !== 'ok') {
        return {
          status: res.status,
          httpStatus: res.httpStatus,
          path,
          message: res.message,
          items: [],
        };
      }
      return {
        status: 'ok',
        httpStatus: res.httpStatus,
        path,
        message: 'Historial de control disponible.',
        items: asAuditEvents(res.data),
      };
    });
  }

  private async getJson<T>(
    url: string,
    path: string,
  ): Promise<{ status: BffCallStatus; httpStatus: number; message: string; data: T | null }> {
    try {
      const data = await firstValueFrom(this.http.get<T>(url));
      return { status: 'ok', httpStatus: 200, message: 'Información disponible.', data };
    } catch (err) {
      const mapped = fromHttpError(err, path);
      return {
        status: mapped.status,
        httpStatus: mapped.httpStatus,
        message: mapped.message,
        data: null,
      };
    }
  }

  private async get(url: string, path: string): Promise<BffCallResult> {
    try {
      const data = await firstValueFrom(this.http.get<unknown>(url));
      return {
        status: 'ok',
        httpStatus: 200,
        path,
        items: asRecords(data),
        message: 'Información disponible.',
        raw: stringify(data),
      };
    } catch (err) {
      return fromHttpError(err, path);
    }
  }

  private async post(url: string, path: string, body: unknown): Promise<BffCallResult> {
    try {
      const data = await firstValueFrom(this.http.post<unknown>(url, body, { observe: 'response' }));
      return {
        status: 'ok',
        httpStatus: data.status,
        path,
        items: asRecords(data.body),
        message: 'Reserva creada correctamente.',
        raw: stringify(data.body),
      };
    } catch (err) {
      return fromHttpError(err, path);
    }
  }

  private async put(url: string, path: string, body: unknown): Promise<BffCallResult> {
    try {
      const data = await firstValueFrom(this.http.put<unknown>(url, body));
      return {
        status: 'ok',
        httpStatus: 200,
        path,
        items: asRecords(data),
        message: 'Estado actualizado correctamente.',
        raw: stringify(data),
      };
    } catch (err) {
      return fromHttpError(err, path);
    }
  }
}

function asRecords(data: unknown): Record<string, unknown>[] {
  const list = asList(data);
  return list.map((item) =>
    item && typeof item === 'object' ? (item as Record<string, unknown>) : { valor: item },
  );
}

function asList(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    for (const key of ['units', 'content', 'items', 'data', 'reservations']) {
      if (Array.isArray(record[key])) {
        return record[key] as unknown[];
      }
    }
  }
  return data == null ? [] : [data];
}

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function asAuditMetrics(data: unknown): AuditMetrics | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const row = data as Record<string, unknown>;
  const risksRaw = Array.isArray(row['risks']) ? row['risks'] : [];
  return {
    asOf: String(row['asOf'] ?? ''),
    occupationPercent: num(row['occupationPercent']),
    reservationsToday: num(row['reservationsToday']),
    checkInsToday: num(row['checkInsToday']),
    incidentsOpen: num(row['incidentsOpen']),
    incidentsNeedReview: num(row['incidentsNeedReview']),
    completenessPercent: num(row['completenessPercent']),
    availabilityPercent: num(row['availabilityPercent']),
    paymentsConfirmed: num(row['paymentsConfirmed']),
    cancellations: num(row['cancellations']),
    risks: risksRaw
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => ({
        label: String(item['label'] ?? ''),
        status: String(item['status'] ?? ''),
        severity: String(item['severity'] ?? 'INFO'),
      })),
  };
}

function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fromHttpError(err: unknown, path: string): BffCallResult {
  if (!(err instanceof HttpErrorResponse)) {
    return {
      status: 'error',
      httpStatus: 0,
      path,
      items: [],
      message: err instanceof Error ? err.message : String(err),
      raw: '',
    };
  }

  const body = err.error;
  const raw = typeof body === 'string' ? body : stringify(body ?? err.message);
  const apiMessage =
    (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
      ? body.message
      : null) ?? err.statusText;

  if (err.status === 0) {
    return {
      status: 'offline',
      httpStatus: 0,
      path,
      items: [],
      message: 'El servicio no está disponible por el momento.',
      raw,
    };
  }
  if (err.status === 401) {
    return {
      status: 'unauthorized',
      httpStatus: 401,
      path,
      items: [],
      message: 'Tu sesión no es válida o ha caducado.',
      raw,
    };
  }
  if (err.status === 403) {
    return {
      status: 'forbidden',
      httpStatus: 403,
      path,
      items: [],
      message: 'No tienes permisos para realizar esta acción.',
      raw,
    };
  }
  return {
    status: 'error',
    httpStatus: err.status,
    path,
    items: [],
    message: apiMessage ? `No se pudo completar la operación. ${apiMessage}` : 'No se pudo completar la operación.',
    raw,
  };
}
