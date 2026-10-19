import { asAuditEvents } from './audit.mapper';

describe('asAuditEvents', () => {
  it('extrae items de TimelineResponse y mapea cada evento real', () => {
    const payload = {
      items: [
        {
          id: 1,
          occurredAt: '2026-10-18T21:00:00Z',
          actor: 'operador@andesstay.local',
          action: 'RESERVATION_STATUS_CHANGED',
          resourceType: 'RESERVATION',
          resourceId: '42',
          detail: 'CREADA → CONFIRMADA',
          severity: 'INFO',
        },
      ],
    };

    const events = asAuditEvents(payload);

    expect(events.length).toBe(1);
    expect(events[0].id).toBe(1);
    expect(events[0].occurredAt).toBe('2026-10-18T21:00:00Z');
    expect(events[0].actor).toBe('operador@andesstay.local');
    expect(events[0].action).toBe('RESERVATION_STATUS_CHANGED');
    expect(events[0].resourceType).toBe('RESERVATION');
    expect(events[0].resourceId).toBe('42');
    expect(events[0].detail).toBe('CREADA → CONFIRMADA');
    expect(events[0].severity).toBe('INFO');
  });

  it('no trata el wrapper { items } como un evento', () => {
    const events = asAuditEvents({ items: [] });
    expect(events).toEqual([]);
  });

  it('acepta un arreglo directo de eventos', () => {
    const events = asAuditEvents([
      {
        id: 7,
        occurredAt: '2026-10-19T10:00:00Z',
        actor: 'admin',
        action: 'LOGIN',
        resourceType: 'SESSION',
        resourceId: '1',
        detail: '',
        severity: 'WARN',
      },
    ]);
    expect(events.length).toBe(1);
    expect(events[0].id).toBe(7);
    expect(events[0].severity).toBe('WARN');
  });
});
