import { Component, OnInit, inject, signal } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import {
  AuditEvent,
  AuditEventsResult,
  AuditMetrics,
  AuditMetricsResult,
  BffApiService,
} from '../../api/bff-api.service';
import { canViewAudit, rolesFromAccount } from '../../auth/role.util';
import { AppShellComponent } from '../../layout/app-shell.component';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [AppShellComponent],
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.css',
})
export class AuditComponent implements OnInit {
  private readonly api = inject(BffApiService);
  private readonly msal = inject(MsalService);

  readonly allowed = signal(false);
  readonly loading = signal(true);
  readonly metricsResult = signal<AuditMetricsResult | null>(null);
  readonly eventsResult = signal<AuditEventsResult | null>(null);

  ngOnInit(): void {
    const roles = rolesFromAccount(this.msal.instance.getActiveAccount());
    this.allowed.set(canViewAudit(roles));
    if (!this.allowed()) {
      this.loading.set(false);
      return;
    }
    void this.load();
  }

  metrics(): AuditMetrics | null {
    return this.metricsResult()?.metrics ?? null;
  }

  events(): AuditEvent[] {
    return this.eventsResult()?.items ?? [];
  }

  statusKind(): 'ok' | 'forbidden' | 'unauthorized' | 'error' | 'loading' {
    if (this.loading()) {
      return 'loading';
    }
    if (!this.allowed()) {
      return 'forbidden';
    }
    const statuses = [this.metricsResult()?.status, this.eventsResult()?.status].filter(Boolean);
    if (statuses.includes('forbidden')) {
      return 'forbidden';
    }
    if (statuses.includes('unauthorized')) {
      return 'unauthorized';
    }
    if (statuses.every((s) => s === 'ok')) {
      return 'ok';
    }
    return 'error';
  }

  formatWhen(iso: string): string {
    if (!iso) {
      return 'Sin fecha';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleString('es-CL', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  actionLabel(action: string): string {
    const map: Record<string, string> = {
      RESERVATION_STATUS_CHANGED: 'Cambio de estado de reserva',
      RESERVATION_CREATED: 'Reserva creada',
      RESERVATION_CANCELLED: 'Reserva cancelada',
      UNIT_UPDATED: 'Unidad actualizada',
      LOGIN: 'Inicio de sesión',
    };
    return map[action] ?? action.split('_').join(' ').toLowerCase();
  }

  severityClass(severity: string): string {
    const s = severity.toUpperCase();
    if (s === 'ERROR') {
      return 'sev-error';
    }
    if (s === 'WARN' || s === 'WARNING') {
      return 'sev-warn';
    }
    return 'sev-info';
  }

  pct(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    const [metrics, events] = await Promise.all([this.api.auditMetrics(), this.api.auditEvents(50)]);
    this.metricsResult.set(metrics);
    this.eventsResult.set(events);
    this.loading.set(false);
  }
}
