import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

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

@Injectable({ providedIn: 'root' })
export class BffApiService {
  private readonly http = inject(HttpClient);

  catalogUnits(): Promise<BffCallResult> {
    return this.get(`${environment.apiUrl}/catalog/units`, '/api/catalog/units');
  }

  reservations(): Promise<BffCallResult> {
    return this.get(`${environment.apiUrl}/reservations`, '/api/reservations');
  }

  createReservation(body: {
    unitId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
  }): Promise<BffCallResult> {
    return this.post(`${environment.apiUrl}/reservations`, '/api/reservations', body);
  }

  private async get(url: string, path: string): Promise<BffCallResult> {
    try {
      const data = await firstValueFrom(this.http.get<unknown>(url));
      return {
        status: 'ok',
        httpStatus: 200,
        path,
        items: asRecords(data),
        message: '200 — el BFF autorizó y proxió al microservicio',
        raw: stringify(data),
      };
    } catch (err) {
      return fromHttpError(err, path);
    }
  }

  private async post(url: string, path: string, body: unknown): Promise<BffCallResult> {
    try {
      const data = await firstValueFrom(this.http.post<unknown>(url, body));
      return {
        status: 'ok',
        httpStatus: 200,
        path,
        items: asRecords(data),
        message: 'Reserva enviada al BFF (POST /api/reservations)',
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
      message: `Sin conexión a ${environment.apiUrl}. El Gateway o la EC2 no responden.`,
      raw,
    };
  }
  if (err.status === 401) {
    return {
      status: 'unauthorized',
      httpStatus: 401,
      path,
      items: [],
      message: '401 — el Gateway o el BFF no reconocen la sesión.',
      raw,
    };
  }
  if (err.status === 403) {
    return {
      status: 'forbidden',
      httpStatus: 403,
      path,
      items: [],
      message:
        '403 — el token es válido (pasó el Gateway) pero el BFF negó el rol para este recurso.',
      raw,
    };
  }
  return {
    status: 'error',
    httpStatus: err.status,
    path,
    items: [],
    message: `${err.status} — ${apiMessage}`,
    raw,
  };
}
